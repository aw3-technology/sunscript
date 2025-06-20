import { Token, TokenType, Position } from '../types';
import { SunScriptError, ErrorCode } from '../errors/SunScriptError';

export interface ParseError {
  message: string;
  position: Position;
  token: Token;
  expected?: TokenType[];
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
  errorCode: string;
  context: ParseContext;
}

export interface ParseContext {
  currentConstruct: string;
  enclosingConstructs: string[];
  nearbyTokens: Token[];
  lineContent: string;
}

export interface RecoveryResult {
  recovered: boolean;
  newPosition: number;
  errors: ParseError[];
  partialAST?: any;
}

export class ErrorRecovery {
  private errors: ParseError[] = [];
  private tokens: Token[];
  private sourceLines: string[];

  constructor(tokens: Token[], sourceCode: string) {
    this.tokens = tokens;
    this.sourceLines = sourceCode.split('\n');
  }

  /**
   * Synchronization points for error recovery
   */
  static readonly SYNC_POINTS: TokenType[] = [
    TokenType.FUNCTION,
    TokenType.COMPONENT,
    TokenType.AI_DIRECTIVE,
    TokenType.OPEN_BRACE,
    TokenType.CLOSE_BRACE,
    TokenType.NEWLINE
  ];

  /**
   * Add a parse error with enhanced information
   */
  addError(
    message: string,
    token: Token,
    expected?: TokenType[],
    context: Partial<ParseContext> = {}
  ): ParseError {
    const suggestions = this.generateSuggestions(message, token, expected, context);
    const fullContext = this.buildContext(token, context);
    
    const error: ParseError = {
      message,
      position: token.position,
      token,
      expected,
      suggestions,
      severity: 'error',
      errorCode: this.categorizeError(message, token),
      context: fullContext
    };

    this.errors.push(error);
    return error;
  }

  /**
   * Attempt to recover from an error and continue parsing
   */
  recover(currentPosition: number, context: Partial<ParseContext> = {}): RecoveryResult {
    const result: RecoveryResult = {
      recovered: false,
      newPosition: currentPosition,
      errors: []
    };

    // Try different recovery strategies
    const strategies = [
      () => this.recoverToSyncPoint(currentPosition),
      () => this.recoverByInsertion(currentPosition, context),
      () => this.recoverByDeletion(currentPosition),
      () => this.recoverBySubstitution(currentPosition, context),
      () => this.recoverToNextStatement(currentPosition)
    ];

    for (const strategy of strategies) {
      const recoveryAttempt = strategy();
      if (recoveryAttempt.recovered) {
        return recoveryAttempt;
      }
    }

    // Last resort: skip to next line
    return this.recoverToNextLine(currentPosition);
  }

  /**
   * Recover to the next synchronization point
   */
  private recoverToSyncPoint(currentPosition: number): RecoveryResult {
    let position = currentPosition;
    
    while (position < this.tokens.length) {
      const token = this.tokens[position];
      
      if (ErrorRecovery.SYNC_POINTS.includes(token.type)) {
        return {
          recovered: true,
          newPosition: position,
          errors: []
        };
      }
      
      position++;
    }

    return { recovered: false, newPosition: currentPosition, errors: [] };
  }

  /**
   * Recover by inserting missing tokens
   */
  private recoverByInsertion(currentPosition: number, context: Partial<ParseContext>): RecoveryResult {
    const token = this.tokens[currentPosition];
    
    // Common insertion scenarios
    if (context.currentConstruct === 'function') {
      if (token.type === TokenType.TEXT && !this.hasSeenOpenBrace(currentPosition)) {
        // Missing opening brace after function name
        return {
          recovered: true,
          newPosition: currentPosition,
          errors: [{
            message: "Missing '{' after function name",
            position: token.position,
            token,
            expected: [TokenType.OPEN_BRACE],
            suggestions: ["Add '{' after the function name"],
            severity: 'error',
            errorCode: 'MISSING_OPEN_BRACE',
            context: this.buildContext(token, context)
          }]
        };
      }
    }

    if (context.currentConstruct === 'component') {
      // Similar logic for components
      if (token.type === TokenType.TEXT && !this.hasSeenOpenBrace(currentPosition)) {
        return {
          recovered: true,
          newPosition: currentPosition,
          errors: [{
            message: "Missing '{' after component name",
            position: token.position,
            token,
            expected: [TokenType.OPEN_BRACE],
            suggestions: ["Add '{' after the component name"],
            severity: 'error',
            errorCode: 'MISSING_OPEN_BRACE',
            context: this.buildContext(token, context)
          }]
        };
      }
    }

    return { recovered: false, newPosition: currentPosition, errors: [] };
  }

