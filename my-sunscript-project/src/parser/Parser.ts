import { Token, TokenType, Program, ASTNode } from '../types';
import { ParserError } from './ParserError';
import { ErrorRecovery, ParseError, ParseContext, RecoveryResult } from './ErrorRecovery';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errorRecovery: ErrorRecovery;
  private sourceCode: string;
  private parseErrors: ParseError[] = [];
  private currentContext: ParseContext = {
    currentConstruct: 'unknown',
    enclosingConstructs: [],
    nearbyTokens: [],
    lineContent: ''
  };

  constructor(tokens: Token[], sourceCode: string = '') {
    this.tokens = tokens;
    this.sourceCode = sourceCode;
    this.errorRecovery = new ErrorRecovery(tokens, sourceCode);
  }

  public parse(): Program {
    const program: Program = {
      type: 'Program',
      body: [],
      metadata: {
        version: '1.0.0',
        parseErrors: []
      }
    };

    while (!this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;
      
      try {
        const declaration = this.declaration();
        if (declaration) {
          program.body.push(declaration);
        }
      } catch (error) {
        // Attempt error recovery
        const recovery = this.recoverFromError(error as Error);
        if (recovery.recovered) {
          this.current = recovery.newPosition;
          this.parseErrors.push(...recovery.errors);
          
          // Try to continue with partial AST if available
          if (recovery.partialAST) {
            program.body.push(recovery.partialAST);
          }
        } else {
          // If recovery fails, skip to next line and continue
          this.skipToNextLine();
        }
      }
    }

    // Add parse errors to program metadata
    program.metadata.parseErrors = this.getAllErrors();
    return program;
  }

  private declaration(): ASTNode | null {
    this.updateContext('declaration');
    
    if (this.match(TokenType.FUNCTION)) {
      return this.functionDeclaration();
    }
    
    if (this.match(TokenType.AI_DIRECTIVE)) {
      return this.aiDirective();
    }

    // Handle unknown tokens with error recovery
    const token = this.peek();
    if (!this.isAtEnd()) {
      const error = this.errorRecovery.addError(
        `Unexpected token '${token.value}' at top level`,
        token,
        [TokenType.FUNCTION, TokenType.AI_DIRECTIVE],
        this.currentContext
      );
      this.parseErrors.push(error);
      
      // Try to recover by advancing
      this.advance();
    }
    return null;
  }

  private functionDeclaration(): ASTNode {
    this.updateContext('function');
    
    let name = 'unknown';
    const body: any[] = [];
    const metadata: any = {
      aiQuestions: [],
      directives: [],
      hasErrors: false
    };
    
    try {
      const nameToken = this.consumeWithRecovery(TokenType.IDENTIFIER, "Expected function name");
      if (nameToken) {
        name = nameToken.value;
      }
      
      this.consumeWithRecovery(TokenType.OPEN_BRACE, "Expected '{' after function name");
      this.skipNewlines();
      
      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        this.skipNewlines();
        
        try {
          if (this.match(TokenType.AI_QUESTION)) {
            const questionToken = this.consumeWithRecovery(TokenType.TEXT, "Expected question text");
            if (questionToken) {
              metadata.aiQuestions.push(questionToken.value);
            }
          } else if (this.match(TokenType.TEXT)) {
            body.push({
              type: 'NaturalLanguageExpression',
              text: this.previous().value
            });
          } else {
            // Unknown token in function body
            const token = this.peek();
            const error = this.errorRecovery.addError(
              `Unexpected token '${token.value}' in function body`,
              token,
              [TokenType.TEXT, TokenType.AI_QUESTION, TokenType.CLOSE_BRACE],
              this.currentContext
            );
            this.parseErrors.push(error);
            metadata.hasErrors = true;
            this.advance(); // Skip problematic token
          }
        } catch (error) {
          metadata.hasErrors = true;
          // Continue parsing the rest of the function
        }
        
        this.skipNewlines();
      }
      
      this.consumeWithRecovery(TokenType.CLOSE_BRACE, "Expected '}' after function body");
      
    } catch (error) {
      metadata.hasErrors = true;
    }

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

  protected match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  protected check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  protected advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  protected isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  protected peek(): Token {
    return this.tokens[this.current];
  }

  protected previous(): Token {
    return this.tokens[this.current - 1];
  }

  protected consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParserError(message, this.peek().position);
  }
  
  private consumeWithRecovery(type: TokenType, message: string): Token | null {
    if (this.check(type)) {
      return this.advance();
    }
    
    // Add error and attempt recovery
    const token = this.peek();
    const error = this.errorRecovery.addError(
      message,
      token,
      [type],
      this.currentContext
    );
    this.parseErrors.push(error);
    
    // Try to recover
    const recovery = this.errorRecovery.recover(this.current, this.currentContext);
    if (recovery.recovered) {
      this.current = recovery.newPosition;
      this.parseErrors.push(...recovery.errors);
      
      // Check if we're now at the expected token
      if (this.check(type)) {
        return this.advance();
      }
    }
    
    return null;
  }
  
  private recoverFromError(error: Error): RecoveryResult {
    const token = this.peek();
    
    // Create a parse error from the exception
    const parseError = this.errorRecovery.addError(
      error.message,
      token,
      undefined,
      this.currentContext
    );
    
    // Attempt recovery
    const recovery = this.errorRecovery.recover(this.current, this.currentContext);
    recovery.errors.unshift(parseError);
    
    return recovery;
  }
  
  private updateContext(construct: string): void {
    this.currentContext = {
      currentConstruct: construct,
      enclosingConstructs: [...this.currentContext.enclosingConstructs, construct],
      nearbyTokens: this.getNearbyTokens(),
      lineContent: this.getCurrentLineContent()
    };
  }
  
  private getNearbyTokens(): Token[] {
    const start = Math.max(0, this.current - 2);
    const end = Math.min(this.tokens.length, this.current + 3);
    return this.tokens.slice(start, end);
  }
  
  private getCurrentLineContent(): string {
    if (!this.sourceCode) return '';
    const token = this.peek();
    const lines = this.sourceCode.split('\n');
    return lines[token.position.line - 1] || '';
  }
  
  private skipToNextLine(): void {
    const currentLine = this.peek().position.line;
    while (!this.isAtEnd() && this.peek().position.line === currentLine) {
      this.advance();
    }
  }
  
  public getAllErrors(): ParseError[] {
    return [...this.parseErrors, ...this.errorRecovery.getErrors()];
  }
  
  public hasErrors(): boolean {
    return this.parseErrors.length > 0 || this.errorRecovery.getErrors().length > 0;
  }

  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      // Skip
    }
  }
}
