import { CommandRegistry } from '../core/command-registry';
import { MenuRegistry } from '../core/menu-registry';
import { KeybindingRegistry } from '../core/keybinding-registry';
import { ICommandContribution, IMenuContribution, IKeybindingContribution } from '../core/contribution-interfaces';
export declare class UICommandContribution implements ICommandContribution {
    private commandRegistry;
    constructor(commandRegistry: CommandRegistry);
    register(): void;
    registerCommands(): void;
}
export declare class UIMenuContribution implements IMenuContribution {
    private menuRegistry;
    constructor(menuRegistry: MenuRegistry);
    register(): void;
    registerMenus(): void;
}
export declare class UIKeybindingContribution implements IKeybindingContribution {
    private keybindingRegistry;
    constructor(keybindingRegistry: KeybindingRegistry);
    register(): void;
    registerKeybindings(): void;
}
