import { EventBus } from '../core/event-bus';
import * as monaco from 'monaco-editor';
export interface LSPConfig {
    serverUrl: string;
    languageId: string;
    rootUri: string;
}
export declare class LanguageServerClient {
    private eventBus;
    private connection;
    private isInitialized;
    private documentVersion;
    private disposables;
    constructor(eventBus: EventBus);
    connect(config: LSPConfig): Promise<void>;
    private setupMessageHandlers;
    private initialize;
    private getClientCapabilities;
    didOpenTextDocument(model: monaco.editor.ITextModel): Promise<void>;
    didChangeTextDocument(model: monaco.editor.ITextModel, changes: monaco.editor.IModelContentChange[]): Promise<void>;
    didCloseTextDocument(model: monaco.editor.ITextModel): Promise<void>;
    completion(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.CompletionList | null>;
    hover(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.Hover | null>;
    signatureHelp(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.SignatureHelpResult | null>;
    private handleDiagnostics;
    private convertDiagnosticSeverity;
    private convertCompletionItemKind;
    private convertRange;
    disconnect(): void;
}
