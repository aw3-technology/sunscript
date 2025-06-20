import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';

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

    // Add "Let there be light" command for genesis compilation
    this.program
      .command('let')
      .arguments('there be light')
      .description('Compile project using genesis.sun (Biblical creation style!)')
      .option('-g, --genesis <file>', 'Path to genesis.sun file', './genesis.sun')
      .action(async (there, be, light, options) => {
        // Verify the command was typed correctly
        if (there !== 'there' || be !== 'be' || light !== 'light') {
          console.error(chalk.red('❌ Did you mean "sunscript let there be light"?'));
          process.exit(1);
        }
        
        await this.compileGenesis(options.genesis);
      });

    // Add regular genesis command as well
    this.program
      .command('genesis')
      .description('Compile project using genesis.sun')
      .option('-f, --file <file>', 'Path to genesis.sun file', './genesis.sun')
      .action(async (options) => {
        await this.compileGenesis(options.file);
      });

    // Add GitHub import command
    this.program
      .command('import')
      .arguments('<github-url>')
      .description('Import and reverse-compile a GitHub project')
      .option('-s, --source <dir>', 'Source directory for SunScript files', './src')
      .option('-o, --output <dir>', 'Output directory for original code', './imported')
      .option('--no-comments', 'Exclude generated comments')
      .action(async (githubUrl, options) => {
        await this.importGitHubProject(githubUrl, options);
      });

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

  private async compileGenesis(genesisPath: string): Promise<void> {
    try {
      // Check if genesis file exists
      await fs.access(genesisPath);
    } catch {
      console.error(chalk.red(`❌ Genesis file not found: ${genesisPath}`));
      console.log(chalk.yellow('💡 Tip: Create a genesis.sun file in your project root'));
      process.exit(1);
    }

    const { GenesisCompiler } = await import('../compiler/GenesisCompiler');
    const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider');
    
    // Create dramatic effect
    console.log(chalk.blue('\n🌌 In the beginning was the void...'));
    await this.sleep(1000);
    
    console.log(chalk.yellow('⚡ And then the developer said: "Let there be light!"'));
    await this.sleep(1000);
    
    console.log(chalk.green('✨ And there was code.\n'));
    await this.sleep(500);

    const compiler = new GenesisCompiler({
      outputDir: './dist', // Will be overridden by genesis file
      targetLanguage: 'javascript', // Will be overridden by genesis file
      aiProvider: new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4-turbo-preview'
      })
    });

    // Set up event listeners for progress
    compiler.on('genesis:start', ({ file }) => {
      console.log(chalk.cyan(`📖 Reading the sacred texts from ${file}...`));
    });

    compiler.on('import:error', ({ file, error }) => {
      console.error(chalk.red(`❌ Failed to manifest ${file}: ${error.message}`));
    });

    compiler.on('genesis:success', ({ project, fileCount }) => {
      console.log(chalk.green(`\n🎉 Creation complete!`));
      console.log(chalk.green(`   Project: ${project}`));
      console.log(chalk.green(`   Files created: ${fileCount}`));
    });

    try {
      const result = await compiler.compileProject(genesisPath);
      await compiler.writeGenesisOutput(result);
      
      console.log(chalk.blue('\n🌍 And the developer saw that the code was good.'));
      console.log(chalk.gray(`Output written to: ${result.buildConfig?.output || './dist'}\n`));
      
    } catch (error: any) {
      console.error(chalk.red(`\n💥 Creation failed: ${error.message}`));
      console.log(chalk.yellow('🔧 Check your genesis.sun file and try again.'));
      process.exit(1);
    }
  }

  private async importGitHubProject(githubUrl: string, options: any): Promise<void> {
    console.log(chalk.blue('🚀 Starting GitHub project import...'));
    console.log(chalk.cyan(`📦 Repository: ${githubUrl}`));

    const { GitHubFetcher } = await import('../utils/GitHubFetcher');
    const { ReverseCompiler } = await import('../reverse/ReverseCompiler');
    const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider');

    try {
      // Fetch the GitHub repository
      const fetcher = new GitHubFetcher();
      console.log(chalk.yellow('📥 Downloading repository...'));
      
      await fetcher.fetchFromUrl(githubUrl, options.output);

      // Set up reverse compiler
      const aiProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4-turbo-preview'
      });

      const reverseCompiler = new ReverseCompiler(aiProvider);

      console.log(chalk.blue('🔄 Reverse compiling to SunScript...'));

      // Reverse compile the project
      const result = await reverseCompiler.reverseCompile({
        inputDir: options.output,
        outputDir: options.source,
        aiProvider,
        includeComments: options.comments !== false,
        preserveStructure: true
      });

      // Generate a genesis.sun file for the imported project
      await this.generateGenesisFile(result, githubUrl);

      console.log(chalk.green('\n🎉 Import complete!'));
      console.log(chalk.green(`   Original code: ${options.output}`));
      console.log(chalk.green(`   SunScript files: ${options.source}`));
      console.log(chalk.green(`   Files converted: ${result.files.size}`));
      console.log(chalk.green(`   Project type: ${result.projectStructure.type}`));

      if (result.imports.length > 0) {
        console.log(chalk.cyan('\n📋 Suggested imports for genesis.sun:'));
        result.imports.forEach(imp => {
          console.log(chalk.gray(`   ${imp}`));
        });
      }

      console.log(chalk.yellow('\n💡 Next steps:'));
      console.log(chalk.yellow('   1. Review the generated SunScript files'));
      console.log(chalk.yellow('   2. Update genesis.sun with your preferences'));
      console.log(chalk.yellow('   3. Run "sunscript let there be light" to compile'));

    } catch (error: any) {
      console.error(chalk.red(`❌ Import failed: ${error.message}`));
      
      if (error.message.includes('git')) {
        console.log(chalk.yellow('💡 Make sure git is installed and available in your PATH'));
      } else if (error.message.includes('API')) {
        console.log(chalk.yellow('💡 Check your OPENAI_API_KEY environment variable'));
      }
      
      process.exit(1);
    }
  }

  private async generateGenesisFile(result: any, githubUrl: string): Promise<void> {
    const { projectStructure } = result;
    const repoMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    const repoName = repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : 'imported-project';

    const genesis = `@project "${projectStructure.name || repoName}"
@version "1.0.0"
@author "Imported from ${githubUrl}"
@source "./src"
@output "./build"
@context ${projectStructure.type} development

# Imported Project
# Original repository: ${githubUrl}
# Architecture: ${projectStructure.architecture}
# Main features: ${projectStructure.mainFeatures.join(', ')}

imports {
${result.imports.map((imp: string) => `    ${imp}`).join('\n')}
}

config {
    preserveOriginal: true
    importedFrom: "${githubUrl}"
}

entrypoints {
${projectStructure.entryPoints.map((entry: string) => `    main: ${entry}`).join('\n')}
}

build {
    targets: ["javascript", "typescript"]
    minify: false
    sourcemaps: true
}

dependencies {
    external: {
${Object.entries(result.dependencies).map(([name, version]) => 
  `        "${name}": "${version}"`
).join('\n')}
    }
}

# AI Questions for imported project
?? should we optimize the generated SunScript for better readability?
?? are there any patterns we should modernize or improve?
?? should we add additional documentation or comments?
`;

    await fs.writeFile('./genesis.sun', genesis);
    console.log(chalk.green('📄 Generated genesis.sun file'));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async run(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }
}
