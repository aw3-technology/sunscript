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
        // Return a simple fallback rules object
        this._rules = {
          required: (message = 'Required') => ({ name: 'required', validator: () => true, message }),
          string: (message = 'String') => ({ name: 'string', validator: () => true, message }),
          oneOf: (values: any[], message = 'OneOf') => ({ name: 'oneOf', validator: () => true, message }),
          filePath: (message = 'FilePath') => ({ name: 'filePath', validator: () => true, message })
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
        this.rules.required('Target language is required'),
        this.rules.string('Target language must be a string'),
        this.rules.oneOf(['javascript', 'typescript', 'python', 'html'], 'Invalid target language')
      ],
      
      outputDir: [
        this.rules.required('Output directory is required'),
        this.rules.string('Output directory must be a string'),
        this.rules.filePath('Invalid output directory path')
      ],
      
      aiProvider: [
        this.rules.required('AI provider is required')
      ],
      
      domain: [
        this.rules.string('Domain must be a string'),
        this.rules.maxLength(100, 'Domain name too long'),
        this.rules.safeText('Domain contains unsafe characters')
      ],
      
      verbose: [
        this.rules.boolean('Verbose must be a boolean')
      ],
      
      incremental: [
        this.rules.boolean('Incremental must be a boolean')
      ],
      
      watchMode: [
        this.rules.boolean('Watch mode must be a boolean')
      ]
    };

    const result = InputValidator.validateConfig(config, schema);

    // Additional validation for AI provider
    if (config.aiProvider && typeof config.aiProvider === 'object') {
      const aiProviderResult = this.validateAIProviderConfig(config.aiProvider);
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
        config: this.sanitizeConfigForLogging(config)
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
        this.rules.string('API key must be a string'),
        this.rules.minLength(10, 'API key too short'),
        this.rules.maxLength(200, 'API key too long')
      ],
      
      model: [
        this.rules.string('Model must be a string'),
        this.rules.maxLength(100, 'Model name too long'),
        this.rules.pattern(/^[a-zA-Z0-9\-_.]+$/, 'Invalid model name format')
      ],
      
      maxRetries: [
        this.rules.number('Max retries must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= 0 && value <= 10,
          message: 'Max retries must be between 0 and 10'
        }
      ],
      
      timeout: [
        this.rules.number('Timeout must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= 1000 && value <= 300000,
          message: 'Timeout must be between 1000ms and 300000ms (5 minutes)'
        }
      ],
      
      endpoint: [
        this.rules.string('Endpoint must be a string'),
        this.rules.url('Invalid endpoint URL')
      ],
      
      apiFormat: [
        this.rules.string('API format must be a string'),
        this.rules.oneOf(['ollama', 'openai', 'llamacpp'], 'Invalid API format')
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
        this.rules.required('Target language is required'),
        this.rules.string('Target language must be a string'),
        this.rules.oneOf(['javascript', 'typescript', 'python', 'html'], 'Invalid target language')
      ],
      
      projectName: [
        this.rules.required('Project name is required'),
        this.rules.string('Project name must be a string'),
        this.rules.minLength(1, 'Project name cannot be empty'),
        this.rules.maxLength(100, 'Project name too long'),
        this.rules.pattern(/^[a-zA-Z0-9\-_. ]+$/, 'Project name contains invalid characters')
      ],
      
      fileName: [
        this.rules.string('File name must be a string'),
        this.rules.maxLength(255, 'File name too long'),
        this.rules.pattern(/^[a-zA-Z0-9\-_. ]+$/, 'File name contains invalid characters')
      ],
      
      filePath: [
        this.rules.string('File path must be a string'),
        this.rules.filePath('Invalid file path')
      ],
      
      domain: [
        this.rules.string('Domain must be a string'),
        this.rules.maxLength(100, 'Domain too long'),
        this.rules.safeText('Domain contains unsafe characters')
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
        this.rules.number('Temperature must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= 0 && value <= 2,
          message: 'Temperature must be between 0 and 2'
        }
      ],
      
      maxTokens: [
        this.rules.number('Max tokens must be a number'),
        {
          name: 'range',
          validator: (value: number) => value > 0 && value <= 100000,
          message: 'Max tokens must be between 1 and 100000'
        }
      ],
      
      topP: [
        this.rules.number('Top P must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= 0 && value <= 1,
          message: 'Top P must be between 0 and 1'
        }
      ],
      
      frequencyPenalty: [
        this.rules.number('Frequency penalty must be a number'),
        {
          name: 'range',
          validator: (value: number) => value >= -2 && value <= 2,
          message: 'Frequency penalty must be between -2 and 2'
        }
      ],
      
      presencePenalty: [
        this.rules.number('Presence penalty must be a number'),
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
        this.rules.required('Command is required'),
        this.rules.string('Command must be a string'),
        this.rules.oneOf(['compile', 'genesis', 'import', 'let'], 'Invalid command')
      ],
      
      input: [
        this.rules.string('Input must be a string'),
        this.rules.filePath('Invalid input file path')
      ],
      
      output: [
        this.rules.string('Output must be a string'),
        this.rules.filePath('Invalid output directory path')
      ],
      
      target: [
        this.rules.string('Target must be a string'),
        this.rules.oneOf(['javascript', 'typescript', 'python', 'html'], 'Invalid target language')
      ],
      
      verbose: [
        this.rules.boolean('Verbose must be a boolean')
      ],
      
      watch: [
        this.rules.boolean('Watch must be a boolean')
      ],
      
      full: [
        this.rules.boolean('Full must be a boolean')
      ],
      
      clearCache: [
        this.rules.boolean('Clear cache must be a boolean')
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
        config: this.sanitizeConfigForLogging(config)
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
  private static sanitizeConfigForLogging(config: any): any {
    if (!config || typeof config !== 'object') {
      return config;
    }

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
        sanitized[key] = this.sanitizeConfigForLogging(value);
      }
    }

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