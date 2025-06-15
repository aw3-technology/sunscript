#!/bin/bash

# Create SunScript Compiler TypeScript Project Structure
# Usage: ./setup-sunscript.sh [project-name]

PROJECT_NAME=${1:-sunscript-compiler}

echo "🚀 Creating SunScript Compiler project: $PROJECT_NAME"

# Create root directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Create directory structure
echo "📁 Creating directory structure..."

# Source directories
mkdir -p src/{types,compiler,lexer,parser/ast,parser/visitors,generator/generators,generator/templates/{javascript,typescript,python},ai/providers,cache,utils,cli/commands,cli/templates/default}

# Test directories
mkdir -p tests/{unit/{lexer,parser,generator,ai},integration,fixtures,helpers}

# Other directories
mkdir -p {bin,examples,docs}

# Create type definition files
echo "📝 Creating type definitions..."

cat > src/types/index.ts << 'EOF'
export * from './tokens';
export * from './ast';
export * from './compiler';
export * from './ai';

export type TargetLanguage = 'javascript' | 'typescript' | 'python';

export interface Position {
  line: number;
  column: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

export interface CompilationResult {
  code: Record<string, string>;
  tests?: Record<string, string>;
  documentation?: string;
  sourceMap?: string;
  metadata: CompilationMetadata;
}

export interface CompilationMetadata {
  version: string;
  timestamp: string;
  targetLanguage: TargetLanguage;
  optimizations: string[];
  warnings: CompilerWarning[];
}

export interface CompilerWarning {
  message: string;
  location?: SourceLocation;
  severity: 'info' | 'warning' | 'error';
}
EOF

cat > src/types/tokens.ts << 'EOF'
export enum TokenType {
  // Keywords
  FUNCTION = 'FUNCTION',
  COMPONENT = 'COMPONENT',
  API = 'API',
  MODEL = 'MODEL',
  PIPELINE = 'PIPELINE',
  BEHAVIOR = 'BEHAVIOR',
  TEST = 'TEST',
  
  // Control flow
  IF = 'IF',
  ELSE = 'ELSE',
  WHEN = 'WHEN',
  FOR = 'FOR',
  RETURN = 'RETURN',
  
  // Directives
  AI_DIRECTIVE = 'AI_DIRECTIVE',
  OPTIMIZE = 'OPTIMIZE',
  CONTEXT = 'CONTEXT',
  TARGETS = 'TARGETS',
  
  // Structure
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  NEWLINE = 'NEWLINE',
  COLON = 'COLON',
  OPEN_BRACE = 'OPEN_BRACE',
  CLOSE_BRACE = 'CLOSE_BRACE',
  
  // Literals
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  TEXT = 'TEXT',
  IDENTIFIER = 'IDENTIFIER',
  
