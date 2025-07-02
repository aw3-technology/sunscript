import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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

@injectable()
export class QuickOpenService {
    private state: QuickOpenState = {
        isOpen: false,
        query: '',
        selectedIndex: 0,
        filteredItems: [],
        mode: 'files'
    };

    private allFiles: QuickOpenItem[] = [];
    private isIndexing = false;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.FileSystemService) private fileSystemService: FileSystemService,
        @inject(TYPES.RecentFilesService) private recentFilesService: RecentFilesService,
        @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService
    ) {
        this.setupEventListeners();
        this.indexWorkspaceFiles();
    }

    private setupEventListeners(): void {
        this.eventBus.on('quickOpen.toggle', () => {
            this.toggle();
        });

        this.eventBus.on('quickOpen.show', (event) => {
            const { mode } = event.data || {};
            this.show(mode);
        });

        this.eventBus.on('quickOpen.hide', () => {
            this.hide();
        });

        this.eventBus.on('workspace.changed', () => {
            this.indexWorkspaceFiles();
        });

        this.eventBus.on('file.created', () => {
            this.indexWorkspaceFiles();
        });

        this.eventBus.on('file.deleted', () => {
            this.indexWorkspaceFiles();
        });

        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
                e.preventDefault();
                this.toggle();
            }
            
            if (this.state.isOpen) {
                this.handleKeydown(e);
            }
        });
    }

    private async indexWorkspaceFiles(): Promise<void> {
        if (this.isIndexing) return;
        
        this.isIndexing = true;
        this.allFiles = [];

        try {
            const workspaceFolders = this.workspaceService.getWorkspaceFolders();
            
            for (const folder of workspaceFolders) {
                const files = await this.scanDirectory(folder.path);
                this.allFiles.push(...files);
            }

            // Add recent files that might not be in workspace
            const recentFiles = this.recentFilesService.getRecentFiles();
            for (const recentFile of recentFiles) {
                if (!this.allFiles.find(f => f.path === recentFile.path)) {
                    this.allFiles.push({
                        id: recentFile.path,
                        label: this.getFileName(recentFile.path),
                        path: recentFile.path,
                        description: this.getDirectoryPath(recentFile.path),
                        type: 'recent',
                        iconClass: this.getFileIcon(recentFile.path)
                    });
                }
            }

            this.eventBus.emit('quickOpen.indexingComplete', {
                fileCount: this.allFiles.length
            });

        } catch (error) {
            console.error('Failed to index workspace files:', error);
        } finally {
            this.isIndexing = false;
        }
    }

    private async scanDirectory(dirPath: string, maxDepth = 10, currentDepth = 0): Promise<QuickOpenItem[]> {
        if (currentDepth >= maxDepth) return [];

        const items: QuickOpenItem[] = [];
        
        try {
            const entries = await this.fileSystemService.readDirectory(dirPath);
            
            for (const entry of entries) {
                const fullPath = `${dirPath}/${entry.name}`;
                
                // Skip hidden files and common ignore patterns
                if (this.shouldIgnoreFile(entry.name)) {
                    continue;
                }

                if (entry.type === 'directory') {
                    // Add folder
                    items.push({
                        id: fullPath,
                        label: entry.name,
                        path: fullPath,
                        description: this.getDirectoryPath(fullPath),
                        type: 'folder',
                        iconClass: 'folder-icon'
                    });

                    // Recursively scan subdirectories
                    const subItems = await this.scanDirectory(fullPath, maxDepth, currentDepth + 1);
                    items.push(...subItems);
                } else {
                    // Add file
                    items.push({
                        id: fullPath,
                        label: entry.name,
                        path: fullPath,
                        description: this.getDirectoryPath(fullPath),
                        type: 'file',
                        iconClass: this.getFileIcon(entry.name)
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to scan directory ${dirPath}:`, error);
        }

        return items;
    }

    private shouldIgnoreFile(name: string): boolean {
        const ignorePatterns = [
            /^\./,                    // Hidden files
            /^node_modules$/,         // Node modules
            /^\.git$/,               // Git directory
            /^\.vscode$/,            // VS Code settings
            /^\.idea$/,              // IntelliJ settings
            /^dist$/,                // Build output
            /^build$/,               // Build output
            /^out$/,                 // Build output
            /^target$/,              // Build output
            /\.log$/,                // Log files
            /\.tmp$/,                // Temporary files
            /\.cache$/,              // Cache files
        ];

        return ignorePatterns.some(pattern => pattern.test(name));
    }

    toggle(): void {
        if (this.state.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    show(mode: 'files' | 'symbols' | 'commands' = 'files'): void {
        this.state.isOpen = true;
        this.state.mode = mode;
        this.state.query = '';
        this.state.selectedIndex = 0;
        this.filterItems('');
        
        this.eventBus.emit('quickOpen.stateChanged', {
            state: { ...this.state }
        });
    }

    hide(): void {
        this.state.isOpen = false;
        this.state.query = '';
        this.state.selectedIndex = 0;
        this.state.filteredItems = [];
        
        this.eventBus.emit('quickOpen.stateChanged', {
            state: { ...this.state }
        });
    }

    updateQuery(query: string): void {
        this.state.query = query;
        this.state.selectedIndex = 0;
        this.filterItems(query);
        
        this.eventBus.emit('quickOpen.stateChanged', {
            state: { ...this.state }
        });
    }

    selectNext(): void {
        if (this.state.filteredItems.length > 0) {
            this.state.selectedIndex = Math.min(
                this.state.selectedIndex + 1,
                this.state.filteredItems.length - 1
            );
            
            this.eventBus.emit('quickOpen.stateChanged', {
                state: { ...this.state }
            });
        }
    }

    selectPrevious(): void {
        if (this.state.filteredItems.length > 0) {
            this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, 0);
            
            this.eventBus.emit('quickOpen.stateChanged', {
                state: { ...this.state }
            });
        }
    }

    executeSelected(): void {
        const selectedItem = this.state.filteredItems[this.state.selectedIndex];
        if (selectedItem) {
            this.openItem(selectedItem);
        }
    }

    openItem(item: QuickOpenItem): void {
        this.hide();
        
        if (item.type === 'file' || item.type === 'recent') {
            this.eventBus.emit('file.open', { path: item.path });
            this.recentFilesService.addRecentFile(item.path);
        } else if (item.type === 'folder') {
            this.eventBus.emit('folder.reveal', { path: item.path });
        }
    }

    private filterItems(query: string): void {
        if (!query.trim()) {
            // Show recent files first when no query
            const recentFiles = this.recentFilesService.getRecentFiles();
            const recentItems = recentFiles.map(file => ({
                id: file.path,
                label: this.getFileName(file.path),
                path: file.path,
                description: this.getDirectoryPath(file.path),
                type: 'recent' as const,
                iconClass: this.getFileIcon(file.path),
                score: 1000 - recentFiles.indexOf(file) // Higher score for more recent
            }));

            // Add workspace files, excluding those already in recent
            const otherFiles = this.allFiles
                .filter(file => !recentFiles.some(recent => recent.path === file.path))
                .slice(0, 50); // Limit to first 50 files

            this.state.filteredItems = [...recentItems, ...otherFiles];
            return;
        }

        const lowerQuery = query.toLowerCase();
        const scored = this.allFiles
            .map(item => ({
                item,
                score: this.calculateMatchScore(item, lowerQuery)
            }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 100); // Limit results

        this.state.filteredItems = scored.map(({ item }) => item);
    }

    private calculateMatchScore(item: QuickOpenItem, query: string): number {
        const fileName = item.label.toLowerCase();
        const filePath = item.path.toLowerCase();
        
        let score = 0;
        
        // Exact filename match gets highest score
        if (fileName === query) {
            score += 1000;
        }
        
        // Filename starts with query
        if (fileName.startsWith(query)) {
            score += 500;
        }
        
        // Filename contains query
        if (fileName.includes(query)) {
            score += 200;
        }
        
        // Path contains query
        if (filePath.includes(query)) {
            score += 100;
        }
        
        // Fuzzy matching for filename
        if (this.fuzzyMatch(fileName, query)) {
            score += 50;
        }
        
        // Bonus for file extension match
        if (query.includes('.') && fileName.endsWith(query)) {
            score += 300;
        }
        
        // Bonus for recent files
        if (item.type === 'recent') {
            score += 250;
        }
        
        // Bonus for files in workspace root
        const pathParts = item.path.split('/');
        if (pathParts.length <= 3) {
            score += 25;
        }
        
        return score;
    }

    private fuzzyMatch(text: string, query: string): boolean {
        let textIndex = 0;
        let queryIndex = 0;
        
        while (textIndex < text.length && queryIndex < query.length) {
            if (text[textIndex] === query[queryIndex]) {
                queryIndex++;
            }
            textIndex++;
        }
        
        return queryIndex === query.length;
    }

    private handleKeydown(e: KeyboardEvent): void {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
                e.preventDefault();
                this.executeSelected();
                break;
            case 'Escape':
                e.preventDefault();
                this.hide();
                break;
        }
    }

    // Utility methods
    private getFileName(path: string): string {
        return path.split('/').pop() || path;
    }

    private getDirectoryPath(path: string): string {
        const parts = path.split('/');
        return parts.slice(0, -1).join('/') || '/';
    }

    private getFileIcon(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase();
        
        const iconMap: Record<string, string> = {
            'js': 'file-js',
            'ts': 'file-ts',
            'jsx': 'file-jsx',
            'tsx': 'file-tsx',
            'vue': 'file-vue',
            'html': 'file-html',
            'css': 'file-css',
            'scss': 'file-scss',
            'sass': 'file-sass',
            'less': 'file-less',
            'json': 'file-json',
            'xml': 'file-xml',
            'md': 'file-md',
            'txt': 'file-txt',
            'py': 'file-py',
            'java': 'file-java',
            'c': 'file-c',
            'cpp': 'file-cpp',
            'h': 'file-h',
            'php': 'file-php',
            'rb': 'file-rb',
            'go': 'file-go',
            'rs': 'file-rs',
            'swift': 'file-swift',
            'kt': 'file-kt',
            'dart': 'file-dart',
            'sun': 'file-sun'
        };
        
        return iconMap[ext || ''] || 'file-default';
    }

    // Public API
    getState(): QuickOpenState {
        return { ...this.state };
    }

    getAllFiles(): QuickOpenItem[] {
        return [...this.allFiles];
    }

    getFilteredItems(): QuickOpenItem[] {
        return [...this.state.filteredItems];
    }

    isOpen(): boolean {
        return this.state.isOpen;
    }

    getIndexingStatus(): boolean {
        return this.isIndexing;
    }
}