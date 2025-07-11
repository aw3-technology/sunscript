import { EventBus } from '../core/event-bus';
import { QuickOpenService } from '../services/QuickOpenService';
export declare class QuickOpen {
    private eventBus;
    private quickOpenService;
    private container;
    private overlay;
    private currentState;
    constructor(eventBus: EventBus, quickOpenService: QuickOpenService);
    private setupEventListeners;
    mount(parentContainer: HTMLElement): void;
    private createOverlay;
    private attachEventListeners;
    private switchMode;
    private updateUI;
    private renderResults;
    private renderEmptyState;
    private groupItemsByType;
    private getGroupLabel;
    private getItemIcon;
    private getTypeLabel;
    private highlightMatches;
    private updateSelectedIndex;
    private updateStatus;
    private showIndexingComplete;
    show(): void;
    private hide;
    toggle(): void;
    focus(): void;
}
