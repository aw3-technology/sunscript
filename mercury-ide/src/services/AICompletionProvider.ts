import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { AIService, CompletionRequest, CompletionResponse, CompletionItem } from './AIService';
import { EditorService } from './EditorService';

export interface CompletionContext {
    position: {
        line: number;
        character: number;
    };
    textDocument: {
        uri: string;
        languageId: string;
        version: number;
        lineCount: number;
    };
    triggerKind: CompletionTriggerKind;
    triggerCharacter?: string;
}

export enum CompletionTriggerKind {
    Invoked = 1,
    TriggerCharacter = 2,
    TriggerForIncompleteCompletions = 3
}

@injectable()
export class AICompletionProvider {
    private isEnabled: boolean = true;
    private completionCache = new Map<string, { response: CompletionResponse; timestamp: number }>();
    private readonly CACHE_DURATION = 30000; // 30 seconds
    private readonly COMPLETION_DELAY = 300; // 300ms debounce
    private completionTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.AIService) private aiService: AIService,
        @inject(TYPES.EditorService) private editorService: EditorService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('editor.completion.request', async (event) => {
            const { context, callback } = event.data;
            const completions = await this.provideCompletionItems(context);
            callback(completions);
        });

        this.eventBus.on('editor.textChanged', (event) => {
            const { position, character } = event.data;
            this.handleTextChange(position, character);
        });

        this.eventBus.on('ai.completion.enable', () => {
            this.enable();
        });

        this.eventBus.on('ai.completion.disable', () => {
            this.disable();
        });

        this.eventBus.on('ai.configured', () => {
            // Clear cache when AI configuration changes
            this.completionCache.clear();
        });
    }

    async provideCompletionItems(context: CompletionContext): Promise<CompletionResponse> {
        if (!this.isEnabled || !this.aiService.isConfigured()) {
            return { suggestions: [] };
        }

        try {
            const cacheKey = this.generateCacheKey(context);
            const cached = this.getCachedCompletion(cacheKey);
            
            if (cached) {
                return cached;
            }

            const request = await this.buildCompletionRequest(context);
            const response = await this.aiService.getCompletion(request);
            
            // Cache the response
            this.cacheCompletion(cacheKey, response);
            
            return response;
        } catch (error) {
            console.error('AI completion error:', error);
            return { suggestions: [] };
        }
    }

    private async buildCompletionRequest(context: CompletionContext): Promise<CompletionRequest> {
        const editor = this.editorService.getActiveEditor();
        if (!editor) {
            throw new Error('No active editor');
        }

        const model = editor.getModel();
        if (!model) {
            throw new Error('No editor model');
        }

        const position = context.position;
        const fullText = model.getValue();
        const cursorOffset = model.getOffsetAt({ lineNumber: position.line + 1, column: position.character + 1 });
        
        // Get surrounding context (previous and next lines)
        const lineCount = model.getLineCount();
        const contextLines = 5;
        const startLine = Math.max(1, position.line - contextLines);
        const endLine = Math.min(lineCount, position.line + contextLines);
        
        let contextText = '';
        for (let line = startLine; line <= endLine; line++) {
            const lineContent = model.getLineContent(line);
            if (line === position.line) {
                // Mark the cursor position
                const beforeCursor = lineContent.substring(0, position.character);
                const afterCursor = lineContent.substring(position.character);
                contextText += beforeCursor + '|CURSOR|' + afterCursor + '\n';
            } else {
                contextText += lineContent + '\n';
            }
        }

        return {
            text: fullText,
            position: cursorOffset,
            fileName: context.textDocument.uri,
            language: context.textDocument.languageId,
            context: contextText
        };
    }

    private handleTextChange(position: any, character: string): void {
        if (!this.isEnabled || !this.shouldTriggerCompletion(character)) {
            return;
        }

        // Debounce completion requests
        if (this.completionTimer) {
            clearTimeout(this.completionTimer);
        }

        this.completionTimer = window.setTimeout(() => {
            this.triggerCompletion(position, character);
        }, this.COMPLETION_DELAY) as unknown as ReturnType<typeof setTimeout>;
    }

    private shouldTriggerCompletion(character: string): boolean {
        // Trigger completion for certain characters
        const triggerChars = ['.', '(', '{', '[', ':', ' ', '\n'];
        return triggerChars.includes(character);
    }

    private async triggerCompletion(position: any, triggerCharacter: string): Promise<void> {
        const editor = this.editorService.getActiveEditor();
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        const context: CompletionContext = {
            position,
            textDocument: {
                uri: model.uri.toString(),
                languageId: model.getLanguageId(),
                version: model.getVersionId(),
                lineCount: model.getLineCount()
            },
            triggerKind: CompletionTriggerKind.TriggerCharacter,
            triggerCharacter
        };

        try {
            const response = await this.provideCompletionItems(context);
            
            if (response.suggestions.length > 0) {
                this.eventBus.emit('editor.completion.show', {
                    position,
                    suggestions: response.suggestions
                });
            }
        } catch (error) {
            console.error('Failed to trigger completion:', error);
        }
    }

    private generateCacheKey(context: CompletionContext): string {
        const { position, textDocument, triggerCharacter } = context;
        return `${textDocument.uri}:${position.line}:${position.character}:${triggerCharacter || ''}`;
    }

    private getCachedCompletion(key: string): CompletionResponse | null {
        const cached = this.completionCache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.CACHE_DURATION) {
            this.completionCache.delete(key);
            return null;
        }

        return cached.response;
    }

    private cacheCompletion(key: string, response: CompletionResponse): void {
        this.completionCache.set(key, {
            response,
            timestamp: Date.now()
        });

        // Cleanup old cache entries
        this.cleanupCache();
    }

    private cleanupCache(): void {
        const now = Date.now();
        for (const [key, cached] of this.completionCache.entries()) {
            if (now - cached.timestamp > this.CACHE_DURATION) {
                this.completionCache.delete(key);
            }
        }
    }

    // Integration with Monaco Editor
    public registerMonacoProvider(): void {
        if (typeof window !== 'undefined' && (window as any).monaco) {
            const monaco = (window as any).monaco;
            
            // Register completion provider for SunScript
            monaco.languages.registerCompletionItemProvider('sunscript', {
                triggerCharacters: ['.', '(', '{', '[', ':', ' '],
                
                provideCompletionItems: async (model: any, position: any, context: any) => {
                    if (!this.isEnabled || !this.aiService.isConfigured()) {
                        return { suggestions: [] };
                    }

                    const completionContext: CompletionContext = {
                        position: {
                            line: position.lineNumber,
                            character: position.column - 1
                        },
                        textDocument: {
                            uri: model.uri.toString(),
                            languageId: model.getLanguageId(),
                            version: model.getVersionId(),
                            lineCount: model.getLineCount()
                        },
                        triggerKind: context.triggerKind || CompletionTriggerKind.Invoked,
                        triggerCharacter: context.triggerCharacter
                    };

                    try {
                        const response = await this.provideCompletionItems(completionContext);
                        
                        return {
                            suggestions: response.suggestions.map(item => this.convertToMonacoCompletion(item, position))
                        };
                    } catch (error) {
                        console.error('Monaco completion error:', error);
                        return { suggestions: [] };
                    }
                }
            });

            // Register for other languages too
            const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp'];
            supportedLanguages.forEach(language => {
                monaco.languages.registerCompletionItemProvider(language, {
                    triggerCharacters: ['.', '(', '{', '[', ':', ' '],
                    provideCompletionItems: async (model: any, position: any, context: any) => {
                        // Similar implementation for other languages
                        const completionContext: CompletionContext = {
                            position: {
                                line: position.lineNumber,
                                character: position.column - 1
                            },
                            textDocument: {
                                uri: model.uri.toString(),
                                languageId: language,
                                version: model.getVersionId(),
                                lineCount: model.getLineCount()
                            },
                            triggerKind: context.triggerKind || CompletionTriggerKind.Invoked,
                            triggerCharacter: context.triggerCharacter
                        };

                        const response = await this.provideCompletionItems(completionContext);
                        
                        return {
                            suggestions: response.suggestions.map(item => 
                                this.convertToMonacoCompletion(item, position)
                            )
                        };
                    }
                });
            });
        }
    }

    private convertToMonacoCompletion(item: CompletionItem, position: any): any {
        if (typeof window !== 'undefined' && (window as any).monaco) {
            const monaco = (window as any).monaco;
            
            return {
                label: item.label,
                kind: this.convertCompletionKind(item.kind),
                insertText: item.insertText,
                detail: item.detail,
                documentation: item.documentation ? {
                    value: item.documentation
                } : undefined,
                sortText: item.sortText,
                filterText: item.filterText,
                range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endColumn: position.column
                },
                additionalTextEdits: item.additionalTextEdits?.map(edit => ({
                    range: {
                        startLineNumber: edit.range.start.line + 1,
                        endLineNumber: edit.range.end.line + 1,
                        startColumn: edit.range.start.character + 1,
                        endColumn: edit.range.end.character + 1
                    },
                    text: edit.newText
                }))
            };
        }
        return item;
    }

    private convertCompletionKind(kind: any): any {
        if (typeof window !== 'undefined' && (window as any).monaco) {
            const monaco = (window as any).monaco;
            
            const kindMap: Record<number, any> = {
                1: monaco.languages.CompletionItemKind.Text,
                2: monaco.languages.CompletionItemKind.Method,
                3: monaco.languages.CompletionItemKind.Function,
                4: monaco.languages.CompletionItemKind.Constructor,
                5: monaco.languages.CompletionItemKind.Field,
                6: monaco.languages.CompletionItemKind.Variable,
                7: monaco.languages.CompletionItemKind.Class,
                8: monaco.languages.CompletionItemKind.Interface,
                9: monaco.languages.CompletionItemKind.Module,
                10: monaco.languages.CompletionItemKind.Property,
                11: monaco.languages.CompletionItemKind.Unit,
                12: monaco.languages.CompletionItemKind.Value,
                13: monaco.languages.CompletionItemKind.Enum,
                14: monaco.languages.CompletionItemKind.Keyword,
                15: monaco.languages.CompletionItemKind.Snippet,
                16: monaco.languages.CompletionItemKind.Color,
                17: monaco.languages.CompletionItemKind.File,
                18: monaco.languages.CompletionItemKind.Reference,
                19: monaco.languages.CompletionItemKind.Folder,
                20: monaco.languages.CompletionItemKind.EnumMember,
                21: monaco.languages.CompletionItemKind.Constant,
                22: monaco.languages.CompletionItemKind.Struct,
                23: monaco.languages.CompletionItemKind.Event,
                24: monaco.languages.CompletionItemKind.Operator,
                25: monaco.languages.CompletionItemKind.TypeParameter
            };
            
            return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
        }
        return kind;
    }

    // Public API
    enable(): void {
        this.isEnabled = true;
        this.eventBus.emit('ai.completion.enabled', {});
    }

    disable(): void {
        this.isEnabled = false;
        this.completionCache.clear();
        this.eventBus.emit('ai.completion.disabled', {});
    }

    isCompletionEnabled(): boolean {
        return this.isEnabled && this.aiService.isConfigured();
    }

    clearCache(): void {
        this.completionCache.clear();
    }

    getCacheSize(): number {
        return this.completionCache.size;
    }
}