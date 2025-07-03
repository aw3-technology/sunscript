import { Command } from './command-registry';
import { Keybinding } from './keybinding-registry';
import { MenuNode } from './menu-registry';

export const CommandContribution = Symbol('CommandContribution');
export const MenuContribution = Symbol('MenuContribution');
export const KeybindingContribution = Symbol('KeybindingContribution');

export interface CommandContribution {
    registerCommands(commands: CommandRegistry): void;
}

export interface MenuContribution {
    registerMenus(menus: MenuRegistry): void;
}

export interface KeybindingContribution {
    registerKeybindings(keybindings: KeybindingRegistry): void;
}

// Re-export for convenience
import { CommandRegistry } from './command-registry';
import { MenuRegistry } from './menu-registry';
import { KeybindingRegistry } from './keybinding-registry';