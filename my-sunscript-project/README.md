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



