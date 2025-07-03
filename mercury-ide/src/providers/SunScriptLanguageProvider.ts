import * as monaco from 'monaco-editor';
import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { FileSystemService } from '../services/FileSystemService';

@injectable()
export class SunScriptLanguageProvider {
    constructor(
        @inject(TYPES.FileSystemService) private fileSystemService: FileSystemService
    ) {}
    
    register(): void {
        // Register hover provider
        monaco.languages.registerHoverProvider('sunscript', {
            provideHover: (model, position) => this.provideHover(model, position)
        });
        
        // Register definition provider
        monaco.languages.registerDefinitionProvider('sunscript', {
            provideDefinition: (model, position) => this.provideDefinition(model, position)
        });
        
        // Register references provider
        monaco.languages.registerReferenceProvider('sunscript', {
            provideReferences: (model, position, context) => this.provideReferences(model, position, context)
        });
        
        // Register rename provider
        monaco.languages.registerRenameProvider('sunscript', {
            provideRenameEdits: (model, position, newName) => this.provideRenameEdits(model, position, newName),
            resolveRenameLocation: (model, position) => this.resolveRenameLocation(model, position)
        });
        
        // Register code action provider
        monaco.languages.registerCodeActionProvider('sunscript', {
            provideCodeActions: (model, range, context) => this.provideCodeActions(model, range, context)
        });
        
        // Register formatting provider
        monaco.languages.registerDocumentFormattingEditProvider('sunscript', {
            provideDocumentFormattingEdits: (model, options) => this.provideDocumentFormattingEdits(model, options)
        });
        
        monaco.languages.registerDocumentRangeFormattingEditProvider('sunscript', {
            provideDocumentRangeFormattingEdits: (model, range, options) => 
                this.provideDocumentRangeFormattingEdits(model, range, options)
        });
        
        // Register completion provider with enhanced IntelliSense
        monaco.languages.registerCompletionItemProvider('sunscript', {
            provideCompletionItems: (model, position, context) => this.provideCompletionItems(model, position, context),
            resolveCompletionItem: (item) => this.resolveCompletionItem(item),
            triggerCharacters: ['.', '@', '"', "'", '`', ' ', '(']
        });
        
        // Register signature help provider for parameter hints
        monaco.languages.registerSignatureHelpProvider('sunscript', {
            signatureHelpTriggerCharacters: ['(', ','],
            signatureHelpRetriggerCharacters: [')'],
            provideSignatureHelp: (model, position) => this.provideSignatureHelp(model, position)
        });
        
        // Register symbol provider
        monaco.languages.registerDocumentSymbolProvider('sunscript', {
            provideDocumentSymbols: (model) => this.provideDocumentSymbols(model)
        });
        
        // Register inlay hints provider
        monaco.languages.registerInlayHintsProvider('sunscript', {
            provideInlayHints: (model, range) => this.provideInlayHints(model, range)
        });
    }
    
    private async provideHover(
        model: monaco.editor.ITextModel, 
        position: monaco.Position
    ): Promise<monaco.languages.Hover | null> {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        
        const text = word.word;
        
        // Check for SunScript keywords/decorators
        const hoverInfo = this.getSunScriptHoverInfo(text);
        if (hoverInfo) {
            return {
                contents: [
                    { value: `**${hoverInfo.title}**` },
                    { value: hoverInfo.description }
                ],
                range: new monaco.Range(
                    position.lineNumber,
                    word.startColumn,
                    position.lineNumber,
                    word.endColumn
                )
            };
        }
        
        return null;
    }
    
