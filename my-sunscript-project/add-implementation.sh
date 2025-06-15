#!/bin/bash

# This script adds the minimal implementation to get SunScript compiler working

echo "🚀 Adding minimal SunScript implementation..."

# 1. Implement the Lexer
cat > src/lexer/Token.ts << 'EOF'
import { Token as IToken, TokenType, Position } from '../types';

export class Token implements IToken {
  constructor(
    public type: TokenType,
    public value: string,
    public position: Position,
    public raw?: string
  ) {}

  toString(): string {
    return `Token(${this.type}, ${this.value}, ${this.position.line}:${this.position.column})`;
  }
}
EOF

cat > src/lexer/LexerError.ts << 'EOF'
import { Position } from '../types';

export class LexerError extends Error {
  constructor(message: string, public position: Position) {
    super(`Lexer Error at ${position.line}:${position.column}: ${message}`);
    this.name = 'LexerError';
  }
}
EOF

cat > src/lexer/patterns.ts << 'EOF'
export const patterns = {
  whitespace: /^[ \t]+/,
  newline: /^\n/,
  comment: /^\/\/.*$/m,
  aiQuestion: /^\?\?/,
  directive: /^@[a-zA-Z]+/,
  number: /^\d+(\.\d+)?/,
  string: /^["']([^"'\\]|\\.)*["']/,
  identifier: /^[a-zA-Z_][a-zA-Z0-9_]*/,
  openBrace: /^\{/,
  closeBrace: /^\}/,
  colon: /^:/,
  markdown: {
    header: /^#{1,6}\s+.*/,
    listItem: /^-\s+.*/
  }
};
EOF

# 2. Implement minimal Lexer
cat > src/lexer/Lexer.ts << 'EOF'
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
EOF

# 3. Implement minimal Parser
cat > src/parser/ParserError.ts << 'EOF'
import { Position } from '../types';

export class ParserError extends Error {
  constructor(message: string, public position?: Position) {
    super(`Parser Error${position ? ` at ${position.line}:${position.column}` : ''}: ${message}`);
    this.name = 'ParserError';
  }
}
EOF

cat > src/parser/Parser.ts << 'EOF'
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
EOF

# 4. Implement AI Provider base
cat > src/ai/AIProvider.ts << 'EOF'
import { AIContext, AIResponse, GenerationOptions } from '../types';

export abstract class AIProvider {
  protected config: Record<string, any>;

  constructor(config: Record<string, any> = {}) {
    this.config = config;
  }

  abstract generateCode(
    prompt: string, 
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse>;

  abstract validateConfiguration(): Promise<boolean>;

  abstract getModelInfo(): {
    name: string;
    version: string;
    capabilities: string[];
  };

  protected buildSystemPrompt(context: AIContext): string {
    return `You are SunScript, an AI-native programming language compiler.
    
Generate production-ready ${context.targetLanguage} code that follows best practices.
Include comprehensive error handling, security measures, and performance optimizations.
The code should be well-commented and maintainable.

Context:
- Target Language: ${context.targetLanguage}
- Domain: ${context.domain || 'general'}
- Project: ${context.projectName || 'unknown'}`;
  }
}
EOF

# 5. Implement minimal Code Generator
cat > src/generator/CodeGenerator.ts << 'EOF'
import { AIProvider } from '../ai/AIProvider';
import { Program, CompilationResult, AIContext } from '../types';

export class CodeGenerator {
  constructor(
    private aiProvider: AIProvider,
    private config: any = {}
  ) {}

  async generate(ast: Program, context: AIContext): Promise<CompilationResult> {
    const result: CompilationResult = {
      code: {},
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        targetLanguage: context.targetLanguage,
        optimizations: [],
        warnings: []
      }
    };

    // Process each declaration
    for (const node of ast.body) {
      if (node.type === 'FunctionDeclaration') {
        const funcNode = node as any;
        const prompt = this.buildFunctionPrompt(funcNode, context);
        
        try {
          const response = await this.aiProvider.generateCode(prompt, context);
          result.code[funcNode.name] = response.code;
        } catch (error: any) {
          result.metadata.warnings.push({
            message: `Failed to generate ${funcNode.name}: ${error.message}`,
            severity: 'error'
          });
        }
      }
    }

    return result;
  }

  private buildFunctionPrompt(node: any, context: AIContext): string {
    let prompt = `Generate a ${context.targetLanguage} function named "${node.name}" that:\n\n`;
    
    // Add natural language requirements
    for (const expr of node.body) {
      if (expr.type === 'NaturalLanguageExpression') {
        prompt += `- ${expr.text}\n`;
      }
    }
    
    // Add AI questions as additional context
    if (node.metadata.aiQuestions && node.metadata.aiQuestions.length > 0) {
      prompt += '\nAdditional considerations:\n';
      for (const question of node.metadata.aiQuestions) {
        prompt += `- ${question}\n`;
      }
    }
    
    prompt += '\nGenerate only the function code, no explanations.';
    
    return prompt;
  }
}
EOF

