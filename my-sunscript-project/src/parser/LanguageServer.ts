import { ParseError } from './ErrorRecovery';
import { LexerErrorInfo } from '../lexer/Lexer';
import { ErrorFormatter, DiagnosticInfo } from './ErrorFormatter';
import { ErrorReporter } from './ErrorReporter';
import { Lexer } from '../lexer/Lexer';
import { Parser } from '../parser/Parser';
import { EventEmitter } from 'events';

export interface TextDocumentItem {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface WorkspaceEdit {
  changes: { [uri: string]: TextEdit[] };
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25
}

export interface CodeAction {
  title: string;
  kind: string;
  diagnostics?: DiagnosticInfo[];
  edit?: WorkspaceEdit;
  command?: {
    title: string;
    command: string;
    arguments?: any[];
  };
}

export interface Hover {
  contents: string[];
  range?: Range;
}

/**
 * SunScript Language Server for IDE integration
 */
export class SunScriptLanguageServer extends EventEmitter {
  private documents: Map<string, TextDocumentItem> = new Map();
  private diagnostics: Map<string, DiagnosticInfo[]> = new Map();
  private errorReporter: ErrorReporter;

  constructor() {
    super();
    this.errorReporter = new ErrorReporter();
  }

  /**
   * Handle document open
   */
  onDidOpenTextDocument(document: TextDocumentItem): void {
    this.documents.set(document.uri, document);
    this.validateDocument(document);
    this.emit('document:opened', document);
  }

  /**
   * Handle document change
   */
  onDidChangeTextDocument(uri: string, text: string, version: number): void {
    const document = this.documents.get(uri);
    if (document) {
      document.text = text;
      document.version = version;
      this.validateDocument(document);
      this.emit('document:changed', document);
    }
  }

  /**
   * Handle document close
   */
  onDidCloseTextDocument(uri: string): void {
    this.documents.delete(uri);
    this.diagnostics.delete(uri);
    this.emit('document:closed', { uri });
  }

  /**
   * Validate a document and update diagnostics
   */
  private validateDocument(document: TextDocumentItem): void {
    try {
      // Lexical analysis
      const lexer = new Lexer(document.text, true);
      const tokens = lexer.tokenize();
      const lexerErrors = lexer.getErrors();

      // Parsing
      const parser = new Parser(tokens, document.text);
      const program = parser.parse();
      const parseErrors = parser.getAllErrors();

      // Create diagnostics
      const diagnostics = ErrorFormatter.createDiagnostics(
        document.text,
        parseErrors,
        lexerErrors
      );

      this.diagnostics.set(document.uri, diagnostics);

      // Add to error reporter
      this.errorReporter.addReport(
        document.uri,
        document.text,
        parseErrors,
        lexerErrors
      );

      this.emit('diagnostics:updated', {
        uri: document.uri,
        diagnostics
      });

    } catch (error) {
      // Fallback error handling
      const fallbackDiagnostic: DiagnosticInfo = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        severity: 1, // Error
        message: `Language server error: ${error}`,
        source: 'sunscript-language-server'
      };

      this.diagnostics.set(document.uri, [fallbackDiagnostic]);
      this.emit('diagnostics:updated', {
        uri: document.uri,
        diagnostics: [fallbackDiagnostic]
      });
    }
  }

  /**
   * Provide completion items
   */
  provideCompletionItems(uri: string, position: Position): CompletionItem[] {
    const document = this.documents.get(uri);
    if (!document) return [];

    const completions: CompletionItem[] = [];

    // SunScript keywords
    const keywords = [
      { label: 'function', kind: CompletionItemKind.Keyword, detail: 'Define a function' },
      { label: 'component', kind: CompletionItemKind.Keyword, detail: 'Define a component' },
      { label: 'when', kind: CompletionItemKind.Keyword, detail: 'Conditional logic' },
      { label: 'then', kind: CompletionItemKind.Keyword, detail: 'Then clause' },
      { label: 'else', kind: CompletionItemKind.Keyword, detail: 'Else clause' },
      { label: 'return', kind: CompletionItemKind.Keyword, detail: 'Return statement' }
    ];

    completions.push(...keywords);

    // AI directives
    const directives = [
      { label: '@optimize', kind: CompletionItemKind.Snippet, detail: 'AI optimization directive' },
      { label: '@secure', kind: CompletionItemKind.Snippet, detail: 'Security directive' },
      { label: '@test', kind: CompletionItemKind.Snippet, detail: 'Test generation directive' },
      { label: '@document', kind: CompletionItemKind.Snippet, detail: 'Documentation directive' }
    ];

    completions.push(...directives);

    // Function templates
    const templates = [
      {
        label: 'function template',
        kind: CompletionItemKind.Snippet,
        detail: 'Create a new function',
        insertText: 'function ${1:name} {\n    ${2:// Natural language description}\n}'
      },
      {
        label: 'component template',
        kind: CompletionItemKind.Snippet,
        detail: 'Create a new component',
        insertText: 'component ${1:name} {\n    ${2:// Component description}\n}'
      }
    ];

    completions.push(...templates);

    return completions;
  }

