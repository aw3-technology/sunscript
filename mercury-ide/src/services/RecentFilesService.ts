import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { WorkspaceService, FileInfo } from './WorkspaceService';

export interface RecentItem {
    id: string;
    name: string;
    path: string;
    uri: string;
    type: 'file' | 'folder' | 'workspace';
    lastAccessed: Date;
    isDirectory: boolean;
    extension?: string;
    workspacePath?: string;
    size?: number;
    exists: boolean;
}

export interface RecentWorkspace {
    id: string;
    name: string;
    path: string;
    folders: string[];
    lastOpened: Date;
    configPath?: string;
    exists: boolean;
}

@injectable()
export class RecentFilesService {
    private recentFiles: RecentItem[] = [];
    private recentFolders: RecentItem[] = [];
    private recentWorkspaces: RecentWorkspace[] = [];
    
    private readonly MAX_RECENT_FILES = 50;
    private readonly MAX_RECENT_FOLDERS = 20;
    private readonly MAX_RECENT_WORKSPACES = 10;
    
    private readonly STORAGE_KEY_FILES = 'sunscript.recentFiles';
    private readonly STORAGE_KEY_FOLDERS = 'sunscript.recentFolders';
    private readonly STORAGE_KEY_WORKSPACES = 'sunscript.recentWorkspaces';

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService
    ) {
        this.loadFromStorage();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // File events
        this.eventBus.on('editor.fileOpened', (event) => {
            const { uri, file } = event.data;
            this.addRecentFile(uri, file);
        });

        this.eventBus.on('file.accessed', (event) => {
            const { uri, file } = event.data;
            this.addRecentFile(uri, file);
        });

        // Folder events
        this.eventBus.on('folder.opened', (event) => {
            const { path, folder } = event.data;
            this.addRecentFolder(path, folder);
        });

        this.eventBus.on('workspace.folderAdded', (event) => {
            const { folder } = event.data;
            this.addRecentFolder(folder.path, folder);
        });

        // Workspace events
        this.eventBus.on('workspace.opened', (event) => {
            const { workspacePath, configuration } = event.data;
            this.addRecentWorkspace(workspacePath, configuration);
        });

        // File system events
        this.eventBus.on('file.deleted', (event) => {
            const { filePath } = event.data;
            this.removeRecentFile(filePath);
        });

        this.eventBus.on('file.renamed', (event) => {
            const { oldPath, newPath } = event.data;
            this.updateRecentFilePath(oldPath, newPath);
        });

        this.eventBus.on('file.moved', (event) => {
            const { sourcePath, targetPath } = event.data;
            this.updateRecentFilePath(sourcePath, targetPath);
        });
    }

    addRecentFile(uri: string, file?: FileInfo): void {
        const now = new Date();
        
        // Remove existing entry if present
        this.recentFiles = this.recentFiles.filter(item => item.uri !== uri);
        
        // Create recent item
        const recentItem: RecentItem = {
            id: `file-${Date.now()}`,
            name: file?.name || this.getFileNameFromUri(uri),
            path: file?.path || this.getPathFromUri(uri),
            uri,
            type: 'file',
            lastAccessed: now,
            isDirectory: false,
            extension: file?.extension || this.getExtensionFromUri(uri),
            workspacePath: this.getCurrentWorkspacePath(),
            size: file?.size,
            exists: true
        };
        
        // Add to beginning of array
        this.recentFiles.unshift(recentItem);
        
        // Limit array size
        if (this.recentFiles.length > this.MAX_RECENT_FILES) {
            this.recentFiles = this.recentFiles.slice(0, this.MAX_RECENT_FILES);
        }
        
        this.saveToStorage();
        this.eventBus.emit('recentFiles.updated', { files: this.getRecentFiles() });
    }

    addRecentFolder(path: string, folder?: any): void {
        const now = new Date();
        const uri = `file://${path}`;
        
        // Remove existing entry if present
        this.recentFolders = this.recentFolders.filter(item => item.path !== path);
        
        // Create recent item
        const recentItem: RecentItem = {
            id: `folder-${Date.now()}`,
            name: folder?.name || this.getFolderNameFromPath(path),
            path,
            uri,
            type: 'folder',
            lastAccessed: now,
            isDirectory: true,
            workspacePath: this.getCurrentWorkspacePath(),
            exists: true
        };
        
        // Add to beginning of array
        this.recentFolders.unshift(recentItem);
        
        // Limit array size
        if (this.recentFolders.length > this.MAX_RECENT_FOLDERS) {
            this.recentFolders = this.recentFolders.slice(0, this.MAX_RECENT_FOLDERS);
        }
        
        this.saveToStorage();
        this.eventBus.emit('recentFolders.updated', { folders: this.getRecentFolders() });
    }

    addRecentWorkspace(workspacePath: string, configuration?: any): void {
        const now = new Date();
        
        // Remove existing entry if present
        this.recentWorkspaces = this.recentWorkspaces.filter(ws => ws.path !== workspacePath);
        
        // Create recent workspace
        const recentWorkspace: RecentWorkspace = {
            id: `workspace-${Date.now()}`,
            name: this.getFolderNameFromPath(workspacePath),
            path: workspacePath,
            folders: configuration?.folders?.map((f: any) => f.path) || [workspacePath],
            lastOpened: now,
            configPath: `${workspacePath}/.sunscript/workspace.json`,
            exists: true
        };
        
        // Add to beginning of array
        this.recentWorkspaces.unshift(recentWorkspace);
        
        // Limit array size
        if (this.recentWorkspaces.length > this.MAX_RECENT_WORKSPACES) {
            this.recentWorkspaces = this.recentWorkspaces.slice(0, this.MAX_RECENT_WORKSPACES);
        }
        
        this.saveToStorage();
        this.eventBus.emit('recentWorkspaces.updated', { workspaces: this.getRecentWorkspaces() });
    }

    removeRecentFile(filePath: string): void {
        const initialLength = this.recentFiles.length;
        this.recentFiles = this.recentFiles.filter(item => item.path !== filePath);
        
        if (this.recentFiles.length !== initialLength) {
            this.saveToStorage();
            this.eventBus.emit('recentFiles.updated', { files: this.getRecentFiles() });
        }
    }

    removeRecentFolder(folderPath: string): void {
        const initialLength = this.recentFolders.length;
        this.recentFolders = this.recentFolders.filter(item => item.path !== folderPath);
        
        if (this.recentFolders.length !== initialLength) {
            this.saveToStorage();
            this.eventBus.emit('recentFolders.updated', { folders: this.getRecentFolders() });
        }
    }

    removeRecentWorkspace(workspacePath: string): void {
        const initialLength = this.recentWorkspaces.length;
        this.recentWorkspaces = this.recentWorkspaces.filter(ws => ws.path !== workspacePath);
        
        if (this.recentWorkspaces.length !== initialLength) {
            this.saveToStorage();
            this.eventBus.emit('recentWorkspaces.updated', { workspaces: this.getRecentWorkspaces() });
        }
    }

    private updateRecentFilePath(oldPath: string, newPath: string): void {
        let updated = false;
        
        // Update files
        this.recentFiles = this.recentFiles.map(item => {
            if (item.path === oldPath) {
                updated = true;
                return {
                    ...item,
                    name: this.getFileNameFromPath(newPath),
                    path: newPath,
                    uri: `file://${newPath}`,
                    extension: this.getExtensionFromPath(newPath)
                };
            }
            return item;
        });
        
        // Update folders
        this.recentFolders = this.recentFolders.map(item => {
            if (item.path === oldPath) {
                updated = true;
                return {
                    ...item,
                    name: this.getFolderNameFromPath(newPath),
                    path: newPath,
                    uri: `file://${newPath}`
                };
            }
            return item;
        });
        
        if (updated) {
            this.saveToStorage();
            this.eventBus.emit('recentFiles.updated', { files: this.getRecentFiles() });
            this.eventBus.emit('recentFolders.updated', { folders: this.getRecentFolders() });
        }
    }

    async verifyRecentItems(): Promise<void> {
        let updated = false;
        
        // Verify files exist (simplified verification)
        for (const file of this.recentFiles) {
            // In a real implementation, you would check if the file exists
            // For now, we'll randomly mark some as non-existent for demo
            if (Math.random() < 0.1) { // 10% chance of being marked as non-existent
                file.exists = false;
                updated = true;
            }
        }
        
        // Verify folders exist
        for (const folder of this.recentFolders) {
            if (Math.random() < 0.05) { // 5% chance of being marked as non-existent
                folder.exists = false;
                updated = true;
            }
        }
        
        // Verify workspaces exist
        for (const workspace of this.recentWorkspaces) {
            if (Math.random() < 0.05) { // 5% chance of being marked as non-existent
                workspace.exists = false;
                updated = true;
            }
        }
        
        if (updated) {
            this.saveToStorage();
            this.eventBus.emit('recentItems.verified');
        }
    }

    cleanupNonExistentItems(): void {
        const filesCount = this.recentFiles.length;
        const foldersCount = this.recentFolders.length;
        const workspacesCount = this.recentWorkspaces.length;
        
        this.recentFiles = this.recentFiles.filter(item => item.exists);
        this.recentFolders = this.recentFolders.filter(item => item.exists);
        this.recentWorkspaces = this.recentWorkspaces.filter(ws => ws.exists);
        
        const removedFiles = filesCount - this.recentFiles.length;
        const removedFolders = foldersCount - this.recentFolders.length;
        const removedWorkspaces = workspacesCount - this.recentWorkspaces.length;
        
        if (removedFiles > 0 || removedFolders > 0 || removedWorkspaces > 0) {
            this.saveToStorage();
            this.eventBus.emit('recentItems.cleaned', {
                removedFiles,
                removedFolders,
                removedWorkspaces
            });
        }
    }

    // Storage methods
    private loadFromStorage(): void {
        try {
            // In a real implementation, you would load from localStorage or a config file
            // For now, we'll initialize with empty arrays
            const storedFiles = localStorage.getItem(this.STORAGE_KEY_FILES);
            if (storedFiles) {
                this.recentFiles = JSON.parse(storedFiles).map((item: any) => ({
                    ...item,
                    lastAccessed: new Date(item.lastAccessed)
                }));
            }
            
            const storedFolders = localStorage.getItem(this.STORAGE_KEY_FOLDERS);
            if (storedFolders) {
                this.recentFolders = JSON.parse(storedFolders).map((item: any) => ({
                    ...item,
                    lastAccessed: new Date(item.lastAccessed)
                }));
            }
            
            const storedWorkspaces = localStorage.getItem(this.STORAGE_KEY_WORKSPACES);
            if (storedWorkspaces) {
                this.recentWorkspaces = JSON.parse(storedWorkspaces).map((ws: any) => ({
                    ...ws,
                    lastOpened: new Date(ws.lastOpened)
                }));
            }
        } catch (error) {
            console.warn('Failed to load recent items from storage:', error);
        }
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY_FILES, JSON.stringify(this.recentFiles));
            localStorage.setItem(this.STORAGE_KEY_FOLDERS, JSON.stringify(this.recentFolders));
            localStorage.setItem(this.STORAGE_KEY_WORKSPACES, JSON.stringify(this.recentWorkspaces));
        } catch (error) {
            console.warn('Failed to save recent items to storage:', error);
        }
    }

    // Utility methods
    private getCurrentWorkspacePath(): string | undefined {
        const rootFolder = this.workspaceService.getRootFolder();
        return rootFolder?.path;
    }

    private getFileNameFromUri(uri: string): string {
        return uri.split('/').pop() || 'Unknown';
    }

    private getPathFromUri(uri: string): string {
        return uri.replace('file://', '');
    }

    private getFileNameFromPath(path: string): string {
        return path.split('/').pop() || 'Unknown';
    }

    private getFolderNameFromPath(path: string): string {
        return path.split('/').pop() || 'Unknown';
    }

    private getExtensionFromUri(uri: string): string | undefined {
        const fileName = this.getFileNameFromUri(uri);
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : undefined;
    }

    private getExtensionFromPath(path: string): string | undefined {
        const fileName = this.getFileNameFromPath(path);
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : undefined;
    }

    // Public API methods
    getRecentFiles(limit?: number): RecentItem[] {
        const files = this.recentFiles.slice(0, limit || this.MAX_RECENT_FILES);
        return files.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    }

    getRecentFolders(limit?: number): RecentItem[] {
        const folders = this.recentFolders.slice(0, limit || this.MAX_RECENT_FOLDERS);
        return folders.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    }

    getRecentWorkspaces(limit?: number): RecentWorkspace[] {
        const workspaces = this.recentWorkspaces.slice(0, limit || this.MAX_RECENT_WORKSPACES);
        return workspaces.sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime());
    }

    getRecentFilesByExtension(extension: string): RecentItem[] {
        return this.recentFiles
            .filter(item => item.extension === extension)
            .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    }

    getRecentItemsByWorkspace(workspacePath: string): RecentItem[] {
        return [...this.recentFiles, ...this.recentFolders]
            .filter(item => item.workspacePath === workspacePath)
            .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    }

    searchRecentItems(query: string): { files: RecentItem[], folders: RecentItem[], workspaces: RecentWorkspace[] } {
        const lowerQuery = query.toLowerCase();
        
        const files = this.recentFiles.filter(item =>
            item.name.toLowerCase().includes(lowerQuery) ||
            item.path.toLowerCase().includes(lowerQuery)
        );
        
        const folders = this.recentFolders.filter(item =>
            item.name.toLowerCase().includes(lowerQuery) ||
            item.path.toLowerCase().includes(lowerQuery)
        );
        
        const workspaces = this.recentWorkspaces.filter(ws =>
            ws.name.toLowerCase().includes(lowerQuery) ||
            ws.path.toLowerCase().includes(lowerQuery)
        );
        
        return { files, folders, workspaces };
    }

    clearRecentFiles(): void {
        this.recentFiles = [];
        this.saveToStorage();
        this.eventBus.emit('recentFiles.cleared');
    }

    clearRecentFolders(): void {
        this.recentFolders = [];
        this.saveToStorage();
        this.eventBus.emit('recentFolders.cleared');
    }

    clearRecentWorkspaces(): void {
        this.recentWorkspaces = [];
        this.saveToStorage();
        this.eventBus.emit('recentWorkspaces.cleared');
    }

    clearAllRecent(): void {
        this.recentFiles = [];
        this.recentFolders = [];
        this.recentWorkspaces = [];
        this.saveToStorage();
        this.eventBus.emit('recentItems.allCleared');
    }

    pinRecentItem(itemId: string): void {
        // Find and update the item (implementation would depend on UI requirements)
        this.eventBus.emit('recentItem.pinned', { itemId });
    }

    unpinRecentItem(itemId: string): void {
        // Find and update the item
        this.eventBus.emit('recentItem.unpinned', { itemId });
    }
}