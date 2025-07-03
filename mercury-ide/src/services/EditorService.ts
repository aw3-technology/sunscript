import { injectable, inject } from 'inversify';
import * as monaco from 'monaco-editor';
import { TYPES } from '../core/types';
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

@injectable()
export class EditorService {
    private groups: Map<string, EditorGroup> = new Map();
    private activeGroupId: string = '';
    private nextGroupId = 1;
    private nextTabId = 1;
    
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.FileSystemService) private fileSystemService: FileSystemService
    ) {
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for file changes
        this.eventBus.on('file.changed', (event) => {
            const { uri, content } = event.data;
            this.updateFileContent(uri, content);
        });
    }
    
    createEditorGroup(container: HTMLElement): string {
        const groupId = `group-${this.nextGroupId++}`;
        const editor = monaco.editor.create(container, {
            automaticLayout: true,
            // Enable advanced features
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            minimap: {
                enabled: true,
                renderCharacters: true,
                maxColumn: 80
            },
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible'
            },
            mouseWheelZoom: true,
            multiCursorModifier: 'alt',
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'inline',
            formatOnPaste: true,
            formatOnType: true,
            renderWhitespace: 'selection',
            renderControlCharacters: true,
            // renderIndentGuides removed in newer monaco versions,
            bracketPairColorization: {
                enabled: true
            },
            guides: {
                indentation: true,
                bracketPairs: true
            }
        });
        
        const group: EditorGroup = {
            id: groupId,
            tabs: [],
            activeTabId: null,
            editor
        };
        
        this.groups.set(groupId, group);
        
        if (!this.activeGroupId) {
            this.activeGroupId = groupId;
        }
        
        return groupId;
    }
    
    async openFile(uri: string, groupId?: string): Promise<EditorTab> {
        const targetGroupId = groupId || this.activeGroupId;
        const group = this.groups.get(targetGroupId);
        
        if (!group) {
            throw new Error(`Editor group ${targetGroupId} not found`);
        }
        
        // Check if file is already open in this group
        const existingTab = group.tabs.find(tab => tab.uri === uri);
        if (existingTab) {
            this.activateTab(targetGroupId, existingTab.id);
            return existingTab;
        }
        
        // Load file content
        const content = await this.fileSystemService.loadFile(uri);
        const language = this.detectLanguage(uri);
        
        // Create model
        const model = monaco.editor.createModel(content, language, monaco.Uri.parse(uri));
        
        // Create tab
        const tab: EditorTab = {
            id: `tab-${this.nextTabId++}`,
            uri,
            title: this.getFileName(uri),
            isDirty: false,
            isPinned: false,
            model
        };
        
        // Listen for model changes
        model.onDidChangeContent(() => {
            tab.isDirty = true;
            this.eventBus.emit('editor.tab.changed', { tab });
        });
        
        group.tabs.push(tab);
        this.activateTab(targetGroupId, tab.id);
        
        this.eventBus.emit('editor.tab.opened', { tab, groupId: targetGroupId });
        
        return tab;
    }
    
    activateTab(groupId: string, tabId: string): void {
        const group = this.groups.get(groupId);
        if (!group) return;
        
        const tab = group.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        group.activeTabId = tabId;
        
        if (group.editor && 'setModel' in group.editor) {
            (group.editor as monaco.editor.IStandaloneCodeEditor).setModel(tab.model);
        }
        
        this.eventBus.emit('editor.tab.activated', { tab, groupId });
    }
    
    closeTab(groupId: string, tabId: string): void {
        const group = this.groups.get(groupId);
        if (!group) return;
        
        const tabIndex = group.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        const tab = group.tabs[tabIndex];
        
        // Check if dirty
        if (tab.isDirty) {
            // TODO: Show save dialog
            this.eventBus.emit('editor.tab.dirty', { tab });
        }
        
        // Dispose model
        tab.model.dispose();
        
        // Remove tab
        group.tabs.splice(tabIndex, 1);
        
        // Activate another tab if this was active
        if (group.activeTabId === tabId) {
            if (group.tabs.length > 0) {
                const newActiveTab = group.tabs[Math.max(0, tabIndex - 1)];
                this.activateTab(groupId, newActiveTab.id);
            } else {
                group.activeTabId = null;
                if (group.editor && 'setModel' in group.editor) {
                    group.editor.setModel(null);
                }
            }
        }
        
        this.eventBus.emit('editor.tab.closed', { tabId, groupId });
    }
    
    splitEditor(sourceGroupId: string, direction: 'horizontal' | 'vertical'): string {
        // This would require updating the layout system
        // For now, we'll create a new group
        const container = document.createElement('div');
        container.className = 'editor-group';
        
        const newGroupId = this.createEditorGroup(container);
        
        this.eventBus.emit('editor.group.split', { 
            sourceGroupId, 
            newGroupId, 
            direction 
        });
        
        return newGroupId;
    }
    
    async saveTab(groupId: string, tabId: string): Promise<void> {
        const group = this.groups.get(groupId);
        if (!group) return;
        
        const tab = group.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        const content = tab.model.getValue();
        await this.fileSystemService.saveFile(tab.uri, content);
        
        tab.isDirty = false;
        this.eventBus.emit('editor.tab.saved', { tab, groupId });
    }
    
    getActiveEditor(): monaco.editor.IStandaloneCodeEditor | null {
        const group = this.groups.get(this.activeGroupId);
        if (!group || !group.editor || !('getModel' in group.editor)) {
            return null;
        }
        return group.editor as monaco.editor.IStandaloneCodeEditor;
    }
    
    getGroup(groupId: string): EditorGroup | undefined {
        return this.groups.get(groupId);
    }
    
    getActiveGroupId(): string {
        return this.activeGroupId;
    }
    
    getEditorByUri(uri: string): monaco.editor.IStandaloneCodeEditor | null {
        for (const [groupId, group] of this.groups) {
            const tab = group.tabs.find(t => t.uri === uri);
            if (tab && group.editor && 'getModel' in group.editor) {
                return group.editor as monaco.editor.IStandaloneCodeEditor;
            }
        }
        return null;
    }
    
    private detectLanguage(uri: string): string {
        const extension = uri.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'sun': return 'sunscript';
            case 'js': return 'javascript';
            case 'ts': return 'typescript';
            case 'json': return 'json';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'md': return 'markdown';
            default: return 'plaintext';
        }
    }
    
    private getFileName(uri: string): string {
        return uri.split('/').pop() || uri;
    }
    
    private updateFileContent(uri: string, content: string): void {
        // Update all tabs with this URI
        this.groups.forEach(group => {
            group.tabs.forEach(tab => {
                if (tab.uri === uri && !tab.isDirty) {
                    tab.model.setValue(content);
                }
            });
        });
    }
    
    // Breadcrumbs support
    getBreadcrumbs(groupId: string): string[] {
        const group = this.groups.get(groupId);
        if (!group || !group.activeTabId) return [];
        
        const tab = group.tabs.find(t => t.id === group.activeTabId);
        if (!tab) return [];
        
        // Return path segments
        return tab.uri.split('/').filter(Boolean);
    }
    
    // Diff editor support
    async openDiffEditor(
        originalUri: string, 
        modifiedUri: string, 
        groupId?: string
    ): Promise<void> {
        const targetGroupId = groupId || this.activeGroupId;
        const group = this.groups.get(targetGroupId);
        
        if (!group) return;
        
        const originalContent = await this.fileSystemService.loadFile(originalUri);
        const modifiedContent = await this.fileSystemService.loadFile(modifiedUri);
        
        const originalModel = monaco.editor.createModel(
            originalContent, 
            this.detectLanguage(originalUri)
        );
        const modifiedModel = monaco.editor.createModel(
            modifiedContent, 
            this.detectLanguage(modifiedUri)
        );
        
        // Replace current editor with diff editor
        if (group.editor) {
            group.editor.dispose();
        }
        
        const container = group.editor?.getContainerDomNode()?.parentElement;
        if (container) {
            group.editor = monaco.editor.createDiffEditor(container, {
                automaticLayout: true,
                renderSideBySide: true
            });
            
            group.editor.setModel({
                original: originalModel,
                modified: modifiedModel
            });
        }
        
        this.eventBus.emit('editor.diff.opened', { 
            originalUri, 
            modifiedUri, 
            groupId: targetGroupId 
        });
    }

    // Methods for AI Chat Panel
    getSelectedText(): string {
        const editor = this.getActiveEditor();
        if (!editor) return '';
        
        const selection = editor.getSelection();
        if (!selection) return '';
        
        const model = editor.getModel();
        if (!model) return '';
        
        return model.getValueInRange(selection);
    }

    getCurrentFilePath(): string {
        const group = this.groups.get(this.activeGroupId);
        if (!group || !group.activeTabId) return '';
        
        const tab = group.tabs.find(t => t.id === group.activeTabId);
        return tab ? tab.uri : '';
    }

    getCurrentLanguage(): string {
        const editor = this.getActiveEditor();
        if (!editor) return 'plaintext';
        
        const model = editor.getModel();
        if (!model) return 'plaintext';
        
        return model.getLanguageId();
    }

    insertText(text: string): void {
        const editor = this.getActiveEditor();
        if (!editor) return;
        
        const position = editor.getPosition();
        if (!position) return;
        
        editor.executeEdits('insert', [{
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: text
        }]);
    }

    getOpenEditors(): monaco.editor.IStandaloneCodeEditor[] {
        const editors: monaco.editor.IStandaloneCodeEditor[] = [];
        this.groups.forEach(group => {
            if (group.editor && 'getModel' in group.editor) {
                editors.push(group.editor as monaco.editor.IStandaloneCodeEditor);
            }
        });
        return editors;
    }
}