  /**
   * Provide code actions (quick fixes)
   */
  provideCodeActions(uri: string, range: Range, diagnostics: DiagnosticInfo[]): CodeAction[] {
    const actions: CodeAction[] = [];

    diagnostics.forEach(diagnostic => {
      // Fix missing braces
      if (diagnostic.code === 'MISSING_OPEN_BRACE') {
        actions.push({
          title: 'Add missing opening brace',
          kind: 'quickfix',
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [uri]: [{
                range: diagnostic.range,
                newText: '{'
              }]
            }
          }
        });
      }

      // Fix misspellings
      if (diagnostic.code === 'POSSIBLE_MISSPELLING') {
        const suggestions = this.extractSuggestions(diagnostic.message);
        suggestions.forEach(suggestion => {
          actions.push({
            title: `Replace with '${suggestion}'`,
            kind: 'quickfix',
            diagnostics: [diagnostic],
            edit: {
              changes: {
                [uri]: [{
                  range: diagnostic.range,
                  newText: suggestion
                }]
              }
            }
          });
        });
      }

      // Remove unexpected tokens
      if (diagnostic.code === 'UNEXPECTED_TOKEN') {
        actions.push({
          title: 'Remove unexpected token',
          kind: 'quickfix',
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [uri]: [{
                range: diagnostic.range,
                newText: ''
              }]
            }
          }
        });
      }

      // Add refactoring actions
      if (diagnostic.severity === 2) { // Warning
        actions.push({
          title: 'Extract to function',
          kind: 'refactor.extract',
          command: {
            title: 'Extract to Function',
            command: 'sunscript.extractFunction',
            arguments: [uri, range]
          }
        });
      }
    });

    // General code actions
    actions.push({
      title: 'Format document',
      kind: 'source.formatDocument',
      command: {
        title: 'Format Document',
        command: 'sunscript.formatDocument',
        arguments: [uri]
      }
    });

    actions.push({
      title: 'Organize directives',
      kind: 'source.organizeImports',
      command: {
        title: 'Organize Directives',
        command: 'sunscript.organizeDirectives',
        arguments: [uri]
      }
    });

    return actions;
  }

  /**
   * Provide hover information
   */
  provideHover(uri: string, position: Position): Hover | null {
    const document = this.documents.get(uri);
    if (!document) return null;

    const lines = document.text.split('\n');
    const line = lines[position.line];
    if (!line) return null;

    // Find word at position
    const wordRange = this.getWordRangeAtPosition(line, position.character);
    if (!wordRange) return null;

    const word = line.substring(wordRange.start, wordRange.end);

    // Provide hover for SunScript keywords
    const keywordInfo: { [key: string]: string } = {
      'function': 'SunScript function definition. Use natural language to describe what the function does.',
      'component': 'SunScript component definition. Components are reusable UI elements.',
      'when': 'Conditional logic. Use natural language conditions.',
      'then': 'Then clause for conditional statements.',
      'else': 'Else clause for conditional statements.',
      'return': 'Return statement to exit a function with a value.'
    };

    if (keywordInfo[word]) {
      return {
        contents: [keywordInfo[word]],
        range: {
          start: { line: position.line, character: wordRange.start },
          end: { line: position.line, character: wordRange.end }
        }
      };
    }

    return null;
  }

  /**
   * Get diagnostics for a document
   */
  getDiagnostics(uri: string): DiagnosticInfo[] {
    return this.diagnostics.get(uri) || [];
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    return this.errorReporter.getStatistics();
  }

  /**
   * Generate error summary report
   */
  generateSummaryReport(): string {
    return this.errorReporter.generateSummaryReport();
  }

  /**
   * Extract suggestions from diagnostic message
   */
  private extractSuggestions(message: string): string[] {
    const match = message.match(/Did you mean '([^']+)'\?/);
    return match ? [match[1]] : [];
  }

  /**
   * Get word range at position
   */
  private getWordRangeAtPosition(line: string, character: number): { start: number; end: number } | null {
    if (character < 0 || character >= line.length) return null;

    const wordPattern = /[a-zA-Z_][a-zA-Z0-9_]*/;
    let start = character;
    let end = character;

    // Find word start
    while (start > 0 && wordPattern.test(line[start - 1])) {
      start--;
    }

    // Find word end
    while (end < line.length && wordPattern.test(line[end])) {
      end++;
    }

    if (start === end) return null;

    return { start, end };
  }
}

// Export a singleton instance for global use
export const sunScriptLanguageServer = new SunScriptLanguageServer();