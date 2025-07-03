import { injectable } from 'inversify';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { DatabaseService } from './DatabaseService';

@injectable()
export class UserService {
  constructor(private databaseService: DatabaseService) {}

  async createUser(userData: {
    username: string;
    email: string;
    displayName?: string;
    avatar?: string;
  }): Promise<IUser> {
    await this.databaseService.connect();
    
    const user = new User({
      ...userData,
      preferences: {
        theme: 'dark',
        fontSize: 14,
        tabSize: 2,
        wordWrap: true,
        minimap: true,
        lineNumbers: true,
        autoSave: true,
        autoSaveDelay: 1000,
      },
      aiSettings: {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        maxTokens: 4096,
        temperature: 0.7,
      },
      recentFiles: [],
      recentProjects: [],
    });
    
    return await user.save();
  }

  async findById(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    await this.databaseService.connect();
    return await User.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    await this.databaseService.connect();
    return await User.findOne({ email: email.toLowerCase() });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    await this.databaseService.connect();
    return await User.findOne({ username });
  }

  async updateUser(
    id: string | mongoose.Types.ObjectId, 
    updates: Partial<IUser>
  ): Promise<IUser | null> {
    await this.databaseService.connect();
    
    return await User.findByIdAndUpdate(
      id,
      { $set: updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  async updatePreferences(
    id: string | mongoose.Types.ObjectId,
    preferences: Partial<IUser['preferences']>
  ): Promise<IUser | null> {
    await this.databaseService.connect();
    
    return await User.findByIdAndUpdate(
      id,
      { 
        $set: { 
          'preferences': { ...preferences },
          updatedAt: new Date() 
        } 
      },
      { new: true, runValidators: true }
    );
  }

  async updateAISettings(
    id: string | mongoose.Types.ObjectId,
    aiSettings: Partial<IUser['aiSettings']>
  ): Promise<IUser | null> {
    await this.databaseService.connect();
    
    return await User.findByIdAndUpdate(
      id,
      { 
        $set: { 
          'aiSettings': { ...aiSettings },
          updatedAt: new Date() 
        } 
      },
      { new: true, runValidators: true }
    );
  }

  async addRecentFile(
    id: string | mongoose.Types.ObjectId,
    projectId: mongoose.Types.ObjectId,
    filePath: string
  ): Promise<IUser | null> {
    await this.databaseService.connect();
    
    const user = await User.findById(id);
    if (!user) return null;
    
    await user.addRecentFile(projectId, filePath);
    return user;
  }

  async addRecentProject(
    id: string | mongoose.Types.ObjectId,
    projectId: mongoose.Types.ObjectId
  ): Promise<IUser | null> {
    await this.databaseService.connect();
    
    const user = await User.findById(id);
    if (!user) return null;
    
    await user.addRecentProject(projectId);
    return user;
  }

  async updateLastLogin(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    await this.databaseService.connect();
    
    return await User.findByIdAndUpdate(
      id,
      { 
        lastLoginAt: new Date(),
        updatedAt: new Date() 
      },
      { new: true }
    );
  }

  async deactivateUser(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    await this.databaseService.connect();
    
    return await User.findByIdAndUpdate(
      id,
      { 
        isActive: false,
        updatedAt: new Date() 
      },
      { new: true }
    );
  }

  async reactivateUser(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    await this.databaseService.connect();
    
    return await User.findByIdAndUpdate(
      id,
      { 
        isActive: true,
        updatedAt: new Date() 
      },
      { new: true }
    );
  }

  async getAllUsers(options: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  } = {}): Promise<{ users: IUser[]; total: number }> {
    await this.databaseService.connect();
    
    const { limit = 50, offset = 0, activeOnly = true } = options;
    const filter = activeOnly ? { isActive: true } : {};
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset),
      User.countDocuments(filter)
    ]);
    
    return { users, total };
  }

  async searchUsers(query: string, limit = 20): Promise<IUser[]> {
    await this.databaseService.connect();
    
    const searchRegex = new RegExp(query, 'i');
    
    return await User.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { username: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { displayName: { $regex: searchRegex } }
          ]
        }
      ]
    })
    .limit(limit)
    .sort({ username: 1 });
  }

  async deleteUser(id: string | mongoose.Types.ObjectId): Promise<boolean> {
    await this.databaseService.connect();
    
    const result = await User.findByIdAndDelete(id);
    return result !== null;
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    recentlyActive: number;
    newThisWeek: number;
  }> {
    await this.databaseService.connect();
    
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [total, active, recentlyActive, newThisWeek] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        isActive: true, 
        lastLoginAt: { $gte: oneDayAgo } 
      }),
      User.countDocuments({ 
        createdAt: { $gte: oneWeekAgo } 
      })
    ]);
    
    return { total, active, recentlyActive, newThisWeek };
  }
}
