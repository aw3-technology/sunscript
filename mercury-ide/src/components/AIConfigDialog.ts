import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { AIService, AIProvider } from '../services/AIService';

@injectable()
export class AIConfigDialog {
    private overlay: HTMLElement | null = null;
    private isOpen = false;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.AIService) private aiService: AIService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('ai.configure.show', () => {
            this.show();
        });

        this.eventBus.on('ai.configure.hide', () => {
            this.hide();
        });
    }

    mount(parentContainer: HTMLElement): void {
        this.createOverlay(parentContainer);
    }

    private createOverlay(parentContainer: HTMLElement): void {
        this.overlay = document.createElement('div');
        this.overlay.className = 'ai-config-overlay';
        this.overlay.style.display = 'none';
        
        this.overlay.innerHTML = `
            <div class="ai-config-backdrop"></div>
            <div class="ai-config-container">
                <div class="ai-config-dialog">
                    <div class="config-header">
                        <h2 class="config-title">
                            <span class="config-icon">🤖</span>
                            AI Configuration
                        </h2>
                        <button class="config-close-btn" id="close-config">✕</button>
                    </div>
                    
                    <div class="config-content">
                        <div class="config-section">
                            <h3 class="section-title">AI Provider</h3>
                            <div class="section-description">
                                Choose your preferred AI provider for code completion and chat assistance.
                            </div>
                            
                            <div class="provider-selection" id="provider-selection">
                                ${this.renderProviderOptions()}
                            </div>
                        </div>
                        
                        <div class="config-section">
                            <h3 class="section-title">API Configuration</h3>
                            
                            <div class="form-group">
                                <label class="form-label" for="api-key">API Key</label>
                                <div class="input-container">
                                    <input 
                                        type="password" 
                                        class="form-input" 
                                        id="api-key" 
                                        placeholder="Enter your API key..."
                                    >
                                    <button class="input-action-btn" id="toggle-api-key" title="Show/Hide API key">
                                        👁️
                                    </button>
                                </div>
                                <div class="form-hint">
                                    Your API key is stored locally and never sent to our servers.
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="base-url">Base URL (Optional)</label>
                                <input 
                                    type="url" 
                                    class="form-input" 
                                    id="base-url" 
                                    placeholder="https://api.example.com/v1"
                                >
                                <div class="form-hint">
                                    Custom endpoint URL for self-hosted or alternative API providers.
                                </div>
                            </div>
                        </div>
                        
                        <div class="config-section">
                            <h3 class="section-title">Features</h3>
                            
                            <div class="feature-toggles">
                                <div class="toggle-group">
                                    <label class="toggle-label">
                                        <input type="checkbox" class="toggle-input" id="enable-completion">
                                        <span class="toggle-slider"></span>
                                        <span class="toggle-text">Code Completion</span>
                                    </label>
                                    <div class="toggle-description">
                                        AI-powered code suggestions and autocompletion
                                    </div>
                                </div>
                                
                                <div class="toggle-group">
                                    <label class="toggle-label">
                                        <input type="checkbox" class="toggle-input" id="enable-chat">
                                        <span class="toggle-slider"></span>
                                        <span class="toggle-text">AI Chat Assistant</span>
                                    </label>
                                    <div class="toggle-description">
                                        Chat with AI for code explanations and debugging help
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="config-section">
                            <h3 class="section-title">Getting Started</h3>
                            
                            <div class="provider-instructions" id="provider-instructions">
                                ${this.renderProviderInstructions()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="config-footer">
                        <div class="config-status" id="config-status">
                            <span class="status-icon">ℹ️</span>
                            <span class="status-text">Configure an AI provider to get started</span>
                        </div>
                        
                        <div class="config-actions">
                            <button class="config-btn secondary" id="test-connection">
                                Test Connection
                            </button>
                            <button class="config-btn secondary" id="cancel-config">
                                Cancel
                            </button>
                            <button class="config-btn primary" id="save-config">
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        parentContainer.appendChild(this.overlay);
    }

    private renderProviderOptions(): string {
        const providers = this.aiService.getProviders();
        const currentProvider = this.aiService.getCurrentProvider();

        return providers.map(provider => `
            <div class="provider-option ${currentProvider?.id === provider.id ? 'selected' : ''}" 
                 data-provider="${provider.id}">
                <div class="provider-header">
                    <div class="provider-info">
                        <div class="provider-name">${provider.name}</div>
                        <div class="provider-features">
                            ${provider.type === 'both' ? 'Chat & Completion' : 
                              provider.type === 'chat' ? 'Chat Only' : 'Completion Only'}
                        </div>
                    </div>
                    <div class="provider-status">
                        ${provider.isConfigured ? 
                          '<span class="status-badge configured">Configured</span>' : 
                          '<span class="status-badge not-configured">Not Configured</span>'
                        }
                    </div>
                </div>
                <div class="provider-description">
                    ${this.getProviderDescription(provider.id)}
                </div>
            </div>
        `).join('');
    }

    private getProviderDescription(providerId: string): string {
        const descriptions = {
            'anthropic': 'Claude models by Anthropic. Excellent for code understanding and generation.',
            'openai': 'GPT models by OpenAI. Powerful general-purpose language model.',
            'local': 'Local model using Ollama or similar. Run AI models on your own machine.'
        };
        return descriptions[providerId as keyof typeof descriptions] || 'AI provider for code assistance.';
    }

    private renderProviderInstructions(): string {
        return `
            <div class="instructions">
                <div class="instruction-item">
                    <div class="instruction-icon">1️⃣</div>
                    <div class="instruction-content">
                        <div class="instruction-title">Choose a Provider</div>
                        <div class="instruction-text">Select your preferred AI provider from the options above.</div>
                    </div>
                </div>
                
                <div class="instruction-item">
                    <div class="instruction-icon">2️⃣</div>
                    <div class="instruction-content">
                        <div class="instruction-title">Get API Key</div>
                        <div class="instruction-text">
                            <strong>Anthropic:</strong> Get your API key from <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a><br>
                            <strong>OpenAI:</strong> Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a><br>
                            <strong>Local:</strong> Install Ollama and no API key is needed
                        </div>
                    </div>
                </div>
                
                <div class="instruction-item">
                    <div class="instruction-icon">3️⃣</div>
                    <div class="instruction-content">
                        <div class="instruction-title">Configure & Test</div>
                        <div class="instruction-text">Enter your API key, test the connection, and save your configuration.</div>
                    </div>
                </div>
            </div>
        `;
    }

    private attachEventListeners(): void {
        if (!this.overlay) return;

        // Close dialog
        this.overlay.querySelector('#close-config')?.addEventListener('click', () => {
            this.hide();
        });

        this.overlay.querySelector('#cancel-config')?.addEventListener('click', () => {
            this.hide();
        });

        // Backdrop click
        this.overlay.querySelector('.ai-config-backdrop')?.addEventListener('click', () => {
            this.hide();
        });

        // Provider selection
        this.overlay.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const providerOption = target.closest('.provider-option') as HTMLElement;
            
            if (providerOption) {
                this.selectProvider(providerOption.dataset.provider!);
            }
        });

        // Toggle API key visibility
        this.overlay.querySelector('#toggle-api-key')?.addEventListener('click', () => {
            this.toggleApiKeyVisibility();
        });

        // Test connection
        this.overlay.querySelector('#test-connection')?.addEventListener('click', () => {
            this.testConnection();
        });

        // Save configuration
        this.overlay.querySelector('#save-config')?.addEventListener('click', () => {
            this.saveConfiguration();
        });

        // Input validation
        const apiKeyInput = this.overlay.querySelector('#api-key') as HTMLInputElement;
        apiKeyInput?.addEventListener('input', () => {
            this.validateForm();
        });

        const baseUrlInput = this.overlay.querySelector('#base-url') as HTMLInputElement;
        baseUrlInput?.addEventListener('input', () => {
            this.validateForm();
        });
    }

    private selectProvider(providerId: string): void {
        // Update UI
        this.overlay?.querySelectorAll('.provider-option').forEach(option => {
            option.classList.remove('selected');
        });

        const selectedOption = this.overlay?.querySelector(`[data-provider="${providerId}"]`);
        selectedOption?.classList.add('selected');

        // Load existing configuration
        this.loadProviderConfig(providerId);
        this.validateForm();
    }

    private loadProviderConfig(providerId: string): void {
        // Load configuration from localStorage or service
        const config = localStorage.getItem('ai-config');
        if (config) {
            try {
                const parsed = JSON.parse(config);
                if (parsed.provider === providerId) {
                    const apiKeyInput = this.overlay?.querySelector('#api-key') as HTMLInputElement;
                    const baseUrlInput = this.overlay?.querySelector('#base-url') as HTMLInputElement;
                    
                    if (apiKeyInput) apiKeyInput.value = parsed.apiKey || '';
                    if (baseUrlInput) baseUrlInput.value = parsed.baseUrl || '';
                }
            } catch (error) {
                console.error('Failed to load AI config:', error);
            }
        }
    }

    private toggleApiKeyVisibility(): void {
        const apiKeyInput = this.overlay?.querySelector('#api-key') as HTMLInputElement;
        const toggleBtn = this.overlay?.querySelector('#toggle-api-key') as HTMLElement;
        
        if (apiKeyInput && toggleBtn) {
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                toggleBtn.textContent = '🙈';
            } else {
                apiKeyInput.type = 'password';
                toggleBtn.textContent = '👁️';
            }
        }
    }

    private async testConnection(): Promise<void> {
        const formData = this.getFormData();
        if (!formData.provider || !formData.apiKey) {
            this.showStatus('error', 'Please select a provider and enter an API key');
            return;
        }

        const testBtn = this.overlay?.querySelector('#test-connection') as HTMLButtonElement;
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
        }

        this.showStatus('info', 'Testing connection...');

        try {
            // Configure AI service temporarily
            this.aiService.configure(formData.provider, formData.apiKey, formData.baseUrl);

            // Test with a simple completion request
            const testResponse = await this.aiService.getCompletion({
                text: 'function hello() {',
                position: 17,
                fileName: 'test.js',
                language: 'javascript'
            });

            if (testResponse.suggestions.length > 0) {
                this.showStatus('success', 'Connection successful!');
            } else {
                this.showStatus('warning', 'Connected, but no suggestions returned');
            }
        } catch (error) {
            this.showStatus('error', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }
        }
    }

    private saveConfiguration(): void {
        const formData = this.getFormData();
        
        if (!formData.provider || !formData.apiKey) {
            this.showStatus('error', 'Please select a provider and enter an API key');
            return;
        }

        try {
            this.aiService.configure(formData.provider, formData.apiKey, formData.baseUrl);
            
            if (formData.enableCompletion) {
                this.eventBus.emit('ai.completion.enable', {});
            } else {
                this.eventBus.emit('ai.completion.disable', {});
            }

            this.showStatus('success', 'Configuration saved successfully!');
            
            setTimeout(() => {
                this.hide();
                this.eventBus.emit('notification.show', {
                    type: 'success',
                    message: 'AI provider configured successfully'
                });
            }, 1000);
        } catch (error) {
            this.showStatus('error', `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private getFormData(): any {
        const selectedProvider = this.overlay?.querySelector('.provider-option.selected')?.getAttribute('data-provider');
        const apiKey = (this.overlay?.querySelector('#api-key') as HTMLInputElement)?.value || '';
        const baseUrl = (this.overlay?.querySelector('#base-url') as HTMLInputElement)?.value || '';
        const enableCompletion = (this.overlay?.querySelector('#enable-completion') as HTMLInputElement)?.checked || false;
        const enableChat = (this.overlay?.querySelector('#enable-chat') as HTMLInputElement)?.checked || false;

        return {
            provider: selectedProvider,
            apiKey: apiKey.trim(),
            baseUrl: baseUrl.trim(),
            enableCompletion,
            enableChat
        };
    }

    private validateForm(): void {
        const formData = this.getFormData();
        const saveBtn = this.overlay?.querySelector('#save-config') as HTMLButtonElement;
        const testBtn = this.overlay?.querySelector('#test-connection') as HTMLButtonElement;
        
        const isValid = formData.provider && formData.apiKey;
        
        if (saveBtn) saveBtn.disabled = !isValid;
        if (testBtn) testBtn.disabled = !isValid;
    }

    private showStatus(type: 'info' | 'success' | 'warning' | 'error', message: string): void {
        const statusElement = this.overlay?.querySelector('#config-status') as HTMLElement;
        if (!statusElement) return;

        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const statusIcon = statusElement.querySelector('.status-icon') as HTMLElement;
        const statusText = statusElement.querySelector('.status-text') as HTMLElement;

        if (statusIcon) statusIcon.textContent = icons[type];
        if (statusText) statusText.textContent = message;

        statusElement.className = `config-status ${type}`;
    }

    private show(): void {
        if (this.overlay) {
            this.overlay.style.display = 'flex';
            this.isOpen = true;
            
            // Load current configuration
            const currentProvider = this.aiService.getCurrentProvider();
            if (currentProvider) {
                this.selectProvider(currentProvider.id);
            }
            
            // Set feature toggles
            const enableCompletion = this.overlay.querySelector('#enable-completion') as HTMLInputElement;
            const enableChat = this.overlay.querySelector('#enable-chat') as HTMLInputElement;
            
            if (enableCompletion) enableCompletion.checked = true;
            if (enableChat) enableChat.checked = true;

            this.validateForm();
            
            document.body.classList.add('ai-config-open');
            
            // Animate in
            requestAnimationFrame(() => {
                this.overlay?.classList.add('show');
            });
        }
    }

    private hide(): void {
        if (this.overlay) {
            this.overlay.classList.remove('show');
            document.body.classList.remove('ai-config-open');
            this.isOpen = false;
            
            // Hide after animation
            setTimeout(() => {
                if (this.overlay) {
                    this.overlay.style.display = 'none';
                }
            }, 300);
        }
    }

    // Public API
    toggle(): void {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    isDialogOpen(): boolean {
        return this.isOpen;
    }
}