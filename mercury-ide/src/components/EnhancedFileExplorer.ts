import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { WorkspaceService, FileInfo } from '../services/WorkspaceService';
import { FileIconService } from '../services/FileIconService';
import { DragDropService } from '../services/DragDropService';
import { RecentFilesService } from '../services/RecentFilesService';

@injectable()
export class EnhancedFileExplorer {
    private container: HTMLElement | null = null;
    private currentFolder: string = '';
    private expandedFolders = new Set<string>();
    private selectedItems = new Set<string>();

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService,
        @inject(TYPES.FileIconService) private fileIconService: FileIconService,
        @inject(TYPES.DragDropService) private dragDropService: DragDropService,
        @inject(TYPES.RecentFilesService) private recentFilesService: RecentFilesService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('workspace.opened', (event) => {
            const { workspacePath } = event.data;
            this.currentFolder = workspacePath;
            this.refresh();
        });

        this.eventBus.on('workspace.folderAdded', () => {
            this.refresh();
        });

        this.eventBus.on('file.created', () => {
            this.refresh();
        });

        this.eventBus.on('file.deleted', () => {
            this.refresh();
        });

        this.eventBus.on('file.renamed', () => {
            this.refresh();
        });

        this.eventBus.on('fileWatcher.fileCreated', () => {
            this.refresh();
        });

        this.eventBus.on('fileWatcher.fileDeleted', () => {
            this.refresh();
        });