  // Special
  AI_QUESTION = 'AI_QUESTION',
  COMMENT = 'COMMENT',
  MARKDOWN_HEADER = 'MARKDOWN_HEADER',
  MARKDOWN_LIST = 'MARKDOWN_LIST',
  EOF = 'EOF'
}

export interface Token {
  type: TokenType;
  value: string;
  position: Position;
  raw?: string;
}
EOF

cat > src/types/ast.ts << 'EOF'
import { SourceLocation } from './index';

export type ASTNodeType = 
  | 'Program'
  | 'FunctionDeclaration'
  | 'ComponentDeclaration'
  | 'APIDeclaration'
  | 'ModelDeclaration'
  | 'PipelineDeclaration'
  | 'BehaviorDeclaration'
  | 'TestDeclaration'
  | 'ExpressionStatement'
  | 'NaturalLanguageExpression'
  | 'AIDirective'
  | 'Block';

export interface ASTNode {
  type: ASTNodeType;
  location?: SourceLocation;
  parent?: ASTNode;
}

export interface Program extends ASTNode {
  type: 'Program';
  body: ASTNode[];
  metadata: {
    version: string;
    context?: string;
  };
}

export interface FunctionDeclaration extends ASTNode {
  type: 'FunctionDeclaration';
  name: string;
  body: Statement[];
  metadata: FunctionMetadata;
}

export interface FunctionMetadata {
  description?: string;
  parameters?: ParameterDefinition[];
  returns?: string;
  aiQuestions?: string[];
  directives?: AIDirective[];
  tests?: TestDeclaration[];
}

export interface ParameterDefinition {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  default?: any;
}

export interface Statement extends ASTNode {
  // Base for all statements
}

export interface ExpressionStatement extends Statement {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface Expression extends ASTNode {
  // Base for all expressions
}

export interface NaturalLanguageExpression extends Expression {
  type: 'NaturalLanguageExpression';
  text: string;
  intent?: string;
}

export interface AIDirective extends ASTNode {
  type: 'AIDirective';
  directive: string;
  parameters?: Record<string, any>;
}

export interface TestDeclaration extends ASTNode {
  type: 'TestDeclaration';
  name: string;
  body: Statement[];
}
EOF

cat > src/types/compiler.ts << 'EOF'
import { AIProvider } from '../ai/AIProvider';
import { TargetLanguage } from './index';

export interface CompilerConfig {
  outputDir: string;
  targetLanguage: TargetLanguage;
  aiProvider: AIProvider;
  cache?: boolean;
  watch?: boolean;
  domain?: string;
  optimizations?: string[];
}

export interface CompilerContext {
  fileName: string;
  filePath: string;
  projectName?: string;
  metadata?: Record<string, any>;
}
EOF

cat > src/types/ai.ts << 'EOF'
import { TargetLanguage } from './index';

export interface AIContext {
  targetLanguage: TargetLanguage;
  projectName: string;
  fileName?: string;
  filePath?: string;
  domain?: string;
  requirements?: string[];
}

export interface AIResponse {
  code: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}
EOF

# Create main source files
echo "💻 Creating source files..."

cat > src/index.ts << 'EOF'
export { SunScriptCompiler } from './compiler/Compiler';
export { OpenAIProvider } from './ai/providers/OpenAIProvider';
export { AnthropicProvider } from './ai/providers/AnthropicProvider';
export { LocalLLMProvider } from './ai/providers/LocalLLMProvider';
export * from './types';
EOF

# Create stub files for all components
touch src/compiler/{Compiler.ts,CompilerConfig.ts,CompilerError.ts,CompilerContext.ts}
touch src/lexer/{Lexer.ts,Token.ts,TokenType.ts,patterns.ts,LexerError.ts}
touch src/parser/{Parser.ts,ParserError.ts}
touch src/parser/ast/{index.ts,ASTNode.ts,Program.ts,Function.ts,Component.ts,Model.ts,API.ts,Pipeline.ts,Behavior.ts,Test.ts,Expression.ts}
touch src/parser/visitors/{Visitor.ts,ValidationVisitor.ts,TransformVisitor.ts}
touch src/generator/{CodeGenerator.ts,PromptBuilder.ts,GeneratorContext.ts}
touch src/generator/generators/{BaseGenerator.ts,FunctionGenerator.ts,ComponentGenerator.ts,APIGenerator.ts,ModelGenerator.ts,PipelineGenerator.ts,BehaviorGenerator.ts,TestGenerator.ts}
touch src/generator/templates/TemplateEngine.ts
touch src/ai/{AIProvider.ts,AIResponse.ts,PromptOptimizer.ts}
touch src/ai/providers/{OpenAIProvider.ts,AnthropicProvider.ts,LocalLLMProvider.ts,MockProvider.ts}
touch src/cache/{Cache.ts,FileCache.ts,MemoryCache.ts,CacheKey.ts}
touch src/utils/{logger.ts,fileSystem.ts,errorHandler.ts,validators.ts,helpers.ts}
touch src/cli/{CLI.ts}
touch src/cli/commands/{Command.ts,CompileCommand.ts,WatchCommand.ts,InitCommand.ts,ConfigCommand.ts}

# Create bin file
cat > bin/sunscript.ts << 'EOF'
#!/usr/bin/env node
import { CLI } from '../src/cli/CLI';
import * as dotenv from 'dotenv';

dotenv.config();

const cli = new CLI();
cli.run(process.argv).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
EOF

chmod +x bin/sunscript.ts

# Create example SunScript files
echo "📚 Creating example files..."

cat > examples/hello-world.sun << 'EOF'
@context learning

function greet {
    ask the user for their name
    display a personalized greeting with their name
    add a friendly emoji to make it welcoming
}
EOF

cat > examples/todo-app.sun << 'EOF'
# Todo Application

## Features
- Add, edit, delete todos
- Mark as complete
- Filter by status
- Search functionality
- Due dates with reminders
- Categories/tags

## Implementation
Just build a modern todo app with all the standard features
Make it responsive and accessible
Use local storage for persistence
EOF

cat > examples/rest-api.sun << 'EOF'
@api BlogService {
    resource: BlogPost
    
    standard CRUD operations
    
    additional endpoints:
    - GET /posts/trending
    - GET /posts/by-author/:authorId
    - POST /posts/:id/like
    - GET /posts/search?q=query
    
    include:
    - Authentication required for write operations
    - Rate limiting
    - Pagination
    - Sorting and filtering
    - Soft deletes
    - Audit trail
}
EOF

cat > examples/data-pipeline.sun << 'EOF'
@pipeline ProcessSalesData {
    1. Read CSV files from uploads folder
    2. Validate data format and required fields
    3. Clean data:
       - Remove duplicates
       - Fix date formats
       - Normalize currency values
    4. Transform:
       - Calculate totals by region
       - Identify top products
       - Generate trend analysis
    5. Output:
       - Summary report as PDF
       - Detailed data to database
       - Email notifications to managers
}
EOF

# Create configuration files
echo "⚙️ Creating configuration files..."

cat > package.json << 'EOF'
{
  "name": "sunscript-compiler",
  "version": "1.0.0",
  "description": "AI-Native Programming Language Compiler",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "sunscript": "./dist/bin/sunscript.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "prepare": "npm run build",
    "prepublishOnly": "npm test && npm run lint"
  },
  "keywords": ["sunscript", "ai", "compiler", "programming-language"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "chalk": "^5.3.0",
    "chokidar": "^3.5.3",
    "commander": "^11.1.0",
    "dotenv": "^16.3.1",
    "ora": "^7.0.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.10",
    "@types/node": "^20.10.3",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1",
    "eslint": "^8.54.0",
    "eslint-config-prettier": "^9.0.0",
    "jest": "^29.7.0",
    "prettier": "^3.1.0",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.3.2"
  },
  "peerDependencies": {
    "@anthropic-ai/sdk": "^0.5.0",
    "openai": "^4.20.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

cat > .eslintrc.json << 'EOF'
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
EOF

cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF

cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build output
dist/
*.js
*.js.map
*.d.ts
*.d.ts.map

# Keep TypeScript source files
!src/**/*.ts
!bin/**/*.ts
!tests/**/*.ts

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# Cache
.cache/
.sunscript-cache/

# Temporary files
*.tmp
*.temp
EOF

cat > .env.example << 'EOF'
# AI Provider Configuration
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Compiler Configuration
SUNSCRIPT_OUTPUT_DIR=./dist
SUNSCRIPT_TARGET_LANGUAGE=javascript
SUNSCRIPT_CACHE_ENABLED=true

# Development
NODE_ENV=development
LOG_LEVEL=info
EOF

cat > README.md << 'EOF'
# SunScript Compiler

The official compiler for SunScript - an AI-native programming language that lets you write code in natural language.

## Installation

```bash
npm install
npm run build
```

## Quick Start

1. Create a `.sun` file:

```sunscript
@context web application

function greetUser {
    get the user's name from input
    display a personalized greeting
    add animation effect
}
```

2. Compile it:

```bash
npx sunscript compile hello.sun
```

3. Run the generated code:

```bash
node dist/hello.js
```

## Features

- Natural language programming
- AI-powered code generation
- Multiple target languages
- Watch mode for development
- Intelligent caching
- Extensible architecture

## Documentation

See `docs/` for detailed documentation.

## License

MIT
EOF

cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
EOF

# Create test files
echo "🧪 Creating test structure..."

cat > tests/unit/lexer/Lexer.test.ts << 'EOF'
import { Lexer } from '../../../src/lexer/Lexer';
import { TokenType } from '../../../src/types';

describe('Lexer', () => {
  it('should tokenize a simple function', () => {
    const input = `function greet {
      say hello
    }`;
    
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();
    
    expect(tokens[0].type).toBe(TokenType.FUNCTION);
    expect(tokens[1].type).toBe(TokenType.TEXT);
    expect(tokens[1].value).toBe('greet');
  });
});
EOF

cat > tests/helpers/index.ts << 'EOF'
export function createMockAIProvider() {
  return {
    generateCode: jest.fn().mockResolvedValue({
      code: 'console.log("Hello, World!");',
      model: 'mock',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    }),
    validateConfiguration: jest.fn().mockResolvedValue(true),
    getModelInfo: jest.fn().mockReturnValue({
      name: 'Mock',
      version: '1.0',
      capabilities: ['test']
    })
  };
}
EOF

# Final setup
echo "📦 Installing dependencies..."

cat > setup-complete.md << 'EOF'
# SunScript Compiler Setup Complete! 🎉

## Next Steps:

1. Install dependencies:
   ```bash
   npm install
   npm install -D @types/node
   ```

2. Install AI provider packages (optional):
   ```bash
   npm install openai @anthropic-ai/sdk
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. Try compiling an example:
   ```bash
   npm run build
   node dist/bin/sunscript.js compile examples/hello-world.sun
   ```

## Project Structure Created:
- ✅ TypeScript configuration
- ✅ Source files structure
- ✅ Test framework setup
- ✅ Example SunScript files
- ✅ CLI setup
- ✅ Development tools configured

Happy coding with SunScript! 🚀
EOF

echo ""
echo "✅ SunScript Compiler project structure created successfully!"
echo "📂 Project location: $(pwd)"
echo ""
echo "Next steps:"
echo "1. cd $PROJECT_NAME"
echo "2. npm install"
echo "3. npm install -D @types/node"
echo "4. npm install openai @anthropic-ai/sdk (for AI providers)"
echo "5. cp .env.example .env (and add your API keys)"
echo "6. npm run build"
echo ""
echo "See setup-complete.md for detailed instructions!"
EOF