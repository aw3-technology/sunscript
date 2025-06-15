import { Validator, ValidationResult, ValidationError, ValidationWarning } from './Validator';
import * as htmlparser2 from 'htmlparser2';

export class HTMLValidator extends Validator {
  getLanguage(): string {
    return 'html';
  }

  async validate(code: string, fileName: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    return new Promise((resolve) => {
      const parser = new htmlparser2.Parser({
        onerror: (error) => {
          errors.push({
            line: 1,
            column: 1,
            message: error.message,
            severity: 'error'
          });
        },
        onend: () => {
          resolve({
            valid: errors.length === 0,
            errors,
            warnings
          });
        }
      }, {
        lowerCaseTags: true,
        lowerCaseAttributeNames: true
      });

      parser.write(code);
      parser.end();
    });
  }
}