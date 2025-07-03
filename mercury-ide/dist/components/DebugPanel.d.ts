import { DebugService } from '../services/DebugService';
import { EventBus } from '../core/event-bus';
export declare class DebugPanel {
    private debugService;
    private eventBus;
    private container;
    private controlsContainer;
    private variablesContainer;
    private callStackContainer;
    private breakpointsContainer;
    constructor(debugService: DebugService, eventBus: EventBus);
    private setupUI;
    private bindEvents;
    private handleDebugAction;
    private updateDebugState;
    private updateVariables;
    private updateCallStack;
    private updateBreakpoints;
    getElement(): HTMLElement;
    show(): void;
    hide(): void;
}