  /**
   * Recover by deleting unexpected tokens
   */
  private recoverByDeletion(currentPosition: number): RecoveryResult {
    const token = this.tokens[currentPosition];
    
    // Skip unexpected tokens that are clearly wrong
    if (this.isUnexpectedToken(token, currentPosition)) {
      return {
        recovered: true,
        newPosition: currentPosition + 1,
        errors: [{
          message: `Unexpected token '${token.value}'`,
          position: token.position,
          token,
          suggestions: [`Remove '${token.value}'`, "Check for typos in keywords"],
          severity: 'error',
          errorCode: 'UNEXPECTED_TOKEN',
          context: this.buildContext(token)
        }]
      };
    }

    return { recovered: false, newPosition: currentPosition, errors: [] };
  }

  /**
   * Recover by substituting incorrect tokens
   */
  private recoverBySubstitution(currentPosition: number, context: Partial<ParseContext>): RecoveryResult {
    const token = this.tokens[currentPosition];
    
    // Check for common misspellings and substitutions
    const substitutions = this.findPossibleSubstitutions(token, context);
    
    if (substitutions.length > 0) {
      return {
        recovered: true,
        newPosition: currentPosition + 1,
        errors: [{
          message: `Possible misspelling: '${token.value}'`,
          position: token.position,
          token,
          suggestions: substitutions,
          severity: 'error',
          errorCode: 'POSSIBLE_MISSPELLING',
          context: this.buildContext(token, context)
        }]
      };
    }

    return { recovered: false, newPosition: currentPosition, errors: [] };
  }

  /**
   * Recover to the next statement
   */
  private recoverToNextStatement(currentPosition: number): RecoveryResult {
    let position = currentPosition;
    
    // Skip to next newline or synchronization point
    while (position < this.tokens.length) {
      const token = this.tokens[position];
      
      if (token.type === TokenType.NEWLINE || 
          ErrorRecovery.SYNC_POINTS.includes(token.type)) {
        return {
          recovered: true,
          newPosition: position + (token.type === TokenType.NEWLINE ? 1 : 0),
          errors: []
        };
      }
      
      position++;
    }

    return { recovered: false, newPosition: currentPosition, errors: [] };
  }

  /**
   * Recover to the next line (last resort)
   */
  private recoverToNextLine(currentPosition: number): RecoveryResult {
    const token = this.tokens[currentPosition];
    let position = currentPosition;
    
    // Skip to next line
    while (position < this.tokens.length && 
           this.tokens[position].position.line === token.position.line) {
      position++;
    }

    return {
      recovered: true,
      newPosition: position,
      errors: [{
        message: `Skipping to next line due to parse error`,
        position: token.position,
        token,
        suggestions: ["Check syntax on this line"],
        severity: 'error',
        errorCode: 'LINE_SKIPPED',
        context: this.buildContext(token)
      }]
    };
  }

  /**
   * Generate helpful error suggestions
   */
  private generateSuggestions(
    message: string, 
    token: Token, 
    expected?: TokenType[], 
    context: Partial<ParseContext> = {}
  ): string[] {
    const suggestions: string[] = [];

    // Suggestions based on expected tokens
    if (expected) {
      for (const expectedType of expected) {
        switch (expectedType) {
          case TokenType.OPEN_BRACE:
            suggestions.push("Add '{' to start the block");
            break;
          case TokenType.CLOSE_BRACE:
            suggestions.push("Add '}' to close the block");
            break;
          case TokenType.TEXT:
            suggestions.push("Provide a name or description");
            break;
          case TokenType.FUNCTION:
            suggestions.push("Start with 'function' keyword");
            break;
          case TokenType.COMPONENT:
            suggestions.push("Start with 'component' keyword");
            break;
        }
      }
    }

    // Context-specific suggestions
    if (context.currentConstruct) {
      switch (context.currentConstruct) {
        case 'function':
          suggestions.push("Check function syntax: function name { ... }");
          break;
        case 'component':
          suggestions.push("Check component syntax: component name { ... }");
          break;
        case 'ai_directive':
          suggestions.push("Check directive syntax: @directive value");
          break;
      }
    }

    // Common SunScript patterns
    if (token.type === TokenType.TEXT) {
      const text = token.value.toLowerCase();
      
      if (text.includes('function') && !text.startsWith('function')) {
        suggestions.push("Did you mean to start with 'function'?");
      }
      
      if (text.includes('component') && !text.startsWith('component')) {
        suggestions.push("Did you mean to start with 'component'?");
      }
      
      if (text.includes('if') || text.includes('when')) {
        suggestions.push("Use natural language conditions");
      }
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push("Check the syntax and structure");
      suggestions.push("Refer to SunScript documentation");
    }

    return suggestions;
  }

