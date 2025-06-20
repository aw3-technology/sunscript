# SunScript Compiler

The official compiler for SunScript - an AI-native programming language that lets you write code in natural language.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sunscript-compiler.git
cd sunscript-compiler
```

2. Install dependencies:
```bash
npm install
```

3. Set up your AI provider (OpenAI required):
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

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

1. Create a `.sun` file:

```sunscript
@context web application

function greetUser {
    ask the user for their name
    display a personalized greeting with their name
    add a friendly emoji to make it welcoming
}
```

2. Compile it:

```bash
# Using the run command (recommended)
sunscript run genesis.sun

# Using the biblical creation command
sunscript let there be light

# Single file compilation
sunscript compile examples/hello-world.sun

# Legacy compilation (if needed)
npx ts-node test-compile.ts examples/hello-world.sun
```

3. Run the generated code:

```bash
# For JavaScript output
node dist/hello-world.greet.js

# For HTML output
open dist/hello-world.html
```

## Supported Target Languages

- ✅ JavaScript
- ✅ TypeScript
- ✅ Python
- ✅ HTML (generates complete web applications)

## Features

- **Natural Language Programming**: Write functions in plain English
- **AI-Powered Code Generation**: Uses OpenAI GPT-4 to transform natural language into code
- **Multiple Target Languages**: Compile to JavaScript, TypeScript, Python, or HTML
- **Syntax Validation**: Automatically validates and fixes generated code
- **Smart Code Cleaning**: Removes markdown artifacts and ensures clean output
- **HTML Generation**: Creates beautiful, responsive web pages from natural language
- **Extensible Architecture**: Easy to add new AI providers and target languages

## Example SunScript Files

### Basic Function
```sunscript
@context learning

function greet {
    ask the user for their name
    display a personalized greeting with their name
    add a friendly emoji to make it welcoming
}
```

### Web Application
```sunscript
@context web application
@targets html

function calculateTip {
    create a form with bill amount and tip percentage
    calculate the tip amount and total
    display results with nice formatting
    add a reset button to clear the form
    ?? should we split the bill among multiple people?
}
```

### AI Questions
```sunscript
function processData {
    read data from a CSV file
    clean and validate the data
    ?? what validation rules should we apply?
    ?? should we handle missing values?
    generate a summary report
}
```

## Project Structure

```
sunscript-compiler/
├── src/
│   ├── lexer/         # Tokenization of SunScript syntax
│   ├── parser/        # AST generation
│   ├── generator/     # AI-powered code generation
│   ├── compiler/      # Main compiler orchestration
│   ├── validator/     # Syntax validation for output
│   ├── ai/           # AI provider integrations
│   └── types/        # TypeScript type definitions
├── examples/         # Example .sun files
├── dist/            # Compiled output
├── bin/             # CLI scripts
└── tests/           # Test files
```

## Environment Variables

Create a `.env` file with:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
# Optional: for Anthropic Claude support
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

## Development

```bash
# Run tests
npm test

# Clean build artifacts
npm run clean

# Development mode with watch
npm run dev

# Type checking
npx tsc --noEmit
```

## Roadmap

- [ ] Watch mode for automatic recompilation
- [ ] Caching for faster compilation
- [ ] Support for more AI providers (Claude, local LLMs)
- [ ] Visual Studio Code extension
- [ ] Component and API declarations
- [ ] Package management for SunScript

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.


## Acknowledgments

Built with TypeScript, OpenAI, and the power of natural language processing.