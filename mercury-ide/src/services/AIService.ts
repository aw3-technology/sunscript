import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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

export enum CompletionItemKind {
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
        start: { line: number; character: number };
        end: { line: number; character: number };
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

@injectable()
export class AIService {
    private providers: Map<string, AIProvider> = new Map();
    private currentProvider: string | null = null;
    private apiKey: string | null = null;
    private baseUrl: string = 'https://api.anthropic.com/v1';
    private isEnabled: boolean = false;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupEventListeners();
        this.initializeProviders();
        this.loadConfiguration();
    }

    private setupEventListeners(): void {
        this.eventBus.on('ai.configure', (event) => {
            const { provider, apiKey, baseUrl } = event.data;
            this.configure(provider, apiKey, baseUrl);
        });

        this.eventBus.on('ai.completion.request', async (event) => {
            const { request, callback } = event.data;
            const response = await this.getCompletion(request);
            callback(response);
        });

        this.eventBus.on('ai.chat.send', async (event) => {
            const { request, callback } = event.data;
            const response = await this.sendChatMessage(request);
            callback(response);
        });
    }

    private initializeProviders(): void {
        this.providers.set('anthropic', {
            id: 'anthropic',
            name: 'Claude (Anthropic)',
            type: 'both',
            isConfigured: false
        });

        this.providers.set('openai', {
            id: 'openai',
            name: 'GPT (OpenAI)',
            type: 'both',
            isConfigured: false
        });

        this.providers.set('local', {
            id: 'local',
            name: 'Local Model',
            type: 'both',
            isConfigured: false
        });
    }

    private loadConfiguration(): void {
        // Load from localStorage or configuration file
        const config = localStorage.getItem('ai-config');
        if (config) {
            try {
                const parsed = JSON.parse(config);
                this.currentProvider = parsed.provider;
                this.apiKey = parsed.apiKey;
                this.baseUrl = parsed.baseUrl || this.baseUrl;
                this.isEnabled = parsed.enabled || false;

                if (this.currentProvider && this.providers.has(this.currentProvider)) {
                    const provider = this.providers.get(this.currentProvider)!;
                    provider.isConfigured = !!this.apiKey;
                }
            } catch (error) {
                console.error('Failed to load AI configuration:', error);
            }
        }
    }

    private saveConfiguration(): void {
        const config = {
            provider: this.currentProvider,
            apiKey: this.apiKey,
            baseUrl: this.baseUrl,
            enabled: this.isEnabled
        };
        localStorage.setItem('ai-config', JSON.stringify(config));
    }

    configure(providerId: string, apiKey: string, baseUrl?: string): void {
        if (!this.providers.has(providerId)) {
            throw new Error(`Unknown AI provider: ${providerId}`);
        }

        this.currentProvider = providerId;
        this.apiKey = apiKey;
        if (baseUrl) {
            this.baseUrl = baseUrl;
        }
        this.isEnabled = !!apiKey;

        const provider = this.providers.get(providerId)!;
        provider.isConfigured = !!apiKey;

        this.saveConfiguration();
        this.eventBus.emit('ai.configured', { provider: providerId });
    }

    async getCompletion(request: CompletionRequest): Promise<CompletionResponse> {
        if (!this.isEnabled || !this.currentProvider || !this.apiKey) {
            return { suggestions: [] };
        }

        try {
            switch (this.currentProvider) {
                case 'anthropic':
                    return await this.getAnthropicCompletion(request);
                case 'openai':
                    return await this.getOpenAICompletion(request);
                case 'local':
                    return await this.getLocalCompletion(request);
                default:
                    return { suggestions: [] };
            }
        } catch (error) {
            console.error('AI completion error:', error);
            return { suggestions: [] };
        }
    }

    private async getAnthropicCompletion(request: CompletionRequest): Promise<CompletionResponse> {
        const prompt = this.buildCompletionPrompt(request);
        
        const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey!,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseAnthropicCompletion(data.content[0].text);
    }

    private async getOpenAICompletion(request: CompletionRequest): Promise<CompletionResponse> {
        const prompt = this.buildCompletionPrompt(request);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 1024,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseOpenAICompletion(data.choices[0].message.content);
    }

