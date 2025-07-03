import { EventBus } from '../core/event-bus';
import { WorkspaceService, FileInfo } from './WorkspaceService';
import { FileIconService } from './FileIconService';
export interface DragDropOptions {
    allowCopy: boolean;
    allowMove: boolean;
    allowLink: boolean;
    acceptedTypes: string[];
    maxFileSize?: number;
    validationRules?: ValidationRule[];
}
export interface ValidationRule {
    name: string;
    validate: (item: DragDropItem) => boolean | string;
    errorMessage?: string;
}
export interface DragDropItem {
    id: string;
    name: string;
    path: string;
    uri: string;
    type: 'file' | 'folder';
    size?: number;
    mimeType?: string;
    extension?: string;
    isDirectory: boolean;
    data?: any;
}
export interface DropTarget {
    id: string;
    element: HTMLElement;
    acceptedTypes: string[];
    canAcceptDrop: (items: DragDropItem[]) => boolean;
    onDrop: (items: DragDropItem[], operation: DragDropOperation) => Promise<void>;
    onDragEnter?: (items: DragDropItem[]) => void;
    onDragLeave?: () => void;
    onDragOver?: (items: DragDropItem[]) => void;
}
export interface DragDropOperation {
    type: 'copy' | 'move' | 'link';
    source: DragDropItem[];
    target: DropTarget;
    targetPath?: string;
    metadata?: Record<string, any>;
}
export interface DragDropResult {
    success: boolean;
    operation: DragDropOperation;
    processedItems: DragDropItem[];
    errors: string[];
    warnings: string[];
}
export declare class DragDropService {
    private eventBus;
    private workspaceService;
    private fileIconService;
    private dropTargets;
    private currentDragItems;
    private currentOperation;
    private dragPreview;
    private readonly DEFAULT_OPTIONS;
    constructor(eventBus: EventBus, workspaceService: WorkspaceService, fileIconService: FileIconService);
    private setupEventListeners;
    private setupGlobalDragDropHandlers;
    private handleDragStart;
    private handleDragEnd;
    private handleDragOver;
    private handleDrop;
    private findDropTarget;
    private getDragOperationType;
    private handleExternalFileDrop;
    private executeDragDropOperation;
    private processDropItem;
    private copyItem;
    private moveItem;
    private linkItem;
    private saveExternalFile;
    private validateOperation;
    private isAcceptedFileType;
    private getTargetPath;
    private getDirectoryPath;
    private getFileName;
    private getFileExtension;
    private createDragPreview;
    private cleanupDragPreview;
    registerDropTarget(target: DropTarget): void;
    unregisterDropTarget(targetId: string): void;
    startDrag(items: DragDropItem[], sourceElement?: HTMLElement): void;
    cancelDrag(): void;
    createFileItem(file: FileInfo): DragDropItem;
    createFolderItem(folder: FileInfo): DragDropItem;
    setDefaultOptions(options: Partial<DragDropOptions>): void;
    addValidationRule(rule: ValidationRule): void;
    removeValidationRule(ruleName: string): void;
    createFileExplorerDropTarget(element: HTMLElement, folderPath: string): DropTarget;
    createEditorDropTarget(element: HTMLElement): DropTarget;
    dispose(): void;
}
