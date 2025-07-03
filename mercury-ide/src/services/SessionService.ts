import { injectable } from 'inversify';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Session, ISession } from '../models/Session';
import { DatabaseService } from './DatabaseService';

@injectable()
export class SessionService {
  constructor(private databaseService: DatabaseService) {}

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private parseBrowserInfo(userAgent: string): {
    name: string;
    version: string;
    platform: string;
  } {
    // Simple user agent parsing - in production, consider using a library like ua-parser-js
    const browserRegexes = [
      { name: 'Chrome', regex: /Chrome\/(\d+\.\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+\.\d+)/ },
      { name: 'Safari', regex: /Safari\/(\d+\.\d+)/ },
      { name: 'Edge', regex: /Edge\/(\d+\.\d+)/ },
      { name: 'Opera', regex: /Opera\/(\d+\.\d+)/ },
    ];
    
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    
    for (const browser of browserRegexes) {
      const match = userAgent.match(browser.regex);
      if (match) {
        browserName = browser.name;
        browserVersion = match[1];
        break;
      }
    }
    
    let platform = 'Unknown';
    if (userAgent.includes('Windows')) platform = 'Windows';
    else if (userAgent.includes('Macintosh')) platform = 'macOS';
    else if (userAgent.includes('Linux')) platform = 'Linux';
    else if (userAgent.includes('Android')) platform = 'Android';
    else if (userAgent.includes('iOS')) platform = 'iOS';
    
    return {
      name: browserName,
      version: browserVersion,
      platform
    };
  }

  async createSession(sessionData: {
    userId: mongoose.Types.ObjectId;
    userAgent?: string;
    ipAddress?: string;
    expirationHours?: number;
  }): Promise<ISession> {
    await this.databaseService.connect();
    
    const { userId, userAgent, ipAddress, expirationHours = 24 } = sessionData;
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    
    const browserInfo = userAgent ? this.parseBrowserInfo(userAgent) : undefined;
    
    const session = new Session({
      sessionId,
      userId,
      data: {
        openProjects: [],
        openFiles: [],
        layout: {
          sidebarVisible: true,
          terminalVisible: false,
          panelSizes: {
            sidebar: 300,
            editor: 600,
            terminal: 200,
          },
        },
        editorState: {
          theme: 'dark',
          fontSize: 14,
          wordWrap: true,
          minimap: true,
        },
      },
      metadata: {
        userAgent,
        ipAddress,
        browserInfo,
      },
      activity: {
        startedAt: new Date(),
        lastActivityAt: new Date(),
        totalDuration: 0,
        activityCount: 0,
      },
      expiresAt,
      isActive: true,
    });
    
    return await session.save();
  }

  async findBySessionId(sessionId: string): Promise<ISession | null> {
    await this.databaseService.connect();
    const session = await Session.findActiveSession(sessionId);
    if (session) {
      await session.populate('userId', 'username displayName email preferences');
    }
    return session;
  }

  async findByUser(
    userId: string | mongoose.Types.ObjectId
  ): Promise<ISession[]> {
    await this.databaseService.connect();
    
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    return await Session.findByUser(userObjectId);
  }

  async updateActivity(sessionId: string): Promise<ISession | null> {
    await this.databaseService.connect();
    
    const session = await Session.findActiveSession(sessionId);
    if (!session) return null;
    
    await session.updateActivity();
    return session;
  }

  async openProject(
    sessionId: string,
    projectId: mongoose.Types.ObjectId
  ): Promise<ISession | null> {
    await this.databaseService.connect();
    
    return await Session.findOneAndUpdate(
      { sessionId, isActive: true },
      {
        $addToSet: { 'data.openProjects': projectId },
        $set: { 
          'data.activeProject': projectId,
          'activity.lastActivityAt': new Date()
        },
        $inc: { 'activity.activityCount': 1 }
      },
      { new: true }
    );
  }

  async closeProject(
    sessionId: string,
    projectId: mongoose.Types.ObjectId
  ): Promise<ISession | null> {
    await this.databaseService.connect();
    
    const session = await Session.findActiveSession(sessionId);
    if (!session) return null;
    
    // Remove project from open projects
    session.data.openProjects = session.data.openProjects.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== projectId.toString()
    );
    
    // Remove all files from this project
    session.data.openFiles = session.data.openFiles.filter(
      (file: any) => file.projectId.toString() !== projectId.toString()
    );
    
    // Update active project if it was the closed one
    if (session.data.activeProject?.toString() === projectId.toString()) {
      session.data.activeProject = session.data.openProjects.length > 0 
        ? session.data.openProjects[0] 
        : undefined;
    }
    
