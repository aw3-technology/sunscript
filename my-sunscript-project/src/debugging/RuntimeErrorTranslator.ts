import { AIProvider } from '../ai/AIProvider';
import { InputValidator } from '../validation';
import { globalLogger } from '../errors/Logger';

export interface RuntimeErrorContext {
  errorMessage: string;
  stackTrace: string;
  fileName: string;
  line: number;
  column: number;
  sourceCode: string;
  targetLanguage: string;
  executionContext: any;
}

export interface TranslatedError {
  originalError: string;
  naturalLanguageMessage: string;
  category: 'logic' | 'syntax' | 'type' | 'runtime' | 'ai-interpretation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sunScriptSuggestions: string[];
  quickFixes: QuickFix[];
  educationalContent: string;
  similarExamples: string[];
}

export interface QuickFix {
  title: string;
  description: string;
  sunScriptChange: string;
  confidence: number;
  riskLevel: 'safe' | 'moderate' | 'risky';
  automated: boolean;
}

export class RuntimeErrorTranslator {
  private aiProvider: AIProvider;
  private commonErrorPatterns: Map<string, string>;

  constructor(aiProvider: AIProvider) {
    this.aiProvider = aiProvider;
    this.setupCommonPatterns();
  }

  /**
   * Translate a runtime error into natural language with context
   */
  async translateError(context: RuntimeErrorContext): Promise<TranslatedError> {
    // Validate the error context
    const validation = this.validateErrorContext(context);
    if (!validation.valid) {
      throw new Error(`Invalid error context: ${validation.errors.join(', ')}`);
    }

    // Check for common patterns first
    const commonTranslation = this.checkCommonPatterns(context.errorMessage);
    if (commonTranslation) {
      return this.enhanceCommonTranslation(commonTranslation, context);
    }

    // Use AI for complex error translation
    return await this.aiTranslateError(context);
  }

