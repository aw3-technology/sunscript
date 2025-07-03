import { EventBus } from '../core/event-bus';
import { EditorService } from './EditorService';
import { GitService } from './GitService';
import * as monaco from 'monaco-editor';
export interface MergeConflict {
    id: string;
    uri: string;
    ranges: ConflictRange[];
    isResolved: boolean;
    resolution?: ConflictResolution;
}
export interface ConflictRange {
    current: monaco.IRange;
    incoming: monaco.IRange;
    ancestor?: monaco.IRange;
    separator: monaco.IRange;
    header: monaco.IRange;
    footer: monaco.IRange;
    fullRange: monaco.IRange;
}
export interface ConflictResolution {
    type: 'current' | 'incoming' | 'both' | 'custom';
    content?: string;
    timestamp: Date;
}
export interface ConflictMarker {
    type: 'current-start' | 'separator' | 'incoming-start' | 'end';
    line: number;
    content: string;
}
export interface ConflictAction {
    id: string;
    title: string;
    command: string;
    arguments?: any[];
    icon?: string;
    tooltip?: string;
}
export declare class MergeConflictService {
    private eventBus;
    private editorService;
    private gitService;
    private conflicts;
    private decorations;
    private codeActionProviders;
    private conflictCounter;
    private readonly CURRENT_HEADER_PATTERN;
    private readonly SEPARATOR_PATTERN;
    private readonly INCOMING_HEADER_PATTERN;
    private readonly ANCESTOR_PATTERN;
    constructor(eventBus: EventBus, editorService: EditorService, gitService: GitService);
    private setupEventListeners;
    private registerCSS;
    scanForConflicts(uri: string): Promise<void>;
    private parseConflicts;
    private updateDecorations;
    private registerCodeActionProvider;
    private createCodeActions;
    acceptCurrent(conflictId: string): Promise<void>;
    acceptIncoming(conflictId: string): Promise<void>;
    acceptBoth(conflictId: string): Promise<void>;
    resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>;
    private applyResolution;
    private openDiffEditor;
    private findConflict;
    private validateConflictResolution;
    getConflicts(uri: string): MergeConflict[];
    getAllConflicts(): Map<string, MergeConflict[]>;
    hasUnresolvedConflicts(uri?: string): boolean;
    getConflictCount(uri?: string): number;
    resolveAllConflicts(uri: string, resolutionType: 'current' | 'incoming'): Promise<void>;
    dispose(): void;
}
