import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { WorkspaceService, FileInfo } from './WorkspaceService';

export interface FileWatcherEvent {
    type: 'created' | 'modified' | 'deleted' | 'renamed';
    uri: string;
    oldUri?: string; // For rename events
    timestamp: Date;
}

export interface WatcherOptions {
    recursive?: boolean;
    ignorePatterns?: string[];
    watchFiles?: boolean;
    watchDirectories?: boolean;
    followSymlinks?: boolean;
}

interface FileWatcher {
    id: string;
    path: string;
    options: WatcherOptions;
    isActive: boolean;
    lastCheck: Date;
}

@injectable()
export class FileWatcherService {
    private watchers = new Map<string, FileWatcher>();
    private watchedFiles = new Map<string, Date>(); // path -> lastModified
    private nextWatcherId = 1;
    private pollingInterval: ReturnType<typeof setInterval> | null = null;
    private isPolling = false;

    private readonly DEFAULT_POLL_INTERVAL = 1000; // 1 second
    private readonly DEFAULT_IGNORE_PATTERNS = [
        '.git/**',
        'node_modules/**',
        '**/*.tmp',
        '**/*.temp',
        '**/.*'
    ];

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService
    ) {
        this.setupEventListeners();
        this.startPolling();
    }

    private setupEventListeners(): void {
        this.eventBus.on('workspace.opened', (event) => {
            const { workspacePath } = event.data;
            this.watchWorkspace(workspacePath);
        });

        this.eventBus.on('workspace.folderAdded', (event) => {
            const { folder } = event.data;
            this.watchPath(folder.path);
        });

        this.eventBus.on('workspace.folderRemoved', (event) => {
            const { folder } = event.data;
            this.unwatchPath(folder.path);
        });

        this.eventBus.on('editor.fileOpened', (event) => {
            const { uri } = event.data;
            this.watchFile(uri);
        });

        this.eventBus.on('editor.fileClosed', (event) => {
            const { uri } = event.data;
            this.unwatchFile(uri);
        });
    }

    private startPolling(): void {
        if (this.isPolling) return;

        this.isPolling = true;
        this.pollingInterval = setInterval(() => {
            this.checkForChanges();
        }, this.DEFAULT_POLL_INTERVAL);
    }

    private stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
    }

    watchWorkspace(workspacePath: string): string {
        return this.watchPath(workspacePath, {
            recursive: true,
            watchFiles: true,
            watchDirectories: true,
            ignorePatterns: this.DEFAULT_IGNORE_PATTERNS
        });
    }

    watchPath(path: string, options: WatcherOptions = {}): string {
        const watcherId = `watcher-${this.nextWatcherId++}`;
        
        const watcher: FileWatcher = {
            id: watcherId,
            path,
            options: {
                recursive: true,
                watchFiles: true,
                watchDirectories: true,
                followSymlinks: false,
                ignorePatterns: this.DEFAULT_IGNORE_PATTERNS,
                ...options
            },
            isActive: true,
            lastCheck: new Date()
        };

        this.watchers.set(watcherId, watcher);
        
        // Initialize file tracking for this path
        this.initializeFileTracking(path, watcher.options);

        this.eventBus.emit('fileWatcher.started', { watcherId, path, options });
        return watcherId;
    }

    watchFile(filePath: string): string {
        return this.watchPath(filePath, {
            recursive: false,
            watchFiles: true,
            watchDirectories: false
        });
    }

    private async initializeFileTracking(path: string, options: WatcherOptions): Promise<void> {
        try {
            // Get all files in the path
            const files = await this.workspaceService.getFiles(path);
            
            for (const file of files) {
                if (this.shouldWatch(file.path, options)) {
                    if (file.isFile && file.lastModified) {
                        this.watchedFiles.set(file.path, file.lastModified);
                    }
                    
                    // Recursively track subdirectories
                    if (file.isDirectory && options.recursive) {
                        await this.initializeFileTracking(file.path, options);
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to initialize file tracking for path:', path, error);
        }
    }

    private async checkForChanges(): Promise<void> {
        const activeWatchers = Array.from(this.watchers.values()).filter(w => w.isActive);
        
        for (const watcher of activeWatchers) {
            try {
                await this.checkWatcherChanges(watcher);
                watcher.lastCheck = new Date();
            } catch (error) {
                console.warn('Error checking watcher changes:', error);
            }
        }
    }

    private async checkWatcherChanges(watcher: FileWatcher): Promise<void> {
        try {
            const files = await this.workspaceService.getFiles(watcher.path);
            const currentFiles = new Map<string, Date>();
            
            // Build current file state
            for (const file of files) {
                if (this.shouldWatch(file.path, watcher.options)) {
                    if (file.isFile && file.lastModified) {
                        currentFiles.set(file.path, file.lastModified);
                    }
                    
                    // Handle subdirectories recursively
                    if (file.isDirectory && watcher.options.recursive) {
                        const subFiles = await this.workspaceService.getFiles(file.path);
                        for (const subFile of subFiles) {
                            if (this.shouldWatch(subFile.path, watcher.options) && 
                                subFile.isFile && subFile.lastModified) {
                                currentFiles.set(subFile.path, subFile.lastModified);
                            }
                        }
                    }
                }
            }

            // Detect changes
            await this.detectFileChanges(currentFiles, watcher);
            
        } catch (error) {
            console.warn('Failed to check changes for watcher:', watcher.id, error);
        }
    }

    private async detectFileChanges(currentFiles: Map<string, Date>, watcher: FileWatcher): Promise<void> {
        const previousFiles = new Map(this.watchedFiles);
        
        // Check for new and modified files
        for (const [filePath, lastModified] of currentFiles) {
            const previousModified = previousFiles.get(filePath);
            
            if (!previousModified) {
                // New file
                this.emitFileEvent('created', filePath);
            } else if (lastModified.getTime() > previousModified.getTime()) {
                // Modified file
                this.emitFileEvent('modified', filePath);
            }
            
            // Update tracking
            this.watchedFiles.set(filePath, lastModified);
        }
        
        // Check for deleted files
        for (const [filePath] of previousFiles) {
            if (!currentFiles.has(filePath) && this.isInWatcherPath(filePath, watcher)) {
                this.emitFileEvent('deleted', filePath);
                this.watchedFiles.delete(filePath);
            }
        }
    }

    private isInWatcherPath(filePath: string, watcher: FileWatcher): boolean {
        return filePath.startsWith(watcher.path);
    }

    private shouldWatch(filePath: string, options: WatcherOptions): boolean {
        // Check ignore patterns
        if (options.ignorePatterns) {
            for (const pattern of options.ignorePatterns) {
                if (this.matchesPattern(filePath, pattern)) {
                    return false;
                }
            }
        }
        
        return true;
    }

    private matchesPattern(filePath: string, pattern: string): boolean {
        // Simple pattern matching (can be enhanced with a proper glob library)
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]');
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(filePath);
    }

    private emitFileEvent(type: FileWatcherEvent['type'], uri: string, oldUri?: string): void {
        const event: FileWatcherEvent = {
            type,
            uri,
            oldUri,
            timestamp: new Date()
        };

        this.eventBus.emit('fileWatcher.fileChanged', { event });
        this.eventBus.emit(`fileWatcher.file${type.charAt(0).toUpperCase() + type.slice(1)}`, { event });
        
        // Also emit more specific events
        switch (type) {
            case 'modified':
                this.eventBus.emit('file.externallyModified', { uri });
                break;
            case 'deleted':
                this.eventBus.emit('file.externallyDeleted', { uri });
                break;
            case 'created':
                this.eventBus.emit('file.externallyCreated', { uri });
                break;
            case 'renamed':
                this.eventBus.emit('file.externallyRenamed', { uri, oldUri });
                break;
        }
    }

    unwatchPath(path: string): void {
        const watchersToRemove = Array.from(this.watchers.entries())
            .filter(([_, watcher]) => watcher.path === path)
            .map(([id]) => id);

        for (const watcherId of watchersToRemove) {
            this.unwatchById(watcherId);
        }
    }

    unwatchFile(filePath: string): void {
        this.watchedFiles.delete(filePath);
    }

    unwatchById(watcherId: string): void {
        const watcher = this.watchers.get(watcherId);
        if (watcher) {
            watcher.isActive = false;
            this.watchers.delete(watcherId);
            
            // Remove tracked files for this watcher
            const filesToRemove = Array.from(this.watchedFiles.keys())
                .filter(path => path.startsWith(watcher.path));
            
            for (const filePath of filesToRemove) {
                this.watchedFiles.delete(filePath);
            }
            
            this.eventBus.emit('fileWatcher.stopped', { watcherId, path: watcher.path });
        }
    }

    pauseWatcher(watcherId: string): void {
        const watcher = this.watchers.get(watcherId);
        if (watcher) {
            watcher.isActive = false;
            this.eventBus.emit('fileWatcher.paused', { watcherId });
        }
    }

    resumeWatcher(watcherId: string): void {
        const watcher = this.watchers.get(watcherId);
        if (watcher) {
            watcher.isActive = true;
            watcher.lastCheck = new Date();
            this.eventBus.emit('fileWatcher.resumed', { watcherId });
        }
    }

    // Configuration methods
    addIgnorePattern(pattern: string): void {
        this.DEFAULT_IGNORE_PATTERNS.push(pattern);
        this.eventBus.emit('fileWatcher.ignorePatternAdded', { pattern });
    }

    removeIgnorePattern(pattern: string): void {
        const index = this.DEFAULT_IGNORE_PATTERNS.indexOf(pattern);
        if (index !== -1) {
            this.DEFAULT_IGNORE_PATTERNS.splice(index, 1);
            this.eventBus.emit('fileWatcher.ignorePatternRemoved', { pattern });
        }
    }

    setPollingInterval(intervalMs: number): void {
        this.stopPolling();
        this.pollingInterval = setInterval(() => {
            this.checkForChanges();
        }, intervalMs);
        this.isPolling = true;
    }

    // Getters
    getActiveWatchers(): FileWatcher[] {
        return Array.from(this.watchers.values()).filter(w => w.isActive);
    }

    getWatcher(watcherId: string): FileWatcher | undefined {
        return this.watchers.get(watcherId);
    }

    getWatchedFiles(): string[] {
        return Array.from(this.watchedFiles.keys());
    }

    isWatchingFile(filePath: string): boolean {
        return this.watchedFiles.has(filePath);
    }

    isWatchingPath(path: string): boolean {
        return Array.from(this.watchers.values()).some(w => 
            w.isActive && (w.path === path || path.startsWith(w.path))
        );
    }

    // Cleanup
    dispose(): void {
        this.stopPolling();
        this.watchers.clear();
        this.watchedFiles.clear();
    }
}