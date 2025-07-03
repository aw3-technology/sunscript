import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { CommandRegistry } from '../core/command-registry';
import { MenuRegistry } from '../core/menu-registry';
import { KeybindingRegistry } from '../core/keybinding-registry';
import { ICommandContribution, IMenuContribution, IKeybindingContribution } from '../core/contribution-interfaces';

@injectable()
export class UICommandContribution implements ICommandContribution {
    constructor(
        @inject(TYPES.CommandRegistry) private commandRegistry: CommandRegistry
    ) {}

    register(): void {
        this.registerCommands();
    }

    registerCommands(): void {
        // File commands
        this.commandRegistry.registerCommand(
            { id: 'file.newFile', label: 'New File' },
            { execute: () => console.log('New file') }
        );
        
        this.commandRegistry.registerCommand(
            { id: 'file.open', label: 'Open...' },
            { execute: () => console.log('Open file') }
        );
        
        this.commandRegistry.registerCommand(
            { id: 'file.save', label: 'Save' },
            { execute: () => console.log('Save file') }
        );
        
        this.commandRegistry.registerCommand(
            { id: 'file.saveAs', label: 'Save As...' },
            { execute: () => console.log('Save as') }
        );
        
        // Edit commands
        this.commandRegistry.registerCommand(
            { id: 'edit.undo', label: 'Undo' },
            { execute: () => console.log('Undo') }
        );
        
        this.commandRegistry.registerCommand(
            { id: 'edit.redo', label: 'Redo' },
            { execute: () => console.log('Redo') }
        );
        
        this.commandRegistry.registerCommand(
            { id: 'edit.cut', label: 'Cut' },
            { execute: () => console.log('Cut') }
        );
        
        this.commandRegistry.registerCommand(
            { id: 'edit.copy', label: 'Copy' },
            { execute: () => console.log('Copy') }
        );
        
        this.commandRegistry.registerCommand(
            { id: 'edit.paste', label: 'Paste' },
            { execute: () => console.log('Paste') }
        );
    }
}

@injectable()
export class UIMenuContribution implements IMenuContribution {
    constructor(
        @inject(TYPES.MenuRegistry) private menuRegistry: MenuRegistry
    ) {}

    register(): void {
        this.registerMenus();
    }

    registerMenus(): void {
        // Register menus are already initialized in MenuRegistry
        // Just add menu items
        
        // Add menu items
        this.menuRegistry.addMenuItem({
            menuId: 'file',
            command: 'file.newFile',
            label: 'New File',
            order: 1
        });
        
        this.menuRegistry.addMenuItem({
            menuId: 'file',
            command: 'file.open',
            label: 'Open...',
            order: 2
        });
    }
}

@injectable()
export class UIKeybindingContribution implements IKeybindingContribution {
    constructor(
        @inject(TYPES.KeybindingRegistry) private keybindingRegistry: KeybindingRegistry
    ) {}

    register(): void {
        this.registerKeybindings();
    }

    registerKeybindings(): void {
        this.keybindingRegistry.registerKeybinding({
            command: 'file.save',
            keybinding: 'Cmd+S',
            when: 'editorFocus'
        });
        
        this.keybindingRegistry.registerKeybinding({
            command: 'edit.undo',
            keybinding: 'Cmd+Z',
            when: 'editorFocus'
        });
    }
}
