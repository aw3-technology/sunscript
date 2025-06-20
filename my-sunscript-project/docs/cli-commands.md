# SunScript CLI Commands

## Basic Commands

### Compile a single file
```bash
sunscript compile hello.sun
sunscript compile hello.sun -o ./output -t typescript
```

### Import a GitHub project
```bash
sunscript import https://github.com/owner/repo
sunscript import https://github.com/facebook/react -s ./my-src -o ./react-code
```

### Compile a project (Genesis mode)

#### The Biblical Way 🌟
```bash
sunscript let there be light
```

This magical command will:
1. Look for a `genesis.sun` file in the current directory
2. Parse your project configuration
3. Compile all imported SunScript files
4. Generate output according to your specifications

#### The Regular Way
```bash
sunscript genesis
sunscript genesis -f ./path/to/genesis.sun
```

## Command Options

### compile
- `-o, --output <dir>`: Output directory (default: `./dist`)
- `-t, --target <language>`: Target language - javascript, typescript, python, html (default: `javascript`)

### let there be light / genesis
- `-g, --genesis <file>` (for "let" command): Path to genesis.sun file (default: `./genesis.sun`)
- `-f, --file <file>` (for "genesis" command): Path to genesis.sun file (default: `./genesis.sun`)

### import
- `-s, --source <dir>`: Source directory for SunScript files (default: `./src`)
- `-o, --output <dir>`: Output directory for original code (default: `./imported`)
- `--no-comments`: Exclude generated comments

## Examples

### Single File Compilation
```bash
# Compile to JavaScript (default)
sunscript compile mycode.sun

# Compile to TypeScript
sunscript compile mycode.sun -t typescript

# Compile to specific directory
sunscript compile mycode.sun -o ./build
```

### Project Compilation with Genesis
```bash
# The fun way - compile entire project
sunscript let there be light

# Specify a different genesis file
sunscript let there be light -g ./config/genesis.sun

# The standard way
sunscript genesis

# With custom genesis file
sunscript genesis -f ./my-project.genesis.sun
```

### GitHub Project Import
```bash
# Import a repository
sunscript import https://github.com/lodash/lodash

# Import with custom directories
sunscript import https://github.com/facebook/react -s ./react-src -o ./react-original

# Import without comments for faster processing
sunscript import https://github.com/expressjs/express --no-comments
```

## The "Let There Be Light" Experience

When you run `sunscript let there be light`, you'll see:

```
🌌 In the beginning was the void...
⚡ And then the developer said: "Let there be light!"
✨ And there was code.

📖 Reading the sacred texts from ./genesis.sun...

🎉 Creation complete!
   Project: My Awesome Project
   Files created: 15

🌍 And the developer saw that the code was good.
Output written to: ./build
```

## Tips

1. Always ensure you have a valid `genesis.sun` file when using project compilation
2. The "let there be light" command requires exact spacing: `let there be light`
3. Set your `OPENAI_API_KEY` environment variable before running commands
4. Use `.env` file in your project root for API keys