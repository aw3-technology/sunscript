import { InputValidator, ValidationRule, ValidationResult } from './InputValidator';
import { InputSanitizer } from '../security/InputSanitizer';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';

export interface CLIArgument {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  description?: string;
}

export interface CLIValidationOptions {
  allowUnknownArgs?: boolean;
  sanitizeStrings?: boolean;
  maxArgLength?: number;
  logValidation?: boolean;
}

export class CLIValidator {
  private static _rules: any;
  
  private static get rules() {
    if (!this._rules) {
      try {
        this._rules = InputValidator.createRules();
      } catch (error) {
        console.error('Error creating CLI validation rules:', error);
        // Use proper fallback rules
        this._rules = {
          required: (message = 'Required') => ({ 
            name: 'required', 
            validator: (value: any) => value !== undefined && value !== null && value !== '', 
            message 
          }),
          string: (message = 'String required') => ({ 
            name: 'string', 
            validator: (value: any) => typeof value === 'string', 
            message 
          }),
          boolean: (message = 'Boolean required') => ({ 
            name: 'boolean', 
            validator: (value: any) => typeof value === 'boolean', 
            message 
          }),
          oneOf: (values: any[], message = 'Invalid value') => ({ 
            name: 'oneOf', 
            validator: (value: any) => values.includes(value), 
            message: message || `Must be one of: ${values.join(', ')}` 
          }),
          filePath: (message = 'Invalid file path') => ({ 
            name: 'filePath', 
            validator: (value: string) => {
              if (typeof value !== 'string') return false;
              const dangerousPatterns = [/\.\.\//, /\/\.\./, /\0/, /\x00/];
              return !dangerousPatterns.some(pattern => pattern.test(value));
            }, 
            message 
          })
        };
      }
    }
    return this._rules;
  }

  /**
   * Validate CLI command arguments
   */
  static validateCommand(command: string, args: Record<string, any>, options: CLIValidationOptions = {}): ValidationResult {
    const opts = {
      allowUnknownArgs: false,
      sanitizeStrings: true,
      maxArgLength: 1000,
      logValidation: true,
      ...options
    };

    const errors: any[] = [];
    const sanitized: Record<string, any> = {};

    // Validate command name
    const commandResult = this.validateCommandName(command);
    if (!commandResult.valid) {
      errors.push(...commandResult.errors);
    }

    // Get validation schema for the command
    const schema = this.getCommandSchema(command);
    
    if (!schema) {
      errors.push({
        field: 'command',
        message: `Unknown command: ${command}`,
        value: command,
        rule: 'unknownCommand'
      });
      return { valid: false, errors };
    }

    // Validate each argument
    for (const [argName, argValue] of Object.entries(args)) {
      const argSchema = schema[argName];
      
      if (!argSchema) {
        if (!opts.allowUnknownArgs) {
          errors.push({
            field: argName,
            message: `Unknown argument: ${argName}`,
            value: argValue,
            rule: 'unknownArg'
          });
        }
        continue;
      }

      // Apply validation rules
      const rules = Array.isArray(argSchema) ? argSchema : [argSchema];
      
      for (const rule of rules) {
        try {
          const result = rule.validator(argValue);
          
          if (result === false) {
            errors.push({
              field: argName,
              message: rule.message || `Validation failed for argument ${argName}`,
              value: argValue,
              rule: rule.name
            });
          } else if (typeof result === 'string') {
            errors.push({
              field: argName,
              message: result,
              value: argValue,
              rule: rule.name
            });
          } else {
            // Validation passed, apply sanitizer
            let sanitizedValue = rule.sanitizer ? rule.sanitizer(argValue) : argValue;
            
            // Additional sanitization for strings
            if (opts.sanitizeStrings && typeof sanitizedValue === 'string') {
              sanitizedValue = InputSanitizer.sanitizeCliArgument(sanitizedValue);
              
              if (sanitizedValue.length > opts.maxArgLength) {
                errors.push({
                  field: argName,
                  message: `Argument too long (max ${opts.maxArgLength} characters)`,
                  value: sanitizedValue.length,
                  rule: 'maxLength'
                });
                sanitizedValue = sanitizedValue.substring(0, opts.maxArgLength);
              }
            }
            
            sanitized[argName] = sanitizedValue;
          }
        } catch (error) {
          errors.push({
            field: argName,
            message: `Validation error: ${(error as Error).message}`,
            value: argValue,
            rule: rule.name
          });
        }
      }
    }

    // Check for missing required arguments
    const requiredArgs = this.getRequiredArguments(command);
    for (const requiredArg of requiredArgs) {
      if (!(requiredArg in args)) {
        errors.push({
          field: requiredArg,
          message: `Required argument missing: ${requiredArg}`,
          rule: 'required'
        });
      }
    }

    if (opts.logValidation) {
      if (errors.length > 0) {
        globalLogger.warn('CLI validation failed', {
          type: 'cli-validation',
          command,
          errors,
          args: this.sanitizeArgsForLogging(args)
        });
      } else {
        globalLogger.debug('CLI validation passed', {
          type: 'cli-validation',
          command,
          argCount: Object.keys(args).length
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Validate individual CLI argument
   */
  static validateArgument(name: string, value: any, type: string, required: boolean = false): ValidationResult {
    const errors: any[] = [];
    let sanitized = value;

    // Required check
    if (required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: name,
        message: `Required argument ${name} is missing`,
        rule: 'required'
      });
      return { valid: false, errors };
    }

    // Skip validation if value is undefined/null and not required
    if (value === undefined || value === null) {
      return { valid: true, errors: [], sanitized: { [name]: value } };
    }

    // Type validation and sanitization
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: name,
            message: `Argument ${name} must be a string`,
            value,
            rule: 'type'
          });
        } else {
          sanitized = InputSanitizer.sanitizeCliArgument(value);
        }
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({
            field: name,
            message: `Argument ${name} must be a number`,
            value,
            rule: 'type'
          });
        } else {
          sanitized = num;
        }
        break;

      case 'boolean':
        if (typeof value === 'string') {
          if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) {
            sanitized = true;
          } else if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) {
            sanitized = false;
          } else {
            errors.push({
              field: name,
              message: `Argument ${name} must be a boolean value`,
              value,
              rule: 'type'
            });
          }
        } else if (typeof value !== 'boolean') {
          errors.push({
            field: name,
            message: `Argument ${name} must be a boolean`,
            value,
            rule: 'type'
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          // Try to parse as comma-separated string
          if (typeof value === 'string') {
            sanitized = value.split(',').map(item => item.trim());
          } else {
            errors.push({
              field: name,
              message: `Argument ${name} must be an array`,
              value,
              rule: 'type'
            });
          }
        }
        break;

      default:
        errors.push({
          field: name,
          message: `Unknown argument type: ${type}`,
          value: type,
          rule: 'unknownType'
        });
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { [name]: sanitized }
    };
  }

  /**
   * Validate command name
   */
  private static validateCommandName(command: string): ValidationResult {
    const errors: any[] = [];

    if (!command || typeof command !== 'string') {
      errors.push({
        field: 'command',
        message: 'Command must be a non-empty string',
        value: command,
        rule: 'required'
      });
      return { valid: false, errors };
    }

    // Sanitize command name
    const sanitized = InputSanitizer.sanitizeCliArgument(command);
    
    if (sanitized !== command) {
      errors.push({
        field: 'command',
        message: 'Command contains invalid characters',
        value: command,
        rule: 'sanitization'
      });
    }

    // Check command length
    if (sanitized.length > 50) {
      errors.push({
        field: 'command',
        message: 'Command name too long',
        value: sanitized.length,
        rule: 'maxLength'
      });
    }

    // Check for valid command format
    if (!/^[a-zA-Z][a-zA-Z0-9\-_]*$/.test(sanitized)) {
      errors.push({
        field: 'command',
        message: 'Command name must start with a letter and contain only letters, numbers, hyphens, and underscores',
        value: sanitized,
        rule: 'format'
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get validation schema for a specific command
   */
  private static getCommandSchema(command: string): Record<string, ValidationRule | ValidationRule[]> | null {
    const schemas: Record<string, Record<string, ValidationRule | ValidationRule[]>> = {
      compile: {
        input: [
          CLIValidator.rules.required('Input file is required'),
          CLIValidator.rules.string('Input must be a string'),
          CLIValidator.rules.filePath('Invalid input file path'),
          {
            name: 'sunExtension',
            validator: (value: string) => value.endsWith('.sun'),
            message: 'Input file must have .sun extension'
          }
        ],
        output: [
          CLIValidator.rules.string('Output must be a string'),
          CLIValidator.rules.filePath('Invalid output directory path')
        ],
        target: [
          CLIValidator.rules.string('Target must be a string'),
          CLIValidator.rules.oneOf(['javascript', 'typescript', 'python', 'html'], 'Invalid target language')
        ],
        verbose: [CLIValidator.rules.boolean('Verbose must be a boolean')],
        watch: [CLIValidator.rules.boolean('Watch must be a boolean')]
      },

      genesis: {
        file: [
          CLIValidator.rules.string('Genesis file must be a string'),
          CLIValidator.rules.filePath('Invalid genesis file path'),
          {
            name: 'sunExtension',
            validator: (value: string) => value.endsWith('.sun'),
            message: 'Genesis file must have .sun extension'
          }
        ],
        full: [CLIValidator.rules.boolean('Full must be a boolean')],
        watch: [CLIValidator.rules.boolean('Watch must be a boolean')],
        clearCache: [CLIValidator.rules.boolean('Clear cache must be a boolean')],
        verbose: [CLIValidator.rules.boolean('Verbose must be a boolean')]
      },

      let: {
        genesis: [
          CLIValidator.rules.string('Genesis file must be a string'),
          CLIValidator.rules.filePath('Invalid genesis file path')
        ],
        full: [CLIValidator.rules.boolean('Full must be a boolean')],
        watch: [CLIValidator.rules.boolean('Watch must be a boolean')],
        clearCache: [CLIValidator.rules.boolean('Clear cache must be a boolean')],
        verbose: [CLIValidator.rules.boolean('Verbose must be a boolean')]
      },

      run: {
        file: [
          CLIValidator.rules.required('File is required'),
          CLIValidator.rules.string('File must be a string'),
          CLIValidator.rules.filePath('Invalid file path'),
          {
            name: 'sunExtension',
            validator: (value: string) => value.endsWith('.sun'),
            message: 'File must have .sun extension'
          }
        ],
        full: [CLIValidator.rules.boolean('Full must be a boolean')],
        watch: [CLIValidator.rules.boolean('Watch must be a boolean')],
        clearCache: [CLIValidator.rules.boolean('Clear cache must be a boolean')],
        verbose: [CLIValidator.rules.boolean('Verbose must be a boolean')]
      },

      import: {
        url: [
          CLIValidator.rules.required('GitHub URL is required'),
          CLIValidator.rules.string('URL must be a string'),
          {
            name: 'githubUrl',
            validator: (value: string) => /^https:\/\/github\.com\/[^\/]+\/[^\/]+/.test(value),
            message: 'Must be a valid GitHub repository URL'
          }
        ],
        output: [
          CLIValidator.rules.string('Output directory must be a string'),
          CLIValidator.rules.filePath('Invalid output directory path')
        ],
        source: [
          CLIValidator.rules.string('Source directory must be a string'),
          CLIValidator.rules.filePath('Invalid source directory path')
        ],
        comments: [CLIValidator.rules.boolean('Comments must be a boolean')]
      }
    };

    return schemas[command] || null;
  }

  /**
   * Get required arguments for a command
   */
  private static getRequiredArguments(command: string): string[] {
    const requiredArgs: Record<string, string[]> = {
      compile: ['input'],
      genesis: [],
      let: [],
      run: ['file'],
      import: ['url']
    };

    return requiredArgs[command] || [];
  }

  /**
   * Sanitize arguments for safe logging
   */
  private static sanitizeArgsForLogging(args: Record<string, any>): Record<string, any> {
    const sanitized = { ...args };
    
    // Remove or mask sensitive arguments
    const sensitiveArgs = ['apiKey', 'token', 'password', 'secret'];
    
    for (const arg of sensitiveArgs) {
      if (sanitized[arg]) {
        sanitized[arg] = '[REDACTED]';
      }
    }

    // Truncate very long arguments
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      }
    }

    return sanitized;
  }

  /**
   * Create a CLI argument parser with validation
   */
  static createArgumentParser(commandName: string, options: CLIValidationOptions = {}) {
    return (rawArgs: Record<string, any>) => {
      const result = this.validateCommand(commandName, rawArgs, options);
      
      if (!result.valid) {
        const errorMessages = result.errors.map(err => `${err.field}: ${err.message}`);
        throw new SunScriptError(ErrorCode.INVALID_OPERATION, `Invalid CLI arguments: ${errorMessages.join(', ')}`, {
          context: { command: commandName, errors: result.errors },
          suggestions: [
            'Check the command syntax',
            'Use --help for valid arguments',
            'Ensure all required arguments are provided'
          ]
        });
      }

      return result.sanitized || rawArgs;
    };
  }

  /**
   * Validate file paths in CLI arguments
   */
  static validateFilePaths(args: Record<string, any>): ValidationResult {
    const errors: any[] = [];
    const sanitized: Record<string, any> = { ...args };

    const filePathArgs = ['input', 'output', 'file', 'genesis', 'source'];
    
    for (const argName of filePathArgs) {
      if (args[argName]) {
        try {
          const sanitizedPath = InputSanitizer.sanitizePath(args[argName], {
            allowRelativePaths: true,
            allowParentTraversal: false,
            allowAbsolutePaths: true
          });
          sanitized[argName] = sanitizedPath;
        } catch (error) {
          errors.push({
            field: argName,
            message: `Invalid file path: ${(error as Error).message}`,
            value: args[argName],
            rule: 'filePath'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Validate environment-specific CLI arguments
   */
  static validateEnvironmentArgs(args: Record<string, any>): ValidationResult {
    const errors: any[] = [];
    
    // Production environment restrictions
    if (process.env.NODE_ENV === 'production') {
      // Restrict certain arguments in production
      const restrictedInProd = ['debug', 'unsafe', 'allowDangerous'];
      
      for (const restricted of restrictedInProd) {
        if (args[restricted]) {
          errors.push({
            field: restricted,
            message: `Argument ${restricted} is not allowed in production environment`,
            value: args[restricted],
            rule: 'environment'
          });
        }
      }

      // Require certain arguments in production
      if (args.verbose === true) {
        globalLogger.warn('Verbose mode enabled in production', {
          type: 'cli-validation',
          environment: 'production'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}