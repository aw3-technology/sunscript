import { CommandContribution, MenuContribution, KeybindingContribution } from './contributions';
import { CommandRegistry } from './command-registry';
import { MenuRegistry } from './menu-registry';
import { KeybindingRegistry } from './keybinding-registry';
export declare class ContributionLoader {
    private commandRegistry;
    private menuRegistry;
    private keybindingRegistry;
    private commandContributions;
    private menuContributions;
    private keybindingContributions;
    constructor(commandRegistry: CommandRegistry, menuRegistry: MenuRegistry, keybindingRegistry: KeybindingRegistry, commandContributions: CommandContribution[], menuContributions: MenuContribution[], keybindingContributions: KeybindingContribution[]);
    load(): void;
}
