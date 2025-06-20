import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { SunScriptError, ErrorCode, FileSystemError } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';
import { FileSecurityValidator } from './FileSecurityValidator';

export interface TempFileOptions {
  prefix?: string;
  suffix?: string;
  extension?: string;
  directory?: string;
  mode?: number;
  maxAge?: number; // in milliseconds
  autoCleanup?: boolean;
}

export interface TempFileInfo {
  path: string;
  cleanup: () => Promise<void>;
  isValid: () => Promise<boolean>;
  createdAt: Date;
}

export class SecureTempFileManager {
  private tempFiles = new Map<string, TempFileInfo>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private validator: FileSecurityValidator;

  constructor() {
    this.validator = new FileSecurityValidator({
      allowedExtensions: ['.tmp', '.temp', '.sun', '.js', '.ts', '.json', '.html', '.css'],
      maxFileSize: 100 * 1024 * 1024, // 100MB for temp files
      allowSymlinks: false,
      allowHiddenFiles: true, // Temp files might be hidden
      scanForMaliciousContent: false // Skip content scanning for temp files
    });

    // Start cleanup interval (every 30 minutes)
    this.startCleanupInterval();

    // Cleanup on process exit
    this.setupExitHandlers();
  }

  async createTempFile(options: TempFileOptions = {}): Promise<TempFileInfo> {
    const tempDir = await this.getSecureTempDirectory(options.directory);
    const fileName = this.generateSecureFileName(options);
    const filePath = path.join(tempDir, fileName);

    try {
      // Validate the temp file path
      const validation = await this.validator.validateFilePath(filePath);
      if (!validation.valid) {
        throw new FileSystemError(ErrorCode.INVALID_PATH, `Temp file path validation failed: ${validation.securityIssues?.join(', ')}`, {
          filePath,
          suggestions: validation.suggestions
        });
      }

      // Create the file with secure permissions (owner read/write only)
      const mode = options.mode || 0o600;
      await fs.writeFile(filePath, '', { mode });

      // Create cleanup function
      const cleanup = async () => {
        await this.deleteTempFile(filePath);
      };

      // Create validation function
      const isValid = async () => {
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      };

      const tempFileInfo: TempFileInfo = {
        path: filePath,
        cleanup,
        isValid,
        createdAt: new Date()
      };

      // Track the temp file
      this.tempFiles.set(filePath, tempFileInfo);

      // Set up auto-cleanup if specified
      if (options.autoCleanup && options.maxAge) {
        setTimeout(async () => {
          if (this.tempFiles.has(filePath)) {
            await cleanup();
          }
        }, options.maxAge);
      }

      await globalLogger.debug('Temporary file created', {
        type: 'temp-file',
        filePath,
        mode: mode.toString(8),
        autoCleanup: options.autoCleanup
      });

      return tempFileInfo;

    } catch (error) {
      throw new FileSystemError(ErrorCode.FILE_WRITE_ERROR, `Failed to create temp file: ${(error as Error).message}`, {
        filePath,
        cause: error as Error,
        suggestions: ['Check temp directory permissions', 'Ensure sufficient disk space']
      });
    }
  }

  async createTempDirectory(options: TempFileOptions = {}): Promise<TempFileInfo> {
    const tempParentDir = await this.getSecureTempDirectory(options.directory);
    const dirName = this.generateSecureFileName({ ...options, extension: '' });
    const dirPath = path.join(tempParentDir, dirName);

    try {
      // Create directory with secure permissions (owner read/write/execute only)
      const mode = options.mode || 0o700;
      await fs.mkdir(dirPath, { mode, recursive: true });

      // Create cleanup function
      const cleanup = async () => {
        await this.deleteTempDirectory(dirPath);
      };

      // Create validation function
      const isValid = async () => {
        try {
          const stats = await fs.stat(dirPath);
          return stats.isDirectory();
        } catch {
          return false;
        }
      };

      const tempDirInfo: TempFileInfo = {
        path: dirPath,
        cleanup,
        isValid,
        createdAt: new Date()
      };

      // Track the temp directory
      this.tempFiles.set(dirPath, tempDirInfo);

      await globalLogger.debug('Temporary directory created', {
        type: 'temp-directory',
        dirPath,
        mode: mode.toString(8)
      });

      return tempDirInfo;

    } catch (error) {
      throw new FileSystemError(ErrorCode.FILE_WRITE_ERROR, `Failed to create temp directory: ${(error as Error).message}`, {
        filePath: dirPath,
        cause: error as Error,
        suggestions: ['Check temp directory permissions', 'Ensure sufficient disk space']
      });
    }
  }

