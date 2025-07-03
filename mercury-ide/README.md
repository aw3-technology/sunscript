# SunScript IDE

A browser-based IDE for developing SunScript applications, built with TypeScript and Monaco Editor.

## Features

- **Code Editor**: Full-featured code editor with SunScript syntax highlighting
- **File Explorer**: Navigate and manage project files
- **Live Compilation**: Run and build SunScript code directly in the browser
- **Output Console**: View compilation results and runtime output
- **Project Structure**: Support for SunScript project organization

## Getting Started

### Installation

```bash
cd mercury-ide/sunscript-ide
npm install
```

### Development

```bash
npm run dev
```

This will start the development server at http://localhost:3000

### Building

```bash
npm run build
```

This will create a production build in the `dist` directory.

## Architecture

The IDE is structured into several key components:

- **Editor**: Monaco-based code editor with custom SunScript language support
- **FileExplorer**: Tree view for project navigation
- **OutputPanel**: Console for displaying compilation and runtime output
- **Toolbar**: Quick access to common actions (New, Open, Save, Run, Build)

## SunScript Language Support

The IDE includes:
- Syntax highlighting for SunScript decorators (@task, @component, @project, etc.)
- Auto-completion for common patterns
- Bracket matching and auto-closing
- Comment support (// and /* */)

## Services

- **FileSystemService**: Manages virtual file system in the browser
- **SunScriptCompilerService**: Handles compilation and execution of SunScript code

## Future Enhancements

- Integration with actual SunScript compiler
- Project templates and scaffolding
- Debugging support
- Git integration
- Plugin system
- Themes and customization