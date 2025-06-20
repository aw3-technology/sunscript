import { AIProvider } from '../AIProvider';
import { AIContext, AIResponse, GenerationOptions } from '../../types';
import { AIProviderError, ErrorCode } from '../../errors/SunScriptError';
import { InputValidator, ConfigValidator } from '../../validation';

export class AnthropicProvider extends AIProvider {
  private anthropic: any;
  private maxRetries: number = 3;
  private timeout: number = 30000; // 30 seconds

  constructor(config: { apiKey?: string; model?: string; maxRetries?: number; timeout?: number } = {}) {
    super(config);
    
    // Validate AI provider configuration
    const validatedConfig = ConfigValidator.validateAndSanitize(
      config,
      ConfigValidator.validateAIProviderConfig,
      'Anthropic provider configuration'
    );
    
    const apiKey = (validatedConfig as any).apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(ErrorCode.AI_AUTHENTICATION_FAILED, 'Anthropic API key is required', {
        suggestions: [
          'Set ANTHROPIC_API_KEY environment variable',
          'Pass apiKey in config object'
        ]
      });
    }

    // Dynamic import to handle optional dependency
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      this.anthropic = new Anthropic({ 
        apiKey,
        timeout: config.timeout || this.timeout
      });
    } catch (error) {
      throw new AIProviderError(ErrorCode.AI_MODEL_NOT_FOUND, 'Anthropic SDK not installed', {
        cause: error as Error,
        suggestions: ['Run: npm install @anthropic-ai/sdk']
      });
    }
    
    this.config.model = (validatedConfig as any).model || 'claude-3-sonnet-20240229';
    this.maxRetries = (validatedConfig as any).maxRetries || 3;
    this.timeout = (validatedConfig as any).timeout || 30000;
  }

  async generateCode(
    prompt: string,
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse> {
    // Validate AI prompt
    const promptValidation = InputValidator.validateAIPrompt(prompt, {
      maxLength: 100000,
      allowCodeBlocks: true,
      allowSystemPrompts: false,
      blockDangerousPatterns: true
    });

    if (!promptValidation.valid) {
      const errorMessages = promptValidation.errors.map(err => err.message);
      throw new AIProviderError(ErrorCode.AI_API_ERROR, `Invalid prompt: ${errorMessages.join(', ')}`, {
        context: { validationErrors: promptValidation.errors }
      });
    }

    // Use sanitized prompt
    const sanitizedPrompt = promptValidation.sanitized?.prompt || prompt;

    // Validate AI context
    const contextValidation = ConfigValidator.validateAIContext(context);
    if (!contextValidation.valid) {
      const errorMessages = contextValidation.errors.map(err => err.message);
      throw new AIProviderError(ErrorCode.AI_API_ERROR, `Invalid AI context: ${errorMessages.join(', ')}`, {
        context: { validationErrors: contextValidation.errors }
      });
    }

    // Validate generation options if provided
    if (options) {
      const optionsValidation = ConfigValidator.validateGenerationOptions(options);
      if (!optionsValidation.valid) {
        const errorMessages = optionsValidation.errors.map(err => err.message);
        throw new AIProviderError(ErrorCode.AI_API_ERROR, `Invalid generation options: ${errorMessages.join(', ')}`, {
          context: { validationErrors: optionsValidation.errors }
        });
      }
      options = optionsValidation.sanitized as GenerationOptions;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new AIProviderError(ErrorCode.AI_TIMEOUT, 'Request timeout')), this.timeout);
        });

        // Create API call promise
        const apiCall = this.anthropic.messages.create({
          model: this.config.model,
          max_tokens: Math.min(options?.maxTokens || 4000, 4000), // Claude max is 4000
          temperature: Math.max(0, Math.min(1, options?.temperature || 0.7)), // Clamp to 0-1
          system: this.buildSystemPrompt(context),
          messages: [
            {
              role: 'user',
              content: this.sanitizePrompt(sanitizedPrompt)
            }
          ]
        });

        // Race between API call and timeout
        const response = await Promise.race([apiCall, timeoutPromise]) as any;
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Validate response structure
        if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
          throw new AIProviderError(ErrorCode.AI_API_ERROR, 'Invalid response structure from Anthropic API');
        }

        const content = response.content[0];
        if (!content || content.type !== 'text' || !content.text) {
          throw new AIProviderError(ErrorCode.AI_API_ERROR, 'Expected text content from Anthropic API');
        }

        const generatedCode = this.cleanGeneratedCode(content.text);

        return {
          code: generatedCode,
          model: this.config.model,
          usage: {
            promptTokens: response.usage?.input_tokens || 0,
            completionTokens: response.usage?.output_tokens || 0,
            totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
          },
          metadata: {
            responseTime,
            attempt,
            stopReason: response.stop_reason,
            stopSequence: response.stop_sequence
          }
        };

      } catch (error: any) {
        lastError = error;
        
        // Log attempt for debugging
        console.warn(`Anthropic API attempt ${attempt}/${this.maxRetries} failed:`, error.message);
        
        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        // Exponential backoff before retry
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s delay
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw new AIProviderError(ErrorCode.AI_API_ERROR, `Anthropic API failed after ${this.maxRetries} attempts`, {
      context: { lastError: lastError?.message || 'Unknown error', attempts: this.maxRetries },
      cause: lastError || undefined,
      suggestions: [
        'Check your API key and configuration',
        'Verify the Anthropic service is available',
        'Try using a different AI provider'
      ]
    });
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test with a simple prompt
      const testResponse = await this.generateCode(
        'Say "test" in one word',
        {
          targetLanguage: 'javascript',
          projectName: 'test',
          domain: 'test'
        },
        { maxTokens: 10, temperature: 0 }
      );
      
      return testResponse.code.length > 0;
    } catch (error) {
      console.error('Anthropic configuration validation failed:', error);
      return false;
    }
  }

  getModelInfo() {
    return {
      name: 'Anthropic Claude',
      version: this.config.model,
      capabilities: ['code-generation', 'natural-language', 'analysis', 'reasoning']
    };
  }

  private sanitizePrompt(prompt: string): string {
    // Remove potential prompt injection attempts
    return prompt
      .replace(/\b(system|assistant|human):/gi, '') // Remove role markers
      .replace(/```xml\s*<thinking>[\s\S]*?<\/thinking>\s*```/gi, '') // Remove thinking blocks
      .replace(/\x00-\x1F\x7F/g, '') // Remove control characters
      .trim();
  }

  private cleanGeneratedCode(code: string): string {
    // Remove common AI response artifacts
    return code
      .replace(/```[\w]*\n?/g, '') // Remove code block markers
      .replace(/^Here's.*?:\s*/i, '') // Remove "Here's the code:" prefixes
      .replace(/^I'll.*?:\s*/i, '') // Remove "I'll create..." prefixes
      .replace(/^Let me.*?:\s*/i, '') // Remove "Let me..." prefixes
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim();
  }

  private isNonRetryableError(error: any): boolean {
    // Don't retry on authentication, permission, or validation errors
    const nonRetryableStatuses = [401, 403, 400, 422];
    const nonRetryableMessages = [
      'api key',
      'authentication',
      'permission',
      'invalid',
      'malformed'
    ];

    if (error.status && nonRetryableStatuses.includes(error.status)) {
      return true;
    }

    if (error.message) {
      const message = error.message.toLowerCase();
      return nonRetryableMessages.some(keyword => message.includes(keyword));
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected buildSystemPrompt(context: AIContext): string {
    const basePrompt = super.buildSystemPrompt(context);
    
    return `${basePrompt}

IMPORTANT INSTRUCTIONS:
1. Generate ONLY the requested ${context.targetLanguage} code
2. Do NOT include explanations, comments about the code generation process, or markdown
3. Do NOT include "Here's the code:" or similar prefixes
4. Ensure the code is syntactically correct and follows best practices
5. Include only necessary comments within the code itself
6. Handle edge cases and include appropriate error checking

Generate clean, production-ready code that can be directly used.`;
  }
}
