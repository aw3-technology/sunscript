export interface FileItem {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size?: number;
    lastModified?: Date;
    children?: FileItem[];
}
export interface CreateProjectOptions {
    name: string;
    path: string;
    template?: 'empty' | 'todo-app' | 'basic';
}
export declare class FileSystemService {
    private currentWorkspacePath;
    private watchers;
    constructor();
    openWorkspace(workspacePath: string): Promise<FileItem[]>;
    getCurrentWorkspace(): string | null;
    loadFile(filePath: string): Promise<string>;
    saveFile(filePath: string, content: string): Promise<void>;
    deleteFile(filePath: string): Promise<void>;
    createFile(filePath: string, content?: string): Promise<void>;
    createFolder(folderPath: string): Promise<void>;
    moveFile(fromPath: string, toPath: string): Promise<void>;
    copyFile(fromPath: string, toPath: string): Promise<void>;
    readDirectory(dirPath: string): Promise<Array<{
        name: string;
        type: 'file' | 'folder';
        size?: number;
        lastModified?: Date;
    }>>;
    buildFileTree(dirPath: string, maxDepth?: number, currentDepth?: number): Promise<FileItem[]>;
    getFiles(): Promise<FileItem[]>;
    createProject(options: CreateProjectOptions): Promise<void>;
    private createProjectTemplate;
    private createEmptyProject;
    private createBasicProject;
    private createTodoAppProject;
    private resolvePath;
    private shouldIgnoreFile;
    watchFile(filePath: string, callback: (event: 'change' | 'rename', filename: string) => void): Promise<void>;
    unwatchFile(filePath: string): void;
    dispose(): void;
}
