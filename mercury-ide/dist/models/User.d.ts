import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    username: string;
    email: string;
    displayName?: string;
    avatar?: string;
    preferences: {
        theme: 'light' | 'dark';
        fontSize: number;
        tabSize: number;
        wordWrap: boolean;
        minimap: boolean;
        lineNumbers: boolean;
        autoSave: boolean;
        autoSaveDelay: number;
    };
    recentFiles: Array<{
        projectId: mongoose.Types.ObjectId;
        filePath: string;
        lastOpened: Date;
    }>;
    recentProjects: Array<{
        projectId: mongoose.Types.ObjectId;
        lastOpened: Date;
    }>;
    aiSettings: {
        provider: 'anthropic' | 'openai' | 'local';
        apiKey?: string;
        model?: string;
        maxTokens?: number;
        temperature?: number;
    };
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    isActive: boolean;
    addRecentFile(projectId: mongoose.Types.ObjectId, filePath: string): Promise<IUser>;
    addRecentProject(projectId: mongoose.Types.ObjectId): Promise<IUser>;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
