# SunScript Compiler Architecture

## Overview

The SunScript compiler is a sophisticated multi-stage compilation system that transforms natural language programming constructs into efficient code in target languages. It combines traditional compiler techniques with AI-powered code generation to bridge the gap between human intent and executable code.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Source Code   │    │   Lexical       │    │   Syntax        │
│   (.sun files)  │───▶│   Analysis      │───▶│   Analysis      │
│                 │    │   (Lexer)       │    │   (Parser)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Generated     │    │   Code          │    │   AI Analysis  │
│   Code Output   │◀───│   Generation    │◀───│   & Planning    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Lexical Analysis (Lexer)

**Location**: `src/lexer/`

The lexer tokenizes SunScript source code, handling both structured syntax and natural language text.

#### Key Features:
- **Multi-mode tokenization**: Handles keywords, natural language, and AI directives
- **Error recovery**: Continues processing despite invalid characters
- **Unicode support**: Properly handles international characters
- **Position tracking**: Maintains line/column information for error reporting

#### Token Types:
```typescript
enum TokenType {
  // Keywords
  FUNCTION = 'FUNCTION',
  COMPONENT = 'COMPONENT',
  WHEN = 'WHEN',
  THEN = 'THEN',
  
  // Natural language
  TEXT = 'TEXT',
  
  // AI directives
  AI_DIRECTIVE = 'AI_DIRECTIVE',
  AI_QUESTION = 'AI_QUESTION',
  
  // Punctuation
  OPEN_BRACE = 'OPEN_BRACE',
  CLOSE_BRACE = 'CLOSE_BRACE',
  NEWLINE = 'NEWLINE',
  
  // Special
  EOF = 'EOF'
}
```

#### Error Recovery:
- Detects and recovers from invalid characters
- Provides suggestions for common mistakes
- Continues tokenization after errors

### 2. Syntax Analysis (Parser)

**Location**: `src/parser/`

The parser builds an Abstract Syntax Tree (AST) from tokens, with advanced error recovery capabilities.

#### Parser Features:
- **Error recovery**: Multiple strategies for handling syntax errors
- **Incremental parsing**: Supports partial compilation for IDE integration
- **Natural language support**: Preserves natural language context
- **AST generation**: Creates structured representation of code

#### Error Recovery Strategies:
1. **Synchronization points**: Recover to known good states
2. **Token insertion**: Add missing tokens
3. **Token deletion**: Skip unexpected tokens
4. **Token substitution**: Fix common misspellings
5. **Statement recovery**: Skip to next statement

#### AST Structure:
```typescript
interface Program {
  type: 'Program';
  body: ASTNode[];
  metadata: {
    version: string;
    parseErrors?: ParseError[];
  };
}

interface FunctionDeclaration {
  type: 'FunctionDeclaration';
  name: string;
  body: Expression[];
  metadata: {
    aiQuestions: string[];
    directives: AIDirective[];
    hasErrors: boolean;
  };
}
```

### 3. AI Analysis & Planning

**Location**: `src/ai/`

The AI analysis stage processes natural language constructs and plans code generation.

#### AI Provider Architecture:
```typescript
interface AIProvider {
  generateCode(prompt: string, context: AIContext): Promise<AIResponse>;
  analyzeIntent(naturalLanguage: string): Promise<IntentAnalysis>;
  optimizeCode(code: string, directives: string[]): Promise<string>;
}
```

#### Supported Providers:
- **OpenAI GPT-4**: Production-ready, high-quality generation
- **Anthropic Claude**: Alternative with different strengths
- **Local LLM**: Privacy-focused local processing
- **Mock Provider**: Testing and development

#### AI Context Management:
```typescript
interface AIContext {
  targetLanguage: TargetLanguage;
  projectName: string;
  fileName?: string;
  filePath?: string;
  domain?: string;
  existingCode?: string;
  dependencies?: string[];
}
```

### 4. Code Generation

**Location**: `src/generator/`

The code generator transforms AST and AI analysis into target language code.

