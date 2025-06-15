export abstract class Validator {
    abstract validate(code: string, fileName: string): Promise<ValidationResult>;
    abstract getLanguage(): string;
  }
  
  export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }
  
  export interface ValidationError {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'fatal';
  }
  
  export interface ValidationWarning {
    line: number;
    column: number;
    message: string;
    severity: 'warning' | 'info';
  }