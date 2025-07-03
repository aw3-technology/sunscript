import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { OutputChannelsService, OutputChannel, OutputLine } from '../services/OutputChannelsService';
import { EventBus } from '../core/event-bus';

@injectable()
export class OutputChannels {
    private container: HTMLElement | null = null;
    private channelSelector: HTMLSelectElement | null = null;
    private outputContent: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;

    constructor(
        @inject(TYPES.OutputChannelsService) private outputChannelsService: OutputChannelsService,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('outputChannel.created', () => {
            this.updateChannelSelector();
        });

        this.eventBus.on('outputChannel.activated', () => {
            this.refreshOutput();
        });

        this.eventBus.on('outputChannel.lineAdded', (event) => {
            const { channelId, line, isActiveChannel } = event.data;
            if (isActiveChannel) {
                this.appendLineToOutput(line);
            }
        });

        this.eventBus.on('outputChannel.cleared', (event) => {
            const { channelId } = event.data;
            const activeChannel = this.outputChannelsService.getActiveChannel();
            if (activeChannel && activeChannel.id === channelId) {
                this.clearOutput();
            }
        });

        this.eventBus.on('outputChannel.deleted', () => {
            this.updateChannelSelector();
            this.refreshOutput();
        });
    }

    mount(container: HTMLElement): void {
        this.container = container;
        this.render();
        this.updateChannelSelector();
        this.refreshOutput();
    }

    private render(): void {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="output-channels">
                <div class="output-header">
                    <div class="output-controls">
                        <select class="channel-selector">
                            <option value="">Select Channel</option>
                        </select>
                        <input type="text" class="output-search" placeholder="Search output...">
                    </div>
                    <div class="output-actions">
                        <button class="output-action-btn" id="clear-output" title="Clear Output">
                            <span>🗑️</span>
                        </button>
                        <button class="output-action-btn" id="scroll-lock" title="Toggle Scroll Lock">
                            <span>📌</span>
                        </button>
                        <button class="output-action-btn" id="word-wrap" title="Toggle Word Wrap">
                            <span>↩️</span>
                        </button>
                    </div>
                </div>
                <div class="output-content">
                    <div class="output-lines"></div>
                </div>
            </div>
        `;

        this.channelSelector = this.container.querySelector('.channel-selector');
        this.outputContent = this.container.querySelector('.output-lines');
        this.searchInput = this.container.querySelector('.output-search');

        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        if (!this.container) return;

        // Channel selector
        this.channelSelector?.addEventListener('change', (e) => {
            const channelId = (e.target as HTMLSelectElement).value;
            if (channelId) {
                this.outputChannelsService.setActiveChannel(channelId);
            }
        });

        // Search input
        this.searchInput?.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value;
            this.performSearch(query);
        });

        // Clear output button
        const clearBtn = this.container.querySelector('#clear-output');
        clearBtn?.addEventListener('click', () => {
            const activeChannel = this.outputChannelsService.getActiveChannel();
            if (activeChannel) {
                this.outputChannelsService.clear(activeChannel.id);
            }
        });

        // Scroll lock button
        const scrollLockBtn = this.container.querySelector('#scroll-lock');
        let scrollLocked = false;
        scrollLockBtn?.addEventListener('click', () => {
            scrollLocked = !scrollLocked;
            scrollLockBtn.classList.toggle('active', scrollLocked);
            if (!scrollLocked && this.outputContent) {
                this.scrollToBottom();
            }
        });

        // Word wrap button
        const wordWrapBtn = this.container.querySelector('#word-wrap');
        let wordWrapEnabled = false;
        wordWrapBtn?.addEventListener('click', () => {
            wordWrapEnabled = !wordWrapEnabled;
            wordWrapBtn.classList.toggle('active', wordWrapEnabled);
            if (this.outputContent) {
                this.outputContent.classList.toggle('word-wrap', wordWrapEnabled);
            }
        });
    }

    private updateChannelSelector(): void {
        if (!this.channelSelector) return;

        const channels = this.outputChannelsService.getChannels();
        const activeChannel = this.outputChannelsService.getActiveChannel();

        // Clear existing options
        this.channelSelector.innerHTML = '';

        // Add channels
        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            option.selected = activeChannel?.id === channel.id;
            this.channelSelector!.appendChild(option);
        });
    }

    private refreshOutput(): void {
        if (!this.outputContent) return;

        this.clearOutput();

        const activeChannel = this.outputChannelsService.getActiveChannel();
        if (!activeChannel) return;

        // Render all lines
        activeChannel.lines.forEach(line => {
            this.appendLineToOutput(line);
        });

        this.scrollToBottom();
    }

    private clearOutput(): void {
        if (this.outputContent) {
            this.outputContent.innerHTML = '';
        }
    }

    private appendLineToOutput(line: OutputLine): void {
        if (!this.outputContent) return;

        const lineElement = document.createElement('div');
        lineElement.className = `output-line output-${line.level}`;

        const timestamp = line.timestamp.toLocaleTimeString();
        const content = this.escapeHtml(line.content);

        lineElement.innerHTML = `
            <span class="output-timestamp">[${timestamp}]</span>
            <span class="output-level">[${line.level.toUpperCase()}]</span>
            <span class="output-text">${content}</span>
        `;

        this.outputContent.appendChild(lineElement);

        // Auto-scroll if not locked
        const scrollLockBtn = this.container?.querySelector('#scroll-lock');
        if (!scrollLockBtn?.classList.contains('active')) {
            this.scrollToBottom();
        }

        // Limit the number of lines displayed for performance
        const maxDisplayLines = 1000;
        while (this.outputContent.children.length > maxDisplayLines) {
            this.outputContent.removeChild(this.outputContent.firstChild!);
        }
    }

    private scrollToBottom(): void {
        if (this.outputContent) {
            this.outputContent.parentElement!.scrollTop = this.outputContent.parentElement!.scrollHeight;
        }
    }

    private performSearch(query: string): void {
        if (!this.outputContent || !query.trim()) {
            this.clearSearchHighlights();
            return;
        }

        const activeChannel = this.outputChannelsService.getActiveChannel();
        if (!activeChannel) return;

        // Clear previous highlights
        this.clearSearchHighlights();

        // Search and highlight matches
        const lines = this.outputContent.querySelectorAll('.output-line');
        lines.forEach((lineElement, index) => {
            const textElement = lineElement.querySelector('.output-text');
            if (textElement) {
                const text = textElement.textContent || '';
                if (text.toLowerCase().includes(query.toLowerCase())) {
                    lineElement.classList.add('search-match');
                    
                    // Highlight the matching text
                    const highlightedText = this.highlightText(text, query);
                    textElement.innerHTML = highlightedText;
                }
            }
        });
    }

    private clearSearchHighlights(): void {
        if (!this.outputContent) return;

        this.outputContent.querySelectorAll('.search-match').forEach(element => {
            element.classList.remove('search-match');
            
            // Restore original text
            const textElement = element.querySelector('.output-text');
            if (textElement) {
                const originalText = textElement.textContent || '';
                textElement.innerHTML = this.escapeHtml(originalText);
            }
        });
    }

    private highlightText(text: string, query: string): string {
        const escapedText = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public methods for external use
    show(): void {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    focusSearch(): void {
        this.searchInput?.focus();
    }
}