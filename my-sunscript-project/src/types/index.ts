export * from './tokens';
export * from './ast';
export * from './compiler';
export * from './ai';

export type TargetLanguage = 'javascript' | 'typescript' | 'python';

export interface Position {
  line: number;
  column: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

export interface CompilationResult {
  code: Record<string, string>;
  tests?: Record<string, string>;
  documentation?: string;
  sourceMap?: string;
  metadata: CompilationMetadata;
}

export interface CompilationMetadata {
  version: string;
  timestamp: string;
  targetLanguage: TargetLanguage;
  optimizations: string[];
  warnings: CompilerWarning[];
}

export interface CompilerWarning {
  message: string;
  location?: SourceLocation;
  severity: 'info' | 'warning' | 'error';
}
