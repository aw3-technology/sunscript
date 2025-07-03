import { FileSystemService } from '../services/FileSystemService';
export declare class FileExplorer {
    private fileSystemService;
    private container;
    private fileSelectCallback;
    constructor(fileSystemService: FileSystemService);
    mount(container: HTMLElement): Promise<void>;
    private render;
    private renderFileTree;
    private renderFileItem;
    private attachEventListeners;
    onFileSelect(callback: (file: {
        name: string;
        content: string;
    }) => void): void;
    refresh(): void;
}
