import mongoose from 'mongoose';
import { IFile } from '../models/File';
import { DatabaseService } from './DatabaseService';
export declare class FileService {
    private databaseService;
    constructor(databaseService: DatabaseService);
    private generateHash;
    private detectLanguage;
    private getMimeType;
    createFile(fileData: {
        path: string;
        content: string;
        projectId: mongoose.Types.ObjectId;
        userId: mongoose.Types.ObjectId;
        type?: 'file' | 'directory';
        encoding?: 'utf8' | 'base64' | 'binary';
    }): Promise<IFile>;
    findById(id: string | mongoose.Types.ObjectId): Promise<IFile | null>;
    findByPath(projectId: string | mongoose.Types.ObjectId, path: string): Promise<IFile | null>;
    findByProject(projectId: string | mongoose.Types.ObjectId, includeDeleted?: boolean): Promise<IFile[]>;
    findByLanguage(language: string, projectId?: string | mongoose.Types.ObjectId): Promise<IFile[]>;
    updateContent(id: string | mongoose.Types.ObjectId, content: string): Promise<IFile | null>;
    updateMetadata(id: string | mongoose.Types.ObjectId, metadata: Partial<IFile['metadata']>): Promise<IFile | null>;
    recordOpen(id: string | mongoose.Types.ObjectId): Promise<IFile | null>;
    moveFile(id: string | mongoose.Types.ObjectId, newPath: string): Promise<IFile | null>;
    copyFile(id: string | mongoose.Types.ObjectId, newPath: string, projectId?: mongoose.Types.ObjectId): Promise<IFile | null>;
    softDelete(id: string | mongoose.Types.ObjectId): Promise<IFile | null>;
    restore(id: string | mongoose.Types.ObjectId): Promise<IFile | null>;
    searchFiles(projectId: string | mongoose.Types.ObjectId, query: string, options?: {
        includeContent?: boolean;
        fileTypes?: string[];
        limit?: number;
    }): Promise<IFile[]>;
    getFilesByType(projectId: string | mongoose.Types.ObjectId, fileType: string): Promise<IFile[]>;
    getRecentFiles(userId: string | mongoose.Types.ObjectId, limit?: number): Promise<IFile[]>;
    deleteFile(id: string | mongoose.Types.ObjectId): Promise<boolean>;
    getFileStats(projectId?: string | mongoose.Types.ObjectId): Promise<{
        total: number;
        byLanguage: Record<string, number>;
        totalSize: number;
        averageSize: number;
        recentlyEdited: number;
    }>;
}