  /**
   * Get real-time debugging suggestions during execution
   */
  async getExecutionSuggestions(
    currentLine: string,
    variables: Record<string, any>,
    previousErrors: string[]
  ): Promise<string[]> {
    const prompt = `
    Provide real-time debugging suggestions for this SunScript execution:

    Current line being executed: "${currentLine}"
    
    Current variable states:
    ${Object.entries(variables).map(([name, value]) => 
      `${name}: ${JSON.stringify(value)} (${typeof value})`
    ).join('\n')}
    
    Previous errors in this session:
    ${previousErrors.join('\n')}
    
    Suggest 3-5 specific things the developer should check or consider.
    Focus on practical, actionable advice in natural language.
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'text',
        projectName: 'runtime-debugging',
        domain: 'debugging'
      }, {
        maxTokens: 300,
        temperature: 0.4
      });

      return this.parseSuggestions(response.code);
    } catch (error) {
      return this.getFallbackSuggestions(currentLine, variables);
    }
  }

  /**
   * Translate JavaScript/Python/etc errors to SunScript context
   */
  async translateTargetLanguageError(
    error: Error,
    sunScriptLine: string,
    targetCode: string,
    sourceMap: any
  ): Promise<TranslatedError> {
    const context: RuntimeErrorContext = {
      errorMessage: error.message,
      stackTrace: error.stack || '',
      fileName: 'generated',
      line: 1,
      column: 1,
      sourceCode: sunScriptLine,
      targetLanguage: 'javascript',
      executionContext: { sourceMap }
    };

    return await this.translateError(context);
  }

  /**
   * Generate educational content for common errors
   */
  async generateEducationalContent(errorCategory: string, errorMessage: string): Promise<string> {
    const prompt = `
    Create educational content to help a SunScript developer understand this type of error:
    
    Error Category: ${errorCategory}
    Error Message: ${errorMessage}
    
    Explain:
    1. What this error means in plain English
    2. Common causes in natural language programming
    3. How to prevent it in the future
    4. Best practices related to this error type
    
    Keep it beginner-friendly and focused on SunScript's natural language approach.
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'text',
        projectName: 'error-education',
        domain: 'education'
      }, {
        maxTokens: 500,
        temperature: 0.3
      });

      return response.code;
    } catch (error) {
      return this.getFallbackEducationalContent(errorCategory);
    }
  }

  /**
   * AI-powered error translation
   */
  private async aiTranslateError(context: RuntimeErrorContext): Promise<TranslatedError> {
    const prompt = `
    Translate this runtime error into natural language for a SunScript developer:

    Original Error: ${context.errorMessage}
    Stack Trace: ${context.stackTrace.split('\n').slice(0, 3).join('\n')}
    Source Code Context: "${context.sourceCode}"
    Target Language: ${context.targetLanguage}
    Location: Line ${context.line}, Column ${context.column}

    Provide a comprehensive translation in JSON format:
    {
      "naturalLanguageMessage": "Clear explanation of what went wrong",
      "category": "logic|syntax|type|runtime|ai-interpretation",
      "severity": "low|medium|high|critical",
      "sunScriptSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
      "quickFixes": [
        {
          "title": "Fix title",
          "description": "What this fix does",
          "sunScriptChange": "How to change the SunScript code",
          "confidence": 85,
          "riskLevel": "safe|moderate|risky",
          "automated": true
        }
      ],
      "educationalContent": "Brief explanation to help the developer learn",
      "similarExamples": ["example1", "example2"]
    }

    Focus on making the error understandable to someone thinking in natural language concepts.
    `;

    try {
      const response = await this.aiProvider.generateCode(prompt, {
        targetLanguage: 'json',
        projectName: 'error-translation',
        domain: 'debugging'
      }, {
        maxTokens: 800,
        temperature: 0.2
      });

      const translated = JSON.parse(response.code);

      return {
        originalError: context.errorMessage,
        naturalLanguageMessage: translated.naturalLanguageMessage,
        category: translated.category || 'runtime',
        severity: translated.severity || 'medium',
        sunScriptSuggestions: translated.sunScriptSuggestions || [],
        quickFixes: translated.quickFixes || [],
        educationalContent: translated.educationalContent || '',
        similarExamples: translated.similarExamples || []
      };

    } catch (error) {
      globalLogger.warn('AI error translation failed, using fallback', {
        type: 'error-translator',
        originalError: context.errorMessage,
        error: (error as Error).message
      });

      return this.getFallbackTranslation(context);
    }
  }

  /**
   * Setup common error patterns for quick translation
   */
  private setupCommonPatterns(): void {
    this.commonErrorPatterns = new Map([
      // JavaScript errors
      ['TypeError: Cannot read property', 'Something is undefined or null when you try to use it'],
      ['ReferenceError:', 'A variable or function name is not recognized'],
      ['SyntaxError:', 'The code structure is not valid'],
      ['TypeError: Cannot set property', 'Trying to modify something that cannot be changed'],
      ['TypeError: is not a function', 'Trying to call something that is not a function'],
      
      // Python errors
      ['NameError:', 'A variable or function name is not defined'],
      ['TypeError:', 'Wrong type of data was used'],
      ['AttributeError:', 'Trying to access something that does not exist'],
      ['IndexError:', 'Trying to access a position that does not exist in a list'],
      ['KeyError:', 'Trying to access a key that does not exist in a dictionary'],
      
      // General patterns
      ['undefined', 'A value is missing or not set'],
      ['null', 'A value is intentionally empty'],
      ['NaN', 'A number calculation resulted in an invalid number'],
      ['timeout', 'An operation took too long to complete'],
      ['permission', 'Not allowed to perform this action'],
      ['network', 'Problem connecting to external service'],
      ['file not found', 'Cannot locate the specified file'],
      ['invalid argument', 'Wrong type or value passed to a function']
    ]);
  }

  /**
   * Check for common error patterns
   */
  private checkCommonPatterns(errorMessage: string): string | null {
    for (const [pattern, translation] of this.commonErrorPatterns) {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return translation;
      }
    }
    return null;
  }

  /**
   * Enhance common translation with context
   */
  private enhanceCommonTranslation(
    commonTranslation: string, 
    context: RuntimeErrorContext
  ): TranslatedError {
    return {
      originalError: context.errorMessage,
      naturalLanguageMessage: `${commonTranslation}. This happened in: "${context.sourceCode}"`,
      category: this.categorizeError(context.errorMessage),
      severity: this.assessSeverity(context.errorMessage),
      sunScriptSuggestions: this.getCommonSuggestions(context.errorMessage),
      quickFixes: this.getCommonQuickFixes(context.errorMessage),
      educationalContent: `This is a common error that occurs when ${commonTranslation.toLowerCase()}.`,
      similarExamples: []
    };
  }

  /**
   * Validate error context
   */
  private validateErrorContext(context: RuntimeErrorContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context.errorMessage) {
      errors.push('Error message is required');
    }

    if (!context.sourceCode) {
      errors.push('Source code context is required');
    }

    if (context.line < 1) {
      errors.push('Line number must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse AI suggestions into array
   */
  private parseSuggestions(content: string): string[] {
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 5);
  }

  /**
   * Get fallback suggestions when AI fails
   */
  private getFallbackSuggestions(currentLine: string, variables: Record<string, any>): string[] {
    const suggestions = ['Check if all variables have expected values'];
    
    // Add specific suggestions based on variable states
    Object.entries(variables).forEach(([name, value]) => {
      if (value === undefined || value === null) {
        suggestions.push(`Variable "${name}" is ${value}, this might be causing issues`);
      }
      if (typeof value === 'string' && value.length === 0) {
        suggestions.push(`Variable "${name}" is empty, consider adding validation`);
      }
    });

    if (currentLine.toLowerCase().includes('if') || currentLine.toLowerCase().includes('when')) {
      suggestions.push('Review the conditions in your logic');
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Categorize error type
   */
  private categorizeError(errorMessage: string): TranslatedError['category'] {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('syntax') || msg.includes('parse')) return 'syntax';
    if (msg.includes('type') || msg.includes('undefined') || msg.includes('null')) return 'type';
    if (msg.includes('reference') || msg.includes('name')) return 'syntax';
    if (msg.includes('logic') || msg.includes('assertion')) return 'logic';
    
    return 'runtime';
  }

  /**
   * Assess error severity
   */
  private assessSeverity(errorMessage: string): TranslatedError['severity'] {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('fatal') || msg.includes('critical') || msg.includes('crash')) return 'critical';
    if (msg.includes('error') || msg.includes('exception')) return 'high';
    if (msg.includes('warning') || msg.includes('deprecated')) return 'medium';
    
    return 'medium';
  }

  /**
   * Get common suggestions for error types
   */
  private getCommonSuggestions(errorMessage: string): string[] {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('undefined') || msg.includes('null')) {
      return [
        'Check if the variable is properly initialized',
        'Add a condition to handle empty values',
        'Verify the data is available before using it'
      ];
    }
    
    if (msg.includes('function')) {
      return [
        'Make sure the function name is spelled correctly',
        'Check if the function is defined in the right scope',
        'Verify the function is available at this point'
      ];
    }
    
    return [
      'Review the logic in this section',
      'Check for typos in variable names',
      'Verify all required data is available'
    ];
  }

  /**
   * Get common quick fixes
   */
  private getCommonQuickFixes(errorMessage: string): QuickFix[] {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('undefined') || msg.includes('null')) {
      return [{
        title: 'Add null check',
        description: 'Add a condition to check if the value exists before using it',
        sunScriptChange: 'if the value exists then use it',
        confidence: 90,
        riskLevel: 'safe',
        automated: true
      }];
    }
    
    return [{
      title: 'Review the logic',
      description: 'Carefully examine the code logic in this section',
      sunScriptChange: 'review and clarify the intended behavior',
      confidence: 60,
      riskLevel: 'safe',
      automated: false
    }];
  }

  /**
   * Get fallback translation when AI fails
   */
  private getFallbackTranslation(context: RuntimeErrorContext): TranslatedError {
    return {
      originalError: context.errorMessage,
      naturalLanguageMessage: `An error occurred: ${context.errorMessage}`,
      category: 'runtime',
      severity: 'medium',
      sunScriptSuggestions: ['Review the code that was executing when this error occurred'],
      quickFixes: [],
      educationalContent: 'This error occurred during code execution. Review the related logic.',
      similarExamples: []
    };
  }

  /**
   * Get fallback educational content
   */
  private getFallbackEducationalContent(errorCategory: string): string {
    const content = {
      logic: 'Logic errors occur when the code does something different than intended. Review your conditions and flow.',
      syntax: 'Syntax errors happen when the code structure is incorrect. Check for missing punctuation or typos.',
      type: 'Type errors occur when data is used in an unexpected way. Verify your variable types.',
      runtime: 'Runtime errors happen during execution. They often involve missing data or unexpected conditions.',
      'ai-interpretation': 'This error may be related to how the AI interpreted your natural language code.'
    };

    return content[errorCategory as keyof typeof content] || 'This is a general error. Review the related code carefully.';
  }
}