  async writeTempFile(filePath: string, content: string | Buffer, options: { validate?: boolean } = {}): Promise<void> {
    try {
      // Validate that this is a tracked temp file
      if (!this.tempFiles.has(filePath)) {
        throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, 'Attempted to write to untracked temp file', {
          filePath,
          suggestions: ['Use createTempFile() to create temp files']
        });
      }

      // Validate content if requested
      if (options.validate && typeof content === 'string') {
        const validation = await this.validator.validateFileContent(filePath, content);
        if (!validation.valid) {
          await globalLogger.warn('Malicious content detected in temp file write', {
            type: 'security',
            filePath,
            issues: validation.securityIssues
          });
          
          throw new FileSystemError(ErrorCode.INVALID_OPERATION, `Temp file content validation failed: ${validation.securityIssues?.join(', ')}`, {
            filePath,
            suggestions: validation.suggestions
          });
        }
      }

      await fs.writeFile(filePath, content);

      await globalLogger.debug('Content written to temp file', {
        type: 'temp-file',
        filePath,
        contentSize: typeof content === 'string' ? content.length : content.length,
        validated: options.validate
      });

    } catch (error) {
      if (error instanceof SunScriptError) {
        throw error;
      }
      
      throw new FileSystemError(ErrorCode.FILE_WRITE_ERROR, `Failed to write temp file: ${(error as Error).message}`, {
        filePath,
        cause: error as Error
      });
    }
  }

  async readTempFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    try {
      // Validate that this is a tracked temp file
      if (!this.tempFiles.has(filePath)) {
        throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, 'Attempted to read untracked temp file', {
          filePath,
          suggestions: ['Use createTempFile() to create temp files']
        });
      }

      const content = await fs.readFile(filePath, encoding);

      await globalLogger.debug('Content read from temp file', {
        type: 'temp-file',
        filePath,
        contentSize: content.length
      });

      return content;

    } catch (error) {
      if (error instanceof SunScriptError) {
        throw error;
      }
      
      throw new FileSystemError(ErrorCode.FILE_NOT_FOUND, `Failed to read temp file: ${(error as Error).message}`, {
        filePath,
        cause: error as Error
      });
    }
  }

  async deleteTempFile(filePath: string): Promise<void> {
    try {
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, consider it already cleaned up
        this.tempFiles.delete(filePath);
        return;
      }

      // Securely delete the file
      await this.secureDelete(filePath);
      
      // Remove from tracking
      this.tempFiles.delete(filePath);

      await globalLogger.debug('Temporary file deleted', {
        type: 'temp-file',
        filePath
      });

    } catch (error) {
      await globalLogger.warn('Failed to delete temp file', {
        type: 'temp-file',
        filePath,
        error: (error as Error).message
      });
      
      // Still remove from tracking to avoid memory leaks
      this.tempFiles.delete(filePath);
    }
  }

  async deleteTempDirectory(dirPath: string): Promise<void> {
    try {
      // Check if directory exists
      try {
        await fs.access(dirPath);
      } catch {
        // Directory doesn't exist, consider it already cleaned up
        this.tempFiles.delete(dirPath);
        return;
      }

      // Recursively delete directory contents
      await fs.rm(dirPath, { recursive: true, force: true });
      
      // Remove from tracking
      this.tempFiles.delete(dirPath);

      await globalLogger.debug('Temporary directory deleted', {
        type: 'temp-directory',
        dirPath
      });

    } catch (error) {
      await globalLogger.warn('Failed to delete temp directory', {
        type: 'temp-directory',
        dirPath,
        error: (error as Error).message
      });
      
      // Still remove from tracking to avoid memory leaks
      this.tempFiles.delete(dirPath);
    }
  }

  async cleanupExpiredFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const expiredFiles: string[] = [];

    for (const [filePath, info] of this.tempFiles.entries()) {
      const age = now - info.createdAt.getTime();
      if (age > maxAge) {
        expiredFiles.push(filePath);
      }
    }

    for (const filePath of expiredFiles) {
      const info = this.tempFiles.get(filePath);
      if (info) {
        await info.cleanup();
      }
    }

    if (expiredFiles.length > 0) {
      await globalLogger.info('Cleaned up expired temp files', {
        type: 'temp-file-cleanup',
        count: expiredFiles.length,
        maxAge
      });
    }
  }

  async cleanupAll(): Promise<void> {
    const filePaths = Array.from(this.tempFiles.keys());
    
    for (const filePath of filePaths) {
      const info = this.tempFiles.get(filePath);
      if (info) {
        await info.cleanup();
      }
    }

    await globalLogger.info('Cleaned up all temp files', {
      type: 'temp-file-cleanup',
      count: filePaths.length
    });
  }

  private async getSecureTempDirectory(customDir?: string): Promise<string> {
    let tempDir: string;

    if (customDir) {
      // Validate custom temp directory
      const validation = await this.validator.validateFilePath(customDir);
      if (!validation.valid) {
        throw new FileSystemError(ErrorCode.INVALID_PATH, `Custom temp directory validation failed: ${validation.securityIssues?.join(', ')}`, {
          filePath: customDir,
          suggestions: validation.suggestions
        });
      }
      tempDir = customDir;
    } else {
      tempDir = os.tmpdir();
    }

    // Ensure temp directory exists and is writable
    try {
      await fs.access(tempDir, fs.constants.W_OK);
    } catch (error) {
      throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, `Temp directory is not writable: ${tempDir}`, {
        filePath: tempDir,
        cause: error as Error,
        suggestions: ['Check temp directory permissions', 'Use a different temp directory']
      });
    }

    return tempDir;
  }

  private generateSecureFileName(options: TempFileOptions): string {
    const prefix = options.prefix || 'sunscript-';
    const suffix = options.suffix || '';
    const extension = options.extension || '.tmp';
    
    // Generate cryptographically secure random ID
    const randomId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString(36);
    
    return `${prefix}${timestamp}-${randomId}${suffix}${extension}`;
  }

  private async secureDelete(filePath: string): Promise<void> {
    try {
      // Get file size for overwriting
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Overwrite file with random data (basic secure deletion)
      if (fileSize > 0) {
        const randomData = crypto.randomBytes(Math.min(fileSize, 64 * 1024)); // Max 64KB
        await fs.writeFile(filePath, randomData);
        await fs.writeFile(filePath, Buffer.alloc(Math.min(fileSize, 64 * 1024), 0)); // Overwrite with zeros
      }

      // Delete the file
      await fs.unlink(filePath);

    } catch (error) {
      // Fallback to regular deletion if secure deletion fails
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        throw unlinkError;
      }
    }
  }

  private startCleanupInterval(): void {
    // Cleanup expired files every 30 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredFiles();
      } catch (error) {
        await globalLogger.warn('Temp file cleanup interval failed', {
          type: 'temp-file-cleanup',
          error: (error as Error).message
        });
      }
    }, 30 * 60 * 1000);
  }

  private setupExitHandlers(): void {
    const cleanup = async () => {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      await this.cleanupAll();
    };

    process.on('beforeExit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', cleanup);
  }

  // Get current temp file count for monitoring
  getTempFileCount(): number {
    return this.tempFiles.size;
  }

  // Get list of current temp files for debugging
  getTempFiles(): string[] {
    return Array.from(this.tempFiles.keys());
  }
}

// Global instance
export const globalTempFileManager = new SecureTempFileManager();