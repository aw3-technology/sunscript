import * as monaco from 'monaco-editor';
import { EventBus } from '../core/event-bus';
import { FileSystemService } from './FileSystemService';
export interface EditorTab {
    id: string;
    uri: string;
    title: string;
    isDirty: boolean;
    isPinned: boolean;
    model: monaco.editor.ITextModel;
}
export interface EditorGroup {
    id: string;
    tabs: EditorTab[];
    activeTabId: string | null;
    editor: monaco.editor.IStandaloneCodeEditor | monaco.editor.IStandaloneDiffEditor | null;
}
export interface EditorLayout {
    orientation: 'horizontal' | 'vertical';
    groups: EditorGroup[];
    activeGroupId: string;
}
export declare class EditorService {
    private eventBus;
    private fileSystemService;
    private groups;
    private activeGroupId;
    private nextGroupId;
    private nextTabId;
    constructor(eventBus: EventBus, fileSystemService: FileSystemService);
    private setupEventListeners;
    createEditorGroup(container: HTMLElement): string;
    openFile(uri: string, groupId?: string): Promise<EditorTab>;
    activateTab(groupId: string, tabId: string): void;
    closeTab(groupId: string, tabId: string): void;
    splitEditor(sourceGroupId: string, direction: 'horizontal' | 'vertical'): string;
    saveTab(groupId: string, tabId: string): Promise<void>;
    getActiveEditor(): monaco.editor.IStandaloneCodeEditor | null;
    getGroup(groupId: string): EditorGroup | undefined;
    getActiveGroupId(): string;
    getEditorByUri(uri: string): monaco.editor.IStandaloneCodeEditor | null;
    private detectLanguage;
    private getFileName;
    private updateFileContent;
    getBreadcrumbs(groupId: string): string[];
    openDiffEditor(originalUri: string, modifiedUri: string, groupId?: string): Promise<void>;
    getSelectedText(): string;
    getCurrentFilePath(): string;
    getCurrentLanguage(): string;
    insertText(text: string): void;
    getOpenEditors(): monaco.editor.IStandaloneCodeEditor[];
}
