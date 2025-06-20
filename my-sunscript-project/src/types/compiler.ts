import { AIProvider } from '../ai/AIProvider';
import { TargetLanguage } from './index';

export interface CompilerConfig {
  outputDir: string;
  targetLanguage: TargetLanguage;
  aiProvider: AIProvider;
  cache?: boolean;
  watch?: boolean;
  domain?: string;
  optimizations?: string[];
  verbose?: boolean;
}

export interface CompilerContext {
  fileName: string;
  filePath: string;
  projectName?: string;
  metadata?: Record<string, any>;
}
