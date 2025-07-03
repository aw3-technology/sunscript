import mongoose, { Document, Model } from 'mongoose';
export interface ISession extends Document {
    _id: mongoose.Types.ObjectId;
    sessionId: string;
    userId: mongoose.Types.ObjectId;
    data: {
        openProjects: mongoose.Types.ObjectId[];
        openFiles: Array<{
            projectId: mongoose.Types.ObjectId;
            filePath: string;
            cursorPosition?: {
                line: number;
                column: number;
            };
            scrollPosition?: number;
        }>;
        activeProject?: mongoose.Types.ObjectId;
        activeFile?: {
            projectId: mongoose.Types.ObjectId;
            filePath: string;
        };
        layout: {
            sidebarVisible: boolean;
            terminalVisible: boolean;
            panelSizes: {
                sidebar: number;
                editor: number;
                terminal: number;
            };
        };
        editorState: {
            theme: string;
            fontSize: number;
            wordWrap: boolean;
            minimap: boolean;
        };
    };
    metadata: {
        userAgent?: string;
        ipAddress?: string;
        browserInfo?: {
            name: string;
            version: string;
            platform: string;
        };
    };
    activity: {
        startedAt: Date;
        lastActivityAt: Date;
        totalDuration: number;
        activityCount: number;
    };
    expiresAt: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    updateActivity(): Promise<ISession>;
    openFile(projectId: mongoose.Types.ObjectId, filePath: string): Promise<ISession>;
    closeFile(projectId: mongoose.Types.ObjectId, filePath: string): Promise<ISession>;
    updateCursorPosition(projectId: mongoose.Types.ObjectId, filePath: string, line: number, column: number): Promise<ISession>;
    expire(): Promise<ISession>;
    extend(hours?: number): Promise<ISession>;
}
interface ISessionModel extends Model<ISession> {
    findByUser(userId: mongoose.Types.ObjectId): Promise<ISession[]>;
    findActiveSession(sessionId: string): Promise<ISession | null>;
    cleanupExpired(): Promise<any>;
}
export declare const Session: ISessionModel;
export {};
