import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { ErrorHandler, globalErrorHandler } from '../errors/ErrorHandler';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { Logger, globalLogger } from '../errors/Logger';
import { CLIErrorHandler, withCLIErrorHandling } from './CLIErrorHandling';
import { CLIValidator } from '../validation';

export class CLI {
  private program: Command;
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private cliErrorHandler: CLIErrorHandler;

  constructor() {
    this.program = new Command();
    this.errorHandler = new ErrorHandler({
      verbose: false,
      logErrors: true,
      exitOnError: false // CLI will handle exit manually
    });
    this.logger = globalLogger;
    this.cliErrorHandler = new CLIErrorHandler(this.logger);
    this.setupCommands();
    this.setupErrorHandling();
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
      .option('--full', 'Force full build (disable incremental compilation)')
      .option('--watch', 'Enable watch mode with incremental compilation')
      .option('--clear-cache', 'Clear incremental compilation cache')
      .option('-v, --verbose', 'Verbose output')
      .action(async (there, be, light, options) => {
        await this.handleCommand(async () => {
          // Validate CLI arguments
          const validatedArgs = CLIValidator.createArgumentParser('let', {
            allowUnknownArgs: false,
            sanitizeStrings: true,
            maxArgLength: 1000
          })(options);

          // Verify the command was typed correctly
          if (there !== 'there' || be !== 'be' || light !== 'light') {
            throw new SunScriptError(ErrorCode.INVALID_CONFIG, 'Command must be "let there be light"', {
              suggestions: ['Use: sunscript let there be light']
            });
          }
          
          await this.compileGenesis(validatedArgs.genesis || options.genesis, {
            forceFullBuild: validatedArgs.full || options.full,
            watchMode: validatedArgs.watch || options.watch,
            clearCache: validatedArgs.clearCache || options.clearCache,
            verbose: validatedArgs.verbose || options.verbose
          });
        }, 'let there be light');
      });

    // Add regular genesis command as well
    this.program
      .command('genesis')
      .description('Compile project using genesis.sun')
      .option('-f, --file <file>', 'Path to genesis.sun file', './genesis.sun')
      .option('--full', 'Force full build (disable incremental compilation)')
      .option('--watch', 'Enable watch mode with incremental compilation')
      .option('--clear-cache', 'Clear incremental compilation cache')
      .option('-v, --verbose', 'Verbose output')
      .action(async (options) => {
        await this.compileGenesis(options.file, {
          forceFullBuild: options.full,
          watchMode: options.watch,
          clearCache: options.clearCache,
          verbose: options.verbose
        });
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

    // Add debug command
    this.program
      .command('debug <sunscript-file>')
      .description('Start interactive debugging session for SunScript')
      .option('-t, --target <file>', 'Compiled target file to debug against')
      .option('-m, --sourcemap <file>', 'Source map file (optional)')
      .action(async (sunscriptFile, options) => {
        await this.startDebugSession(sunscriptFile, options);
      });

    // Add run command for genesis files
    this.program
      .command('run <file>')
      .alias('r')
      .description('Compile and run a SunScript file (especially genesis.sun)')
      .option('--full', 'Force full build (disable incremental compilation)')
      .option('--watch', 'Enable watch mode with incremental compilation')
      .option('--clear-cache', 'Clear incremental compilation cache')
      .option('-v, --verbose', 'Verbose output')
      .action(async (file, options) => {
        try {
          // Simple validation without complex validator
          if (!file || !file.endsWith('.sun')) {
            console.error(chalk.red('❌ Error: File must have .sun extension'));
            console.error(chalk.gray('💡 Provide a valid SunScript file path ending with .sun'));
            process.exit(1);
          }

          // Check if it's a genesis file
          if (file.endsWith('genesis.sun') || file === 'genesis.sun') {
            await this.compileGenesis(file, {
              forceFullBuild: options.full,
              watchMode: options.watch,
              clearCache: options.clearCache,
              verbose: options.verbose
            });
          } else {
            // Regular SunScript file compilation
            await this.compileSingleFile(file, {
              verbose: options.verbose
            });
          }
        } catch (error: any) {
          console.error(chalk.red(`❌ Error: ${error.message}`));
          console.error('Stack trace:', error.stack);
          process.exit(1);
        }
      });
  }

  private async compileSingleFile(
    filePath: string,
    options: {
      verbose?: boolean;
    } = {}
  ): Promise<void> {
    try {
      // Check if file exists
      await fs.access(filePath);
    } catch {
      console.error(chalk.red(`❌ SunScript file not found: ${filePath}`));
      process.exit(1);
    }

    console.log(chalk.blue(`🚀 Compiling ${filePath}...`));

    const { SunScriptCompiler } = await import('../compiler/Compiler');
    const { AnthropicProvider } = await import('../ai/providers/AnthropicProvider');
    
    const compiler = new SunScriptCompiler({
      outputDir: './dist',
      targetLanguage: 'javascript',
      aiProvider: new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-4-20241201'
      })
    });

    try {
      const result = await compiler.compileFile(filePath);
      console.log(chalk.green(`✅ Successfully compiled to ./dist`));
      
      if (result.metadata.warnings.length > 0) {
        console.log(chalk.yellow('\nWarnings:'));
        result.metadata.warnings.forEach(w => 
          console.log(chalk.yellow(`  - ${w.message}${options.verbose ? ` (${w.severity})` : ''}`))
        );
      }
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Compilation failed: ${error.message}`));
      
      if (options.verbose) {
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  }

  private async compileGenesis(
    genesisPath: string, 
    options: {
      forceFullBuild?: boolean;
      watchMode?: boolean;
      clearCache?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<void> {
    try {
      // Check if genesis file exists
      await fs.access(genesisPath);
    } catch {
      console.error(chalk.red(`❌ Genesis file not found: ${genesisPath}`));
      console.log(chalk.yellow('💡 Tip: Create a genesis.sun file in your project root'));
      process.exit(1);
    }

    const { GenesisCompiler } = await import('../compiler/GenesisCompiler');
    const { AnthropicProvider } = await import('../ai/providers/AnthropicProvider');
    
    // Create dramatic effect (skip in watch mode)
    if (!options.watchMode) {
      console.log(chalk.blue('\n🌌 In the beginning was the void...'));
      await this.sleep(1000);
      
      console.log(chalk.yellow('⚡ And then the developer said: "Let there be light!"'));
      await this.sleep(1000);
      
      console.log(chalk.green('✨ And there was code.\n'));
      await this.sleep(500);
    }

    const compiler = new GenesisCompiler({
      outputDir: './dist', // Will be overridden by genesis file
      targetLanguage: 'javascript', // Will be overridden by genesis file
      aiProvider: new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-4-20241201'
      })
    });

    // Handle cache clearing
    if (options.clearCache) {
      await compiler.clearIncrementalCache();
    }

    // Set up event listeners for progress
    if (!options.watchMode) {
      compiler.on('genesis:start', ({ file }) => {
        console.log(chalk.cyan(`📖 Reading the sacred texts from ${file}...`));
      });

      compiler.on('incremental:no-changes', () => {
        console.log(chalk.green('⚡ No changes detected, using cached build'));
      });

      compiler.on('incremental:success', ({ result, changes }) => {
        console.log(chalk.blue(`🔄 Incremental build: ${changes} changes in ${result.compilationTime}ms`));
      });
    }

    compiler.on('import:error', ({ file, error }) => {
      console.error(chalk.red(`❌ Failed to manifest ${file}: ${error.message}`));
    });

    compiler.on('genesis:success', ({ project, fileCount, incremental }) => {
      if (!options.watchMode) {
        console.log(chalk.green(`\n🎉 Creation complete!`));
        console.log(chalk.green(`   Project: ${project}`));
        console.log(chalk.green(`   Files processed: ${fileCount}`));
        if (incremental) {
          console.log(chalk.blue(`   ⚡ Incremental compilation enabled`));
        }
      }
    });

    try {
      if (options.watchMode) {
        // Start watch mode
        await compiler.startWatchMode(genesisPath);
        
        // Keep the process running
        console.log(chalk.blue('👀 Watching for changes... Press Ctrl+C to stop.'));
        process.on('SIGINT', () => {
          console.log(chalk.yellow('\n👋 Watch mode stopped.'));
          process.exit(0);
        });
        
        // Keep process alive
        setInterval(() => {}, 1000);
        
      } else {
        // Regular compilation
        const result = await compiler.compileProject(genesisPath, {
          incremental: !options.forceFullBuild,
          forceFullBuild: options.forceFullBuild,
          verbose: options.verbose
        });
        
        await compiler.writeGenesisOutput(result);
        
        if (result.incremental?.cacheHit) {
          console.log(chalk.green('\n⚡ Lightning fast! No changes detected.'));
        } else {
          console.log(chalk.blue('\n🌍 And the developer saw that the code was good.'));
          
          if (result.incremental) {
            console.log(chalk.gray(`   Incremental build: ${result.incremental.changesSummary}`));
            console.log(chalk.gray(`   Compilation time: ${result.incremental.compilationTime}ms`));
          }
        }
        
        console.log(chalk.gray(`   Output written to: ${result.buildConfig?.output || './dist'}\n`));
      }
      
    } catch (error: any) {
      console.error(chalk.red(`\n💥 Creation failed: ${error.message}`));
      console.log(chalk.yellow('🔧 Check your genesis.sun file and try again.'));
      
      if (options.verbose) {
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  }

  private async importGitHubProject(githubUrl: string, options: any): Promise<void> {
    console.log(chalk.blue('🚀 Starting GitHub project import...'));

    try {
      // Import security manager
      const { PathSecurityManager } = await import('../security/PathSecurityManager');
      
      // Validate GitHub URL for security
      const urlValidation = PathSecurityManager.validateGitHubUrl(githubUrl);
      if (!urlValidation.valid) {
        console.error(chalk.red(`❌ Invalid GitHub URL: ${urlValidation.errors.join(', ')}`));
        process.exit(1);
      }

      console.log(chalk.cyan(`📦 Repository: ${urlValidation.owner}/${urlValidation.repo}`));

      // Validate and sanitize output directory
      const outputValidation = await PathSecurityManager.validatePath(options.output, {
        allowedDirectories: PathSecurityManager.getProjectBoundaries()
      });

      if (!outputValidation.valid) {
        console.error(chalk.red(`❌ Invalid output directory: ${outputValidation.errors.join(', ')}`));
        process.exit(1);
      }

      const safeOutputDir = outputValidation.resolvedPath;

      // Validate source directory
      const sourceValidation = await PathSecurityManager.validatePath(options.source, {
        allowedDirectories: PathSecurityManager.getProjectBoundaries()
      });

      if (!sourceValidation.valid) {
        console.error(chalk.red(`❌ Invalid source directory: ${sourceValidation.errors.join(', ')}`));
        process.exit(1);
      }

      const safeSourceDir = sourceValidation.resolvedPath;

      const { GitHubFetcher } = await import('../utils/GitHubFetcher');
      const { ReverseCompiler } = await import('../reverse/ReverseCompiler');
      const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider');

      // Fetch the GitHub repository
      const fetcher = new GitHubFetcher();
      console.log(chalk.yellow('📥 Downloading repository...'));
      
      await fetcher.fetchFromUrl(githubUrl, safeOutputDir);

      // Set up reverse compiler
      const aiProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4-turbo-preview'
      });

      const reverseCompiler = new ReverseCompiler(aiProvider);

      console.log(chalk.blue('🔄 Reverse compiling to SunScript...'));

      // Reverse compile the project
      const result = await reverseCompiler.reverseCompile({
        inputDir: safeOutputDir,
        outputDir: safeSourceDir,
        aiProvider,
        includeComments: options.comments !== false,
        preserveStructure: true
      });

      // Generate a genesis.sun file for the imported project
      await this.generateGenesisFile(result, githubUrl);

      console.log(chalk.green('\n🎉 Import complete!'));
      console.log(chalk.green(`   Original code: ${path.relative(process.cwd(), safeOutputDir)}`));
      console.log(chalk.green(`   SunScript files: ${path.relative(process.cwd(), safeSourceDir)}`));
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

  private async startDebugSession(sunscriptFile: string, options: any): Promise<void> {
    console.log(chalk.blue('🐛 Starting SunScript Debug Session...'));
    
    try {
      // Import security manager
      const { PathSecurityManager } = await import('../security/PathSecurityManager');
      
      // Validate SunScript file path
      const sunscriptValidation = await PathSecurityManager.validatePath(sunscriptFile, {
        allowedExtensions: ['.sun'],
        requireExists: true,
        allowedDirectories: PathSecurityManager.getProjectBoundaries()
      });

      if (!sunscriptValidation.valid) {
        console.error(chalk.red(`❌ Invalid SunScript file: ${sunscriptValidation.errors.join(', ')}`));
        process.exit(1);
      }

      const validatedSunScriptFile = sunscriptValidation.resolvedPath;

      // Determine target file
      let targetFile = options.target;
      if (!targetFile) {
        // Try to find compiled output safely
        const baseName = PathSecurityManager.sanitizeFilename(path.basename(validatedSunScriptFile, '.sun'));
        const possibleTargets = [
          `./dist/${baseName}.js`,
          `./build/${baseName}.js`,
          `./out/${baseName}.js`,
          `./${baseName}.js`
        ];
        
        for (const candidate of possibleTargets) {
          const candidateValidation = await PathSecurityManager.validatePath(candidate, {
            allowedExtensions: ['.js', '.ts'],
            requireExists: true,
            allowedDirectories: PathSecurityManager.getProjectBoundaries()
          });

          if (candidateValidation.valid) {
            targetFile = candidateValidation.resolvedPath;
            break;
          }
        }
        
        if (!targetFile) {
          console.log(chalk.yellow('⚠️  No compiled target file found.'));
          console.log(chalk.cyan('💡 Compile your SunScript first or specify target with -t option'));
          console.log(chalk.gray('   Example: sunscript debug app.sun -t ./dist/app.js'));
          process.exit(1);
        }
      } else {
        // Validate user-provided target file
        const targetValidation = await PathSecurityManager.validatePath(targetFile, {
          allowedExtensions: ['.js', '.ts', '.py', '.java', '.go', '.rs'],
          requireExists: true,
          allowedDirectories: PathSecurityManager.getProjectBoundaries()
        });

        if (!targetValidation.valid) {
          console.error(chalk.red(`❌ Invalid target file: ${targetValidation.errors.join(', ')}`));
          process.exit(1);
        }

        targetFile = targetValidation.resolvedPath;
      }

      console.log(chalk.green(`✅ Found target file: ${path.relative(process.cwd(), targetFile)}`));

    const { DebugCLI } = await import('../debugging/DebugCLI');
    const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider');

    const aiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview'
    });

      const debugCli = new DebugCLI(aiProvider);
      await debugCli.startDebugSession(validatedSunScriptFile, targetFile);
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to start debug session: ${(error as Error).message}`));
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

