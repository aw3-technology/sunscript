export interface IContribution {
    register(): void;
}

export interface ICommandContribution extends IContribution {
    registerCommands(): void;
}

export interface IMenuContribution extends IContribution {
    registerMenus(): void;
}

export interface IKeybindingContribution extends IContribution {
    registerKeybindings(): void;
}
