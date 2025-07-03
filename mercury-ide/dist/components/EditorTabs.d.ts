import { EditorService } from '../services/EditorService';
import { EventBus } from '../core/event-bus';
export declare class EditorTabs {
    private editorService;
    private eventBus;
    private container;
    private groupId;
    constructor(editorService: EditorService, eventBus: EventBus);
    private setupEventListeners;
    mount(container: HTMLElement, groupId: string): void;
    private render;
    private createTabElement;
    private updateTab;
    private showTabContextMenu;
    private closeOtherTabs;
    private closeAllTabs;
    private togglePin;
    private splitEditor;
    private getFileIcon;
}
