import { EventBus } from '../core/event-bus';
export interface WorkspaceFolder {
    id: string;
    name: string;
    uri: string;
    path: string;
    isRoot: boolean;
    index: number;
}
export interface WorkspaceConfiguration {
    folders: WorkspaceFolder[];
    settings: Record<string, any>;
    extensions: string[];
    tasks: any[];
    launch: any[];
}
export interface FileInfo {
    name: string;
    path: string;
    uri: string;
    isDirectory: boolean;
    isFile: boolean;
    size?: number;
    lastModified?: Date;
    extension?: string;
    mimeType?: string;
}
export declare class WorkspaceService {
    private eventBus;
    private workspaceFolders;
    private workspaceConfiguration;
    private currentWorkspaceUri;
    private nextFolderId;
    constructor(eventBus: EventBus);
    private setupEventListeners;
    openWorkspace(workspacePath: string): Promise<void>;
    addWorkspaceFolder(folderPath: string, isRoot?: boolean): Promise<string>;
    removeWorkspaceFolder(folderId: string): void;
    getFiles(folderPath: string): Promise<FileInfo[]>;
    createFile(folderPath: string, fileName: string, content?: string): Promise<FileInfo>;
    createFolder(parentPath: string, folderName: string): Promise<FileInfo>;
    deleteFile(filePath: string): Promise<void>;
    renameFile(oldPath: string, newPath: string): Promise<void>;
    moveFile(sourcePath: string, targetPath: string): Promise<void>;
    copyFile(sourcePath: string, targetPath: string): Promise<void>;
    private getBaseName;
    private getFileExtension;
    private getMimeType;
    private delay;
    getWorkspaceFolders(): WorkspaceFolder[];
    getWorkspaceFolder(folderId: string): WorkspaceFolder | undefined;
    getRootFolder(): WorkspaceFolder | undefined;
    getCurrentWorkspaceUri(): string | null;
    getWorkspaceConfiguration(): WorkspaceConfiguration | null;
    isFileInWorkspace(filePath: string): boolean;
    getRelativePath(filePath: string): string;
    resolveWorkspacePath(relativePath: string): string | null;
}
