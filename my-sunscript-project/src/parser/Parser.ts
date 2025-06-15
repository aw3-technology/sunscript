import { Token, TokenType, Program, ASTNode } from '../types';
import { ParserError } from './ParserError';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): Program {
    const program: Program = {
      type: 'Program',
      body: [],
      metadata: {
        version: '1.0.0'
      }
    };

    while (!this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;
      
      const declaration = this.declaration();
      if (declaration) {
        program.body.push(declaration);
      }
    }

    return program;
  }

  private declaration(): ASTNode | null {
    if (this.match(TokenType.FUNCTION)) {
      return this.functionDeclaration();
    }
    
    if (this.match(TokenType.AI_DIRECTIVE)) {
      return this.aiDirective();
    }

    // Skip unknown tokens for now
    this.advance();
    return null;
  }

  private functionDeclaration(): ASTNode {
    const nameToken = this.consume(TokenType.TEXT, "Expected function name");
    const name = nameToken.value;
    
    this.consume(TokenType.OPEN_BRACE, "Expected '{' after function name");
    this.skipNewlines();
    
    const body: any[] = [];
    const metadata: any = {
      aiQuestions: [],
      directives: []
    };

    while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
      this.skipNewlines();
      
      if (this.match(TokenType.AI_QUESTION)) {
        const question = this.consume(TokenType.TEXT, "Expected question text").value;
        metadata.aiQuestions.push(question);
      } else if (this.match(TokenType.TEXT)) {
        body.push({
          type: 'NaturalLanguageExpression',
          text: this.previous().value
        });
      }
      
      this.skipNewlines();
    }

    this.consume(TokenType.CLOSE_BRACE, "Expected '}' after function body");

    return {
      type: 'FunctionDeclaration',
      name,
      body,
      metadata
    } as any;
  }

  private aiDirective(): ASTNode {
    const directive = this.previous().value;
    let value = '';
    
    if (this.check(TokenType.TEXT)) {
      value = this.advance().value;
    }
    
    return {
      type: 'AIDirective',
      directive,
      parameters: { value }
    } as any;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParserError(message, this.peek().position);
  }

  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      // Skip
    }
  }
}
