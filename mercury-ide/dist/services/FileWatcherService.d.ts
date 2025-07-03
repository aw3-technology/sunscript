import { EventBus } from '../core/event-bus';
import { WorkspaceService } from './WorkspaceService';
export interface FileWatcherEvent {
    type: 'created' | 'modified' | 'deleted' | 'renamed';
    uri: string;
    oldUri?: string;
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
export declare class FileWatcherService {
    private eventBus;
    private workspaceService;
    private watchers;
    private watchedFiles;
    private nextWatcherId;
    private pollingInterval;
    private isPolling;
    private readonly DEFAULT_POLL_INTERVAL;
    private readonly DEFAULT_IGNORE_PATTERNS;
    constructor(eventBus: EventBus, workspaceService: WorkspaceService);
    private setupEventListeners;
    private startPolling;
    private stopPolling;
    watchWorkspace(workspacePath: string): string;
    watchPath(path: string, options?: WatcherOptions): string;
    watchFile(filePath: string): string;
    private initializeFileTracking;
    private checkForChanges;
    private checkWatcherChanges;
    private detectFileChanges;
    private isInWatcherPath;
    private shouldWatch;
    private matchesPattern;
    private emitFileEvent;
    unwatchPath(path: string): void;
    unwatchFile(filePath: string): void;
    unwatchById(watcherId: string): void;
    pauseWatcher(watcherId: string): void;
    resumeWatcher(watcherId: string): void;
    addIgnorePattern(pattern: string): void;
    removeIgnorePattern(pattern: string): void;
    setPollingInterval(intervalMs: number): void;
    getActiveWatchers(): FileWatcher[];
    getWatcher(watcherId: string): FileWatcher | undefined;
    getWatchedFiles(): string[];
    isWatchingFile(filePath: string): boolean;
    isWatchingPath(path: string): boolean;
    dispose(): void;
}
export {};
