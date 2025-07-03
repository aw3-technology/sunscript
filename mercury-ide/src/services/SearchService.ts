import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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

@injectable()
export class SearchService {
    private currentSearchId: string | null = null;
    private searchHistory: SearchOptions[] = [];
    private readonly MAX_HISTORY = 50;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('search.find', (event) => {
            const { options } = event.data;
            this.searchInFiles(options);
        });

        this.eventBus.on('search.replace', (event) => {
            const { options } = event.data;
            this.replaceInFiles(options);
        });

        this.eventBus.on('search.cancel', () => {
            this.cancelSearch();
        });
    }

    async searchInFiles(options: SearchOptions): Promise<SearchSummary> {
        const searchId = `search-${Date.now()}`;
        this.currentSearchId = searchId;
        
        const startTime = Date.now();
        
        this.eventBus.emit('search.started', { searchId, options });
        
        try {
            // Add to search history
            this.addToHistory(options);
            
            // Get files to search
            const files = await this.getFilesToSearch(options);
            
            const results: SearchResult[] = [];
            let processedFiles = 0;
            
            for (const file of files) {
                // Check if search was cancelled
                if (this.currentSearchId !== searchId) {
                    throw new Error('Search cancelled');
                }
                
                const searchResult = await this.searchInFile(file, options);
                if (searchResult.matches.length > 0) {
                    results.push(searchResult);
                }
                
                processedFiles++;
                this.eventBus.emit('search.progress', {
                    searchId,
                    processedFiles,
                    totalFiles: files.length,
                    currentFile: file.name
                });
                
                // Limit results if specified
                if (options.maxResults && results.length >= options.maxResults) {
                    break;
                }
            }
            
            const searchTime = Date.now() - startTime;
            const totalMatches = results.reduce((sum, result) => sum + result.totalMatches, 0);
            
            const summary: SearchSummary = {
                query: options.query,
                results,
                totalFiles: results.length,
                totalMatches,
                searchTime,
                options
            };
            
            this.eventBus.emit('search.completed', { searchId, summary });
            return summary;
            
        } catch (error) {
            this.eventBus.emit('search.failed', { searchId, error });
            throw error;
        } finally {
            this.currentSearchId = null;
        }
    }

    async replaceInFiles(options: SearchOptions): Promise<ReplaceAllResult> {
        if (!options.replacement) {
            throw new Error('Replacement text is required for replace operation');
        }
        
        const searchId = `replace-${Date.now()}`;
        this.currentSearchId = searchId;
        
        const startTime = Date.now();
        
        this.eventBus.emit('replace.started', { searchId, options });
        
        try {
            // Get files to search and replace
            const files = await this.getFilesToSearch(options);
            
            const results: ReplaceResult[] = [];
            let processedFiles = 0;
            
            for (const file of files) {
                // Check if operation was cancelled
                if (this.currentSearchId !== searchId) {
                    throw new Error('Replace operation cancelled');
                }
                
                const replaceResult = await this.replaceInFile(file, options);
                if (replaceResult.replacements.length > 0) {
                    results.push(replaceResult);
                }
                
                processedFiles++;
                this.eventBus.emit('replace.progress', {
                    searchId,
                    processedFiles,
                    totalFiles: files.length,
                    currentFile: file.name
                });
            }
            
            const replaceTime = Date.now() - startTime;
            const totalReplacements = results.reduce((sum, result) => sum + result.totalReplacements, 0);
            
            const replaceAllResult: ReplaceAllResult = {
                results,
                totalFiles: results.length,
                totalReplacements,
                replaceTime
            };
            
            this.eventBus.emit('replace.completed', { searchId, result: replaceAllResult });
            return replaceAllResult;
            
        } catch (error) {
            this.eventBus.emit('replace.failed', { searchId, error });
            throw error;
        } finally {
            this.currentSearchId = null;
        }
    }

    private async getFilesToSearch(options: SearchOptions): Promise<FileInfo[]> {
        const workspaceFolders = this.workspaceService.getWorkspaceFolders();
        const allFiles: FileInfo[] = [];
        
        for (const folder of workspaceFolders) {
            const searchPath = options.searchInPath || folder.path;
            const files = await this.workspaceService.getFiles(searchPath);
            
            // Filter files based on options
            const filteredFiles = files.filter(file => {
                if (!file.isFile) return false;
                
                // Include/exclude patterns
                if (options.includeFiles && !this.matchesPatterns(file.name, options.includeFiles)) {
                    return false;
                }
                
                if (options.excludeFiles && this.matchesPatterns(file.name, options.excludeFiles)) {
                    return false;
                }
                
                return true;
            });
            
            allFiles.push(...filteredFiles);
        }
        
        return allFiles;
    }

    private async searchInFile(file: FileInfo, options: SearchOptions): Promise<SearchResult> {
        // Simulate reading file content
        const content = await this.getFileContent(file);
        const lines = content.split('\n');
        const matches: SearchMatch[] = [];
        
        const searchRegex = this.createSearchRegex(options);
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let match;
            
            // Reset regex lastIndex for global searches
            searchRegex.lastIndex = 0;
            
            while ((match = searchRegex.exec(line)) !== null) {
                const matchText = match[0];
                const column = match.index;
                
                const searchMatch: SearchMatch = {
                    line: lineIndex + 1,
                    column: column + 1,
                    text: line,
                    matchText,
                    beforeMatch: line.substring(0, column),
                    afterMatch: line.substring(column + matchText.length),
                    length: matchText.length
                };
                
                matches.push(searchMatch);
                
                // For non-global regex, break after first match
                if (!searchRegex.global) break;
            }
        }
        
        return {
            file,
            matches,
            totalMatches: matches.length
        };
    }

    private async replaceInFile(file: FileInfo, options: SearchOptions): Promise<ReplaceResult> {
        const content = await this.getFileContent(file);
        const searchRegex = this.createSearchRegex(options, true); // Global for replace
        
        const replacements: SearchMatch[] = [];
        let newContent = content;
        let match;
        let offset = 0;
        
        // Find all matches first
        const originalMatches: RegExpExecArray[] = [];
        searchRegex.lastIndex = 0;
        while ((match = searchRegex.exec(content)) !== null) {
            originalMatches.push(match);
            if (!searchRegex.global) break;
        }
        
        // Replace from end to beginning to maintain indices
        for (let i = originalMatches.length - 1; i >= 0; i--) {
            const match = originalMatches[i];
            const matchText = match[0];
            const startIndex = match.index;
            
            // Calculate line and column
            const beforeMatch = content.substring(0, startIndex);
            const lineBreaks = beforeMatch.split('\n');
            const line = lineBreaks.length;
            const column = lineBreaks[lineBreaks.length - 1].length + 1;
            
            const searchMatch: SearchMatch = {
                line,
                column,
                text: content.split('\n')[line - 1],
                matchText,
                beforeMatch: beforeMatch.substring(beforeMatch.lastIndexOf('\n') + 1),
                afterMatch: '',
                length: matchText.length
            };
            
            replacements.unshift(searchMatch);
            
            // Perform replacement
            const replacement = this.processReplacement(options.replacement!, matchText, match);
            newContent = newContent.substring(0, startIndex) + replacement + newContent.substring(startIndex + matchText.length);
        }
        
        // Save the file with new content (simulate)
        if (replacements.length > 0) {
            this.eventBus.emit('file.willSave', { file, content: newContent });
            // In a real implementation, you would save the file here
            this.eventBus.emit('file.saved', { file, content: newContent });
        }
        
        return {
            file,
            replacements,
            totalReplacements: replacements.length,
            newContent
        };
    }

    private createSearchRegex(options: SearchOptions, global: boolean = false): RegExp {
        let pattern = options.query;
        let flags = global ? 'g' : '';
        
        if (!options.caseSensitive) {
            flags += 'i';
        }
        
        if (!options.useRegex) {
            // Escape special regex characters
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        
        if (options.wholeWord) {
            pattern = `\\b${pattern}\\b`;
        }
        
        return new RegExp(pattern, flags);
    }

    private processReplacement(replacement: string, matchText: string, match: RegExpExecArray): string {
        // Process replacement string with capture groups
        return replacement.replace(/\$(\d+|\$|&)/g, (_, p1) => {
            if (p1 === '$') return '$';
            if (p1 === '&') return matchText;
            
            const groupIndex = parseInt(p1, 10);
            return match[groupIndex] || '';
        });
    }

    private matchesPatterns(fileName: string, patterns: string[]): boolean {
        return patterns.some(pattern => {
            const regexPattern = pattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            
            const regex = new RegExp(`^${regexPattern}$`, 'i');
            return regex.test(fileName);
        });
    }

    private async getFileContent(file: FileInfo): Promise<string> {
        // Simulate file reading with mock content
        await this.delay(50); // Simulate I/O delay
        
        // Generate mock content based on file type
        if (file.extension === 'sun') {
            return `// SunScript file: ${file.name}
function main() {
    console.log("Hello from ${file.name}");
    const data = processData();
    return data;
}

function processData() {
    const items = [1, 2, 3, 4, 5];
    return items.map(item => item * 2);
}

export { main, processData };`;
        } else if (file.extension === 'json') {
            return `{
  "name": "${file.name}",
  "version": "1.0.0",
  "description": "Example JSON file",
  "main": "index.js",
  "scripts": {
    "build": "npm run compile",
    "test": "jest"
  }
}`;
        } else if (file.extension === 'md') {
            return `# ${file.name}

This is a markdown file with some example content.

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

\`\`\`javascript
const example = "Hello World";
console.log(example);
\`\`\`

## License

MIT License`;
        } else {
            return `// Example content for ${file.name}
// This is mock content for demonstration
const example = "search and replace";
function demo() {
    return "Hello World";
}`;
        }
    }

    private addToHistory(options: SearchOptions): void {
        // Remove duplicates
        this.searchHistory = this.searchHistory.filter(h => h.query !== options.query);
        
        // Add to beginning
        this.searchHistory.unshift(options);
        
        // Limit history size
        if (this.searchHistory.length > this.MAX_HISTORY) {
            this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
        }
        
        this.eventBus.emit('search.historyUpdated', { history: this.getSearchHistory() });
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API methods
    cancelSearch(): void {
        if (this.currentSearchId) {
            this.eventBus.emit('search.cancelled', { searchId: this.currentSearchId });
            this.currentSearchId = null;
        }
    }

    getSearchHistory(): SearchOptions[] {
        return [...this.searchHistory];
    }

    clearSearchHistory(): void {
        this.searchHistory = [];
        this.eventBus.emit('search.historyCleared');
    }

    isSearchActive(): boolean {
        return this.currentSearchId !== null;
    }

    getCurrentSearchId(): string | null {
        return this.currentSearchId;
    }

    // Quick search methods
    async quickFind(query: string, caseSensitive: boolean = false): Promise<SearchSummary> {
        return this.searchInFiles({
            query,
            caseSensitive,
            maxResults: 100
        });
    }

    async quickReplace(query: string, replacement: string, caseSensitive: boolean = false): Promise<ReplaceAllResult> {
        return this.replaceInFiles({
            query,
            replacement,
            caseSensitive
        });
    }

    // Preset search configurations
    async searchInTypeScriptFiles(query: string, options: Partial<SearchOptions> = {}): Promise<SearchSummary> {
        return this.searchInFiles({
            query,
            includeFiles: ['*.ts', '*.tsx'],
            ...options
        });
    }

    async searchInSunScriptFiles(query: string, options: Partial<SearchOptions> = {}): Promise<SearchSummary> {
        return this.searchInFiles({
            query,
            includeFiles: ['*.sun'],
            ...options
        });
    }

    async searchInConfigFiles(query: string, options: Partial<SearchOptions> = {}): Promise<SearchSummary> {
        return this.searchInFiles({
            query,
            includeFiles: ['*.json', '*.yaml', '*.yml', '*.toml', '*.ini'],
            ...options
        });
    }
}