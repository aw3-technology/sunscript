export declare class Editor {
    private editor;
    private currentFile;
    private files;
    constructor();
    mount(container: HTMLElement): void;
    initialize(): void;
    getValue(): string;
    setValue(value: string): void;
    getCurrentFileName(): string;
    openFile(file: {
        name: string;
        content: string;
    }): void;
    newFile(): void;
    dispose(): void;
}
