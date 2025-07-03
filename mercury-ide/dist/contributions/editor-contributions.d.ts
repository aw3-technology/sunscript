import { CommandContribution, MenuContribution, KeybindingContribution } from '../core/contributions';
import { CommandRegistry } from '../core/command-registry';
import { MenuRegistry } from '../core/menu-registry';
import { KeybindingRegistry } from '../core/keybinding-registry';
import { EditorService } from '../services/EditorService';
export declare namespace EditorCommands {
    const GO_TO_DEFINITION = "editor.action.goToDefinition";
    const GO_TO_REFERENCES = "editor.action.goToReferences";
    const RENAME_SYMBOL = "editor.action.rename";
    const FORMAT_DOCUMENT = "editor.action.formatDocument";
    const FORMAT_SELECTION = "editor.action.formatSelection";
    const TOGGLE_FOLD = "editor.action.toggleFold";
    const FOLD_ALL = "editor.action.foldAll";
    const UNFOLD_ALL = "editor.action.unfoldAll";
    const TOGGLE_MINIMAP = "editor.action.toggleMinimap";
    const SPLIT_EDITOR_RIGHT = "editor.action.splitEditorRight";
    const SPLIT_EDITOR_DOWN = "editor.action.splitEditorDown";
    const CLOSE_EDITOR = "editor.action.closeEditor";
    const CLOSE_ALL_EDITORS = "editor.action.closeAllEditors";
    const SAVE_ALL = "editor.action.saveAll";
}
export declare class EditorCommandContribution implements CommandContribution {
    private editorService;
    constructor(editorService: EditorService);
    registerCommands(commands: CommandRegistry): void;
}
export declare class EditorMenuContribution implements MenuContribution {
    registerMenus(menus: MenuRegistry): void;
}
export declare class EditorKeybindingContribution implements KeybindingContribution {
    registerKeybindings(keybindings: KeybindingRegistry): void;
}
