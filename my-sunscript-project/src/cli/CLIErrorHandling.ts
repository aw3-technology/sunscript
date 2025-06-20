import chalk from 'chalk';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { Logger } from '../errors/Logger';

export interface CLIErrorDisplayOptions {
  verbose: boolean;
  showSuggestions: boolean;
  colorize: boolean;
}

export class CLIErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async handleError(error: Error | SunScriptError, operation: string, options: CLIErrorDisplayOptions = {
    verbose: false,
    showSuggestions: true,
    colorize: true
  }): Promise<void> {
    const sunScriptError = error instanceof SunScriptError ? error : this.convertToSunScriptError(error);
    
    // Log the error
    await this.logger.error(`CLI operation failed: ${operation}`, sunScriptError, {
      operation,
      stage: 'cli'
    });

    // Display user-friendly error message
    this.displayError(sunScriptError, options);
  }

  private convertToSunScriptError(error: Error): SunScriptError {
    // Convert common Node.js errors to SunScript errors
    if (error.message.includes('ENOENT')) {
      return new SunScriptError(ErrorCode.FILE_NOT_FOUND, error.message, {
        cause: error,
        suggestions: ['Check if the file path is correct', 'Ensure the file exists']
      });
    } else if (error.message.includes('EACCES')) {
      return new SunScriptError(ErrorCode.FILE_ACCESS_DENIED, error.message, {
        cause: error,
        suggestions: ['Check file permissions', 'Run with appropriate privileges']
      });
    } else if (error.message.includes('command not found')) {
      return new SunScriptError(ErrorCode.INVALID_CONFIG, error.message, {
        cause: error,
        suggestions: ['Check the command syntax', 'Use --help for available commands']
      });
    }

    return new SunScriptError(ErrorCode.INTERNAL_ERROR, error.message, {
      cause: error,
      suggestions: ['Try again', 'Report this issue if the problem persists']
    });
  }

  private displayError(error: SunScriptError, options: CLIErrorDisplayOptions): void {
    const { colorize, verbose, showSuggestions } = options;

    // Helper functions for optional colorization
    const red = colorize ? chalk.red : (str: string) => str;
    const yellow = colorize ? chalk.yellow : (str: string) => str;
    const blue = colorize ? chalk.blue : (str: string) => str;
    const gray = colorize ? chalk.gray : (str: string) => str;
    const bold = colorize ? chalk.bold : (str: string) => str;

    console.error('\n' + red('❌ Error: ') + bold(error.message));

    // Show error code in verbose mode
    if (verbose) {
      console.error(gray(`Code: ${error.code}`));
    }

    // Show file location if available
    if (error.filePath) {
      let location = `File: ${error.filePath}`;
      if (error.line !== undefined) {
        location += `:${error.line}`;
        if (error.column !== undefined) {
          location += `:${error.column}`;
        }
      }
      console.error(blue(location));
    }

    // Show context in verbose mode
    if (verbose && error.context) {
      console.error(gray('Context:'));
      Object.entries(error.context).forEach(([key, value]) => {
        if (key !== 'operation' && key !== 'stage') {
          console.error(gray(`  ${key}: ${JSON.stringify(value)}`));
        }
      });
    }

    // Show suggestions
    if (showSuggestions && error.suggestions && error.suggestions.length > 0) {
      console.error('\n' + yellow('💡 Suggestions:'));
      error.suggestions.forEach(suggestion => {
        console.error(yellow(`  • ${suggestion}`));
      });
    }

    // Show stack trace in verbose mode
    if (verbose && error.stack) {
      console.error('\n' + gray('Stack trace:'));
      console.error(gray(error.stack));
    }

    console.error(''); // Empty line for spacing
  }

  displaySuccess(message: string, details?: Record<string, any>, colorize: boolean = true): void {
    const green = colorize ? chalk.green : (str: string) => str;
    const gray = colorize ? chalk.gray : (str: string) => str;

    console.log(green('✅ ') + message);

    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(gray(`  ${key}: ${value}`));
      });
    }
  }

  displayWarning(message: string, details?: string[], colorize: boolean = true): void {
    const yellow = colorize ? chalk.yellow : (str: string) => str;
    const gray = colorize ? chalk.gray : (str: string) => str;

    console.warn(yellow('⚠️  ') + message);

    if (details && details.length > 0) {
      details.forEach(detail => {
        console.warn(gray(`  • ${detail}`));
      });
    }
  }

  displayProgress(message: string, colorize: boolean = true): void {
    const blue = colorize ? chalk.blue : (str: string) => str;
    console.log(blue('⏳ ') + message);
  }

  displayInfo(message: string, details?: Record<string, any>, colorize: boolean = true): void {
    const cyan = colorize ? chalk.cyan : (str: string) => str;
    const gray = colorize ? chalk.gray : (str: string) => str;

    console.log(cyan('ℹ️  ') + message);

    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(gray(`  ${key}: ${value}`));
      });
    }
  }

  createProgressBar(total: number, colorize: boolean = true): ProgressBar {
    return new ProgressBar(total, colorize);
  }
}

export class ProgressBar {
  private current = 0;
  private total: number;
  private colorize: boolean;
  private lastRender = '';

  constructor(total: number, colorize: boolean = true) {
    this.total = total;
    this.colorize = colorize;
  }

  increment(message?: string): void {
    this.current++;
    this.render(message);
  }

  setProgress(current: number, message?: string): void {
    this.current = current;
    this.render(message);
  }

  complete(message?: string): void {
    this.current = this.total;
    this.render(message);
    console.log(''); // New line after completion
  }

  private render(message?: string): void {
    const percentage = Math.round((this.current / this.total) * 100);
    const filled = Math.round((this.current / this.total) * 20);
    const empty = 20 - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const progress = this.colorize ? 
      chalk.green(`${percentage}%`) + ' ' + chalk.blue(bar) :
      `${percentage}% ${bar}`;
    
    const output = `${progress} ${this.current}/${this.total}${message ? ` - ${message}` : ''}`;
    
    // Clear the previous line and render new progress
    if (this.lastRender) {
      process.stdout.write('\r' + ' '.repeat(this.lastRender.length) + '\r');
    }
    
    process.stdout.write(output);
    this.lastRender = output;
  }
}

// Utility function to handle async operations with proper error display
export async function withCLIErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  errorHandler: CLIErrorHandler,
  options: CLIErrorDisplayOptions = {
    verbose: false,
    showSuggestions: true,
    colorize: true
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await errorHandler.handleError(error as Error, operationName, options);
    process.exit(1);
  }
}

// Utility function for handling synchronous operations
export function withCLIErrorHandlingSync<T>(
  operation: () => T,
  operationName: string,
  errorHandler: CLIErrorHandler,
  options: CLIErrorDisplayOptions = {
    verbose: false,
    showSuggestions: true,
    colorize: true
  }
): T {
  try {
    return operation();
  } catch (error) {
    // Use setTimeout to make it async for error handling
    setTimeout(async () => {
      await errorHandler.handleError(error as Error, operationName, options);
      process.exit(1);
    }, 0);
    
    // This will never be reached, but TypeScript needs it
    throw error;
  }
}