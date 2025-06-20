import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { SunScriptError, ErrorCode, FileSystemError } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';

export interface SecurityConfig {
  allowedExtensions: string[];
  blockedExtensions: string[];
  maxFileSize: number; // in bytes
  maxPathLength: number;
  allowedDirectories: string[];
  blockedDirectories: string[];
  allowSymlinks: boolean;
  allowHiddenFiles: boolean;
  scanForMaliciousContent: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
  suggestions?: string[];
  securityIssues?: string[];
}

export class FileSecurityValidator {
  private config: SecurityConfig;
  private dangerousPatterns: RegExp[] = [
    // Potential executable patterns
    /\bexec\s*\(/gi,
    /\beval\s*\(/gi,
    /\bFunction\s*\(/gi,
    /\bsetTimeout\s*\(/gi,
    /\bsetInterval\s*\(/gi,
    // System command patterns
    /require\s*\(\s*['"`]child_process['"`]\)/gi,
    /require\s*\(\s*['"`]fs['"`]\)/gi,
    /require\s*\(\s*['"`]path['"`]\)/gi,
    // Script injection patterns
    /<script[^>]*>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    // Environment variable access
    /process\.env/gi,
    // File system operations
    /\.\.\//g,
    /~\//g,
    // Potential shell commands
    /\$\(/g,
    /`[^`]*`/g
  ];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      allowedExtensions: ['.sun', '.js', '.ts', '.json', '.md', '.txt', '.html', '.css'],
      blockedExtensions: ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.scr', '.com', '.pif'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxPathLength: 260, // Windows MAX_PATH limit
      allowedDirectories: [], // Empty means allow all
      blockedDirectories: ['/etc', '/usr', '/var', '/sys', '/proc', 'C:\\Windows', 'C:\\System32'],
      allowSymlinks: false,
      allowHiddenFiles: false,
      scanForMaliciousContent: true,
      ...config
    };
  }

  async validateFilePath(filePath: string): Promise<FileValidationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Normalize the path to resolve . and .. components
      const normalizedPath = path.resolve(filePath);
      
      // Check path length
      if (normalizedPath.length > this.config.maxPathLength) {
        issues.push('Path exceeds maximum allowed length');
        suggestions.push(`Use shorter file paths (max ${this.config.maxPathLength} characters)`);
      }

      // Check for path traversal attempts
      if (this.hasPathTraversal(filePath)) {
        issues.push('Path contains directory traversal patterns');
        suggestions.push('Remove ".." and "~" from file paths');
        await this.logSecurityIssue('Path traversal attempt', { filePath, normalizedPath });
      }

      // Check for null bytes (directory traversal bypass attempt)
      if (filePath.includes('\0')) {
        issues.push('Path contains null bytes');
        suggestions.push('Remove null characters from file paths');
        await this.logSecurityIssue('Null byte injection attempt', { filePath });
      }

      // Check file extension
      const ext = path.extname(normalizedPath).toLowerCase();
      if (this.config.blockedExtensions.includes(ext)) {
        issues.push(`File extension '${ext}' is not allowed`);
        suggestions.push(`Use allowed extensions: ${this.config.allowedExtensions.join(', ')}`);
      }

      if (this.config.allowedExtensions.length > 0 && !this.config.allowedExtensions.includes(ext)) {
        issues.push(`File extension '${ext}' is not in allowed list`);
        suggestions.push(`Use allowed extensions: ${this.config.allowedExtensions.join(', ')}`);
      }

      // Check for hidden files
      const basename = path.basename(normalizedPath);
      if (!this.config.allowHiddenFiles && basename.startsWith('.') && basename !== '.' && basename !== '..') {
        issues.push('Hidden files are not allowed');
        suggestions.push('Use visible file names (not starting with ".")');
      }

      // Check directory restrictions
      if (this.isBlockedDirectory(normalizedPath)) {
        issues.push('File is in a restricted directory');
        suggestions.push('Move file to an allowed directory');
        await this.logSecurityIssue('Blocked directory access attempt', { filePath, normalizedPath });
      }

      if (this.config.allowedDirectories.length > 0 && !this.isAllowedDirectory(normalizedPath)) {
        issues.push('File is not in an allowed directory');
        suggestions.push(`Use allowed directories: ${this.config.allowedDirectories.join(', ')}`);
      }

      // Check if file exists and get stats
      let stats;
      try {
        stats = await fs.lstat(normalizedPath);
      } catch (error) {
        // File doesn't exist - that's okay for write operations
        return { valid: issues.length === 0, securityIssues: issues, suggestions };
      }

      // Check for symlinks
      if (stats.isSymbolicLink() && !this.config.allowSymlinks) {
        issues.push('Symbolic links are not allowed');
        suggestions.push('Use direct file paths instead of symbolic links');
        await this.logSecurityIssue('Symlink access attempt', { filePath, normalizedPath });
      }

      // Check file size
      if (stats.size > this.config.maxFileSize) {
        issues.push(`File size exceeds limit (${this.formatBytes(stats.size)} > ${this.formatBytes(this.config.maxFileSize)})`);
        suggestions.push(`Use files smaller than ${this.formatBytes(this.config.maxFileSize)}`);
      }

      return {
        valid: issues.length === 0,
        securityIssues: issues,
        suggestions
      };

    } catch (error) {
      await this.logSecurityIssue('File validation error', { filePath, error: (error as Error).message });
      return {
        valid: false,
        reason: 'File validation failed',
        securityIssues: ['File validation error'],
        suggestions: ['Check file permissions and path validity']
      };
    }
  }

  async validateFileContent(filePath: string, content?: string): Promise<FileValidationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Read content if not provided
      if (!content) {
        const stats = await fs.stat(filePath);
        if (stats.size > this.config.maxFileSize) {
          issues.push('File too large to scan for security issues');
          return { valid: false, securityIssues: issues };
        }
        content = await fs.readFile(filePath, 'utf-8');
      }

      if (this.config.scanForMaliciousContent) {
        // Check for dangerous patterns
        const foundPatterns: string[] = [];
        
        for (const pattern of this.dangerousPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            foundPatterns.push(pattern.source);
          }
        }

        if (foundPatterns.length > 0) {
          issues.push('File contains potentially dangerous patterns');
          suggestions.push('Review and remove suspicious code patterns');
          suggestions.push('Ensure the file is from a trusted source');
          
          await this.logSecurityIssue('Malicious content detected', {
            filePath,
            patterns: foundPatterns,
            contentHash: this.hashContent(content)
          });
        }

        // Check for encoded content that might hide malicious code
        if (this.hasEncodedContent(content)) {
          issues.push('File contains encoded content that could hide malicious code');
          suggestions.push('Review base64, hex, or other encoded content');
        }

        // Check for excessively long lines (potential obfuscation)
        const lines = content.split('\n');
        const longLines = lines.filter(line => line.length > 1000);
        if (longLines.length > 0) {
          issues.push('File contains suspiciously long lines');
          suggestions.push('Review very long lines for obfuscated code');
        }

        // Check for excessive unicode or control characters
        if (this.hasExcessiveUnicode(content)) {
          issues.push('File contains excessive unicode or control characters');
          suggestions.push('Review unicode characters for potential obfuscation');
        }
      }

      return {
        valid: issues.length === 0,
        securityIssues: issues,
        suggestions
      };

    } catch (error) {
      await this.logSecurityIssue('Content validation error', { filePath, error: (error as Error).message });
      return {
        valid: false,
        reason: 'Content validation failed',
        securityIssues: ['Content validation error'],
        suggestions: ['Check file encoding and readability']
      };
    }
  }

  async validateOutputPath(outputPath: string, baseDirectory: string): Promise<FileValidationResult> {
    try {
      const resolvedOutput = path.resolve(outputPath);
      const resolvedBase = path.resolve(baseDirectory);

      // Ensure output path is within the base directory
      if (!resolvedOutput.startsWith(resolvedBase + path.sep) && resolvedOutput !== resolvedBase) {
        await this.logSecurityIssue('Directory traversal in output path', {
          outputPath,
          resolvedOutput,
          baseDirectory,
          resolvedBase
        });

        return {
          valid: false,
          securityIssues: ['Output path is outside the allowed directory'],
          suggestions: [
            'Use relative paths within the output directory',
            'Remove ".." from output paths'
          ]
        };
      }

      // Additional validation for the output path
      return this.validateFilePath(outputPath);

    } catch (error) {
      await this.logSecurityIssue('Output path validation error', { 
        outputPath, 
        baseDirectory, 
        error: (error as Error).message 
      });
      
      return {
        valid: false,
        reason: 'Output path validation failed',
        securityIssues: ['Output path validation error'],
        suggestions: ['Check output path format and permissions']
      };
    }
  }

  private hasPathTraversal(filePath: string): boolean {
    // Check for various path traversal patterns
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /\.\.%2f/i,
      /\.\.%5c/i,
      /~\//,
      /~\\/
    ];

    return traversalPatterns.some(pattern => pattern.test(filePath));
  }

  private isBlockedDirectory(filePath: string): boolean {
    const normalizedPath = path.resolve(filePath).toLowerCase();
    
    return this.config.blockedDirectories.some(blockedDir => {
      const normalizedBlocked = path.resolve(blockedDir).toLowerCase();
      return normalizedPath.startsWith(normalizedBlocked + path.sep) || 
             normalizedPath === normalizedBlocked;
    });
  }

  private isAllowedDirectory(filePath: string): boolean {
    if (this.config.allowedDirectories.length === 0) {
      return true; // No restrictions if no allowed directories specified
    }

    const normalizedPath = path.resolve(filePath).toLowerCase();
    
    return this.config.allowedDirectories.some(allowedDir => {
      const normalizedAllowed = path.resolve(allowedDir).toLowerCase();
      return normalizedPath.startsWith(normalizedAllowed + path.sep) || 
             normalizedPath === normalizedAllowed;
    });
  }

  private hasEncodedContent(content: string): boolean {
    // Check for base64 patterns
    const base64Pattern = /[A-Za-z0-9+/]{100,}={0,2}/;
    if (base64Pattern.test(content)) return true;

    // Check for hex patterns
    const hexPattern = /[0-9a-fA-F]{100,}/;
    if (hexPattern.test(content)) return true;

    // Check for URL encoding
    const urlEncodedPattern = /%[0-9a-fA-F]{2,}/;
    if (urlEncodedPattern.test(content)) return true;

    return false;
  }

  private hasExcessiveUnicode(content: string): boolean {
    // Count non-ASCII characters
    const nonAsciiCount = (content.match(/[^\x00-\x7F]/g) || []).length;
    const ratio = nonAsciiCount / content.length;
    
    // Flag if more than 20% of characters are non-ASCII
    return ratio > 0.2;
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async logSecurityIssue(issue: string, details: Record<string, any>): Promise<void> {
    await globalLogger.warn(`Security issue detected: ${issue}`, {
      type: 'security',
      issue,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Create a safe file validator for specific use cases
  static createForSunScriptFiles(): FileSecurityValidator {
    return new FileSecurityValidator({
      allowedExtensions: ['.sun'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowSymlinks: false,
      allowHiddenFiles: false,
      scanForMaliciousContent: true
    });
  }

  static createForOutputFiles(): FileSecurityValidator {
    return new FileSecurityValidator({
      allowedExtensions: ['.js', '.ts', '.html', '.css', '.json', '.md'],
      maxFileSize: 50 * 1024 * 1024, // 50MB for generated files
      allowSymlinks: false,
      allowHiddenFiles: false,
      scanForMaliciousContent: false // Generated content should be safe
    });
  }

  static createForConfigFiles(): FileSecurityValidator {
    return new FileSecurityValidator({
      allowedExtensions: ['.sun', '.json', '.yaml', '.yml', '.toml'],
      maxFileSize: 1024 * 1024, // 1MB
      allowSymlinks: false,
      allowHiddenFiles: false,
      scanForMaliciousContent: true
    });
  }
}