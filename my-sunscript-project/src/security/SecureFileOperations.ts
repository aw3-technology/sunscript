import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSecurityValidator } from './FileSecurityValidator';
import { FilePermissionManager } from './FilePermissionManager';
import { InputSanitizer } from './InputSanitizer';
import { globalTempFileManager } from './SecureTempFileManager';
import { SunScriptError, ErrorCode, FileSystemError } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';

export interface SecureReadOptions {
  maxSize?: number;
  encoding?: BufferEncoding;
  validateContent?: boolean;
  allowSymlinks?: boolean;
}

export interface SecureWriteOptions {
  mode?: number;
  createDirectories?: boolean;
  validatePath?: boolean;
  backup?: boolean;
  atomic?: boolean;
  allowTemplateLiterals?: boolean; // Allow template literals in content
}

export interface SecureCopyOptions {
  preserveMode?: boolean;
  overwrite?: boolean;
  validateSource?: boolean;
  validateDestination?: boolean;
}

/**
 * Secure file operations that prevent common security vulnerabilities
 */
export class SecureFileOperations {
  private validator: FileSecurityValidator;
  private permissionManager: FilePermissionManager;

  constructor(
    validator?: FileSecurityValidator,
    permissionManager?: FilePermissionManager
  ) {
    this.validator = validator || FileSecurityValidator.createForSunScriptFiles();
    this.permissionManager = permissionManager || FilePermissionManager.createProductionManager();
  }

