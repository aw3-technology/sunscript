import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { CommandContribution, MenuContribution, KeybindingContribution } from '../core/contributions';
import { CommandRegistry, CommandHandler } from '../core/command-registry';
import { MenuRegistry } from '../core/menu-registry';
import { KeybindingRegistry } from '../core/keybinding-registry';
import { EventBus } from '../core/event-bus';

export namespace FileCommands {
    export const NEW_FILE = 'file.new';
    export const OPEN_FILE = 'file.open';
    export const SAVE_FILE = 'file.save';
    export const SAVE_AS = 'file.saveAs';
}

@injectable()
export class FileCommandContribution implements CommandContribution {
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {}
    
    registerCommands(commands: CommandRegistry): void {
        // New File Command
        commands.registerCommand({
            id: FileCommands.NEW_FILE,
            label: 'New File',
            category: 'File'
        }, {
            execute: () => {
                this.eventBus.emit('file.new');
                console.log('New file command executed');
            }
        });
        
        // Open File Command
        commands.registerCommand({
            id: FileCommands.OPEN_FILE,
            label: 'Open File...',
            category: 'File'
        }, {
            execute: () => {
                this.eventBus.emit('file.open');
                console.log('Open file command executed');
            }
        });
        
        // Save File Command
        commands.registerCommand({
            id: FileCommands.SAVE_FILE,
            label: 'Save',
            category: 'File'
        }, {
            execute: () => {
                this.eventBus.emit('file.save');
                console.log('Save file command executed');
            },
            isEnabled: () => {
                // Only enable if there's an active editor
                return true; // TODO: Check if editor has content
            }
        });
        
        // Save As Command
        commands.registerCommand({
            id: FileCommands.SAVE_AS,
            label: 'Save As...',
            category: 'File'
        }, {
            execute: () => {
                this.eventBus.emit('file.saveAs');
                console.log('Save as command executed');
            }
        });
    }
}

@injectable()
export class FileMenuContribution implements MenuContribution {
    registerMenus(menus: MenuRegistry): void {
        // File menu in menubar
        menus.registerMenu('menubar', {
            id: 'file',
            label: 'File',
            order: '1'
        });
        
        // File menu items
        menus.registerMenus('menubar/file', [
            {
                id: 'file-new',
                command: FileCommands.NEW_FILE,
                group: '1_new',
                order: '1'
            },
            {
                id: 'file-open',
                command: FileCommands.OPEN_FILE,
                group: '1_new',
                order: '2'
            },
            {
                id: 'file-save',
                command: FileCommands.SAVE_FILE,
                group: '2_save',
                order: '1'
            },
            {
                id: 'file-save-as',
                command: FileCommands.SAVE_AS,
                group: '2_save',
                order: '2'
            }
        ]);
        
        // Context menu for editor
        menus.registerMenus('context/editor', [
            {
                id: 'editor-save',
                command: FileCommands.SAVE_FILE,
                group: '1_modification',
                order: '1'
            }
        ]);
    }
}

@injectable()
export class FileKeybindingContribution implements KeybindingContribution {
    registerKeybindings(keybindings: KeybindingRegistry): void {
        // New File
        keybindings.registerKeybinding({
            keybinding: 'ctrl+n',
            command: FileCommands.NEW_FILE
        });
        
        // Open File
        keybindings.registerKeybinding({
            keybinding: 'ctrl+o',
            command: FileCommands.OPEN_FILE
        });
        
        // Save File
        keybindings.registerKeybinding({
            keybinding: 'ctrl+s',
            command: FileCommands.SAVE_FILE,
            when: 'editorFocus'
        });
        
        // Save As
        keybindings.registerKeybinding({
            keybinding: 'ctrl+shift+s',
            command: FileCommands.SAVE_AS,
            when: 'editorFocus'
        });
    }
}