#### Generation Pipeline:
1. **AST traversal**: Walk the syntax tree
2. **Natural language processing**: Send to AI provider
3. **Code synthesis**: Combine structured and AI-generated code
4. **Optimization**: Apply performance and security optimizations
5. **Validation**: Verify generated code quality

#### Target Language Support:
- **JavaScript**: ES6+, Node.js, Browser
- **TypeScript**: Type-safe with full type definitions
- **Python**: 3.8+, async/await support
- **Java**: Java 11+, Spring Boot integration
- **Go**: Modern Go with modules
- **Rust**: Safe systems programming

#### Generator Architecture:
```typescript
abstract class BaseGenerator {
  abstract generateFunction(func: FunctionDeclaration): Promise<string>;
  abstract generateComponent(comp: ComponentDeclaration): Promise<string>;
  abstract generateExpression(expr: Expression): Promise<string>;
}

class JavaScriptGenerator extends BaseGenerator {
  // JavaScript-specific implementation
}
```

## Advanced Features

### 1. Incremental Compilation

**Location**: `src/incremental/`

Supports fast, incremental builds by tracking file dependencies and changes.

#### Change Detection:
- **File modification tracking**: Monitor source file changes
- **Dependency analysis**: Build dependency graph
- **Selective compilation**: Only recompile affected files
- **Cache management**: Intelligent caching of compilation results

#### Dependency Graph:
```typescript
interface DependencyNode {
  filePath: string;
  lastModified: number;
  dependencies: string[];
  dependents: string[];
  compilationResult?: CompilationResult;
}
```

### 2. Error Recovery System

**Location**: `src/parser/ErrorRecovery.ts`

Advanced error recovery ensures compilation continues despite syntax errors.

#### Recovery Mechanisms:
- **Lexer recovery**: Handle invalid characters gracefully
- **Parser recovery**: Multiple strategies for syntax errors
- **Semantic recovery**: Continue compilation with partial information
- **Error reporting**: Detailed error messages with suggestions

#### Error Types:
```typescript
interface ParseError {
  message: string;
  position: Position;
  token: Token;
  expected?: TokenType[];
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
  errorCode: string;
  context: ParseContext;
}
```

### 3. Security System

**Location**: `src/security/`

Built-in security validation protects against common vulnerabilities.

#### Security Features:
- **Path validation**: Prevent directory traversal attacks
- **Input sanitization**: Clean user-provided data
- **Command injection prevention**: Safe shell command execution
- **File operation validation**: Secure file system access

#### Path Security:
```typescript
class PathSecurityManager {
  static async validatePath(path: string, options: SecurePathOptions): Promise<PathValidationResult>;
  static sanitizeFilename(filename: string): string;
  static isWithinProjectBoundaries(path: string): boolean;
}
```

### 4. Debugging System

**Location**: `src/debugging/`

Comprehensive debugging support for SunScript applications.

#### Debugging Features:
- **Source mapping**: Map generated code back to SunScript
- **Runtime error translation**: Convert target language errors to SunScript context
- **Interactive debugging**: REPL-style debugging interface
- **AI-powered error analysis**: Natural language error explanations

#### Debug Architecture:
```typescript
class SunScriptDebugger {
  async createSession(sunScriptFile: string, targetFile: string): Promise<DebugSession>;
  async setBreakpoint(sessionId: string, line: number): Promise<Breakpoint>;
  async analyzeError(error: RuntimeError): Promise<ErrorAnalysis>;
}
```

## Compilation Process

### Stage 1: Preprocessing
1. **File discovery**: Find all `.sun` files in project
2. **Dependency resolution**: Build dependency graph
3. **Genesis processing**: Load project configuration
4. **Security validation**: Validate all file paths and inputs

### Stage 2: Lexical Analysis
1. **Tokenization**: Convert source text to tokens
2. **Error detection**: Identify lexical errors
3. **Recovery**: Apply error recovery strategies
4. **Token stream**: Produce clean token stream

### Stage 3: Syntax Analysis
1. **Parsing**: Build Abstract Syntax Tree
2. **Error recovery**: Handle syntax errors gracefully
3. **AST validation**: Ensure tree structure integrity
4. **Context building**: Prepare compilation context

