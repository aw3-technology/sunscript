import mongoose from 'mongoose';
import { IUser } from '../models/User';
import { DatabaseService } from './DatabaseService';
export declare class UserService {
    private databaseService;
    constructor(databaseService: DatabaseService);
    createUser(userData: {
        username: string;
        email: string;
        displayName?: string;
        avatar?: string;
    }): Promise<IUser>;
    findById(id: string | mongoose.Types.ObjectId): Promise<IUser | null>;
    findByEmail(email: string): Promise<IUser | null>;
    findByUsername(username: string): Promise<IUser | null>;
    updateUser(id: string | mongoose.Types.ObjectId, updates: Partial<IUser>): Promise<IUser | null>;
    updatePreferences(id: string | mongoose.Types.ObjectId, preferences: Partial<IUser['preferences']>): Promise<IUser | null>;
    updateAISettings(id: string | mongoose.Types.ObjectId, aiSettings: Partial<IUser['aiSettings']>): Promise<IUser | null>;
    addRecentFile(id: string | mongoose.Types.ObjectId, projectId: mongoose.Types.ObjectId, filePath: string): Promise<IUser | null>;
    addRecentProject(id: string | mongoose.Types.ObjectId, projectId: mongoose.Types.ObjectId): Promise<IUser | null>;
    updateLastLogin(id: string | mongoose.Types.ObjectId): Promise<IUser | null>;
    deactivateUser(id: string | mongoose.Types.ObjectId): Promise<IUser | null>;
    reactivateUser(id: string | mongoose.Types.ObjectId): Promise<IUser | null>;
    getAllUsers(options?: {
        limit?: number;
        offset?: number;
        activeOnly?: boolean;
    }): Promise<{
        users: IUser[];
        total: number;
    }>;
    searchUsers(query: string, limit?: number): Promise<IUser[]>;
    deleteUser(id: string | mongoose.Types.ObjectId): Promise<boolean>;
    getUserStats(): Promise<{
        total: number;
        active: number;
        recentlyActive: number;
        newThisWeek: number;
    }>;
}
