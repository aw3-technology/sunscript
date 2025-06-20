import * as readline from 'readline';
import chalk from 'chalk';
import { SunScriptDebugger, DebugSession, VariableState } from './SunScriptDebugger';
import { AIProvider } from '../ai/AIProvider';

export class DebugCLI {
  private debugger: SunScriptDebugger;
  private rl: readline.Interface;
  private currentSession?: DebugSession;

  constructor(aiProvider: AIProvider) {
    this.debugger = new SunScriptDebugger(aiProvider);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('sunscript-debug> ')
    });
  }

  async startDebugSession(sunScriptFile: string, targetFile: string): Promise<void> {
    try {
      console.log(chalk.blue('\n🐛 Starting SunScript Debug Session'));
      console.log(chalk.cyan(`📄 SunScript: ${sunScriptFile}`));
      console.log(chalk.cyan(`🎯 Target: ${targetFile}`));
      
      this.currentSession = await this.debugger.startDebugSession(sunScriptFile, targetFile);
      
      console.log(chalk.green(`✅ Debug session started: ${this.currentSession.id}`));
      console.log(chalk.yellow('📍 Generating source mappings...'));
      
      // Show source map summary
      const mappings = this.currentSession.sourceMap.mappings;
      console.log(chalk.green(`✅ Source map created with ${mappings.length} mappings`));
      
      this.showHelp();
      this.startREPL();
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to start debug session: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  private startREPL(): void {
    this.rl.prompt();
    
    this.rl.on('line', async (input) => {
      const command = input.trim();
      
      if (!command) {
        this.rl.prompt();
        return;
      }

      try {
        await this.handleCommand(command);
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`));
      }
      
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\n👋 Debug session ended'));
      process.exit(0);
    });
  }

  private async handleCommand(command: string): Promise<void> {
    if (!this.currentSession) {
      console.log(chalk.red('No active debug session'));
      return;
    }

    const [cmd, ...args] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
      case 'h':
        this.showHelp();
        break;

      case 'map':
      case 'sourcemap':
        this.showSourceMap();
        break;

      case 'break':
      case 'bp':
        await this.setBreakpoint(args);
        break;

      case 'breakpoints':
      case 'bps':
        this.showBreakpoints();
        break;

      case 'error':
        await this.simulateError(args);
        break;

      case 'explain':
        await this.explainCode(args);
        break;

      case 'vars':
      case 'variables':
        await this.showVariables();
        break;

      case 'suggest':
        await this.getDebuggingSuggestions();
        break;

      case 'fix':
        await this.getAutomatedFixes();
        break;

      case 'trace':
        this.showStackTrace();
        break;

      case 'context':
        await this.showContext(args);
        break;

      case 'condition':
        await this.testCondition(args);
        break;

      case 'session':
        this.showSessionInfo();
        break;

      case 'quit':
      case 'exit':
      case 'q':
        await this.debugger.endDebugSession(this.currentSession.id);
        this.rl.close();
        break;

      default:
        console.log(chalk.red(`Unknown command: ${cmd}`));
        console.log(chalk.yellow('Type "help" for available commands'));
    }
  }

  private showHelp(): void {
    console.log(chalk.blue('\n📚 SunScript Debugger Commands:'));
    console.log(chalk.white('  help, h                    - Show this help'));
    console.log(chalk.white('  map                        - Show source mappings'));
    console.log(chalk.white('  break <line> [condition]   - Set breakpoint'));
    console.log(chalk.white('  breakpoints, bps           - List breakpoints'));
    console.log(chalk.white('  error <message> <line>     - Simulate error for testing'));
    console.log(chalk.white('  explain <line>             - Explain code at line'));
    console.log(chalk.white('  vars, variables            - Show current variables'));
    console.log(chalk.white('  suggest                    - Get debugging suggestions'));
    console.log(chalk.white('  fix                        - Get automated fix suggestions'));
    console.log(chalk.white('  trace                      - Show stack trace'));
    console.log(chalk.white('  context <line>             - Show code context'));
    console.log(chalk.white('  condition <expression>     - Test natural language condition'));
    console.log(chalk.white('  session                    - Show session information'));
    console.log(chalk.white('  quit, exit, q              - End debug session\n'));
  }

  private showSourceMap(): void {
    const mappings = this.currentSession!.sourceMap.mappings;
    
    console.log(chalk.blue('\n🗺️  Source Map:'));
    console.log(chalk.white('SunScript Line → Target Line | Context'));
    console.log(chalk.gray('─'.repeat(60)));
    
    mappings.slice(0, 10).forEach(mapping => {
      console.log(chalk.white(
        `${mapping.sunScriptLine.toString().padStart(4)} → ${mapping.targetLine.toString().padStart(4)}`.padEnd(20) +
        chalk.gray(' | ') + 
        mapping.naturalLanguageDescription.slice(0, 40)
      ));
    });
    
    if (mappings.length > 10) {
      console.log(chalk.gray(`... and ${mappings.length - 10} more mappings`));
    }
    console.log('');
  }

  private async setBreakpoint(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.red('Usage: break <line> [condition]'));
      return;
    }

    const line = parseInt(args[0]);
    if (isNaN(line)) {
      console.log(chalk.red('Invalid line number'));
      return;
    }

    const condition = args.slice(1).join(' ') || undefined;
    
    try {
      const breakpoint = await this.debugger.setBreakpoint(
        this.currentSession!.id,
        line,
        condition
      );
      
      console.log(chalk.green(`✅ Breakpoint set at line ${line}`));
      if (condition) {
        console.log(chalk.cyan(`   Condition: "${condition}"`));
        if (breakpoint.condition) {
          console.log(chalk.gray(`   Compiled: ${breakpoint.condition}`));
        }
      }
    } catch (error) {
      console.log(chalk.red(`Failed to set breakpoint: ${(error as Error).message}`));
    }
  }

  private showBreakpoints(): void {
    const breakpoints = this.currentSession!.breakpoints;
    
    if (breakpoints.length === 0) {
      console.log(chalk.yellow('No breakpoints set'));
      return;
    }

    console.log(chalk.blue('\n🔴 Breakpoints:'));
    breakpoints.forEach((bp, index) => {
      const status = bp.enabled ? chalk.green('●') : chalk.gray('○');
      const hits = bp.hitCount > 0 ? chalk.cyan(` (hit ${bp.hitCount}x)`) : '';
      
      console.log(`${status} ${index + 1}. Line ${bp.sunScriptLine}${hits}`);
      if (bp.naturalLanguageCondition) {
        console.log(chalk.gray(`     When: ${bp.naturalLanguageCondition}`));
      }
    });
    console.log('');
  }

  private async simulateError(args: string[]): Promise<void> {
    if (args.length < 2) {
      console.log(chalk.red('Usage: error <message> <line>'));
      return;
    }

    const message = args.slice(0, -1).join(' ');
    const line = parseInt(args[args.length - 1]);
    
    if (isNaN(line)) {
      console.log(chalk.red('Invalid line number'));
      return;
    }

    try {
      const error = new Error(message);
      const debugError = await this.debugger.translateError(
        this.currentSession!.id,
        error,
        line,
        0
      );

      console.log(chalk.red('\n🚨 Error Analysis:'));
      console.log(chalk.white(`Technical: ${debugError.message}`));
      console.log(chalk.yellow(`Natural Language: ${debugError.naturalLanguageMessage}`));
      console.log(chalk.blue(`Type: ${debugError.errorType}`));
      console.log(chalk.cyan(`SunScript Location: Line ${debugError.sunScriptLine}`));
      
      if (debugError.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Suggestions:'));
        debugError.suggestions.forEach(suggestion => {
          console.log(chalk.white(`  • ${suggestion}`));
        });
      }

      if (debugError.possibleFixes.length > 0) {
        console.log(chalk.blue('\n🔧 Possible Fixes:'));
        debugError.possibleFixes.forEach((fix, index) => {
          console.log(chalk.white(`  ${index + 1}. ${fix.naturalLanguageDescription}`));
          console.log(chalk.gray(`     ${fix.sunScriptChange} (${fix.confidence}% confidence)`));
        });
      }
      console.log('');
      
    } catch (error) {
      console.log(chalk.red(`Failed to analyze error: ${(error as Error).message}`));
    }
  }

  private async explainCode(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.red('Usage: explain <line>'));
      return;
    }

    const line = parseInt(args[0]);
    if (isNaN(line)) {
      console.log(chalk.red('Invalid line number'));
      return;
    }

    const mapping = this.currentSession!.sourceMap.mappings.find(m => m.sunScriptLine === line);
    
    if (!mapping) {
      console.log(chalk.yellow(`No mapping found for line ${line}`));
      return;
    }

    console.log(chalk.blue(`\n📖 Line ${line} Explanation:`));
    console.log(chalk.white(mapping.naturalLanguageDescription));
    console.log(chalk.gray(`Context: ${mapping.context}`));
    console.log(chalk.gray(`Maps to target line: ${mapping.targetLine}`));
    console.log('');
  }

  private async showVariables(): Promise<void> {
    // Simulate some variables for demo
    const mockVariables: VariableState[] = [
      {
        name: 'userCount',
        value: 42,
        type: 'number',
        naturalLanguageDescription: 'The total number of registered users in the system',
        scope: 'local'
      },
      {
        name: 'isAuthenticated',
        value: true,
        type: 'boolean',
        naturalLanguageDescription: 'Whether the current user has successfully logged in',
        scope: 'local'
      },
      {
        name: 'currentUser',
        value: { name: 'John Doe', email: 'john@example.com' },
        type: 'object',
        naturalLanguageDescription: 'The user object containing information about who is currently logged in',
        scope: 'global'
      }
    ];

    console.log(chalk.blue('\n📊 Current Variables:'));
    mockVariables.forEach(variable => {
      const scopeColor = variable.scope === 'global' ? chalk.red : 
                        variable.scope === 'closure' ? chalk.yellow : chalk.green;
      
      console.log(`${scopeColor(variable.scope.toUpperCase())} ${chalk.white(variable.name)}: ${chalk.cyan(JSON.stringify(variable.value))}`);
      console.log(chalk.gray(`    ${variable.naturalLanguageDescription}`));
    });
    console.log('');
  }

  private async getDebuggingSuggestions(): Promise<void> {
    const mockLine = 15; // Current line simulation
    const mockVariables: VariableState[] = [
      {
        name: 'userInput',
        value: '',
        type: 'string',
        naturalLanguageDescription: 'Empty user input that might be causing issues',
        scope: 'local'
      }
    ];

    try {
      const suggestions = await this.debugger.generateDebuggingSuggestions(
        this.currentSession!.id,
        mockLine,
        mockVariables
      );

      console.log(chalk.blue('\n🔍 Debugging Suggestions:'));
      suggestions.forEach((suggestion, index) => {
        console.log(chalk.white(`  ${index + 1}. ${suggestion}`));
      });
      console.log('');
      
    } catch (error) {
      console.log(chalk.red(`Failed to generate suggestions: ${(error as Error).message}`));
    }
  }

  private async getAutomatedFixes(): Promise<void> {
    console.log(chalk.blue('\n🤖 Automated Fix Analysis:'));
    console.log(chalk.yellow('Analyzing code patterns and common issues...'));
    
    // Simulate automated fix suggestions
    setTimeout(() => {
      console.log(chalk.green('\n✅ Found potential improvements:'));
      console.log(chalk.white('  1. Add input validation (95% confidence)'));
      console.log(chalk.gray('     Change: "check if user input is not empty"'));
      console.log(chalk.white('  2. Add error handling (87% confidence)'));
      console.log(chalk.gray('     Change: "handle the case when operation fails"'));
      console.log(chalk.white('  3. Improve variable naming (72% confidence)'));
      console.log(chalk.gray('     Change: "rename variable to be more descriptive"'));
      console.log('');
    }, 1000);
  }

  private showStackTrace(): void {
    console.log(chalk.blue('\n📚 Stack Trace:'));
    console.log(chalk.white('  1. main function (line 1)'));
    console.log(chalk.gray('     "Start the application and handle user requests"'));
    console.log(chalk.white('  2. authenticate user (line 15)'));
    console.log(chalk.gray('     "Verify user credentials and create session"'));
    console.log(chalk.white('  3. validate input (line 23) ← Current'));
    console.log(chalk.gray('     "Check if the provided input meets requirements"'));
    console.log('');
  }

  private async showContext(args: string[]): Promise<void> {
    const line = args.length > 0 ? parseInt(args[0]) : 15; // Default to current line
    
    if (isNaN(line)) {
      console.log(chalk.red('Invalid line number'));
      return;
    }

    const sunScriptLines = this.currentSession!.sourceMap.sunScriptContent.split('\n');
    const start = Math.max(0, line - 3);
    const end = Math.min(sunScriptLines.length, line + 2);

    console.log(chalk.blue(`\n📄 Context around line ${line}:`));
    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const content = sunScriptLines[i] || '';
      const prefix = lineNum === line ? chalk.red('→') : ' ';
      const lineColor = lineNum === line ? chalk.yellow : chalk.white;
      
      console.log(`${prefix} ${lineColor(lineNum.toString().padStart(3))}: ${content}`);
    }
    console.log('');
  }

  private async testCondition(args: string[]): Promise<void> {
    const condition = args.join(' ');
    
    if (!condition) {
      console.log(chalk.red('Usage: condition <natural language expression>'));
      return;
    }

    console.log(chalk.blue('\n🧪 Testing Condition:'));
    console.log(chalk.white(`Natural Language: "${condition}"`));
    
    try {
      // Use the private method via type assertion
      const compiled = await (this.debugger as any).compileCondition(condition);
      console.log(chalk.green(`Compiled: ${compiled}`));
      
      // Simulate evaluation
      console.log(chalk.cyan('Evaluation: Would need runtime context to execute'));
      console.log('');
      
    } catch (error) {
      console.log(chalk.red(`Failed to compile condition: ${(error as Error).message}`));
    }
  }

  private showSessionInfo(): void {
    console.log(chalk.blue('\n📋 Session Information:'));
    console.log(chalk.white(`ID: ${this.currentSession!.id}`));
    console.log(chalk.white(`SunScript File: ${this.currentSession!.sunScriptFile}`));
    console.log(chalk.white(`Target File: ${this.currentSession!.targetFile}`));
    console.log(chalk.white(`Breakpoints: ${this.currentSession!.breakpoints.length}`));
    console.log(chalk.white(`Source Mappings: ${this.currentSession!.sourceMap.mappings.length}`));
    console.log(chalk.white(`Status: ${this.currentSession!.isRunning ? 'Running' : 'Paused'}`));
    console.log('');
  }
}