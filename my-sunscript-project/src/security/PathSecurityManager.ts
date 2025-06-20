import * as path from 'path';
import * as fs from 'fs/promises';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';

export interface SecurePathOptions {
  allowedExtensions?: string[];
  maxPathLength?: number;
  allowedDirectories?: string[];
  requireExists?: boolean;
  preventOverwrite?: boolean;
  allowSymlinks?: boolean;
}

export interface PathValidationResult {
  valid: boolean;
  resolvedPath: string;
  errors: string[];
  warnings: string[];
  isWithinAllowedDirectory: boolean;
  isSafe: boolean;
}

export class PathSecurityManager {
  private static readonly DANGEROUS_PATTERNS = [
    /\.\./,                          // Directory traversal
    /^\/.*$/,                        // Absolute paths (Unix)
    /^[A-Za-z]:\\.*$/,              // Absolute paths (Windows)
    /^\\\\.*$/,                     // UNC paths
    /\0/,                           // Null bytes
    /[\x00-\x1f\x7f-\x9f]/,        // Control characters
    /[<>:"|?*]/,                    // Windows invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    /^\./,                          // Hidden files (configurable)
    /\s+$/,                         // Trailing whitespace
    /^-/                            // Files starting with dash
  ];

  private static readonly ALLOWED_FILE_EXTENSIONS = [
    '.sun', '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', 
    '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.lock'
  ];

  private static readonly MAX_PATH_LENGTH = 260; // Windows MAX_PATH
  private static readonly MAX_FILENAME_LENGTH = 255;

  /**
   * Validate and sanitize a file path for security
   */
  static async validatePath(
    inputPath: string, 
    options: SecurePathOptions = {}
  ): Promise<PathValidationResult> {
    const result: PathValidationResult = {
      valid: false,
      resolvedPath: '',
      errors: [],
      warnings: [],
      isWithinAllowedDirectory: false,
      isSafe: false
    };

    try {
      // Basic validation
      if (!inputPath || typeof inputPath !== 'string') {
        result.errors.push('Path must be a non-empty string');
        return result;
      }

      // Trim and normalize
      const trimmedPath = inputPath.trim();
      if (trimmedPath.length === 0) {
        result.errors.push('Path cannot be empty after trimming');
        return result;
      }

      // Check path length
      if (trimmedPath.length > (options.maxPathLength || this.MAX_PATH_LENGTH)) {
        result.errors.push(`Path too long (max ${options.maxPathLength || this.MAX_PATH_LENGTH} characters)`);
        return result;
      }

      // Check for dangerous patterns
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(trimmedPath)) {
          result.errors.push(`Path contains dangerous pattern: ${pattern.source}`);
          return result;
        }
      }

      // Resolve and normalize the path
      const resolvedPath = path.resolve(trimmedPath);
      result.resolvedPath = resolvedPath;

      // Check filename length
      const filename = path.basename(resolvedPath);
      if (filename.length > this.MAX_FILENAME_LENGTH) {
        result.errors.push(`Filename too long (max ${this.MAX_FILENAME_LENGTH} characters)`);
        return result;
      }

      // Validate file extension
      if (options.allowedExtensions) {
        const ext = path.extname(resolvedPath).toLowerCase();
        if (!options.allowedExtensions.includes(ext)) {
          result.errors.push(`File extension '${ext}' not allowed`);
          return result;
        }
      } else {
        const ext = path.extname(resolvedPath).toLowerCase();
        if (ext && !this.ALLOWED_FILE_EXTENSIONS.includes(ext)) {
          result.warnings.push(`File extension '${ext}' is not in the standard allowed list`);
        }
      }

      // Check if within allowed directories
      if (options.allowedDirectories && options.allowedDirectories.length > 0) {
        result.isWithinAllowedDirectory = options.allowedDirectories.some(allowedDir => {
          const resolvedAllowedDir = path.resolve(allowedDir);
          return resolvedPath.startsWith(resolvedAllowedDir + path.sep) || 
                 resolvedPath === resolvedAllowedDir;
        });

        if (!result.isWithinAllowedDirectory) {
          result.errors.push('Path is not within allowed directories');
          return result;
        }
      } else {
        // Default: must be within current working directory or subdirectories
        const cwd = process.cwd();
        result.isWithinAllowedDirectory = resolvedPath.startsWith(cwd + path.sep) || 
                                         resolvedPath === cwd;
        
        if (!result.isWithinAllowedDirectory) {
          result.errors.push('Path must be within current working directory');
          return result;
        }
      }

      // Check if file exists (if required)
      if (options.requireExists) {
        try {
          const stats = await fs.stat(resolvedPath);
          
          // Check for symlinks if not allowed
          if (!options.allowSymlinks && stats.isSymbolicLink()) {
            result.errors.push('Symbolic links are not allowed');
            return result;
          }
        } catch (error) {
          result.errors.push(`Required file does not exist: ${resolvedPath}`);
          return result;
        }
      }

      // Check for overwrite protection
      if (options.preventOverwrite) {
        try {
          await fs.access(resolvedPath);
          result.errors.push('File already exists and overwrite is not allowed');
          return result;
        } catch {
          // File doesn't exist, which is what we want
        }
      }

      // Additional security checks
      result.isSafe = await this.performAdditionalSecurityChecks(resolvedPath);
      if (!result.isSafe) {
        result.warnings.push('Path failed additional security checks');
      }

      result.valid = result.errors.length === 0;
      
      globalLogger.debug('Path validation completed', {
        type: 'security',
        inputPath,
        resolvedPath: result.resolvedPath,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings
      });

      return result;

    } catch (error) {
      result.errors.push(`Path validation failed: ${(error as Error).message}`);
      globalLogger.error('Path validation error', error as Error, {
        type: 'security',
        inputPath
      });
      return result;
    }
  }

  /**
   * Safely resolve a path relative to a base directory
   */
  static async safePath(basePath: string, relativePath: string): Promise<string> {
    const baseValidation = await this.validatePath(basePath, {
      requireExists: true,
      allowedDirectories: [process.cwd()]
    });

    if (!baseValidation.valid) {
      throw new SunScriptError(
        ErrorCode.SECURITY_VIOLATION,
        `Invalid base path: ${baseValidation.errors.join(', ')}`,
        {
          filePath: basePath,
          suggestions: ['Use a valid base directory path']
        }
      );
    }

    const fullPath = path.join(baseValidation.resolvedPath, relativePath);
    
    const pathValidation = await this.validatePath(fullPath, {
      allowedDirectories: [baseValidation.resolvedPath]
    });

    if (!pathValidation.valid) {
      throw new SunScriptError(
        ErrorCode.SECURITY_VIOLATION,
        `Invalid relative path: ${pathValidation.errors.join(', ')}`,
        {
          filePath: fullPath,
          suggestions: ['Use a path within the allowed directory']
        }
      );
    }

    return pathValidation.resolvedPath;
  }

  /**
   * Create a safe directory path
   */
  static async createSafeDirectory(dirPath: string, recursive = false): Promise<string> {
    const validation = await this.validatePath(dirPath, {
      allowedDirectories: [process.cwd()]
    });

    if (!validation.valid) {
      throw new SunScriptError(
        ErrorCode.SECURITY_VIOLATION,
        `Cannot create unsafe directory: ${validation.errors.join(', ')}`,
        {
          filePath: dirPath,
          suggestions: ['Use a safe directory path within the project']
        }
      );
    }

    try {
      await fs.mkdir(validation.resolvedPath, { recursive });
      globalLogger.info('Safe directory created', {
        type: 'security',
        directory: validation.resolvedPath
      });
      return validation.resolvedPath;
    } catch (error) {
      throw new SunScriptError(
        ErrorCode.FILE_OPERATION_FAILED,
        `Failed to create directory: ${(error as Error).message}`,
        {
          filePath: validation.resolvedPath,
          cause: error as Error
        }
      );
    }
  }

  /**
   * Sanitize a filename for safe use
   */
  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new SunScriptError(
        ErrorCode.INVALID_INPUT,
        'Filename must be a non-empty string'
      );
    }

    // Remove or replace dangerous characters
    let sanitized = filename
      .replace(/[<>:"|?*\x00-\x1f\x7f-\x9f]/g, '_') // Replace dangerous chars
      .replace(/^\.+/, '_')                           // Remove leading dots
      .replace(/\s+/g, '_')                          // Replace spaces
      .replace(/\.+$/, '')                           // Remove trailing dots
      .substring(0, this.MAX_FILENAME_LENGTH);       // Limit length

    // Check for Windows reserved names
    const baseName = sanitized.split('.')[0].toUpperCase();
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(baseName)) {
      sanitized = '_' + sanitized;
    }

    // Ensure it's not empty after sanitization
    if (!sanitized) {
      sanitized = 'sanitized_file';
    }

    return sanitized;
  }

  /**
   * Validate a GitHub URL for security
   */
  static validateGitHubUrl(url: string): { valid: boolean; owner?: string; repo?: string; errors: string[] } {
    const result = { valid: false, owner: undefined as string | undefined, repo: undefined as string | undefined, errors: [] as string[] };

    if (!url || typeof url !== 'string') {
      result.errors.push('URL must be a non-empty string');
      return result;
    }

    // Normalize and validate URL format
    const trimmedUrl = url.trim();
    
    // Check for dangerous protocols
    if (!/^https?:\/\//.test(trimmedUrl)) {
      result.errors.push('Only HTTP/HTTPS URLs are allowed');
      return result;
    }

    // Validate GitHub domain
    const urlPattern = /^https?:\/\/github\.com\/([a-zA-Z0-9]([a-zA-Z0-9\-]){0,38})\/([a-zA-Z0-9]([a-zA-Z0-9\.\-_]){0,99})(\.git)?(?:\/.*)?$/;
    const match = trimmedUrl.match(urlPattern);

    if (!match) {
      result.errors.push('Invalid GitHub URL format');
      return result;
    }

    const [, owner, , repo] = match;

    // Additional validation
    if (owner.length < 1 || owner.length > 39) {
      result.errors.push('GitHub owner name must be 1-39 characters');
      return result;
    }

    if (repo.length < 1 || repo.length > 100) {
      result.errors.push('GitHub repository name must be 1-100 characters');
      return result;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /[<>"|;\\]/,
      /\.\./,
      /\0/,
      /^-/,
      /\$\{/,
      /`/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(owner) || pattern.test(repo)) {
        result.errors.push('GitHub URL contains suspicious characters');
        return result;
      }
    }

    result.valid = true;
    result.owner = owner;
    result.repo = repo.replace(/\.git$/, '');
    return result;
  }

  /**
   * Perform additional security checks on a resolved path
   */
  private static async performAdditionalSecurityChecks(resolvedPath: string): Promise<boolean> {
    try {
      // Check if path exists and get stats
      const stats = await fs.stat(resolvedPath).catch(() => null);
      
      if (stats) {
        // Check file permissions (Unix-like systems)
        if (process.platform !== 'win32') {
          // Ensure file is not world-writable
          const mode = stats.mode;
          if (mode & 0o002) {
            globalLogger.warn('File is world-writable', {
              type: 'security',
              filePath: resolvedPath,
              mode: mode.toString(8)
            });
            return false;
          }
        }

        // Check file size (prevent huge files)
        if (stats.size > 100 * 1024 * 1024) { // 100MB limit
          globalLogger.warn('File is too large', {
            type: 'security',
            filePath: resolvedPath,
            size: stats.size
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      globalLogger.warn('Additional security checks failed', {
        type: 'security',
        filePath: resolvedPath,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get safe project directories
   */
  static getProjectBoundaries(): string[] {
    const cwd = process.cwd();
    return [
      cwd,
      path.join(cwd, 'src'),
      path.join(cwd, 'dist'),
      path.join(cwd, 'build'),
      path.join(cwd, 'out'),
      path.join(cwd, 'examples'),
      path.join(cwd, 'docs'),
      path.join(cwd, 'test'),
      path.join(cwd, 'tests')
    ];
  }
}