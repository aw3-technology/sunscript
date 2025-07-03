import { EventBus } from '../core/event-bus';
import { FileSystemService } from './FileSystemService';
import { RecentFilesService } from './RecentFilesService';
import { WorkspaceService } from './WorkspaceService';
export interface QuickOpenItem {
    id: string;
    label: string;
    path: string;
    description?: string;
    detail?: string;
    iconClass?: string;
    type: 'file' | 'folder' | 'recent' | 'symbol' | 'command';
    score?: number;
}
export interface QuickOpenState {
    isOpen: boolean;
    query: string;
    selectedIndex: number;
    filteredItems: QuickOpenItem[];
    mode: 'files' | 'symbols' | 'commands';
}
export declare class QuickOpenService {
    private eventBus;
    private fileSystemService;
    private recentFilesService;
    private workspaceService;
    private state;
    private allFiles;
    private isIndexing;
    constructor(eventBus: EventBus, fileSystemService: FileSystemService, recentFilesService: RecentFilesService, workspaceService: WorkspaceService);
    private setupEventListeners;
    private indexWorkspaceFiles;
    private scanDirectory;
    private shouldIgnoreFile;
    toggle(): void;
    show(mode?: 'files' | 'symbols' | 'commands'): void;
    hide(): void;
    updateQuery(query: string): void;
    selectNext(): void;
    selectPrevious(): void;
    executeSelected(): void;
    openItem(item: QuickOpenItem): void;
    private filterItems;
    private calculateMatchScore;
    private fuzzyMatch;
    private handleKeydown;
    private getFileName;
    private getDirectoryPath;
    private getFileIcon;
    getState(): QuickOpenState;
    getAllFiles(): QuickOpenItem[];
    getFilteredItems(): QuickOpenItem[];
    isOpen(): boolean;
    getIndexingStatus(): boolean;
}
