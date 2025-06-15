import { Validator } from './Validator';
import { JavaScriptValidator } from './JavaScriptValidator';
import { TypeScriptValidator } from './TypeScriptValidator';
import { PythonValidator } from './PythonValidator';
import { HTMLValidator } from './HTMLValidator';
import { TargetLanguage } from '../types';

export class ValidatorFactory {
  private static validators = new Map<TargetLanguage, Validator>();

  static {
    // Initialize validators
    this.validators.set('javascript' as TargetLanguage, new JavaScriptValidator());
    this.validators.set('typescript' as TargetLanguage, new TypeScriptValidator());
    this.validators.set('python' as TargetLanguage, new PythonValidator());
    this.validators.set('html' as TargetLanguage, new HTMLValidator());
  }

  static getValidator(language: TargetLanguage): Validator {
    const validator = this.validators.get(language);
    if (!validator) {
      throw new Error(`No validator available for language: ${language}`);
    }
    return validator;
  }
}