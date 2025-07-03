import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
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

@injectable()
export class WorkspaceService {
    private workspaceFolders: WorkspaceFolder[] = [];
    private workspaceConfiguration: WorkspaceConfiguration | null = null;
    private currentWorkspaceUri: string | null = null;
    private nextFolderId = 1;

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.on('workspace.addFolder', (event) => {
            const { folderPath } = event.data;
            this.addWorkspaceFolder(folderPath);
        });

        this.eventBus.on('workspace.removeFolder', (event) => {
            const { folderId } = event.data;
            this.removeWorkspaceFolder(folderId);
        });

        this.eventBus.on('workspace.open', (event) => {
            const { workspacePath } = event.data;
            this.openWorkspace(workspacePath);
        });
    }

    async openWorkspace(workspacePath: string): Promise<void> {
        try {
            this.currentWorkspaceUri = workspacePath;
            
            // Try to load workspace configuration
            const configPath = `${workspacePath}/.vscode/settings.json`;
            const workspaceConfigPath = `${workspacePath}/.sunscript/workspace.json`;
            
            // Initialize default configuration
            this.workspaceConfiguration = {
                folders: [],
                settings: {},
                extensions: [],
                tasks: [],
                launch: []
            };

            // Add the workspace folder as root
            await this.addWorkspaceFolder(workspacePath, true);

            this.eventBus.emit('workspace.opened', { 
                workspacePath, 
                configuration: this.workspaceConfiguration 
            });

        } catch (error) {
            this.eventBus.emit('workspace.openFailed', { workspacePath, error });
            throw error;
        }
    }

    async addWorkspaceFolder(folderPath: string, isRoot: boolean = false): Promise<string> {
        const folderId = `folder-${this.nextFolderId++}`;
        const folderName = this.getBaseName(folderPath);

        const folder: WorkspaceFolder = {
            id: folderId,
            name: folderName,
            uri: `file://${folderPath}`,
            path: folderPath,
            isRoot,
            index: this.workspaceFolders.length
        };

        this.workspaceFolders.push(folder);

        // Update workspace configuration
        if (this.workspaceConfiguration) {
            this.workspaceConfiguration.folders.push(folder);
        }

        this.eventBus.emit('workspace.folderAdded', { folder });
        return folderId;
    }

    removeWorkspaceFolder(folderId: string): void {
        const index = this.workspaceFolders.findIndex(f => f.id === folderId);
        if (index !== -1) {
            const folder = this.workspaceFolders[index];
            this.workspaceFolders.splice(index, 1);

            // Update indices
            this.workspaceFolders.forEach((f, i) => f.index = i);

            // Update workspace configuration
            if (this.workspaceConfiguration) {
                const configIndex = this.workspaceConfiguration.folders.findIndex(f => f.id === folderId);
                if (configIndex !== -1) {
                    this.workspaceConfiguration.folders.splice(configIndex, 1);
                }
            }

            this.eventBus.emit('workspace.folderRemoved', { folder });
        }
    }

    async getFiles(folderPath: string): Promise<FileInfo[]> {
        // Simulate file system access
        await this.delay(100);

        // Mock file structure for demonstration
        const mockFiles: FileInfo[] = [
            {
                name: 'src',
                path: `${folderPath}/src`,
                uri: `file://${folderPath}/src`,
                isDirectory: true,
                isFile: false,
                lastModified: new Date()
            },
            {
                name: 'main.sun',
                path: `${folderPath}/src/main.sun`,
                uri: `file://${folderPath}/src/main.sun`,
                isDirectory: false,
                isFile: true,
                size: 1024,
                extension: 'sun',
                mimeType: 'text/sunscript',
                lastModified: new Date(Date.now() - 3600000)
            },
            {
                name: 'utils.sun',
                path: `${folderPath}/src/utils.sun`,
                uri: `file://${folderPath}/src/utils.sun`,
                isDirectory: false,
                isFile: true,
                size: 512,
                extension: 'sun',
                mimeType: 'text/sunscript',
                lastModified: new Date(Date.now() - 7200000)
            },
            {
                name: 'tests',
                path: `${folderPath}/tests`,
                uri: `file://${folderPath}/tests`,
                isDirectory: true,
                isFile: false,
                lastModified: new Date(Date.now() - 86400000)
            },
            {
                name: 'package.json',
                path: `${folderPath}/package.json`,
                uri: `file://${folderPath}/package.json`,
                isDirectory: false,
                isFile: true,
                size: 256,
                extension: 'json',
                mimeType: 'application/json',
                lastModified: new Date(Date.now() - 172800000)
            },
            {
                name: 'README.md',
                path: `${folderPath}/README.md`,
                uri: `file://${folderPath}/README.md`,
                isDirectory: false,
                isFile: true,
                size: 2048,
                extension: 'md',
                mimeType: 'text/markdown',
                lastModified: new Date(Date.now() - 259200000)
            }
        ];

        return mockFiles;
    }

    async createFile(folderPath: string, fileName: string, content: string = ''): Promise<FileInfo> {
        const filePath = `${folderPath}/${fileName}`;
        const extension = this.getFileExtension(fileName);
        
        // Simulate file creation
        await this.delay(200);

        const fileInfo: FileInfo = {
            name: fileName,
            path: filePath,
            uri: `file://${filePath}`,
            isDirectory: false,
            isFile: true,
            size: content.length,
            extension,
            mimeType: this.getMimeType(extension),
            lastModified: new Date()
        };

        this.eventBus.emit('file.created', { file: fileInfo, content });
        return fileInfo;
    }

    async createFolder(parentPath: string, folderName: string): Promise<FileInfo> {
        const folderPath = `${parentPath}/${folderName}`;
        
        // Simulate folder creation
        await this.delay(100);

        const folderInfo: FileInfo = {
            name: folderName,
            path: folderPath,
            uri: `file://${folderPath}`,
            isDirectory: true,
            isFile: false,
            lastModified: new Date()
        };

        this.eventBus.emit('folder.created', { folder: folderInfo });
        return folderInfo;
    }

    async deleteFile(filePath: string): Promise<void> {
        // Simulate file deletion
        await this.delay(150);
        
        this.eventBus.emit('file.deleted', { filePath });
    }

    async renameFile(oldPath: string, newPath: string): Promise<void> {
        // Simulate file rename
        await this.delay(100);
        
        this.eventBus.emit('file.renamed', { oldPath, newPath });
    }

    async moveFile(sourcePath: string, targetPath: string): Promise<void> {
        // Simulate file move
        await this.delay(200);
        
        this.eventBus.emit('file.moved', { sourcePath, targetPath });
    }

    async copyFile(sourcePath: string, targetPath: string): Promise<void> {
        // Simulate file copy
        await this.delay(250);
        
        this.eventBus.emit('file.copied', { sourcePath, targetPath });
    }

    // Path utilities
    private getBaseName(path: string): string {
        return path.split('/').pop() || path;
    }

    private getFileExtension(fileName: string): string {
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
    }

    private getMimeType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            'sun': 'text/sunscript',
            'js': 'text/javascript',
            'ts': 'text/typescript',
            'json': 'application/json',
            'md': 'text/markdown',
            'txt': 'text/plain',
            'html': 'text/html',
            'css': 'text/css',
            'xml': 'text/xml',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml'
        };
        
        return mimeTypes[extension.toLowerCase()] || 'text/plain';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Getters
    getWorkspaceFolders(): WorkspaceFolder[] {
        return [...this.workspaceFolders];
    }

    getWorkspaceFolder(folderId: string): WorkspaceFolder | undefined {
        return this.workspaceFolders.find(f => f.id === folderId);
    }

    getRootFolder(): WorkspaceFolder | undefined {
        return this.workspaceFolders.find(f => f.isRoot);
    }

    getCurrentWorkspaceUri(): string | null {
        return this.currentWorkspaceUri;
    }

    getWorkspaceConfiguration(): WorkspaceConfiguration | null {
        return this.workspaceConfiguration;
    }

    // Workspace utilities
    isFileInWorkspace(filePath: string): boolean {
        return this.workspaceFolders.some(folder => 
            filePath.startsWith(folder.path)
        );
    }

    getRelativePath(filePath: string): string {
        const folder = this.workspaceFolders.find(f => 
            filePath.startsWith(f.path)
        );
        
        if (folder) {
            return filePath.substring(folder.path.length + 1);
        }
        
        return filePath;
    }

    resolveWorkspacePath(relativePath: string): string | null {
        const rootFolder = this.getRootFolder();
        if (rootFolder) {
            return `${rootFolder.path}/${relativePath}`;
        }
        return null;
    }
}