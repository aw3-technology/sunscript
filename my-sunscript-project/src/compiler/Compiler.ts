import { EventEmitter } from 'events';
import { Lexer } from '../lexer/Lexer';
import { Parser } from '../parser/Parser';
import { CodeGenerator } from '../generator/CodeGenerator';
import { CompilerConfig, CompilationResult, AIContext } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SunScriptCompiler extends EventEmitter {
  private generator: CodeGenerator;

  constructor(private config: CompilerConfig) {
    super();
    
    if (!this.config.aiProvider) {
      throw new Error('AI Provider is required');
    }
    
    this.generator = new CodeGenerator(this.config.aiProvider, {
      targetLanguage: this.config.targetLanguage
    });
  }

  async compileFile(filePath: string): Promise<CompilationResult> {
    this.emit('compile:start', { file: filePath });
    
    try {
      const source = await fs.readFile(filePath, 'utf-8');
      const result = await this.compile(source, {
        filePath,
        fileName: path.basename(filePath, '.sun')
      });
      
      await this.writeOutput(filePath, result);
      
      this.emit('compile:success', { file: filePath, result });
      return result;
      
    } catch (error) {
      this.emit('compile:error', { file: filePath, error });
      throw error;
    }
  }

  async compile(source: string, metadata: any = {}): Promise<CompilationResult> {
    // Lexical analysis
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    // Parsing
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // Create AI context
    const context: AIContext = {
      targetLanguage: this.config.targetLanguage,
      projectName: metadata.projectName || 'sunscript-project',
      fileName: metadata.fileName,
      filePath: metadata.filePath,
      domain: this.config.domain
    };
    
    // Code generation
    const result = await this.generator.generate(ast, context);
    
    return result;
  }

  private async writeOutput(inputPath: string, result: CompilationResult): Promise<void> {
    const outputDir = this.config.outputDir;
    const baseName = path.basename(inputPath, '.sun');
    const ext = this.getFileExtension();
    
    await fs.mkdir(outputDir, { recursive: true });
    
    for (const [name, code] of Object.entries(result.code)) {
      const outputPath = path.join(outputDir, `${baseName}.${name}.${ext}`);
      await fs.writeFile(outputPath, code, 'utf-8');
    }
  }

  private getFileExtension(): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py'
    };
    
    return extensions[this.config.targetLanguage] || 'js';
  }
}
