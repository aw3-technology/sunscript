import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { GitService, GitBlame, GitBlameLine } from './GitService';
import { EditorService } from './EditorService';
import * as monaco from 'monaco-editor';

export interface BlameAnnotation {
    lineNumber: number;
    commit: string;
    author: string;
    date: Date;
    message: string;
    isCurrentLine?: boolean;
}

export interface BlameDecoration {
    id: string;
    range: monaco.IRange;
    options: monaco.editor.IModelDecorationOptions;
}

export interface BlameHoverContent {
    commit: string;
    author: string;
    authorEmail: string;
    date: string;
    message: string;
    relativeTime: string;
}

@injectable()
export class BlameAnnotationService {
    private decorations = new Map<string, string[]>(); // uri -> decoration ids
    private blameCache = new Map<string, GitBlame>(); // uri -> blame data
    private hoverProviders = new Map<string, monaco.IDisposable>(); // uri -> hover provider
    private isBlameVisible = new Map<string, boolean>(); // uri -> visibility state
    
    private readonly BLAME_DECORATION_CLASS = 'git-blame-annotation';
    private readonly CURRENT_LINE_CLASS = 'git-blame-current-line';

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.GitService) private gitService: GitService,
        @inject(TYPES.EditorService) private editorService: EditorService
    ) {
        this.setupEventListeners();
        this.registerCSS();
    }

    private setupEventListeners(): void {
        this.eventBus.on('editor.fileOpened', (event) => {
            const { uri } = event.data;
            if (this.shouldShowBlame(uri)) {
                this.loadBlameForFile(uri);
            }
        });

        this.eventBus.on('editor.fileClosed', (event) => {
            const { uri } = event.data;
            this.clearBlameForFile(uri);
        });

        this.eventBus.on('editor.cursorPositionChanged', (event) => {
            const { uri, position } = event.data;
            this.updateCurrentLineHighlight(uri, position.lineNumber);
        });

        this.eventBus.on('git.committed', () => {
            this.clearAllBlameCache();
        });

        this.eventBus.on('git.statusChanged', () => {
            // Refresh blame for modified files
            this.refreshActiveBlameAnnotations();
        });

        this.eventBus.on('blame.toggle', (event) => {
            const { uri } = event.data;
            this.toggleBlame(uri);
        });

        this.eventBus.on('blame.refresh', (event) => {
            const { uri } = event.data;
            this.refreshBlame(uri);
        });
    }

    private registerCSS(): void {
        const style = document.createElement('style');
        style.textContent = `
            .git-blame-annotation {
                background-color: rgba(255, 255, 255, 0.05);
                border-left: 3px solid transparent;
                position: relative;
                padding-left: 8px;
            }
            
            .git-blame-annotation::after {
                content: attr(data-blame-info);
                position: absolute;
                right: 10px;
                top: 0;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: monospace;
                pointer-events: none;
                white-space: nowrap;
                background: rgba(0, 0, 0, 0.3);
                padding: 1px 4px;
                border-radius: 2px;
            }
            
            .git-blame-current-line {
                background-color: rgba(255, 255, 255, 0.1) !important;
                border-left-color: #007acc !important;
            }
            
            .git-blame-annotation:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .blame-hover-content {
                max-width: 400px;
                padding: 8px;
                background: #252526;
                border: 1px solid #3e3e42;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
            }
            
            .blame-hover-header {
                font-weight: bold;
                margin-bottom: 6px;
                color: #d4d4d4;
            }
            
            .blame-hover-info {
                color: #969696;
                margin-bottom: 4px;
            }
            
            .blame-hover-message {
                color: #d4d4d4;
                font-style: italic;
                margin-top: 6px;
                padding-top: 6px;
                border-top: 1px solid #3e3e42;
            }
            
            .blame-commit-hash {
                color: #569cd6;
                font-family: monospace;
            }
            
            .blame-author {
                color: #4ec9b0;
            }
            
            .blame-date {
                color: #ce9178;
            }
        `;
        document.head.appendChild(style);
    }

    async toggleBlame(uri: string): Promise<void> {
        const isVisible = this.isBlameVisible.get(uri) || false;
        
        if (isVisible) {
            this.hideBlame(uri);
        } else {
            await this.showBlame(uri);
        }
    }

    async showBlame(uri: string): Promise<void> {
        try {
            this.isBlameVisible.set(uri, true);
            
            if (!this.blameCache.has(uri)) {
                await this.loadBlameForFile(uri);
            }
            
            this.renderBlameAnnotations(uri);
            this.registerHoverProvider(uri);
            
            this.eventBus.emit('blame.shown', { uri });
            
        } catch (error) {
            console.error('Failed to show blame annotations:', error);
            this.eventBus.emit('blame.error', { uri, error });
        }
    }

    hideBlame(uri: string): void {
        this.isBlameVisible.set(uri, false);
        this.clearDecorations(uri);
        this.unregisterHoverProvider(uri);
        
        this.eventBus.emit('blame.hidden', { uri });
    }

    private async loadBlameForFile(uri: string): Promise<void> {
        try {
            const filePath = uri.replace('file://', '');
            const blame = await this.gitService.getBlame(filePath);
            this.blameCache.set(uri, blame);
            
        } catch (error) {
            console.warn('Failed to load blame for file:', uri, error);
            throw error;
        }
    }

    private renderBlameAnnotations(uri: string): void {
        const blame = this.blameCache.get(uri);
        if (!blame) return;

        const editor = this.editorService.getEditorByUri(uri);
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        // Clear existing decorations
        this.clearDecorations(uri);

        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        for (const line of blame.lines) {
            const annotation = this.createBlameAnnotation(line);
            const decorationOptions = this.createDecorationOptions(annotation);
            
            decorations.push({
                range: new monaco.Range(line.lineNumber, 1, line.lineNumber, 1),
                options: decorationOptions
            });
        }

        // Apply decorations
        const decorationIds = model.deltaDecorations([], decorations);
        this.decorations.set(uri, decorationIds);
    }

    private createBlameAnnotation(line: GitBlameLine): BlameAnnotation {
        return {
            lineNumber: line.lineNumber,
            commit: line.commit.substring(0, 7),
            author: line.author.name,
            date: line.author.date,
            message: line.summary
        };
    }

    private createDecorationOptions(annotation: BlameAnnotation): monaco.editor.IModelDecorationOptions {
        const relativeTime = this.getRelativeTime(annotation.date);
        const blameInfo = `${annotation.author} ${annotation.commit} ${relativeTime}`;
        
        return {
            className: this.BLAME_DECORATION_CLASS,
            hoverMessage: this.createHoverMessage(annotation),
            // afterContentClassName removed,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        };
    }

    private createHoverMessage(annotation: BlameAnnotation): monaco.IMarkdownString {
        const relativeTime = this.getRelativeTime(annotation.date);
        const absoluteTime = annotation.date.toLocaleString();
        
        return {
            value: `**Git Blame**

**Commit:** \`${annotation.commit}\`  
**Author:** ${annotation.author}  
**Date:** ${absoluteTime} (${relativeTime})  

*${annotation.message}*
            `.trim()
        };
    }

    private registerHoverProvider(uri: string): void {
        const model = monaco.editor.getModel(monaco.Uri.parse(uri));
        if (!model) return;

        // Dispose existing hover provider
        this.unregisterHoverProvider(uri);

        const hoverProvider = monaco.languages.registerHoverProvider(
            model.getLanguageId(),
            {
                provideHover: (model, position) => {
                    if (model.uri.toString() !== uri) return null;
                    
                    const blame = this.blameCache.get(uri);
                    if (!blame) return null;

                    const line = blame.lines.find(l => l.lineNumber === position.lineNumber);
                    if (!line) return null;

                    return {
                        range: new monaco.Range(
                            position.lineNumber, 1,
                            position.lineNumber, model.getLineMaxColumn(position.lineNumber)
                        ),
                        contents: [this.createDetailedHoverContent(line)]
                    };
                }
            }
        );

        this.hoverProviders.set(uri, hoverProvider);
    }

    private createDetailedHoverContent(line: GitBlameLine): monaco.IMarkdownString {
        const relativeTime = this.getRelativeTime(line.author.date);
        const absoluteTime = line.author.date.toLocaleString();
        
        return {
            value: `
**Git Blame - Line ${line.lineNumber}**

\`\`\`
Commit: ${line.commit}
Author: ${line.author.name} <${line.author.email}>
Date:   ${absoluteTime} (${relativeTime})

${line.summary}
\`\`\`

**Code:** \`${line.content.trim()}\`
            `.trim(),
            isTrusted: true
        };
    }

    private updateCurrentLineHighlight(uri: string, lineNumber: number): void {
        if (!this.isBlameVisible.get(uri)) return;

        const editor = this.editorService.getEditorByUri(uri);
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        // Find and update current line decoration
        const decorationIds = this.decorations.get(uri) || [];
        const decorations = model.getDecorationsInRange(
            new monaco.Range(1, 1, model.getLineCount(), 1)
        );

        // Clear current line highlighting
        decorations.forEach(decoration => {
            if (decoration.options.className?.includes(this.CURRENT_LINE_CLASS)) {
                const newOptions = { ...decoration.options };
                newOptions.className = (newOptions.className || "").replace(this.CURRENT_LINE_CLASS, '').trim();
                model.deltaDecorations([decoration.id], [{
                    range: decoration.range,
                    options: newOptions
                }]);
            }
        });

        // Add current line highlighting
        const currentLineDecoration = decorations.find(d => 
            d.range.startLineNumber === lineNumber && 
            d.options.className?.includes(this.BLAME_DECORATION_CLASS)
        );

        if (currentLineDecoration) {
            const newOptions = { ...currentLineDecoration.options };
            newOptions.className = `${newOptions.className || ""} ${this.CURRENT_LINE_CLASS}`;
            model.deltaDecorations([currentLineDecoration.id], [{
                range: currentLineDecoration.range,
                options: newOptions
            }]);
        }
    }

    private clearDecorations(uri: string): void {
        const decorationIds = this.decorations.get(uri);
        if (!decorationIds) return;

        const editor = this.editorService.getEditorByUri(uri);
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        model.deltaDecorations(decorationIds, []);
        this.decorations.delete(uri);
    }

    private unregisterHoverProvider(uri: string): void {
        const provider = this.hoverProviders.get(uri);
        if (provider) {
            provider.dispose();
            this.hoverProviders.delete(uri);
        }
    }

    private clearBlameForFile(uri: string): void {
        this.hideBlame(uri);
        this.blameCache.delete(uri);
        this.isBlameVisible.delete(uri);
    }

    private clearAllBlameCache(): void {
        this.blameCache.clear();
        
        // Refresh all visible blame annotations
        for (const [uri, isVisible] of this.isBlameVisible.entries()) {
            if (isVisible) {
                this.refreshBlame(uri);
            }
        }
    }

    private async refreshBlame(uri: string): Promise<void> {
        this.blameCache.delete(uri);
        
        if (this.isBlameVisible.get(uri)) {
            await this.loadBlameForFile(uri);
            this.renderBlameAnnotations(uri);
        }
    }

    private async refreshActiveBlameAnnotations(): Promise<void> {
        const refreshPromises: Promise<void>[] = [];
        
        for (const [uri, isVisible] of this.isBlameVisible.entries()) {
            if (isVisible) {
                refreshPromises.push(this.refreshBlame(uri));
            }
        }
        
        await Promise.all(refreshPromises);
    }

    private shouldShowBlame(uri: string): boolean {
        // Check if file is in a git repository and is a text file
        const repository = this.gitService.getActiveRepository();
        if (!repository) return false;

        const filePath = uri.replace('file://', '');
        return filePath.startsWith(repository.path) && this.isTextFile(uri);
    }

    private isTextFile(uri: string): boolean {
        const textExtensions = [
            '.sun', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', 
            '.json', '.md', '.txt', '.xml', '.yaml', '.yml', '.toml',
            '.py', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rs'
        ];
        
        return textExtensions.some(ext => uri.toLowerCase().endsWith(ext));
    }

    private getRelativeTime(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
        if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    }

    // Public API methods
    isBlameVisibleForFile(uri: string): boolean {
        return this.isBlameVisible.get(uri) || false;
    }

    getBlameForLine(uri: string, lineNumber: number): GitBlameLine | null {
        const blame = this.blameCache.get(uri);
        return blame?.lines.find(l => l.lineNumber === lineNumber) || null;
    }

    async getBlameForFile(uri: string): Promise<GitBlame | null> {
        if (!this.blameCache.has(uri)) {
            try {
                await this.loadBlameForFile(uri);
            } catch (error) {
                return null;
            }
        }
        return this.blameCache.get(uri) || null;
    }

    // Configuration methods
    setBlameVisibility(enabled: boolean): void {
        if (enabled) {
            // Show blame for all open text files
            const openEditors = this.editorService.getOpenEditors();
            openEditors.forEach(async (editor) => {
                const model = editor.getModel();
                if (model && this.shouldShowBlame(model.uri.toString())) {
                    await this.showBlame(model.uri.toString());
                }
            });
        } else {
            // Hide blame for all files
            Array.from(this.isBlameVisible.keys()).forEach(uri => {
                this.hideBlame(uri);
            });
        }
    }

    // Cleanup
    dispose(): void {
        // Clear all decorations
        Array.from(this.decorations.keys()).forEach(uri => {
            this.clearDecorations(uri);
        });

        // Dispose hover providers
        Array.from(this.hoverProviders.values()).forEach(provider => {
            provider.dispose();
        });

        this.decorations.clear();
        this.blameCache.clear();
        this.hoverProviders.clear();
        this.isBlameVisible.clear();
    }
}