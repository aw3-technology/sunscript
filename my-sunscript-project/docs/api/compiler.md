# SunScript Compiler API Reference

This document provides comprehensive API reference for programmatic usage of the SunScript compiler.

## Installation

Since SunScript is not yet published to npm, clone and build from source:

```bash
git clone https://github.com/aw3-technology/sunscript.git
cd sunscript
npm install
npm run build
npm link
```

## Basic Usage

### Importing the Compiler

```typescript
// After linking the package globally
import { SunScriptCompiler, CompilerConfig } from 'sunscript-compiler';

// Or using relative imports in development
import { SunScriptCompiler, CompilerConfig } from './path/to/sunscript/src';
```

### Creating a Compiler Instance

```typescript
const config: CompilerConfig = {
  targetLanguage: 'javascript',
  aiProvider: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY
  }),
  outputDirectory: './dist',
  verbose: true
};

const compiler = new SunScriptCompiler(config);
```

## Core Classes

### SunScriptCompiler

The main compiler class that orchestrates the compilation process.

#### Constructor

```typescript
constructor(config: CompilerConfig)
```

**Parameters:**
- `config`: Configuration object for the compiler

**Example:**
```typescript
const compiler = new SunScriptCompiler({
  targetLanguage: 'typescript',
  aiProvider: new OpenAIProvider({ apiKey: 'your-key' }),
  outputDirectory: './dist',
  verbose: false,
  optimization: true,
  security: 'strict'
});
```

#### Methods

##### `compileFile(filePath: string): Promise<CompilationResult>`

Compiles a single SunScript file.

**Parameters:**
- `filePath`: Path to the `.sun` file to compile

**Returns:** Promise resolving to `CompilationResult`

**Example:**
```typescript
const result = await compiler.compileFile('./src/hello.sun');
console.log(`Compiled to: ${result.outputPath}`);
console.log(`Generated code:\n${result.generatedCode}`);
```

##### `compile(source: string, metadata?: CompilationMetadata): Promise<CompilationResult>`

Compiles SunScript source code directly.

**Parameters:**
- `source`: SunScript source code as string
- `metadata`: Optional metadata for compilation context

**Returns:** Promise resolving to `CompilationResult`

**Example:**
```typescript
const source = `
function greetUser {
    Display a personalized greeting message
    Include current time and weather
}
`;

const result = await compiler.compile(source, {
  fileName: 'greeting.sun',
  projectName: 'MyApp'
});
```

##### `compileProject(genesisFile: string): Promise<ProjectCompilationResult>`

Compiles an entire project using a Genesis configuration file.

**Parameters:**
- `genesisFile`: Path to the `genesis.sun` file

**Returns:** Promise resolving to `ProjectCompilationResult`

**Example:**
```typescript
const projectResult = await compiler.compileProject('./genesis.sun');
console.log(`Compiled ${projectResult.filesCompiled} files`);
console.log(`Output directory: ${projectResult.outputDirectory}`);
```

#### Events

The compiler extends `EventEmitter` and emits various events during compilation:

```typescript
compiler.on('compile:start', (data) => {
  console.log(`Starting compilation of ${data.file}`);
});

compiler.on('compile:success', (data) => {
  console.log(`Successfully compiled ${data.file}`);
});

compiler.on('compile:error', (data) => {
  console.error(`Compilation failed: ${data.error.message}`);
});

compiler.on('ai:request', (data) => {
  console.log(`AI request: ${data.prompt.substring(0, 100)}...`);
});

compiler.on('ai:response', (data) => {
  console.log(`AI response received (${data.tokens} tokens)`);
});
```

## Configuration Types

### CompilerConfig

Main configuration interface for the compiler.

```typescript
interface CompilerConfig {
  // Required
  targetLanguage: TargetLanguage;
  aiProvider: AIProvider;
  
  // Optional
  outputDirectory?: string;
  verbose?: boolean;
  optimization?: boolean | OptimizationConfig;
  security?: SecurityLevel | SecurityConfig;
  domain?: string;
  cacheEnabled?: boolean;
  parallelCompilation?: boolean;
  maxConcurrentFiles?: number;
}
```

#### TargetLanguage

```typescript
type TargetLanguage = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'java' 
  | 'go' 
  | 'rust' 
  | 'csharp';
```

#### SecurityLevel

```typescript
type SecurityLevel = 'none' | 'basic' | 'strict' | 'paranoid';
```

#### OptimizationConfig

```typescript
interface OptimizationConfig {
  minify?: boolean;
  treeshake?: boolean;
  inlineSmallFunctions?: boolean;
  removeUnusedCode?: boolean;
  optimizeAIPrompts?: boolean;
}
```

### CompilationResult

Result object returned from compilation operations.

```typescript
interface CompilationResult {
  success: boolean;
  generatedCode: string;
  outputPath?: string;
  sourceMap?: string;
  metadata: CompilationMetadata;
  errors: CompilationError[];
  warnings: CompilationWarning[];
  statistics: CompilationStatistics;
}
```

