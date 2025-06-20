import { AIProvider } from '../AIProvider';
import { AIContext, AIResponse, GenerationOptions } from '../../types';

export class AnthropicProvider extends AIProvider {
  constructor(config: { apiKey?: string; model?: string } = {}) {
    super(config);
    this.config.model = config.model || 'claude-3-sonnet-20240229';
  }

  async generateCode(
    prompt: string,
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse> {
    throw new Error('AnthropicProvider not yet implemented');
  }

  async validateConfiguration(): Promise<boolean> {
    return false;
  }

  getModelInfo() {
    return {
      name: 'Anthropic',
      version: this.config.model,
      capabilities: ['code-generation', 'natural-language']
    };
  }
}
