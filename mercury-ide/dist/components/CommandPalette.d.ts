import { EventBus } from '../core/event-bus';
import { CommandPaletteService } from '../services/CommandPaletteService';
export declare class CommandPalette {
    private eventBus;
    private commandPaletteService;
    private container;
    private overlay;
    private currentState;
    constructor(eventBus: EventBus, commandPaletteService: CommandPaletteService);
    private setupEventListeners;
    mount(parentContainer: HTMLElement): void;
    private createOverlay;
    private attachEventListeners;
    private updateUI;
    private renderResults;
    private groupItemsByCategory;
    private highlightMatches;
    private renderKeybinding;
    private updateSelectedIndex;
    show(): void;
    private hide;
    toggle(): void;
    focus(): void;
}
