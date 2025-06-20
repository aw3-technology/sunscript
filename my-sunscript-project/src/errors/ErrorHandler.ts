import { SunScriptError, ErrorCode } from './SunScriptError';

export interface ErrorContext {
  operation: string;
  stage: 'parsing' | 'compilation' | 'generation' | 'file-system' | 'ai-provider' | 'cli';
  filePath?: string;
  additionalInfo?: Record<string, any>;
}

export interface ErrorHandlerOptions {
  verbose?: boolean;
  exitOnError?: boolean;
  logErrors?: boolean;
  maxRetries?: number;
}

export class ErrorHandler {
  private options: ErrorHandlerOptions;
  private errorLog: SunScriptError[] = [];

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      verbose: false,
      exitOnError: false,
      logErrors: true,
      maxRetries: 3,
      ...options
    };
  }

  handle(error: Error | SunScriptError, context?: ErrorContext): SunScriptError {
    let sunScriptError: SunScriptError;

    if (error instanceof SunScriptError) {
      sunScriptError = error;
    } else {
      // Convert generic errors to SunScriptError
      sunScriptError = this.convertToSunScriptError(error, context);
    }

    // Add context if provided
    if (context && !sunScriptError.context) {
      // Create a new error with merged context since properties are readonly
      sunScriptError = new SunScriptError(
        sunScriptError.code,
        sunScriptError.message,
        {
          context: {
            ...sunScriptError.context,
            operation: context.operation,
            stage: context.stage,
            ...context.additionalInfo
          },
          filePath: sunScriptError.filePath || context.filePath,
          line: sunScriptError.line,
          column: sunScriptError.column,
          suggestions: sunScriptError.suggestions,
          cause: sunScriptError.cause
        }
      );
    }

    // Log the error
    if (this.options.logErrors) {
      this.logError(sunScriptError);
    }

    // Store in error log
    this.errorLog.push(sunScriptError);

    // Exit if configured to do so
    if (this.options.exitOnError) {
      console.error(this.formatError(sunScriptError));
      process.exit(1);
    }

    return sunScriptError;
  }

  handleAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryCount: number = 0
  ): Promise<T> {
    return operation().catch(async (error) => {
      const handledError = this.handle(error, context);
      
      // Retry logic for certain error types
      if (this.shouldRetry(handledError, retryCount)) {
        console.warn(`Retrying ${context.operation} (attempt ${retryCount + 1}/${this.options.maxRetries})`);
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.handleAsync(operation, context, retryCount + 1);
      }
      
      throw handledError;
    });
  }

  handleSync<T>(operation: () => T, context: ErrorContext): T {
    try {
      return operation();
    } catch (error) {
      throw this.handle(error as Error, context);
    }
  }

  wrap<T extends any[], R>(
    fn: (...args: T) => R,
    context: Partial<ErrorContext>
  ): (...args: T) => R {
    return (...args: T) => {
      return this.handleSync(() => fn(...args), {
        operation: context.operation || fn.name || 'unknown',
        stage: context.stage || 'cli',
        ...context
      });
    };
  }

  wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: Partial<ErrorContext>
  ): (...args: T) => Promise<R> {
    return (...args: T) => {
      return this.handleAsync(
        () => fn(...args),
        {
          operation: context.operation || fn.name || 'unknown',
          stage: context.stage || 'cli',
          ...context
        }
      );
    };
  }

  private convertToSunScriptError(error: Error, context?: ErrorContext): SunScriptError {
    // Try to infer error type from message or context
    let code = ErrorCode.INTERNAL_ERROR;
    let suggestions: string[] = [];

    if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      code = ErrorCode.FILE_NOT_FOUND;
      suggestions.push('Check if the file path is correct');
      suggestions.push('Ensure the file exists in the specified location');
    } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
      code = ErrorCode.FILE_ACCESS_DENIED;
      suggestions.push('Check file permissions');
      suggestions.push('Run with appropriate privileges');
    } else if (error.message.includes('timeout')) {
      code = ErrorCode.AI_TIMEOUT;
      suggestions.push('Try again with a shorter prompt');
      suggestions.push('Check your network connection');
    } else if (error.message.includes('API key') || error.message.includes('authentication')) {
      code = ErrorCode.AI_AUTHENTICATION_FAILED;
      suggestions.push('Check your API key configuration');
      suggestions.push('Ensure the API key has proper permissions');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      code = ErrorCode.NETWORK_ERROR;
      suggestions.push('Check your internet connection');
      suggestions.push('Verify the API endpoint is accessible');
    }

    return new SunScriptError(code, error.message, {
      context: context?.additionalInfo,
      filePath: context?.filePath,
      suggestions,
      cause: error
    });
  }

  private shouldRetry(error: SunScriptError, retryCount: number): boolean {
    if (retryCount >= (this.options.maxRetries || 3)) {
      return false;
    }

    // Retry on certain error types
    const retryableErrors = [
      ErrorCode.AI_TIMEOUT,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.AI_API_ERROR
    ];

    return retryableErrors.includes(error.code);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logError(error: SunScriptError): void {
    if (this.options.verbose) {
      console.error(this.formatError(error));
    } else {
      console.error(`Error [${error.code}]: ${error.message}`);
    }
  }

  private formatError(error: SunScriptError): string {
    let output = `\n┌─ Error [${error.code}] `;
    output += '─'.repeat(Math.max(0, 60 - output.length)) + '┐\n';
    output += `│ ${error.message}\n`;
    
    if (error.filePath) {
      output += `│ File: ${error.filePath}`;
      if (error.line !== undefined) {
        output += `:${error.line}`;
        if (error.column !== undefined) {
          output += `:${error.column}`;
        }
      }
      output += '\n';
    }
    
    if (error.context?.operation) {
      output += `│ Operation: ${error.context.operation}\n`;
    }
    
    if (error.context?.stage) {
      output += `│ Stage: ${error.context.stage}\n`;
    }
    
    if (error.suggestions && error.suggestions.length > 0) {
      output += `│\n│ Suggestions:\n`;
      error.suggestions.forEach(suggestion => {
        output += `│   • ${suggestion}\n`;
      });
    }
    
    if (this.options.verbose && error.stack) {
      output += `│\n│ Stack trace:\n`;
      const stackLines = error.stack.split('\n').slice(1, 6); // Show first 5 stack frames
      stackLines.forEach(line => {
        output += `│   ${line.trim()}\n`;
      });
    }
    
    output += '└' + '─'.repeat(60) + '┘\n';
    
    return output;
  }

  getErrorLog(): SunScriptError[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  hasErrors(): boolean {
    return this.errorLog.length > 0;
  }

  getErrorSummary(): { [key in ErrorCode]?: number } {
    const summary: { [key in ErrorCode]?: number } = {};
    
    this.errorLog.forEach(error => {
      summary[error.code] = (summary[error.code] || 0) + 1;
    });
    
    return summary;
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler({
  verbose: process.env.SUNSCRIPT_VERBOSE === 'true',
  logErrors: true,
  exitOnError: false
});

// Utility functions for common error scenarios
export function createFileNotFoundError(filePath: string): SunScriptError {
  return new SunScriptError(ErrorCode.FILE_NOT_FOUND, `File not found: ${filePath}`, {
    filePath,
    suggestions: [
      'Check if the file path is correct',
      'Ensure the file exists in the specified location'
    ]
  });
}

export function createParseError(message: string, filePath: string, line?: number, column?: number): SunScriptError {
  return new SunScriptError(ErrorCode.SYNTAX_ERROR, message, {
    filePath,
    line,
    column,
    suggestions: [
      'Check the syntax of your SunScript code',
      'Refer to the SunScript documentation for correct syntax'
    ]
  });
}

export function createAIProviderError(provider: string, originalError: Error): SunScriptError {
  return new SunScriptError(ErrorCode.AI_API_ERROR, `AI provider ${provider} failed: ${originalError.message}`, {
    context: { provider },
    cause: originalError,
    suggestions: [
      'Check your API key and configuration',
      'Verify the AI service is available',
      'Try using a different AI provider'
    ]
  });
}