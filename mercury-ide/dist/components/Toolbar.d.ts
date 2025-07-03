export declare class Toolbar {
    private container;
    private runCallback;
    private buildCallback;
    private newFileCallback;
    private openFileCallback;
    private saveFileCallback;
    mount(container: HTMLElement): void;
    private render;
    private attachEventListeners;
    onRun(callback: () => void): void;
    onBuild(callback: () => void): void;
    onNewFile(callback: () => void): void;
    onOpenFile(callback: () => void): void;
    onSaveFile(callback: () => void): void;
}
