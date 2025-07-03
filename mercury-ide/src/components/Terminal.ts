import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { TerminalService, TerminalInstance } from '../services/TerminalService';
import { EventBus } from '../core/event-bus';

@injectable()
export class Terminal {
    private container: HTMLElement | null = null;
    private tabsContainer: HTMLElement | null = null;
    private terminalContainer: HTMLElement | null = null;
    private terminals: Map<string, HTMLElement> = new Map();

    constructor(
        @inject(TYPES.TerminalService) private terminalService: TerminalService,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('terminal.created', (event) => {
            const { terminalId, name } = event.data;
            this.addTerminalTab(terminalId, name);
        });

        this.eventBus.on('terminal.closed', (event) => {
            const { terminalId } = event.data;
            this.removeTerminalTab(terminalId);
        });

        this.eventBus.on('terminal.activated', (event) => {
            const { terminalId } = event.data;
            this.activateTerminalTab(terminalId);
        });

        this.eventBus.on('terminal.titleChanged', (event) => {
            const { terminalId, title } = event.data;
            this.updateTerminalTabTitle(terminalId, title);
        });
    }

    mount(container: HTMLElement): void {
        this.container = container;
        this.render();

        // Create a default terminal
        const defaultTerminalId = this.terminalService.createTerminal({});
        this.setupTerminal(defaultTerminalId);
    }

    private render(): void {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="terminal-panel">
                <div class="terminal-header">
                    <div class="terminal-tabs"></div>
                    <div class="terminal-actions">
                        <button class="terminal-action-btn" id="new-terminal" title="New Terminal">
                            <span>+</span>
                        </button>
                        <button class="terminal-action-btn" id="split-terminal" title="Split Terminal">
                            <span>⫽</span>
                        </button>
                        <button class="terminal-action-btn" id="kill-terminal" title="Kill Terminal">
                            <span>🗑️</span>
                        </button>
                    </div>
                </div>
                <div class="terminal-content">
                    <div class="terminal-container"></div>
                </div>
            </div>
        `;

        this.tabsContainer = this.container.querySelector('.terminal-tabs');
        this.terminalContainer = this.container.querySelector('.terminal-container');

        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        if (!this.container) return;

        // New terminal button
        const newTerminalBtn = this.container.querySelector('#new-terminal');
        newTerminalBtn?.addEventListener('click', () => {
            const terminalCount = this.terminalService.getTerminals().length;
            const terminalId = this.terminalService.createTerminal({});
            this.setupTerminal(terminalId);
        });

        // Split terminal button
        const splitTerminalBtn = this.container.querySelector('#split-terminal');
        splitTerminalBtn?.addEventListener('click', () => {
            // For now, just create a new terminal
            // In a full implementation, this would split the current terminal
            const terminalCount = this.terminalService.getTerminals().length;
            const terminalId = this.terminalService.createTerminal({});
            this.setupTerminal(terminalId);
        });

        // Kill terminal button
        const killTerminalBtn = this.container.querySelector('#kill-terminal');
        killTerminalBtn?.addEventListener('click', () => {
            const activeTerminal = this.terminalService.getActiveTerminal();
            if (activeTerminal) {
                this.terminalService.closeTerminal(activeTerminal.id);
            }
        });
    }

    private setupTerminal(terminalId: string): void {
        if (!this.terminalContainer) return;

        // Create terminal element
        const terminalElement = document.createElement('div');
        terminalElement.className = 'terminal-instance';
        terminalElement.dataset.terminalId = terminalId;
        terminalElement.style.display = 'none';

        this.terminalContainer.appendChild(terminalElement);
        this.terminals.set(terminalId, terminalElement);

        // Mount the terminal
        this.terminalService.mountTerminal(terminalId, terminalElement);

        // Activate this terminal
        this.terminalService.setActiveTerminal(terminalId);
    }

    private addTerminalTab(terminalId: string, name: string): void {
        if (!this.tabsContainer) return;

        const tab = document.createElement('div');
        tab.className = 'terminal-tab';
        tab.dataset.terminalId = terminalId;

        tab.innerHTML = `
            <div class="terminal-tab-content">
                <span class="terminal-tab-icon">▶️</span>
                <span class="terminal-tab-title">${name}</span>
                <span class="terminal-tab-close">×</span>
            </div>
        `;

        // Tab click handler
        tab.addEventListener('click', (e) => {
            if (!(e.target as HTMLElement).classList.contains('terminal-tab-close')) {
                this.terminalService.setActiveTerminal(terminalId);
            }
        });

        // Close button handler
        const closeBtn = tab.querySelector('.terminal-tab-close');
        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.terminalService.closeTerminal(terminalId);
        });

        this.tabsContainer.appendChild(tab);
    }

    private removeTerminalTab(terminalId: string): void {
        // Remove tab
        const tab = this.tabsContainer?.querySelector(`[data-terminal-id="${terminalId}"]`);
        tab?.remove();

        // Remove terminal element
        const terminalElement = this.terminals.get(terminalId);
        if (terminalElement) {
            terminalElement.remove();
            this.terminals.delete(terminalId);
        }

        // If no terminals left, hide the panel or create a new one
        if (this.terminals.size === 0) {
            this.eventBus.emit('terminal.allClosed');
        }
    }

    private activateTerminalTab(terminalId: string): void {
        // Deactivate all tabs
        this.tabsContainer?.querySelectorAll('.terminal-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Hide all terminal instances
        this.terminals.forEach(element => {
            element.style.display = 'none';
        });

        // Activate the selected tab
        const tab = this.tabsContainer?.querySelector(`[data-terminal-id="${terminalId}"]`);
        tab?.classList.add('active');

        // Show the selected terminal
        const terminalElement = this.terminals.get(terminalId);
        if (terminalElement) {
            terminalElement.style.display = 'block';
        }

        // Resize the terminal to fit
        setTimeout(() => {
            this.terminalService.resizeTerminal(terminalId);
        }, 100);
    }

    private updateTerminalTabTitle(terminalId: string, title: string): void {
        const tab = this.tabsContainer?.querySelector(`[data-terminal-id="${terminalId}"]`);
        const titleElement = tab?.querySelector('.terminal-tab-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    focus(): void {
        const activeTerminal = this.terminalService.getActiveTerminal();
        if (activeTerminal) {
            activeTerminal.terminal.focus();
        }
    }

    resize(): void {
        const activeTerminal = this.terminalService.getActiveTerminal();
        if (activeTerminal) {
            this.terminalService.resizeTerminal(activeTerminal.id);
        }
    }
}