import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { AIService, ChatMessage, ChatRequest, ChatResponse, CodeSnippet } from '../services/AIService';
import { EditorService } from '../services/EditorService';

@injectable()
export class AIChatPanel {
    private container: HTMLElement | null = null;
    private messages: ChatMessage[] = [];
    private currentConversationId: string | null = null;
    private isProcessing = false;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.AIService) private aiService: AIService,
        @inject(TYPES.EditorService) private editorService: EditorService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('ai.chat.show', () => {
            this.show();
        });

        this.eventBus.on('ai.chat.hide', () => {
            this.hide();
        });

        this.eventBus.on('ai.chat.clear', () => {
            this.clearConversation();
        });

        this.eventBus.on('ai.configured', () => {
            this.render();
        });

        this.eventBus.on('editor.selectionChanged', (event) => {
            const { selection } = event.data;
            if (selection && this.isVisible()) {
                this.updateContextInfo(selection);
            }
        });
    }

    mount(container: HTMLElement): void {
        this.container = container;
        this.render();
    }

    private async render(): Promise<void> {
        if (!this.container) return;

        const isConfigured = this.aiService.isConfigured();
        const currentProvider = this.aiService.getCurrentProvider();

        this.container.innerHTML = `
            <div class="ai-chat-panel">
                <div class="chat-header">
                    <div class="chat-title-container">
                        <h3 class="chat-title">
                            <span class="chat-icon">🤖</span>
                            AI Assistant
                        </h3>
                        <div class="chat-status">
                            ${isConfigured ? `
                                <span class="status-indicator online"></span>
                                <span class="status-text">${currentProvider?.name || 'Connected'}</span>
                            ` : `
                                <span class="status-indicator offline"></span>
                                <span class="status-text">Not configured</span>
                            `}
                        </div>
                    </div>
                    <div class="chat-actions">
                        <button class="chat-action-btn" id="clear-chat" title="Clear conversation" ${!isConfigured ? 'disabled' : ''}>
                            🗑️
                        </button>
                        <button class="chat-action-btn" id="export-chat" title="Export conversation" ${!isConfigured ? 'disabled' : ''}>
                            📤
                        </button>
                        <button class="chat-action-btn" id="configure-ai" title="Configure AI">
                            ⚙️
                        </button>
                    </div>
                </div>

                ${isConfigured ? `
                    <div class="chat-messages" id="chat-messages">
                        ${this.renderMessages()}
                    </div>

                    <div class="chat-context" id="chat-context" style="display: none;">
                        <div class="context-header">
                            <span class="context-icon">📝</span>
                            <span class="context-title">Selected Code</span>
                            <button class="context-close" id="close-context">✕</button>
                        </div>
                        <div class="context-content">
                            <pre class="context-code" id="context-code"></pre>
                        </div>
                    </div>

                    <div class="chat-input-container">
                        <div class="input-actions">
                            <button class="input-action-btn" id="attach-selection" title="Include selected code">
                                📎
                            </button>
                            <button class="input-action-btn" id="insert-file-context" title="Include current file context">
                                📄
                            </button>
                        </div>
                        <textarea 
                            class="chat-input" 
                            id="chat-input" 
                            placeholder="Ask me anything about your code..."
                            rows="2"
                        ></textarea>
                        <button class="send-btn" id="send-message" disabled>
                            <span class="send-icon">➤</span>
                        </button>
                    </div>

                    <div class="chat-suggestions">
                        <div class="suggestion-title">Quick questions:</div>
                        <div class="suggestions-list">
                            <button class="suggestion-btn" data-suggestion="Explain this code">
                                💡 Explain this code
                            </button>
                            <button class="suggestion-btn" data-suggestion="Find bugs in this code">
                                🐛 Find bugs
                            </button>
                            <button class="suggestion-btn" data-suggestion="Optimize this code">
                                ⚡ Optimize code
                            </button>
                            <button class="suggestion-btn" data-suggestion="Add comments to this code">
                                📝 Add comments
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="chat-setup">
                        <div class="setup-content">
                            <div class="setup-icon">🤖</div>
                            <div class="setup-title">AI Assistant Setup</div>
                            <div class="setup-message">
                                Configure an AI provider to start using the AI assistant for code completion and chat.
                            </div>
                            <button class="setup-btn" id="setup-ai">
                                Configure AI Provider
                            </button>
                        </div>
                    </div>
                `}
            </div>
        `;

        this.attachEventListeners();
    }

    private renderMessages(): string {
        if (this.messages.length === 0) {
            return `
                <div class="chat-welcome">
                    <div class="welcome-icon">👋</div>
                    <div class="welcome-title">Hello! I'm your AI assistant</div>
                    <div class="welcome-message">
                        I can help you with code explanations, debugging, optimization, and more.
                        Try selecting some code and asking me to explain it!
                    </div>
                </div>
            `;
        }

        return this.messages.map(message => this.renderMessage(message)).join('');
    }

    private renderMessage(message: ChatMessage): string {
        const isUser = message.role === 'user';
        const timestamp = message.timestamp.toLocaleTimeString();

        return `
            <div class="chat-message ${message.role}" data-message-id="${message.id}">
                <div class="message-avatar">
                    ${isUser ? '👤' : '🤖'}
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">${isUser ? 'You' : 'AI Assistant'}</span>
                        <span class="message-time">${timestamp}</span>
                    </div>
                    <div class="message-body">
                        ${message.isTyping ? `
                            <div class="typing-indicator">
                                <span class="typing-dot"></span>
                                <span class="typing-dot"></span>
                                <span class="typing-dot"></span>
                            </div>
                        ` : this.formatMessageContent(message.content)}
                    </div>
                    ${!isUser && !message.isTyping ? `
                        <div class="message-actions">
                            <button class="message-action-btn" data-action="copy" title="Copy message">
                                📋
                            </button>
                            <button class="message-action-btn" data-action="regenerate" title="Regenerate response">
                                🔄
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    private formatMessageContent(content: string): string {
        // Convert markdown-style code blocks to HTML
        let formatted = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            return `
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-language">${language}</span>
                        <button class="code-action-btn" data-action="copy-code" data-code="${encodeURIComponent(code.trim())}">
                            📋 Copy
                        </button>
                        <button class="code-action-btn" data-action="insert-code" data-code="${encodeURIComponent(code.trim())}">
                            ➕ Insert
                        </button>
                    </div>
                    <pre class="code-content"><code class="${language}">${this.escapeHtml(code.trim())}</code></pre>
                </div>
            `;
        });

        // Convert inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private attachEventListeners(): void {
        if (!this.container) return;

        const chatInput = this.container.querySelector('#chat-input') as HTMLTextAreaElement;
        const sendBtn = this.container.querySelector('#send-message') as HTMLButtonElement;

        // Input handling
        if (chatInput) {
            chatInput.addEventListener('input', () => {
                this.updateSendButton();
                this.autoResizeTextarea(chatInput);
            });

            chatInput.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Send button
        sendBtn?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Header actions
        this.container.querySelector('#clear-chat')?.addEventListener('click', () => {
            this.clearConversation();
        });

        this.container.querySelector('#export-chat')?.addEventListener('click', () => {
            this.exportConversation();
        });

        this.container.querySelector('#configure-ai')?.addEventListener('click', () => {
            this.showAIConfiguration();
        });

        this.container.querySelector('#setup-ai')?.addEventListener('click', () => {
            this.showAIConfiguration();
        });

        // Input actions
        this.container.querySelector('#attach-selection')?.addEventListener('click', () => {
            this.attachSelection();
        });

        this.container.querySelector('#insert-file-context')?.addEventListener('click', () => {
            this.insertFileContext();
        });

        // Context panel
        this.container.querySelector('#close-context')?.addEventListener('click', () => {
            this.hideContext();
        });

        // Suggestions
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('suggestion-btn')) {
                const suggestion = target.dataset.suggestion!;
                this.insertSuggestion(suggestion);
            }
        });

        // Message actions
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('message-action-btn')) {
                const action = target.dataset.action!;
                const messageElement = target.closest('.chat-message') as HTMLElement;
                const messageId = messageElement.dataset.messageId!;
                
                this.handleMessageAction(action, messageId);
            }
            
            if (target.classList.contains('code-action-btn')) {
                const action = target.dataset.action!;
                const code = decodeURIComponent(target.dataset.code!);
                
                this.handleCodeAction(action, code);
            }
        });
    }

    private updateSendButton(): void {
        const chatInput = this.container?.querySelector('#chat-input') as HTMLTextAreaElement;
        const sendBtn = this.container?.querySelector('#send-message') as HTMLButtonElement;
        
        if (chatInput && sendBtn) {
            sendBtn.disabled = !chatInput.value.trim() || this.isProcessing;
        }
    }

    private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    private async sendMessage(): Promise<void> {
        if (this.isProcessing) return;

        const chatInput = this.container?.querySelector('#chat-input') as HTMLTextAreaElement;
        const message = chatInput?.value.trim();
        
        if (!message) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: this.generateMessageId(),
            role: 'user',
            content: message,
            timestamp: new Date()
        };

        this.messages.push(userMessage);
        chatInput.value = '';
        this.updateSendButton();

        // Add typing indicator
        const typingMessage: ChatMessage = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isTyping: true
        };

        this.messages.push(typingMessage);
        this.isProcessing = true;
        this.render();
        this.scrollToBottom();

        try {
            // Get context
            const context = this.getCurrentContext();
            
            // Send to AI
            const request: ChatRequest = {
                message,
                context,
                conversationId: this.currentConversationId || undefined
            };

            const response = await this.aiService.sendChatMessage(request);
            
            // Remove typing indicator
            this.messages.pop();
            
            // Add AI response
            const aiMessage: ChatMessage = {
                id: this.generateMessageId(),
                role: 'assistant',
                content: response.message,
                timestamp: new Date()
            };

            this.messages.push(aiMessage);
            this.currentConversationId = response.conversationId;

        } catch (error) {
            // Remove typing indicator
            this.messages.pop();
            
            // Add error message
            const errorMessage: ChatMessage = {
                id: this.generateMessageId(),
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date()
            };

            this.messages.push(errorMessage);
        } finally {
            this.isProcessing = false;
            this.render();
            this.scrollToBottom();
        }
    }

    private getCurrentContext(): ChatRequest['context'] {
        const selectedText = this.editorService.getSelectedText();
        const currentFile = this.editorService.getCurrentFilePath();
        const language = this.editorService.getCurrentLanguage();

        return {
            currentFile,
            selectedText,
            language
        };
    }

    private attachSelection(): void {
        const selection = this.editorService.getSelectedText();
        if (!selection) {
            this.eventBus.emit('notification.show', {
                type: 'warning',
                message: 'No text selected in editor'
            });
            return;
        }

        this.showContext(selection);
        
        const chatInput = this.container?.querySelector('#chat-input') as HTMLTextAreaElement;
        if (chatInput) {
            const contextPrompt = "Please explain this selected code:\n\n";
            chatInput.value = contextPrompt;
            chatInput.focus();
            this.updateSendButton();
        }
    }

    private insertFileContext(): void {
        const currentFile = this.editorService.getCurrentFilePath();
        const language = this.editorService.getCurrentLanguage();
        
        const chatInput = this.container?.querySelector('#chat-input') as HTMLTextAreaElement;
        if (chatInput && currentFile) {
            const contextPrompt = `Please help me with my ${language} file: ${currentFile}\n\n`;
            chatInput.value = contextPrompt;
            chatInput.focus();
            this.updateSendButton();
        }
    }

    private showContext(code: string): void {
        const contextPanel = this.container?.querySelector('#chat-context') as HTMLElement;
        const contextCode = this.container?.querySelector('#context-code') as HTMLElement;
        
        if (contextPanel && contextCode) {
            contextCode.textContent = code;
            contextPanel.style.display = 'block';
        }
    }

    private hideContext(): void {
        const contextPanel = this.container?.querySelector('#chat-context') as HTMLElement;
        if (contextPanel) {
            contextPanel.style.display = 'none';
        }
    }

    private updateContextInfo(selection: string): void {
        if (selection) {
            this.showContext(selection);
        }
    }

    private insertSuggestion(suggestion: string): void {
        const chatInput = this.container?.querySelector('#chat-input') as HTMLTextAreaElement;
        if (chatInput) {
            chatInput.value = suggestion;
            chatInput.focus();
            this.updateSendButton();
        }
    }

    private handleMessageAction(action: string, messageId: string): void {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        switch (action) {
            case 'copy':
                navigator.clipboard.writeText(message.content);
                this.eventBus.emit('notification.show', {
                    type: 'success',
                    message: 'Message copied to clipboard'
                });
                break;
            case 'regenerate':
                // TODO: Implement regenerate functionality
                break;
        }
    }

    private handleCodeAction(action: string, code: string): void {
        switch (action) {
            case 'copy-code':
                navigator.clipboard.writeText(code);
                this.eventBus.emit('notification.show', {
                    type: 'success',
                    message: 'Code copied to clipboard'
                });
                break;
            case 'insert-code':
                this.editorService.insertText(code);
                this.eventBus.emit('notification.show', {
                    type: 'success',
                    message: 'Code inserted into editor'
                });
                break;
        }
    }

    private clearConversation(): void {
        if (confirm('Are you sure you want to clear the conversation?')) {
            this.messages = [];
            this.currentConversationId = null;
            this.render();
        }
    }

    private exportConversation(): void {
        const content = this.messages
            .filter(m => !m.isTyping)
            .map(m => `**${m.role === 'user' ? 'You' : 'AI Assistant'}** (${m.timestamp.toLocaleString()}):\n${m.content}`)
            .join('\n\n---\n\n');

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-conversation-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }

    private showAIConfiguration(): void {
        this.eventBus.emit('ai.configure.show', {});
    }

    private scrollToBottom(): void {
        const messagesContainer = this.container?.querySelector('#chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private isVisible(): boolean {
        return this.container?.style.display !== 'none';
    }

    // Public API
    show(): void {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    addMessage(message: ChatMessage): void {
        this.messages.push(message);
        this.render();
        this.scrollToBottom();
    }

    setContext(code: string): void {
        this.showContext(code);
    }
}