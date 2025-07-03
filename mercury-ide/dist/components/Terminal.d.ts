import { TerminalService } from '../services/TerminalService';
import { EventBus } from '../core/event-bus';
export declare class Terminal {
    private terminalService;
    private eventBus;
    private container;
    private tabsContainer;
    private terminalContainer;
    private terminals;
    constructor(terminalService: TerminalService, eventBus: EventBus);
    private setupEventListeners;
    mount(container: HTMLElement): void;
    private render;
    private attachEventListeners;
    private setupTerminal;
    private addTerminalTab;
    private removeTerminalTab;
    private activateTerminalTab;
    private updateTerminalTabTitle;
    focus(): void;
    resize(): void;
}
