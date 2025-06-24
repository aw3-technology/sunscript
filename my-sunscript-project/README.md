# SunScript Compiler

The official compiler for SunScript - a natural language programming framework that uses AI (Claude Sonnet 4) to transform human intentions into production-ready code.

> **Philosophy**: Write what you want to achieve in plain English. Let Claude 4 handle the implementation details.

## Current Status

**Version**: 1.0.0  
**Stability**: Beta - Core functionality complete, advanced features in development  
**Test Coverage**: Comprehensive (7 test suites covering all major components)  
**Security**: Production-ready with comprehensive validation and sanitization

## Installation

1. Clone the repository:
```bash
git clone https://github.com/aw3-technology/sunscript.git
cd my-sunscript-project
```

2. Install dependencies:
```bash
npm install
```

3. Set up your AI provider (Claude Sonnet 4 recommended):
```bash
# Create .env file in project root
echo "ANTHROPIC_API_KEY=your-anthropic-api-key-here" > .env
```

Get your API key from [Anthropic Console](https://console.anthropic.com/)

4. Build the project:
```bash
npm run build
```

5. Link the CLI globally (optional):
```bash
npm link
# Now you can use 'sunscript' command globally
```

## Quick Start

### Standard Syntax Mode

Create a `.sun` file with traditional function syntax:

```sunscript
function greetUser {
  Create a simple greeting function that takes a name parameter.
  Return a greeting message saying "Hello, [name]!"
  Include the current time in a friendly format.
}

function calculateSum {
  Create a function that adds two numbers together.
  Include input validation and error handling.
  Return the sum with proper formatting.
}
```

### Flex Syntax Mode (Free-form Natural Language)

```sunscript
@syntax flex

Create a simple calculator that can add and subtract numbers.
The calculator should have buttons for numbers 0-9 and operations + and -.
When someone clicks equals, show the result.
Make it look modern and responsive.
```

### HTML Applications

```sunscript
@targets html

function createWebPage {
  Build a simple HTML page with a title "My SunScript App".
  Include a header with "Welcome to SunScript".
  Add a button that shows an alert when clicked.
  Make it responsive and visually appealing.
}
```

## Compilation Commands

```bash
# Compile a single file
sunscript compile hello.sun --target javascript --output ./dist

# Compile with specific target language
sunscript compile app.sun --target html --output ./public

# Use the creative "let there be light" command
sunscript let there be light --genesis genesis.sun

# Import projects from GitHub
sunscript import https://github.com/user/repo --output ./imported

# Run with debugging
sunscript compile app.sun --verbose
```

## Supported Features

### ✅ **Core Features (Implemented)**

- **Natural Language Programming**: Write intentions in plain English
- **Claude Sonnet 4 Integration**: Superior code generation with deep understanding
- **Multiple Target Languages**: JavaScript, TypeScript, Python, HTML
- **Flex Syntax Mode**: Free-form natural language input with `@syntax flex`
- **Security Validation**: Comprehensive input sanitization and path protection
- **File Operations**: Secure file I/O with atomic writes and permission management
- **Error Recovery**: Graceful error handling with detailed diagnostics
- **CLI Interface**: Rich command set with validation and help system

### ✅ **AI Provider Support**

- **Anthropic Claude**: Primary provider (Claude Sonnet 4)
- **OpenAI**: GPT-4 and GPT-3.5 Turbo support
- **Local LLM**: Ollama integration for privacy-focused deployment
- **Mock Provider**: Testing and development support

### ✅ **Security Features**

- **Input Validation**: Blocks injection attacks and malicious patterns
- **Path Sanitization**: Prevents directory traversal attacks
- **Content Filtering**: Removes dangerous code patterns from AI output
- **Secure File Operations**: Atomic writes with permission validation
- **API Key Protection**: Secure handling of sensitive credentials

### ⚠️ **Partially Implemented**

- **Genesis Projects**: Basic project structure generation (parser issues remain)
- **Multi-Prompt Generation**: Architecture exists but needs refinement
- **Template System**: Framework present but templates not fully populated

### ❌ **Not Yet Implemented**

- **Specialized Generators**: FunctionGenerator, ComponentGenerator, APIGenerator classes are empty
- **Advanced Language Constructs**: Models, Pipelines, Behaviors, Tests
- **Watch Mode**: Automatic recompilation on file changes
- **Package Management**: SunScript module system
- **IDE Integration**: Language server protocol support

## Architecture Overview

### Current Implementation Status

```
src/
├── lexer/              ✅ Complete - Tokenization with error recovery
├── parser/             ✅ Complete - AST generation with validation
├── compiler/           ✅ Complete - Main compilation orchestration
├── generator/          ⚠️  Partial - Core generator works, specialized generators empty
│   ├── CodeGenerator   ✅ Complete - Main generation logic
│   ├── MultiPrompt     ✅ Complete - Complex app generation
│   └── [8 empty classes] ❌ Missing - Specialized construct generators
├── ai/                 ✅ Complete - 4 AI providers with full integration
├── validation/         ✅ Complete - Comprehensive validation system
├── security/           ✅ Complete - Production-ready security measures
├── cli/                ✅ Complete - Rich CLI interface
└── types/             ✅ Complete - Comprehensive type definitions
```

### Test Coverage

```
tests/
├── unit/
│   ├── compiler/       ✅ Core compilation tests
│   ├── validation/     ✅ ConfigValidator tests  
│   ├── ai/            ✅ AI provider integration tests
│   ├── security/      ✅ Security validation tests
│   ├── cli/           ✅ CLI command tests
│   └── lexer/         ✅ Basic lexer tests
├── integration/       ✅ End-to-end compilation tests
└── helpers/           ✅ Test utilities and fixtures
```

## Examples

### Basic Function Generation

**Input** (`hello.sun`):
```sunscript
function greetUser {
  Create a greeting function that asks for the user's name.
  Display a personalized welcome message.
  Include the current time and make it friendly.
}
```

**Output** (`dist/hello.greetUser.js`):
```javascript
function greetUser() {
  const name = prompt("What's your name?");
  const currentTime = new Date().toLocaleTimeString();
  const greeting = `Hello, ${name}! Welcome! The current time is ${currentTime}. Have a wonderful day!`;
  alert(greeting);
  return greeting;
}
```

### HTML Application Generation

**Input** (`calculator.sun`):
```sunscript
@targets html

function createCalculator {
  Build a beautiful calculator with number buttons.
  Include add, subtract, multiply, and divide operations.
  Show results in a display area with smooth animations.
  Make it responsive and accessible.
}
```

**Output** (`dist/calculator.html`):
Complete HTML page with embedded CSS and JavaScript.

### Flex Syntax Mode

**Input** (`natural.sun`):
```sunscript
@syntax flex

Create a todo list app that lets users add, edit, and delete tasks.
Each task should have a checkbox to mark it complete.
Store everything in local storage so it persists.
Use a clean, modern design with smooth transitions.
```

**Output**: Complete web application with all requested functionality.

## Environment Variables

Create a `.env` file with:

```bash
# Primary AI provider (recommended)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Alternative providers
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional configuration
NODE_ENV=development
SUNSCRIPT_LOG_LEVEL=INFO
```

## Development

```bash
# Run comprehensive tests
npm test

# Run specific test suite
npm test tests/unit/compiler/Compiler.test.ts

# Development mode with watch
npm run dev

# Build and type checking
npm run build

# Linting and formatting
npm run lint
npm run format

# Clean build artifacts
rm -rf dist/
```

## Known Issues

1. **Genesis Parser**: Syntax issues with project structure parsing
2. **Generator Classes**: 8 specialized generator classes need implementation
3. **Template System**: Language-specific templates need population
4. **Watch Mode**: File watching not yet implemented
5. **Package Management**: Module system for SunScript libraries

## Security Considerations

SunScript includes comprehensive security measures:

- **Input Sanitization**: All user input is validated and sanitized
- **Path Validation**: Directory traversal attacks are prevented
- **AI Output Filtering**: Generated code is scanned for malicious patterns
- **Secure File Operations**: All file I/O uses secure, atomic operations
- **API Key Protection**: Sensitive credentials are handled securely

## Performance

- **Compilation Speed**: ~2-5 seconds for simple functions
- **AI Provider Support**: Automatic retry with exponential backoff
- **Memory Usage**: Efficient with <100MB growth for multiple compilations
- **Concurrent Operations**: Supports parallel compilation jobs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `npm test`
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Priorities

**High Priority:**
1. Implement specialized generator classes (FunctionGenerator, ComponentGenerator, etc.)
2. Complete template system with language-specific templates
3. Fix genesis.sun parser syntax issues
4. Add watch mode for development

**Medium Priority:**
1. Implement advanced language constructs (Models, Pipelines, Behaviors)
2. Add package management system
3. Create VS Code extension
4. Performance optimization

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- **Anthropic Claude Sonnet 4**: Primary AI provider for code generation
- **TypeScript**: Type-safe development environment
- **Jest**: Comprehensive testing framework
- **Commander.js**: CLI framework
- **Winston**: Logging system

Built with ❤️ by the SunScript team.