### Stage 4: AI Processing
1. **Natural language extraction**: Identify NL constructs
2. **AI provider selection**: Choose appropriate provider
3. **Prompt engineering**: Build effective prompts
4. **Response processing**: Parse and validate AI responses

### Stage 5: Code Generation
1. **Template selection**: Choose target language templates
2. **Code synthesis**: Combine templates with AI responses
3. **Optimization**: Apply performance optimizations
4. **Validation**: Verify generated code quality

### Stage 6: Post-Processing
1. **Code formatting**: Apply consistent formatting
2. **Type checking**: Validate type safety (for typed languages)
3. **Documentation generation**: Create API documentation
4. **Output writing**: Write files to filesystem

## Performance Optimizations

### 1. Compilation Cache
- **AST caching**: Cache parsed syntax trees
- **AI response caching**: Cache AI provider responses
- **Dependency caching**: Cache dependency analysis results
- **Generated code caching**: Cache final compilation results

### 2. Parallel Processing
- **Concurrent parsing**: Parse multiple files simultaneously
- **Parallel AI requests**: Send multiple AI requests concurrently
- **Async code generation**: Generate code asynchronously
- **Worker threads**: Use worker threads for CPU-intensive tasks

### 3. Memory Management
- **Streaming processing**: Process large files in chunks
- **Garbage collection**: Minimize memory allocations
- **Resource pooling**: Pool expensive resources like AI connections
- **Memory monitoring**: Track and optimize memory usage

## Configuration System

### 1. Genesis Configuration
Project-wide configuration through `genesis.sun` files:

```sunscript
project MyApp {
    target: typescript, javascript
    framework: react
    optimization: true
    security: strict
}

dependencies {
    ui: "material-ui"
    state: "redux"
    routing: "react-router"
}
```

### 2. Compiler Configuration
TypeScript-style configuration in `sunscript.config.json`:

```json
{
  "compilerOptions": {
    "target": ["javascript", "typescript"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "aiProvider": "openai",
    "optimization": {
      "minify": true,
      "treeshake": true,
      "codesplitting": true
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. AI Provider Configuration
Configure AI providers in environment or config:

```typescript
interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

## Extension Points

### 1. Custom Generators
Extend code generation for new target languages:

```typescript
class CustomGenerator extends BaseGenerator {
  async generateFunction(func: FunctionDeclaration): Promise<string> {
    // Custom language-specific generation
  }
}

// Register the generator
GeneratorRegistry.register('mylang', CustomGenerator);
```

### 2. AI Provider Plugins
Add support for new AI providers:

```typescript
class CustomAIProvider implements AIProvider {
  async generateCode(prompt: string, context: AIContext): Promise<AIResponse> {
    // Custom AI provider implementation
  }
}

// Register the provider
AIProviderRegistry.register('custom', CustomAIProvider);
```

### 3. Custom Directives
Define domain-specific directives:

```typescript
class CustomDirectiveHandler {
  handle(directive: string, value: string, context: CompilationContext): void {
    // Custom directive processing
  }
}

// Register directive handler
DirectiveRegistry.register('@mycompany', CustomDirectiveHandler);
```

## Testing Architecture

### 1. Unit Testing
- **Component isolation**: Test individual components
- **Mock dependencies**: Mock AI providers and file system
- **Error scenarios**: Test error recovery paths
- **Performance testing**: Verify performance characteristics

### 2. Integration Testing
- **End-to-end compilation**: Test complete compilation pipeline
- **AI provider integration**: Test with real AI providers
- **File system integration**: Test with real file operations
- **Multi-target testing**: Verify all target languages work

### 3. Performance Testing
- **Compilation speed**: Measure compilation performance
- **Memory usage**: Track memory consumption
- **Scalability**: Test with large codebases
- **Cache effectiveness**: Verify caching improves performance

---

This architecture provides a robust, extensible foundation for the SunScript compiler while maintaining excellent performance and developer experience.