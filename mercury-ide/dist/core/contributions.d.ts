export declare const CommandContribution: unique symbol;
export declare const MenuContribution: unique symbol;
export declare const KeybindingContribution: unique symbol;
export interface CommandContribution {
    registerCommands(commands: CommandRegistry): void;
}
export interface MenuContribution {
    registerMenus(menus: MenuRegistry): void;
}
export interface KeybindingContribution {
    registerKeybindings(keybindings: KeybindingRegistry): void;
}
import { CommandRegistry } from './command-registry';
import { MenuRegistry } from './menu-registry';
import { KeybindingRegistry } from './keybinding-registry';