        this.eventBus.on('fileWatcher.fileModified', (event) => {
            const { uri } = event.data.event;
            this.updateFileStatus(uri, 'modified');
        });
    }

    mount(container: HTMLElement): void {
        this.container = container;
        this.render();
        this.setupDragDropTarget();
    }

    private async render(): Promise<void> {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="file-explorer">
                <div class="file-explorer-header">
                    <span class="explorer-title">Explorer</span>
                    <div class="explorer-actions">
                        <button class="action-btn" id="new-file" title="New File">
                            📄
                        </button>
                        <button class="action-btn" id="new-folder" title="New Folder">
                            📁
                        </button>
                        <button class="action-btn" id="refresh" title="Refresh">
                            🔄
                        </button>
                        <button class="action-btn" id="collapse-all" title="Collapse All">
                            📁
                        </button>
                    </div>
                </div>
                <div class="workspace-folders" id="workspace-folders">
                    ${await this.renderWorkspaceFolders()}
                </div>
                <div class="recent-files-section">
                    <div class="section-header">
                        <span class="section-title">Recent Files</span>
                        <button class="action-btn" id="clear-recent" title="Clear Recent">
                            🗑️
                        </button>
                    </div>
                    <div class="recent-files-list" id="recent-files">
                        ${this.renderRecentFiles()}
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    private async renderWorkspaceFolders(): Promise<string> {
        const workspaceFolders = this.workspaceService.getWorkspaceFolders();
        if (workspaceFolders.length === 0) {
            return '<div class="empty-workspace">No workspace opened</div>';
        }

        let html = '';
        for (const folder of workspaceFolders) {
            const files = await this.workspaceService.getFiles(folder.path);
            html += `
                <div class="workspace-folder" data-path="${folder.path}">
                    <div class="folder-header" data-path="${folder.path}">
                        <span class="folder-icon">${this.fileIconService.getFolderIcon(folder.name, true)}</span>
                        <span class="folder-name">${folder.name}</span>
                        <span class="folder-path">${this.getRelativePath(folder.path)}</span>
                    </div>
                    <div class="folder-contents">
                        ${this.renderFileTree(files, folder.path)}
                    </div>
                </div>
            `;
        }
        return html;
    }

    private renderFileTree(files: FileInfo[], parentPath: string, level: number = 0): string {
        return files.map(file => this.renderFileItem(file, parentPath, level)).join('');
    }

    private renderFileItem(file: FileInfo, parentPath: string, level: number): string {
        const indent = level * 16;
        const isExpanded = this.expandedFolders.has(file.path);
        const isSelected = this.selectedItems.has(file.path);
        
        const icon = file.isDirectory 
            ? this.fileIconService.getFolderIcon(file.name, isExpanded)
            : this.fileIconService.getFileIcon(file.name);
            
        const iconColor = file.isDirectory
            ? this.fileIconService.getFolderIconColor(file.name)
            : this.fileIconService.getFileIconColor(file.name);

        let html = `
            <div class="file-item ${file.isDirectory ? 'folder' : 'file'} ${isSelected ? 'selected' : ''}" 
                 data-path="${file.path}" 
                 data-name="${file.name}"
                 data-type="${file.isDirectory ? 'folder' : 'file'}"
                 style="padding-left: ${indent}px"
                 draggable="true">
                
                <div class="file-item-content">
                    ${file.isDirectory ? `
                        <span class="expand-icon ${isExpanded ? 'expanded' : ''}">
                            ${isExpanded ? '▼' : '▶'}
                        </span>
                    ` : '<span class="expand-placeholder"></span>'}
                    
                    <span class="file-icon" style="${iconColor ? `color: ${iconColor}` : ''}">
                        ${icon}
                    </span>
                    
                    <span class="file-name" title="${file.path}">
                        ${file.name}
                    </span>
                    
                    ${file.size ? `<span class="file-size">${this.formatFileSize(file.size)}</span>` : ''}
                    
                    ${file.lastModified ? `<span class="file-modified" title="Last modified: ${file.lastModified.toLocaleString()}">
                        ${this.getRelativeTime(file.lastModified)}
                    </span>` : ''}
                </div>
                
                <div class="file-actions">
                    <button class="file-action-btn" data-action="rename" title="Rename">
                        ✏️
                    </button>
                    <button class="file-action-btn" data-action="delete" title="Delete">
                        🗑️
                    </button>
                    <button class="file-action-btn" data-action="copy" title="Copy Path">
                        📋
                    </button>
                </div>
            </div>
        `;

        // Add children if it's an expanded folder
        if (file.isDirectory && isExpanded) {
            // In a real implementation, you would fetch the folder contents here
            html += `<div class="folder-children" data-parent="${file.path}"></div>`;
        }

        return html;
    }

    private renderRecentFiles(): string {
        const recentFiles = this.recentFilesService.getRecentFiles(10);
        
        if (recentFiles.length === 0) {
            return '<div class="empty-recent">No recent files</div>';
        }

        return recentFiles.map(file => `
            <div class="recent-file-item" data-path="${file.path}" title="${file.path}">
                <span class="file-icon" style="${this.fileIconService.getFileIconColor(file.name) ? `color: ${this.fileIconService.getFileIconColor(file.name)}` : ''}">
                    ${this.fileIconService.getFileIcon(file.name)}
                </span>
                <div class="recent-file-info">
                    <span class="recent-file-name">${file.name}</span>
                    <span class="recent-file-path">${this.getRelativePath(file.path)}</span>
                    <span class="recent-file-time">${this.getRelativeTime(file.lastAccessed)}</span>
                </div>
            </div>
        `).join('');
    }

    private attachEventListeners(): void {
        if (!this.container) return;

        // Header actions
        this.container.querySelector('#new-file')?.addEventListener('click', () => {
            this.createNewFile();
        });

        this.container.querySelector('#new-folder')?.addEventListener('click', () => {
            this.createNewFolder();
        });

        this.container.querySelector('#refresh')?.addEventListener('click', () => {
            this.refresh();
        });

        this.container.querySelector('#collapse-all')?.addEventListener('click', () => {
            this.collapseAll();
        });

        this.container.querySelector('#clear-recent')?.addEventListener('click', () => {
            this.recentFilesService.clearRecentFiles();
            this.refresh();
        });

        // File item events
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const fileItem = target.closest('.file-item') as HTMLElement;
            
            if (!fileItem) return;

            const path = fileItem.dataset.path!;
            const type = fileItem.dataset.type!;
            const name = fileItem.dataset.name!;

            if (target.classList.contains('expand-icon')) {
                this.toggleFolder(path);
            } else if (target.classList.contains('file-action-btn')) {
                const action = target.dataset.action!;
                this.handleFileAction(action, path, name);
            } else if (type === 'file') {
                this.openFile(path, name);
            } else if (type === 'folder') {
                this.toggleFolder(path);
            }
        });

        // Recent files events
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const recentItem = target.closest('.recent-file-item') as HTMLElement;
            
            if (recentItem) {
                const path = recentItem.dataset.path!;
                const name = path.split('/').pop()!;
                this.openFile(path, name);
            }
        });

        // Context menu
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const target = e.target as HTMLElement;
            const fileItem = target.closest('.file-item') as HTMLElement;
            
            if (fileItem) {
                this.showContextMenu(e, fileItem);
            }
        });

        // Selection handling
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const fileItem = target.closest('.file-item') as HTMLElement;
            
            if (fileItem && !target.classList.contains('file-action-btn')) {
                this.handleSelection(fileItem, e.ctrlKey || e.metaKey);
            }
        });

        // Drag and drop
        this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.container.addEventListener('dragover', this.handleDragOver.bind(this));
        this.container.addEventListener('drop', this.handleDrop.bind(this));
    }

    private setupDragDropTarget(): void {
        if (!this.container) return;

        const rootFolder = this.workspaceService.getRootFolder();
        if (rootFolder) {
            const dropTarget = this.dragDropService.createFileExplorerDropTarget(
                this.container,
                rootFolder.path
            );
            this.dragDropService.registerDropTarget(dropTarget);
        }
    }

    private async createNewFile(): Promise<void> {
        const fileName = prompt('Enter file name:');
        if (!fileName) return;

        const rootFolder = this.workspaceService.getRootFolder();
        if (rootFolder) {
            try {
                await this.workspaceService.createFile(rootFolder.path, fileName);
                this.refresh();
            } catch (error) {
                alert(`Failed to create file: ${error}`);
            }
        }
    }

    private async createNewFolder(): Promise<void> {
        const folderName = prompt('Enter folder name:');
        if (!folderName) return;

        const rootFolder = this.workspaceService.getRootFolder();
        if (rootFolder) {
            try {
                await this.workspaceService.createFolder(rootFolder.path, folderName);
                this.refresh();
            } catch (error) {
                alert(`Failed to create folder: ${error}`);
            }
        }
    }

    private async toggleFolder(path: string): Promise<void> {
        if (this.expandedFolders.has(path)) {
            this.expandedFolders.delete(path);
        } else {
            this.expandedFolders.add(path);
        }
        this.refresh();
    }

    private collapseAll(): void {
        this.expandedFolders.clear();
        this.refresh();
    }

    private openFile(path: string, name: string): void {
        this.eventBus.emit('editor.openFile', { 
            uri: `file://${path}`,
            file: { name, path }
        });
    }

    private handleFileAction(action: string, path: string, name: string): void {
        switch (action) {
            case 'rename':
                this.renameFile(path, name);
                break;
            case 'delete':
                this.deleteFile(path, name);
                break;
            case 'copy':
                navigator.clipboard.writeText(path);
                break;
        }
    }

    private async renameFile(path: string, oldName: string): Promise<void> {
        const newName = prompt('Enter new name:', oldName);
        if (!newName || newName === oldName) return;

        const parentPath = path.substring(0, path.lastIndexOf('/'));
        const newPath = `${parentPath}/${newName}`;

        try {
            await this.workspaceService.renameFile(path, newPath);
            this.refresh();
        } catch (error) {
            alert(`Failed to rename: ${error}`);
        }
    }

    private async deleteFile(path: string, name: string): Promise<void> {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            await this.workspaceService.deleteFile(path);
            this.refresh();
        } catch (error) {
            alert(`Failed to delete: ${error}`);
        }
    }

    private handleSelection(fileItem: HTMLElement, multiSelect: boolean): void {
        const path = fileItem.dataset.path!;

        if (!multiSelect) {
            // Clear existing selection
            this.selectedItems.clear();
            this.container?.querySelectorAll('.file-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }

        if (this.selectedItems.has(path)) {
            this.selectedItems.delete(path);
            fileItem.classList.remove('selected');
        } else {
            this.selectedItems.add(path);
            fileItem.classList.add('selected');
        }
    }

    private handleDragStart(e: DragEvent): void {
        const target = e.target as HTMLElement;
        const fileItem = target.closest('.file-item') as HTMLElement;
        
        if (!fileItem) return;

        const path = fileItem.dataset.path!;
        const name = fileItem.dataset.name!;
        const type = fileItem.dataset.type!;

        const dragItem = type === 'file' 
            ? this.dragDropService.createFileItem({
                name, path, uri: `file://${path}`, isDirectory: false, isFile: true
            } as FileInfo)
            : this.dragDropService.createFolderItem({
                name, path, uri: `file://${path}`, isDirectory: true, isFile: false
            } as FileInfo);

        this.dragDropService.startDrag([dragItem], fileItem);
    }

    private handleDragOver(e: DragEvent): void {
        e.preventDefault();
    }

    private handleDrop(e: DragEvent): void {
        e.preventDefault();
        // Drop handling is managed by DragDropService
    }

    private showContextMenu(e: MouseEvent, fileItem: HTMLElement): void {
        const path = fileItem.dataset.path!;
        const name = fileItem.dataset.name!;
        const type = fileItem.dataset.type!;

        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        menu.innerHTML = `
            <div class="context-menu-item" data-action="open">Open</div>
            <div class="context-menu-item" data-action="rename">Rename</div>
            <div class="context-menu-item" data-action="delete">Delete</div>
            <div class="context-menu-item" data-action="copy-path">Copy Path</div>
            ${type === 'folder' ? '<div class="context-menu-item" data-action="new-file">New File</div>' : ''}
            ${type === 'folder' ? '<div class="context-menu-item" data-action="new-folder">New Folder</div>' : ''}
        `;

        menu.addEventListener('click', (e) => {
            const action = (e.target as HTMLElement).dataset.action!;
            this.handleContextMenuAction(action, path, name);
            document.body.removeChild(menu);
        });

        // Remove menu when clicking elsewhere
        const removeMenu = () => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', removeMenu);
        };

        setTimeout(() => document.addEventListener('click', removeMenu), 0);
        document.body.appendChild(menu);
    }

    private handleContextMenuAction(action: string, path: string, name: string): void {
        switch (action) {
            case 'open':
                this.openFile(path, name);
                break;
            case 'rename':
                this.renameFile(path, name);
                break;
            case 'delete':
                this.deleteFile(path, name);
                break;
            case 'copy-path':
                navigator.clipboard.writeText(path);
                break;
            case 'new-file':
                // Implementation for creating new file in specific folder
                break;
            case 'new-folder':
                // Implementation for creating new folder in specific folder
                break;
        }
    }

    private updateFileStatus(uri: string, status: string): void {
        const path = uri.replace('file://', '');
        const fileItem = this.container?.querySelector(`[data-path="${path}"]`);
        
        if (fileItem) {
            fileItem.classList.add(`status-${status}`);
            setTimeout(() => {
                fileItem.classList.remove(`status-${status}`);
            }, 2000);
        }
    }

    private refresh(): void {
        this.render();
    }

    // Utility methods
    private getRelativePath(path: string): string {
        return this.workspaceService.getRelativePath(path);
    }

    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    private getRelativeTime(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    }

    // Public API
    reveal(path: string): void {
        // Expand folders to reveal the given path
        const parts = path.split('/');
        let currentPath = '';
        
        for (let i = 0; i < parts.length - 1; i++) {
            currentPath += parts[i] + '/';
            this.expandedFolders.add(currentPath.slice(0, -1));
        }
        
        this.refresh();
        
        // Scroll to and highlight the item
        setTimeout(() => {
            const item = this.container?.querySelector(`[data-path="${path}"]`) as HTMLElement;
            if (item) {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                item.classList.add('highlighted');
                setTimeout(() => item.classList.remove('highlighted'), 2000);
            }
        }, 100);
    }

    getSelectedItems(): string[] {
        return Array.from(this.selectedItems);
    }

    clearSelection(): void {
        this.selectedItems.clear();
        this.container?.querySelectorAll('.file-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
    }
}