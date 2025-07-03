import { OutputChannelsService } from '../services/OutputChannelsService';
import { EventBus } from '../core/event-bus';
export declare class OutputChannels {
    private outputChannelsService;
    private eventBus;
    private container;
    private channelSelector;
    private outputContent;
    private searchInput;
    constructor(outputChannelsService: OutputChannelsService, eventBus: EventBus);
    private setupEventListeners;
    mount(container: HTMLElement): void;
    private render;
    private attachEventListeners;
    private updateChannelSelector;
    private refreshOutput;
    private clearOutput;
    private appendLineToOutput;
    private scrollToBottom;
    private performSearch;
    private clearSearchHighlights;
    private highlightText;
    private escapeHtml;
    show(): void;
    hide(): void;
    focusSearch(): void;
}
