import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { CommandContribution, MenuContribution, KeybindingContribution } from '../core/contributions';
import { CommandRegistry } from '../core/command-registry';
import { MenuRegistry } from '../core/menu-registry';
import { KeybindingRegistry } from '../core/keybinding-registry';
import { EditorService } from '../services/EditorService';
import * as monaco from 'monaco-editor';

export namespace EditorCommands {
    export const GO_TO_DEFINITION = 'editor.action.goToDefinition';
    export const GO_TO_REFERENCES = 'editor.action.goToReferences';
    export const RENAME_SYMBOL = 'editor.action.rename';
    export const FORMAT_DOCUMENT = 'editor.action.formatDocument';
    export const FORMAT_SELECTION = 'editor.action.formatSelection';
    export const TOGGLE_FOLD = 'editor.action.toggleFold';
    export const FOLD_ALL = 'editor.action.foldAll';
    export const UNFOLD_ALL = 'editor.action.unfoldAll';
    export const TOGGLE_MINIMAP = 'editor.action.toggleMinimap';
    export const SPLIT_EDITOR_RIGHT = 'editor.action.splitEditorRight';
    export const SPLIT_EDITOR_DOWN = 'editor.action.splitEditorDown';
    export const CLOSE_EDITOR = 'editor.action.closeEditor';
    export const CLOSE_ALL_EDITORS = 'editor.action.closeAllEditors';
    export const SAVE_ALL = 'editor.action.saveAll';
}

@injectable()
export class EditorCommandContribution implements CommandContribution {
    constructor(
        @inject(TYPES.EditorService) private editorService: EditorService
    ) {}
    
    registerCommands(commands: CommandRegistry): void {
        // Go to Definition
        commands.registerCommand({
            id: EditorCommands.GO_TO_DEFINITION,
            label: 'Go to Definition',
            category: 'Editor'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    editor.getAction('editor.action.revealDefinition')?.run();
                }
            },
            isEnabled: () => this.editorService.getActiveEditor() !== null
        });
        
        // Go to References
        commands.registerCommand({
            id: EditorCommands.GO_TO_REFERENCES,
            label: 'Go to References',
            category: 'Editor'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    editor.getAction('editor.action.goToReferences')?.run();
                }
            },
            isEnabled: () => this.editorService.getActiveEditor() !== null
        });
        
        // Rename Symbol
        commands.registerCommand({
            id: EditorCommands.RENAME_SYMBOL,
            label: 'Rename Symbol',
            category: 'Editor'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    editor.getAction('editor.action.rename')?.run();
                }
            },
            isEnabled: () => this.editorService.getActiveEditor() !== null
        });
        
        // Format Document
        commands.registerCommand({
            id: EditorCommands.FORMAT_DOCUMENT,
            label: 'Format Document',
            category: 'Editor'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    editor.getAction('editor.action.formatDocument')?.run();
                }
            },
            isEnabled: () => this.editorService.getActiveEditor() !== null
        });
        
        // Format Selection
        commands.registerCommand({
            id: EditorCommands.FORMAT_SELECTION,
            label: 'Format Selection',
            category: 'Editor'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    editor.getAction('editor.action.formatSelection')?.run();
                }
            },
            isEnabled: () => {
                const editor = this.editorService.getActiveEditor();
                if (!editor) return false;
                const selection = editor.getSelection();
                return selection !== null && !selection.isEmpty();
            }
        });
        
        // Toggle Fold
        commands.registerCommand({
            id: EditorCommands.TOGGLE_FOLD,
            label: 'Toggle Fold',
            category: 'Editor'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    editor.getAction('editor.toggleFold')?.run();
                }
            },
            isEnabled: () => this.editorService.getActiveEditor() !== null
        });
        
        // Fold All
        commands.registerCommand({
            id: EditorCommands.FOLD_ALL,
            label: 'Fold All',
            category: 'Editor'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    editor.getAction('editor.foldAll')?.run();
                }
            },
            isEnabled: () => this.editorService.getActiveEditor() !== null
        });
        
        // Unfold All
        commands.registerCommand({
            id: EditorCommands.UNFOLD_ALL,
            label: 'Unfold All',
            category: 'Editor'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    editor.getAction('editor.unfoldAll')?.run();
                }
            },
            isEnabled: () => this.editorService.getActiveEditor() !== null
        });
        
        // Toggle Minimap
        commands.registerCommand({
            id: EditorCommands.TOGGLE_MINIMAP,
            label: 'Toggle Minimap',
            category: 'View'
        }, {
            execute: () => {
                const editor = this.editorService.getActiveEditor();
                if (editor) {
                    const currentOptions = editor.getOptions();
                    const minimapEnabled = currentOptions.get(monaco.editor.EditorOption.minimap).enabled;
                    editor.updateOptions({
                        minimap: { enabled: !minimapEnabled }
                    });
                }
            },
            isEnabled: () => this.editorService.getActiveEditor() !== null
        });
        
        // Split Editor Right
        commands.registerCommand({
            id: EditorCommands.SPLIT_EDITOR_RIGHT,
            label: 'Split Editor Right',
            category: 'View'
        }, {
            execute: () => {
                const activeGroupId = this.editorService.getActiveGroupId();
                if (activeGroupId) {
                    this.editorService.splitEditor(activeGroupId, 'horizontal');
                }
            }
        });
        
        // Split Editor Down
        commands.registerCommand({
            id: EditorCommands.SPLIT_EDITOR_DOWN,
            label: 'Split Editor Down',
            category: 'View'
        }, {
            execute: () => {
                const activeGroupId = this.editorService.getActiveGroupId();
                if (activeGroupId) {
                    this.editorService.splitEditor(activeGroupId, 'vertical');
                }
            }
        });
    }
}

