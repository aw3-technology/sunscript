import mongoose from 'mongoose';
import { IProject } from '../models/Project';
import { DatabaseService } from './DatabaseService';
export declare class ProjectService {
    private databaseService;
    constructor(databaseService: DatabaseService);
    createProject(projectData: {
        name: string;
        description?: string;
        userId: mongoose.Types.ObjectId;
        type?: 'sunscript' | 'typescript' | 'javascript' | 'other';
        settings?: Partial<IProject['settings']>;
    }): Promise<IProject>;
    findById(id: string | mongoose.Types.ObjectId): Promise<IProject | null>;
    findByUser(userId: string | mongoose.Types.ObjectId, includeDeleted?: boolean): Promise<IProject[]>;
    findPublicProjects(): Promise<IProject[]>;
    updateProject(id: string | mongoose.Types.ObjectId, updates: Partial<IProject>): Promise<IProject | null>;
    updateSettings(id: string | mongoose.Types.ObjectId, settings: Partial<IProject['settings']>): Promise<IProject | null>;
    updateMetadata(id: string | mongoose.Types.ObjectId, metadata: Partial<IProject['metadata']>): Promise<IProject | null>;
    addFile(id: string | mongoose.Types.ObjectId, filePath: string, type: 'file' | 'directory', size?: number): Promise<IProject | null>;
    removeFile(id: string | mongoose.Types.ObjectId, filePath: string): Promise<IProject | null>;
    recordOpen(id: string | mongoose.Types.ObjectId): Promise<IProject | null>;
    addCollaborator(id: string | mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, role: 'editor' | 'viewer'): Promise<IProject | null>;
    removeCollaborator(id: string | mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<IProject | null>;
    setPublic(id: string | mongoose.Types.ObjectId, isPublic: boolean): Promise<IProject | null>;
    softDelete(id: string | mongoose.Types.ObjectId): Promise<IProject | null>;
    restore(id: string | mongoose.Types.ObjectId): Promise<IProject | null>;
    searchProjects(userId: string | mongoose.Types.ObjectId, query: string, limit?: number): Promise<IProject[]>;
    getProjectsByType(type: 'sunscript' | 'typescript' | 'javascript' | 'other', userId?: string | mongoose.Types.ObjectId): Promise<IProject[]>;
    getRecentProjects(userId: string | mongoose.Types.ObjectId, limit?: number): Promise<IProject[]>;
    deleteProject(id: string | mongoose.Types.ObjectId): Promise<boolean>;
    getProjectStats(userId?: string | mongoose.Types.ObjectId): Promise<{
        total: number;
        byType: Record<string, number>;
        public: number;
        private: number;
        recentlyActive: number;
    }>;
}
