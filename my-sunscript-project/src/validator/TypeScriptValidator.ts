import { Validator, ValidationResult, ValidationError } from './Validator';
import * as ts from 'typescript';

export class TypeScriptValidator extends Validator {
  getLanguage(): string {
    return 'typescript';
  }

  async validate(code: string, fileName: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    // Create a virtual source file
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      ts.ScriptTarget.Latest,
      true
    );

    // Create a simple compiler host with all required methods
    const compilerHost: ts.CompilerHost = {
      getSourceFile: (name) => name === fileName ? sourceFile : undefined,
      writeFile: () => {},
      getCurrentDirectory: () => process.cwd(),
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => '',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      // Add the missing method
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options)
    };

    // Create program and get diagnostics
    const program = ts.createProgram([fileName], {
      noEmit: true,
      allowJs: true,
      checkJs: true,
      strict: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      lib: ['es2020', 'dom']
    }, compilerHost);

    const diagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile)
    ];

    for (const diagnostic of diagnostics) {
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        
        const error: ValidationError = {
          line: line + 1,
          column: character + 1,
          message,
          severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'fatal'
        };
        
        if (diagnostic.category === ts.DiagnosticCategory.Error) {
          errors.push(error);
        } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
          warnings.push({
            ...error,
            severity: 'warning'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}