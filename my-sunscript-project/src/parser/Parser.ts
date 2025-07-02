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
        if (directive === 'syntax') {
          if (this.check(TokenType.TEXT)) {
            const value = this.advance().value.toLowerCase();
            if (value === 'flex') {
              program.metadata.syntaxMode = 'flex';
            }
          } else if (this.check(TokenType.STRING)) {
            const value = this.advance().value.toLowerCase();
            if (value === 'flex') {
              program.metadata.syntaxMode = 'flex';
            }
          } else if (this.check(TokenType.IDENTIFIER)) {
            const value = this.advance().value.toLowerCase();
            if (value === 'flex' || value === 'standard') {
              program.metadata.syntaxMode = value as 'flex' | 'standard';
            }
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
    
    // Import statements
    if (this.match(TokenType.IMPORT)) {
      return this.importStatement();
    }
    
    // Core declarations
    if (this.match(TokenType.FUNCTION)) {
      return this.functionDeclaration();
    }
    
    if (this.match(TokenType.COMPONENT)) {
      return this.componentDeclaration();
    }
    
    if (this.match(TokenType.APP)) {
      return this.appDeclaration();
    }
    
    if (this.match(TokenType.API)) {
      return this.apiDeclaration();
    }
    
    // AI Compilation blocks
    if (this.match(TokenType.AI_COMPILE)) {
      return this.aiCompileBlock();
    }
    
    // Directives
    if (this.match(TokenType.AI_DIRECTIVE)) {
      return this.aiDirective();
    }

    // Handle unknown tokens with error recovery
    const token = this.peek();
    if (!this.isAtEnd()) {
      const error = this.errorRecovery.addError(
        `Unexpected token '${token.value}' at top level`,
        token,
        [TokenType.FUNCTION, TokenType.COMPONENT, TokenType.APP, TokenType.IMPORT, TokenType.AI_DIRECTIVE],
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
          } else if (this.match(TokenType.AI_COMPILE)) {
            // Handle inline AI compilation block
            const aiBlock = this.aiCompileBlock();
            body.push(aiBlock);
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
              [TokenType.TEXT, TokenType.AI_QUESTION, TokenType.AI_COMPILE, TokenType.CLOSE_BRACE],
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
    } else if (this.check(TokenType.STRING)) {
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
        
        if (this.match(TokenType.AI_COMPILE)) {
          // Handle inline AI compilation block
          const aiBlock = this.aiCompileBlock();
          body.push(aiBlock);
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

  private importStatement(): ASTNode {
    this.updateContext('import');
    
    const specifiers: any[] = [];
    let source = '';
    
    try {
      // Parse import specifier (e.g., ComponentName)
      if (this.check(TokenType.IDENTIFIER)) {
        const name = this.advance().value;
        specifiers.push({
          type: 'ImportDefaultSpecifier',
          local: name
        });
      }
      
      // Check if we have 'from' keyword
      if (this.check(TokenType.FROM)) {
        this.advance();
        
        // Parse source path
        if (this.check(TokenType.STRING)) {
          source = this.advance().value;
        } else if (this.check(TokenType.TEXT)) {
          // Handle unquoted paths
          source = this.advance().value;
        }
      } else {
        // Handle cases where 'from' is part of another token
        // Look for any remaining tokens on this line
        while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
          const token = this.advance();
          if (token.type === TokenType.TEXT || token.type === TokenType.STRING) {
            // Extract source from text like 'from "./path"'
            const text = token.value;
            const fromMatch = text.match(/from\s+["'](.+)["']/);
            if (fromMatch) {
              source = fromMatch[1];
            } else if (text.startsWith('"') || text.startsWith("'")) {
              source = text.replace(/["']/g, '');
            }
          }
        }
      }
      
    } catch (error) {
      this.addError(`Error parsing import statement: ${(error as Error).message}`);
    }
    
    return {
      type: 'ImportStatement',
      specifiers,
      source
    } as any;
  }

  private appDeclaration(): ASTNode {
    this.updateContext('app');
    
    let name = 'unknown';
    const body: any[] = [];
    const metadata: any = {
      title: '',
      description: '',
      pages: [],
      routes: {},
      config: {},
      directives: [],
      hasErrors: false
    };
    
    try {
      const nameToken = this.consumeWithRecovery(TokenType.IDENTIFIER, "Expected app name");
      if (nameToken) {
        name = nameToken.value;
      }
      
      this.consumeWithRecovery(TokenType.OPEN_BRACE, "Expected '{' after app name");
      this.skipNewlines();
      
      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        this.skipNewlines();
        
        if (this.match(TokenType.COMPONENT)) {
          // Parse inline component
          const component = this.componentDeclaration();
          body.push(component);
        } else if (this.match(TokenType.STATE)) {
          // Parse state block
          const state = this.stateDeclaration();
          body.push(state);
        } else if (this.match(TokenType.ROUTES)) {
          // Parse routes block
          const routes = this.routesDeclaration();
          metadata.routes = routes;
        } else if (this.match(TokenType.STYLES)) {
          // Parse styles block
          const styles = this.stylesDeclaration();
          body.push(styles);
        } else if (this.match(TokenType.AI_COMPILE)) {
          // Handle inline AI compilation block
          const aiBlock = this.aiCompileBlock();
          body.push(aiBlock);
        } else if (this.match(TokenType.IDENTIFIER)) {
          // Handle property assignments like title:, description:, etc.
          const key = this.previous().value;
          if (this.match(TokenType.COLON)) {
            const value = this.parseValue();
            metadata[key] = value;
          }
        } else if (this.match(TokenType.TEXT)) {
          // Natural language content
          body.push({
            type: 'NaturalLanguageExpression',
            text: this.previous().value
          });
        } else if (!this.match(TokenType.NEWLINE)) {
          // Skip unknown token
          this.advance();
        }
        
        this.skipNewlines();
      }
      
      this.consumeWithRecovery(TokenType.CLOSE_BRACE, "Expected '}' after app body");
      
    } catch (error) {
      metadata.hasErrors = true;
      this.addError(`Error parsing app '${name}': ${(error as Error).message}`);
    }
    
    return {
      type: 'AppDeclaration',
      name,
      body,
      metadata
    } as any;
  }

  private stateDeclaration(): ASTNode {
    this.updateContext('state');
    
    const properties: any[] = [];
    
    try {
      this.consumeWithRecovery(TokenType.OPEN_BRACE, "Expected '{' after 'state'");
      this.skipNewlines();
      
      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.IDENTIFIER)) {
          const name = this.previous().value;
          let type = 'any';
          let initialValue = null;
          
          if (this.match(TokenType.COLON)) {
            // Parse type
            if (this.check(TokenType.IDENTIFIER)) {
              type = this.advance().value;
            }
            
            if (this.match(TokenType.EQUALS)) {
              // Parse initial value
              initialValue = this.parseValue();
            }
          }
          
          properties.push({ name, type, initialValue });
        }
        
        this.skipNewlines();
      }
      
      this.consumeWithRecovery(TokenType.CLOSE_BRACE, "Expected '}' after state body");
      
    } catch (error) {
      this.addError(`Error parsing state declaration: ${(error as Error).message}`);
    }
    
    return {
      type: 'StateDeclaration',
      properties
    } as any;
  }

  private routesDeclaration(): any {
    this.updateContext('routes');
    
    const routes: any = {};
    
    try {
      this.consumeWithRecovery(TokenType.OPEN_BRACE, "Expected '{' after 'routes'");
      this.skipNewlines();
      
      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.STRING)) {
          const path = this.previous().value;
          
          if (this.match(TokenType.COLON)) {
            if (this.check(TokenType.IDENTIFIER)) {
              // Route to component
              routes[path] = { component: this.advance().value };
            } else if (this.check(TokenType.TEXT)) {
              // Parse route action or redirect
              const value = this.advance().value;
              if (value.startsWith('redirect(')) {
                routes[path] = { redirect: value.slice(9, -1) };
              } else if (value.startsWith('action(')) {
                routes[path] = { action: value.slice(7, -1) };
              }
            }
          }
        }
        
        this.skipNewlines();
        this.match(TokenType.COMMA); // Optional comma
      }
      
      this.consumeWithRecovery(TokenType.CLOSE_BRACE, "Expected '}' after routes body");
      
    } catch (error) {
      this.addError(`Error parsing routes declaration: ${(error as Error).message}`);
    }
    
    return routes;
  }

  private stylesDeclaration(): ASTNode {
    this.updateContext('styles');
    
    const rules: any[] = [];
    
    try {
      this.consumeWithRecovery(TokenType.OPEN_BRACE, "Expected '{' after 'styles'");
      this.skipNewlines();
      
      // For now, treat styles as natural language content
      // In a full implementation, we would parse CSS rules
      const styleContent: string[] = [];
      while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.TEXT) || this.match(TokenType.IDENTIFIER)) {
          styleContent.push(this.previous().value);
        } else if (!this.match(TokenType.NEWLINE)) {
          this.advance();
        }
      }
      
      this.consumeWithRecovery(TokenType.CLOSE_BRACE, "Expected '}' after styles body");
      
      return {
        type: 'StylesDeclaration',
        rules: [{
          selector: 'body',
          declarations: [{
            property: 'content',
            value: styleContent.join(' ')
          }]
        }]
      } as any;
      
    } catch (error) {
      this.addError(`Error parsing styles declaration: ${(error as Error).message}`);
      return {
        type: 'StylesDeclaration',
        rules: []
      } as any;
    }
  }

  private parseValue(): any {
    if (this.match(TokenType.STRING)) {
      return this.previous().value;
    }
    if (this.match(TokenType.NUMBER)) {
      return parseFloat(this.previous().value);
    }
    if (this.match(TokenType.IDENTIFIER)) {
      const value = this.previous().value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    }
    if (this.match(TokenType.OPEN_BRACKET)) {
      // Parse array
      const items: any[] = [];
      while (!this.check(TokenType.CLOSE_BRACKET) && !this.isAtEnd()) {
        if (this.match(TokenType.OPEN_BRACE)) {
          // Parse object in array
          const obj = this.parseObject();
          items.push(obj);
        } else {
          items.push(this.parseValue());
        }
        this.match(TokenType.COMMA);
        this.skipNewlines();
      }
      this.consumeWithRecovery(TokenType.CLOSE_BRACKET, "Expected ']'");
      return items;
    }
    if (this.match(TokenType.OPEN_BRACE)) {
      return this.parseObject();
    }
    return null;
  }

  private parseObject(): any {
    const obj: any = {};
    this.skipNewlines();
    
    while (!this.check(TokenType.CLOSE_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.IDENTIFIER)) {
        const key = this.previous().value;
        if (this.match(TokenType.COLON)) {
          obj[key] = this.parseValue();
        }
      }
      this.match(TokenType.COMMA);
      this.skipNewlines();
    }
    
    this.consumeWithRecovery(TokenType.CLOSE_BRACE, "Expected '}'");
    return obj;
  }
  
  private aiCompileBlock(): ASTNode {
    this.updateContext('ai-compile');
    
    // Expect opening brace
    this.consumeWithRecovery(TokenType.OPEN_BRACE, "Expected '{' after @ai");
    this.skipNewlines();
    
    // Collect all content until closing brace as natural language description
    const contentParts: string[] = [];
    let braceDepth = 1;
    
    while (!this.isAtEnd() && braceDepth > 0) {
      const token = this.peek();
      
      if (token.type === TokenType.OPEN_BRACE) {
        braceDepth++;
        contentParts.push(this.advance().value);
      } else if (token.type === TokenType.CLOSE_BRACE) {
        braceDepth--;
        if (braceDepth > 0) {
          contentParts.push(this.advance().value);
        } else {
          this.advance(); // Consume the closing brace
        }
      } else if (token.type === TokenType.NEWLINE) {
        contentParts.push('\n');
        this.advance();
      } else {
        // Any other token - add its value
        contentParts.push(this.advance().value);
      }
    }
    
    const description = contentParts.join(' ').trim();
    
    return {
      type: 'AICompileBlock',
      description,
      inline: true,
      targetLanguage: 'auto' // Will be determined by context
    } as any;
  }
}
