import { EditorService } from '../services/EditorService';
import { EventBus } from '../core/event-bus';
export declare class Breadcrumbs {
    private editorService;
    private eventBus;
    private container;
    private groupId;
    private currentSymbols;
    constructor(editorService: EditorService, eventBus: EventBus);
    private setupEventListeners;
    mount(container: HTMLElement, groupId: string): void;
    private updateBreadcrumbs;
    private render;
    private getBreadcrumbItems;
    private findSymbolPath;
    private positionInRange;
    private navigateToPosition;
    private getSymbolIcon;
}
