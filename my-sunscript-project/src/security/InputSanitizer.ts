import * as path from 'path';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';

export interface SanitizationOptions {
  maxLength?: number;
  allowUnicode?: boolean;
  allowControlChars?: boolean;
  normalizeNewlines?: boolean;
  trimWhitespace?: boolean;
  removeNullBytes?: boolean;
}

export interface PathSanitizationOptions {
  allowRelativePaths?: boolean;
  allowParentTraversal?: boolean;
  allowAbsolutePaths?: boolean;
  maxLength?: number;
  normalizeCase?: boolean;
}

export interface FilenameValidationResult {
  valid: boolean;
  sanitized: string;
  issues: string[];
  suggestions: string[];
}

export class InputSanitizer {
  // Dangerous patterns that should never appear in user input
  private static readonly DANGEROUS_PATTERNS = [
    // Script injection
    /<script[^>]*>.*?<\/script>/gis,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    
    // Code execution patterns
    /\beval\s*\(/gi,
    /\bFunction\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    
    // System commands
    /\$\(/g,
    /`[^`]*`/g,
    /\|\s*sh/gi,
    /\|\s*bash/gi,
    /\|\s*cmd/gi,
    
    // SQL injection patterns
    /union\s+select/gi,
    /insert\s+into/gi,
    /delete\s+from/gi,
    /drop\s+table/gi,
    
    // Path traversal
    /\.\.\//g,
    /\.\.\\/g,
    /~\//g,
    /\/\.\./g,
    /\\\.\./g,
    
    // Null byte injection
    /\x00/g,
    
    // Format string attacks
    /%[0-9]*[diouxXeEfFgGaAcspn%]/g
  ];

  // Invalid filename characters (Windows + Unix)
  private static readonly INVALID_FILENAME_CHARS = /[<>:"|?*\x00-\x1f\x7f]/g;
  
  // Reserved Windows filenames
  private static readonly RESERVED_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]);

  /**
   * Sanitize general text input to prevent injection attacks
   */
  static sanitizeText(input: string, options: SanitizationOptions = {}): string {
    if (typeof input !== 'string') {
      throw new SunScriptError(ErrorCode.INVALID_OPERATION, 'Input must be a string');
    }

    const opts = {
      maxLength: 10000,
      allowUnicode: true,
      allowControlChars: false,
      normalizeNewlines: true,
      trimWhitespace: true,
      removeNullBytes: true,
      ...options
    };

    let sanitized = input;

    // Remove null bytes (always dangerous)
    if (opts.removeNullBytes) {
      sanitized = sanitized.replace(/\x00/g, '');
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        globalLogger.warn('Dangerous pattern detected in input', {
          type: 'input-sanitization',
          pattern: pattern.source,
          inputLength: input.length
        });
      }
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove or replace control characters
    if (!opts.allowControlChars) {
      // Keep only allowed control chars (tab, newline, carriage return)
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    // Normalize newlines
    if (opts.normalizeNewlines) {
      sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    // Handle Unicode
    if (!opts.allowUnicode) {
      // Remove non-ASCII characters
      sanitized = sanitized.replace(/[^\x00-\x7F]/g, '');
    } else {
      // Normalize Unicode to prevent homograph attacks
      try {
        sanitized = sanitized.normalize('NFC');
      } catch (error) {
        // If normalization fails, log and continue
        globalLogger.warn('Unicode normalization failed', {
          type: 'input-sanitization',
          error: (error as Error).message
        });
      }
    }

    // Trim whitespace
    if (opts.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Enforce length limit
    if (sanitized.length > opts.maxLength) {
      sanitized = sanitized.substring(0, opts.maxLength);
      globalLogger.warn('Input truncated due to length limit', {
        type: 'input-sanitization',
        originalLength: input.length,
        maxLength: opts.maxLength
      });
    }

    return sanitized;
  }

  /**
   * Sanitize file paths to prevent directory traversal and other attacks
   */
  static sanitizePath(inputPath: string, options: PathSanitizationOptions = {}): string {
    if (typeof inputPath !== 'string') {
      throw new SunScriptError(ErrorCode.INVALID_PATH, 'Path must be a string');
    }

    const opts = {
      allowRelativePaths: true,
      allowParentTraversal: false,
      allowAbsolutePaths: false,
      maxLength: 260, // Windows MAX_PATH
      normalizeCase: process.platform === 'win32',
      ...options
    };

    let sanitized = inputPath;

    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');

    // Normalize path separators
    sanitized = path.normalize(sanitized);

    // Check path length
    if (sanitized.length > opts.maxLength) {
      throw new SunScriptError(ErrorCode.INVALID_PATH, `Path exceeds maximum length (${opts.maxLength})`, {
        context: { path: inputPath, length: sanitized.length }
      });
    }

    // Check for parent directory traversal
    if (!opts.allowParentTraversal && sanitized.includes('..')) {
      throw new SunScriptError(ErrorCode.INVALID_PATH, 'Parent directory traversal not allowed', {
        context: { path: inputPath },
        suggestions: ['Remove ".." from the path', 'Use absolute paths if needed']
      });
    }

    // Check for absolute paths
    if (!opts.allowAbsolutePaths && path.isAbsolute(sanitized)) {
      throw new SunScriptError(ErrorCode.INVALID_PATH, 'Absolute paths not allowed', {
        context: { path: inputPath },
        suggestions: ['Use relative paths instead']
      });
    }

    // Check for relative paths
    if (!opts.allowRelativePaths && !path.isAbsolute(sanitized)) {
      throw new SunScriptError(ErrorCode.INVALID_PATH, 'Relative paths not allowed', {
        context: { path: inputPath },
        suggestions: ['Use absolute paths instead']
      });
    }

    // Normalize case on case-insensitive filesystems
    if (opts.normalizeCase) {
      sanitized = sanitized.toLowerCase();
    }

    // Additional validation for suspicious patterns
    if (sanitized.includes('~') && !opts.allowParentTraversal) {
      throw new SunScriptError(ErrorCode.INVALID_PATH, 'Home directory references not allowed', {
        context: { path: inputPath }
      });
    }

    return sanitized;
  }

  /**
   * Validate and sanitize filenames
   */
  static sanitizeFilename(filename: string, options: { maxLength?: number; allowSpaces?: boolean } = {}): FilenameValidationResult {
    const opts = {
      maxLength: 255,
      allowSpaces: true,
      ...options
    };

    const issues: string[] = [];
    const suggestions: string[] = [];
    let sanitized = filename;

    // Basic validation
    if (!filename || typeof filename !== 'string') {
      return {
        valid: false,
        sanitized: '',
        issues: ['Filename must be a non-empty string'],
        suggestions: ['Provide a valid filename']
      };
    }

    // Remove path separators
    sanitized = sanitized.replace(/[/\\]/g, '');
    if (sanitized !== filename) {
      issues.push('Path separators removed from filename');
    }

    // Remove invalid characters
    const originalSanitized = sanitized;
    sanitized = sanitized.replace(this.INVALID_FILENAME_CHARS, '');
    if (sanitized !== originalSanitized) {
      issues.push('Invalid characters removed');
      suggestions.push('Use only alphanumeric characters, hyphens, underscores, and dots');
    }

    // Handle spaces
    if (!opts.allowSpaces) {
      sanitized = sanitized.replace(/\s+/g, '_');
      if (sanitized !== originalSanitized) {
        issues.push('Spaces replaced with underscores');
      }
    }

    // Normalize consecutive spaces/underscores
    sanitized = sanitized.replace(/\s+/g, ' ').replace(/_+/g, '_');

    // Remove leading/trailing dots and spaces
    const beforeTrim = sanitized;
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');
    if (sanitized !== beforeTrim) {
      issues.push('Leading/trailing dots and spaces removed');
    }

    // Check for reserved names (Windows)
    const nameWithoutExt = path.parse(sanitized).name.toUpperCase();
    if (this.RESERVED_NAMES.has(nameWithoutExt)) {
      sanitized = `_${sanitized}`;
      issues.push('Reserved filename detected, prefix added');
      suggestions.push('Use a different filename that is not reserved by the system');
    }

    // Check length
    if (sanitized.length > opts.maxLength) {
      const ext = path.extname(sanitized);
      const nameOnly = path.parse(sanitized).name;
      const maxNameLength = opts.maxLength - ext.length;
      sanitized = nameOnly.substring(0, maxNameLength) + ext;
      issues.push(`Filename truncated to ${opts.maxLength} characters`);
    }

    // Check if anything is left
    if (!sanitized) {
      return {
        valid: false,
        sanitized: 'untitled',
        issues: ['Filename became empty after sanitization'],
        suggestions: ['Use a valid filename with alphanumeric characters']
      };
    }

    // Final validation
    const valid = issues.length === 0;

    return {
      valid,
      sanitized,
      issues,
      suggestions
    };
  }

  /**
   * Sanitize URL inputs to prevent SSRF and other attacks
   */
  static sanitizeUrl(url: string, options: { allowedProtocols?: string[]; allowedDomains?: string[] } = {}): string {
    const opts = {
      allowedProtocols: ['http:', 'https:'],
      allowedDomains: [],
      ...options
    };

    try {
      const urlObj = new URL(url);

      // Check protocol
      if (!opts.allowedProtocols.includes(urlObj.protocol)) {
        throw new SunScriptError(ErrorCode.INVALID_OPERATION, `Protocol ${urlObj.protocol} not allowed`, {
          context: { url, allowedProtocols: opts.allowedProtocols }
        });
      }

      // Check domain if restrictions apply
      if (opts.allowedDomains.length > 0 && !opts.allowedDomains.includes(urlObj.hostname)) {
        throw new SunScriptError(ErrorCode.INVALID_OPERATION, `Domain ${urlObj.hostname} not allowed`, {
          context: { url, allowedDomains: opts.allowedDomains }
        });
      }

      // Prevent localhost/private IP access
      if (this.isPrivateOrLocalhost(urlObj.hostname)) {
        throw new SunScriptError(ErrorCode.INVALID_OPERATION, 'Access to private/localhost addresses not allowed', {
          context: { url, hostname: urlObj.hostname }
        });
      }

      return urlObj.toString();

    } catch (error) {
      if (error instanceof SunScriptError) {
        throw error;
      }
      
      throw new SunScriptError(ErrorCode.INVALID_OPERATION, `Invalid URL: ${(error as Error).message}`, {
        context: { url },
        cause: error as Error
      });
    }
  }

  /**
   * Sanitize command-line arguments to prevent injection
   */
  static sanitizeCliArgument(arg: string): string {
    if (typeof arg !== 'string') {
      throw new SunScriptError(ErrorCode.INVALID_OPERATION, 'CLI argument must be a string');
    }

    // Remove dangerous characters for shell injection
    let sanitized = arg.replace(/[;&|`$(){}[\]<>'"\\]/g, '');

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Limit length
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }

    return sanitized;
  }

  private static isPrivateOrLocalhost(hostname: string): boolean {
    // Check for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Check for private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^::1$/, // IPv6 localhost
      /^fe80::/i, // IPv6 link-local
      /^fc00::/i, // IPv6 private
      /^fd00::/i  // IPv6 private
    ];

    return privateRanges.some(range => range.test(hostname));
  }

  /**
   * Validate that input doesn't contain dangerous patterns
   */
  static validateSafety(input: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        issues.push(`Dangerous pattern detected: ${pattern.source}`);
      }
    }

    return {
      safe: issues.length === 0,
      issues
    };
  }

  /**
   * Escape special characters for safe inclusion in generated code
   */
  static escapeForCode(input: string, language: 'javascript' | 'typescript' | 'html' | 'css' = 'javascript'): string {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return input
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
          .replace(/\x00/g, '\\0');

      case 'html':
        return input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');

      case 'css':
        return input
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/'/g, "\\'")
          .replace(/\n/g, '\\A ')
          .replace(/\r/g, '\\D ');

      default:
        return input;
    }
  }
}