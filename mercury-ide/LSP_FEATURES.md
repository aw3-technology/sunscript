# SunScript IDE - Language Server Protocol & Advanced Features

## Overview

The SunScript IDE now includes comprehensive Language Server Protocol (LSP) support and advanced language features, providing a professional development experience comparable to VS Code.

## Features Implemented

### 1. Language Server Protocol (LSP) Integration

- **WebSocket-based LSP Client**: Connects to SunScript language servers
- **Full LSP Support**: Implements the complete LSP specification
- **Real-time Communication**: Bidirectional communication with language servers
- **Document Synchronization**: Automatic sync of document changes

#### LSP Capabilities:
- Text document synchronization (open, change, close)
- Completion requests with context
- Hover information
- Go to definition/references
- Signature help (parameter hints)
- Document symbols
- Code actions
- Rename operations
- Diagnostics (errors, warnings, hints)

### 2. TextMate Grammar Support

- **Advanced Syntax Highlighting**: Rich, context-aware syntax coloring
- **SunScript Grammar**: Custom grammar for SunScript decorators and syntax
- **Extensible**: Support for additional language grammars
- **Pattern Matching**: Complex regex-based tokenization

#### Grammar Features:
- Decorator highlighting (`@task`, `@component`, etc.)
- Keyword recognition
- String interpolation support
- Comment styles (line and block)
- Operator and symbol highlighting
- Function and variable recognition

### 3. Enhanced Auto-completion with IntelliSense

- **Context-aware Suggestions**: Smart completions based on cursor position
- **Decorator Completions**: Auto-suggest SunScript decorators
- **Property Access**: Object property and method suggestions
- **Import Suggestions**: Module and file path completions
- **Snippet Support**: Pre-built code templates
- **Function Context**: Specialized completions inside functions/components

#### Completion Types:
- Keywords and language constructs
- SunScript decorators with documentation
- Function signatures
- Variable properties
- Import paths
- Code snippets (tasks, components, services)

### 4. Parameter Hints & Signature Help

- **Function Signatures**: Show parameter information while typing
- **Active Parameter**: Highlight current parameter being entered
- **Multiple Signatures**: Support for function overloads
- **Built-in Functions**: Signatures for common JavaScript/browser APIs

#### Supported Functions:
- `console.log(message, ...params)`
- `fetch(input, init?)`
- `setTimeout(callback, delay, ...args)`
- Custom SunScript functions (via LSP)

### 5. Advanced Diagnostics & Validation

- **Real-time Validation**: Instant feedback on syntax errors
- **Multi-level Diagnostics**: Errors, warnings, info, and hints
- **SunScript-specific Rules**: Custom validation for SunScript syntax
- **Quick Fixes**: Suggested fixes for common issues

#### Validation Rules:
- Bracket matching (braces, parentheses, brackets)
- Unknown decorator detection
- Unused variable detection
- Missing semicolon hints
- Syntax error reporting

### 6. Problems Panel

- **Unified Problem View**: All diagnostics in one place
- **Filtering**: Filter by error type (errors, warnings, info)
- **File Grouping**: Organize problems by file
- **Quick Navigation**: Click to jump to problem location
- **Problem Counts**: Real-time count of issues

#### Panel Features:
- Filter buttons for each severity level
- File-based organization
- Clickable navigation to source
- Clear all functionality
- Visual severity indicators

### 7. Enhanced Language Features

- **Inlay Hints**: Type information displayed inline
- **Code Actions**: Quick fixes and refactoring suggestions
- **Document Formatting**: Auto-format SunScript code
- **Symbol Navigation**: Document outline and breadcrumbs

## Usage

### Connecting to a Language Server

```typescript
const lspClient = container.get<LanguageServerClient>(TYPES.LanguageServerClient);

await lspClient.connect({
    serverUrl: 'ws://localhost:8080/sunscript-lsp',
    languageId: 'sunscript',
    rootUri: 'file:///workspace'
});
```

### Registering Custom Grammars

```typescript
const textMateService = container.get<TextMateService>(TYPES.TextMateService);

await textMateService.registerLanguage('custom-lang', {
    name: 'Custom Language',
    scopeName: 'source.custom',
    patterns: [/* grammar patterns */],
    repository: {/* grammar rules */}
});
```

### Working with Diagnostics

```typescript
const diagnosticsService = container.get<DiagnosticsService>(TYPES.DiagnosticsService);

// Get all problems
const problems = diagnosticsService.getDiagnostics();

// Get problems for specific file
const fileProblems = diagnosticsService.getDiagnostics('file:///path/to/file.sun');

// Get problem counts
const counts = diagnosticsService.getProblemsCount();
```

## Architecture

### Service Architecture

1. **LanguageServerClient**: Manages LSP communication
2. **TextMateService**: Handles grammar registration and tokenization
3. **DiagnosticsService**: Manages problem detection and reporting
4. **SunScriptLanguageProvider**: Provides language-specific features
5. **ProblemsPanel**: UI for displaying and managing diagnostics

### Event-Driven Communication

All services communicate through the EventBus:
- `diagnostics.updated` - New diagnostics available
- `lsp.connected` - Language server connected
- `textmate.initialized` - Grammar system ready
- `problems.countChanged` - Problem count updated

## Configuration

### LSP Configuration

```json
{
    "sunscript": {
        "lsp": {
            "enabled": true,
            "serverUrl": "ws://localhost:8080",
            "features": {
                "completion": true,
                "hover": true,
                "diagnostics": true,
                "formatting": true
            }
        }
    }
}
```

### Grammar Configuration

TextMate grammars are automatically loaded and can be extended through the service API.

## Future Enhancements

- **Multi-language Support**: Additional language servers
- **Custom LSP Features**: SunScript-specific protocol extensions
- **Advanced Refactoring**: Extract method, inline variable, etc.
- **Semantic Highlighting**: Token-based highlighting from LSP
- **Code Lens**: Inline actionable information
- **Folding Ranges**: Smart code folding based on language structure

## Troubleshooting

### Common Issues

1. **LSP Connection Failed**: Check server URL and availability
2. **Grammar Not Loading**: Verify WASM files are accessible
3. **Diagnostics Not Updating**: Check event bus connections
4. **Completion Not Working**: Verify LSP capabilities and triggers

### Debug Information

Enable debug logging:
```typescript
// In browser console
localStorage.setItem('sunscript-ide-debug', 'true');
```

This enables detailed logging for all LSP and language service operations.