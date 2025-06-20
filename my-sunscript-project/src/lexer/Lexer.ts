import { Token, TokenType, Position } from '../types';
import { Token as TokenClass } from './Token';
import { LexerError } from './LexerError';
import { patterns, keywords } from './patterns';

export interface LexerErrorInfo {
  message: string;
  position: Position;
  char: string;
  suggestions: string[];
  recovered: boolean;
}

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private errors: LexerErrorInfo[] = [];
  private enableErrorRecovery: boolean = true;

  constructor(input: string, enableErrorRecovery: boolean = true) {
    this.input = input;
    this.enableErrorRecovery = enableErrorRecovery;
  }

  public tokenize(): Token[] {
    while (!this.isAtEnd()) {
      try {
        this.scanToken();
      } catch (error) {
        if (this.enableErrorRecovery) {
          this.recoverFromError(error as Error);
        } else {
          throw error;
        }
      }
    }
    
    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  private scanToken(): void {
    // Skip whitespace but track position
    if (this.match(patterns.whitespace)) {
      return;
    }

    // Handle newlines
    if (this.match(patterns.newline)) {
      this.addToken(TokenType.NEWLINE, '\n');
      this.line++;
      this.column = 1;
      return;
    }

    // Comments
    if (this.match(patterns.comment)) {
      return; // Skip comments
    }

    // AI Questions
    if (this.match(patterns.aiQuestion)) {
      this.addToken(TokenType.AI_QUESTION, '??');
      // Consume the rest of the line as the question
      const questionStart = this.position;
      while (!this.isAtEnd() && this.peek() !== '\n') {
        this.advance();
      }
      const question = this.input.substring(questionStart, this.position).trim();
      if (question) {
        this.addToken(TokenType.TEXT, question);
      }
      return;
    }

    // Directives
    if (this.match(patterns.directive)) {
      const directive = this.lastMatch.substring(1); // Remove @
      this.addToken(TokenType.AI_DIRECTIVE, directive);
      return;
    }

    // Check for identifiers and keywords
    if (this.match(patterns.identifier)) {
      const value = this.lastMatch;
      const keywordType = keywords.get(value.toLowerCase());
      
      if (keywordType) {
        this.addToken(TokenType[keywordType as keyof typeof TokenType], value);
      } else {
        this.addToken(TokenType.IDENTIFIER, value);
      }
      return;
    }
    
    // Numbers
    if (this.match(patterns.number)) {
      this.addToken(TokenType.NUMBER, this.lastMatch);
      return;
    }
    
    // Strings
    if (this.match(patterns.string)) {
      const stringValue = this.lastMatch.slice(1, -1); // Remove quotes
      this.addToken(TokenType.STRING, stringValue);
      return;
    }
    
    // Colon
    if (this.match(patterns.colon)) {
      this.addToken(TokenType.COLON, ':');
      return;
    }
    
    // Comma
    if (this.match(patterns.comma)) {
      this.addToken(TokenType.COMMA, ',');
      return;
    }

    // Braces
    if (this.match(patterns.openBrace)) {
      this.addToken(TokenType.OPEN_BRACE, '{');
      return;
    }

    if (this.match(patterns.closeBrace)) {
      this.addToken(TokenType.CLOSE_BRACE, '}');
      return;
    }

    // Handle unexpected characters with error recovery
    const char = this.peek();
    if (this.isUnexpectedCharacter(char)) {
      this.handleUnexpectedCharacter(char);
      return;
    }
    
    // Default to TEXT for everything else
    const textStart = this.position;
    while (!this.isAtEnd() && 
           this.peek() !== '\n' && 
           this.peek() !== '{' && 
           this.peek() !== '}' &&
           this.peek() !== '@') {
      this.advance();
    }
    
    if (this.position > textStart) {
      const text = this.input.substring(textStart, this.position).trim();
      if (text) {
        this.addToken(TokenType.TEXT, text);
      }
    } else {
      // No progress made, advance one character to prevent infinite loop
      this.advance();
    }
  }

  private lastMatch: string = '';

  private match(pattern: RegExp): boolean {
    const remaining = this.input.substring(this.position);
    const match = remaining.match(pattern);
    
    if (match && match.index === 0) {
      this.lastMatch = match[0];
      for (let i = 0; i < match[0].length; i++) {
        this.advance();
      }
      return true;
    }
    
    return false;
  }

  private matchKeyword(keyword: string): boolean {
    const remaining = this.input.substring(this.position);
    if (remaining.toLowerCase().startsWith(keyword.toLowerCase())) {
      // Check word boundary
      const nextChar = remaining[keyword.length];
      if (!nextChar || /\s|{/.test(nextChar)) {
        for (let i = 0; i < keyword.length; i++) {
          this.advance();
        }
        return true;
      }
    }
    return false;
  }

  private peek(): string {
    return this.isAtEnd() ? '\0' : this.input[this.position];
  }

  private advance(): string {
    const char = this.input[this.position++];
    if (char !== '\n') {
      this.column++;
    }
    return char;
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push(new TokenClass(type, value, {
      line: this.line,
      column: this.column
    }));
  }
  
  private isUnexpectedCharacter(char: string): boolean {
    // Check for characters that shouldn't appear in SunScript
    const unexpectedChars = /[\x00-\x08\x0E-\x1F\x7F]|[^\x00-\x7F]/; // Control chars and non-ASCII
    return unexpectedChars.test(char);
  }
  
  private handleUnexpectedCharacter(char: string): void {
    const errorInfo: LexerErrorInfo = {
      message: `Unexpected character '${this.getCharacterDescription(char)}' (code: ${char.charCodeAt(0)})`,
      position: { line: this.line, column: this.column },
      char,
      suggestions: this.getSuggestionsForCharacter(char),
      recovered: true
    };
    
    this.errors.push(errorInfo);
    
    // Skip the problematic character
    this.advance();
  }
  
  private recoverFromError(error: Error): void {
    const char = this.peek();
    const errorInfo: LexerErrorInfo = {
      message: error.message || 'Unknown lexer error',
      position: { line: this.line, column: this.column },
      char,
      suggestions: [
        'Check for invalid characters',
        'Ensure proper SunScript syntax',
        'Remove or escape special characters'
      ],
      recovered: true
    };
    
    this.errors.push(errorInfo);
    
    // Recovery strategy: advance until we find a safe character
    while (!this.isAtEnd() && this.isUnexpectedCharacter(this.peek())) {
      this.advance();
    }
  }
  
  private getCharacterDescription(char: string): string {
    const code = char.charCodeAt(0);
    
    if (code === 0) return '\\0 (null)';
    if (code === 9) return '\\t (tab)';
    if (code === 10) return '\\n (newline)';
    if (code === 13) return '\\r (carriage return)';
    if (code < 32) return `\\x${code.toString(16).padStart(2, '0')} (control character)`;
    if (code === 127) return '\\x7F (delete)';
    if (code > 127) return `${char} (non-ASCII character)`;
    
    return char;
  }
  
  private getSuggestionsForCharacter(char: string): string[] {
    const suggestions: string[] = [];
    const code = char.charCodeAt(0);
    
    if (code === 0) {
      suggestions.push('Remove null characters from the source');
    } else if (code < 32) {
      suggestions.push('Remove control characters');
      suggestions.push('Use only printable ASCII characters');
    } else if (code > 127) {
      suggestions.push('Use ASCII characters only');
      suggestions.push('Consider using string literals for non-ASCII content');
    }
    
    // Common character substitutions
    switch (char) {
      case '\u2018': // Left single quotation mark
      case '\u2019': // Right single quotation mark
        suggestions.push("Use standard single quote ' instead");
        break;
      case '\u201C': // Left double quotation mark
      case '\u201D': // Right double quotation mark
        suggestions.push('Use standard double quote " instead');
        break;
      case '\u2013': // En dash
      case '\u2014': // Em dash
        suggestions.push('Use standard hyphen - instead');
        break;
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Remove or replace this character');
    }
    
    return suggestions;
  }
  
  public getErrors(): LexerErrorInfo[] {
    return this.errors;
  }
  
  public hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  public clearErrors(): void {
    this.errors = [];
  }
}