#### CompilationStatistics

```typescript
interface CompilationStatistics {
  compilationTime: number;
  linesOfCode: number;
  aiRequestCount: number;
  aiTokensUsed: number;
  cacheHitRate: number;
  outputSize: number;
}
```

## AI Provider API

### AIProvider Interface

```typescript
interface AIProvider {
  generateCode(prompt: string, context: AIContext): Promise<AIResponse>;
  analyzeIntent(naturalLanguage: string): Promise<IntentAnalysis>;
  optimizeCode(code: string, directives: string[]): Promise<string>;
  validateResponse(response: string): boolean;
}
```

### Built-in Providers

#### OpenAIProvider

```typescript
import { OpenAIProvider } from 'sunscript-compiler/ai';

const provider = new OpenAIProvider({
  apiKey: 'your-openai-api-key',
  model: 'gpt-4',
  temperature: 0.3,
  maxTokens: 2000,
  baseURL: 'https://api.openai.com/v1' // optional
});
```

#### AnthropicProvider

```typescript
import { AnthropicProvider } from 'sunscript-compiler/ai';

const provider = new AnthropicProvider({
  apiKey: 'your-anthropic-api-key',
  model: 'claude-3-sonnet-20240229',
  maxTokens: 2000
});
```

#### LocalLLMProvider

```typescript
import { LocalLLMProvider } from 'sunscript-compiler/ai';

const provider = new LocalLLMProvider({
  baseURL: 'http://localhost:8080',
  model: 'llama2',
  timeout: 30000
});
```

### Custom AI Provider

Create custom AI providers by implementing the `AIProvider` interface:

```typescript
class CustomAIProvider implements AIProvider {
  async generateCode(prompt: string, context: AIContext): Promise<AIResponse> {
    // Your custom implementation
    const response = await this.callCustomAPI(prompt, context);
    
    return {
      code: response.generatedCode,
      confidence: response.confidence,
      alternatives: response.alternatives,
      metadata: {
        model: 'custom-model',
        tokens: response.tokens,
        processingTime: response.time
      }
    };
  }

  async analyzeIntent(naturalLanguage: string): Promise<IntentAnalysis> {
    // Analyze what the user wants to accomplish
    return {
      intent: 'create_function',
      confidence: 0.95,
      parameters: {
        functionName: 'extractedName',
        functionality: 'extractedPurpose'
      }
    };
  }

  async optimizeCode(code: string, directives: string[]): Promise<string> {
    // Apply optimization based on directives
    return optimizedCode;
  }

  validateResponse(response: string): boolean {
    // Validate the AI response
    return response.length > 0 && !response.includes('error');
  }
}
```

## Lexer API

### Lexer Class

For advanced use cases, you can use the lexer directly:

```typescript
import { Lexer, Token } from 'sunscript-compiler/lexer';

const lexer = new Lexer(sourceCode, true); // enableErrorRecovery
const tokens: Token[] = lexer.tokenize();

// Check for lexer errors
if (lexer.hasErrors()) {
  const errors = lexer.getErrors();
  console.log('Lexer errors:', errors);
}
```

### Token Types

```typescript
interface Token {
  type: TokenType;
  value: string;
  position: Position;
}

interface Position {
  line: number;
  column: number;
}

enum TokenType {
  FUNCTION = 'FUNCTION',
  COMPONENT = 'COMPONENT',
  TEXT = 'TEXT',
  AI_DIRECTIVE = 'AI_DIRECTIVE',
  AI_QUESTION = 'AI_QUESTION',
  OPEN_BRACE = 'OPEN_BRACE',
  CLOSE_BRACE = 'CLOSE_BRACE',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF'
}
```

## Parser API

### Parser Class

```typescript
import { Parser, ParseError } from 'sunscript-compiler/parser';

const parser = new Parser(tokens, sourceCode);
const ast = parser.parse();

// Check for parse errors
if (parser.hasErrors()) {
  const errors = parser.getAllErrors();
  console.log('Parse errors:', errors);
}
```

### AST Nodes

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

interface ComponentDeclaration {
  type: 'ComponentDeclaration';
  name: string;
  body: Expression[];
  metadata: {
    framework?: string;
    target?: string;
    directives: AIDirective[];
  };
}
```

## Error Handling

### Error Types

```typescript
// Base error class
class SunScriptError extends Error {
  code: ErrorCode;
  context?: Record<string, any>;
  filePath?: string;
  line?: number;
  column?: number;
  suggestions?: string[];
}

