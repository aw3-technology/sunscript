import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';
import { PathSecurityManager } from './PathSecurityManager';

const execAsync = promisify(exec);

export interface SecureExecOptions {
  timeout?: number;
  maxBuffer?: number;
  allowedCommands?: string[];
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  validateOutput?: boolean;
}

export interface SecureExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  duration: number;
}

export class SecureShellManager {
  private static readonly ALLOWED_COMMANDS = [
    'git',
    'node',
    'npm',
    'python',
    'python3',
    'java',
    'go',
    'cargo',
    'rustc'
  ];

  private static readonly DANGEROUS_PATTERNS = [
    /[;&|`$(){}[\]]/,           // Shell metacharacters
    /\|\s*\w+/,                 // Pipes to commands
    />\s*\/dev/,                // Device redirections
    />\s*\/etc/,                // System file redirections
    /curl\s+.*\|\s*sh/,         // Curl pipe to shell
    /wget\s+.*\|\s*sh/,         // Wget pipe to shell
    /rm\s+-rf/,                 // Dangerous delete
    /chmod\s+777/,              // Permission changes
    /sudo/,                     // Privilege escalation
    /su\s+/,                    // User switching
    /passwd/,                   // Password commands
    /\/etc\/passwd/,            // System files
    /\/etc\/shadow/,            // Shadow file
    /\.ssh\//,                  // SSH keys
    /\$\{.*\}/,                 // Variable expansion
    /`.*`/,                     // Command substitution
    /\$\(.*\)/                  // Command substitution
  ];

  /**
   * Safely execute a git command
   */
  static async executeGitCommand(
    args: string[],
    workingDirectory?: string,
    options: Partial<SecureExecOptions> = {}
  ): Promise<SecureExecResult> {
    // Validate git command arguments
    const validatedArgs = this.validateGitArgs(args);
    
    return this.executeCommand('git', validatedArgs, {
      ...options,
      workingDirectory: workingDirectory || process.cwd(),
      timeout: options.timeout || 30000
    });
  }

  /**
   * Safely execute node/npm commands
   */
  static async executeNodeCommand(
    command: 'node' | 'npm',
    args: string[],
    workingDirectory?: string,
    options: Partial<SecureExecOptions> = {}
  ): Promise<SecureExecResult> {
    // Validate node command arguments
    const validatedArgs = this.validateNodeArgs(command, args);
    
    return this.executeCommand(command, validatedArgs, {
      ...options,
      workingDirectory: workingDirectory || process.cwd(),
      timeout: options.timeout || 60000
    });
  }

  /**
   * Safely execute a whitelisted command
   */
  static async executeCommand(
    command: string,
    args: string[],
    options: SecureExecOptions = {}
  ): Promise<SecureExecResult> {
    const startTime = Date.now();

    try {
      // Validate command is allowed
      if (!this.ALLOWED_COMMANDS.includes(command)) {
        throw new SunScriptError(
          ErrorCode.SECURITY_VIOLATION,
          `Command '${command}' is not allowed`,
          {
            suggestions: [`Allowed commands: ${this.ALLOWED_COMMANDS.join(', ')}`]
          }
        );
      }

      // Validate arguments for dangerous patterns
      for (const arg of args) {
        if (this.containsDangerousPatterns(arg)) {
          throw new SunScriptError(
            ErrorCode.SECURITY_VIOLATION,
            `Argument contains dangerous patterns: ${arg}`,
            {
              suggestions: ['Remove special characters and shell metacharacters']
            }
          );
        }
      }

      // Validate working directory
      let safeWorkingDir = process.cwd();
      if (options.workingDirectory) {
        const dirValidation = await PathSecurityManager.validatePath(options.workingDirectory, {
          requireExists: true,
          allowedDirectories: PathSecurityManager.getProjectBoundaries()
        });

        if (!dirValidation.valid) {
          throw new SunScriptError(
            ErrorCode.SECURITY_VIOLATION,
            `Invalid working directory: ${dirValidation.errors.join(', ')}`,
            {
              filePath: options.workingDirectory
            }
          );
        }
        safeWorkingDir = dirValidation.resolvedPath;
      }

      // Prepare safe environment
      const safeEnv = {
        ...process.env,
        // Remove potentially dangerous environment variables
        LD_PRELOAD: undefined,
        LD_LIBRARY_PATH: undefined,
        DYLD_LIBRARY_PATH: undefined,
        DYLD_INSERT_LIBRARIES: undefined,
        // Add custom environment variables (if safe)
        ...(options.environmentVariables || {})
      };

      // Log the command execution for security auditing
      globalLogger.info('Executing secure command', {
        type: 'security',
        command,
        args: args.slice(0, 5), // Log only first 5 args to prevent log spam
        workingDirectory: safeWorkingDir
      });

      // Execute using spawn for better security control
      const result = await new Promise<SecureExecResult>((resolve, reject) => {
        const child = spawn(command, args, {
          cwd: safeWorkingDir,
          env: safeEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: options.timeout || 30000
        }) as any;

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          const duration = Date.now() - startTime;
          
          const result: SecureExecResult = {
            stdout: options.validateOutput ? this.sanitizeOutput(stdout) : stdout,
            stderr: options.validateOutput ? this.sanitizeOutput(stderr) : stderr,
            exitCode: code || 0,
            command: `${command} ${args.join(' ')}`,
            duration
          };

          if (code === 0) {
            resolve(result);
          } else {
            reject(new SunScriptError(
              ErrorCode.EXTERNAL_COMMAND_FAILED,
              `Command failed with exit code ${code}: ${stderr}`,
              {
                context: { command, args, exitCode: code, duration }
              }
            ));
          }
        });

        child.on('error', (error) => {
          reject(new SunScriptError(
            ErrorCode.EXTERNAL_COMMAND_FAILED,
            `Command execution failed: ${error.message}`,
            {
              cause: error,
              context: { command, args }
            }
          ));
        });

        // Handle timeout
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGTERM');
            reject(new SunScriptError(
              ErrorCode.TIMEOUT,
              `Command timed out after ${options.timeout || 30000}ms`,
              {
                context: { command, args, timeout: options.timeout || 30000 }
              }
            ));
          }
        }, options.timeout || 30000);
      });

      globalLogger.info('Command executed successfully', {
        type: 'security',
        command,
        duration: result.duration,
        exitCode: result.exitCode
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      globalLogger.error('Secure command execution failed', error as Error, {
        type: 'security',
        command,
        args: args.slice(0, 3),
        duration
      });

      throw error;
    }
  }

  /**
   * Validate git command arguments
   */
  private static validateGitArgs(args: string[]): string[] {
    const allowedGitCommands = [
      'clone', 'pull', 'fetch', 'status', 'log', 'diff', 'show',
      'branch', 'checkout', 'add', 'commit', 'push', 'remote'
    ];

    if (args.length === 0) {
      throw new SunScriptError(
        ErrorCode.INVALID_INPUT,
        'Git command requires arguments'
      );
    }

    const subcommand = args[0];
    if (!allowedGitCommands.includes(subcommand)) {
      throw new SunScriptError(
        ErrorCode.SECURITY_VIOLATION,
        `Git subcommand '${subcommand}' is not allowed`,
        {
          suggestions: [`Allowed commands: ${allowedGitCommands.join(', ')}`]
        }
      );
    }

    // Additional validation for specific commands
    if (subcommand === 'clone') {
      if (args.length < 2) {
        throw new SunScriptError(
          ErrorCode.INVALID_INPUT,
          'Git clone requires a repository URL'
        );
      }

      // Validate the repository URL
      const repoUrl = args[1];
      if (!repoUrl.startsWith('https://github.com/')) {
        throw new SunScriptError(
          ErrorCode.SECURITY_VIOLATION,
          'Only GitHub HTTPS URLs are allowed for cloning'
        );
      }

      // Validate GitHub URL format
      const githubValidation = PathSecurityManager.validateGitHubUrl(repoUrl);
      if (!githubValidation.valid) {
        throw new SunScriptError(
          ErrorCode.SECURITY_VIOLATION,
          `Invalid GitHub URL: ${githubValidation.errors.join(', ')}`
        );
      }
    }

    return args;
  }

  /**
   * Validate node/npm command arguments
   */
  private static validateNodeArgs(command: 'node' | 'npm', args: string[]): string[] {
    if (command === 'npm') {
      const allowedNpmCommands = ['install', 'run', 'test', 'build', 'start', 'version', 'ls'];
      
      if (args.length === 0) {
        throw new SunScriptError(
          ErrorCode.INVALID_INPUT,
          'NPM command requires arguments'
        );
      }

      const subcommand = args[0];
      if (!allowedNpmCommands.includes(subcommand)) {
        throw new SunScriptError(
          ErrorCode.SECURITY_VIOLATION,
          `NPM subcommand '${subcommand}' is not allowed`,
          {
            suggestions: [`Allowed commands: ${allowedNpmCommands.join(', ')}`]
          }
        );
      }
    } else if (command === 'node') {
      // For node commands, ensure the script file is within project boundaries
      if (args.length > 0 && args[0].endsWith('.js')) {
        const scriptPath = args[0];
        // This will be validated by the calling code using PathSecurityManager
      }
    }

    return args;
  }

  /**
   * Check if a string contains dangerous patterns
   */
  private static containsDangerousPatterns(input: string): boolean {
    return this.DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize command output to remove potentially dangerous content
   */
  private static sanitizeOutput(output: string): string {
    // Remove ANSI escape codes
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    let sanitized = output.replace(ansiRegex, '');

    // Remove or replace potentially dangerous patterns in output
    sanitized = sanitized
      .replace(/password\s*[:=]\s*\S+/gi, 'password: [REDACTED]')
      .replace(/token\s*[:=]\s*\S+/gi, 'token: [REDACTED]')
      .replace(/key\s*[:=]\s*\S+/gi, 'key: [REDACTED]')
      .replace(/secret\s*[:=]\s*\S+/gi, 'secret: [REDACTED]');

    return sanitized;
  }

  /**
   * Create a safe temporary directory for command operations
   */
  static async createTempDirectory(prefix = 'sunscript-'): Promise<string> {
    const tempBaseDir = path.join(process.cwd(), '.sunscript-temp');
    const tempDir = path.join(tempBaseDir, prefix + Date.now() + '-' + Math.random().toString(36).substr(2, 8));

    const validation = await PathSecurityManager.validatePath(tempDir, {
      allowedDirectories: [process.cwd()]
    });

    if (!validation.valid) {
      throw new SunScriptError(
        ErrorCode.SECURITY_VIOLATION,
        `Cannot create temp directory: ${validation.errors.join(', ')}`
      );
    }

    return PathSecurityManager.createSafeDirectory(tempDir, true);
  }

  /**
   * Clean up temporary directories safely
   */
  static async cleanupTempDirectory(tempDir: string): Promise<void> {
    const validation = await PathSecurityManager.validatePath(tempDir, {
      requireExists: true,
      allowedDirectories: [path.join(process.cwd(), '.sunscript-temp')]
    });

    if (!validation.valid) {
      globalLogger.warn('Cannot cleanup temp directory - security validation failed', {
        type: 'security',
        tempDir,
        errors: validation.errors
      });
      return;
    }

    try {
      // Use Node.js built-in fs.rm to remove directory recursively
      const fs = await import('fs/promises');
      await fs.rm(validation.resolvedPath, { recursive: true, force: true });
      
      globalLogger.info('Temp directory cleaned up successfully', {
        type: 'security',
        tempDir: validation.resolvedPath
      });
    } catch (error) {
      globalLogger.error('Failed to cleanup temp directory', error as Error, {
        type: 'security',
        tempDir: validation.resolvedPath
      });
    }
  }
}