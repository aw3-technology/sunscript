import mongoose, { Document, Model } from 'mongoose';
export interface IFile extends Document {
    _id: mongoose.Types.ObjectId;
    path: string;
    name: string;
    content: string;
    projectId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: 'file' | 'directory';
    mimeType?: string;
    encoding: 'utf8' | 'base64' | 'binary';
    size: number;
    metadata: {
        language?: string;
        lineCount?: number;
        charCount?: number;
        isExecutable?: boolean;
        permissions?: string;
    };
    version: {
        current: number;
        hash: string;
    };
    activity: {
        lastOpenedAt?: Date;
        lastEditedAt?: Date;
        editCount: number;
        openCount: number;
    };
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    updateContent(content: string, hash: string): Promise<IFile>;
    recordOpen(): Promise<IFile>;
    recordEdit(): Promise<IFile>;
    softDelete(): Promise<IFile>;
    restore(): Promise<IFile>;
}
interface IFileModel extends Model<IFile> {
    findByProject(projectId: mongoose.Types.ObjectId, includeDeleted?: boolean): Promise<IFile[]>;
    findByPath(projectId: mongoose.Types.ObjectId, path: string): Promise<IFile | null>;
    findByLanguage(language: string, projectId?: mongoose.Types.ObjectId): Promise<IFile[]>;
}
export declare const File: IFileModel;
export {};
