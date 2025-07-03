import { EventBus } from '../core/event-bus';
export interface AIProvider {
    id: string;
    name: string;
    type: 'completion' | 'chat' | 'both';
    isConfigured: boolean;
}
export interface CompletionRequest {
    text: string;
    position: number;
    fileName: string;
    language: string;
    context?: string;
}
export interface CompletionResponse {
    suggestions: CompletionItem[];
    isIncomplete?: boolean;
}
export interface CompletionItem {
    label: string;
    insertText: string;
    detail?: string;
    documentation?: string;
    kind: CompletionItemKind;
    sortText?: string;
    filterText?: string;
    additionalTextEdits?: TextEdit[];
}
export declare enum CompletionItemKind {
    Text = 1,
    Method = 2,
    Function = 3,
    Constructor = 4,
    Field = 5,
    Variable = 6,
    Class = 7,
    Interface = 8,
    Module = 9,
    Property = 10,
    Unit = 11,
    Value = 12,
    Enum = 13,
    Keyword = 14,
    Snippet = 15,
    Color = 16,
    File = 17,
    Reference = 18,
    Folder = 19,
    EnumMember = 20,
    Constant = 21,
    Struct = 22,
    Event = 23,
    Operator = 24,
    TypeParameter = 25
}
export interface TextEdit {
    range: {
        start: {
            line: number;
            character: number;
        };
        end: {
            line: number;
            character: number;
        };
    };
    newText: string;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
}
export interface ChatRequest {
    message: string;
    context?: {
        currentFile?: string;
        selectedText?: string;
        workspaceFiles?: string[];
        language?: string;
    };
    conversationId?: string;
}
export interface ChatResponse {
    message: string;
    conversationId: string;
    suggestions?: string[];
    codeSnippets?: CodeSnippet[];
}
export interface CodeSnippet {
    language: string;
    code: string;
    description?: string;
    fileName?: string;
}
export declare class AIService {
    private eventBus;
    private providers;
    private currentProvider;
    private apiKey;
    private baseUrl;
    private isEnabled;
    constructor(eventBus: EventBus);
    private setupEventListeners;
    private initializeProviders;
    private loadConfiguration;
    private saveConfiguration;
    configure(providerId: string, apiKey: string, baseUrl?: string): void;
    getCompletion(request: CompletionRequest): Promise<CompletionResponse>;
    private getAnthropicCompletion;
    private getOpenAICompletion;
    private getLocalCompletion;
    private buildCompletionPrompt;
    private parseAnthropicCompletion;
    private parseOpenAICompletion;
    private getBuiltInCompletions;
    private getCurrentWord;
    private getSunScriptCompletions;
    private getGenericCompletions;
    private mapCompletionKind;
    sendChatMessage(request: ChatRequest): Promise<ChatResponse>;
    private sendAnthropicChat;
    private sendOpenAIChat;
    private sendLocalChat;
    private buildChatSystemPrompt;
    private extractCodeSnippets;
    private generateConversationId;
    getProviders(): AIProvider[];
    getCurrentProvider(): AIProvider | null;
    isConfigured(): boolean;
    enable(): void;
    disable(): void;
}
