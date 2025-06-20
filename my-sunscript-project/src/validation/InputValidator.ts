import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { InputSanitizer } from '../security/InputSanitizer';
import { globalLogger } from '../errors/Logger';

export interface ValidationRule<T = any> {
  name: string;
  validator: (value: T) => boolean | string;
  message?: string;
  sanitizer?: (value: T) => T;
}

export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationRule[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  rule?: string;
}

export interface AIPromptValidationOptions {
  maxLength?: number;
  allowCodeBlocks?: boolean;
  allowSystemPrompts?: boolean;
  blockDangerousPatterns?: boolean;
  requireMinLength?: number;
}

export interface SunScriptValidationOptions {
  maxFileSize?: number;
  allowedConstructs?: string[];
  blockedPatterns?: RegExp[];
  requireProjectStructure?: boolean;
}

export class InputValidator {
  private static readonly DANGEROUS_AI_PATTERNS = [
    // Prompt injection attempts
    /ignore\s+(previous|all)\s+(instructions?|prompts?)/gi,
    /forget\s+(everything|all)\s+(above|before)/gi,
    /system:\s*you\s+are\s+(now|a)/gi,
    /new\s+instructions?:/gi,
    /override\s+(instructions?|settings)/gi,
    
    // Role confusion
    /you\s+are\s+(not\s+)?an?\s+AI/gi,
    /pretend\s+(you\s+are|to\s+be)/gi,
    /act\s+as\s+(if\s+)?you/gi,
    /roleplay\s+as/gi,
    
    // Information extraction
    /what\s+(are\s+)?your\s+(instructions?|prompts?)/gi,
    /show\s+(me\s+)?your\s+(system|initial)\s+prompt/gi,
    /repeat\s+(your\s+)?(instructions?|prompts?)/gi,
    
    // Code execution attempts
    /execute\s+(this\s+)?code/gi,
    /run\s+(this\s+)?script/gi,
    /eval\s*\(/gi,
    /subprocess\./gi,
    /os\.(system|popen|exec)/gi,
    
    // File system access
    /read\s+(file|directory)/gi,
    /write\s+(to\s+)?file/gi,
    /access\s+(file|system)/gi,
    /\/etc\/passwd/gi,
    /\.ssh\/id_rsa/gi
  ];

  private static readonly SUNSCRIPT_DANGEROUS_PATTERNS = [
    // Direct JavaScript injection
    /<script[^>]*>/gi,
    /javascript:/gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    
    // System access patterns
    /process\.env/gi,
    /require\s*\(\s*['"`]fs['"`]/gi,
    /require\s*\(\s*['"`]child_process['"`]/gi,
    /import\s+.*\s+from\s+['"`]fs['"`]/gi,
    
    // Network access
    /fetch\s*\(/gi,
    /XMLHttpRequest/gi,
    /http\.request/gi,
    /net\.connect/gi,
    
    // File operations
    /fs\.(readFile|writeFile|unlink|rm)/gi,
    /path\.resolve\s*\(\s*['"`]\.\./gi,
    
    // Process control
    /process\.(exit|kill|abort)/gi,
    /setInterval\s*\(/gi,
    /setTimeout\s*\(/gi
  ];

  /**
   * Validate and sanitize AI prompts to prevent injection attacks
   */
  static validateAIPrompt(prompt: string, options: AIPromptValidationOptions = {}): ValidationResult {
    const opts = {
      maxLength: 10000,
      allowCodeBlocks: true,
      allowSystemPrompts: false,
      blockDangerousPatterns: true,
      requireMinLength: 10,
      ...options
    };

    const errors: ValidationError[] = [];
    let sanitized = prompt;

    // Basic validation
    if (!prompt || typeof prompt !== 'string') {
      errors.push({
        field: 'prompt',
        message: 'Prompt must be a non-empty string',
        value: prompt
      });
      return { valid: false, errors };
    }

    // Length validation
    if (prompt.length < opts.requireMinLength) {
      errors.push({
        field: 'prompt',
        message: `Prompt must be at least ${opts.requireMinLength} characters long`,
        value: prompt.length,
        rule: 'minLength'
      });
    }

    if (prompt.length > opts.maxLength) {
      errors.push({
        field: 'prompt',
        message: `Prompt exceeds maximum length of ${opts.maxLength} characters`,
        value: prompt.length,
        rule: 'maxLength'
      });
      // Truncate if too long
      sanitized = prompt.substring(0, opts.maxLength);
    }

    // Check for dangerous patterns
    if (opts.blockDangerousPatterns) {
      for (const pattern of this.DANGEROUS_AI_PATTERNS) {
        if (pattern.test(prompt)) {
          errors.push({
            field: 'prompt',
            message: `Prompt contains potentially dangerous pattern: ${pattern.source}`,
            rule: 'dangerousPattern'
          });
          
          globalLogger.warn('Dangerous AI prompt pattern detected', {
            type: 'security',
            pattern: pattern.source,
            promptLength: prompt.length
          });
          
          // Remove the dangerous pattern
          sanitized = sanitized.replace(pattern, '[REMOVED]');
        }
      }
    }

    // System prompt validation
    if (!opts.allowSystemPrompts && /system\s*:/gi.test(prompt)) {
      errors.push({
        field: 'prompt',
        message: 'System prompts are not allowed',
        rule: 'systemPrompt'
      });
      sanitized = sanitized.replace(/system\s*:[^\n]*/gi, '');
    }

    // Code block validation
    if (!opts.allowCodeBlocks) {
      const codeBlockPattern = /```[\s\S]*?```/g;
      if (codeBlockPattern.test(prompt)) {
        errors.push({
          field: 'prompt',
          message: 'Code blocks are not allowed in prompts',
          rule: 'codeBlock'
        });
        sanitized = sanitized.replace(codeBlockPattern, '[CODE BLOCK REMOVED]');
      }
    }

    // Additional sanitization
    sanitized = InputSanitizer.sanitizeText(sanitized, {
      maxLength: opts.maxLength,
      allowUnicode: true,
      allowControlChars: false,
      normalizeNewlines: true,
      trimWhitespace: true
    });

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { prompt: sanitized }
    };
  }

  /**
   * Validate SunScript source code for security and correctness
   */
  static validateSunScriptSource(source: string, options: SunScriptValidationOptions = {}): ValidationResult {
    const opts = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedConstructs: [],
      blockedPatterns: [],
      requireProjectStructure: false,
      ...options
    };

    const errors: ValidationError[] = [];
    let sanitized = source;

    // Basic validation
    if (!source || typeof source !== 'string') {
      errors.push({
        field: 'source',
        message: 'Source code must be a non-empty string',
        value: source
      });
      return { valid: false, errors };
    }

    // Size validation
    if (source.length > opts.maxFileSize) {
      errors.push({
        field: 'source',
        message: `Source code exceeds maximum size of ${opts.maxFileSize} bytes`,
        value: source.length,
        rule: 'maxSize'
      });
      return { valid: false, errors };
    }

    // Check for dangerous patterns
    for (const pattern of this.SUNSCRIPT_DANGEROUS_PATTERNS) {
      if (pattern.test(source)) {
        errors.push({
          field: 'source',
          message: `Source contains potentially dangerous pattern: ${pattern.source}`,
          rule: 'dangerousPattern'
        });
        
        globalLogger.warn('Dangerous SunScript pattern detected', {
          type: 'security',
          pattern: pattern.source,
          sourceLength: source.length
        });
      }
    }

    // Check custom blocked patterns
    for (const pattern of opts.blockedPatterns) {
      if (pattern.test(source)) {
        errors.push({
          field: 'source',
          message: `Source contains blocked pattern: ${pattern.source}`,
          rule: 'blockedPattern'
        });
      }
    }

    // Validate allowed constructs
    if (opts.allowedConstructs.length > 0) {
      // This would require parsing the SunScript to check constructs
      // For now, we'll do basic keyword checking
      const foundConstructs = this.extractSunScriptConstructs(source);
      const disallowedConstructs = foundConstructs.filter(
        construct => !opts.allowedConstructs.includes(construct)
      );
      
      if (disallowedConstructs.length > 0) {
        errors.push({
          field: 'source',
          message: `Source contains disallowed constructs: ${disallowedConstructs.join(', ')}`,
          value: disallowedConstructs,
          rule: 'allowedConstructs'
        });
      }
    }

    // Project structure validation
    if (opts.requireProjectStructure) {
      if (!this.hasValidProjectStructure(source)) {
        errors.push({
          field: 'source',
          message: 'Source does not follow required project structure',
          rule: 'projectStructure'
        });
      }
    }

    // Sanitize the source
    sanitized = InputSanitizer.sanitizeText(source, {
      maxLength: opts.maxFileSize,
      allowUnicode: true,
      allowControlChars: true, // Source code may need control characters
      normalizeNewlines: true,
      trimWhitespace: false // Preserve whitespace in source code
    });

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { source: sanitized }
    };
  }

  /**
   * Validate configuration objects against a schema
   */
  static validateConfig<T extends Record<string, any>>(
    config: T, 
    schema: ValidationSchema
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: Record<string, any> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = config[field];
      const fieldRules = Array.isArray(rules) ? rules : [rules];

      for (const rule of fieldRules) {
        try {
          const result = rule.validator(value);
          
          if (result === false) {
            errors.push({
              field,
              message: rule.message || `Validation failed for field ${field}`,
              value,
              rule: rule.name
            });
          } else if (typeof result === 'string') {
            errors.push({
              field,
              message: result,
              value,
              rule: rule.name
            });
          } else {
            // Validation passed, apply sanitizer if available
            sanitized[field] = rule.sanitizer ? rule.sanitizer(value) : value;
          }
        } catch (error) {
          errors.push({
            field,
            message: `Validation error: ${(error as Error).message}`,
            value,
            rule: rule.name
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
   * Create validation rules for common scenarios
   */
  static createRules() {
    return {
      required: (message = 'Field is required'): ValidationRule => ({
        name: 'required',
        validator: (value: any) => value !== undefined && value !== null && value !== '',
        message
      }),

      string: (message = 'Field must be a string'): ValidationRule => ({
        name: 'string',
        validator: (value: any) => typeof value === 'string',
        message,
        sanitizer: (value: any) => String(value)
      }),

      number: (message = 'Field must be a number'): ValidationRule => ({
        name: 'number',
        validator: (value: any) => typeof value === 'number' && !isNaN(value),
        message,
        sanitizer: (value: any) => Number(value)
      }),

      boolean: (message = 'Field must be a boolean'): ValidationRule => ({
        name: 'boolean',
        validator: (value: any) => typeof value === 'boolean',
        message,
        sanitizer: (value: any) => Boolean(value)
      }),

      minLength: (min: number, message?: string): ValidationRule => ({
        name: 'minLength',
        validator: (value: string) => typeof value === 'string' && value.length >= min,
        message: message || `Field must be at least ${min} characters long`
      }),

      maxLength: (max: number, message?: string): ValidationRule => ({
        name: 'maxLength',
        validator: (value: string) => typeof value === 'string' && value.length <= max,
        message: message || `Field must not exceed ${max} characters`,
        sanitizer: (value: string) => value.substring(0, max)
      }),

      pattern: (regex: RegExp, message?: string): ValidationRule => ({
        name: 'pattern',
        validator: (value: string) => typeof value === 'string' && regex.test(value),
        message: message || `Field does not match required pattern`
      }),

      email: (message = 'Field must be a valid email address'): ValidationRule => ({
        name: 'email',
        validator: (value: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return typeof value === 'string' && emailRegex.test(value);
        },
        message
      }),

      url: (message = 'Field must be a valid URL'): ValidationRule => ({
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

      oneOf: (allowedValues: any[], message?: string): ValidationRule => ({
        name: 'oneOf',
        validator: (value: any) => allowedValues.includes(value),
        message: message || `Field must be one of: ${allowedValues.join(', ')}`
      }),

      filePath: (message = 'Field must be a valid file path'): ValidationRule => ({
        name: 'filePath',
        validator: (value: string) => {
          try {
            InputSanitizer.sanitizePath(value);
            return true;
          } catch {
            return false;
          }
        },
        message,
        sanitizer: (value: string) => InputSanitizer.sanitizePath(value)
      }),

      safeText: (message = 'Field contains unsafe content'): ValidationRule => ({
        name: 'safeText',
        validator: (value: string) => {
          const safety = InputSanitizer.validateSafety(value);
          return safety.safe;
        },
        message,
        sanitizer: (value: string) => InputSanitizer.sanitizeText(value)
      })
    };
  }

  private static extractSunScriptConstructs(source: string): string[] {
    const constructs: string[] = [];
    
    // Basic SunScript construct patterns
    const patterns = [
      /\bfunction\s+(\w+)/g,
      /\bclass\s+(\w+)/g,
      /\bimport\s+/g,
      /\bexport\s+/g,
      /\bif\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\btry\s*\{/g,
      /\bcatch\s*\(/g
    ];

    for (const pattern of patterns) {
      const matches = source.match(pattern);
      if (matches) {
        constructs.push(...matches);
      }
    }

    return [...new Set(constructs)]; // Remove duplicates
  }

  private static hasValidProjectStructure(source: string): boolean {
    // Basic checks for valid SunScript project structure
    const hasProjectDeclaration = /@project\s+/.test(source);
    const hasMainFunction = /function\s+main\s*\(/.test(source);
    const hasExports = /export\s+/.test(source);
    
    return hasProjectDeclaration || hasMainFunction || hasExports;
  }

  /**
   * Validate a batch of inputs
   */
  static validateBatch(inputs: Array<{
    value: any;
    rules: ValidationRule[];
    field: string;
  }>): ValidationResult {
    const allErrors: ValidationError[] = [];
    const sanitized: Record<string, any> = {};

    for (const input of inputs) {
      const result = this.validateConfig(
        { [input.field]: input.value },
        { [input.field]: input.rules }
      );
      
      allErrors.push(...result.errors);
      if (result.sanitized) {
        Object.assign(sanitized, result.sanitized);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      sanitized
    };
  }
}