@injectable()
export class EditorMenuContribution implements MenuContribution {
    registerMenus(menus: MenuRegistry): void {
        // Edit menu in menubar
        menus.registerMenu('menubar', {
            id: 'edit',
            label: 'Edit',
            order: '2'
        });
        
        // Edit menu items
        menus.registerMenus('menubar/edit', [
            {
                id: 'edit-rename',
                command: EditorCommands.RENAME_SYMBOL,
                group: '1_modification',
                order: '1'
            },
            {
                id: 'edit-format-document',
                command: EditorCommands.FORMAT_DOCUMENT,
                group: '2_format',
                order: '1'
            },
            {
                id: 'edit-format-selection',
                command: EditorCommands.FORMAT_SELECTION,
                group: '2_format',
                order: '2'
            }
        ]);
        
        // View menu in menubar
        menus.registerMenu('menubar', {
            id: 'view',
            label: 'View',
            order: '3'
        });
        
        // View menu items
        menus.registerMenus('menubar/view', [
            {
                id: 'view-toggle-minimap',
                command: EditorCommands.TOGGLE_MINIMAP,
                group: '1_appearance',
                order: '1'
            },
            {
                id: 'view-fold-all',
                command: EditorCommands.FOLD_ALL,
                group: '2_folding',
                order: '1'
            },
            {
                id: 'view-unfold-all',
                command: EditorCommands.UNFOLD_ALL,
                group: '2_folding',
                order: '2'
            },
            {
                id: 'view-split-right',
                command: EditorCommands.SPLIT_EDITOR_RIGHT,
                group: '3_split',
                order: '1'
            },
            {
                id: 'view-split-down',
                command: EditorCommands.SPLIT_EDITOR_DOWN,
                group: '3_split',
                order: '2'
            }
        ]);
        
        // Go menu in menubar
        menus.registerMenu('menubar', {
            id: 'go',
            label: 'Go',
            order: '4'
        });
        
        // Go menu items
        menus.registerMenus('menubar/go', [
            {
                id: 'go-to-definition',
                command: EditorCommands.GO_TO_DEFINITION,
                group: '1_navigation',
                order: '1'
            },
            {
                id: 'go-to-references',
                command: EditorCommands.GO_TO_REFERENCES,
                group: '1_navigation',
                order: '2'
            }
        ]);
        
        // Editor context menu
        menus.registerMenus('context/editor', [
            {
                id: 'editor-go-to-definition',
                command: EditorCommands.GO_TO_DEFINITION,
                group: '1_navigation',
                order: '1'
            },
            {
                id: 'editor-go-to-references',
                command: EditorCommands.GO_TO_REFERENCES,
                group: '1_navigation',
                order: '2'
            },
            {
                id: 'editor-rename',
                command: EditorCommands.RENAME_SYMBOL,
                group: '2_modification',
                order: '1'
            },
            {
                id: 'editor-format-selection',
                command: EditorCommands.FORMAT_SELECTION,
                group: '3_format',
                order: '1',
                when: 'editorHasSelection'
            }
        ]);
    }
}

@injectable()
export class EditorKeybindingContribution implements KeybindingContribution {
    registerKeybindings(keybindings: KeybindingRegistry): void {
        // Go to Definition
        keybindings.registerKeybinding({
            keybinding: 'f12',
            command: EditorCommands.GO_TO_DEFINITION,
            when: 'editorFocus'
        });
        
        // Go to References
        keybindings.registerKeybinding({
            keybinding: 'shift+f12',
            command: EditorCommands.GO_TO_REFERENCES,
            when: 'editorFocus'
        });
        
        // Rename Symbol
        keybindings.registerKeybinding({
            keybinding: 'f2',
            command: EditorCommands.RENAME_SYMBOL,
            when: 'editorFocus'
        });
        
        // Format Document
        keybindings.registerKeybinding({
            keybinding: 'shift+alt+f',
            command: EditorCommands.FORMAT_DOCUMENT,
            when: 'editorFocus'
        });
        
        // Format Selection
        keybindings.registerKeybinding({
            keybinding: 'ctrl+k ctrl+f',
            command: EditorCommands.FORMAT_SELECTION,
            when: 'editorFocus && editorHasSelection'
        });
        
        // Toggle Fold
        keybindings.registerKeybinding({
            keybinding: 'ctrl+shift+[',
            command: EditorCommands.TOGGLE_FOLD,
            when: 'editorFocus'
        });
        
        // Fold All
        keybindings.registerKeybinding({
            keybinding: 'ctrl+k ctrl+0',
            command: EditorCommands.FOLD_ALL,
            when: 'editorFocus'
        });
        
        // Unfold All
        keybindings.registerKeybinding({
            keybinding: 'ctrl+k ctrl+j',
            command: EditorCommands.UNFOLD_ALL,
            when: 'editorFocus'
        });
        
        // Split Editor
        keybindings.registerKeybinding({
            keybinding: 'ctrl+\\',
            command: EditorCommands.SPLIT_EDITOR_RIGHT
        });
    }
}