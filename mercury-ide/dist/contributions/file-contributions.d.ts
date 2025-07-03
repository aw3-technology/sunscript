import { CommandContribution, MenuContribution, KeybindingContribution } from '../core/contributions';
import { CommandRegistry } from '../core/command-registry';
import { MenuRegistry } from '../core/menu-registry';
import { KeybindingRegistry } from '../core/keybinding-registry';
import { EventBus } from '../core/event-bus';
export declare namespace FileCommands {
    const NEW_FILE = "file.new";
    const OPEN_FILE = "file.open";
    const SAVE_FILE = "file.save";
    const SAVE_AS = "file.saveAs";
}
export declare class FileCommandContribution implements CommandContribution {
    private eventBus;
    constructor(eventBus: EventBus);
    registerCommands(commands: CommandRegistry): void;
}
export declare class FileMenuContribution implements MenuContribution {
    registerMenus(menus: MenuRegistry): void;
}
export declare class FileKeybindingContribution implements KeybindingContribution {
    registerKeybindings(keybindings: KeybindingRegistry): void;
}
