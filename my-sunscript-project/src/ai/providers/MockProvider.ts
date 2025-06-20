import { AIProvider } from '../AIProvider';
import { AIContext, AIResponse, GenerationOptions } from '../../types';

export class MockProvider extends AIProvider {
  constructor() {
    super({});
  }

  async generateCode(
    prompt: string,
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse> {
    // Return a simple mock response for testing
    return {
      code: `// Mock generated code for: ${prompt}\nconsole.log("Hello from SunScript!");`,
      model: 'mock-model',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      metadata: {
        responseTime: 100,
        mockProvider: true
      }
    };
  }

  async validateConfiguration(): Promise<boolean> {
    return true;
  }

  getModelInfo() {
    return {
      name: 'Mock Provider',
      version: '1.0.0',
      capabilities: ['code-generation', 'testing']
    };
  }
}