# 6. Implement the Compiler
cat > src/compiler/Compiler.ts << 'EOF'
import { EventEmitter } from 'events';
import { Lexer } from '../lexer/Lexer';
import { Parser } from '../parser/Parser';
import { CodeGenerator } from '../generator/CodeGenerator';
import { CompilerConfig, CompilationResult, AIContext } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class SunScriptCompiler extends EventEmitter {
  private generator: CodeGenerator;

  constructor(private config: CompilerConfig) {
    super();
    
    if (!this.config.aiProvider) {
      throw new Error('AI Provider is required');
    }
    
    this.generator = new CodeGenerator(this.config.aiProvider, {
      targetLanguage: this.config.targetLanguage
    });
  }

  async compileFile(filePath: string): Promise<CompilationResult> {
    this.emit('compile:start', { file: filePath });
    
    try {
      const source = await fs.readFile(filePath, 'utf-8');
      const result = await this.compile(source, {
        filePath,
        fileName: path.basename(filePath, '.sun')
      });
      
      await this.writeOutput(filePath, result);
      
      this.emit('compile:success', { file: filePath, result });
      return result;
      
    } catch (error) {
      this.emit('compile:error', { file: filePath, error });
      throw error;
    }
  }

  async compile(source: string, metadata: any = {}): Promise<CompilationResult> {
    // Lexical analysis
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    // Parsing
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // Create AI context
    const context: AIContext = {
      targetLanguage: this.config.targetLanguage,
      projectName: metadata.projectName || 'sunscript-project',
      fileName: metadata.fileName,
      filePath: metadata.filePath,
      domain: this.config.domain
    };
    
    // Code generation
    const result = await this.generator.generate(ast, context);
    
    return result;
  }

  private async writeOutput(inputPath: string, result: CompilationResult): Promise<void> {
    const outputDir = this.config.outputDir;
    const baseName = path.basename(inputPath, '.sun');
    const ext = this.getFileExtension();
    
    await fs.mkdir(outputDir, { recursive: true });
    
    for (const [name, code] of Object.entries(result.code)) {
      const outputPath = path.join(outputDir, `${baseName}.${name}.${ext}`);
      await fs.writeFile(outputPath, code, 'utf-8');
    }
  }

  private getFileExtension(): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py'
    };
    
    return extensions[this.config.targetLanguage] || 'js';
  }
}
EOF

# 7. Implement OpenAI Provider
cat > src/ai/providers/OpenAIProvider.ts << 'EOF'
import { AIProvider } from '../AIProvider';
import { AIContext, AIResponse, GenerationOptions } from '../../types';

export class OpenAIProvider extends AIProvider {
  private openai: any;

  constructor(config: { apiKey?: string; model?: string } = {}) {
    super(config);
    
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Dynamic import to handle optional dependency
    try {
      const OpenAI = require('openai');
      this.openai = new OpenAI({ apiKey });
    } catch (error) {
      throw new Error('OpenAI package not installed. Run: npm install openai');
    }
    
    this.config.model = config.model || 'gpt-4-turbo-preview';
  }

  async generateCode(
    prompt: string,
    context: AIContext,
    options?: GenerationOptions
  ): Promise<AIResponse> {
    const completion = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(context)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2000
    });

    return {
      code: completion.choices[0].message.content || '',
      model: this.config.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      }
    };
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const models = await this.openai.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  getModelInfo() {
    return {
      name: 'OpenAI',
      version: this.config.model,
      capabilities: ['code-generation', 'natural-language']
    };
  }
}
EOF

# 8. Create a simple CLI
cat > src/cli/CLI.ts << 'EOF'
import { Command } from 'commander';
import * as path from 'path';

export class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('sunscript')
      .description('SunScript - AI-Native Programming Language Compiler')
      .version('1.0.0');

    this.program
      .command('compile <input>')
      .description('Compile SunScript file')
      .option('-o, --output <dir>', 'Output directory', './dist')
      .option('-t, --target <language>', 'Target language', 'javascript')
      .action(async (input, options) => {
        const { SunScriptCompiler } = await import('../compiler/Compiler');
        const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider');
        
        const compiler = new SunScriptCompiler({
          outputDir: options.output,
          targetLanguage: options.target,
          aiProvider: new OpenAIProvider()
        });
        
        try {
          console.log(`Compiling ${input}...`);
          const result = await compiler.compileFile(input);
          console.log(`✅ Successfully compiled to ${options.output}`);
          
          if (result.metadata.warnings.length > 0) {
            console.log('\nWarnings:');
            result.metadata.warnings.forEach(w => 
              console.log(`  - ${w.message}`)
            );
          }
        } catch (error: any) {
          console.error(`❌ Compilation failed: ${error.message}`);
          process.exit(1);
        }
      });
  }

  public async run(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }
}
EOF

# 9. Update the bin file to use ts-node for development
cat > bin/sunscript << 'EOF'
#!/usr/bin/env node
require('ts-node/register');
require('../src/cli/CLI').CLI.prototype.run.call(new (require('../src/cli/CLI').CLI)(), process.argv);
EOF

chmod +x bin/sunscript

# 10. Create a test file
cat > test-compile.ts << 'EOF'
import { SunScriptCompiler } from './src/compiler/Compiler';
import { OpenAIProvider } from './src/ai/providers/OpenAIProvider';

async function test() {
  const compiler = new SunScriptCompiler({
    outputDir: './dist',
    targetLanguage: 'javascript',
    aiProvider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview'
    })
  });

  try {
    console.log('Compiling hello-world.sun...');
    const result = await compiler.compileFile('examples/hello-world.sun');
    console.log('Success!', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
EOF

echo "✅ Minimal implementation added successfully!"
echo ""
echo "Next steps:"
echo "1. Set up your .env file with your OpenAI API key:"
echo "   echo 'OPENAI_API_KEY=sk-your-key-here' > .env"
echo ""
echo "2. Test the compiler:"
echo "   npx ts-node test-compile.ts"
echo ""
echo "3. Or use the CLI:"
echo "   npm run build"
echo "   ./bin/sunscript compile examples/hello-world.sun"
EOF