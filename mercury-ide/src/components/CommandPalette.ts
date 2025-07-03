import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { CommandPaletteService, CommandPaletteItem, CommandPaletteState } from '../services/CommandPaletteService';

@injectable()
export class CommandPalette {
    private container: HTMLElement | null = null;
    private overlay: HTMLElement | null = null;
    private currentState: CommandPaletteState | null = null;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.CommandPaletteService) private commandPaletteService: CommandPaletteService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('commandPalette.stateChanged', (event) => {
            const { state } = event.data;
            this.currentState = state;
            this.updateUI();
        });
    }

    mount(parentContainer: HTMLElement): void {
        this.createOverlay(parentContainer);
    }

    private createOverlay(parentContainer: HTMLElement): void {
        this.overlay = document.createElement('div');
        this.overlay.className = 'command-palette-overlay';
        this.overlay.style.display = 'none';
        
        this.overlay.innerHTML = `
            <div class="command-palette-backdrop"></div>
            <div class="command-palette-container">
                <div class="command-palette">
                    <div class="command-palette-input-container">
                        <div class="command-palette-input-icon">⌘</div>
                        <input 
                            type="text" 
                            class="command-palette-input" 
                            id="command-palette-input"
                            placeholder="Type a command or search..."
                            autocomplete="off"
                            spellcheck="false"
                        >
                        <div class="command-palette-input-hint">
                            <span class="hint-key">↑↓</span> to navigate
                            <span class="hint-key">↵</span> to select
                            <span class="hint-key">esc</span> to cancel
                        </div>
                    </div>
                    
                    <div class="command-palette-results" id="command-palette-results">
                        <div class="command-palette-empty">
                            Start typing to search for commands...
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container = this.overlay.querySelector('.command-palette-container') as HTMLElement;
        this.attachEventListeners();
        
        parentContainer.appendChild(this.overlay);
    }

    private attachEventListeners(): void {
        if (!this.overlay) return;

        const input = this.overlay.querySelector('#command-palette-input') as HTMLInputElement;
        const backdrop = this.overlay.querySelector('.command-palette-backdrop') as HTMLElement;

        // Input events
        if (input) {
            input.addEventListener('input', (e) => {
                const query = (e.target as HTMLInputElement).value;
                this.commandPaletteService.updateQuery(query);
            });

            input.addEventListener('keydown', (e) => {
                // Let the service handle navigation keys
                if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                    // Service handles these
                    return;
                }
            });
        }

        // Backdrop click to close
        backdrop.addEventListener('click', () => {
            this.commandPaletteService.hide();
        });

        // Results click handling
        this.overlay.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const resultItem = target.closest('.command-result-item') as HTMLElement;
            
            if (resultItem) {
                const commandId = resultItem.dataset.commandId;
                if (commandId) {
                    const item = this.currentState?.filteredItems.find(item => item.id === commandId);
                    if (item) {
                        this.commandPaletteService.executeCommand(item);
                    }
                }
            }
        });

        // Handle mouse hover for selection
        this.overlay.addEventListener('mouseover', (e) => {
            const target = e.target as HTMLElement;
            const resultItem = target.closest('.command-result-item') as HTMLElement;
            
            if (resultItem) {
                const index = parseInt(resultItem.dataset.index || '0');
                this.updateSelectedIndex(index);
            }
        });
    }

    private updateUI(): void {
        if (!this.currentState || !this.overlay) return;

        const input = this.overlay.querySelector('#command-palette-input') as HTMLInputElement;
        const results = this.overlay.querySelector('#command-palette-results') as HTMLElement;

        if (this.currentState.isOpen) {
            this.show();
            if (input) {
                input.value = this.currentState.query;
                setTimeout(() => input.focus(), 0);
            }
        } else {
            this.hide();
        }

        if (results) {
            results.innerHTML = this.renderResults();
        }
    }

    private renderResults(): string {
        if (!this.currentState) return '';

        const { filteredItems, selectedIndex, query } = this.currentState;

        if (filteredItems.length === 0) {
            if (query.trim()) {
                return `
                    <div class="command-palette-empty">
                        <div class="empty-icon">🔍</div>
                        <div class="empty-message">No commands found</div>
                        <div class="empty-hint">Try a different search term</div>
                    </div>
                `;
            } else {
                return `
                    <div class="command-palette-empty">
                        <div class="empty-icon">⌨️</div>
                        <div class="empty-message">Type to search commands</div>
                        <div class="empty-hint">Use <kbd>Ctrl+Shift+P</kbd> to open command palette</div>
                    </div>
                `;
            }
        }

        const groupedItems = this.groupItemsByCategory(filteredItems);
        let html = '';

        for (const [category, items] of groupedItems.entries()) {
            if (category && items.length > 0) {
                html += `<div class="command-category-header">${category}</div>`;
            }

            items.forEach((item, index) => {
                const globalIndex = filteredItems.indexOf(item);
                const isSelected = globalIndex === selectedIndex;
                
                html += `
                    <div class="command-result-item ${isSelected ? 'selected' : ''}" 
                         data-command-id="${item.id}" 
                         data-index="${globalIndex}">
                        <div class="command-item-content">
                            <div class="command-item-main">
                                <div class="command-item-label">
                                    ${this.highlightMatches(item.label, query)}
                                </div>
                                ${item.description ? `
                                    <div class="command-item-description">
                                        ${this.highlightMatches(item.description, query)}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="command-item-meta">
                                ${item.keybinding ? `
                                    <div class="command-keybinding">
                                        ${this.renderKeybinding(item.keybinding)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        return html;
    }

    private groupItemsByCategory(items: CommandPaletteItem[]): Map<string, CommandPaletteItem[]> {
        const groups = new Map<string, CommandPaletteItem[]>();
        
        // Show recent commands first if no query
        if (!this.currentState?.query.trim()) {
            const recentItems = items.filter(item => 
                this.currentState?.recentCommands.includes(item.id)
            );
            
            if (recentItems.length > 0) {
                groups.set('Recently Used', recentItems);
            }
            
            // Group remaining items by category
            const nonRecentItems = items.filter(item => 
                !this.currentState?.recentCommands.includes(item.id)
            );
            
            for (const item of nonRecentItems) {
                const category = item.category || 'Other';
                if (!groups.has(category)) {
                    groups.set(category, []);
                }
                groups.get(category)!.push(item);
            }
        } else {
            // Group by category when searching
            for (const item of items) {
                const category = item.category || 'Other';
                if (!groups.has(category)) {
                    groups.set(category, []);
                }
                groups.get(category)!.push(item);
            }
        }
        
        return groups;
    }

    private highlightMatches(text: string, query: string): string {
        if (!query.trim()) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    private renderKeybinding(keybinding: string): string {
        return keybinding
            .split('+')
            .map(key => `<kbd class="key">${key}</kbd>`)
            .join('<span class="key-separator">+</span>');
    }

    private updateSelectedIndex(index: number): void {
        if (!this.currentState) return;
        
        // Update visual selection
        const items = this.overlay?.querySelectorAll('.command-result-item');
        items?.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // Scroll selected item into view
        const selectedItem = items?.[index] as HTMLElement;
        selectedItem?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }

    show(): void {
        if (this.overlay) {
            this.overlay.style.display = 'flex';
            document.body.classList.add('command-palette-open');
            
            // Animate in
            requestAnimationFrame(() => {
                this.overlay?.classList.add('show');
            });
        }
    }

    private hide(): void {
        if (this.overlay) {
            this.overlay.classList.remove('show');
            document.body.classList.remove('command-palette-open');
            
            // Hide after animation
            setTimeout(() => {
                if (this.overlay) {
                    this.overlay.style.display = 'none';
                }
            }, 200);
        }
    }

    // Public API
    toggle(): void {
        this.commandPaletteService.toggle();
    }

    focus(): void {
        const input = this.overlay?.querySelector('#command-palette-input') as HTMLInputElement;
        input?.focus();
    }
}