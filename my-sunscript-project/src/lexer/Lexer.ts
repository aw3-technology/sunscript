import { Token, TokenType, Position } from '../types';
import { Token as TokenClass } from './Token';
import { LexerError } from './LexerError';
import { patterns } from './patterns';

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
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

    // Keywords
    const keywords = ['function', 'component', 'api', 'model', 'pipeline', 'behavior', 'test'];
    for (const keyword of keywords) {
      if (this.matchKeyword(keyword)) {
        const tokenType = TokenType[keyword.toUpperCase() as keyof typeof TokenType];
        this.addToken(tokenType, keyword);
        return;
      }
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
}