  /**
   * Securely read a file with validation and safety checks
   */
  async readFile(filePath: string, options: SecureReadOptions = {}): Promise<string> {
    const opts = {
      maxSize: 10 * 1024 * 1024, // 10MB default
      encoding: 'utf-8' as BufferEncoding,
      validateContent: true,
      allowSymlinks: false,
      ...options
    };

    try {
      // Sanitize the file path
      const sanitizedPath = InputSanitizer.sanitizePath(filePath, {
        allowRelativePaths: true,
        allowParentTraversal: false,
        allowAbsolutePaths: true
      });

      // Validate file path security
      const pathValidation = await this.validator.validateFilePath(sanitizedPath);
      if (!pathValidation.valid) {
        throw new FileSystemError(ErrorCode.INVALID_PATH, `File path validation failed: ${pathValidation.securityIssues?.join(', ')}`, {
          filePath: sanitizedPath,
          suggestions: pathValidation.suggestions
        });
      }

      // Check file permissions
      await this.permissionManager.ensureFileReadable(sanitizedPath);

      // Check if file is a symlink (if not allowed)
      if (!opts.allowSymlinks) {
        const stats = await fs.lstat(sanitizedPath);
        if (stats.isSymbolicLink()) {
          throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, 'Symbolic links are not allowed', {
            filePath: sanitizedPath,
            suggestions: ['Use the actual file path instead of a symbolic link']
          });
        }
      }

      // Check file size before reading
      const stats = await fs.stat(sanitizedPath);
      if (stats.size > opts.maxSize) {
        throw new FileSystemError(ErrorCode.INVALID_OPERATION, `File size exceeds limit (${stats.size} > ${opts.maxSize})`, {
          filePath: sanitizedPath,
          suggestions: [`Use files smaller than ${this.formatBytes(opts.maxSize)}`]
        });
      }

      // Read the file
      const content = await fs.readFile(sanitizedPath, opts.encoding);

      // Validate content if requested
      if (opts.validateContent) {
        const contentValidation = await this.validator.validateFileContent(sanitizedPath, content);
        if (!contentValidation.valid) {
          await globalLogger.warn('Potentially dangerous content detected in file', {
            type: 'security',
            filePath: sanitizedPath,
            issues: contentValidation.securityIssues
          });
          
          throw new FileSystemError(ErrorCode.INVALID_OPERATION, `File content validation failed: ${contentValidation.securityIssues?.join(', ')}`, {
            filePath: sanitizedPath,
            suggestions: contentValidation.suggestions
          });
        }
      }

      await globalLogger.debug('File read successfully', {
        type: 'file-operation',
        operation: 'read',
        filePath: sanitizedPath,
        size: content.length
      });

      return content;

    } catch (error) {
      if (error instanceof SunScriptError) {
        throw error;
      }
      
      throw new FileSystemError(ErrorCode.FILE_NOT_FOUND, `Failed to read file: ${(error as Error).message}`, {
        filePath,
        cause: error as Error
      });
    }
  }

  /**
   * Securely write a file with validation and safety checks
   */
  async writeFile(filePath: string, content: string, options: SecureWriteOptions = {}): Promise<void> {
    const opts = {
      mode: 0o644,
      createDirectories: false,
      validatePath: true,
      backup: false,
      atomic: true,
      ...options
    };

    try {
      // Sanitize the file path
      const sanitizedPath = InputSanitizer.sanitizePath(filePath, {
        allowRelativePaths: true,
        allowParentTraversal: false,
        allowAbsolutePaths: true
      });

      // Validate file path security if requested
      if (opts.validatePath) {
        const pathValidation = await this.validator.validateFilePath(sanitizedPath);
        if (!pathValidation.valid) {
          throw new FileSystemError(ErrorCode.INVALID_PATH, `File path validation failed: ${pathValidation.securityIssues?.join(', ')}`, {
            filePath: sanitizedPath,
            suggestions: pathValidation.suggestions
          });
        }
      }

      // Sanitize content
      const sanitizedContent = InputSanitizer.sanitizeText(content, {
        maxLength: 100 * 1024 * 1024, // 100MB max for write operations
        allowUnicode: true,
        allowControlChars: true, // Allow control chars in file content
        allowTemplateLiterals: opts.allowTemplateLiterals || false
      });

      // Create parent directories if requested
      if (opts.createDirectories) {
        const parentDir = path.dirname(sanitizedPath);
        await fs.mkdir(parentDir, { recursive: true, mode: 0o755 });
      }

      // Check write permissions
      await this.permissionManager.ensureFileWritable(sanitizedPath);

      // Create backup if requested and file exists
      if (opts.backup) {
        try {
          await fs.access(sanitizedPath);
          const backupPath = `${sanitizedPath}.backup.${Date.now()}`;
          await fs.copyFile(sanitizedPath, backupPath);
          
          await globalLogger.info('Backup created before write', {
            type: 'file-operation',
            originalPath: sanitizedPath,
            backupPath
          });
        } catch {
          // File doesn't exist, no backup needed
        }
      }

      // Perform atomic write if requested
      if (opts.atomic) {
        await this.atomicWrite(sanitizedPath, sanitizedContent, opts.mode);
      } else {
        await fs.writeFile(sanitizedPath, sanitizedContent, { mode: opts.mode });
      }

      await globalLogger.debug('File written successfully', {
        type: 'file-operation',
        operation: 'write',
        filePath: sanitizedPath,
        size: sanitizedContent.length,
        atomic: opts.atomic
      });

    } catch (error) {
      if (error instanceof SunScriptError) {
        throw error;
      }
      
      throw new FileSystemError(ErrorCode.FILE_WRITE_ERROR, `Failed to write file: ${(error as Error).message}`, {
        filePath,
        cause: error as Error
      });
    }
  }

  /**
   * Securely copy a file with validation
   */
  async copyFile(srcPath: string, destPath: string, options: SecureCopyOptions = {}): Promise<void> {
    const opts = {
      preserveMode: true,
      overwrite: false,
      validateSource: true,
      validateDestination: true,
      ...options
    };

    try {
      // Sanitize paths
      const sanitizedSrc = InputSanitizer.sanitizePath(srcPath);
      const sanitizedDest = InputSanitizer.sanitizePath(destPath);

      // Validate source file
      if (opts.validateSource) {
        const srcValidation = await this.validator.validateFilePath(sanitizedSrc);
        if (!srcValidation.valid) {
          throw new FileSystemError(ErrorCode.INVALID_PATH, `Source path validation failed: ${srcValidation.securityIssues?.join(', ')}`, {
            filePath: sanitizedSrc
          });
        }
      }

      // Validate destination path
      if (opts.validateDestination) {
        const destValidation = await this.validator.validateFilePath(sanitizedDest);
        if (!destValidation.valid) {
          throw new FileSystemError(ErrorCode.INVALID_PATH, `Destination path validation failed: ${destValidation.securityIssues?.join(', ')}`, {
            filePath: sanitizedDest
          });
        }
      }

      // Check source permissions
      await this.permissionManager.ensureFileReadable(sanitizedSrc);

      // Check destination permissions
      await this.permissionManager.ensureFileWritable(sanitizedDest);

      // Check if destination exists and handle overwrite
      try {
        await fs.access(sanitizedDest);
        if (!opts.overwrite) {
          throw new FileSystemError(ErrorCode.INVALID_OPERATION, 'Destination file exists and overwrite is disabled', {
            filePath: sanitizedDest,
            suggestions: ['Use overwrite option or choose a different destination']
          });
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT' && !(error instanceof SunScriptError)) {
          throw error;
        }
      }

      // Perform the copy
      await fs.copyFile(sanitizedSrc, sanitizedDest);

      // Preserve mode if requested
      if (opts.preserveMode) {
        const srcStats = await fs.stat(sanitizedSrc);
        await fs.chmod(sanitizedDest, srcStats.mode);
      }

      await globalLogger.debug('File copied successfully', {
        type: 'file-operation',
        operation: 'copy',
        srcPath: sanitizedSrc,
        destPath: sanitizedDest
      });

    } catch (error) {
      if (error instanceof SunScriptError) {
        throw error;
      }
      
      throw new FileSystemError(ErrorCode.FILE_WRITE_ERROR, `Failed to copy file: ${(error as Error).message}`, {
        context: { srcPath, destPath },
        cause: error as Error
      });
    }
  }

  /**
   * Securely delete a file
   */
  async deleteFile(filePath: string, options: { secure?: boolean } = {}): Promise<void> {
    const opts = {
      secure: false,
      ...options
    };

    try {
      const sanitizedPath = InputSanitizer.sanitizePath(filePath);

      // Check permissions
      await this.permissionManager.ensureFileWritable(sanitizedPath);

      if (opts.secure) {
        // Secure deletion: overwrite with random data first
        const stats = await fs.stat(sanitizedPath);
        if (stats.size > 0 && stats.size < 100 * 1024 * 1024) { // Only for files < 100MB
          const randomData = Buffer.alloc(Math.min(stats.size, 64 * 1024));
          randomData.fill(Math.floor(Math.random() * 256));
          await fs.writeFile(sanitizedPath, randomData);
          
          // Overwrite with zeros
          const zeroData = Buffer.alloc(Math.min(stats.size, 64 * 1024), 0);
          await fs.writeFile(sanitizedPath, zeroData);
        }
      }

      await fs.unlink(sanitizedPath);

      await globalLogger.debug('File deleted successfully', {
        type: 'file-operation',
        operation: 'delete',
        filePath: sanitizedPath,
        secure: opts.secure
      });

    } catch (error) {
      if (error instanceof SunScriptError) {
        throw error;
      }
      
      throw new FileSystemError(ErrorCode.FILE_WRITE_ERROR, `Failed to delete file: ${(error as Error).message}`, {
        filePath,
        cause: error as Error
      });
    }
  }

  /**
   * Check if a path exists safely
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const sanitizedPath = InputSanitizer.sanitizePath(filePath);
      await fs.access(sanitizedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get secure file stats
   */
  async getStats(filePath: string): Promise<any> {
    try {
      const sanitizedPath = InputSanitizer.sanitizePath(filePath);
      await this.permissionManager.ensureFileReadable(sanitizedPath);
      return await fs.stat(sanitizedPath);
    } catch (error) {
      if (error instanceof SunScriptError) {
        throw error;
      }
      
      throw new FileSystemError(ErrorCode.FILE_NOT_FOUND, `Failed to get file stats: ${(error as Error).message}`, {
        filePath,
        cause: error as Error
      });
    }
  }

  /**
   * Atomic write using temporary file
   */
  private async atomicWrite(filePath: string, content: string, mode: number): Promise<void> {
    const tempFile = await globalTempFileManager.createTempFile({
      directory: path.dirname(filePath),
      extension: path.extname(filePath),
      autoCleanup: true,
      maxAge: 5 * 60 * 1000 // 5 minutes
    });

    try {
      // Write to temp file
      await globalTempFileManager.writeTempFile(tempFile.path, content);
      
      // Set correct mode
      await fs.chmod(tempFile.path, mode);
      
      // Atomic rename
      await fs.rename(tempFile.path, filePath);
      
    } catch (error) {
      // Cleanup temp file on error
      await tempFile.cleanup();
      throw error;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Factory methods for different security profiles
  static createForSunScriptFiles(): SecureFileOperations {
    return new SecureFileOperations(
      FileSecurityValidator.createForSunScriptFiles(),
      FilePermissionManager.createProductionManager()
    );
  }

  static createForOutputFiles(): SecureFileOperations {
    return new SecureFileOperations(
      FileSecurityValidator.createForOutputFiles(),
      FilePermissionManager.createPermissiveManager()
    );
  }

  static createForGeneratedCode(): SecureFileOperations {
    return new SecureFileOperations(
      FileSecurityValidator.createForOutputFiles(),
      FilePermissionManager.createPermissiveManager()
    );
  }

  static createForConfigFiles(): SecureFileOperations {
    return new SecureFileOperations(
      FileSecurityValidator.createForConfigFiles(),
      FilePermissionManager.createStrictManager()
    );
  }
}

// Global instances for common use cases
export const secureFileOps = new SecureFileOperations();
export const sunScriptFileOps = SecureFileOperations.createForSunScriptFiles();
export const outputFileOps = SecureFileOperations.createForOutputFiles();
export const generatedCodeFileOps = SecureFileOperations.createForGeneratedCode();
export const configFileOps = SecureFileOperations.createForConfigFiles();