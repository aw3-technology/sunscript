export enum ErrorCode {
  // Parsing errors
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  UNEXPECTED_EOF = 'UNEXPECTED_EOF',
  MALFORMED_EXPRESSION = 'MALFORMED_EXPRESSION',
  
  // Compilation errors
  COMPILATION_FAILED = 'COMPILATION_FAILED',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  UNKNOWN_IDENTIFIER = 'UNKNOWN_IDENTIFIER',
  INVALID_OPERATION = 'INVALID_OPERATION',
  
  // AI provider errors
  AI_API_ERROR = 'AI_API_ERROR',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  AI_AUTHENTICATION_FAILED = 'AI_AUTHENTICATION_FAILED',
  AI_MODEL_NOT_FOUND = 'AI_MODEL_NOT_FOUND',
  
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  INVALID_PATH = 'INVALID_PATH',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  
  // Genesis file errors
  GENESIS_NOT_FOUND = 'GENESIS_NOT_FOUND',
  GENESIS_PARSE_ERROR = 'GENESIS_PARSE_ERROR',
  GENESIS_VALIDATION_ERROR = 'GENESIS_VALIDATION_ERROR',
  
  // Dependency errors
  DEPENDENCY_NOT_FOUND = 'DEPENDENCY_NOT_FOUND',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_REQUIRED_CONFIG = 'MISSING_REQUIRED_CONFIG',
  
  // Security errors
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  INVALID_INPUT = 'INVALID_INPUT',
  FILE_OPERATION_FAILED = 'FILE_OPERATION_FAILED',
  EXTERNAL_COMMAND_FAILED = 'EXTERNAL_COMMAND_FAILED',
  TIMEOUT = 'TIMEOUT',
  
  // Internal errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED'
}

export class SunScriptError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;
  public readonly filePath?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly suggestions?: string[];

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      context?: Record<string, any>;
      filePath?: string;
      line?: number;
      column?: number;
      suggestions?: string[];
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'SunScriptError';
    this.code = code;
    this.context = options.context;
    this.filePath = options.filePath;
    this.line = options.line;
    this.column = options.column;
    this.suggestions = options.suggestions;
    
    if (options.cause) {
      this.cause = options.cause;
    }
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SunScriptError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      filePath: this.filePath,
      line: this.line,
      column: this.column,
      suggestions: this.suggestions,
      stack: this.stack
    };
  }

  toString(): string {
    let errorStr = `${this.name} [${this.code}]: ${this.message}`;
    
    if (this.filePath) {
      errorStr += `\n  at ${this.filePath}`;
      if (this.line !== undefined) {
        errorStr += `:${this.line}`;
        if (this.column !== undefined) {
          errorStr += `:${this.column}`;
        }
      }
    }
    
    if (this.suggestions && this.suggestions.length > 0) {
      errorStr += '\n\nSuggestions:';
      this.suggestions.forEach(suggestion => {
        errorStr += `\n  • ${suggestion}`;
      });
    }
    
    return errorStr;
  }
}

// Specific error classes for different error types
export class ParseError extends SunScriptError {
  constructor(message: string, options: Parameters<typeof SunScriptError.prototype.constructor>[2] = {}) {
    super(ErrorCode.SYNTAX_ERROR, message, options);
    this.name = 'ParseError';
  }
}

export class CompilationError extends SunScriptError {
  constructor(message: string, options: Parameters<typeof SunScriptError.prototype.constructor>[2] = {}) {
    super(ErrorCode.COMPILATION_FAILED, message, options);
    this.name = 'CompilationError';
  }
}

export class AIProviderError extends SunScriptError {
  constructor(code: ErrorCode, message: string, options: Parameters<typeof SunScriptError.prototype.constructor>[2] = {}) {
    super(code, message, options);
    this.name = 'AIProviderError';
  }
}

export class FileSystemError extends SunScriptError {
  constructor(code: ErrorCode, message: string, options: Parameters<typeof SunScriptError.prototype.constructor>[2] = {}) {
    super(code, message, options);
    this.name = 'FileSystemError';
  }
}

export class GenesisError extends SunScriptError {
  constructor(code: ErrorCode, message: string, options: Parameters<typeof SunScriptError.prototype.constructor>[2] = {}) {
    super(code, message, options);
    this.name = 'GenesisError';
  }
}

export class NetworkError extends SunScriptError {
  constructor(code: ErrorCode, message: string, options: Parameters<typeof SunScriptError.prototype.constructor>[2] = {}) {
    super(code, message, options);
    this.name = 'NetworkError';
  }
}