import { AIProvider } from '../AIProvider';
import { AIContext, AIResponse, GenerationOptions } from '../../types';

export class OpenAIProvider extends AIProvider {
  private openai: any;

  constructor(config: { apiKey?: string; model?: string } = {}) {
    super(config);
    
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Dynamic import to handle optional dependency
    try {
      const OpenAI = require('openai');
      this.openai = new OpenAI({ apiKey });
    } catch (error) {
      throw new Error('OpenAI package not installed. Run: npm install openai');
    }
    
    this.config.model = config.model || 'gpt-4-turbo-preview';
  }

  async generateCode(
    prompt: string,
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse> {
    const completion = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(context)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2000
    });

    return {
      code: completion.choices[0].message.content || '',
      model: this.config.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      }
    };
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const models = await this.openai.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  getModelInfo() {
    return {
      name: 'OpenAI',
      version: this.config.model,
      capabilities: ['code-generation', 'natural-language']
    };
  }
}
