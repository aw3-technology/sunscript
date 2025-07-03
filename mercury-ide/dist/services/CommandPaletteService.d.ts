import { EventBus } from '../core/event-bus';
import { CommandRegistry, Command } from '../core/command-registry';
export interface CommandPaletteItem {
    id: string;
    label: string;
    description?: string;
    category?: string;
    command: Command;
    keybinding?: string;
    when?: string;
    sortText?: string;
}
export interface CommandPaletteState {
    isOpen: boolean;
    query: string;
    selectedIndex: number;
    filteredItems: CommandPaletteItem[];
    recentCommands: string[];
}
export declare class CommandPaletteService {
    private eventBus;
    private commandRegistry;
    private state;
    private allItems;
    private readonly MAX_RECENT_COMMANDS;
    constructor(eventBus: EventBus, commandRegistry: CommandRegistry);
    private setupEventListeners;
    private buildCommandPaletteItems;
    private getCommandKeybinding;
    toggle(): void;
    show(): void;
    hide(): void;
    updateQuery(query: string): void;
    selectNext(): void;
    selectPrevious(): void;
    executeSelected(): void;
    executeCommand(item: CommandPaletteItem): void;
    private filterItems;
    private calculateMatchScore;
    private fuzzyMatch;
    private getRecentCommandItems;
    private addToRecentCommands;
    private handleKeydown;
    getState(): CommandPaletteState;
    getAllItems(): CommandPaletteItem[];
    getFilteredItems(): CommandPaletteItem[];
    isOpen(): boolean;
}
