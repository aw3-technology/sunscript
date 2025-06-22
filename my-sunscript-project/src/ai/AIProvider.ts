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
    const isHTML = context.targetLanguage === 'html';
    const codeDescription = isHTML 
      ? 'complete HTML web applications with embedded CSS and JavaScript'
      : `production-ready ${context.targetLanguage} code`;
    
    return `You are SunScript, an AI-native programming language compiler.
    
Generate ${codeDescription} that follows best practices.
${isHTML ? 'For HTML targets, always include functional JavaScript for interactivity and embedded CSS for styling.' : ''}
Include comprehensive error handling, security measures, and performance optimizations.
The code should be well-commented and maintainable.

Context:
- Target Language: ${context.targetLanguage}
- Domain: ${context.domain || 'general'}
- Project: ${context.projectName || 'unknown'}`;
  }
}
