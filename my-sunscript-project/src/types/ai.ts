import { TargetLanguage } from './index';

export interface AIContext {
  targetLanguage: TargetLanguage;
  projectName: string;
  fileName?: string;
  filePath?: string;
  domain?: string;
  requirements?: string[];
}

export interface AIResponse {
  code: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}