    return await session.updateActivity();
  }

  async openFile(
    sessionId: string,
    projectId: mongoose.Types.ObjectId,
    filePath: string
  ): Promise<ISession | null> {
    await this.databaseService.connect();
    
    const session = await Session.findActiveSession(sessionId);
    if (!session) return null;
    
    await session.openFile(projectId, filePath);
    return session;
  }

  async closeFile(
    sessionId: string,
    projectId: mongoose.Types.ObjectId,
    filePath: string
  ): Promise<ISession | null> {
    await this.databaseService.connect();
    
    const session = await Session.findActiveSession(sessionId);
    if (!session) return null;
    
    await session.closeFile(projectId, filePath);
    return session;
  }

  async updateCursorPosition(
    sessionId: string,
    projectId: mongoose.Types.ObjectId,
    filePath: string,
    line: number,
    column: number
  ): Promise<ISession | null> {
    await this.databaseService.connect();
    
    const session = await Session.findActiveSession(sessionId);
    if (!session) return null;
    
    await session.updateCursorPosition(projectId, filePath, line, column);
    return session;
  }

  async updateLayout(
    sessionId: string,
    layout: Partial<ISession['data']['layout']>
  ): Promise<ISession | null> {
    await this.databaseService.connect();
    
    return await Session.findOneAndUpdate(
      { sessionId, isActive: true },
      {
        $set: {
          'data.layout': { ...layout },
          'activity.lastActivityAt': new Date()
        },
        $inc: { 'activity.activityCount': 1 }
      },
      { new: true }
    );
  }

  async updateEditorState(
    sessionId: string,
    editorState: Partial<ISession['data']['editorState']>
  ): Promise<ISession | null> {
    await this.databaseService.connect();
    
    return await Session.findOneAndUpdate(
      { sessionId, isActive: true },
      {
        $set: {
          'data.editorState': { ...editorState },
          'activity.lastActivityAt': new Date()
        },
        $inc: { 'activity.activityCount': 1 }
      },
      { new: true }
    );
  }

  async extendSession(
    sessionId: string,
    hours = 24
  ): Promise<ISession | null> {
    await this.databaseService.connect();
    
    const session = await Session.findActiveSession(sessionId);
    if (!session) return null;
    
    await session.extend(hours);
    return session;
  }

  async expireSession(sessionId: string): Promise<ISession | null> {
    await this.databaseService.connect();
    
    const session = await Session.findActiveSession(sessionId);
    if (!session) return null;
    
    await session.expire();
    return session;
  }

  async expireUserSessions(
    userId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    await this.databaseService.connect();
    
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    const result = await Session.updateMany(
      { userId: userObjectId, isActive: true },
      {
        isActive: false,
        expiresAt: new Date(),
      }
    );
    
    return result.modifiedCount;
  }

  async cleanupExpiredSessions(): Promise<number> {
    await this.databaseService.connect();
    
    const result = await Session.cleanupExpired();
    return result.deletedCount || 0;
  }

  async getActiveSessions(): Promise<ISession[]> {
    await this.databaseService.connect();
    
    return await Session.find({ isActive: true })
      .sort({ 'activity.lastActivityAt': -1 })
      .populate('userId', 'username displayName');
  }

  async getSessionStats(userId?: string | mongoose.Types.ObjectId): Promise<{
    total: number;
    active: number;
    recentlyActive: number;
    averageDuration: number;
    byBrowser: Record<string, number>;
    byPlatform: Record<string, number>;
  }> {
    await this.databaseService.connect();
    
    const filter: any = {};
    if (userId) {
      const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
      filter.userId = userObjectId;
    }
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [stats, byBrowser, byPlatform, active, recentlyActive] = await Promise.all([
      Session.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            averageDuration: { $avg: '$activity.totalDuration' }
          }
        }
      ]),
      Session.aggregate([
        { $match: filter },
        { $group: { _id: '$metadata.browserInfo.name', count: { $sum: 1 } } }
      ]),
      Session.aggregate([
        { $match: filter },
        { $group: { _id: '$metadata.browserInfo.platform', count: { $sum: 1 } } }
      ]),
      Session.countDocuments({ ...filter, isActive: true }),
      Session.countDocuments({ 
        ...filter, 
        'activity.lastActivityAt': { $gte: oneHourAgo } 
      })
    ]);
    
    const browserStats = byBrowser.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id || 'Unknown'] = item.count;
      return acc;
    }, {});
    
    const platformStats = byPlatform.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id || 'Unknown'] = item.count;
      return acc;
    }, {});
    
    const totalStats = stats[0] || { total: 0, averageDuration: 0 };
    
    return {
      total: totalStats.total,
      active,
      recentlyActive,
      averageDuration: Math.round(totalStats.averageDuration || 0),
      byBrowser: browserStats,
      byPlatform: platformStats
    };
  }
}
