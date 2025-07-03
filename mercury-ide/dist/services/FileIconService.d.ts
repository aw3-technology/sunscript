import { EventBus } from '../core/event-bus';
export interface FileIconMapping {
    extension: string;
    icon: string;
    color?: string;
    description?: string;
}
export interface FolderIconMapping {
    folderName: string;
    icon: string;
    color?: string;
    description?: string;
}
export interface FileAssociation {
    extension: string;
    mimeType: string;
    languageId?: string;
    editorId?: string;
    isText: boolean;
    isBinary: boolean;
    canEdit: boolean;
    defaultApplication?: string;
}
export declare class FileIconService {
    private eventBus;
    private fileIconMappings;
    private folderIconMappings;
    private fileAssociations;
    private readonly DEFAULT_FILE_ICON;
    private readonly DEFAULT_FOLDER_ICON;
    private readonly OPEN_FOLDER_ICON;
    constructor(eventBus: EventBus);
    private initializeDefaultMappings;
    private initializeFileAssociations;
    private addFileIconMapping;
    private addFolderIconMapping;
    private addFileAssociation;
    getFileIcon(fileName: string): string;
    getFolderIcon(folderName: string, isOpen?: boolean): string;
    getFileIconColor(fileName: string): string | undefined;
    getFolderIconColor(folderName: string): string | undefined;
    getFileAssociation(fileName: string): FileAssociation | undefined;
    getLanguageId(fileName: string): string | undefined;
    getEditorId(fileName: string): string | undefined;
    getMimeType(fileName: string): string;
    canEditFile(fileName: string): boolean;
    isTextFile(fileName: string): boolean;
    isBinaryFile(fileName: string): boolean;
    addCustomFileIcon(extension: string, icon: string, color?: string, description?: string): void;
    addCustomFolderIcon(folderName: string, icon: string, color?: string, description?: string): void;
    addCustomFileAssociation(association: FileAssociation): void;
    removeFileIcon(extension: string): void;
    removeFolderIcon(folderName: string): void;
    removeFileAssociation(extension: string): void;
    setIconTheme(themeName: string): void;
    private getFileExtension;
    exportIconConfiguration(): any;
    importIconConfiguration(config: any): void;
    findFilesByIcon(icon: string): string[];
    findFoldersByIcon(icon: string): string[];
    getAvailableLanguages(): string[];
    getFileExtensionsByLanguage(languageId: string): string[];
}
