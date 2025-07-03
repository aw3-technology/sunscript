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
export declare class RecentFilesService {
    private eventBus;
    private workspaceService;
    private recentFiles;
    private recentFolders;
    private recentWorkspaces;
    private readonly MAX_RECENT_FILES;
    private readonly MAX_RECENT_FOLDERS;
    private readonly MAX_RECENT_WORKSPACES;
    private readonly STORAGE_KEY_FILES;
    private readonly STORAGE_KEY_FOLDERS;
    private readonly STORAGE_KEY_WORKSPACES;
    constructor(eventBus: EventBus, workspaceService: WorkspaceService);
    private setupEventListeners;
    addRecentFile(uri: string, file?: FileInfo): void;
    addRecentFolder(path: string, folder?: any): void;
    addRecentWorkspace(workspacePath: string, configuration?: any): void;
    removeRecentFile(filePath: string): void;
    removeRecentFolder(folderPath: string): void;
    removeRecentWorkspace(workspacePath: string): void;
    private updateRecentFilePath;
    verifyRecentItems(): Promise<void>;
    cleanupNonExistentItems(): void;
    private loadFromStorage;
    private saveToStorage;
    private getCurrentWorkspacePath;
    private getFileNameFromUri;
    private getPathFromUri;
    private getFileNameFromPath;
    private getFolderNameFromPath;
    private getExtensionFromUri;
    private getExtensionFromPath;
    getRecentFiles(limit?: number): RecentItem[];
    getRecentFolders(limit?: number): RecentItem[];
    getRecentWorkspaces(limit?: number): RecentWorkspace[];
    getRecentFilesByExtension(extension: string): RecentItem[];
    getRecentItemsByWorkspace(workspacePath: string): RecentItem[];
    searchRecentItems(query: string): {
        files: RecentItem[];
        folders: RecentItem[];
        workspaces: RecentWorkspace[];
    };
    clearRecentFiles(): void;
    clearRecentFolders(): void;
    clearRecentWorkspaces(): void;
    clearAllRecent(): void;
    pinRecentItem(itemId: string): void;
    unpinRecentItem(itemId: string): void;
}
