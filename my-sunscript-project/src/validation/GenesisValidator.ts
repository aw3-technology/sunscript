import { InputValidator, ValidationRule, ValidationResult } from './InputValidator';
import { InputSanitizer } from '../security/InputSanitizer';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';
import { globalLogger } from '../errors/Logger';

export interface GenesisFileStructure {
  project?: string;
  version?: string;
  author?: string;
  source?: string;
  output?: string;
  context?: string;
  imports?: Record<string, any>;
  config?: Record<string, any>;
  entrypoints?: Record<string, any>;
  build?: Record<string, any>;
  dependencies?: Record<string, any>;
  questions?: string[];
}

export interface GenesisValidationOptions {
  strict?: boolean;
  allowCustomDirectives?: boolean;
  validatePaths?: boolean;
  requireMetadata?: boolean;
}

export class GenesisValidator {
  private static _rules: any;
  
  private static get rules() {
    if (!this._rules) {
      try {
        this._rules = InputValidator.createRules();
      } catch (error) {
        console.error('Error creating Genesis validation rules:', error);
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
          filePath: (message = 'Invalid file path') => ({ 
            name: 'filePath', 
            validator: (value: string) => {
              if (typeof value !== 'string') return false;
              const dangerousPatterns = [/\.\.\//, /\/\.\./, /\0/, /\x00/];
              return !dangerousPatterns.some(pattern => pattern.test(value));
            }, 
            message 
          }),
          safeText: (message = 'Contains unsafe content') => ({ 
            name: 'safeText', 
            validator: (value: string) => {
              if (typeof value !== 'string') return false;
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

  // Valid directive names in Genesis files
  private static readonly VALID_DIRECTIVES = new Set([
    'project', 'version', 'author', 'description', 'license',
    'source', 'output', 'context', 'domain',
    'imports', 'config', 'entrypoints', 'build', 'dependencies',
    'ai', 'questions'
  ]);

  // Dangerous patterns that should not appear in Genesis files
  private static readonly DANGEROUS_PATTERNS = [
    // Code execution
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /require\s*\(\s*['"`]child_process['"`]/gi,
    /import\s+.*\s+from\s+['"`]fs['"`]/gi,
    
    // File system access
    /\.\.\//g,
    /\/etc\/passwd/gi,
    /\.ssh\/id_rsa/gi,
    
    // Network access
    /http:\/\/localhost/gi,
    /http:\/\/127\.0\.0\.1/gi,
    /file:\/\//gi,
    
    // Script injection
    /<script[^>]*>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    
    // System commands
    /\$\(/g,
    /`[^`]*`/g,
    /exec\s*\(/gi
  ];

  /**
   * Validate Genesis file structure and content
   */
  static validateGenesisFile(content: string, options: GenesisValidationOptions = {}): ValidationResult {
    const opts = {
      strict: true,
      allowCustomDirectives: false,
      validatePaths: true,
      requireMetadata: true,
      ...options
    };

    const errors: any[] = [];
    let sanitized = content;

    // Basic content validation
    if (!content || typeof content !== 'string') {
      errors.push({
        field: 'content',
        message: 'Genesis file content must be a non-empty string',
        value: content,
        rule: 'required'
      });
      return { valid: false, errors };
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(content)) {
        errors.push({
          field: 'content',
          message: `Genesis file contains dangerous pattern: ${pattern.source}`,
          rule: 'dangerousPattern'
        });
        
        globalLogger.warn('Dangerous pattern detected in Genesis file', {
          type: 'security',
          pattern: pattern.source,
          contentLength: content.length
        });
        
        // Remove the dangerous pattern
        sanitized = sanitized.replace(pattern, '[REMOVED]');
      }
    }

    // Parse the Genesis file structure
    const parsed = this.parseGenesisFile(sanitized);
    
    // Validate parsed structure
    const structureResult = this.validateGenesisStructure(parsed, opts);
    if (!structureResult.valid) {
      errors.push(...structureResult.errors);
    }

    // Validate directives
    const directiveResult = this.validateDirectives(parsed, opts);
    if (!directiveResult.valid) {
      errors.push(...directiveResult.errors);
    }

    // Validate paths if requested
    if (opts.validatePaths) {
      const pathResult = this.validatePaths(parsed);
      if (!pathResult.valid) {
        errors.push(...pathResult.errors);
      }
    }

    // Check required metadata
    if (opts.requireMetadata) {
      const metadataResult = this.validateRequiredMetadata(parsed);
      if (!metadataResult.valid) {
        errors.push(...metadataResult.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { content: sanitized, parsed }
    };
  }

  /**
   * Validate individual Genesis directives
   */
  static validateDirectives(parsed: GenesisFileStructure, options: GenesisValidationOptions): ValidationResult {
    const errors: any[] = [];
    const sanitized: GenesisFileStructure = {};

    // Validate project directive
    if (parsed.project !== undefined) {
      const projectResult = this.validateProjectDirective(parsed.project);
      if (!projectResult.valid) {
        errors.push(...projectResult.errors);
      } else if (projectResult.sanitized) {
        sanitized.project = projectResult.sanitized.project;
      }
    }

    // Validate version directive
    if (parsed.version !== undefined) {
      const versionResult = this.validateVersionDirective(parsed.version);
      if (!versionResult.valid) {
        errors.push(...versionResult.errors);
      } else if (versionResult.sanitized) {
        sanitized.version = versionResult.sanitized.version;
      }
    }

    // Validate author directive
    if (parsed.author !== undefined) {
      const authorResult = this.validateAuthorDirective(parsed.author);
      if (!authorResult.valid) {
        errors.push(...authorResult.errors);
      } else if (authorResult.sanitized) {
        sanitized.author = authorResult.sanitized.author;
      }
    }

    // Validate source and output paths
    if (parsed.source !== undefined) {
      const sourceResult = this.validatePathDirective('source', parsed.source);
      if (!sourceResult.valid) {
        errors.push(...sourceResult.errors);
      } else if (sourceResult.sanitized) {
        sanitized.source = sourceResult.sanitized.source;
      }
    }

    if (parsed.output !== undefined) {
      const outputResult = this.validatePathDirective('output', parsed.output);
      if (!outputResult.valid) {
        errors.push(...outputResult.errors);
      } else if (outputResult.sanitized) {
        sanitized.output = outputResult.sanitized.output;
      }
    }

    // Validate context directive
    if (parsed.context !== undefined) {
      const contextResult = this.validateContextDirective(parsed.context);
      if (!contextResult.valid) {
        errors.push(...contextResult.errors);
      } else if (contextResult.sanitized) {
        sanitized.context = contextResult.sanitized.context;
      }
    }

    // Validate complex sections
    if (parsed.imports) {
      const importsResult = this.validateImportsSection(parsed.imports);
      if (!importsResult.valid) {
        errors.push(...importsResult.errors);
      } else if (importsResult.sanitized) {
        sanitized.imports = importsResult.sanitized.imports;
      }
    }

    if (parsed.config) {
      const configResult = this.validateConfigSection(parsed.config);
      if (!configResult.valid) {
        errors.push(...configResult.errors);
      } else if (configResult.sanitized) {
        sanitized.config = configResult.sanitized.config;
      }
    }

    if (parsed.build) {
      const buildResult = this.validateBuildSection(parsed.build);
      if (!buildResult.valid) {
        errors.push(...buildResult.errors);
      } else if (buildResult.sanitized) {
        sanitized.build = buildResult.sanitized.build;
      }
    }

    if (parsed.dependencies) {
      const depsResult = this.validateDependenciesSection(parsed.dependencies);
      if (!depsResult.valid) {
        errors.push(...depsResult.errors);
      } else if (depsResult.sanitized) {
        sanitized.dependencies = depsResult.sanitized.dependencies;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Parse Genesis file content into structured format
   */
  private static parseGenesisFile(content: string): GenesisFileStructure {
    const result: GenesisFileStructure = {};
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentSectionContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for directive
      const directiveMatch = trimmedLine.match(/^@(\w+)\s+(.*)/);
      if (directiveMatch) {
        const [, directive, value] = directiveMatch;
        
        // Close previous section if any
        if (currentSection && currentSectionContent.length > 0) {
          this.parseSection(result, currentSection, currentSectionContent);
          currentSectionContent = [];
        }
        
        currentSection = null;
        const cleanValue = value.replace(/^["']|["']$/g, ''); // Remove quotes
        (result as any)[directive] = cleanValue;
        continue;
      }

      // Check for section start
      const sectionMatch = trimmedLine.match(/^(\w+)\s*\{/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        currentSectionContent = [];
        continue;
      }

      // Check for section end
      if (trimmedLine === '}' && currentSection) {
        this.parseSection(result, currentSection, currentSectionContent);
        currentSection = null;
        currentSectionContent = [];
        continue;
      }

      // Add content to current section
      if (currentSection) {
        currentSectionContent.push(trimmedLine);
      } else {
        // Handle questions (lines starting with ??)
        if (trimmedLine.startsWith('??')) {
          if (!result.questions) {
            result.questions = [];
          }
          result.questions.push(trimmedLine.substring(2).trim());
        }
      }
    }

    // Handle final section
    if (currentSection && currentSectionContent.length > 0) {
      this.parseSection(result, currentSection, currentSectionContent);
    }

    return result;
  }

  /**
   * Parse a section into appropriate format
   */
  private static parseSection(result: GenesisFileStructure, sectionName: string, content: string[]): void {
    const sectionData: Record<string, any> = {};
    
    for (const line of content) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
        sectionData[key] = value;
      } else {
        // Handle array-like entries
        const cleanLine = line.replace(/^-\s*/, '').trim();
        if (cleanLine) {
          const key = `item_${Object.keys(sectionData).length}`;
          sectionData[key] = cleanLine;
        }
      }
    }

    (result as any)[sectionName] = sectionData;
  }

  /**
   * Validate Genesis file structure
   */
  private static validateGenesisStructure(parsed: GenesisFileStructure, options: GenesisValidationOptions): ValidationResult {
    const errors: any[] = [];

    // Check for unknown directives in strict mode
    if (options.strict && !options.allowCustomDirectives) {
      for (const directive of Object.keys(parsed)) {
        if (!this.VALID_DIRECTIVES.has(directive)) {
          errors.push({
            field: directive,
            message: `Unknown directive: @${directive}`,
            value: directive,
            rule: 'unknownDirective'
          });
        }
      }
    }

    // Validate that source and output are different
    if (parsed.source && parsed.output && parsed.source === parsed.output) {
      errors.push({
        field: 'paths',
        message: 'Source and output directories cannot be the same',
        value: { source: parsed.source, output: parsed.output },
        rule: 'pathConflict'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate project directive
   */
  private static validateProjectDirective(project: string): ValidationResult {
    const schema = {
      project: [
        GenesisValidator.rules.required('Project name is required'),
        GenesisValidator.rules.string('Project name must be a string'),
        GenesisValidator.rules.minLength(1, 'Project name cannot be empty'),
        GenesisValidator.rules.maxLength(100, 'Project name too long'),
        GenesisValidator.rules.pattern(/^[a-zA-Z0-9\-_. ]+$/, 'Project name contains invalid characters'),
        GenesisValidator.rules.safeText('Project name contains unsafe content')
      ]
    };

    return InputValidator.validateConfig({ project }, schema);
  }

  /**
   * Validate version directive
   */
  private static validateVersionDirective(version: string): ValidationResult {
    const schema = {
      version: [
        GenesisValidator.rules.required('Version is required'),
        GenesisValidator.rules.string('Version must be a string'),
        GenesisValidator.rules.pattern(/^\d+\.\d+\.\d+(-[\w.]+)?$/, 'Version must follow semantic versioning (e.g., 1.0.0)')
      ]
    };

    return InputValidator.validateConfig({ version }, schema);
  }

  /**
   * Validate author directive
   */
  private static validateAuthorDirective(author: string): ValidationResult {
    const schema = {
      author: [
        GenesisValidator.rules.string('Author must be a string'),
        GenesisValidator.rules.maxLength(200, 'Author name too long'),
        GenesisValidator.rules.safeText('Author contains unsafe content')
      ]
    };

    return InputValidator.validateConfig({ author }, schema);
  }

  /**
   * Validate path directive (source, output)
   */
  private static validatePathDirective(type: string, path: string): ValidationResult {
    const schema = {
      [type]: [
        GenesisValidator.rules.required(`${type} path is required`),
        GenesisValidator.rules.string(`${type} path must be a string`),
        GenesisValidator.rules.filePath(`Invalid ${type} path`),
        {
          name: 'relativePath',
          validator: (value: string) => !value.includes('..'),
          message: `${type} path cannot contain parent directory references`
        }
      ]
    };

    return InputValidator.validateConfig({ [type]: path }, schema);
  }

  /**
   * Validate context directive
   */
  private static validateContextDirective(context: string): ValidationResult {
    const schema = {
      context: [
        GenesisValidator.rules.string('Context must be a string'),
        GenesisValidator.rules.maxLength(500, 'Context too long'),
        GenesisValidator.rules.safeText('Context contains unsafe content')
      ]
    };

    return InputValidator.validateConfig({ context }, schema);
  }

  /**
   * Validate imports section
   */
  private static validateImportsSection(imports: Record<string, any>): ValidationResult {
    const errors: any[] = [];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(imports)) {
      if (typeof value === 'string') {
        // Validate import path
        try {
          const sanitizedPath = InputSanitizer.sanitizePath(value);
          sanitized[key] = sanitizedPath;
        } catch (error) {
          errors.push({
            field: `imports.${key}`,
            message: `Invalid import path: ${(error as Error).message}`,
            value,
            rule: 'invalidPath'
          });
        }
      } else {
        sanitized[key] = value;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { imports: sanitized }
    };
  }

  /**
   * Validate config section
   */
  private static validateConfigSection(config: Record<string, any>): ValidationResult {
    const errors: any[] = [];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = InputSanitizer.sanitizeText(value, {
          maxLength: 1000,
          allowUnicode: true,
          allowControlChars: false
        });
      } else {
        sanitized[key] = value;
      }
    }

    return {
      valid: true,
      errors,
      sanitized: { config: sanitized }
    };
  }

  /**
   * Validate build section
   */
  private static validateBuildSection(build: Record<string, any>): ValidationResult {
    const errors: any[] = [];
    const sanitized: Record<string, any> = {};

    // Validate targets
    if (build.targets) {
      if (Array.isArray(build.targets)) {
        const validTargets = ['javascript', 'typescript', 'python', 'html'];
        const invalidTargets = build.targets.filter((target: string) => !validTargets.includes(target));
        
        if (invalidTargets.length > 0) {
          errors.push({
            field: 'build.targets',
            message: `Invalid build targets: ${invalidTargets.join(', ')}`,
            value: invalidTargets,
            rule: 'invalidTargets'
          });
        } else {
          sanitized.targets = build.targets;
        }
      } else {
        errors.push({
          field: 'build.targets',
          message: 'Build targets must be an array',
          value: build.targets,
          rule: 'invalidType'
        });
      }
    }

    // Copy other build properties
    for (const [key, value] of Object.entries(build)) {
      if (key !== 'targets') {
        sanitized[key] = value;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { build: sanitized }
    };
  }

  /**
   * Validate dependencies section
   */
  private static validateDependenciesSection(dependencies: Record<string, any>): ValidationResult {
    const errors: any[] = [];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(dependencies)) {
      if (typeof value === 'object' && value !== null) {
        // Validate nested dependency objects
        const nestedSanitized: Record<string, any> = {};
        
        for (const [depName, depVersion] of Object.entries(value)) {
          if (typeof depVersion === 'string') {
            // Validate dependency name and version
            if (!/^[a-zA-Z0-9\-_.@/]+$/.test(depName)) {
              errors.push({
                field: `dependencies.${key}.${depName}`,
                message: 'Invalid dependency name format',
                value: depName,
                rule: 'invalidName'
              });
            } else {
              nestedSanitized[depName] = depVersion;
            }
          }
        }
        
        sanitized[key] = nestedSanitized;
      } else {
        sanitized[key] = value;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: { dependencies: sanitized }
    };
  }

  /**
   * Validate paths in Genesis file
   */
  private static validatePaths(parsed: GenesisFileStructure): ValidationResult {
    const errors: any[] = [];

    const pathFields = ['source', 'output'];
    
    for (const field of pathFields) {
      const value = parsed[field as keyof GenesisFileStructure];
      if (value && typeof value === 'string') {
        try {
          InputSanitizer.sanitizePath(value, {
            allowRelativePaths: true,
            allowParentTraversal: false,
            allowAbsolutePaths: true
          });
        } catch (error) {
          errors.push({
            field,
            message: `Invalid ${field} path: ${(error as Error).message}`,
            value,
            rule: 'invalidPath'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate required metadata
   */
  private static validateRequiredMetadata(parsed: GenesisFileStructure): ValidationResult {
    const errors: any[] = [];
    const requiredFields = ['project'];

    for (const field of requiredFields) {
      if (!parsed[field as keyof GenesisFileStructure]) {
        errors.push({
          field,
          message: `Required metadata field missing: @${field}`,
          rule: 'required'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}