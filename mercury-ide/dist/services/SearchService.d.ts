import { EventBus } from '../core/event-bus';
import { WorkspaceService, FileInfo } from './WorkspaceService';
export interface SearchOptions {
    query: string;
    replacement?: string;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
    includeFiles?: string[];
    excludeFiles?: string[];
    maxResults?: number;
    searchInPath?: string;
}
export interface SearchMatch {
    line: number;
    column: number;
    text: string;
    matchText: string;
    beforeMatch: string;
    afterMatch: string;
    length: number;
}
export interface SearchResult {
    file: FileInfo;
    matches: SearchMatch[];
    totalMatches: number;
}
export interface SearchSummary {
    query: string;
    results: SearchResult[];
    totalFiles: number;
    totalMatches: number;
    searchTime: number;
    options: SearchOptions;
}
export interface ReplaceResult {
    file: FileInfo;
    replacements: SearchMatch[];
    totalReplacements: number;
    newContent: string;
}
export interface ReplaceAllResult {
    results: ReplaceResult[];
    totalFiles: number;
    totalReplacements: number;
    replaceTime: number;
}
export declare class SearchService {
    private eventBus;
    private workspaceService;
    private currentSearchId;
    private searchHistory;
    private readonly MAX_HISTORY;
    constructor(eventBus: EventBus, workspaceService: WorkspaceService);
    private setupEventListeners;
    searchInFiles(options: SearchOptions): Promise<SearchSummary>;
    replaceInFiles(options: SearchOptions): Promise<ReplaceAllResult>;
    private getFilesToSearch;
    private searchInFile;
    private replaceInFile;
    private createSearchRegex;
    private processReplacement;
    private matchesPatterns;
    private getFileContent;
    private addToHistory;
    private delay;
    cancelSearch(): void;
    getSearchHistory(): SearchOptions[];
    clearSearchHistory(): void;
    isSearchActive(): boolean;
    getCurrentSearchId(): string | null;
    quickFind(query: string, caseSensitive?: boolean): Promise<SearchSummary>;
    quickReplace(query: string, replacement: string, caseSensitive?: boolean): Promise<ReplaceAllResult>;
    searchInTypeScriptFiles(query: string, options?: Partial<SearchOptions>): Promise<SearchSummary>;
    searchInSunScriptFiles(query: string, options?: Partial<SearchOptions>): Promise<SearchSummary>;
    searchInConfigFiles(query: string, options?: Partial<SearchOptions>): Promise<SearchSummary>;
}
