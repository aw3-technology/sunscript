import { AIProvider } from '../AIProvider';
import { AIContext, AIResponse, GenerationOptions } from '../../types';
import { AIProviderError, ErrorCode, NetworkError } from '../../errors/SunScriptError';

export class LocalLLMProvider extends AIProvider {
  private maxRetries: number = 3;
  private timeout: number = 60000; // 60 seconds for local models

  constructor(config: { 
    model?: string; 
    endpoint?: string; 
    maxRetries?: number; 
    timeout?: number;
    apiFormat?: 'ollama' | 'openai' | 'llamacpp';
  } = {}) {
    super(config);
    this.config.model = config.model || 'codellama:13b-instruct';
    this.config.endpoint = config.endpoint || 'http://localhost:11434';
    this.config.apiFormat = config.apiFormat || 'ollama';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 60000;
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
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.timeout);
        });

        // Create API call promise based on format
        const apiCall = this.createAPICall(prompt, context, options);

        // Race between API call and timeout
        const response = await Promise.race([apiCall, timeoutPromise]);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const generatedCode = this.extractAndCleanCode(response);

        return {
          code: generatedCode,
          model: this.config.model,
          usage: {
            promptTokens: this.estimateTokens(prompt),
            completionTokens: this.estimateTokens(generatedCode),
            totalTokens: this.estimateTokens(prompt) + this.estimateTokens(generatedCode)
          },
          metadata: {
            responseTime,
            attempt,
            apiFormat: this.config.apiFormat,
            endpoint: this.config.endpoint
          }
        };

      } catch (error: any) {
        lastError = error;
        
        // Log attempt for debugging
        console.warn(`Local LLM API attempt ${attempt}/${this.maxRetries} failed:`, error.message);
        
        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        // Exponential backoff before retry
        if (attempt < this.maxRetries) {
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000); // Max 15s delay
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw new Error(`Local LLM API failed after ${this.maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  private async createAPICall(prompt: string, context: AIContext, options?: GenerationOptions): Promise<any> {
    const systemPrompt = this.buildSystemPrompt(context);
    const sanitizedPrompt = this.sanitizePrompt(prompt);
    
    switch (this.config.apiFormat) {
      case 'ollama':
        return this.callOllamaAPI(systemPrompt, sanitizedPrompt, options);
      case 'openai':
        return this.callOpenAICompatibleAPI(systemPrompt, sanitizedPrompt, options);
      case 'llamacpp':
        return this.callLlamaCppAPI(systemPrompt, sanitizedPrompt, options);
      default:
        throw new Error(`Unsupported API format: ${this.config.apiFormat}`);
    }
  }

  private async callOllamaAPI(systemPrompt: string, userPrompt: string, options?: GenerationOptions): Promise<any> {
    const response = await fetch(`${this.config.endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
          num_predict: options?.maxTokens || 2000,
          top_p: options?.topP || 0.9,
          repeat_penalty: 1.1
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  private async callOpenAICompatibleAPI(systemPrompt: string, userPrompt: string, options?: GenerationOptions): Promise<any> {
    const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy' // Some local APIs expect this
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
        top_p: options?.topP || 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callLlamaCppAPI(systemPrompt: string, userPrompt: string, options?: GenerationOptions): Promise<any> {
    const response = await fetch(`${this.config.endpoint}/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
        temperature: options?.temperature || 0.7,
        n_predict: options?.maxTokens || 2000,
        top_p: options?.topP || 0.9,
        repeat_penalty: 1.1,
        stop: ['User:', 'Human:', '\n\n']
      })
    });

    if (!response.ok) {
      throw new Error(`Llama.cpp API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content || '';
  }

  private extractAndCleanCode(response: any): string {
    let code = '';
    
    if (typeof response === 'string') {
      code = response;
    } else if (response.content) {
      code = response.content;
    } else if (response.response) {
      code = response.response;
    } else {
      throw new Error('Unable to extract code from API response');
    }

    return this.cleanGeneratedCode(code);
  }

  private cleanGeneratedCode(code: string): string {
    // Remove common AI response artifacts
    return code
      .replace(/```[\w]*\n?/g, '') // Remove code block markers
      .replace(/^Here's.*?:\s*/i, '') // Remove "Here's the code:" prefixes
      .replace(/^I'll.*?:\s*/i, '') // Remove "I'll create..." prefixes
      .replace(/^Let me.*?:\s*/i, '') // Remove "Let me..." prefixes
      .replace(/^Assistant:\s*/i, '') // Remove "Assistant:" prefix
      .replace(/^User:\s*.*?$/gm, '') // Remove "User:" lines
      .replace(/^Human:\s*.*?$/gm, '') // Remove "Human:" lines
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim();
  }

  private sanitizePrompt(prompt: string): string {
    // Remove potential prompt injection attempts
    return prompt
      .replace(/\b(system|assistant|human):/gi, '') // Remove role markers
      .replace(/\x00-\x1F\x7F/g, '') // Remove control characters
      .trim();
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private isNonRetryableError(error: any): boolean {
    const nonRetryableMessages = [
      'model not found',
      'invalid model',
      'connection refused',
      'network error',
      'endpoint unreachable'
    ];

    if (error.message) {
      const message = error.message.toLowerCase();
      return nonRetryableMessages.some(keyword => message.includes(keyword));
    }

    return false;
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // First, check if the endpoint is reachable
      const healthCheck = await this.checkEndpointHealth();
      if (!healthCheck) {
        return false;
      }

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
      console.error('Local LLM configuration validation failed:', error);
      return false;
    }
  }

  private async checkEndpointHealth(): Promise<boolean> {
    try {
      let healthEndpoint = '';
      
      switch (this.config.apiFormat) {
        case 'ollama':
          healthEndpoint = `${this.config.endpoint}/api/tags`;
          break;
        case 'openai':
          healthEndpoint = `${this.config.endpoint}/v1/models`;
          break;
        case 'llamacpp':
          healthEndpoint = `${this.config.endpoint}/health`;
          break;
        default:
          healthEndpoint = this.config.endpoint;
      }

      const response = await fetch(healthEndpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      return response.ok;
    } catch (error) {
      console.warn(`Health check failed for ${this.config.endpoint}:`, error);
      return false;
    }
  }

  getModelInfo() {
    return {
      name: `Local LLM (${this.config.apiFormat})`,
      version: this.config.model,
      capabilities: ['code-generation', 'natural-language']
    };
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
4. Do NOT include role markers like "Assistant:" or "User:"
5. Ensure the code is syntactically correct and follows best practices
6. Include only necessary comments within the code itself
7. Handle edge cases and include appropriate error checking

Generate clean, production-ready code that can be directly used.`;
  }
}
