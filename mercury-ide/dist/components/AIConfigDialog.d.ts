import { EventBus } from '../core/event-bus';
import { AIService } from '../services/AIService';
export declare class AIConfigDialog {
    private eventBus;
    private aiService;
    private overlay;
    private isOpen;
    constructor(eventBus: EventBus, aiService: AIService);
    private setupEventListeners;
    mount(parentContainer: HTMLElement): void;
    private createOverlay;
    private renderProviderOptions;
    private getProviderDescription;
    private renderProviderInstructions;
    private attachEventListeners;
    private selectProvider;
    private loadProviderConfig;
    private toggleApiKeyVisibility;
    private testConnection;
    private saveConfiguration;
    private getFormData;
    private validateForm;
    private showStatus;
    private show;
    private hide;
    toggle(): void;
    isDialogOpen(): boolean;
}
