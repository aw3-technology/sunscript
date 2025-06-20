import { EventEmitter } from 'events';
import { Lexer } from '../lexer/Lexer';
import { GenesisParser } from '../parser/GenesisParser';
import { SunScriptCompiler } from './Compiler';
import { CompilerConfig, CompilationResult, AIContext } from '../types';
import { GenesisProgram } from '../types/ast';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface GenesisCompilationResult {
  project: {
    name: string;
    version: string;
    author?: string;
  };
  files: Map<string, CompilationResult>;
  entrypoints: Map<string, string>;
  buildConfig: any;
}

export class GenesisCompiler extends EventEmitter {
  private baseCompiler: SunScriptCompiler;
  private projectRoot: string;
  private sourceRoot: string;
  private outputRoot: string;

  constructor(private config: CompilerConfig) {
    super();
    this.baseCompiler = new SunScriptCompiler(config);
    this.projectRoot = process.cwd();
    this.sourceRoot = this.projectRoot;
    this.outputRoot = path.join(this.projectRoot, 'dist');
  }

  async compileProject(genesisPath: string): Promise<GenesisCompilationResult> {
    this.emit('genesis:start', { file: genesisPath });
    
    try {
      // Parse genesis file
      const genesisSource = await fs.readFile(genesisPath, 'utf-8');
      const genesis = await this.parseGenesis(genesisSource);
      
      // Update project root based on genesis file location
      this.projectRoot = path.dirname(path.resolve(genesisPath));
      
      // Set source and output roots
      this.sourceRoot = path.resolve(this.projectRoot, genesis.sourceDir);
      this.outputRoot = path.resolve(this.projectRoot, genesis.outputDir);
      
      // Update compiler config with output directory
      this.config.outputDir = this.outputRoot;
      
      // Initialize result
      const result: GenesisCompilationResult = {
        project: {
          name: genesis.projectName,
          version: genesis.version,
          author: genesis.author
        },
        files: new Map(),
        entrypoints: new Map(),
        buildConfig: genesis.buildConfig
      };
      
      // Apply global context and directives to compiler config
      if (genesis.globalDirectives) {
        this.applyGlobalDirectives(genesis.globalDirectives);
      }
      
      // Compile all imported files
      await this.compileImports(genesis, result);
      
      // Process entrypoints
      if (genesis.entrypoints) {
        for (const entry of genesis.entrypoints) {
          result.entrypoints.set(entry.name, entry.target);
        }
      }
      
      // Apply build configuration
      if (genesis.buildConfig) {
        this.applyBuildConfig(genesis.buildConfig);
      }
      
      this.emit('genesis:success', { project: genesis.projectName, fileCount: result.files.size });
      return result;
      
    } catch (error) {
      this.emit('genesis:error', { file: genesisPath, error });
      throw error;
    }
  }

  private async parseGenesis(source: string): Promise<GenesisProgram> {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const parser = new GenesisParser(tokens);
    return parser.parseGenesis();
  }

  private async compileImports(genesis: GenesisProgram, result: GenesisCompilationResult): Promise<void> {
    const compileTasks: Promise<void>[] = [];
    
    for (const importDecl of genesis.imports) {
      const task = this.compileImport(importDecl.path, importDecl.alias, result);
      compileTasks.push(task);
    }
    
    await Promise.all(compileTasks);
  }

  private async compileImport(importPath: string, alias: string | undefined, result: GenesisCompilationResult): Promise<void> {
    // Resolve import path relative to source directory
    const resolvedPath = path.resolve(this.sourceRoot, importPath);
    
    // Check if path is a directory or file
    const stats = await fs.stat(resolvedPath).catch(() => null);
    
    if (stats?.isDirectory()) {
      // Compile all .sun files in directory
      const pattern = path.join(resolvedPath, '**/*.sun');
      const files = await glob(pattern);
      
      for (const file of files) {
        const relativePath = path.relative(this.sourceRoot, file);
        const compilationResult = await this.baseCompiler.compileFile(file);
        result.files.set(relativePath, compilationResult);
      }
    } else {
      // Single file import
      const filePath = resolvedPath.endsWith('.sun') ? resolvedPath : `${resolvedPath}.sun`;
      const relativePath = path.relative(this.sourceRoot, filePath);
      
      try {
        const compilationResult = await this.baseCompiler.compileFile(filePath);
        const key = alias || relativePath;
        result.files.set(key, compilationResult);
      } catch (error) {
        this.emit('import:error', { file: filePath, error });
        throw error;
      }
    }
  }

  private applyGlobalDirectives(directives: any[]): void {
    for (const directive of directives) {
      if (directive.directive === 'context' && directive.parameters?.value) {
        this.config.domain = directive.parameters.value;
      }
      // Add more directive handling as needed
    }
  }

  private applyBuildConfig(buildConfig: any): void {
    if (buildConfig.targets?.length > 0) {
      // Use the first target as default
      this.config.targetLanguage = buildConfig.targets[0];
    }
    
    // Apply other build options
    Object.assign(this.config, buildConfig.options || {});
  }

  async writeGenesisOutput(result: GenesisCompilationResult): Promise<void> {
    const outputDir = this.config.outputDir;
    
    // Create project structure
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write manifest file
    const manifest = {
      project: result.project,
      entrypoints: Object.fromEntries(result.entrypoints),
      files: Array.from(result.files.keys()),
      buildConfig: result.buildConfig,
      generatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(outputDir, 'sunscript.manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Write compiled files
    for (const [filePath, compilationResult] of result.files) {
      // The base compiler already writes files, but we might want to organize them differently
      // based on the genesis configuration
    }
    
    // Generate entry point scripts if needed
    if (result.entrypoints.size > 0) {
      await this.generateEntryPoints(result.entrypoints, outputDir);
    }
  }

  private async generateEntryPoints(entrypoints: Map<string, string>, outputDir: string): Promise<void> {
    for (const [name, target] of entrypoints) {
      let content = '';
      
      if (this.config.targetLanguage === 'javascript' || this.config.targetLanguage === 'typescript') {
        content = `// Entry point: ${name}\n`;
        content += `// Target: ${target}\n\n`;
        
        if (target.includes('.')) {
          // Module.function format
          const [module, func] = target.split('.');
          content += `import { ${func} } from './${module}';\n\n`;
          content += `${func}();\n`;
        } else {
          // Direct file reference
          content += `import './${target}';\n`;
        }
      } else if (this.config.targetLanguage === 'python') {
        content = `# Entry point: ${name}\n`;
        content += `# Target: ${target}\n\n`;
        
        if (target.includes('.')) {
          const [module, func] = target.split('.');
          content += `from ${module} import ${func}\n\n`;
          content += `if __name__ == "__main__":\n`;
          content += `    ${func}()\n`;
        } else {
          content += `import ${target}\n`;
        }
      }
      
      const ext = this.getFileExtension();
      await fs.writeFile(path.join(outputDir, `${name}.entry.${ext}`), content);
    }
  }
  
  private getFileExtension(): string {
    switch (this.config.targetLanguage) {
      case 'javascript': return 'js';
      case 'typescript': return 'ts';
      case 'python': return 'py';
      case 'html': return 'html';
      default: return 'js';
    }
  }
}