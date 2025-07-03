export declare class OutputPanel {
    private container;
    private outputContent;
    mount(container: HTMLElement): void;
    private render;
    log(message: string): void;
    error(message: string): void;
    clear(): void;
    private scrollToBottom;
}