    private getSunScriptHoverInfo(text: string): { title: string; description: string } | null {
        const hoverData: Record<string, { title: string; description: string }> = {
            '@task': {
                title: '@task',
                description: 'Defines a task in SunScript. Tasks are the basic units of execution.'
            },
            '@component': {
                title: '@component',
                description: 'Creates a reusable component with state and lifecycle methods.'
            },
            '@service': {
                title: '@service',
                description: 'Defines a service that can be injected into other components.'
            },
            '@api': {
                title: '@api',
                description: 'Creates an API endpoint with automatic routing and validation.'
            },
            '@route': {
                title: '@route',
                description: 'Defines a route for an API endpoint.'
            },
            '@middleware': {
                title: '@middleware',
                description: 'Adds middleware to process requests before they reach the handler.'
            },
            '@auth': {
                title: '@auth',
                description: 'Adds authentication requirements to a route or component.'
            },
            '@syntax': {
                title: '@syntax',
                description: 'Specifies the syntax mode for code generation (e.g., flex for AI).'
            }
        };
        
        return hoverData[text] || null;
    }
    
    private async provideDefinition(
        model: monaco.editor.ITextModel,
        position: monaco.Position
    ): Promise<monaco.languages.Definition | null> {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        
        // Simple implementation: look for imports
        const text = model.getValue();
        const importMatch = text.match(new RegExp(`import\\s+.*${word.word}.*\\s+from\\s+['"](.*?)['"]`));
        
        if (importMatch) {
            const importPath = importMatch[1];
            // TODO: Resolve actual file path and position
            return {
                uri: monaco.Uri.parse(importPath),
                range: new monaco.Range(1, 1, 1, 1)
            };
        }
        
        return null;
    }
    
    private async provideReferences(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.ReferenceContext
    ): Promise<monaco.languages.Location[]> {
        const word = model.getWordAtPosition(position);
        if (!word) return [];
        
        const references: monaco.languages.Location[] = [];
        const lines = model.getLinesContent();
        
        // Find all occurrences of the word
        lines.forEach((line, lineIndex) => {
            let columnIndex = line.indexOf(word.word);
            while (columnIndex !== -1) {
                references.push({
                    uri: model.uri,
                    range: new monaco.Range(
                        lineIndex + 1,
                        columnIndex + 1,
                        lineIndex + 1,
                        columnIndex + word.word.length + 1
                    )
                });
                columnIndex = line.indexOf(word.word, columnIndex + 1);
            }
        });
        
        return references;
    }
    
    private async provideRenameEdits(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        newName: string
    ): Promise<monaco.languages.WorkspaceEdit | null> {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        
        const edits: monaco.languages.IWorkspaceTextEdit[] = [];
        const references = await this.provideReferences(model, position, { includeDeclaration: true });
        
        references.forEach(ref => {
            edits.push({
                resource: ref.uri,
                versionId: undefined,
                textEdit: {
                    range: ref.range,
                    text: newName
                }
            });
        });
        
        return { edits };
    }
    
