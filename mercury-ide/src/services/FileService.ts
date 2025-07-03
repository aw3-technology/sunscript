import { injectable } from 'inversify';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { File, IFile } from '../models/File';
import { DatabaseService } from './DatabaseService';

@injectable()
export class FileService {
  constructor(private databaseService: DatabaseService) {}

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private detectLanguage(filePath: string): string | undefined {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'markdown': 'markdown',
      'txt': 'plaintext',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'makefile': 'makefile',
      'sun': 'sunscript',
    };
    
    return languageMap[extension || ''];
  }

  private getMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'xml': 'application/xml',
      'yaml': 'application/yaml',
      'yml': 'application/yaml',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      'sun': 'text/sunscript',
    };
    
    return mimeMap[extension || ''] || 'application/octet-stream';
  }

  async createFile(fileData: {
    path: string;
    content: string;
    projectId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type?: 'file' | 'directory';
    encoding?: 'utf8' | 'base64' | 'binary';
  }): Promise<IFile> {
    await this.databaseService.connect();
    
    const { path, content, projectId, userId, type = 'file', encoding = 'utf8' } = fileData;
    const name = path.split('/').pop() || '';
    const hash = this.generateHash(content);
    const language = this.detectLanguage(path);
    const mimeType = this.getMimeType(path);
    const size = Buffer.byteLength(content, encoding);
    
    const file = new File({
      path,
      name,
      content,
      projectId,
      userId,
      type,
      mimeType,
      encoding,
      size,
      metadata: {
        language,
        lineCount: content.split('\n').length,
        charCount: content.length,
        isExecutable: false,
      },
      version: {
        current: 1,
        hash,
      },
      activity: {
        editCount: 0,
        openCount: 0,
      },
    });
    
    return await file.save();
  }

  async findById(id: string | mongoose.Types.ObjectId): Promise<IFile | null> {
    await this.databaseService.connect();
    return await File.findById(id)
      .populate('projectId', 'name type')
      .populate('userId', 'username displayName');
  }

  async findByPath(
    projectId: string | mongoose.Types.ObjectId,
    path: string
  ): Promise<IFile | null> {
    await this.databaseService.connect();
    
    const projectObjectId = typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId;
    return await File.findByPath(projectObjectId, path);
  }

  async findByProject(
    projectId: string | mongoose.Types.ObjectId,
    includeDeleted = false
  ): Promise<IFile[]> {
    await this.databaseService.connect();
    
    const projectObjectId = typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId;
    return await File.findByProject(projectObjectId, includeDeleted);
  }

  async findByLanguage(
    language: string,
    projectId?: string | mongoose.Types.ObjectId
  ): Promise<IFile[]> {
    await this.databaseService.connect();
    
    const projectObjectId = projectId 
      ? (typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId)
      : undefined;
    
    return await File.findByLanguage(language, projectObjectId);
  }

  async updateContent(
    id: string | mongoose.Types.ObjectId,
    content: string
  ): Promise<IFile | null> {
    await this.databaseService.connect();
    
    const file = await File.findById(id);
    if (!file) return null;
    
    const hash = this.generateHash(content);
    await file.updateContent(content, hash);
    return file;
  }

  async updateMetadata(
    id: string | mongoose.Types.ObjectId,
    metadata: Partial<IFile['metadata']>
  ): Promise<IFile | null> {
    await this.databaseService.connect();
    
    return await File.findByIdAndUpdate(
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

  async recordOpen(
    id: string | mongoose.Types.ObjectId
  ): Promise<IFile | null> {
    await this.databaseService.connect();
    
    const file = await File.findById(id);
    if (!file) return null;
    
    await file.recordOpen();
    return file;
  }

  async moveFile(
    id: string | mongoose.Types.ObjectId,
    newPath: string
  ): Promise<IFile | null> {
    await this.databaseService.connect();
    
    const newName = newPath.split('/').pop() || '';
    const language = this.detectLanguage(newPath);
    const mimeType = this.getMimeType(newPath);
    
    return await File.findByIdAndUpdate(
      id,
      {
        path: newPath,
        name: newName,
        mimeType,
        'metadata.language': language,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
  }

  async copyFile(
    id: string | mongoose.Types.ObjectId,
    newPath: string,
    projectId?: mongoose.Types.ObjectId
  ): Promise<IFile | null> {
    await this.databaseService.connect();
    
    const originalFile = await File.findById(id);
    if (!originalFile) return null;
    
    const newName = newPath.split('/').pop() || '';
    const language = this.detectLanguage(newPath);
    const mimeType = this.getMimeType(newPath);
    const hash = this.generateHash(originalFile.content);
    
    const copiedFile = new File({
      path: newPath,
      name: newName,
      content: originalFile.content,
      projectId: projectId || originalFile.projectId,
      userId: originalFile.userId,
      type: originalFile.type,
      mimeType,
      encoding: originalFile.encoding,
      size: originalFile.size,
      metadata: {
        ...originalFile.metadata,
        language,
      },
      version: {
        current: 1,
        hash,
      },
      activity: {
        editCount: 0,
        openCount: 0,
      },
    });
    
    return await copiedFile.save();
  }

  async softDelete(
    id: string | mongoose.Types.ObjectId
  ): Promise<IFile | null> {
    await this.databaseService.connect();
    
    const file = await File.findById(id);
    if (!file) return null;
    
    await file.softDelete();
    return file;
  }

  async restore(
    id: string | mongoose.Types.ObjectId
  ): Promise<IFile | null> {
    await this.databaseService.connect();
    
    const file = await File.findById(id);
    if (!file) return null;
    
    await file.restore();
    return file;
  }

  async searchFiles(
    projectId: string | mongoose.Types.ObjectId,
    query: string,
    options: {
      includeContent?: boolean;
      fileTypes?: string[];
      limit?: number;
    } = {}
  ): Promise<IFile[]> {
    await this.databaseService.connect();
    
    const { includeContent = false, fileTypes, limit = 50 } = options;
    const projectObjectId = typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId;
    const searchRegex = new RegExp(query, 'i');
    
    const filter: any = {
      projectId: projectObjectId,
      isDeleted: false,
    };
    
    if (fileTypes && fileTypes.length > 0) {
      filter['metadata.language'] = { $in: fileTypes };
    }
    
    const searchFilter = {
      ...filter,
      $or: [
        { name: { $regex: searchRegex } },
        { path: { $regex: searchRegex } },
        ...(includeContent ? [{ content: { $regex: searchRegex } }] : [])
      ]
    };
    
    return await File.find(searchFilter)
      .limit(limit)
      .sort({ updatedAt: -1 });
  }

  async getFilesByType(
    projectId: string | mongoose.Types.ObjectId,
    fileType: string
  ): Promise<IFile[]> {
    await this.databaseService.connect();
    
    const projectObjectId = typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId;
    
    return await File.find({
      projectId: projectObjectId,
      'metadata.language': fileType,
      isDeleted: false
    })
    .sort({ path: 1 });
  }

  async getRecentFiles(
    userId: string | mongoose.Types.ObjectId,
    limit = 20
  ): Promise<IFile[]> {
    await this.databaseService.connect();
    
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    return await File.find({
      userId: userObjectId,
      isDeleted: false,
      'activity.lastOpenedAt': { $exists: true }
    })
    .sort({ 'activity.lastOpenedAt': -1 })
    .limit(limit)
    .populate('projectId', 'name type');
  }

  async deleteFile(id: string | mongoose.Types.ObjectId): Promise<boolean> {
    await this.databaseService.connect();
    
    const result = await File.findByIdAndDelete(id);
    return result !== null;
  }

  async getFileStats(projectId?: string | mongoose.Types.ObjectId): Promise<{
    total: number;
    byLanguage: Record<string, number>;
    totalSize: number;
    averageSize: number;
    recentlyEdited: number;
  }> {
    await this.databaseService.connect();
    
    const filter: any = { isDeleted: false, type: 'file' };
    if (projectId) {
      const projectObjectId = typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId;
      filter.projectId = projectObjectId;
    }
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [stats, byLanguage, recentlyEdited] = await Promise.all([
      File.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalSize: { $sum: '$size' },
            averageSize: { $avg: '$size' }
          }
        }
      ]),
      File.aggregate([
        { $match: filter },
        { $group: { _id: '$metadata.language', count: { $sum: 1 } } }
      ]),
      File.countDocuments({ 
        ...filter, 
        'activity.lastEditedAt': { $gte: oneDayAgo } 
      })
    ]);
    
    const languageStats = byLanguage.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {});
    
    const totalStats = stats[0] || { total: 0, totalSize: 0, averageSize: 0 };
    
    return {
      total: totalStats.total,
      byLanguage: languageStats,
      totalSize: totalStats.totalSize,
      averageSize: Math.round(totalStats.averageSize || 0),
      recentlyEdited
    };
  }
}
