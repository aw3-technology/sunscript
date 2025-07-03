import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';
import { QuickOpenService, QuickOpenItem, QuickOpenState } from '../services/QuickOpenService';

@injectable()
export class QuickOpen {
    private container: HTMLElement | null = null;
    private overlay: HTMLElement | null = null;
    private currentState: QuickOpenState | null = null;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.QuickOpenService) private quickOpenService: QuickOpenService
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('quickOpen.stateChanged', (event) => {
            const { state } = event.data;
            this.currentState = state;
            this.updateUI();
        });

        this.eventBus.on('quickOpen.indexingComplete', (event) => {
            const { fileCount } = event.data;
            this.showIndexingComplete(fileCount);
        });
    }

    mount(parentContainer: HTMLElement): void {
        this.createOverlay(parentContainer);
    }

    private createOverlay(parentContainer: HTMLElement): void {
        this.overlay = document.createElement('div');
        this.overlay.className = 'quick-open-overlay';
        this.overlay.style.display = 'none';
        
        this.overlay.innerHTML = `
            <div class="quick-open-backdrop"></div>
            <div class="quick-open-container">
                <div class="quick-open">
                    <div class="quick-open-input-container">
                        <div class="quick-open-input-icon">📁</div>
                        <input 
                            type="text" 
                            class="quick-open-input" 
                            id="quick-open-input"
                            placeholder="Search files by name..."
                            autocomplete="off"
                            spellcheck="false"
                        >
                        <div class="quick-open-input-hint">
                            <span class="hint-key">↑↓</span> to navigate
                            <span class="hint-key">↵</span> to open
                            <span class="hint-key">esc</span> to cancel
                        </div>
                    </div>
                    
                    <div class="quick-open-mode-switcher">
                        <button class="mode-btn active" data-mode="files">
                            📁 Files
                        </button>
                        <button class="mode-btn" data-mode="symbols">
                            🔍 Symbols
                        </button>
                        <button class="mode-btn" data-mode="commands">
                            ⌘ Commands
                        </button>
                    </div>
                    
                    <div class="quick-open-results" id="quick-open-results">
                        <div class="quick-open-empty">
                            <div class="empty-icon">📂</div>
                            <div class="empty-message">Start typing to search files...</div>
                            <div class="empty-hint">Use <kbd>Ctrl+P</kbd> to open Quick Open</div>
                        </div>
                    </div>
                    
                    <div class="quick-open-status" id="quick-open-status">
                        <div class="status-info">
                            <span class="file-count">0 files indexed</span>
                            <span class="status-separator">•</span>
                            <span class="results-count">0 results</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container = this.overlay.querySelector('.quick-open-container') as HTMLElement;
        this.attachEventListeners();
        
        parentContainer.appendChild(this.overlay);
    }

    private attachEventListeners(): void {
        if (!this.overlay) return;

        const input = this.overlay.querySelector('#quick-open-input') as HTMLInputElement;
        const backdrop = this.overlay.querySelector('.quick-open-backdrop') as HTMLElement;

        // Input events
        if (input) {
            input.addEventListener('input', (e) => {
                const query = (e.target as HTMLInputElement).value;
                this.quickOpenService.updateQuery(query);
            });

            input.addEventListener('keydown', (e) => {
                // Let the service handle navigation keys
                if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                    // Service handles these
                    return;
                }
            });
        }

        // Mode switcher
        this.overlay.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('mode-btn')) {
                const mode = target.dataset.mode as 'files' | 'symbols' | 'commands';
                this.switchMode(mode);
            }
        });

        // Backdrop click to close
        backdrop.addEventListener('click', () => {
            this.quickOpenService.hide();
        });

        // Results click handling
        this.overlay.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const resultItem = target.closest('.quick-open-result-item') as HTMLElement;
            
            if (resultItem) {
                const itemId = resultItem.dataset.itemId;
                if (itemId) {
                    const item = this.currentState?.filteredItems.find(item => item.id === itemId);
                    if (item) {
                        this.quickOpenService.openItem(item);
                    }
                }
            }
        });

        // Handle mouse hover for selection
        this.overlay.addEventListener('mouseover', (e) => {
            const target = e.target as HTMLElement;
            const resultItem = target.closest('.quick-open-result-item') as HTMLElement;
            
            if (resultItem) {
                const index = parseInt(resultItem.dataset.index || '0');
                this.updateSelectedIndex(index);
            }
        });
    }

    private switchMode(mode: 'files' | 'symbols' | 'commands'): void {
        // Update mode buttons
        this.overlay?.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        this.overlay?.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');
        
        // Update placeholder and icon
        const input = this.overlay?.querySelector('#quick-open-input') as HTMLInputElement;
        const icon = this.overlay?.querySelector('.quick-open-input-icon') as HTMLElement;
        
        if (input && icon) {
            switch (mode) {
                case 'files':
                    input.placeholder = 'Search files by name...';
                    icon.textContent = '📁';
                    break;
                case 'symbols':
                    input.placeholder = 'Search symbols...';
                    icon.textContent = '🔍';
                    break;
                case 'commands':
                    input.placeholder = 'Search commands...';
                    icon.textContent = '⌘';
                    break;
            }
        }
        
        // Show the quick open with new mode
        this.quickOpenService.show(mode);
    }

    private updateUI(): void {
        if (!this.currentState || !this.overlay) return;

        const input = this.overlay.querySelector('#quick-open-input') as HTMLInputElement;
        const results = this.overlay.querySelector('#quick-open-results') as HTMLElement;
        const status = this.overlay.querySelector('#quick-open-status') as HTMLElement;

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

        if (status) {
            this.updateStatus();
        }
    }

    private renderResults(): string {
        if (!this.currentState) return '';

        const { filteredItems, selectedIndex, query, mode } = this.currentState;

        if (filteredItems.length === 0) {
            if (query.trim()) {
                return `
                    <div class="quick-open-empty">
                        <div class="empty-icon">🔍</div>
                        <div class="empty-message">No ${mode} found</div>
                        <div class="empty-hint">Try a different search term</div>
                    </div>
                `;
            } else {
                return this.renderEmptyState();
            }
        }

        const groupedItems = this.groupItemsByType(filteredItems);
        let html = '';

        for (const [groupType, items] of groupedItems.entries()) {
            if (items.length === 0) continue;

            // Add group header
            const groupLabel = this.getGroupLabel(groupType);
            if (groupLabel && groupedItems.size > 1) {
                html += `<div class="quick-open-group-header">${groupLabel}</div>`;
            }

            items.forEach((item, index) => {
                const globalIndex = filteredItems.indexOf(item);
                const isSelected = globalIndex === selectedIndex;
                
                html += `
                    <div class="quick-open-result-item ${isSelected ? 'selected' : ''}" 
                         data-item-id="${item.id}" 
                         data-index="${globalIndex}">
                        <div class="result-item-content">
                            <div class="result-item-icon">
                                ${this.getItemIcon(item)}
                            </div>
                            <div class="result-item-main">
                                <div class="result-item-label">
                                    ${this.highlightMatches(item.label, query)}
                                </div>
                                ${item.description ? `
                                    <div class="result-item-description">
                                        ${this.highlightMatches(item.description, query)}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="result-item-meta">
                                ${item.detail ? `
                                    <div class="result-item-detail">${item.detail}</div>
                                ` : ''}
                                <div class="result-item-type">${this.getTypeLabel(item.type)}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        return html;
    }

    private renderEmptyState(): string {
        if (!this.currentState) return '';

        const { mode } = this.currentState;
        const isIndexing = this.quickOpenService.getIndexingStatus();

        if (isIndexing) {
            return `
                <div class="quick-open-empty">
                    <div class="empty-icon">⏳</div>
                    <div class="empty-message">Indexing workspace...</div>
                    <div class="empty-hint">Please wait while we scan your files</div>
                </div>
            `;
        }

        switch (mode) {
            case 'files':
                return `
                    <div class="quick-open-empty">
                        <div class="empty-icon">📂</div>
                        <div class="empty-message">Recent files</div>
                        <div class="empty-hint">Start typing to search all files</div>
                    </div>
                `;
            case 'symbols':
                return `
                    <div class="quick-open-empty">
                        <div class="empty-icon">🔍</div>
                        <div class="empty-message">Search symbols</div>
                        <div class="empty-hint">Type to search for functions, classes, variables...</div>
                    </div>
                `;
            case 'commands':
                return `
                    <div class="quick-open-empty">
                        <div class="empty-icon">⌘</div>
                        <div class="empty-message">Search commands</div>
                        <div class="empty-hint">Type to search for available commands</div>
                    </div>
                `;
            default:
                return '';
        }
    }

    private groupItemsByType(items: QuickOpenItem[]): Map<string, QuickOpenItem[]> {
        const groups = new Map<string, QuickOpenItem[]>();
        
        if (!this.currentState?.query.trim()) {
            // Group by type when no query
            const recent = items.filter(item => item.type === 'recent');
            const files = items.filter(item => item.type === 'file');
            const folders = items.filter(item => item.type === 'folder');
            
            if (recent.length > 0) groups.set('recent', recent);
            if (files.length > 0) groups.set('file', files);
            if (folders.length > 0) groups.set('folder', folders);
        } else {
            // Don't group when searching
            groups.set('all', items);
        }
        
        return groups;
    }

    private getGroupLabel(groupType: string): string {
        const labels = {
            'recent': 'Recently Opened',
            'file': 'Files',
            'folder': 'Folders',
            'symbol': 'Symbols',
            'command': 'Commands'
        };
        return labels[groupType as keyof typeof labels] || '';
    }

    private getItemIcon(item: QuickOpenItem): string {
        const iconMap = {
            'file': '📄',
            'folder': '📁',
            'recent': '🕒',
            'symbol': '🔤',
            'command': '⚡'
        };
        
        return iconMap[item.type] || '📄';
    }

    private getTypeLabel(type: string): string {
        const labels = {
            'file': 'File',
            'folder': 'Folder',
            'recent': 'Recent',
            'symbol': 'Symbol',
            'command': 'Command'
        };
        return labels[type as keyof typeof labels] || '';
    }

    private highlightMatches(text: string, query: string): string {
        if (!query.trim()) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    private updateSelectedIndex(index: number): void {
        if (!this.currentState) return;
        
        // Update visual selection
        const items = this.overlay?.querySelectorAll('.quick-open-result-item');
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

    private updateStatus(): void {
        if (!this.currentState) return;

        const statusElement = this.overlay?.querySelector('#quick-open-status') as HTMLElement;
        if (!statusElement) return;

        const allFiles = this.quickOpenService.getAllFiles();
        const filteredItems = this.currentState.filteredItems;

        statusElement.innerHTML = `
            <div class="status-info">
                <span class="file-count">${allFiles.length} files indexed</span>
                <span class="status-separator">•</span>
                <span class="results-count">${filteredItems.length} results</span>
                ${this.quickOpenService.getIndexingStatus() ? `
                    <span class="status-separator">•</span>
                    <span class="indexing-status">Indexing...</span>
                ` : ''}
            </div>
        `;
    }

    private showIndexingComplete(fileCount: number): void {
        if (this.currentState?.isOpen) {
            this.updateStatus();
        }
    }

    show(): void {
        if (this.overlay) {
            this.overlay.style.display = 'flex';
            document.body.classList.add('quick-open-open');
            
            // Animate in
            requestAnimationFrame(() => {
                this.overlay?.classList.add('show');
            });
        }
    }

    private hide(): void {
        if (this.overlay) {
            this.overlay.classList.remove('show');
            document.body.classList.remove('quick-open-open');
            
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
        this.quickOpenService.toggle();
    }

    focus(): void {
        const input = this.overlay?.querySelector('#quick-open-input') as HTMLInputElement;
        input?.focus();
    }
}