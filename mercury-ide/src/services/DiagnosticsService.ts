import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import * as monaco from 'monaco-editor';

export interface Diagnostic {
    uri: string;
    severity: monaco.MarkerSeverity;
    message: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    source: string;
    code?: string | number;
    relatedInformation?: DiagnosticRelatedInformation[];
}

export interface DiagnosticRelatedInformation {
    location: {
        uri: string;
        range: {
            startLineNumber: number;
            startColumn: number;
            endLineNumber: number;
            endColumn: number;
        };
    };
    message: string;
}

@injectable()
export class DiagnosticsService {
    private diagnostics = new Map<string, Diagnostic[]>();
    private problemsCount = { errors: 0, warnings: 0, infos: 0 };
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for diagnostics updates from LSP
        this.eventBus.on('diagnostics.updated', (event) => {
            const { uri, diagnostics } = event.data;
            this.updateDiagnostics(uri, diagnostics);
        });
        
        // Listen for model changes to run local validation
        this.eventBus.on('editor.model.changed', (event) => {
            const { model } = event.data;
            this.validateModel(model);
        });
    }
    
    updateDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
        this.diagnostics.set(uri, diagnostics);
        this.updateProblemsCount();
        this.eventBus.emit('diagnostics.changed', { uri, diagnostics });
    }
    
    private updateProblemsCount(): void {
        let errors = 0;
        let warnings = 0;
        let infos = 0;
        
        for (const diagnostics of this.diagnostics.values()) {
            for (const diagnostic of diagnostics) {
                switch (diagnostic.severity) {
                    case monaco.MarkerSeverity.Error:
                        errors++;
                        break;
                    case monaco.MarkerSeverity.Warning:
                        warnings++;
                        break;
                    case monaco.MarkerSeverity.Info:
                    case monaco.MarkerSeverity.Hint:
                        infos++;
                        break;
                }
            }
        }
        
        this.problemsCount = { errors, warnings, infos };
        this.eventBus.emit('problems.countChanged', this.problemsCount);
    }
    
    private async validateModel(model: monaco.editor.ITextModel): Promise<void> {
        const uri = model.uri.toString();
        const text = model.getValue();
        const language = model.getLanguageId();
        
        if (language !== 'sunscript') return;
        
        const diagnostics = await this.validateSunScript(text, uri);
        
        // Convert to Monaco markers
        const markers: monaco.editor.IMarkerData[] = diagnostics.map(diagnostic => ({
            severity: diagnostic.severity,
            startLineNumber: diagnostic.startLineNumber,
            startColumn: diagnostic.startColumn,
            endLineNumber: diagnostic.endLineNumber,
            endColumn: diagnostic.endColumn,
            message: diagnostic.message,
            source: diagnostic.source,
            code: typeof diagnostic.code === "number" ? String(diagnostic.code) : diagnostic.code
        }));
        
        // Set markers on the model
        monaco.editor.setModelMarkers(model, 'sunscript-validator', markers);
        
        // Update our diagnostics
        this.updateDiagnostics(uri, diagnostics);
    }
    
    private async validateSunScript(text: string, uri: string): Promise<Diagnostic[]> {
        const diagnostics: Diagnostic[] = [];
        const lines = text.split('\n');
        
        // Basic syntax validation
        let braceCount = 0;
        let parenCount = 0;
        let bracketCount = 0;
        
        lines.forEach((line, lineIndex) => {
            const lineNumber = lineIndex + 1;
            
            // Count brackets
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
            parenCount += (line.match(/\(/g) || []).length;
            parenCount -= (line.match(/\)/g) || []).length;
            bracketCount += (line.match(/\[/g) || []).length;
            bracketCount -= (line.match(/\]/g) || []).length;
            
            // Check for unknown decorators
            const decoratorMatch = line.match(/@(\w+)/g);
            if (decoratorMatch) {
                const knownDecorators = [
                    'task', 'component', 'service', 'api', 'route', 'middleware',
                    'auth', 'public', 'private', 'protected', 'override',
                    'syntax', 'model', 'schema', 'validation', 'inject'
                ];
                
                decoratorMatch.forEach(decorator => {
                    const decoratorName = decorator.substring(1);
                    if (!knownDecorators.includes(decoratorName)) {
                        const column = line.indexOf(decorator) + 1;
                        diagnostics.push({
                            uri,
                            severity: monaco.MarkerSeverity.Warning,
                            message: `Unknown decorator '${decorator}'`,
                            startLineNumber: lineNumber,
                            startColumn: column,
                            endLineNumber: lineNumber,
                            endColumn: column + decorator.length,
                            source: 'SunScript Validator',
                            code: 'unknown-decorator'
                        });
                    }
                });
            }
            
            // Check for missing semicolons (optional but recommended)
            if (line.trim() && 
                !line.trim().endsWith(';') && 
                !line.trim().endsWith('{') && 
                !line.trim().endsWith('}') && 
                !line.trim().startsWith('//') && 
                !line.trim().startsWith('*') &&
                !line.includes('import') &&
                !line.includes('export')) {
                
                const shouldHaveSemicolon = /^(const|let|var|return|break|continue)\s/.test(line.trim()) ||
                                          /\w+\s*=/.test(line.trim()) ||
                                          /\w+\([^)]*\)$/.test(line.trim());
                
                if (shouldHaveSemicolon) {
                    diagnostics.push({
                        uri,
                        severity: monaco.MarkerSeverity.Info,
                        message: 'Missing semicolon',
                        startLineNumber: lineNumber,
                        startColumn: line.length,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1,
                        source: 'SunScript Validator',
                        code: 'missing-semicolon'
                    });
                }
            }
            
            // Check for unused variables (simple heuristic)
            const varMatch = line.match(/(?:const|let|var)\s+(\w+)/g);
            if (varMatch) {
                varMatch.forEach(match => {
                    const varName = match.split(/\s+/)[1];
                    const isUsed = text.includes(varName + '.') || 
                                  text.includes(varName + '[') ||
                                  text.includes(varName + '(') ||
                                  text.includes('(' + varName + ')') ||
                                  text.includes(' ' + varName + ' ') ||
                                  text.includes(' ' + varName + ';');
                    
                    if (!isUsed) {
                        const column = line.indexOf(varName) + 1;
                        diagnostics.push({
                            uri,
                            severity: monaco.MarkerSeverity.Hint,
                            message: `Variable '${varName}' is declared but never used`,
                            startLineNumber: lineNumber,
                            startColumn: column,
                            endLineNumber: lineNumber,
                            endColumn: column + varName.length,
                            source: 'SunScript Validator',
                            code: 'unused-variable'
                        });
                    }
                });
            }
        });
        
        // Check for unmatched brackets
        if (braceCount !== 0) {
            diagnostics.push({
                uri,
                severity: monaco.MarkerSeverity.Error,
                message: `Unmatched braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'} brace(s)`,
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
                source: 'SunScript Validator',
                code: 'unmatched-braces'
            });
        }
        
        if (parenCount !== 0) {
            diagnostics.push({
                uri,
                severity: monaco.MarkerSeverity.Error,
                message: `Unmatched parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'} parenthesis`,
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
                source: 'SunScript Validator',
                code: 'unmatched-parentheses'
            });
        }
        
        if (bracketCount !== 0) {
            diagnostics.push({
                uri,
                severity: monaco.MarkerSeverity.Error,
                message: `Unmatched brackets: ${bracketCount > 0 ? 'missing closing' : 'extra closing'} bracket(s)`,
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
                source: 'SunScript Validator',
                code: 'unmatched-brackets'
            });
        }
        
        return diagnostics;
    }
    
    getDiagnostics(uri?: string): Diagnostic[] {
        if (uri) {
            return this.diagnostics.get(uri) || [];
        }
        
        const allDiagnostics: Diagnostic[] = [];
        for (const diagnostics of this.diagnostics.values()) {
            allDiagnostics.push(...diagnostics);
        }
        return allDiagnostics;
    }
    
    getProblemsCount(): { errors: number; warnings: number; infos: number } {
        return { ...this.problemsCount };
    }
    
    clearDiagnostics(uri: string): void {
        this.diagnostics.delete(uri);
        const model = monaco.editor.getModel(monaco.Uri.parse(uri));
        if (model) {
            monaco.editor.setModelMarkers(model, 'sunscript-validator', []);
        }
        this.updateProblemsCount();
        this.eventBus.emit('diagnostics.cleared', { uri });
    }
    
    clearAllDiagnostics(): void {
        for (const uri of this.diagnostics.keys()) {
            this.clearDiagnostics(uri);
        }
    }
}