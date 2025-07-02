import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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

@injectable()
export class MergeConflictService {
    private conflicts = new Map<string, MergeConflict[]>(); // uri -> conflicts
    private decorations = new Map<string, string[]>(); // uri -> decoration ids
    private codeActionProviders = new Map<string, monaco.IDisposable>(); // uri -> provider
    private conflictCounter = 0;

    private readonly CURRENT_HEADER_PATTERN = /^<{7} (.+)$/;
    private readonly SEPARATOR_PATTERN = /^={7}$/;
    private readonly INCOMING_HEADER_PATTERN = /^>{7} (.+)$/;
    private readonly ANCESTOR_PATTERN = /^\|{7} (.+)$/;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.EditorService) private editorService: EditorService,
        @inject(TYPES.GitService) private gitService: GitService
    ) {
        this.setupEventListeners();
        this.registerCSS();
    }

    private setupEventListeners(): void {
        this.eventBus.on('editor.fileOpened', (event) => {
            const { uri } = event.data;
            this.scanForConflicts(uri);
        });

        this.eventBus.on('editor.contentChanged', (event) => {
            const { uri } = event.data;
            this.scanForConflicts(uri);
        });

        this.eventBus.on('editor.fileSaved', (event) => {
            const { uri } = event.data;
            this.validateConflictResolution(uri);
        });

        this.eventBus.on('git.statusChanged', (event) => {
            const { status } = event.data;
            status.conflicted.forEach((file: any) => {
                this.scanForConflicts(`file://${file.path}`);
            });
        });

        this.eventBus.on('conflict.resolve', (event) => {
            const { conflictId, resolution } = event.data;
            this.resolveConflict(conflictId, resolution);
        });

        this.eventBus.on('conflict.acceptCurrent', (event) => {
            const { conflictId } = event.data;
            this.acceptCurrent(conflictId);
        });

        this.eventBus.on('conflict.acceptIncoming', (event) => {
            const { conflictId } = event.data;
            this.acceptIncoming(conflictId);
        });

        this.eventBus.on('conflict.acceptBoth', (event) => {
            const { conflictId } = event.data;
            this.acceptBoth(conflictId);
        });

        this.eventBus.on('conflict.compare', (event) => {
            const { conflictId } = event.data;
            this.openDiffEditor(conflictId);
        });
    }

    private registerCSS(): void {
        const style = document.createElement('style');
        style.textContent = `
            .merge-conflict-current {
                background-color: rgba(64, 200, 174, 0.15);
                border-left: 4px solid #40c8ae;
            }
            
            .merge-conflict-incoming {
                background-color: rgba(86, 156, 214, 0.15);
                border-left: 4px solid #569cd6;
            }
            
            .merge-conflict-ancestor {
                background-color: rgba(206, 145, 120, 0.15);
                border-left: 4px solid #ce9178;
            }
            
            .merge-conflict-separator {
                background-color: rgba(255, 255, 255, 0.1);
                border: 1px solid #3e3e42;
            }
            
            .merge-conflict-marker {
                background-color: rgba(255, 255, 255, 0.05);
                color: #969696;
                font-weight: bold;
            }
            
            .merge-conflict-resolved {
                background-color: rgba(106, 153, 85, 0.15);
                border-left: 4px solid #6a9955;
            }
            
            .conflict-action-button {
                display: inline-block;
                margin: 2px 4px;
                padding: 4px 8px;
                background-color: #0e639c;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
                text-decoration: none;
            }
            
            .conflict-action-button:hover {
                background-color: #1177bb;
            }
            
            .conflict-action-button.secondary {
                background-color: #3e3e42;
            }
            
            .conflict-action-button.secondary:hover {
                background-color: #4e4e52;
            }
            
            .conflict-action-button.danger {
                background-color: #a1260d;
            }
            
            .conflict-action-button.danger:hover {
                background-color: #c5351f;
            }
        `;
        document.head.appendChild(style);
    }

    async scanForConflicts(uri: string): Promise<void> {
        const editor = this.editorService.getEditorByUri(uri);
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        const content = model.getValue();
        const lines = content.split('\n');
        const conflicts = this.parseConflicts(uri, lines);

        this.conflicts.set(uri, conflicts);
        this.updateDecorations(uri, conflicts);
        this.registerCodeActionProvider(uri);

        if (conflicts.length > 0) {
            this.eventBus.emit('conflicts.detected', { uri, conflicts });
        } else {
            this.eventBus.emit('conflicts.resolved', { uri });
        }
    }

    private parseConflicts(uri: string, lines: string[]): MergeConflict[] {
        const conflicts: MergeConflict[] = [];
        let currentConflict: Partial<MergeConflict> | null = null;
        let currentSection: 'current' | 'ancestor' | 'incoming' | null = null;
        let ranges: Partial<ConflictRange> = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            if (this.CURRENT_HEADER_PATTERN.test(line)) {
                // Start of conflict - current section
                currentConflict = {
                    id: `conflict-${++this.conflictCounter}`,
                    uri,
                    isResolved: false
                };
                currentSection = 'current';
                ranges = {
                    header: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
                    fullRange: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1)
                };
                
            } else if (this.ANCESTOR_PATTERN.test(line) && currentConflict) {
                // Ancestor section (3-way merge)
                currentSection = 'ancestor';
                if (ranges.current) {
                    ranges.current = new monaco.Range(
                        ranges.current.startLineNumber,
                        ranges.current.startColumn,
                        lineNumber - 1,
                        lines[lineNumber - 2]?.length + 1 || 1
                    );
                }
                
            } else if (this.SEPARATOR_PATTERN.test(line) && currentConflict) {
                // Separator between current/ancestor and incoming
                ranges.separator = new monaco.Range(lineNumber, 1, lineNumber, line.length + 1);
                if (currentSection === 'current' && !ranges.ancestor) {
                    ranges.current = new monaco.Range(
                        ranges.header!.startLineNumber + 1,
                        1,
                        lineNumber - 1,
                        lines[lineNumber - 2]?.length + 1 || 1
                    );
                } else if (currentSection === 'ancestor') {
                    ranges.ancestor = new monaco.Range(
                        ranges.current!.endLineNumber + 1,
                        1,
                        lineNumber - 1,
                        lines[lineNumber - 2]?.length + 1 || 1
                    );
                }
                currentSection = 'incoming';
                
            } else if (this.INCOMING_HEADER_PATTERN.test(line) && currentConflict) {
                // End of conflict - incoming section
                ranges.incoming = new monaco.Range(
                    ranges.separator!.startLineNumber + 1,
                    1,
                    lineNumber - 1,
                    lines[lineNumber - 2]?.length + 1 || 1
                );
                ranges.footer = new monaco.Range(lineNumber, 1, lineNumber, line.length + 1);
                ranges.fullRange = new monaco.Range(
                    ranges.header!.startLineNumber,
                    1,
                    lineNumber,
                    line.length + 1
                );

                // Complete the conflict
                currentConflict.ranges = [ranges as ConflictRange];
                conflicts.push(currentConflict as MergeConflict);
                
                currentConflict = null;
                currentSection = null;
                ranges = {};
            }
        }

        return conflicts;
    }

    private updateDecorations(uri: string, conflicts: MergeConflict[]): void {
        const editor = this.editorService.getEditorByUri(uri);
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        // Clear existing decorations
        const existingDecorations = this.decorations.get(uri) || [];
        model.deltaDecorations(existingDecorations, []);

        if (conflicts.length === 0) {
            this.decorations.delete(uri);
            return;
        }

        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        conflicts.forEach(conflict => {
            conflict.ranges.forEach(range => {
                // Current section decoration
                decorations.push({
                    range: range.current,
                    options: {
                        className: 'merge-conflict-current',
                        marginClassName: 'conflict-margin-current',
                        hoverMessage: { value: 'Current changes (HEAD)' },
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                });

                // Incoming section decoration
                decorations.push({
                    range: range.incoming,
                    options: {
                        className: 'merge-conflict-incoming',
                        marginClassName: 'conflict-margin-incoming',
                        hoverMessage: { value: 'Incoming changes' },
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                });

                // Ancestor section decoration (if present)
                if (range.ancestor) {
                    decorations.push({
                        range: range.ancestor,
                        options: {
                            className: 'merge-conflict-ancestor',
                            hoverMessage: { value: 'Common ancestor' },
                            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                        }
                    });
                }

                // Separator decoration
                decorations.push({
                    range: range.separator,
                    options: {
                        className: 'merge-conflict-separator',
                        hoverMessage: { value: 'Conflict separator' },
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                });

                // Header and footer decorations
                decorations.push({
                    range: range.header,
                    options: {
                        className: 'merge-conflict-marker',
                        hoverMessage: { value: 'Conflict marker - start' },
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                });

                decorations.push({
                    range: range.footer,
                    options: {
                        className: 'merge-conflict-marker',
                        hoverMessage: { value: 'Conflict marker - end' },
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                });
            });
        });

        const decorationIds = model.deltaDecorations([], decorations);
        this.decorations.set(uri, decorationIds);
    }

    private registerCodeActionProvider(uri: string): void {
        // Dispose existing provider
        const existingProvider = this.codeActionProviders.get(uri);
        if (existingProvider) {
            existingProvider.dispose();
        }

        const model = monaco.editor.getModel(monaco.Uri.parse(uri));
        if (!model) return;

        const provider = monaco.languages.registerCodeActionProvider(
            model.getLanguageId(),
            {
                provideCodeActions: (model, range, context) => {
                    if (model.uri.toString() !== uri) return { actions: [], dispose: () => {} };

                    const conflicts = this.conflicts.get(uri) || [];
                    const actionsForRange: monaco.languages.CodeAction[] = [];

                    conflicts.forEach(conflict => {
                        conflict.ranges.forEach(conflictRange => {
                            if (monaco.Range.intersectRanges(range, conflictRange.fullRange)) {
                                actionsForRange.push(...this.createCodeActions(conflict, conflictRange));
                            }
                        });
                    });

                    return {
                        actions: actionsForRange,
                        dispose: () => {}
                    };
                }
            }
        );

        this.codeActionProviders.set(uri, provider);
    }

    private createCodeActions(conflict: MergeConflict, range: ConflictRange): monaco.languages.CodeAction[] {
        return [
            {
                title: '✓ Accept Current Change',
                kind: 'quickfix',
                command: {
                    id: 'conflict.acceptCurrent',
                    title: 'Accept Current',
                    arguments: [conflict.id]
                },
                isPreferred: true
            },
            {
                title: '✓ Accept Incoming Change',
                kind: 'quickfix',
                command: {
                    id: 'conflict.acceptIncoming',
                    title: 'Accept Incoming',
                    arguments: [conflict.id]
                }
            },
            {
                title: '✓ Accept Both Changes',
                kind: 'quickfix',
                command: {
                    id: 'conflict.acceptBoth',
                    title: 'Accept Both',
                    arguments: [conflict.id]
                }
            },
            {
                title: '👁️ Compare Changes',
                kind: 'refactor',
                command: {
                    id: 'conflict.compare',
                    title: 'Compare',
                    arguments: [conflict.id]
                }
            }
        ];
    }

    async acceptCurrent(conflictId: string): Promise<void> {
        const conflict = this.findConflict(conflictId);
        if (!conflict) return;

        const resolution: ConflictResolution = {
            type: 'current',
            timestamp: new Date()
        };

        await this.applyResolution(conflict, resolution);
    }

    async acceptIncoming(conflictId: string): Promise<void> {
        const conflict = this.findConflict(conflictId);
        if (!conflict) return;

        const resolution: ConflictResolution = {
            type: 'incoming',
            timestamp: new Date()
        };

        await this.applyResolution(conflict, resolution);
    }

    async acceptBoth(conflictId: string): Promise<void> {
        const conflict = this.findConflict(conflictId);
        if (!conflict) return;

        const resolution: ConflictResolution = {
            type: 'both',
            timestamp: new Date()
        };

        await this.applyResolution(conflict, resolution);
    }

    async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
        const conflict = this.findConflict(conflictId);
        if (!conflict) return;

        await this.applyResolution(conflict, resolution);
    }

    private async applyResolution(conflict: MergeConflict, resolution: ConflictResolution): Promise<void> {
        const editor = this.editorService.getEditorByUri(conflict.uri);
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        const range = conflict.ranges[0]; // Assuming single range for now
        let newContent = '';

        switch (resolution.type) {
            case 'current':
                newContent = model.getValueInRange(range.current);
                break;
            case 'incoming':
                newContent = model.getValueInRange(range.incoming);
                break;
            case 'both':
                const currentContent = model.getValueInRange(range.current);
                const incomingContent = model.getValueInRange(range.incoming);
                newContent = `${currentContent}\n${incomingContent}`;
                break;
            case 'custom':
                newContent = resolution.content || '';
                break;
        }

        // Replace the entire conflict range with the resolved content
        const edit: monaco.editor.IIdentifiedSingleEditOperation = {
            range: range.fullRange,
            text: newContent
        };

        model.pushEditOperations([], [edit], () => null);

        conflict.isResolved = true;
        conflict.resolution = resolution;

        this.eventBus.emit('conflict.resolved', { conflict, resolution });

        // Rescan to update UI
        await this.scanForConflicts(conflict.uri);
    }

    private async openDiffEditor(conflictId: string): Promise<void> {
        const conflict = this.findConflict(conflictId);
        if (!conflict) return;

        const editor = this.editorService.getEditorByUri(conflict.uri);
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        const range = conflict.ranges[0];
        const currentContent = model.getValueInRange(range.current);
        const incomingContent = model.getValueInRange(range.incoming);

        // Create temporary models for comparison
        const currentModel = monaco.editor.createModel(currentContent, model.getLanguageId());
        const incomingModel = monaco.editor.createModel(incomingContent, model.getLanguageId());

        // Create diff editor
        const diffContainer = document.createElement('div');
        diffContainer.style.cssText = `
            position: fixed;
            top: 50px;
            left: 50px;
            right: 50px;
            bottom: 50px;
            background: #1e1e1e;
            border: 1px solid #3e3e42;
            z-index: 1000;
        `;

        const diffEditor = monaco.editor.createDiffEditor(diffContainer, {
            theme: 'vs-dark',
            readOnly: false,
            renderSideBySide: true
        });

        diffEditor.setModel({
            original: currentModel,
            modified: incomingModel
        });

        document.body.appendChild(diffContainer);

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕ Close';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #0e639c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            z-index: 1001;
        `;

        closeButton.addEventListener('click', () => {
            document.body.removeChild(diffContainer);
            diffEditor.dispose();
            currentModel.dispose();
            incomingModel.dispose();
        });

        diffContainer.appendChild(closeButton);

        this.eventBus.emit('conflict.diffOpened', { conflict });
    }

    private findConflict(conflictId: string): MergeConflict | null {
        for (const conflicts of this.conflicts.values()) {
            const found = conflicts.find(c => c.id === conflictId);
            if (found) return found;
        }
        return null;
    }

    private async validateConflictResolution(uri: string): Promise<void> {
        const conflicts = this.conflicts.get(uri) || [];
        const unresolvedConflicts = conflicts.filter(c => !c.isResolved);

        if (unresolvedConflicts.length > 0) {
            this.eventBus.emit('conflicts.validationFailed', {
                uri,
                unresolvedCount: unresolvedConflicts.length
            });
        } else {
            this.eventBus.emit('conflicts.validationPassed', { uri });
        }
    }

    // Public API methods
    getConflicts(uri: string): MergeConflict[] {
        return this.conflicts.get(uri) || [];
    }

    getAllConflicts(): Map<string, MergeConflict[]> {
        return new Map(this.conflicts);
    }

    hasUnresolvedConflicts(uri?: string): boolean {
        if (uri) {
            const conflicts = this.conflicts.get(uri) || [];
            return conflicts.some(c => !c.isResolved);
        }

        for (const conflicts of this.conflicts.values()) {
            if (conflicts.some(c => !c.isResolved)) {
                return true;
            }
        }
        return false;
    }

    getConflictCount(uri?: string): number {
        if (uri) {
            return (this.conflicts.get(uri) || []).length;
        }

        let total = 0;
        for (const conflicts of this.conflicts.values()) {
            total += conflicts.length;
        }
        return total;
    }

    async resolveAllConflicts(uri: string, resolutionType: 'current' | 'incoming'): Promise<void> {
        const conflicts = this.conflicts.get(uri) || [];
        const unresolvedConflicts = conflicts.filter(c => !c.isResolved);

        const resolution: ConflictResolution = {
            type: resolutionType,
            timestamp: new Date()
        };

        for (const conflict of unresolvedConflicts) {
            await this.applyResolution(conflict, resolution);
        }
    }

    // Cleanup
    dispose(): void {
        // Clear decorations
        for (const [uri, decorationIds] of this.decorations.entries()) {
            const editor = this.editorService.getEditorByUri(uri);
            if (editor) {
                const model = editor.getModel();
                if (model) {
                    model.deltaDecorations(decorationIds, []);
                }
            }
        }

        // Dispose code action providers
        for (const provider of this.codeActionProviders.values()) {
            provider.dispose();
        }

        this.conflicts.clear();
        this.decorations.clear();
        this.codeActionProviders.clear();
    }
}