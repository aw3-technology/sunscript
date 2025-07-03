import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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

@injectable()
export class CommandPaletteService {
    private state: CommandPaletteState = {
        isOpen: false,
        query: '',
        selectedIndex: 0,
        filteredItems: [],
        recentCommands: []
    };

    private allItems: CommandPaletteItem[] = [];
    private readonly MAX_RECENT_COMMANDS = 10;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.CommandRegistry) private commandRegistry: CommandRegistry
    ) {
        this.setupEventListeners();
        this.buildCommandPaletteItems();
    }

    private setupEventListeners(): void {
        this.eventBus.on('commandPalette.toggle', () => {
            this.toggle();
        });

        this.eventBus.on('commandPalette.show', () => {
            this.show();
        });

        this.eventBus.on('commandPalette.hide', () => {
            this.hide();
        });

        this.eventBus.on('command.registered', () => {
            this.buildCommandPaletteItems();
        });

        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.toggle();
            }
            
            if (this.state.isOpen) {
                this.handleKeydown(e);
            }
        });
    }

    private buildCommandPaletteItems(): void {
        this.allItems = [];
        const commands = this.commandRegistry.getCommands();

        for (const [id, command] of commands.entries()) {
            this.allItems.push({
                id: String(id),
                label: String(command.label || id),
                description: command.description,
                category: command.category || 'General',
                command,
                keybinding: this.getCommandKeybinding(String(id)),
                when: command.when,
                sortText: String(command.label?.toLowerCase() || id)
            });
        }

        // Sort by category, then by label
        this.allItems.sort((a, b) => {
            if (a.category !== b.category) {
                return (a.category || '').localeCompare(b.category || '');
            }
            return (a.sortText || '').localeCompare(b.sortText || '');
        });
    }

    private getCommandKeybinding(commandId: string): string | undefined {
        // This would integrate with the keybinding registry
        const commonKeybindings: Record<string, string> = {
            'file.new': 'Ctrl+N',
            'file.open': 'Ctrl+O',
            'file.save': 'Ctrl+S',
            'file.saveAs': 'Ctrl+Shift+S',
            'editor.action.formatDocument': 'Shift+Alt+F',
            'editor.action.find': 'Ctrl+F',
            'editor.action.replace': 'Ctrl+H',
            'workbench.action.quickOpen': 'Ctrl+P',
            'workbench.action.showCommands': 'Ctrl+Shift+P',
            'workbench.action.terminal.toggle': 'Ctrl+`',
            'workbench.action.toggleSidebar': 'Ctrl+B'
        };
        
        return commonKeybindings[commandId];
    }

    toggle(): void {
        if (this.state.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    show(): void {
        this.state.isOpen = true;
        this.state.query = '';
        this.state.selectedIndex = 0;
        this.filterItems('');
        
        this.eventBus.emit('commandPalette.stateChanged', {
            state: { ...this.state }
        });
    }

    hide(): void {
        this.state.isOpen = false;
        this.state.query = '';
        this.state.selectedIndex = 0;
        this.state.filteredItems = [];
        
        this.eventBus.emit('commandPalette.stateChanged', {
            state: { ...this.state }
        });
    }

    updateQuery(query: string): void {
        this.state.query = query;
        this.state.selectedIndex = 0;
        this.filterItems(query);
        
        this.eventBus.emit('commandPalette.stateChanged', {
            state: { ...this.state }
        });
    }

    selectNext(): void {
        if (this.state.filteredItems.length > 0) {
            this.state.selectedIndex = Math.min(
                this.state.selectedIndex + 1,
                this.state.filteredItems.length - 1
            );
            
            this.eventBus.emit('commandPalette.stateChanged', {
                state: { ...this.state }
            });
        }
    }

    selectPrevious(): void {
        if (this.state.filteredItems.length > 0) {
            this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, 0);
            
            this.eventBus.emit('commandPalette.stateChanged', {
                state: { ...this.state }
            });
        }
    }

    executeSelected(): void {
        const selectedItem = this.state.filteredItems[this.state.selectedIndex];
        if (selectedItem) {
            this.executeCommand(selectedItem);
        }
    }

    executeCommand(item: CommandPaletteItem): void {
        this.addToRecentCommands(item.id);
        this.hide();
        
        try {
            this.commandRegistry.executeCommand(item.id);
        } catch (error) {
            console.error(`Failed to execute command ${item.id}:`, error);
            this.eventBus.emit('notification.show', {
                type: 'error',
                message: `Failed to execute command: ${item.label}`,
                duration: 5000
            });
        }
    }

    private filterItems(query: string): void {
        if (!query.trim()) {
            // Show recent commands first when no query
            const recentItems = this.getRecentCommandItems();
            this.state.filteredItems = [
                ...recentItems,
                ...this.allItems.filter(item => !recentItems.find(recent => recent.id === item.id))
            ];
            return;
        }

        const lowerQuery = query.toLowerCase();
        const scored = this.allItems
            .map(item => ({
                item,
                score: this.calculateMatchScore(item, lowerQuery)
            }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score);

        this.state.filteredItems = scored.map(({ item }) => item);
    }

    private calculateMatchScore(item: CommandPaletteItem, query: string): number {
        const label = item.label.toLowerCase();
        const description = (item.description || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        
        let score = 0;
        
        // Exact match gets highest score
        if (label === query) {
            score += 1000;
        }
        
        // Label starts with query
        if (label.startsWith(query)) {
            score += 500;
        }
        
        // Label contains query
        if (label.includes(query)) {
            score += 200;
        }
        
        // Description contains query
        if (description.includes(query)) {
            score += 100;
        }
        
        // Category contains query
        if (category.includes(query)) {
            score += 50;
        }
        
        // Fuzzy matching
        if (this.fuzzyMatch(label, query)) {
            score += 25;
        }
        
        // Recent commands get bonus
        if (this.state.recentCommands.includes(item.id)) {
            const recentIndex = this.state.recentCommands.indexOf(item.id);
            score += (this.MAX_RECENT_COMMANDS - recentIndex) * 10;
        }
        
        return score;
    }

    private fuzzyMatch(text: string, query: string): boolean {
        let textIndex = 0;
        let queryIndex = 0;
        
        while (textIndex < text.length && queryIndex < query.length) {
            if (text[textIndex] === query[queryIndex]) {
                queryIndex++;
            }
            textIndex++;
        }
        
        return queryIndex === query.length;
    }

    private getRecentCommandItems(): CommandPaletteItem[] {
        return this.state.recentCommands
            .map(commandId => this.allItems.find(item => item.id === commandId))
            .filter((item): item is CommandPaletteItem => item !== undefined);
    }

    private addToRecentCommands(commandId: string): void {
        // Remove if already exists
        const index = this.state.recentCommands.indexOf(commandId);
        if (index !== -1) {
            this.state.recentCommands.splice(index, 1);
        }
        
        // Add to beginning
        this.state.recentCommands.unshift(commandId);
        
        // Keep only the most recent commands
        if (this.state.recentCommands.length > this.MAX_RECENT_COMMANDS) {
            this.state.recentCommands = this.state.recentCommands.slice(0, this.MAX_RECENT_COMMANDS);
        }
    }

    private handleKeydown(e: KeyboardEvent): void {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
                e.preventDefault();
                this.executeSelected();
                break;
            case 'Escape':
                e.preventDefault();
                this.hide();
                break;
        }
    }

    // Public API
    getState(): CommandPaletteState {
        return { ...this.state };
    }

    getAllItems(): CommandPaletteItem[] {
        return [...this.allItems];
    }

    getFilteredItems(): CommandPaletteItem[] {
        return [...this.state.filteredItems];
    }

    isOpen(): boolean {
        return this.state.isOpen;
    }
}