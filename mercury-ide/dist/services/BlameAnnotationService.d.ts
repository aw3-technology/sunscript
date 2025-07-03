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
export declare class BlameAnnotationService {
    private eventBus;
    private gitService;
    private editorService;
    private decorations;
    private blameCache;
    private hoverProviders;
    private isBlameVisible;
    private readonly BLAME_DECORATION_CLASS;
    private readonly CURRENT_LINE_CLASS;
    constructor(eventBus: EventBus, gitService: GitService, editorService: EditorService);
    private setupEventListeners;
    private registerCSS;
    toggleBlame(uri: string): Promise<void>;
    showBlame(uri: string): Promise<void>;
    hideBlame(uri: string): void;
    private loadBlameForFile;
    private renderBlameAnnotations;
    private createBlameAnnotation;
    private createDecorationOptions;
    private createHoverMessage;
    private registerHoverProvider;
    private createDetailedHoverContent;
    private updateCurrentLineHighlight;
    private clearDecorations;
    private unregisterHoverProvider;
    private clearBlameForFile;
    private clearAllBlameCache;
    private refreshBlame;
    private refreshActiveBlameAnnotations;
    private shouldShowBlame;
    private isTextFile;
    private getRelativeTime;
    isBlameVisibleForFile(uri: string): boolean;
    getBlameForLine(uri: string, lineNumber: number): GitBlameLine | null;
    getBlameForFile(uri: string): Promise<GitBlame | null>;
    setBlameVisibility(enabled: boolean): void;
    dispose(): void;
}
