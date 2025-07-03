import { InputValidator, ValidationSchema, ValidationResult } from './InputValidator';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { CompilerConfig, TargetLanguage, AIContext, GenerationOptions } from '../types';
import { globalLogger } from '../errors/Logger';

export interface ConfigValidationOptions {
  strict?: boolean;
  allowUnknownFields?: boolean;
  sanitizeInput?: boolean;
}

export class ConfigValidator {
  private static _rules: any;
  
  private static get rules() {
    if (!this._rules) {
      try {
        this._rules = InputValidator.createRules();
      } catch (error) {
        console.error('Error creating rules:', error);
        // Return proper fallback rules that actually validate
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
          number: (message = 'Number required') => ({ 
            name: 'number', 
            validator: (value: any) => typeof value === 'number' && !isNaN(value), 
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
              // For outputDir, we need to allow absolute paths
              // Check if this is an outputDir validation by examining the message
              if (message === 'Invalid output directory path') {
                // Less restrictive validation for output directories - allow absolute paths
                const dangerousPatterns = [/\0/, /\x00/];
                return !dangerousPatterns.some(pattern => pattern.test(value));
              }
              // Original strict validation for other file paths
              const dangerousPatterns = [/\.\.\//, /\/\.\./,  /\0/, /\x00/];
              return !dangerousPatterns.some(pattern => pattern.test(value));
            }, 
            message 
          }),
          minLength: (min: number, message?: string) => ({
            name: 'minLength',
            validator: (value: string) => typeof value === 'string' && value.length >= min,
            message: message || `Must be at least ${min} characters long`
          }),
          maxLength: (max: number, message?: string) => ({
            name: 'maxLength',
            validator: (value: string) => typeof value === 'string' && value.length <= max,
            message: message || `Must not exceed ${max} characters`
          }),
          pattern: (regex: RegExp, message?: string) => ({
            name: 'pattern',
            validator: (value: string) => typeof value === 'string' && regex.test(value),
            message: message || 'Does not match required pattern'
          }),
          url: (message = 'Invalid URL') => ({
            name: 'url',
            validator: (value: string) => {
              try {
                new URL(value);
                return true;
              } catch {
                return false;
              }
            },
            message
          }),
          safeText: (message = 'Contains unsafe content') => ({ 
            name: 'safeText', 
            validator: (value: string) => {
              if (typeof value !== 'string') return false;
              // Basic safety check - block obvious injection patterns
              const unsafePatterns = [/<script/, /javascript:/, /eval\(/, /\${/, /`.*\$\{/];
              return !unsafePatterns.some(pattern => pattern.test(value));
            }, 
            message 
          })
        };
      }
    }
    return this._rules;
  }

  /**
   * Validate compiler configuration
   */
  static validateCompilerConfig(config: any, options: ConfigValidationOptions = {}): ValidationResult {
    const opts = {
      strict: true,
      allowUnknownFields: false,
      sanitizeInput: true,
      ...options
    };

    const schema: ValidationSchema = {
      targetLanguage: [
        ConfigValidator.rules.required('Target language is required'),
        ConfigValidator.rules.string('Target language must be a string'),
        ConfigValidator.rules.oneOf(['javascript', 'typescript', 'python', 'html'], 'Invalid target language')
      ],
      
      outputDir: [
        ConfigValidator.rules.required('Output directory is required'),
        ConfigValidator.rules.string('Output directory must be a string')
        // Note: Removed filePath validation for outputDir to allow absolute paths
      ],
      
      aiProvider: [
        ConfigValidator.rules.required('AI provider is required')
      ],
      
      domain: [
        ConfigValidator.rules.string('Domain must be a string'),
        ConfigValidator.rules.maxLength(100, 'Domain name too long'),
        ConfigValidator.rules.safeText('Domain contains unsafe characters')
      ],
      
      verbose: [
        ConfigValidator.rules.boolean('Verbose must be a boolean')
      ],
      
      incremental: [
        ConfigValidator.rules.boolean('Incremental must be a boolean')
      ],
      
      watchMode: [
        ConfigValidator.rules.boolean('Watch mode must be a boolean')
      ]
    };

    const result = InputValidator.validateConfig(config, schema);

    // Additional validation for AI provider
    if (config.aiProvider && typeof config.aiProvider === 'object') {
      const aiProviderResult = ConfigValidator.validateAIProviderConfig(config.aiProvider);
      if (!aiProviderResult.valid) {
        result.errors.push(...aiProviderResult.errors.map(err => ({
          ...err,
          field: `aiProvider.${err.field}`
        })));
      }
    }

    // Check for unknown fields if not allowed
    if (!opts.allowUnknownFields) {
      const knownFields = Object.keys(schema);
      const unknownFields = Object.keys(config).filter(field => !knownFields.includes(field));
      
      if (unknownFields.length > 0) {
        result.errors.push(...unknownFields.map(field => ({
          field,
          message: `Unknown configuration field: ${field}`,
          value: config[field],
          rule: 'unknownField'
        })));
      }
    }

    if (result.errors.length > 0) {
      globalLogger.warn('Compiler configuration validation failed', {
        type: 'validation',
        errors: result.errors,
        config: ConfigValidator.sanitizeConfigForLogging(config)
      });
    }

    return result;
  }

  /**
   * Validate AI provider configuration
   */
  static validateAIProviderConfig(config: any): ValidationResult {
    const schema: ValidationSchema = {
      apiKey: [
        ConfigValidator.rules.string('API key must be a string'),
        ConfigValidator.rules.minLength(10, 'API key too short'),
        ConfigValidator.rules.maxLength(200, 'API key too long')
      ],
      
      model: [
        ConfigValidator.rules.string('Model must be a string'),
        ConfigValidator.rules.maxLength(100, 'Model name too long'),
        ConfigValidator.rules.pattern(/^[a-zA-Z0-9\-_.]+$/, 'Invalid model name format')
      ],
      
      maxRetries: [
        ConfigValidator.rules.number('Max retries must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= 0 && value <= 10,
          message: 'Max retries must be between 0 and 10'
        }
      ],
      
      timeout: [
        ConfigValidator.rules.number('Timeout must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= 1000 && value <= 300000,
          message: 'Timeout must be between 1000ms and 300000ms (5 minutes)'
        }
      ],
      
      endpoint: [
        ConfigValidator.rules.string('Endpoint must be a string'),
        ConfigValidator.rules.url('Invalid endpoint URL')
      ],
      
      apiFormat: [
        ConfigValidator.rules.string('API format must be a string'),
        ConfigValidator.rules.oneOf(['ollama', 'openai', 'llamacpp'], 'Invalid API format')
      ]
    };

    return InputValidator.validateConfig(config, schema);
  }

  /**
   * Validate AI context object
   */
  static validateAIContext(context: any): ValidationResult {
    const schema: ValidationSchema = {
      targetLanguage: [
        ConfigValidator.rules.required('Target language is required'),
        ConfigValidator.rules.string('Target language must be a string'),
        ConfigValidator.rules.oneOf(['javascript', 'typescript', 'python', 'html'], 'Invalid target language')
      ],
      
      projectName: [
        ConfigValidator.rules.required('Project name is required'),
        ConfigValidator.rules.string('Project name must be a string'),
        ConfigValidator.rules.minLength(1, 'Project name cannot be empty'),
        ConfigValidator.rules.maxLength(100, 'Project name too long'),
        ConfigValidator.rules.pattern(/^[a-zA-Z0-9\-_. ]+$/, 'Project name contains invalid characters')
      ],
      
      fileName: [
        ConfigValidator.rules.string('File name must be a string'),
        ConfigValidator.rules.maxLength(255, 'File name too long'),
        ConfigValidator.rules.pattern(/^[a-zA-Z0-9\-_. ]+$/, 'File name contains invalid characters')
      ],
      
      filePath: [
        ConfigValidator.rules.string('File path must be a string'),
        ConfigValidator.rules.filePath('Invalid file path')
      ],
      
      domain: [
        ConfigValidator.rules.string('Domain must be a string'),
        ConfigValidator.rules.maxLength(100, 'Domain too long'),
        ConfigValidator.rules.safeText('Domain contains unsafe characters')
      ],
      
      requirements: [
        {
          name: 'array',
          validator: (value: any) => Array.isArray(value),
          message: 'Requirements must be an array'
        },
        {
          name: 'arrayElements',
          validator: (value: string[]) => value.every(req => typeof req === 'string' && req.length <= 500),
          message: 'Each requirement must be a string no longer than 500 characters'
        }
      ]
    };

    const result = InputValidator.validateConfig(context, schema);

    // Additional validation for requirements array
    if (context.requirements && Array.isArray(context.requirements)) {
      for (let i = 0; i < context.requirements.length; i++) {
        const req = context.requirements[i];
        // Check for basic safety using existing validation
        const reqValidation = InputValidator.validateAIPrompt(req, {
          blockDangerousPatterns: true,
          allowSystemPrompts: false
        });
        if (!reqValidation.valid) {
          result.errors.push({
            field: `requirements[${i}]`,
            message: `Unsafe content in requirement: ${reqValidation.errors.map(e => e.message).join(', ')}`,
            value: req,
            rule: 'safety'
          });
        }
      }
    }

    return result;
  }

  /**
   * Validate generation options
   */
  static validateGenerationOptions(options: any): ValidationResult {
    const schema: ValidationSchema = {
      temperature: [
        ConfigValidator.rules.number('Temperature must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= 0 && value <= 2,
          message: 'Temperature must be between 0 and 2'
        }
      ],
      
      maxTokens: [
        ConfigValidator.rules.number('Max tokens must be a number'),
        {
          name: 'range',
          validator: (value: number) => value > 0 && value <= 100000,
          message: 'Max tokens must be between 1 and 100000'
        }
      ],
      
      topP: [
        ConfigValidator.rules.number('Top P must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= 0 && value <= 1,
          message: 'Top P must be between 0 and 1'
        }
      ],
      
      frequencyPenalty: [
        ConfigValidator.rules.number('Frequency penalty must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= -2 && value <= 2,
          message: 'Frequency penalty must be between -2 and 2'
        }
      ],
      
      presencePenalty: [
        ConfigValidator.rules.number('Presence penalty must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= -2 && value <= 2,
          message: 'Presence penalty must be between -2 and 2'
        }
      ]
    };

    return InputValidator.validateConfig(options, schema);
  }

  /**
   * Validate CLI configuration
   */
  static validateCLIConfig(config: any): ValidationResult {
    const schema: ValidationSchema = {
      command: [
        ConfigValidator.rules.required('Command is required'),
        ConfigValidator.rules.string('Command must be a string'),
        ConfigValidator.rules.oneOf(['compile', 'genesis', 'import', 'let'], 'Invalid command')
      ],
      
      input: [
        ConfigValidator.rules.string('Input must be a string'),
        ConfigValidator.rules.filePath('Invalid input file path')
      ],
      
      output: [
        ConfigValidator.rules.string('Output must be a string'),
        ConfigValidator.rules.filePath('Invalid output directory path')
      ],
      
      target: [
        ConfigValidator.rules.string('Target must be a string'),
        ConfigValidator.rules.oneOf(['javascript', 'typescript', 'python', 'html'], 'Invalid target language')
      ],
      
      verbose: [
        ConfigValidator.rules.boolean('Verbose must be a boolean')
      ],
      
      watch: [
        ConfigValidator.rules.boolean('Watch must be a boolean')
      ],
      
      full: [
        ConfigValidator.rules.boolean('Full must be a boolean')
      ],
      
      clearCache: [
        ConfigValidator.rules.boolean('Clear cache must be a boolean')
      ]
    };

    return InputValidator.validateConfig(config, schema);
  }

  /**
   * Validate and sanitize configuration with error handling
   */
  static validateAndSanitize<T>(
    config: any, 
    validator: (config: any) => ValidationResult,
    errorContext: string
  ): T {
    const result = validator(config);

    if (!result.valid) {
      const errorMessages = result.errors.map(err => `${err.field}: ${err.message}`);
      
      globalLogger.error(`Configuration validation failed: ${errorContext}`, undefined, {
        errors: result.errors,
        config: ConfigValidator.sanitizeConfigForLogging(config)
      });

      throw new SunScriptError(ErrorCode.INVALID_CONFIG, `Invalid configuration: ${errorMessages.join(', ')}`, {
        context: { validationErrors: result.errors },
        suggestions: [
          'Check the configuration format and values',
          'Refer to the documentation for valid configuration options'
        ]
      });
    }

    return result.sanitized as T;
  }

  /**
   * Create a safe version of config for logging (removes sensitive data)
   */
  private static sanitizeConfigForLogging(config: any, visited: Set<any> = new Set()): any {
    if (!config || typeof config !== 'object') {
      return config;
    }

    // Prevent infinite recursion with circular references
    if (visited.has(config)) {
      return '[Circular Reference]';
    }
    visited.add(config);

    const sanitized = { ...config };
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['apiKey', 'password', 'token', 'secret', 'key'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (value && typeof value === 'object') {
        sanitized[key] = ConfigValidator.sanitizeConfigForLogging(value, visited);
      }
    }

    visited.delete(config);
    return sanitized;
  }

  /**
   * Validate environment variables
   */
  static validateEnvironmentVariables(): ValidationResult {
    const env = process.env;
    const errors: any[] = [];

    // Check for required environment variables
    const requiredVars = ['NODE_ENV'];
    const optionalVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'SUNSCRIPT_LOG_LEVEL'];

    for (const varName of requiredVars) {
      if (!env[varName]) {
        errors.push({
          field: varName,
          message: `Required environment variable ${varName} is not set`,
          rule: 'required'
        });
      }
    }

    // Validate optional environment variables if they exist
    if (env.OPENAI_API_KEY && (!env.OPENAI_API_KEY.startsWith('sk-') || env.OPENAI_API_KEY.length < 20)) {
      errors.push({
        field: 'OPENAI_API_KEY',
        message: 'Invalid OpenAI API key format',
        rule: 'format'
      });
    }

    if (env.ANTHROPIC_API_KEY && (!env.ANTHROPIC_API_KEY.startsWith('sk-ant-') || env.ANTHROPIC_API_KEY.length < 20)) {
      errors.push({
        field: 'ANTHROPIC_API_KEY',
        message: 'Invalid Anthropic API key format',
        rule: 'format'
      });
    }

    if (env.SUNSCRIPT_LOG_LEVEL && !['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(env.SUNSCRIPT_LOG_LEVEL)) {
      errors.push({
        field: 'SUNSCRIPT_LOG_LEVEL',
        message: 'Invalid log level, must be DEBUG, INFO, WARN, ERROR, or FATAL',
        rule: 'oneOf'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create validation middleware for express-like frameworks
   */
  static createValidationMiddleware(validator: (data: any) => ValidationResult) {
    return (req: any, res: any, next: any) => {
      try {
        const result = validator(req.body);
        
        if (!result.valid) {
          return res.status(400).json({
            error: 'Validation failed',
            details: result.errors
          });
        }

        // Replace request body with sanitized data
        if (result.sanitized) {
          req.body = result.sanitized;
        }

        next();
      } catch (error) {
        res.status(500).json({
          error: 'Validation error',
          message: (error as Error).message
        });
      }
    };
  }
}