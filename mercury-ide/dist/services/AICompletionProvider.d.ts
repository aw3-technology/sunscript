import { EventBus } from '../core/event-bus';
import { AIService, CompletionResponse } from './AIService';
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
export declare enum CompletionTriggerKind {
    Invoked = 1,
    TriggerCharacter = 2,
    TriggerForIncompleteCompletions = 3
}
export declare class AICompletionProvider {
    private eventBus;
    private aiService;
    private editorService;
    private isEnabled;
    private completionCache;
    private readonly CACHE_DURATION;
    private readonly COMPLETION_DELAY;
    private completionTimer;
    constructor(eventBus: EventBus, aiService: AIService, editorService: EditorService);
    private setupEventListeners;
    provideCompletionItems(context: CompletionContext): Promise<CompletionResponse>;
    private buildCompletionRequest;
    private handleTextChange;
    private shouldTriggerCompletion;
    private triggerCompletion;
    private generateCacheKey;
    private getCachedCompletion;
    private cacheCompletion;
    private cleanupCache;
    registerMonacoProvider(): void;
    private convertToMonacoCompletion;
    private convertCompletionKind;
    enable(): void;
    disable(): void;
    isCompletionEnabled(): boolean;
    clearCache(): void;
    getCacheSize(): number;
}
