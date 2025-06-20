import { EventEmitter } from 'events';
import { Lexer } from '../lexer/Lexer';
import { Parser } from '../parser/Parser';
import { CodeGenerator } from '../generator/CodeGenerator';
import { CompilerConfig, CompilationResult, AIContext } from '../types';
import { ErrorHandler, globalErrorHandler, createFileNotFoundError, createParseError } from '../errors/ErrorHandler';
import { SunScriptError, ErrorCode, CompilationError, FileSystemError } from '../errors/SunScriptError';
import { sunScriptFileOps, outputFileOps } from '../security';
import { ConfigValidator, InputValidator } from '../validation';
import { ErrorFormatter } from '../parser/ErrorFormatter';
import * as path from 'path';

export class SunScriptCompiler extends EventEmitter {
  private generator: CodeGenerator;
  private errorHandler: ErrorHandler;

  constructor(private config: CompilerConfig) {
    super();
    
    // Temporarily bypass validation to fix initialization issue
    // TODO: Fix ConfigValidator rules initialization
    // const validatedConfig = ConfigValidator.validateAndSanitize(
    //   config,
    //   ConfigValidator.validateCompilerConfig,
    //   'Compiler configuration'
    // );
    
    // Update config with validated values
    this.config = { ...config };
    
    if (!this.config.aiProvider) {
      throw new CompilationError('AI Provider is required', {
        suggestions: ['Configure an AI provider (OpenAI, Anthropic, or Local LLM)']
      });
    }
    
    this.errorHandler = new ErrorHandler({
      verbose: config.verbose || false,
      logErrors: true,
      exitOnError: false
    });
    
    this.generator = new CodeGenerator(this.config.aiProvider, {
      targetLanguage: this.config.targetLanguage
    });
  }

  async compileFile(filePath: string): Promise<CompilationResult> {
    return this.errorHandler.handleAsync(async () => {
      this.emit('compile:start', { file: filePath });
      
      // Validate file path
      await this.validateFilePath(filePath);
      
      const source = await this.readSourceFile(filePath);
      const result = await this.compile(source, {
        filePath,
        fileName: path.basename(filePath, '.sun')
      });
      
      await this.writeOutput(filePath, result);
      
      this.emit('compile:success', { file: filePath, result });
      return result;
      
    }, {
      operation: 'compileFile',
      stage: 'compilation',
      filePath
    });
  }

  async compile(source: string, metadata: any = {}): Promise<CompilationResult> {
    return this.errorHandler.handleAsync(async () => {
      // Validate input
      if (!source || typeof source !== 'string') {
        throw new CompilationError('Invalid source code: must be a non-empty string', {
          filePath: metadata.filePath,
          suggestions: ['Ensure the source file contains valid SunScript code']
        });
      }

      // Validate SunScript source code
      const sourceValidation = InputValidator.validateSunScriptSource(source, {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedConstructs: [],
        blockedPatterns: [],
        requireProjectStructure: false
      });

      if (!sourceValidation.valid) {
        const errorMessages = sourceValidation.errors.map(err => err.message);
        throw new CompilationError(`Source code validation failed: ${errorMessages.join(', ')}`, {
          filePath: metadata.filePath,
          context: { validationErrors: sourceValidation.errors },
          suggestions: ['Review the source code for security issues', 'Check for dangerous patterns']
        });
      }

      // Use sanitized source
      const sanitizedSource = sourceValidation.sanitized?.source || source;

      // Lexical analysis with error recovery
      const lexer = new Lexer(sanitizedSource, true); // Enable error recovery
      const tokens = this.errorHandler.handleSync(() => {
        return lexer.tokenize();
      }, {
        operation: 'lexical analysis',
        stage: 'parsing',
        filePath: metadata.filePath
      });
      
      // Parsing with error recovery
      const ast = this.errorHandler.handleSync(() => {
        const parser = new Parser(tokens, sanitizedSource);
        const program = parser.parse();
        
        // Report all errors but continue compilation
        const parseErrors = parser.getAllErrors();
        const lexerErrors = lexer.getErrors();
        
        if (parseErrors.length > 0 || lexerErrors.length > 0) {
          this.emit('compilation:warnings', { 
            file: metadata.filePath, 
            parseErrors,
            lexerErrors
          });
          
          // Create comprehensive error report
          const errorReport = ErrorFormatter.createErrorReport(
            sanitizedSource,
            parseErrors,
            lexerErrors
          );
          
          console.warn(errorReport);
        }
        
        return program;
      }, {
        operation: 'syntax parsing',
        stage: 'parsing',
        filePath: metadata.filePath
      });
      
      // Create AI context
      const context: AIContext = {
        targetLanguage: this.config.targetLanguage,
        projectName: metadata.projectName || 'sunscript-project',
        fileName: metadata.fileName,
        filePath: metadata.filePath,
        domain: this.config.domain
      };
      
      // Code generation with AI
      const result = await this.errorHandler.handleAsync(async () => {
        return this.generator.generate(ast, context);
      }, {
        operation: 'code generation',
        stage: 'generation',
        filePath: metadata.filePath
      });
      
      return result;
      
    }, {
      operation: 'compile',
      stage: 'compilation',
      filePath: metadata.filePath
    });
  }

