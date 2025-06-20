import * as fs from 'fs/promises';
import * as path from 'path';
import { SunScriptError } from './SunScriptError';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: SunScriptError;
  stage?: string;
  operation?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
  logFile?: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  includeStackTrace?: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private isWriting = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      logToFile: true,
      logToConsole: true,
      logFile: path.join(process.cwd(), 'sunscript.log'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      includeStackTrace: false,
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  async debug(message: string, context?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.DEBUG)) {
      await this.log(LogLevel.DEBUG, message, context);
    }
  }

  async info(message: string, context?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.INFO)) {
      await this.log(LogLevel.INFO, message, context);
    }
  }

  async warn(message: string, context?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.WARN)) {
      await this.log(LogLevel.WARN, message, context);
    }
  }

  async error(message: string, error?: SunScriptError | Error, context?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.ERROR)) {
      const sunScriptError = error instanceof SunScriptError ? error : undefined;
      await this.log(LogLevel.ERROR, message, {
        ...context,
        error: error?.message,
        stack: this.config.includeStackTrace ? error?.stack : undefined
      }, sunScriptError);
    }
  }

  async fatal(message: string, error?: SunScriptError | Error, context?: Record<string, any>): Promise<void> {
    await this.log(LogLevel.FATAL, message, {
      ...context,
      error: error?.message,
      stack: error?.stack // Always include stack trace for fatal errors
    }, error instanceof SunScriptError ? error : undefined);
  }

  async logCompilerStage(stage: string, operation: string, message: string, context?: Record<string, any>): Promise<void> {
    await this.info(message, {
      ...context,
      stage,
      operation,
      type: 'compiler'
    });
  }

  async logAIProviderCall(provider: string, model: string, tokensUsed: number, responseTime: number): Promise<void> {
    await this.info('AI provider call completed', {
      provider,
      model,
      tokensUsed,
      responseTime,
      type: 'ai-provider'
    });
  }

  async logPerformanceMetric(operation: string, duration: number, metadata?: Record<string, any>): Promise<void> {
    await this.debug('Performance metric', {
      operation,
      duration,
      type: 'performance',
      ...metadata
    });
  }

  private async log(level: LogLevel, message: string, context?: Record<string, any>, error?: SunScriptError): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      stage: context?.stage,
      operation: context?.operation
    };

    // Console logging
    if (this.config.logToConsole) {
      this.logToConsole(entry);
    }

    // File logging
    if (this.config.logToFile) {
      this.logQueue.push(entry);
      await this.flushLogs();
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.split('T')[1].split('.')[0]; // HH:MM:SS format
    
    let colorCode = '';
    let resetCode = '\x1b[0m';
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        colorCode = '\x1b[36m'; // Cyan
        break;
      case LogLevel.INFO:
        colorCode = '\x1b[32m'; // Green
        break;
      case LogLevel.WARN:
        colorCode = '\x1b[33m'; // Yellow
        break;
      case LogLevel.ERROR:
        colorCode = '\x1b[31m'; // Red
        break;
      case LogLevel.FATAL:
        colorCode = '\x1b[35m'; // Magenta
        break;
    }

    let output = `${colorCode}[${timestamp}] ${levelName}${resetCode}: ${entry.message}`;
    
    if (entry.stage && entry.operation) {
      output += ` (${entry.stage}:${entry.operation})`;
    }
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .filter(([key]) => !['stage', 'operation', 'type', 'error', 'stack'].includes(key))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      
      if (contextStr) {
        output += ` | ${contextStr}`;
      }
    }

    console.log(output);

    // Log error details separately for better readability
    if (entry.error) {
      console.error(entry.error.toString());
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.isWriting || this.logQueue.length === 0) {
      return;
    }

    this.isWriting = true;

    try {
      const entries = [...this.logQueue];
      this.logQueue = [];

      // Check file size and rotate if necessary
      await this.rotateLogsIfNeeded();

      // Write entries to file
      const logLines = entries.map(entry => this.formatLogEntry(entry)).join('\n') + '\n';
      await fs.appendFile(this.config.logFile!, logLines, 'utf-8');

    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', error);
      this.logQueue.unshift(...this.logQueue); // Re-add entries to queue
    } finally {
      this.isWriting = false;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const contextStr = entry.context ? JSON.stringify(entry.context) : '{}';
    const errorStr = entry.error ? JSON.stringify(entry.error.toJSON()) : 'null';
    
    return JSON.stringify({
      timestamp: entry.timestamp,
      level: LogLevel[entry.level],
      message: entry.message,
      context: entry.context || {},
      error: entry.error?.toJSON() || null,
      stage: entry.stage,
      operation: entry.operation
    });
  }

  private async rotateLogsIfNeeded(): Promise<void> {
    if (!this.config.logFile) return;

    try {
      const stats = await fs.stat(this.config.logFile);
      
      if (stats.size > (this.config.maxFileSize || 10 * 1024 * 1024)) {
        await this.rotateLogs();
      }
    } catch (error) {
      // File doesn't exist yet, no need to rotate
    }
  }

  private async rotateLogs(): Promise<void> {
    if (!this.config.logFile) return;

    const logDir = path.dirname(this.config.logFile);
    const logName = path.basename(this.config.logFile, '.log');
    const maxFiles = this.config.maxFiles || 5;

    // Rotate existing files
    for (let i = maxFiles - 1; i > 0; i--) {
      const oldFile = path.join(logDir, `${logName}.${i}.log`);
      const newFile = path.join(logDir, `${logName}.${i + 1}.log`);
      
      try {
        await fs.rename(oldFile, newFile);
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    // Move current log to .1
    try {
      const rotatedFile = path.join(logDir, `${logName}.1.log`);
      await fs.rename(this.config.logFile, rotatedFile);
    } catch (error) {
      // Current log file doesn't exist, continue
    }

    // Remove oldest log file if it exceeds maxFiles
    const oldestFile = path.join(logDir, `${logName}.${maxFiles + 1}.log`);
    try {
      await fs.unlink(oldestFile);
    } catch (error) {
      // File doesn't exist, continue
    }
  }

  async close(): Promise<void> {
    // Flush any remaining logs
    await this.flushLogs();
  }

  // Utility method to create child logger with additional context
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.config);
    
    // Override log method to include additional context
    const originalLog = childLogger.log.bind(childLogger);
    (childLogger as any).log = async (level: LogLevel, message: string, entryContext?: Record<string, any>, error?: SunScriptError) => {
      return originalLog(level, message, { ...context, ...entryContext }, error);
    };
    
    return childLogger;
  }

  // Get log statistics
  async getLogStats(): Promise<{ fileSize: number; lineCount: number }> {
    if (!this.config.logFile) {
      return { fileSize: 0, lineCount: 0 };
    }

    try {
      const stats = await fs.stat(this.config.logFile);
      const content = await fs.readFile(this.config.logFile, 'utf-8');
      const lineCount = content.split('\n').filter(line => line.trim()).length;
      
      return {
        fileSize: stats.size,
        lineCount
      };
    } catch (error) {
      return { fileSize: 0, lineCount: 0 };
    }
  }
}

// Global logger instance
export const globalLogger = new Logger({
  level: process.env.SUNSCRIPT_LOG_LEVEL ? 
    LogLevel[process.env.SUNSCRIPT_LOG_LEVEL as keyof typeof LogLevel] : 
    LogLevel.INFO,
  logToConsole: process.env.SUNSCRIPT_LOG_CONSOLE !== 'false',
  logToFile: process.env.SUNSCRIPT_LOG_FILE !== 'false',
  includeStackTrace: process.env.SUNSCRIPT_LOG_STACK === 'true'
});

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await globalLogger.close();
});

process.on('SIGINT', async () => {
  await globalLogger.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await globalLogger.close();
  process.exit(0);
});