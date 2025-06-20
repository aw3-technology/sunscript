import * as fs from 'fs/promises';
import * as path from 'path';
import { SunScriptError, ErrorCode, FileSystemError } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';

export interface PermissionCheck {
  read: boolean;
  write: boolean;
  execute: boolean;
}

export interface FilePermissionResult {
  allowed: boolean;
  permissions: PermissionCheck;
  reason?: string;
  suggestions?: string[];
}

export interface AccessControlConfig {
  allowedUsers?: string[];
  blockedUsers?: string[];
  allowedGroups?: string[];
  blockedGroups?: string[];
  maxFileAge?: number; // in milliseconds
  requireOwnership?: boolean;
  allowWorldWritable?: boolean;
  allowExecutableFiles?: boolean;
}

export class FilePermissionManager {
  private config: AccessControlConfig;

  constructor(config: AccessControlConfig = {}) {
    this.config = {
      allowWorldWritable: false,
      allowExecutableFiles: false,
      requireOwnership: false,
      maxFileAge: 365 * 24 * 60 * 60 * 1000, // 1 year default
      ...config
    };
  }

  async checkFilePermissions(filePath: string, requiredAccess: Partial<PermissionCheck> = {}): Promise<FilePermissionResult> {
    try {
      const stats = await fs.stat(filePath);
      const permissions = this.parsePermissions(stats.mode);
      
      // Check if we have the required access
      const hasRequiredAccess = this.hasRequiredAccess(permissions, requiredAccess);
      
      if (!hasRequiredAccess.allowed) {
        await this.logAccessDenied(filePath, requiredAccess, permissions, hasRequiredAccess.reason);
        return {
          allowed: false,
          permissions,
          reason: hasRequiredAccess.reason,
          suggestions: hasRequiredAccess.suggestions
        };
      }

      // Additional security checks
      const securityCheck = await this.performSecurityChecks(filePath, stats, permissions);
      if (!securityCheck.allowed) {
        return {
          allowed: false,
          permissions,
          reason: securityCheck.reason,
          suggestions: securityCheck.suggestions
        };
      }

      return {
        allowed: true,
        permissions
      };

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          allowed: false,
          permissions: { read: false, write: false, execute: false },
          reason: 'File does not exist',
          suggestions: ['Check if the file path is correct']
        };
      } else if (error.code === 'EACCES') {
        await this.logAccessDenied(filePath, requiredAccess, { read: false, write: false, execute: false }, 'Access denied by system');
        return {
          allowed: false,
          permissions: { read: false, write: false, execute: false },
          reason: 'Access denied by system',
          suggestions: ['Check file permissions', 'Run with appropriate privileges']
        };
      }

      throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, `Permission check failed: ${error.message}`, {
        filePath,
        cause: error
      });
    }
  }

  async checkDirectoryPermissions(dirPath: string): Promise<FilePermissionResult> {
    try {
      // Check if directory exists and is accessible
      await fs.access(dirPath, fs.constants.F_OK);
      
      // Check read permission
      let canRead = false;
      try {
        await fs.access(dirPath, fs.constants.R_OK);
        canRead = true;
      } catch {}

      // Check write permission
      let canWrite = false;
      try {
        await fs.access(dirPath, fs.constants.W_OK);
        canWrite = true;
      } catch {}

      // Check execute permission (needed to traverse directory)
      let canExecute = false;
      try {
        await fs.access(dirPath, fs.constants.X_OK);
        canExecute = true;
      } catch {}

      const permissions = { read: canRead, write: canWrite, execute: canExecute };

      // Directory must have execute permission to be traversable
      if (!canExecute) {
        return {
          allowed: false,
          permissions,
          reason: 'Directory is not traversable',
          suggestions: ['Check directory execute permissions']
        };
      }

      return {
        allowed: true,
        permissions
      };

    } catch (error: any) {
      return {
        allowed: false,
        permissions: { read: false, write: false, execute: false },
        reason: `Directory access failed: ${error.message}`,
        suggestions: ['Check if directory exists and is accessible']
      };
    }
  }

  async ensureFileReadable(filePath: string): Promise<void> {
    const result = await this.checkFilePermissions(filePath, { read: true });
    
    if (!result.allowed) {
      throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, `File is not readable: ${result.reason}`, {
        filePath,
        suggestions: result.suggestions
      });
    }
  }

  async ensureFileWritable(filePath: string): Promise<void> {
    // Check if file exists first
    let fileExists = true;
    try {
      await fs.access(filePath);
    } catch {
      fileExists = false;
    }

    if (fileExists) {
      const result = await this.checkFilePermissions(filePath, { write: true });
      
      if (!result.allowed) {
        throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, `File is not writable: ${result.reason}`, {
          filePath,
          suggestions: result.suggestions
        });
      }
    } else {
      // Check if parent directory is writable
      const parentDir = path.dirname(filePath);
      const dirResult = await this.checkDirectoryPermissions(parentDir);
      
      if (!dirResult.allowed || !dirResult.permissions.write) {
        throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, `Cannot create file: parent directory not writable`, {
          filePath,
          context: { parentDir },
          suggestions: ['Check parent directory write permissions']
        });
      }
    }
  }

  async ensureDirectoryWritable(dirPath: string): Promise<void> {
    const result = await this.checkDirectoryPermissions(dirPath);
    
    if (!result.allowed || !result.permissions.write) {
      throw new FileSystemError(ErrorCode.FILE_ACCESS_DENIED, `Directory is not writable: ${result.reason}`, {
        filePath: dirPath,
        suggestions: result.suggestions
      });
    }
  }

  private parsePermissions(mode: number): PermissionCheck {
    // Extract user permissions (owner permissions)
    const userRead = (mode & 0o400) !== 0;
    const userWrite = (mode & 0o200) !== 0;
    const userExecute = (mode & 0o100) !== 0;

    return {
      read: userRead,
      write: userWrite,
      execute: userExecute
    };
  }

  private hasRequiredAccess(permissions: PermissionCheck, required: Partial<PermissionCheck>): { allowed: boolean; reason?: string; suggestions?: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (required.read && !permissions.read) {
      issues.push('read access required but not available');
      suggestions.push('Grant read permissions to the file');
    }

    if (required.write && !permissions.write) {
      issues.push('write access required but not available');
      suggestions.push('Grant write permissions to the file');
    }

    if (required.execute && !permissions.execute) {
      issues.push('execute access required but not available');
      suggestions.push('Grant execute permissions to the file');
    }

    if (issues.length > 0) {
      return {
        allowed: false,
        reason: `Missing permissions: ${issues.join(', ')}`,
        suggestions
      };
    }

    return { allowed: true };
  }

  private async performSecurityChecks(filePath: string, stats: fs.Stats, permissions: PermissionCheck): Promise<{ allowed: boolean; reason?: string; suggestions?: string[] }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check if file is executable when not allowed
    if (!this.config.allowExecutableFiles && permissions.execute) {
      issues.push('executable files are not allowed');
      suggestions.push('Remove execute permissions from the file');
      await this.logSecurityIssue('Executable file access attempt', { filePath });
    }

    // Check world-writable files
    if (!this.config.allowWorldWritable && this.isWorldWritable(stats.mode)) {
      issues.push('world-writable files are not allowed');
      suggestions.push('Remove world-write permissions from the file');
      await this.logSecurityIssue('World-writable file access attempt', { filePath });
    }

    // Check file age
    if (this.config.maxFileAge) {
      const fileAge = Date.now() - stats.mtime.getTime();
      if (fileAge > this.config.maxFileAge) {
        issues.push(`file is too old (${Math.round(fileAge / (24 * 60 * 60 * 1000))} days)`);
        suggestions.push('Use more recent files');
      }
    }

    // Check ownership if required (Unix-like systems only)
    if (this.config.requireOwnership && process.getuid && process.getuid() !== stats.uid) {
      issues.push('file is not owned by current user');
      suggestions.push('Use files owned by your user account');
      await this.logSecurityIssue('Non-owned file access attempt', { 
        filePath, 
        fileOwner: stats.uid, 
        currentUser: process.getuid() 
      });
    }

    if (issues.length > 0) {
      return {
        allowed: false,
        reason: `Security issues: ${issues.join(', ')}`,
        suggestions
      };
    }

    return { allowed: true };
  }

  private isWorldWritable(mode: number): boolean {
    // Check if others have write permission
    return (mode & 0o002) !== 0;
  }

  private async logAccessDenied(filePath: string, requiredAccess: Partial<PermissionCheck>, actualPermissions: PermissionCheck, reason: string): Promise<void> {
    await globalLogger.warn('File access denied', {
      type: 'access-control',
      filePath,
      requiredAccess,
      actualPermissions,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  private async logSecurityIssue(issue: string, details: Record<string, any>): Promise<void> {
    await globalLogger.warn(`Security issue: ${issue}`, {
      type: 'security',
      issue,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Factory methods for common configurations
  static createStrictManager(): FilePermissionManager {
    return new FilePermissionManager({
      allowWorldWritable: false,
      allowExecutableFiles: false,
      requireOwnership: true,
      maxFileAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }

  static createPermissiveManager(): FilePermissionManager {
    return new FilePermissionManager({
      allowWorldWritable: true,
      allowExecutableFiles: true,
      requireOwnership: false
    });
  }

  static createProductionManager(): FilePermissionManager {
    return new FilePermissionManager({
      allowWorldWritable: false,
      allowExecutableFiles: false,
      requireOwnership: false,
      maxFileAge: 365 * 24 * 60 * 60 * 1000 // 1 year
    });
  }
}