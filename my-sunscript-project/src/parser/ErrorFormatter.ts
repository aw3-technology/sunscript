import { ParseError } from './ErrorRecovery';
import { LexerErrorInfo } from '../lexer/Lexer';
import chalk from 'chalk';

export interface FormattedError {
  type: 'lexer' | 'parser';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: string;
  sourceSnippet?: string;
  suggestions: string[];
  errorCode?: string;
}

export class ErrorFormatter {
  private sourceLines: string[];

  constructor(sourceCode: string) {
    this.sourceLines = sourceCode.split('\n');
  }

  /**
   * Format parse errors for display
   */
  formatParseErrors(errors: ParseError[]): FormattedError[] {
    return errors.map(error => this.formatParseError(error));
  }

  /**
   * Format lexer errors for display
   */
  formatLexerErrors(errors: LexerErrorInfo[]): FormattedError[] {
    return errors.map(error => this.formatLexerError(error));
  }

  /**
   * Format a single parse error
   */
  private formatParseError(error: ParseError): FormattedError {
    const location = `${error.position.line}:${error.position.column}`;
    const sourceSnippet = this.getSourceSnippet(error.position.line, error.position.column);

    return {
      type: 'parser',
      severity: error.severity,
      message: error.message,
      location,
      sourceSnippet,
      suggestions: error.suggestions,
      errorCode: error.errorCode
    };
  }

  /**
   * Format a single lexer error
   */
  private formatLexerError(error: LexerErrorInfo): FormattedError {
    const location = `${error.position.line}:${error.position.column}`;
    const sourceSnippet = this.getSourceSnippet(error.position.line, error.position.column);

    return {
      type: 'lexer',
      severity: 'error',
      message: error.message,
      location,
      sourceSnippet,
      suggestions: error.suggestions
    };
  }

  /**
   * Get source code snippet around the error
   */
  private getSourceSnippet(line: number, column: number): string {
    const lineIndex = line - 1;
    if (lineIndex < 0 || lineIndex >= this.sourceLines.length) {
      return '';
    }

    const sourceLine = this.sourceLines[lineIndex];
    const padding = ' '.repeat(Math.max(0, column - 1));
    const pointer = '^';

    return `${sourceLine}\n${padding}${pointer}`;
  }

  /**
   * Create a comprehensive error report
   */
  static createErrorReport(
    sourceCode: string,
    parseErrors: ParseError[],
    lexerErrors: LexerErrorInfo[]
  ): string {
    const formatter = new ErrorFormatter(sourceCode);
    const report: string[] = [];

    // Add header
    const totalErrors = parseErrors.length + lexerErrors.length;
    if (totalErrors === 0) {
      return chalk.green('✅ No errors found!');
    }

    report.push(chalk.red(`\n🚨 Found ${totalErrors} error(s):\n`));

    // Format lexer errors
    if (lexerErrors.length > 0) {
      report.push(chalk.yellow('📝 Lexer Errors:'));
      const formattedLexerErrors = formatter.formatLexerErrors(lexerErrors);
      formattedLexerErrors.forEach((error, index) => {
        report.push(this.formatErrorForDisplay(error, index + 1));
      });
      report.push('');
    }

    // Format parser errors
    if (parseErrors.length > 0) {
      report.push(chalk.yellow('🔍 Parser Errors:'));
      const formattedParseErrors = formatter.formatParseErrors(parseErrors);
      formattedParseErrors.forEach((error, index) => {
        report.push(this.formatErrorForDisplay(error, lexerErrors.length + index + 1));
      });
    }

    // Add summary and recommendations
    report.push(chalk.cyan('\n💡 Recommendations:'));
    const recommendations = this.generateRecommendations(parseErrors, lexerErrors);
    recommendations.forEach(rec => {
      report.push(chalk.cyan(`   • ${rec}`));
    });

    return report.join('\n');
  }

