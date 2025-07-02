import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import * as monaco from 'monaco-editor';
import { 
    WebSocketMessageReader,
    WebSocketMessageWriter,
    createWebSocketConnection,
    toSocket
} from 'vscode-ws-jsonrpc';
import {
    createConnection,
    MessageConnection
} from 'vscode-languageserver-protocol/browser';
import {
    InitializeRequest,
    InitializeParams,
    ClientCapabilities,
    WorkspaceFolder,
    TextDocumentSyncKind,
    CompletionTriggerKind,
    DiagnosticSeverity,
    Position,
    Range,
    TextDocumentIdentifier,
    VersionedTextDocumentIdentifier,
    TextDocumentContentChangeEvent,
    DidOpenTextDocumentNotification,
    DidChangeTextDocumentNotification,
    DidCloseTextDocumentNotification,
    CompletionRequest,
    HoverRequest,
    DefinitionRequest,
    ReferencesRequest,
    DocumentSymbolRequest,
    RenameRequest,
    SignatureHelpRequest,
    CodeActionRequest,
    PublishDiagnosticsNotification
} from 'vscode-languageserver-protocol';

export interface LSPConfig {
    serverUrl: string;
    languageId: string;
    rootUri: string;
}

@injectable()
export class LanguageServerClient {
    private connection: MessageConnection | null = null;
    private isInitialized = false;
    private documentVersion = new Map<string, number>();
    private disposables: monaco.IDisposable[] = [];
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {}
    
    async connect(config: LSPConfig): Promise<void> {
        try {
            // Create WebSocket connection to language server
            const webSocket = new WebSocket(config.serverUrl);
            
            // Wait for connection to open
            await new Promise((resolve, reject) => {
                webSocket.onopen = resolve;
                webSocket.onerror = reject;
                setTimeout(() => reject(new Error('Connection timeout')), 5000);
            });
            
            // Create message connection
            const socket = toSocket(webSocket);
            const reader = new WebSocketMessageReader(socket);
            const writer = new WebSocketMessageWriter(socket);
            this.connection = createConnection(reader, writer);
            
            // Setup message handlers
            this.setupMessageHandlers();
            
            // Start listening
            this.connection.listen();
            
            // Initialize language server
            await this.initialize(config);
            
            this.eventBus.emit('lsp.connected', { languageId: config.languageId });
            
        } catch (error) {
            console.error('Failed to connect to language server:', error);
            this.eventBus.emit('lsp.connectionError', { error });
            throw error;
        }
    }
    
    private setupMessageHandlers(): void {
        if (!this.connection) return;
        
        // Handle diagnostics from server
        this.connection.onNotification(PublishDiagnosticsNotification.type, (params) => {
            this.handleDiagnostics(params.uri, params.diagnostics);
        });
        
        // Handle other server notifications
        this.connection.onNotification('window/showMessage', (params: any) => {
            console.log('LSP Message:', params.message);
        });
        
        this.connection.onNotification('window/logMessage', (params: any) => {
            console.log('LSP Log:', params.message);
        });
    }
    
    private async initialize(config: LSPConfig): Promise<void> {
        if (!this.connection) return;
        
        const initParams: InitializeParams = {
            processId: null,
            clientInfo: {
                name: 'SunScript IDE',
                version: '1.0.0'
            },
            rootUri: config.rootUri,
            workspaceFolders: [{
                uri: config.rootUri,
                name: 'workspace'
            } as WorkspaceFolder],
            capabilities: this.getClientCapabilities(),
            initializationOptions: {}
        };
        
        const result = await this.connection.sendRequest(InitializeRequest.type, initParams);
        
        this.isInitialized = true;
        
        // Send initialized notification
        await this.connection.sendNotification('initialized', {});
        
        console.log('Language server initialized:', result);
    }
    
