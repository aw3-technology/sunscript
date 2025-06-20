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
# To JavaScript (default)
npx ts-node test-compile.ts

# To HTML (complete web page)
npx ts-node test-compile-html.ts

# Or specify the file
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

## License

LICENSE

SunScript Community License v1.1 Copyright © 2025 AW3 Technology, Inc. All Rights Reserved.
Purpose and Grant Subject to the terms of this license, AW3 Technology, Inc. ("Licensor") grants you ("Licensee") a non-exclusive, worldwide, royalty-free license to:
Use, modify, and distribute the SunScript source code;
Use SunScript to develop commercial or non-commercial software applications, products, and services;
Provided that you do not offer SunScript itself (or any modified version of it) as a standalone product or service that performs code generation.
Restrictions You may not:
Use SunScript, or any derivative of it, to build, market, sell, or host a code generation tool, platform, or API that competes with SunScript or serves a similar purpose;
Repackage, rebrand, or resell SunScript itself as a development framework or foundational backend for other code generation businesses;
Use the SunScript brand, name, or trademarks without express permission from AW3 Technology, Inc.
Permitted Use Cases The following are explicitly permitted:
Building commercial applications or services using code generated by SunScript;
Integrating SunScript-generated code into proprietary or open-source projects;
Creating internal developer tools that use SunScript (as long as they are not marketed or sold as SunScript-like products).
Commercial Licensing If you wish to use SunScript to build or sell a code generation product or service, you must obtain a commercial license. Contact will.schulz@aw3.tech for inquiries.
Attribution Any distribution of SunScript or substantial derivative code must retain this license and the following attribution:
csharp Copy Edit Powered by SunScript — © AW3 Technology, Inc. 6. No Trademark Rights Nothing in this license grants rights to use the “SunScript” or “AW3” name, logo, or trademarks.
Termination Violation of this license immediately terminates your rights under it. Continued use of the Software after termination is prohibited.
Warranty Disclaimer THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.

## Acknowledgments

Built with TypeScript, OpenAI, and the power of natural language processing.