// Specific error types
class CompilationError extends SunScriptError {}
class ParseError extends SunScriptError {}
class AIProviderError extends SunScriptError {}
class FileSystemError extends SunScriptError {}
```

### Error Handling Example

```typescript
try {
  const result = await compiler.compileFile('./src/app.sun');
  console.log('Compilation successful!');
} catch (error) {
  if (error instanceof CompilationError) {
    console.error('Compilation failed:', error.message);
    if (error.suggestions) {
      console.log('Suggestions:', error.suggestions);
    }
  } else if (error instanceof AIProviderError) {
    console.error('AI Provider error:', error.message);
    console.log('Check your API key and connection');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Advanced Features

### Incremental Compilation

```typescript
import { IncrementalCompiler } from 'sunscript-compiler/incremental';

const incrementalCompiler = new IncrementalCompiler({
  cacheDirectory: './.sunscript-cache',
  compiler: compiler
});

// Only recompiles changed files
const result = await incrementalCompiler.compileProject('./genesis.sun');
```

### Custom Code Generators

```typescript
import { BaseGenerator, GeneratorRegistry } from 'sunscript-compiler/generator';

class CustomLanguageGenerator extends BaseGenerator {
  async generateFunction(func: FunctionDeclaration): Promise<string> {
    // Generate code for your custom language
    return `custom_function ${func.name}() { /* generated code */ }`;
  }

  async generateComponent(comp: ComponentDeclaration): Promise<string> {
    // Generate component code
    return `custom_component ${comp.name} { /* generated code */ }`;
  }
}

// Register the generator
GeneratorRegistry.register('mylang', CustomLanguageGenerator);

// Use with compiler
const compiler = new SunScriptCompiler({
  targetLanguage: 'mylang' as TargetLanguage,
  aiProvider: provider
});
```

### Language Server Integration

```typescript
import { SunScriptLanguageServer } from 'sunscript-compiler/language-server';

const languageServer = new SunScriptLanguageServer();

// Handle document changes
languageServer.onDidChangeTextDocument(documentUri, newText, version);

// Get diagnostics
const diagnostics = languageServer.getDiagnostics(documentUri);

// Provide completions
const completions = languageServer.provideCompletionItems(documentUri, position);

// Provide code actions
const actions = languageServer.provideCodeActions(documentUri, range, diagnostics);
```

## Utilities

### File System Utilities

```typescript
import { 
  sunScriptFileOps, 
  outputFileOps, 
  PathSecurityManager 
} from 'sunscript-compiler/security';

// Secure file operations
const content = await sunScriptFileOps.readFile('./src/app.sun');
await outputFileOps.writeFile('./dist/app.js', generatedCode);

// Path validation
const validation = await PathSecurityManager.validatePath(userProvidedPath);
if (!validation.valid) {
  console.error('Invalid path:', validation.errors);
}
```

### Validation Utilities

```typescript
import { 
  InputValidator, 
  ConfigValidator 
} from 'sunscript-compiler/validation';

// Validate SunScript source
const sourceValidation = InputValidator.validateSunScriptSource(source);
if (!sourceValidation.valid) {
  console.error('Source validation failed:', sourceValidation.errors);
}

// Validate configuration
const configValidation = ConfigValidator.validateCompilerConfig(config);
```

## Performance Monitoring

### Compilation Metrics

```typescript
// Enable detailed metrics
const compiler = new SunScriptCompiler({
  ...config,
  metrics: {
    enabled: true,
    detailed: true
  }
});

compiler.on('metrics:compilation', (metrics) => {
  console.log(`Compilation took ${metrics.totalTime}ms`);
  console.log(`AI requests: ${metrics.aiRequests}`);
  console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);
});
```

### Memory Usage Monitoring

```typescript
import { MemoryMonitor } from 'sunscript-compiler/utils';

const monitor = new MemoryMonitor();
monitor.start();

await compiler.compileProject('./genesis.sun');

const report = monitor.getReport();
console.log(`Peak memory usage: ${report.peakMemoryMB}MB`);
console.log(`Memory leaks detected: ${report.leaksDetected}`);
```

## Testing Support

### Mock AI Provider

```typescript
import { MockAIProvider } from 'sunscript-compiler/testing';

const mockProvider = new MockAIProvider({
  responses: {
    'create a greeting function': 'function greet() { console.log("Hello!"); }',
    'validate user input': 'function validate(input) { return input.length > 0; }'
  }
});

const compiler = new SunScriptCompiler({
  targetLanguage: 'javascript',
  aiProvider: mockProvider
});
```

### Test Utilities

```typescript
import { TestCompiler, CompilerTestSuite } from 'sunscript-compiler/testing';

// Simplified testing interface
const testCompiler = new TestCompiler();

describe('SunScript Compilation', () => {
  test('compiles function correctly', async () => {
    const result = await testCompiler.compile(`
      function sayHello {
        Print a greeting message
      }
    `);
    
    expect(result.success).toBe(true);
    expect(result.generatedCode).toContain('function sayHello');
  });
});
```

---

This API reference provides comprehensive coverage of the SunScript compiler's programmatic interface. For more examples and advanced usage, see the [examples directory](../examples/) and [tutorials](../tutorials/).