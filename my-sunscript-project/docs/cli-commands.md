# SunScript CLI Commands

## Basic Commands

### Run a SunScript file
```bash
sunscript run hello.sun
sunscript run genesis.sun
sunscript run my-app.sun --verbose
```

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

### run
- `--full`: Force full build (disable incremental compilation)
- `--watch`: Enable watch mode with incremental compilation  
- `--clear-cache`: Clear incremental compilation cache
- `-v, --verbose`: Verbose output showing compilation details

### compile
- `-o, --output <dir>`: Output directory (default: `./dist`)
- `-t, --target <language>`: Target language - javascript, typescript, python, html (default: `javascript`)

### let there be light / genesis
- `-g, --genesis <file>` (for "let" command): Path to genesis.sun file (default: `./genesis.sun`)
- `-f, --file <file>` (for "genesis" command): Path to genesis.sun file (default: `./genesis.sun`)
- `--full`: Force full build (disable incremental compilation)
- `--watch`: Enable watch mode with incremental compilation
- `--clear-cache`: Clear incremental compilation cache
- `-v, --verbose`: Verbose output showing incremental compilation details

### import
- `-s, --source <dir>`: Source directory for SunScript files (default: `./src`)
- `-o, --output <dir>`: Output directory for original code (default: `./imported`)
- `--no-comments`: Exclude generated comments

## Examples

### Single File Compilation
```bash
# Run any SunScript file (auto-detects genesis)
sunscript run mycode.sun

# Compile to JavaScript (default)
sunscript compile mycode.sun

# Compile to TypeScript
sunscript compile mycode.sun -t typescript

# Compile to specific directory
sunscript compile mycode.sun -o ./build
```

### Project Compilation with Genesis
```bash
# Simple run command (recommended)
sunscript run genesis.sun

# The fun way - compile entire project (incremental by default)
sunscript let there be light

# Force a full rebuild
sunscript let there be light --full
sunscript run genesis.sun --full

# Enable watch mode for development
sunscript let there be light --watch
sunscript run genesis.sun --watch

# Clear cache and rebuild
sunscript let there be light --clear-cache
sunscript run genesis.sun --clear-cache

# Verbose output to see incremental details
sunscript let there be light -v
sunscript run genesis.sun --verbose

# Specify a different genesis file
sunscript let there be light -g ./config/genesis.sun
sunscript run ./config/genesis.sun

# The standard way (all options work the same)
sunscript genesis
sunscript genesis --watch --verbose
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

## Incremental Compilation Experience

SunScript now features intelligent incremental compilation for lightning-fast builds:

### First Build
```
🌌 In the beginning was the void...
⚡ And then the developer said: "Let there be light!"
✨ And there was code.

📖 Reading the sacred texts from ./genesis.sun...

🎉 Creation complete!
   Project: My Awesome Project
   Files processed: 15
   ⚡ Incremental compilation enabled

🌍 And the developer saw that the code was good.
   Output written to: ./build
```

### Subsequent Builds (No Changes)
```
⚡ Lightning fast! No changes detected.
   Output written to: ./build
```

### Incremental Updates
```
🔄 Incremental build: 1 modified, 2 dependents updated
   Compilation time: 850ms

🌍 And the developer saw that the code was good.
   Output written to: ./build
```

### Watch Mode
```bash
sunscript let there be light --watch
```
```
👀 Watching for changes... Press Ctrl+C to stop.

# When you save a file:
📝 File changed: src/utils.sun
⚡ Incremental build completed: 1 changes, 432ms

# When you save without changes:
📄 File saved, no changes detected
```

## Tips

1. **Incremental compilation is enabled by default** - enjoy lightning-fast builds!
2. Use `--watch` mode during development for automatic rebuilds
3. Use `--full` when you want a complete rebuild from scratch
4. The "let there be light" command requires exact spacing: `let there be light`
5. Set your `OPENAI_API_KEY` environment variable before running commands
6. Use `.env` file in your project root for API keys
7. Clear cache with `--clear-cache` if you experience unexpected behavior
8. Use `-v` flag to see detailed incremental compilation information