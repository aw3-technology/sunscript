import { AIContext, AIResponse, GenerationOptions } from '../types';

export abstract class AIProvider {
  protected config: Record<string, any>;

  constructor(config: Record<string, any> = {}) {
    this.config = config;
  }

  abstract generateCode(
    prompt: string, 
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse>;

  abstract validateConfiguration(): Promise<boolean>;

  abstract getModelInfo(): {
    name: string;
    version: string;
    capabilities: string[];
  };

  protected buildSystemPrompt(context: AIContext): string {
    return `You are SunScript, an AI-native programming language compiler.
    
Generate production-ready ${context.targetLanguage} code that follows best practices.
Include comprehensive error handling, security measures, and performance optimizations.
The code should be well-commented and maintainable.

Context:
- Target Language: ${context.targetLanguage}
- Domain: ${context.domain || 'general'}
- Project: ${context.projectName || 'unknown'}`;
  }
}
