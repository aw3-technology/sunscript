import { AIProvider } from '../AIProvider';
import { AIContext, AIResponse, GenerationOptions } from '../../types';
import { AIProviderError, ErrorCode } from '../../errors/SunScriptError';

export class OpenAIProvider extends AIProvider {
  private openai: any;
  private maxRetries: number = 3;
  private timeout: number = 30000; // 30 seconds

  constructor(config: { 
    apiKey?: string; 
    model?: string; 
    maxRetries?: number; 
    timeout?: number;
  } = {}) {
    super(config);
    
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(ErrorCode.AI_AUTHENTICATION_FAILED, 'OpenAI API key is required', {
        suggestions: [
          'Set OPENAI_API_KEY environment variable',
          'Pass apiKey in config object'
        ]
      });
    }

    // Dynamic import to handle optional dependency
    try {
      const OpenAI = require('openai');
      this.openai = new OpenAI({ 
        apiKey,
        timeout: config.timeout || this.timeout
      });
    } catch (error) {
      throw new AIProviderError(ErrorCode.AI_MODEL_NOT_FOUND, 'OpenAI package not installed', {
        cause: error as Error,
        suggestions: ['Run: npm install openai']
      });
    }
    
    this.config.model = config.model || 'gpt-4-turbo-preview';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000;
  }

  async generateCode(
    prompt: string,
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse> {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt: must be a non-empty string');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        
        const completion = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: this.buildSystemPrompt(context)
            },
            {
              role: 'user',
              content: this.sanitizePrompt(prompt)
            }
          ],
          temperature: Math.max(0, Math.min(2, options?.temperature || 0.7)), // Clamp to 0-2
          max_tokens: Math.min(options?.maxTokens || 2000, 4000), // OpenAI max varies by model
          top_p: options?.topP ? Math.max(0, Math.min(1, options.topP)) : undefined,
          frequency_penalty: options?.frequencyPenalty ? Math.max(-2, Math.min(2, options.frequencyPenalty)) : undefined,
          presence_penalty: options?.presencePenalty ? Math.max(-2, Math.min(2, options.presencePenalty)) : undefined
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Validate response structure
        if (!completion || !completion.choices || completion.choices.length === 0) {
          throw new Error('Invalid response structure from OpenAI API');
        }

        const choice = completion.choices[0];
        if (!choice.message || !choice.message.content) {
          throw new Error('No content in OpenAI API response');
        }

        const generatedCode = this.cleanGeneratedCode(choice.message.content);

        return {
          code: generatedCode,
          model: this.config.model,
          usage: {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0
          },
          metadata: {
            responseTime,
            attempt,
            finishReason: choice.finish_reason,
            systemFingerprint: completion.system_fingerprint
          }
        };

      } catch (error: any) {
        lastError = error;
        
        // Log attempt for debugging
        console.warn(`OpenAI API attempt ${attempt}/${this.maxRetries} failed:`, error.message);
        
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
    throw new Error(`OpenAI API failed after ${this.maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test with a simple prompt instead of listing models
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
      console.error('OpenAI configuration validation failed:', error);
      return false;
    }
  }

  getModelInfo() {
    return {
      name: 'OpenAI GPT',
      version: this.config.model,
      capabilities: ['code-generation', 'natural-language', 'analysis', 'reasoning']
    };
  }

  private sanitizePrompt(prompt: string): string {
    // Remove potential prompt injection attempts
    return prompt
      .replace(/\b(system|assistant|user):/gi, '') // Remove role markers
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
      'malformed',
      'model_not_found'
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