    private getClientCapabilities(): ClientCapabilities {
        return {
            workspace: {
                workspaceFolders: true,
                configuration: true,
                didChangeConfiguration: {
                    dynamicRegistration: true
                }
            },
            textDocument: {
                synchronization: {
                    dynamicRegistration: true,
                    willSave: true,
                    willSaveWaitUntil: true,
                    didSave: true
                },
                completion: {
                    dynamicRegistration: true,
                    completionItem: {
                        snippetSupport: true,
                        commitCharactersSupport: true,
                        documentationFormat: ['markdown', 'plaintext'],
                        deprecatedSupport: true,
                        preselectSupport: true
                    },
                    contextSupport: true
                },
                hover: {
                    dynamicRegistration: true,
                    contentFormat: ['markdown', 'plaintext']
                },
                signatureHelp: {
                    dynamicRegistration: true,
                    signatureInformation: {
                        documentationFormat: ['markdown', 'plaintext'],
                        parameterInformation: {
                            labelOffsetSupport: true
                        }
                    }
                },
                definition: {
                    dynamicRegistration: true,
                    linkSupport: true
                },
                references: {
                    dynamicRegistration: true
                },
                documentSymbol: {
                    dynamicRegistration: true,
                    symbolKind: {
                        valueSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
                    },
                    hierarchicalDocumentSymbolSupport: true
                },
                codeAction: {
                    dynamicRegistration: true,
                    codeActionLiteralSupport: {
                        codeActionKind: {
                            valueSet: ['quickfix', 'refactor', 'refactor.extract', 'refactor.inline', 'refactor.rewrite', 'source', 'source.organizeImports']
                        }
                    }
                },
                rename: {
                    dynamicRegistration: true,
                    prepareSupport: true
                },
                publishDiagnostics: {
                    relatedInformation: true
                }
            }
        };
    }
    
    async didOpenTextDocument(model: monaco.editor.ITextModel): Promise<void> {
        if (!this.connection || !this.isInitialized) return;
        
        const uri = model.uri.toString();
        this.documentVersion.set(uri, model.getVersionId());
        
        await this.connection.sendNotification(DidOpenTextDocumentNotification.type, {
            textDocument: {
                uri: uri,
                languageId: 'sunscript',
                version: model.getVersionId(),
                text: model.getValue()
            }
        });
    }
    
    async didChangeTextDocument(model: monaco.editor.ITextModel, changes: monaco.editor.IModelContentChange[]): Promise<void> {
        if (!this.connection || !this.isInitialized) return;
        
        const uri = model.uri.toString();
        const version = model.getVersionId();
        this.documentVersion.set(uri, version);
        
        const contentChanges: TextDocumentContentChangeEvent[] = changes.map(change => ({
            range: {
                start: { line: change.range.startLineNumber - 1, character: change.range.startColumn - 1 },
                end: { line: change.range.endLineNumber - 1, character: change.range.endColumn - 1 }
            },
            rangeLength: change.rangeLength,
            text: change.text
        }));
        
        await this.connection.sendNotification(DidChangeTextDocumentNotification.type, {
            textDocument: {
                uri: uri,
                version: version
            } as VersionedTextDocumentIdentifier,
            contentChanges: contentChanges
        });
    }
    
    async didCloseTextDocument(model: monaco.editor.ITextModel): Promise<void> {
        if (!this.connection || !this.isInitialized) return;
        
        const uri = model.uri.toString();
        this.documentVersion.delete(uri);
        
        await this.connection.sendNotification(DidCloseTextDocumentNotification.type, {
            textDocument: {
                uri: uri
            } as TextDocumentIdentifier
        });
    }
    
