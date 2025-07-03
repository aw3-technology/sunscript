import { injectable, inject, multiInject } from 'inversify';
import { TYPES } from './types';
import { CommandContribution, MenuContribution, KeybindingContribution } from './contributions';
import { CommandRegistry } from './command-registry';
import { MenuRegistry } from './menu-registry';
import { KeybindingRegistry } from './keybinding-registry';

@injectable()
export class ContributionLoader {
    constructor(
        @inject(TYPES.CommandRegistry) private commandRegistry: CommandRegistry,
        @inject(TYPES.MenuRegistry) private menuRegistry: MenuRegistry,
        @inject(TYPES.KeybindingRegistry) private keybindingRegistry: KeybindingRegistry,
        @multiInject(TYPES.CommandContribution) private commandContributions: CommandContribution[],
        @multiInject(TYPES.MenuContribution) private menuContributions: MenuContribution[],
        @multiInject(TYPES.KeybindingContribution) private keybindingContributions: KeybindingContribution[]
    ) {}
    
    load(): void {
        // Load command contributions
        for (const contribution of this.commandContributions) {
            contribution.registerCommands(this.commandRegistry);
        }
        
        // Load menu contributions
        for (const contribution of this.menuContributions) {
            contribution.registerMenus(this.menuRegistry);
        }
        
        // Load keybinding contributions
        for (const contribution of this.keybindingContributions) {
            contribution.registerKeybindings(this.keybindingRegistry);
        }
    }
}