  private async handleCommand<T>(operation: () => Promise<T>, commandName: string): Promise<T> {
    return withCLIErrorHandling(operation, commandName, this.cliErrorHandler, {
      verbose: process.env.SUNSCRIPT_VERBOSE === 'true',
      showSuggestions: true,
      colorize: process.stdout.isTTY
    });
  }

  private setupErrorHandling(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      await this.logger.fatal('Uncaught exception', error);
      await this.cliErrorHandler.handleError(error, 'uncaught exception', {
        verbose: true,
        showSuggestions: false,
        colorize: process.stdout.isTTY
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      await this.logger.fatal('Unhandled promise rejection', error, { promise: promise.toString() });
      await this.cliErrorHandler.handleError(error, 'unhandled promise rejection', {
        verbose: true,
        showSuggestions: false,
        colorize: process.stdout.isTTY
      });
      process.exit(1);
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n⚠️  Operation cancelled by user'));
      await this.logger.info('Operation cancelled by user (SIGINT)');
      process.exit(0);
    });

    // Handle SIGTERM
    process.on('SIGTERM', async () => {
      await this.logger.info('Process terminated (SIGTERM)');
      process.exit(0);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      await this.cliErrorHandler.handleError(error as Error, 'CLI command execution', {
        verbose: false,
        showSuggestions: true,
        colorize: true
      });
      process.exit(1);
    }
  }
}
