import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFile extends Document {
  _id: mongoose.Types.ObjectId;
  path: string;
  name: string;
  content: string;
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'file' | 'directory';
  mimeType?: string;
  encoding: 'utf8' | 'base64' | 'binary';
  size: number;
  metadata: {
    language?: string;
    lineCount?: number;
    charCount?: number;
    isExecutable?: boolean;
    permissions?: string;
  };
  version: {
    current: number;
    hash: string;
  };
  activity: {
    lastOpenedAt?: Date;
    lastEditedAt?: Date;
    editCount: number;
    openCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Methods
  updateContent(content: string, hash: string): Promise<IFile>;
  recordOpen(): Promise<IFile>;
  recordEdit(): Promise<IFile>;
  softDelete(): Promise<IFile>;
  restore(): Promise<IFile>;
}

const FileSchema = new Schema<IFile>({
  path: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    default: '',
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['file', 'directory'],
    required: true,
  },
  mimeType: {
    type: String,
    trim: true,
  },
  encoding: {
    type: String,
    enum: ['utf8', 'base64', 'binary'],
    default: 'utf8',
  },
  size: {
    type: Number,
    default: 0,
    min: 0,
  },
  metadata: {
    language: {
      type: String,
      trim: true,
    },
    lineCount: {
      type: Number,
      min: 0,
    },
    charCount: {
      type: Number,
      min: 0,
    },
    isExecutable: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: String,
      trim: true,
    },
  },
  version: {
    current: {
      type: Number,
      default: 1,
      min: 1,
    },
    hash: {
      type: String,
      required: true,
    },
  },
  activity: {
    lastOpenedAt: {
      type: Date,
    },
    lastEditedAt: {
      type: Date,
    },
    editCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    openCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
FileSchema.index({ projectId: 1 });
FileSchema.index({ path: 1, projectId: 1 }, { unique: true });
FileSchema.index({ userId: 1 });
FileSchema.index({ updatedAt: -1 });
FileSchema.index({ 'activity.lastOpenedAt': -1 });
FileSchema.index({ 'metadata.language': 1 });
FileSchema.index({ type: 1 });
FileSchema.index({ isDeleted: 1 });

// Methods
FileSchema.methods.updateContent = function(content: string, hash: string) {
  this.content = content;
  this.size = Buffer.byteLength(content, this.encoding);
  this.metadata.lineCount = content.split('\n').length;
  this.metadata.charCount = content.length;
  this.version.current += 1;
  this.version.hash = hash;
  this.activity.lastEditedAt = new Date();
  this.activity.editCount += 1;
  
  return this.save();
};

FileSchema.methods.recordOpen = function() {
  this.activity.lastOpenedAt = new Date();
  this.activity.openCount += 1;
  
  return this.save();
};

FileSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  
  return this.save();
};

FileSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  
  return this.save();
};

// Static methods
FileSchema.statics.findByProject = function(projectId: mongoose.Types.ObjectId, includeDeleted = false) {
  const query: any = { projectId };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return this.find(query).sort({ path: 1 });
};

FileSchema.statics.findByPath = function(projectId: mongoose.Types.ObjectId, path: string) {
  return this.findOne({ projectId, path, isDeleted: false });
};

FileSchema.statics.findByLanguage = function(language: string, projectId?: mongoose.Types.ObjectId) {
  const query: any = { 'metadata.language': language, isDeleted: false };
  if (projectId) {
    query.projectId = projectId;
  }
  return this.find(query).sort({ updatedAt: -1 });
};

interface IFileModel extends Model<IFile> {
  findByProject(projectId: mongoose.Types.ObjectId, includeDeleted?: boolean): Promise<IFile[]>;
  findByPath(projectId: mongoose.Types.ObjectId, path: string): Promise<IFile | null>;
  findByLanguage(language: string, projectId?: mongoose.Types.ObjectId): Promise<IFile[]>;
}

export const File = mongoose.model<IFile, IFileModel>('File', FileSchema);