  /**
   * Build context information for errors
   */
  private buildContext(token: Token, partial: Partial<ParseContext> = {}): ParseContext {
    const nearbyTokens = this.getNearbyTokens(token);
    const lineContent = this.getLineContent(token.position.line);

    return {
      currentConstruct: partial.currentConstruct || 'unknown',
      enclosingConstructs: partial.enclosingConstructs || [],
      nearbyTokens,
      lineContent,
      ...partial
    };
  }

  /**
   * Get tokens near the error position
   */
  private getNearbyTokens(token: Token): Token[] {
    const tokenIndex = this.tokens.indexOf(token);
    const start = Math.max(0, tokenIndex - 2);
    const end = Math.min(this.tokens.length, tokenIndex + 3);
    return this.tokens.slice(start, end);
  }

  /**
   * Get the content of a specific line
   */
  private getLineContent(lineNumber: number): string {
    return this.sourceLines[lineNumber - 1] || '';
  }

  /**
   * Check if we've seen an opening brace recently
   */
  private hasSeenOpenBrace(currentPosition: number): boolean {
    for (let i = Math.max(0, currentPosition - 5); i < currentPosition; i++) {
      if (this.tokens[i].type === TokenType.OPEN_BRACE) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a token is clearly unexpected
   */
  private isUnexpectedToken(token: Token, position: number): boolean {
    // Look for obviously wrong tokens
    const unexpectedPatterns = [
      /^[{}()[\]]+$/, // Excessive brackets
      /^[!@#$%^&*]+$/, // Special characters
      /^\d+$/ // Standalone numbers in wrong context
    ];

    return unexpectedPatterns.some(pattern => pattern.test(token.value));
  }

  /**
   * Find possible substitutions for misspelled tokens
   */
  private findPossibleSubstitutions(token: Token, context: Partial<ParseContext>): string[] {
    const suggestions: string[] = [];
    const value = token.value.toLowerCase();

    // Common SunScript keywords and their misspellings
    const keywordMap = new Map([
      ['function', ['fucntion', 'funtion', 'funciton', 'func']],
      ['component', ['compnent', 'componet', 'compoment']],
      ['when', ['wen', 'whn']],
      ['then', ['thn', 'ten']],
      ['else', ['els', 'esle']],
      ['return', ['retrun', 'retrn']]
    ]);

    for (const [correct, misspellings] of keywordMap) {
      if (misspellings.includes(value)) {
        suggestions.push(`Did you mean '${correct}'?`);
      }
    }

    // Levenshtein distance for fuzzy matching
    if (suggestions.length === 0) {
      const keywords = Array.from(keywordMap.keys());
      const closeMatches = keywords.filter(keyword => 
        this.levenshteinDistance(value, keyword) <= 2
      );
      
      closeMatches.forEach(match => {
        suggestions.push(`Did you mean '${match}'?`);
      });
    }

    return suggestions;
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Categorize errors for better reporting
   */
  private categorizeError(message: string, token: Token): string {
    if (message.includes('Expected')) return 'EXPECTED_TOKEN';
    if (message.includes('Unexpected')) return 'UNEXPECTED_TOKEN';
    if (message.includes('Missing')) return 'MISSING_TOKEN';
    if (message.includes('function')) return 'FUNCTION_ERROR';
    if (message.includes('component')) return 'COMPONENT_ERROR';
    if (message.includes('directive')) return 'DIRECTIVE_ERROR';
    return 'GENERAL_SYNTAX_ERROR';
  }

  /**
   * Get all collected errors
   */
  getErrors(): ParseError[] {
    return this.errors;
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }
}