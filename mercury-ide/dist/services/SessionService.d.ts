import mongoose from 'mongoose';
import { ISession } from '../models/Session';
import { DatabaseService } from './DatabaseService';
export declare class SessionService {
    private databaseService;
    constructor(databaseService: DatabaseService);
    private generateSessionId;
    private parseBrowserInfo;
    createSession(sessionData: {
        userId: mongoose.Types.ObjectId;
        userAgent?: string;
        ipAddress?: string;
        expirationHours?: number;
    }): Promise<ISession>;
    findBySessionId(sessionId: string): Promise<ISession | null>;
    findByUser(userId: string | mongoose.Types.ObjectId): Promise<ISession[]>;
    updateActivity(sessionId: string): Promise<ISession | null>;
    openProject(sessionId: string, projectId: mongoose.Types.ObjectId): Promise<ISession | null>;
    closeProject(sessionId: string, projectId: mongoose.Types.ObjectId): Promise<ISession | null>;
    openFile(sessionId: string, projectId: mongoose.Types.ObjectId, filePath: string): Promise<ISession | null>;
    closeFile(sessionId: string, projectId: mongoose.Types.ObjectId, filePath: string): Promise<ISession | null>;
    updateCursorPosition(sessionId: string, projectId: mongoose.Types.ObjectId, filePath: string, line: number, column: number): Promise<ISession | null>;
    updateLayout(sessionId: string, layout: Partial<ISession['data']['layout']>): Promise<ISession | null>;
    updateEditorState(sessionId: string, editorState: Partial<ISession['data']['editorState']>): Promise<ISession | null>;
    extendSession(sessionId: string, hours?: number): Promise<ISession | null>;
    expireSession(sessionId: string): Promise<ISession | null>;
    expireUserSessions(userId: string | mongoose.Types.ObjectId): Promise<number>;
    cleanupExpiredSessions(): Promise<number>;
    getActiveSessions(): Promise<ISession[]>;
    getSessionStats(userId?: string | mongoose.Types.ObjectId): Promise<{
        total: number;
        active: number;
        recentlyActive: number;
        averageDuration: number;
        byBrowser: Record<string, number>;
        byPlatform: Record<string, number>;
    }>;
}
