import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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

@injectable()
export class DragDropService {
    private dropTargets = new Map<string, DropTarget>();
    private currentDragItems: DragDropItem[] = [];
    private currentOperation: DragDropOperation | null = null;
    private dragPreview: HTMLElement | null = null;
    
    private readonly DEFAULT_OPTIONS: DragDropOptions = {
        allowCopy: true,
        allowMove: true,
        allowLink: false,
        acceptedTypes: ['*'],
        maxFileSize: 100 * 1024 * 1024 // 100MB
    };

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService,
        @inject(TYPES.FileIconService) private fileIconService: FileIconService
    ) {
        this.setupGlobalDragDropHandlers();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('dragDrop.initiate', (event) => {
            const { items, sourceElement } = event.data;
            this.startDrag(items, sourceElement);
        });

        this.eventBus.on('dragDrop.cancel', () => {
            this.cancelDrag();
        });
    }

    private setupGlobalDragDropHandlers(): void {
        // Global drag and drop handlers
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        
        // Prevent default drag behavior on the document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    private handleDragStart(event: DragEvent): void {
        if (!event.dataTransfer) return;

        // Set drag effect
        event.dataTransfer.effectAllowed = 'copyMove';
        
        // Create drag preview
        this.createDragPreview();
        
        this.eventBus.emit('dragDrop.started', { 
            items: this.currentDragItems,
            event 
        });
    }

    private handleDragEnd(event: DragEvent): void {
        this.cleanupDragPreview();
        this.eventBus.emit('dragDrop.ended', { event });
    }

    private handleDragOver(event: DragEvent): void {
        event.preventDefault();
        
        const dropTarget = this.findDropTarget(event.target as HTMLElement);
        if (dropTarget) {
            const canAccept = dropTarget.canAcceptDrop(this.currentDragItems);
            event.dataTransfer!.dropEffect = canAccept ? 'copy' : 'none';
            
            if (canAccept) {
                dropTarget.onDragOver?.(this.currentDragItems);
            }
        }
    }

    private async handleDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
        
        const dropTarget = this.findDropTarget(event.target as HTMLElement);
        if (!dropTarget) return;

        try {
            // Handle external files from OS
            if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
                await this.handleExternalFileDrop(event.dataTransfer.files, dropTarget);
                return;
            }

            // Handle internal drag and drop
            if (this.currentDragItems.length > 0) {
                const operation: DragDropOperation = {
                    type: this.getDragOperationType(event),
                    source: this.currentDragItems,
                    target: dropTarget,
                    metadata: {}
                };

                const result = await this.executeDragDropOperation(operation);
                this.eventBus.emit('dragDrop.completed', { result });
            }
        } catch (error) {
            this.eventBus.emit('dragDrop.failed', { error });
        }
    }

    private findDropTarget(element: HTMLElement): DropTarget | undefined {
        let current: HTMLElement | null = element;
        
        while (current) {
            for (const target of this.dropTargets.values()) {
                if (target.element === current) {
                    return target;
                }
            }
            current = current.parentElement;
        }
        
        return undefined;
    }

    private getDragOperationType(event: DragEvent): 'copy' | 'move' | 'link' {
        if (event.ctrlKey || event.metaKey) return 'copy';
        if (event.altKey) return 'link';
        return 'move';
    }

    private async handleExternalFileDrop(files: FileList, dropTarget: DropTarget): Promise<void> {
        const items: DragDropItem[] = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const item: DragDropItem = {
                id: `external-${Date.now()}-${i}`,
                name: file.name,
                path: '', // External files don't have a path initially
                uri: `file://${file.name}`,
                type: 'file',
                size: file.size,
                mimeType: file.type,
                extension: this.getFileExtension(file.name),
                isDirectory: false,
                data: file
            };
            items.push(item);
        }

        const operation: DragDropOperation = {
            type: 'copy', // External files are always copied
            source: items,
            target: dropTarget
        };

        const result = await this.executeDragDropOperation(operation);
        this.eventBus.emit('dragDrop.externalFilesDropped', { result });
    }

    private async executeDragDropOperation(operation: DragDropOperation): Promise<DragDropResult> {
        const result: DragDropResult = {
            success: false,
            operation,
            processedItems: [],
            errors: [],
            warnings: []
        };

        try {
            // Validate operation
            const validation = await this.validateOperation(operation);
            if (!validation.isValid) {
                result.errors.push(...validation.errors);
                return result;
            }

            // Execute the operation
            await operation.target.onDrop(operation.source, operation);
            
            // Process each item
            for (const item of operation.source) {
                try {
                    await this.processDropItem(item, operation);
                    result.processedItems.push(item);
                } catch (error) {
                    result.errors.push(`Failed to process ${item.name}: ${error}`);
                }
            }

            result.success = result.errors.length === 0;
            
        } catch (error) {
            result.errors.push(`Operation failed: ${error}`);
        }

        return result;
    }

    private async processDropItem(item: DragDropItem, operation: DragDropOperation): Promise<void> {
        const targetPath = this.getTargetPath(operation);
        
        switch (operation.type) {
            case 'copy':
                await this.copyItem(item, targetPath);
                break;
            case 'move':
                await this.moveItem(item, targetPath);
                break;
            case 'link':
                await this.linkItem(item, targetPath);
                break;
        }
    }

    private async copyItem(item: DragDropItem, targetPath: string): Promise<void> {
        const targetFilePath = `${targetPath}/${item.name}`;
        
        if (item.data instanceof File) {
            // Handle external file
            await this.saveExternalFile(item.data, targetFilePath);
        } else {
            // Handle internal file/folder copy
            await this.workspaceService.copyFile(item.path, targetFilePath);
        }
        
        this.eventBus.emit('file.copied', { 
            source: item.path, 
            target: targetFilePath,
            item 
        });
    }

    private async moveItem(item: DragDropItem, targetPath: string): Promise<void> {
        const targetFilePath = `${targetPath}/${item.name}`;
        
        await this.workspaceService.moveFile(item.path, targetFilePath);
        
        this.eventBus.emit('file.moved', { 
            source: item.path, 
            target: targetFilePath,
            item 
        });
    }

    private async linkItem(item: DragDropItem, targetPath: string): Promise<void> {
        // Create symbolic link (simplified implementation)
        const linkPath = `${targetPath}/${item.name}`;
        
        this.eventBus.emit('file.linked', { 
            source: item.path, 
            target: linkPath,
            item 
        });
    }

    private async saveExternalFile(file: File, targetPath: string): Promise<void> {
        // Simulate saving external file
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async () => {
                try {
                    const content = reader.result as string;
                    await this.workspaceService.createFile(
                        this.getDirectoryPath(targetPath),
                        this.getFileName(targetPath),
                        content
                    );
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            
            if (this.fileIconService.isTextFile(file.name)) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    private async validateOperation(operation: DragDropOperation): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];
        
        // Check if target accepts the items
        if (!operation.target.canAcceptDrop(operation.source)) {
            errors.push('Target does not accept these items');
        }
        
        // Validate each item
        for (const item of operation.source) {
            // Check file size
            if (item.size && item.size > this.DEFAULT_OPTIONS.maxFileSize!) {
                errors.push(`File ${item.name} exceeds maximum size limit`);
            }
            
            // Check file type
            if (item.extension && !this.isAcceptedFileType(item.extension, operation.target.acceptedTypes)) {
                errors.push(`File type .${item.extension} is not accepted`);
            }
            
            // Prevent dropping on self
            if (operation.type === 'move' && item.path === this.getTargetPath(operation)) {
                errors.push(`Cannot move ${item.name} to itself`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private isAcceptedFileType(extension: string, acceptedTypes: string[]): boolean {
        if (acceptedTypes.includes('*')) return true;
        return acceptedTypes.some(type => 
            type === extension || 
            type === `*.${extension}` ||
            type.startsWith(extension)
        );
    }

    private getTargetPath(operation: DragDropOperation): string {
        // Extract target path from drop target or operation metadata
        return operation.targetPath || '/default/path';
    }

    private getDirectoryPath(filePath: string): string {
        return filePath.substring(0, filePath.lastIndexOf('/'));
    }

    private getFileName(filePath: string): string {
        return filePath.substring(filePath.lastIndexOf('/') + 1);
    }

    private getFileExtension(fileName: string): string {
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
    }

    private createDragPreview(): void {
        if (this.currentDragItems.length === 0) return;
        
        this.dragPreview = document.createElement('div');
        this.dragPreview.className = 'drag-preview';
        this.dragPreview.style.cssText = `
            position: absolute;
            top: -1000px;
            left: -1000px;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 9999;
        `;
        
        if (this.currentDragItems.length === 1) {
            const item = this.currentDragItems[0];
            const icon = item.type === 'file' 
                ? this.fileIconService.getFileIcon(item.name)
                : this.fileIconService.getFolderIcon(item.name);
            this.dragPreview.textContent = `${icon} ${item.name}`;
        } else {
            this.dragPreview.textContent = `📁 ${this.currentDragItems.length} items`;
        }
        
        document.body.appendChild(this.dragPreview);
    }

    private cleanupDragPreview(): void {
        if (this.dragPreview) {
            document.body.removeChild(this.dragPreview);
            this.dragPreview = null;
        }
        this.currentDragItems = [];
        this.currentOperation = null;
    }

    // Public API methods
    registerDropTarget(target: DropTarget): void {
        this.dropTargets.set(target.id, target);
        
        // Add drag and drop event listeners to the target element
        target.element.addEventListener('dragenter', (e) => {
            e.preventDefault();
            target.onDragEnter?.(this.currentDragItems);
        });
        
        target.element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            target.onDragLeave?.();
        });
        
        this.eventBus.emit('dragDrop.targetRegistered', { target });
    }

    unregisterDropTarget(targetId: string): void {
        const target = this.dropTargets.get(targetId);
        if (target) {
            this.dropTargets.delete(targetId);
            this.eventBus.emit('dragDrop.targetUnregistered', { targetId });
        }
    }

    startDrag(items: DragDropItem[], sourceElement?: HTMLElement): void {
        this.currentDragItems = items;
        this.eventBus.emit('dragDrop.initiated', { items, sourceElement });
    }

    cancelDrag(): void {
        this.cleanupDragPreview();
        this.eventBus.emit('dragDrop.cancelled');
    }

    // Utility methods for creating drag drop items
    createFileItem(file: FileInfo): DragDropItem {
        return {
            id: `file-${Date.now()}`,
            name: file.name,
            path: file.path,
            uri: file.uri,
            type: 'file',
            size: file.size,
            mimeType: file.mimeType,
            extension: file.extension,
            isDirectory: false
        };
    }

    createFolderItem(folder: FileInfo): DragDropItem {
        return {
            id: `folder-${Date.now()}`,
            name: folder.name,
            path: folder.path,
            uri: folder.uri,
            type: 'folder',
            isDirectory: true
        };
    }

    // Configuration methods
    setDefaultOptions(options: Partial<DragDropOptions>): void {
        Object.assign(this.DEFAULT_OPTIONS, options);
    }

    addValidationRule(rule: ValidationRule): void {
        if (!this.DEFAULT_OPTIONS.validationRules) {
            this.DEFAULT_OPTIONS.validationRules = [];
        }
        this.DEFAULT_OPTIONS.validationRules.push(rule);
    }

    removeValidationRule(ruleName: string): void {
        if (this.DEFAULT_OPTIONS.validationRules) {
            this.DEFAULT_OPTIONS.validationRules = this.DEFAULT_OPTIONS.validationRules
                .filter(rule => rule.name !== ruleName);
        }
    }

    // Quick drop target creation helpers
    createFileExplorerDropTarget(element: HTMLElement, folderPath: string): DropTarget {
        return {
            id: `file-explorer-${Date.now()}`,
            element,
            acceptedTypes: ['*'],
            canAcceptDrop: (items) => {
                return items.every(item => 
                    this.fileIconService.canEditFile(item.name) || item.isDirectory
                );
            },
            onDrop: async (items, operation) => {
                operation.targetPath = folderPath;
                this.eventBus.emit('fileExplorer.itemsDropped', { items, folderPath, operation });
            },
            onDragEnter: (items) => {
                element.classList.add('drag-over');
            },
            onDragLeave: () => {
                element.classList.remove('drag-over');
            }
        };
    }

    createEditorDropTarget(element: HTMLElement): DropTarget {
        return {
            id: `editor-${Date.now()}`,
            element,
            acceptedTypes: ['*'],
            canAcceptDrop: (items) => {
                return items.length === 1 && 
                       items[0].type === 'file' && 
                       this.fileIconService.canEditFile(items[0].name);
            },
            onDrop: async (items) => {
                if (items.length === 1) {
                    this.eventBus.emit('editor.openFile', { 
                        uri: items[0].uri,
                        file: items[0]
                    });
                }
            }
        };
    }

    // Cleanup
    dispose(): void {
        this.dropTargets.clear();
        this.cleanupDragPreview();
        
        // Remove global event listeners
        document.removeEventListener('dragstart', this.handleDragStart.bind(this));
        document.removeEventListener('dragend', this.handleDragEnd.bind(this));
        document.removeEventListener('dragover', this.handleDragOver.bind(this));
        document.removeEventListener('drop', this.handleDrop.bind(this));
    }
}