    private async getLocalCompletion(request: CompletionRequest): Promise<CompletionResponse> {
        // Simulate local completion - could integrate with Ollama or similar
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    suggestions: this.getBuiltInCompletions(request)
                });
            }, 100);
        });
    }

    private buildCompletionPrompt(request: CompletionRequest): string {
        const { text, position, fileName, language, context } = request;
        const beforeCursor = text.substring(0, position);
        const afterCursor = text.substring(position);

        return `You are a code completion assistant for ${language} language. 
Provide code completion suggestions for the following context:

File: ${fileName}
Language: ${language}
${context ? `Context: ${context}` : ''}

Code before cursor:
\`\`\`${language}
${beforeCursor}
\`\`\`

Code after cursor:
\`\`\`${language}
${afterCursor}
\`\`\`

Provide up to 5 completion suggestions in this JSON format:
{
  "suggestions": [
    {
      "label": "suggestion text",
      "insertText": "text to insert",
      "detail": "brief description",
      "kind": "function|variable|class|keyword|etc"
    }
  ]
}

Focus on contextually relevant completions that make sense at the cursor position.`;
    }

    private parseAnthropicCompletion(response: string): CompletionResponse {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    suggestions: parsed.suggestions.map((s: any) => ({
                        ...s,
                        kind: this.mapCompletionKind(s.kind)
                    }))
                };
            }
        } catch (error) {
            console.error('Failed to parse Anthropic completion:', error);
        }
        
        return { suggestions: [] };
    }

    private parseOpenAICompletion(response: string): CompletionResponse {
        return this.parseAnthropicCompletion(response); // Same format
    }

    private getBuiltInCompletions(request: CompletionRequest): CompletionItem[] {
        const { text, position, language } = request;
        const beforeCursor = text.substring(0, position);
        const currentWord = this.getCurrentWord(beforeCursor);

        if (language === 'sunscript') {
            return this.getSunScriptCompletions(currentWord);
        }

        return this.getGenericCompletions(currentWord);
    }

    private getCurrentWord(text: string): string {
        const match = text.match(/\w+$/);
        return match ? match[0] : '';
    }

    private getSunScriptCompletions(word: string): CompletionItem[] {
        const keywords = [
            'function', 'class', 'interface', 'type', 'const', 'let', 'var',
            'if', 'else', 'while', 'for', 'return', 'import', 'export',
            'async', 'await', 'try', 'catch', 'finally', 'throw'
        ];

        const builtins = [
            'console.log', 'Array', 'Object', 'String', 'Number', 'Boolean',
            'Promise', 'Math', 'Date', 'JSON'
        ];

        const completions: CompletionItem[] = [];

        // Add matching keywords
        keywords.filter(k => k.startsWith(word.toLowerCase())).forEach(keyword => {
            completions.push({
                label: keyword,
                insertText: keyword,
                kind: CompletionItemKind.Keyword,
                detail: 'SunScript keyword'
            });
        });

        // Add matching builtins
        builtins.filter(b => b.toLowerCase().includes(word.toLowerCase())).forEach(builtin => {
            completions.push({
                label: builtin,
                insertText: builtin,
                kind: CompletionItemKind.Function,
                detail: 'Built-in function'
            });
        });

        return completions;
    }

    private getGenericCompletions(word: string): CompletionItem[] {
        const commonSnippets = [
            {
                label: 'function',
                insertText: 'function ${1:name}(${2:params}) {\n\t${3:// body}\n}',
                kind: CompletionItemKind.Snippet,
                detail: 'Function declaration'
            },
            {
                label: 'if',
                insertText: 'if (${1:condition}) {\n\t${2:// body}\n}',
                kind: CompletionItemKind.Snippet,
                detail: 'If statement'
            },
            {
                label: 'for',
                insertText: 'for (${1:let i = 0}; ${2:i < length}; ${3:i++}) {\n\t${4:// body}\n}',
                kind: CompletionItemKind.Snippet,
                detail: 'For loop'
            }
        ];

        return commonSnippets.filter(s => 
            s.label.toLowerCase().includes(word.toLowerCase())
        );
    }

    private mapCompletionKind(kind: string): CompletionItemKind {
        const kindMap: Record<string, CompletionItemKind> = {
            'function': CompletionItemKind.Function,
            'method': CompletionItemKind.Method,
            'variable': CompletionItemKind.Variable,
            'class': CompletionItemKind.Class,
            'interface': CompletionItemKind.Interface,
            'keyword': CompletionItemKind.Keyword,
            'snippet': CompletionItemKind.Snippet,
            'property': CompletionItemKind.Property,
            'constant': CompletionItemKind.Constant
        };

        return kindMap[kind.toLowerCase()] || CompletionItemKind.Text;
    }

    async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
        if (!this.isEnabled || !this.currentProvider || !this.apiKey) {
            throw new Error('AI chat is not configured');
        }

        try {
            switch (this.currentProvider) {
                case 'anthropic':
                    return await this.sendAnthropicChat(request);
                case 'openai':
                    return await this.sendOpenAIChat(request);
                case 'local':
                    return await this.sendLocalChat(request);
                default:
                    throw new Error(`Unsupported provider: ${this.currentProvider}`);
            }
        } catch (error) {
            console.error('AI chat error:', error);
            throw error;
        }
    }

    private async sendAnthropicChat(request: ChatRequest): Promise<ChatResponse> {
        const systemPrompt = this.buildChatSystemPrompt(request.context);
        
        const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey!,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: request.message
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            message: data.content[0].text,
            conversationId: request.conversationId || this.generateConversationId(),
            codeSnippets: this.extractCodeSnippets(data.content[0].text)
        };
    }

    private async sendOpenAIChat(request: ChatRequest): Promise<ChatResponse> {
        const systemPrompt = this.buildChatSystemPrompt(request.context);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: request.message }
                ],
                max_tokens: 4096,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            message: data.choices[0].message.content,
            conversationId: request.conversationId || this.generateConversationId(),
            codeSnippets: this.extractCodeSnippets(data.choices[0].message.content)
        };
    }

    private async sendLocalChat(request: ChatRequest): Promise<ChatResponse> {
        // Simulate local chat response
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    message: `Local AI response to: "${request.message}". This is a simulated response for development purposes.`,
                    conversationId: request.conversationId || this.generateConversationId()
                });
            }, 1000);
        });
    }

    private buildChatSystemPrompt(context?: ChatRequest['context']): string {
        let prompt = `You are an AI assistant specialized in software development, particularly with the SunScript programming language. You help developers with:

1. Code explanations and debugging
2. Code optimization and refactoring
3. Best practices and patterns
4. SunScript language features and syntax
5. General programming questions

Always provide helpful, accurate, and concise responses. When providing code examples, format them properly with markdown code blocks.`;

        if (context) {
            if (context.currentFile) {
                prompt += `\n\nCurrent file: ${context.currentFile}`;
            }
            if (context.selectedText) {
                prompt += `\n\nSelected code:\n\`\`\`\n${context.selectedText}\n\`\`\``;
            }
            if (context.language) {
                prompt += `\n\nCurrent language: ${context.language}`;
            }
        }

        return prompt;
    }

    private extractCodeSnippets(text: string): CodeSnippet[] {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const snippets: CodeSnippet[] = [];
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            snippets.push({
                language: match[1] || 'text',
                code: match[2].trim(),
                description: 'Code snippet from AI response'
            });
        }

        return snippets;
    }

    private generateConversationId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public API
    getProviders(): AIProvider[] {
        return Array.from(this.providers.values());
    }

    getCurrentProvider(): AIProvider | null {
        return this.currentProvider ? this.providers.get(this.currentProvider) || null : null;
    }

    isConfigured(): boolean {
        return this.isEnabled && !!this.currentProvider && !!this.apiKey;
    }

    enable(): void {
        this.isEnabled = true;
        this.saveConfiguration();
    }

    disable(): void {
        this.isEnabled = false;
        this.saveConfiguration();
    }
}