    async completion(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.CompletionList | null> {
        if (!this.connection || !this.isInitialized) return null;
        
        try {
            const result = await this.connection.sendRequest(CompletionRequest.type, {
                textDocument: { uri: model.uri.toString() },
                position: { line: position.lineNumber - 1, character: position.column - 1 },
                context: {
                    triggerKind: CompletionTriggerKind.Invoked
                }
            });
            
            if (!result) return null;
            
            const items = Array.isArray(result) ? result : result.items;
            
            return {
                suggestions: items.map((item: any) => ({
                    label: item.label,
                    kind: this.convertCompletionItemKind(item.kind),
                    detail: item.detail,
                    documentation: item.documentation,
                    insertText: item.insertText || item.label,
                    range: position
                })),
                incomplete: Array.isArray(result) ? false : result.isIncomplete
            };
        } catch (error) {
            console.error('Completion request failed:', error);
            return null;
        }
    }
    
    async hover(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Hover | null> {
        if (!this.connection || !this.isInitialized) return null;
        
        try {
            const result = await this.connection.sendRequest(HoverRequest.type, {
                textDocument: { uri: model.uri.toString() },
                position: { line: position.lineNumber - 1, character: position.column - 1 }
            });
            
            if (!result) return null;
            
            return {
                contents: Array.isArray(result.contents) ? result.contents : [result.contents],
                range: result.range ? this.convertRange(result.range) : undefined
            };
        } catch (error) {
            console.error('Hover request failed:', error);
            return null;
        }
    }
    
    async signatureHelp(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.SignatureHelpResult | null> {
        if (!this.connection || !this.isInitialized) return null;
        
        try {
            const result = await this.connection.sendRequest(SignatureHelpRequest.type, {
                textDocument: { uri: model.uri.toString() },
                position: { line: position.lineNumber - 1, character: position.column - 1 }
            });
            
            if (!result) return null;
            
            return {
                value: {
                    signatures: result.signatures.map((sig: any) => ({
                        label: sig.label,
                        documentation: sig.documentation,
                        parameters: sig.parameters?.map((param: any) => ({
                            label: param.label,
                            documentation: param.documentation
                        })) || []
                    })),
                    activeSignature: result.activeSignature || 0,
                    activeParameter: result.activeParameter || 0
                },
                dispose: () => {}
            };
        } catch (error) {
            console.error('Signature help request failed:', error);
            return null;
        }
    }
    
    private handleDiagnostics(uri: string, diagnostics: any[]): void {
        const model = monaco.editor.getModel(monaco.Uri.parse(uri));
        if (!model) return;
        
        const markers = diagnostics.map(diagnostic => ({
            severity: this.convertDiagnosticSeverity(diagnostic.severity),
            startLineNumber: diagnostic.range.start.line + 1,
            startColumn: diagnostic.range.start.character + 1,
            endLineNumber: diagnostic.range.end.line + 1,
            endColumn: diagnostic.range.end.character + 1,
            message: diagnostic.message,
            source: diagnostic.source || 'SunScript',
            code: diagnostic.code
        }));
        
        monaco.editor.setModelMarkers(model, 'sunscript-lsp', markers);
        
        this.eventBus.emit('diagnostics.updated', { uri, diagnostics: markers });
    }
    
    private convertDiagnosticSeverity(severity: DiagnosticSeverity): monaco.MarkerSeverity {
        switch (severity) {
            case DiagnosticSeverity.Error: return monaco.MarkerSeverity.Error;
            case DiagnosticSeverity.Warning: return monaco.MarkerSeverity.Warning;
            case DiagnosticSeverity.Information: return monaco.MarkerSeverity.Info;
            case DiagnosticSeverity.Hint: return monaco.MarkerSeverity.Hint;
            default: return monaco.MarkerSeverity.Error;
        }
    }
    
    private convertCompletionItemKind(kind?: number): monaco.languages.CompletionItemKind {
        if (!kind) return monaco.languages.CompletionItemKind.Text;
        
        // Map LSP completion item kinds to Monaco kinds
        const kindMap: Record<number, monaco.languages.CompletionItemKind> = {
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
            // ... add more mappings as needed
        };
        
        return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
    }
    
    private convertRange(range: Range): monaco.IRange {
        return {
            startLineNumber: range.start.line + 1,
            startColumn: range.start.character + 1,
            endLineNumber: range.end.line + 1,
            endColumn: range.end.character + 1
        };
    }
    
    disconnect(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        if (this.connection) {
            this.connection.dispose();
            this.connection = null;
        }
        
        this.isInitialized = false;
        this.documentVersion.clear();
        
        this.eventBus.emit('lsp.disconnected');
    }
}