  /**
   * Format a single error for display
   */
  private static formatErrorForDisplay(error: FormattedError, index: number): string {
    const lines: string[] = [];
    
    // Error header
    const severityColor = error.severity === 'error' ? chalk.red : 
                         error.severity === 'warning' ? chalk.yellow : chalk.blue;
    
    lines.push(severityColor(`   ${index}. ${error.message}`));
    lines.push(chalk.gray(`      Location: ${error.location}`));
    
    if (error.errorCode) {
      lines.push(chalk.gray(`      Code: ${error.errorCode}`));
    }

    // Source snippet
    if (error.sourceSnippet) {
      lines.push(chalk.gray('      Source:'));
      const snippet = error.sourceSnippet.split('\n');
      snippet.forEach(line => {
        if (line.trim()) {
          lines.push(chalk.gray(`        ${line}`));
        }
      });
    }

    // Suggestions
    if (error.suggestions.length > 0) {
      lines.push(chalk.cyan('      Suggestions:'));
      error.suggestions.forEach(suggestion => {
        lines.push(chalk.cyan(`        → ${suggestion}`));
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate general recommendations based on error patterns
   */
  private static generateRecommendations(
    parseErrors: ParseError[],
    lexerErrors: LexerErrorInfo[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for common error patterns
    const hasUnexpectedTokens = parseErrors.some(e => e.message.includes('Unexpected'));
    const hasMissingTokens = parseErrors.some(e => e.message.includes('Missing') || e.message.includes('Expected'));
    const hasCharacterErrors = lexerErrors.some(e => e.message.includes('character'));
    const hasMisspellings = parseErrors.some(e => e.errorCode === 'POSSIBLE_MISSPELLING');

    if (hasCharacterErrors) {
      recommendations.push('Check for invalid or non-ASCII characters in your source code');
      recommendations.push('Ensure you\'re using standard ASCII quotes and punctuation');
    }

    if (hasMisspellings) {
      recommendations.push('Check spelling of SunScript keywords (function, component, when, etc.)');
      recommendations.push('Verify syntax matches SunScript documentation');
    }

    if (hasMissingTokens) {
      recommendations.push('Check for missing braces { }, colons :, or other required syntax');
      recommendations.push('Ensure proper structure: function name { ... }');
    }

    if (hasUnexpectedTokens) {
      recommendations.push('Review syntax around unexpected tokens');
      recommendations.push('Consider using natural language constructs instead of programming syntax');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Review SunScript syntax documentation');
      recommendations.push('Check for proper use of functions, components, and directives');
    }

    recommendations.push('Use the SunScript debugger for interactive error diagnosis');

    return recommendations;
  }

  /**
   * Create IDE-friendly error diagnostics
   */
  static createDiagnostics(
    sourceCode: string,
    parseErrors: ParseError[],
    lexerErrors: LexerErrorInfo[]
  ): DiagnosticInfo[] {
    const formatter = new ErrorFormatter(sourceCode);
    const diagnostics: DiagnosticInfo[] = [];

    // Add lexer diagnostics
    lexerErrors.forEach(error => {
      diagnostics.push({
        range: {
          start: { line: error.position.line - 1, character: error.position.column - 1 },
          end: { line: error.position.line - 1, character: error.position.column }
        },
        severity: DiagnosticSeverity.Error,
        message: error.message,
        source: 'sunscript-lexer',
        code: 'lexer-error',
        codeDescription: {
          href: 'https://docs.sunscript.dev/errors/lexer'
        },
        tags: error.recovered ? [DiagnosticTag.Deprecated] : undefined
      });
    });

    // Add parser diagnostics
    parseErrors.forEach(error => {
      diagnostics.push({
        range: {
          start: { line: error.position.line - 1, character: error.position.column - 1 },
          end: { line: error.position.line - 1, character: error.position.column + error.token.value.length }
        },
        severity: error.severity === 'error' ? DiagnosticSeverity.Error :
                 error.severity === 'warning' ? DiagnosticSeverity.Warning :
                 DiagnosticSeverity.Information,
        message: error.message,
        source: 'sunscript-parser',
        code: error.errorCode,
        codeDescription: {
          href: `https://docs.sunscript.dev/errors/${error.errorCode?.toLowerCase()}`
        },
        relatedInformation: error.suggestions.map(suggestion => ({
          location: {
            uri: 'file://current',
            range: {
              start: { line: error.position.line - 1, character: 0 },
              end: { line: error.position.line - 1, character: 1000 }
            }
          },
          message: suggestion
        }))
      });
    });

    return diagnostics;
  }
}

// IDE-friendly diagnostic interfaces
export interface DiagnosticInfo {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: DiagnosticSeverity;
  message: string;
  source: string;
  code?: string;
  codeDescription?: { href: string };
  tags?: DiagnosticTag[];
  relatedInformation?: {
    location: {
      uri: string;
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
    };
    message: string;
  }[];
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2
}