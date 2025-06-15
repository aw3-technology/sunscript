import { Validator, ValidationResult, ValidationError } from './Validator';
import * as acorn from 'acorn';

export class JavaScriptValidator extends Validator {
  getLanguage(): string {
    return 'javascript';
  }

  async validate(code: string, fileName: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    try {
      // Parse the JavaScript code
      acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        onComment: (isBlock: boolean, text: string, start: number, end: number) => {
          // Could check for TODO comments, etc.
        }
      });

      // If parsing succeeds, the syntax is valid
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error: any) {
      // Parse the error to extract line and column
      const match = error.message.match(/\((\d+):(\d+)\)/);
      const line = match ? parseInt(match[1]) : 1;
      const column = match ? parseInt(match[2]) : 1;

      errors.push({
        line,
        column,
        message: error.message,
        severity: 'error'
      });

      return {
        valid: false,
        errors,
        warnings
      };
    }
  }
}