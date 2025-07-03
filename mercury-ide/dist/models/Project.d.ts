import mongoose, { Document, Model } from 'mongoose';
export interface IProject extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    userId: mongoose.Types.ObjectId;
    type: 'sunscript' | 'typescript' | 'javascript' | 'other';
    settings: {
        mainFile?: string;
        buildCommand?: string;
        runCommand?: string;
        outputDir?: string;
        sourceDir?: string;
        dependencies?: string[];
    };
    structure: {
        root: string;
        files: Array<{
            path: string;
            type: 'file' | 'directory';
            size?: number;
            lastModified?: Date;
        }>;
    };
    metadata: {
        version?: string;
        author?: string;
        license?: string;
        repository?: string;
        tags?: string[];
    };
    collaboration: {
        isPublic: boolean;
        allowedUsers: mongoose.Types.ObjectId[];
        permissions: {
            userId: mongoose.Types.ObjectId;
            role: 'owner' | 'editor' | 'viewer';
            grantedAt: Date;
        }[];
    };
    activity: {
        lastOpenedAt?: Date;
        lastEditedAt?: Date;
        totalEdits: number;
        openCount: number;
    };
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    addFile(filePath: string, type: 'file' | 'directory', size?: number): Promise<IProject>;
    removeFile(filePath: string): Promise<IProject>;
    recordOpen(): Promise<IProject>;
    softDelete(): Promise<IProject>;
    restore(): Promise<IProject>;
}
interface IProjectModel extends Model<IProject> {
    findByUser(userId: mongoose.Types.ObjectId, includeDeleted?: boolean): Promise<IProject[]>;
    findPublic(): Promise<IProject[]>;
}
export declare const Project: IProjectModel;
export {};
