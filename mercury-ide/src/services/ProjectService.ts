import { injectable } from 'inversify';
import mongoose from 'mongoose';
import { Project, IProject } from '../models/Project';
import { DatabaseService } from './DatabaseService';

@injectable()
export class ProjectService {
  constructor(private databaseService: DatabaseService) {}

  async createProject(projectData: {
    name: string;
    description?: string;
    userId: mongoose.Types.ObjectId;
    type?: 'sunscript' | 'typescript' | 'javascript' | 'other';
    settings?: Partial<IProject['settings']>;
  }): Promise<IProject> {
    await this.databaseService.connect();
    
    const project = new Project({
      ...projectData,
      type: projectData.type || 'sunscript',
      settings: {
        outputDir: 'dist',
        sourceDir: 'src',
        ...projectData.settings,
      },
      structure: {
        root: '/',
        files: [],
      },
      metadata: {
        version: '1.0.0',
        license: 'MIT',
      },
      collaboration: {
        isPublic: false,
        allowedUsers: [],
        permissions: [{
          userId: projectData.userId,
          role: 'owner',
          grantedAt: new Date(),
        }],
      },
      activity: {
        totalEdits: 0,
        openCount: 0,
      },
    });
    
    return await project.save();
  }

  async findById(id: string | mongoose.Types.ObjectId): Promise<IProject | null> {
    await this.databaseService.connect();
    return await Project.findById(id).populate('userId', 'username email displayName');
  }

  async findByUser(
    userId: string | mongoose.Types.ObjectId,
    includeDeleted = false
  ): Promise<IProject[]> {
    await this.databaseService.connect();
    
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    return await Project.findByUser(userObjectId, includeDeleted);
  }

  async findPublicProjects(): Promise<IProject[]> {
    await this.databaseService.connect();
    const projects = await Project.findPublic();
    return await Promise.all(projects.map(async project => {
      await project.populate('userId', 'username displayName');
      return project;
    }));
  }

  async updateProject(
    id: string | mongoose.Types.ObjectId,
    updates: Partial<IProject>
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    return await Project.findByIdAndUpdate(
      id,
      { $set: updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  async updateSettings(
    id: string | mongoose.Types.ObjectId,
    settings: Partial<IProject['settings']>
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    return await Project.findByIdAndUpdate(
      id,
      { 
        $set: { 
          'settings': { ...settings },
          updatedAt: new Date() 
        } 
      },
      { new: true, runValidators: true }
    );
  }

  async updateMetadata(
    id: string | mongoose.Types.ObjectId,
    metadata: Partial<IProject['metadata']>
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    return await Project.findByIdAndUpdate(
      id,
      { 
        $set: { 
          'metadata': { ...metadata },
          updatedAt: new Date() 
        } 
      },
      { new: true, runValidators: true }
    );
  }

  async addFile(
    id: string | mongoose.Types.ObjectId,
    filePath: string,
    type: 'file' | 'directory',
    size?: number
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    const project = await Project.findById(id);
    if (!project) return null;
    
    await project.addFile(filePath, type, size);
    return project;
  }

  async removeFile(
    id: string | mongoose.Types.ObjectId,
    filePath: string
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    const project = await Project.findById(id);
    if (!project) return null;
    
    await project.removeFile(filePath);
    return project;
  }

  async recordOpen(
    id: string | mongoose.Types.ObjectId
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    const project = await Project.findById(id);
    if (!project) return null;
    
    await project.recordOpen();
    return project;
  }

  async addCollaborator(
    id: string | mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    role: 'editor' | 'viewer'
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    return await Project.findByIdAndUpdate(
      id,
      {
        $addToSet: {
          'collaboration.allowedUsers': userId,
          'collaboration.permissions': {
            userId,
            role,
            grantedAt: new Date(),
          },
        },
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  async removeCollaborator(
    id: string | mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    return await Project.findByIdAndUpdate(
      id,
      {
        $pull: {
          'collaboration.allowedUsers': userId,
          'collaboration.permissions': { userId },
        },
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  async setPublic(
    id: string | mongoose.Types.ObjectId,
    isPublic: boolean
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    return await Project.findByIdAndUpdate(
      id,
      { 
        'collaboration.isPublic': isPublic,
        updatedAt: new Date() 
      },
      { new: true }
    );
  }

  async softDelete(
    id: string | mongoose.Types.ObjectId
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    const project = await Project.findById(id);
    if (!project) return null;
    
    await project.softDelete();
    return project;
  }

  async restore(
    id: string | mongoose.Types.ObjectId
  ): Promise<IProject | null> {
    await this.databaseService.connect();
    
    const project = await Project.findById(id);
    if (!project) return null;
    
    await project.restore();
    return project;
  }

  async searchProjects(
    userId: string | mongoose.Types.ObjectId,
    query: string,
    limit = 20
  ): Promise<IProject[]> {
    await this.databaseService.connect();
    
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const searchRegex = new RegExp(query, 'i');
    
    return await Project.find({
      $and: [
        {
          $or: [
            { userId: userObjectId },
            { 'collaboration.allowedUsers': userObjectId },
            { 'collaboration.isPublic': true }
          ]
        },
        { isDeleted: false },
        {
          $or: [
            { name: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            { 'metadata.tags': { $in: [searchRegex] } }
          ]
        }
      ]
    })
    .limit(limit)
    .sort({ updatedAt: -1 })
    .populate('userId', 'username displayName');
  }

  async getProjectsByType(
    type: 'sunscript' | 'typescript' | 'javascript' | 'other',
    userId?: string | mongoose.Types.ObjectId
  ): Promise<IProject[]> {
    await this.databaseService.connect();
    
    const filter: any = { type, isDeleted: false };
    
    if (userId) {
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
      filter.$or = [
        { userId: userObjectId },
        { 'collaboration.allowedUsers': userObjectId },
        { 'collaboration.isPublic': true }
      ];
    } else {
      filter['collaboration.isPublic'] = true;
    }
    
    return await Project.find(filter)
      .sort({ updatedAt: -1 })
      .populate('userId', 'username displayName');
  }

  async getRecentProjects(
    userId: string | mongoose.Types.ObjectId,
    limit = 10
  ): Promise<IProject[]> {
    await this.databaseService.connect();
    
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    return await Project.find({
      $or: [
        { userId: userObjectId },
        { 'collaboration.allowedUsers': userObjectId }
      ],
      isDeleted: false,
      'activity.lastOpenedAt': { $exists: true }
    })
    .sort({ 'activity.lastOpenedAt': -1 })
    .limit(limit)
    .populate('userId', 'username displayName');
  }

  async deleteProject(id: string | mongoose.Types.ObjectId): Promise<boolean> {
    await this.databaseService.connect();
    
    const result = await Project.findByIdAndDelete(id);
    return result !== null;
  }

  async getProjectStats(userId?: string | mongoose.Types.ObjectId): Promise<{
    total: number;
    byType: Record<string, number>;
    public: number;
    private: number;
    recentlyActive: number;
  }> {
    await this.databaseService.connect();
    
    const filter: any = { isDeleted: false };
    if (userId) {
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
      filter.userId = userObjectId;
    }
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [total, byType, publicCount, recentlyActive] = await Promise.all([
      Project.countDocuments(filter),
      Project.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Project.countDocuments({ ...filter, 'collaboration.isPublic': true }),
      Project.countDocuments({ 
        ...filter, 
        'activity.lastOpenedAt': { $gte: oneDayAgo } 
      })
    ]);
    
    const typeStats = byType.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    return {
      total,
      byType: typeStats,
      public: publicCount,
      private: total - publicCount,
      recentlyActive
    };
  }
}