    private async resolveRenameLocation(
        model: monaco.editor.ITextModel,
        position: monaco.Position
    ): Promise<monaco.languages.RenameLocation | null> {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        
        return {
            range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
            ),
            text: word.word
        };
    }
    
    private async provideCodeActions(
        model: monaco.editor.ITextModel,
        range: monaco.Range,
        context: monaco.languages.CodeActionContext
    ): Promise<monaco.languages.CodeActionList> {
        const actions: monaco.languages.CodeAction[] = [];
        
        // Quick fix for missing imports
        context.markers.forEach(marker => {
            if (marker.message.includes('not defined')) {
                actions.push({
                    title: `Import '${marker.message.split("'")[1]}'`,
                    kind: 'quickfix',
                    diagnostics: [marker],
                    edit: {
                        edits: [{
                            resource: model.uri,
                            versionId: undefined,
                            textEdit: {
                                range: new monaco.Range(1, 1, 1, 1),
                                text: `import { ${marker.message.split("'")[1]} } from './module';\n`
                            }
                        }]
                    }
                });
            }
        });
        
        // Add missing decorator
        const line = model.getLineContent(range.startLineNumber);
        if (line.includes('function') && !line.includes('@')) {
            actions.push({
                title: 'Add @task decorator',
                kind: 'refactor',
                edit: {
                    edits: [{
                        resource: model.uri,
                        versionId: undefined,
                        textEdit: {
                            range: new monaco.Range(range.startLineNumber, 1, range.startLineNumber, 1),
                            text: '@task\n'
                        }
                    }]
                }
            });
        }
        
        return {
            actions,
            dispose: () => {}
        };
    }
    
    private async provideDocumentFormattingEdits(
        model: monaco.editor.ITextModel,
        options: monaco.languages.FormattingOptions
    ): Promise<monaco.languages.TextEdit[]> {
        // Simple formatter for SunScript
        const text = model.getValue();
        const formatted = this.formatSunScript(text, options);
        
        return [{
            range: model.getFullModelRange(),
            text: formatted
        }];
    }
    
    private async provideDocumentRangeFormattingEdits(
        model: monaco.editor.ITextModel,
        range: monaco.Range,
        options: monaco.languages.FormattingOptions
    ): Promise<monaco.languages.TextEdit[]> {
        const text = model.getValueInRange(range);
        const formatted = this.formatSunScript(text, options);
        
        return [{
            range: range,
            text: formatted
        }];
    }
    
    private formatSunScript(text: string, options: monaco.languages.FormattingOptions): string {
        // Simple formatting implementation
        let formatted = text;
        
        // Fix indentation
        const lines = formatted.split('\n');
        let indentLevel = 0;
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            
            // Decrease indent for closing braces
            if (trimmed.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            const indented = (options.insertSpaces ? ' '.repeat(options.tabSize) : '\t').repeat(indentLevel) + trimmed;
            
            // Increase indent for opening braces
            if (trimmed.endsWith('{')) {
                indentLevel++;
            }
            
            return indented;
        });
        
        return formattedLines.join('\n');
    }
    
    private async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext
    ): Promise<monaco.languages.CompletionList> {
        const word = model.getWordUntilPosition(position);
        const line = model.getLineContent(position.lineNumber);
        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
        };
        
        const suggestions: monaco.languages.CompletionItem[] = [];
        
        // Context-aware completions
        const linePrefix = line.substring(0, position.column - 1);
        
        // SunScript decorators
        if (word.word.startsWith('@') || linePrefix.endsWith('@')) {
            this.addDecoratorCompletions(suggestions, range, word.word);
        }
        
        // Property access completions
        if (linePrefix.includes('.')) {
            await this.addPropertyCompletions(suggestions, range, linePrefix, model);
        }
        
        // Import completions
        if (linePrefix.includes('from ') || linePrefix.includes('import ')) {
            await this.addImportCompletions(suggestions, range, linePrefix);
        }
        
        // General keyword and snippet completions
        if (!word.word.startsWith('@') && !linePrefix.includes('.')) {
            this.addKeywordCompletions(suggestions, range, word.word);
            this.addSnippetCompletions(suggestions, range);
        }
        
        // Context-specific completions
        if (this.isInFunction(model, position)) {
            this.addFunctionBodyCompletions(suggestions, range);
        }
        
        if (this.isInComponent(model, position)) {
            this.addComponentCompletions(suggestions, range);
        }
        
        return { 
            suggestions,
            incomplete: false
        };
    }
    
    private async resolveCompletionItem(item: monaco.languages.CompletionItem): Promise<monaco.languages.CompletionItem> {
        // Add detailed documentation for completion items
        if (item.label === '@task') {
            item.documentation = {
                value: `**@task** - SunScript Task Decorator
                
Defines a task that can be executed. Tasks are the basic units of execution in SunScript.

**Example:**
\`\`\`sunscript
@task processData {
    // Task implementation
}
\`\`\``
            };
        }
        
        return item;
    }
    
    private addDecoratorCompletions(suggestions: monaco.languages.CompletionItem[], range: any, prefix: string): void {
        const decorators = [
            { name: '@task', detail: 'Define a task', documentation: 'Creates a new executable task' },
            { name: '@component', detail: 'Define a component', documentation: 'Creates a reusable component with state' },
            { name: '@service', detail: 'Define a service', documentation: 'Creates a service that can be injected' },
            { name: '@api', detail: 'Define an API endpoint', documentation: 'Creates an API endpoint with routing' },
            { name: '@route', detail: 'Define a route', documentation: 'Defines HTTP route handling' },
            { name: '@middleware', detail: 'Define middleware', documentation: 'Creates request/response middleware' },
            { name: '@auth', detail: 'Add authentication', documentation: 'Adds authentication requirements' },
            { name: '@syntax', detail: 'Specify syntax mode', documentation: 'Controls code generation syntax' }
        ];
        
        decorators.forEach(decorator => {
            if (decorator.name.startsWith(prefix) || prefix === '@') {
                suggestions.push({
                    label: decorator.name,
                    kind: monaco.languages.CompletionItemKind.Function,
                    detail: decorator.detail,
                    documentation: decorator.documentation,
                    insertText: decorator.name,
                    range: range
                });
            }
        });
    }
    
    private async addPropertyCompletions(suggestions: monaco.languages.CompletionItem[], range: any, linePrefix: string, model: monaco.editor.ITextModel): Promise<void> {
        // Extract object before dot
        const match = linePrefix.match(/(\w+)\.$/);
        if (!match) return;
        
        const objectName = match[1];
        
        // Built-in object properties
        if (objectName === 'this') {
            suggestions.push(
                { label: 'state', kind: monaco.languages.CompletionItemKind.Property, detail: 'Component state', insertText: 'state', range },
                { label: 'props', kind: monaco.languages.CompletionItemKind.Property, detail: 'Component props', insertText: 'props', range },
                { label: 'render', kind: monaco.languages.CompletionItemKind.Method, detail: 'Render method', insertText: 'render()', range }
            );
        }
        
        // Analyze variable types from the document
        const text = model.getValue();
        const variableMatch = text.match(new RegExp(`(?:const|let|var)\\s+${objectName}\\s*=\\s*({[^}]*})`));
        if (variableMatch) {
            const objectContent = variableMatch[1];
            const propertyMatches = objectContent.match(/(\w+):/g);
            if (propertyMatches) {
                propertyMatches.forEach(prop => {
                    const propName = prop.slice(0, -1);
                    suggestions.push({
                        label: propName,
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: propName,
                        range
                    });
                });
            }
        }
    }
    
    private async addImportCompletions(suggestions: monaco.languages.CompletionItem[], range: any, linePrefix: string): Promise<void> {
        // Suggest common SunScript modules
        const modules = [
            { name: './components/Button', detail: 'Button component' },
            { name: './services/ApiService', detail: 'API service' },
            { name: './utils/helpers', detail: 'Helper utilities' }
        ];
        
        modules.forEach(module => {
            suggestions.push({
                label: module.name,
                kind: monaco.languages.CompletionItemKind.Module,
                detail: module.detail,
                insertText: `"${module.name}"`,
                range
            });
        });
    }
    
    private addKeywordCompletions(suggestions: monaco.languages.CompletionItem[], range: any, prefix: string): void {
        const keywords = [
            'import', 'export', 'from', 'as', 'if', 'else', 'for', 'while',
            'return', 'async', 'await', 'function', 'const', 'let', 'var',
            'class', 'extends', 'implements', 'interface', 'type', 'enum'
        ];
        
        keywords.forEach(keyword => {
            if (keyword.startsWith(prefix)) {
                suggestions.push({
                    label: keyword,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: keyword,
                    range: range
                });
            }
        });
    }
    
    private addSnippetCompletions(suggestions: monaco.languages.CompletionItem[], range: any): void {
        const snippets = [
            {
                label: 'task',
                insertText: '@task ${1:taskName} {\n\t$0\n}',
                detail: 'Create a new task',
                documentation: 'Creates a new SunScript task'
            },
            {
                label: 'component',
                insertText: '@component ${1:ComponentName} {\n\tstate: {\n\t\t$2\n\t}\n\t\n\t@task render() {\n\t\treturn `<div>$3</div>`\n\t}\n}',
                detail: 'Create a new component',
                documentation: 'Creates a new SunScript component with state and render method'
            },
            {
                label: 'service',
                insertText: '@service ${1:ServiceName} {\n\t@task ${2:methodName}() {\n\t\t$0\n\t}\n}',
                detail: 'Create a new service',
                documentation: 'Creates a new SunScript service'
            },
            {
                label: 'if',
                insertText: 'if (${1:condition}) {\n\t$0\n}',
                detail: 'If statement',
                documentation: 'Creates an if statement'
            },
            {
                label: 'for',
                insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}',
                detail: 'For loop',
                documentation: 'Creates a for loop'
            }
        ];
        
        snippets.forEach(snippet => {
            suggestions.push({
                label: snippet.label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: snippet.insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: snippet.detail,
                documentation: snippet.documentation,
                range: range
            });
        });
    }
    
    private addFunctionBodyCompletions(suggestions: monaco.languages.CompletionItem[], range: any): void {
        // Add common function body completions
        suggestions.push(
            { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return $0;', range },
            { label: 'console.log', kind: monaco.languages.CompletionItemKind.Function, insertText: 'console.log($0);', range },
            { label: 'try', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'try {\n\t$0\n} catch (error) {\n\tconsole.error(error);\n}', range }
        );
    }
    
    private addComponentCompletions(suggestions: monaco.languages.CompletionItem[], range: any): void {
        // Add component-specific completions
        suggestions.push(
            { label: 'state', kind: monaco.languages.CompletionItemKind.Property, insertText: 'state: {\n\t$0\n}', range },
            { label: 'props', kind: monaco.languages.CompletionItemKind.Property, insertText: 'props: {\n\t$0\n}', range },
            { label: 'render', kind: monaco.languages.CompletionItemKind.Method, insertText: '@task render() {\n\treturn `$0`;\n}', range }
        );
    }
    
    private async provideSignatureHelp(
        model: monaco.editor.ITextModel,
        position: monaco.Position
    ): Promise<monaco.languages.SignatureHelpResult | null> {
        const text = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });
        
        // Find function call
        const functionMatch = text.match(/(\w+)\s*\(\s*([^)]*)$/);
        if (!functionMatch) return null;
        
        const functionName = functionMatch[1];
        const argsText = functionMatch[2];
        const argIndex = argsText ? argsText.split(',').length - 1 : 0;
        
        // Built-in function signatures
        const signatures = this.getFunctionSignatures(functionName);
        if (!signatures.length) return null;
        
        return {
            value: {
                signatures: signatures,
                activeSignature: 0,
                activeParameter: argIndex
            },
            dispose: () => {}
        };
    }
    
    private getFunctionSignatures(functionName: string): monaco.languages.SignatureInformation[] {
        const builtInSignatures: Record<string, monaco.languages.SignatureInformation[]> = {
            'console.log': [{
                label: 'console.log(message: any, ...optionalParams: any[]): void',
                documentation: 'Outputs a message to the console',
                parameters: [
                    { label: 'message', documentation: 'The message to output' },
                    { label: '...optionalParams', documentation: 'Additional parameters to output' }
                ]
            }],
            'fetch': [{
                label: 'fetch(input: RequestInfo, init?: RequestInit): Promise<Response>',
                documentation: 'Starts the process of fetching a resource from the network',
                parameters: [
                    { label: 'input', documentation: 'The resource that you wish to fetch' },
                    { label: 'init', documentation: 'An options object containing custom settings' }
                ]
            }],
            'setTimeout': [{
                label: 'setTimeout(callback: Function, delay: number, ...args: any[]): number',
                documentation: 'Sets a timer which executes a function after a specified delay',
                parameters: [
                    { label: 'callback', documentation: 'The function to execute' },
                    { label: 'delay', documentation: 'The delay in milliseconds' },
                    { label: '...args', documentation: 'Additional arguments to pass to the function' }
                ]
            }]
        };
        
        return builtInSignatures[functionName] || [];
    }
    
    private async provideInlayHints(
        model: monaco.editor.ITextModel,
        range: monaco.Range
    ): Promise<{ hints: monaco.languages.InlayHint[], dispose: () => void }> {
        const hints: monaco.languages.InlayHint[] = [];
        const text = model.getValueInRange(range);
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
            const lineNumber = range.startLineNumber + index;
            
            // Add type hints for variables
            const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(.+)/);
            if (varMatch) {
                const varName = varMatch[1];
                const value = varMatch[2];
                const type = this.inferType(value);
                
                if (type) {
                    hints.push({
                        position: { lineNumber, column: line.indexOf(varName) + varName.length + 1 },
                        label: `: ${type}`,
                        kind: monaco.languages.InlayHintKind.Type
                    });
                }
            }
        });
        
        return { hints, dispose: () => {} };
    }
    
    private inferType(value: string): string | null {
        value = value.trim();
        
        if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) {
            return 'string';
        }
        if (/^\d+$/.test(value)) {
            return 'number';
        }
        if (/^\d*\.\d+$/.test(value)) {
            return 'number';
        }
        if (value === 'true' || value === 'false') {
            return 'boolean';
        }
        if (value.startsWith('[') && value.endsWith(']')) {
            return 'array';
        }
        if (value.startsWith('{') && value.endsWith('}')) {
            return 'object';
        }
        
        return null;
    }
    
    private isInFunction(model: monaco.editor.ITextModel, position: monaco.Position): boolean {
        const text = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });
        
        const functionMatches = text.match(/@task\s+\w+|function\s+\w+/g) || [];
        const braceMatches = text.match(/[{}]/g) || [];
        
        let braceCount = 0;
        for (const brace of braceMatches) {
            if (brace === '{') braceCount++;
            else braceCount--;
        }
        
        return functionMatches.length > 0 && braceCount > 0;
    }
    
    private isInComponent(model: monaco.editor.ITextModel, position: monaco.Position): boolean {
        const text = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });
        
        return text.includes('@component');
    }
    
    private async provideDocumentSymbols(
        model: monaco.editor.ITextModel
    ): Promise<monaco.languages.DocumentSymbol[]> {
        const symbols: monaco.languages.DocumentSymbol[] = [];
        const lines = model.getLinesContent();
        
        let currentIndent = 0;
        const symbolStack: monaco.languages.DocumentSymbol[] = [];
        
        lines.forEach((line, lineIndex) => {
            const trimmed = line.trim();
            
            // Detect SunScript constructs
            let match: RegExpMatchArray | null;
            
            // Tasks
            if ((match = trimmed.match(/@task\s+(\w+)/))) {
                const symbol: monaco.languages.DocumentSymbol = {
                    name: match[1],
                    detail: 'task',
                    kind: monaco.languages.SymbolKind.Function,
                    range: new monaco.Range(lineIndex + 1, 1, lineIndex + 1, line.length + 1),
                    selectionRange: new monaco.Range(lineIndex + 1, 1, lineIndex + 1, line.length + 1),
                    children: [], tags: []
                };
                symbols.push(symbol);
            }
            
            // Components
            else if ((match = trimmed.match(/@component\s+(\w+)/))) {
                const symbol: monaco.languages.DocumentSymbol = {
                    name: match[1],
                    detail: 'component',
                    kind: monaco.languages.SymbolKind.Class,
                    range: new monaco.Range(lineIndex + 1, 1, lineIndex + 1, line.length + 1),
                    selectionRange: new monaco.Range(lineIndex + 1, 1, lineIndex + 1, line.length + 1),
                    children: [], tags: []
                };
                symbols.push(symbol);
            }
            
            // Services
            else if ((match = trimmed.match(/@service\s+(\w+)/))) {
                const symbol: monaco.languages.DocumentSymbol = {
                    name: match[1],
                    detail: 'service',
                    kind: monaco.languages.SymbolKind.Class,
                    range: new monaco.Range(lineIndex + 1, 1, lineIndex + 1, line.length + 1),
                    selectionRange: new monaco.Range(lineIndex + 1, 1, lineIndex + 1, line.length + 1),
                    children: [], tags: []
                };
                symbols.push(symbol);
            }
        });
        
        return symbols;
    }
}