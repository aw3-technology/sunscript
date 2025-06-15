import { Command } from 'commander';
import * as path from 'path';

export class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('sunscript')
      .description('SunScript - AI-Native Programming Language Compiler')
      .version('1.0.0');

    this.program
      .command('compile <input>')
      .description('Compile SunScript file')
      .option('-o, --output <dir>', 'Output directory', './dist')
      .option('-t, --target <language>', 'Target language', 'javascript')
      .action(async (input, options) => {
        const { SunScriptCompiler } = await import('../compiler/Compiler');
        const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider');
        
        const compiler = new SunScriptCompiler({
          outputDir: options.output,
          targetLanguage: options.target,
          aiProvider: new OpenAIProvider()
        });
        
        try {
          console.log(`Compiling ${input}...`);
          const result = await compiler.compileFile(input);
          console.log(`✅ Successfully compiled to ${options.output}`);
          
          if (result.metadata.warnings.length > 0) {
            console.log('\nWarnings:');
            result.metadata.warnings.forEach(w => 
              console.log(`  - ${w.message}`)
            );
          }
        } catch (error: any) {
          console.error(`❌ Compilation failed: ${error.message}`);
          process.exit(1);
        }
      });
  }

  public async run(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }
}