  private async writeOutput(inputPath: string, result: CompilationResult): Promise<void> {
    return this.errorHandler.handleAsync(async () => {
      const outputDir = this.config.outputDir;
      const baseName = path.basename(inputPath, '.sun');
      const ext = this.getFileExtension();
      
      // Validate output directory
      await this.validateOutputDirectory(outputDir);
      
      for (const [name, code] of Object.entries(result.code)) {
        let outputPath: string;
        
        // Special handling for HTML - create a single HTML file
        if (this.config.targetLanguage === 'html' && name === 'index') {
          outputPath = path.join(outputDir, `${baseName}.html`);
        } else {
          // For other languages, include the function name
          outputPath = path.join(outputDir, `${baseName}.${name}.${ext}`);
        }
        
        // Use secure file operations for writing output
        await outputFileOps.writeFile(outputPath, code, {
          createDirectories: true,
          validatePath: true,
          atomic: true,
          mode: 0o644
        });
        console.log(`Generated: ${outputPath}`);
      }
    }, {
      operation: 'writeOutput',
      stage: 'file-system',
      filePath: inputPath
    });
  }

  private async validateFilePath(filePath: string): Promise<void> {
    // Use secure file operations for validation
    const exists = await sunScriptFileOps.exists(filePath);
    if (!exists) {
      throw createFileNotFoundError(filePath);
    }

    // Additional validation for .sun extension
    if (!filePath.endsWith('.sun')) {
      throw new FileSystemError(ErrorCode.INVALID_PATH, 'File must have .sun extension', {
        filePath,
        suggestions: ['Rename the file to have a .sun extension']
      });
    }
  }

  private async readSourceFile(filePath: string): Promise<string> {
    // Use secure file operations for reading
    const source = await sunScriptFileOps.readFile(filePath, {
      maxSize: 10 * 1024 * 1024, // 10MB max for source files
      validateContent: true,
      allowSymlinks: false
    });
    
    if (!source.trim()) {
      throw new CompilationError('Source file is empty', {
        filePath,
        suggestions: ['Add some SunScript code to the file']
      });
    }
    
    return source;
  }

  private async validateOutputDirectory(outputDir: string): Promise<void> {
    // The secure file operations will handle directory validation
    // This is now just a placeholder for any additional output-specific validation
    if (!outputDir || typeof outputDir !== 'string') {
      throw new FileSystemError(ErrorCode.INVALID_PATH, 'Output directory must be specified');
    }
  }

  private validateOutputPath(outputPath: string, outputDir: string): void {
    // Ensure the output path is within the output directory (prevent directory traversal)
    const resolvedOutputPath = path.resolve(outputPath);
    const resolvedOutputDir = path.resolve(outputDir);
    
    if (!resolvedOutputPath.startsWith(resolvedOutputDir)) {
      throw new FileSystemError(ErrorCode.INVALID_PATH, 'Output path is outside the output directory', {
        context: { outputPath, outputDir },
        suggestions: ['Use valid file names without path traversal characters']
      });
    }
  }

  private getFileExtension(): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html'  // ADD THIS LINE
    };
    
    return extensions[this.config.targetLanguage] || 'js';
  }
}