# SunScript Compiler

The official compiler for SunScript - a natural language programming framework that uses AI (Claude 4) to transform human intentions into production-ready code.

> **Philosophy**: Write what you want to achieve in plain English. Let Claude 4 handle the implementation details.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/aw3-technology/sunscript.git
cd sunscript
```

2. Install dependencies:
```bash
npm install
```

3. Set up your AI provider (Claude 4 recommended):
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

1. Create a `.sun` file:

```sunscript
@context simple

function greetUser {
    ask user for their name
    display friendly greeting message
    include current time
    make it welcoming and personal
}

function main {
    call greetUser function
    show application startup message
}
```

2. Compile it:

```bash
# Using the run command (recommended for single files)
sunscript run hello.sun

# Using the biblical creation command (for Genesis projects)
sunscript let there be light --genesis genesis.sun

# Single file compilation with specific target
sunscript compile hello.sun --target javascript
```

3. Run the generated code:

```bash
# SunScript generates separate function files in the dist folder
# You'll find: dist/hello.greetUser.js and dist/hello.main.js

# To run them together:
cat > run-hello.js << 'EOF'
const fs = require('fs');
eval(fs.readFileSync('./dist/hello.greetUser.js', 'utf8'));
eval(fs.readFileSync('./dist/hello.main.js', 'utf8'));
// Mock browser functions for Node.js
const prompt = require('prompt-sync')();
const alert = (msg) => console.log('\n' + msg + '\n');
main();
EOF

node run-hello.js
```

## Supported Target Languages

- ✅ JavaScript
- ✅ TypeScript
- ✅ Python
- ✅ HTML (generates complete web applications)

## Features

- **Natural Language Programming**: Write your intentions in plain English - no strict syntax required
- **Claude 4 Powered**: Uses Anthropic's Claude Sonnet 4 for superior code generation with deep understanding
- **Production-Ready Code**: Generated code includes error handling, input validation, and best practices
- **Natural Language First**: The lexer prioritizes natural language over strict keywords
- **Multiple Target Languages**: Compile to JavaScript, TypeScript, Python, or HTML
- **Smart Validation**: Automatically validates generated code and retries with fixes if needed
- **Template Literal Support**: Preserves modern JavaScript features like template strings
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