// Base types used across the compiler

export interface Position {
    line: number;
    column: number;
  }
  
  export interface SourceLocation {
    start: Position;
    end: Position;
  }
  
  export type TargetLanguage = 'javascript' | 'typescript' | 'python' | 'html';