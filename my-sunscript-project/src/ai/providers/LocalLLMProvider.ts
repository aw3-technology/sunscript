import { AIProvider } from '../AIProvider';
import { AIContext, AIResponse, GenerationOptions } from '../../types';

export class LocalLLMProvider extends AIProvider {
  constructor(config: { model?: string; endpoint?: string } = {}) {
    super(config);
    this.config.model = config.model || 'local-llm';
    this.config.endpoint = config.endpoint || 'http://localhost:11434';
  }

  async generateCode(
    prompt: string,
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse> {
    throw new Error('LocalLLMProvider not yet implemented');
  }

  async validateConfiguration(): Promise<boolean> {
    return false;
  }

  getModelInfo() {
    return {
      name: 'Local LLM',
      version: this.config.model,
      capabilities: ['code-generation', 'natural-language']
    };
  }
}
