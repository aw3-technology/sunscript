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
        syntaxMode: 'standard',
        parseErrors: []
      }
    };

    // First pass: Look for directives that affect parsing
    this.preprocessDirectives(program);
    
    // Reset position for actual parsing
    this.current = 0;

    while (!this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;
      
      try {
        const declaration = program.metadata.syntaxMode === 'flex' 
          ? this.flexDeclaration() 
          : this.declaration();
          
        if (declaration) {
          // Handle directives that affect program metadata
          if (declaration.type === 'AIDirective') {
            const directive = declaration as any;
            if (directive.directive === 'syntax' && directive.parameters?.value) {
              const syntaxMode = directive.parameters.value.toLowerCase();
              if (syntaxMode === 'flex') {
                program.metadata.syntaxMode = 'flex';
              }
            }
          }
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

  private preprocessDirectives(program: Program): void {
    const savedPosition = this.current;
    this.current = 0;
    
    while (!this.isAtEnd()) {
      if (this.match(TokenType.AI_DIRECTIVE)) {
        const directive = this.previous().value;
        if (directive === 'syntax' && this.check(TokenType.TEXT)) {
          const value = this.advance().value.toLowerCase();
          if (value === 'flex') {
            program.metadata.syntaxMode = 'flex';
          }
        }
      } else {
        this.advance();
      }
    }
    
    this.current = savedPosition;
  }

  private flexDeclaration(): ASTNode | null {
    this.updateContext('flex-declaration');
    
    // In flex mode, only directives have special meaning
    if (this.match(TokenType.AI_DIRECTIVE)) {
      return this.aiDirective();
    }
    
    // Everything else is treated as natural language
    const expressions: any[] = [];
    const startLine = this.peek().position?.line || 0;
    
    while (!this.isAtEnd() && !this.check(TokenType.AI_DIRECTIVE)) {
      if (this.match(TokenType.NEWLINE)) {
        // Check if we have accumulated any expressions
        if (expressions.length > 0) {
          break;
        }
        continue;
      }
      
      const token = this.advance();
      if (token.type === TokenType.TEXT || 
          token.type === TokenType.IDENTIFIER ||
          token.type === TokenType.FUNCTION ||
          token.type === TokenType.COMPONENT ||
          token.type === TokenType.API ||
          token.type === TokenType.MODEL ||
          token.type === TokenType.PIPELINE ||
          token.type === TokenType.BEHAVIOR ||
          token.type === TokenType.TEST) {
        expressions.push(token.value);
      }
    }
    
    if (expressions.length > 0) {
      // Create a natural language block
      return {
        type: 'FunctionDeclaration',
        name: 'main',
        body: [{
          type: 'NaturalLanguageExpression',
          text: expressions.join(' ')
        }],
        metadata: {
          aiQuestions: [],
          directives: [],
          flexSyntax: true
        }
      } as any;
    }
    
    return null;
  }

  private declaration(): ASTNode | null {
    this.updateContext('declaration');
    
    if (this.match(TokenType.FUNCTION)) {
      return this.functionDeclaration();
    }
    
    if (this.match(TokenType.COMPONENT)) {
      return this.componentDeclaration();
    }
    
    if (this.match(TokenType.API)) {
      return this.apiDeclaration();
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

  private naturalLanguageExpression(): any | null {
    const expressions: string[] = [];
    
    while (!this.isAtEnd() && 
           !this.check(TokenType.AI_DIRECTIVE) && 
           !this.check(TokenType.CLOSE_BRACE) &&
           !this.check(TokenType.NEWLINE)) {
      
      const token = this.advance();
      if (token.type === TokenType.TEXT || 
          token.type === TokenType.IDENTIFIER) {
        expressions.push(token.value);
      }
    }
    
    if (expressions.length > 0) {
      return {
        type: 'NaturalLanguageExpression',
        text: expressions.join(' ')
      };
    }
    
    return null;
  }

  private addError(message: string): void {
    const token = this.peek();
    const error = this.errorRecovery.addError(
      message,
      token,
      [],
      this.currentContext
    );
    this.parseErrors.push(error);
  }

  private componentDeclaration(): ASTNode {
    this.updateContext('component');
    
    let name = 'unknown';
    const body: any[] = [];
    const metadata: any = {
      description: '',
      props: [],
      aiQuestions: [],
      directives: [],
      hasErrors: false
    };
    
    try {
      const nameToken = this.consumeWithRecovery(TokenType.IDENTIFIER, "Expected component name");
      if (nameToken) {
        name = nameToken.value;
      }
      
      this.consumeWithRecovery(TokenType.OPEN_BRACE, "Expected '{' after component name");
      this.skipNewlines();
      
      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.AI_DIRECTIVE)) {
          const directive = this.aiDirective();
          metadata.directives.push(directive);
          this.skipNewlines();
          continue;
        }
        
        if (this.match(TokenType.NEWLINE)) {
          continue;
        }
        
        // Parse natural language expressions
        const expr = this.naturalLanguageExpression();
        if (expr) {
          body.push({
            type: 'ExpressionStatement',
            expression: expr
          });
        }
        
        this.skipNewlines();
      }
      
      this.consumeWithRecovery(TokenType.CLOSE_BRACE, "Expected '}' after component body");
      
    } catch (error) {
      metadata.hasErrors = true;
      this.addError(`Error parsing component '${name}': ${(error as Error).message}`);
    }
    
    return {
      type: 'ComponentDeclaration',
      name,
      body,
      metadata
    } as any;
  }

  private apiDeclaration(): ASTNode {
    this.updateContext('api');
    
    let name = 'unknown';
    const endpoints: any[] = [];
    const metadata: any = {
      description: '',
      version: '1.0.0',
      aiQuestions: [],
      directives: [],
      hasErrors: false
    };
    
    try {
      const nameToken = this.consumeWithRecovery(TokenType.IDENTIFIER, "Expected API name");
      if (nameToken) {
        name = nameToken.value;
      }
      
      this.consumeWithRecovery(TokenType.OPEN_BRACE, "Expected '{' after API name");
      this.skipNewlines();
      
      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.AI_DIRECTIVE)) {
          const directive = this.aiDirective();
          metadata.directives.push(directive);
          this.skipNewlines();
          continue;
        }
        
        if (this.match(TokenType.NEWLINE)) {
          continue;
        }
        
        // Parse endpoint definitions or natural language
        const expr = this.naturalLanguageExpression();
        if (expr) {
          // For simplicity, treat all expressions as endpoint descriptions
          endpoints.push({
            method: 'POST', // Default method
            path: `/${name.toLowerCase()}`,
            description: (expr as any).text
          });
        }
        
        this.skipNewlines();
      }
      
      this.consumeWithRecovery(TokenType.CLOSE_BRACE, "Expected '}' after API body");
      
    } catch (error) {
      metadata.hasErrors = true;
      this.addError(`Error parsing API '${name}': ${(error as Error).message}`);
    }
    
    return {
      type: 'APIDeclaration',
      name,
      endpoints,
      metadata
    } as any;
  }
}
