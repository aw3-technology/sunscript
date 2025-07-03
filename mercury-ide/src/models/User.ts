import mongoose, { Schema, Document } from 'mongoose';

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
  
  // Methods
  addRecentFile(projectId: mongoose.Types.ObjectId, filePath: string): Promise<IUser>;
  addRecentProject(projectId: mongoose.Types.ObjectId): Promise<IUser>;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  avatar: {
    type: String,
    trim: true,
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark',
    },
    fontSize: {
      type: Number,
      default: 14,
      min: 10,
      max: 24,
    },
    tabSize: {
      type: Number,
      default: 2,
      min: 1,
      max: 8,
    },
    wordWrap: {
      type: Boolean,
      default: true,
    },
    minimap: {
      type: Boolean,
      default: true,
    },
    lineNumbers: {
      type: Boolean,
      default: true,
    },
    autoSave: {
      type: Boolean,
      default: true,
    },
    autoSaveDelay: {
      type: Number,
      default: 1000,
      min: 500,
      max: 10000,
    },
  },
  recentFiles: [{
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    lastOpened: {
      type: Date,
      default: Date.now,
    },
  }],
  recentProjects: [{
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    lastOpened: {
      type: Date,
      default: Date.now,
    },
  }],
  aiSettings: {
    provider: {
      type: String,
      enum: ['anthropic', 'openai', 'local'],
      default: 'anthropic',
    },
    apiKey: {
      type: String,
      select: false, // Don't include in queries by default
    },
    model: {
      type: String,
      default: 'claude-3-sonnet-20240229',
    },
    maxTokens: {
      type: Number,
      default: 4096,
      min: 1,
      max: 100000,
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2,
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
  lastLoginAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.aiSettings?.apiKey; // Never expose API keys in JSON
      return ret;
    },
  },
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'recentProjects.lastOpened': -1 });

// Methods
UserSchema.methods.addRecentFile = function(projectId: mongoose.Types.ObjectId, filePath: string) {
  const existingIndex = this.recentFiles.findIndex(
    (rf: any) => rf.projectId.toString() === projectId.toString() && rf.filePath === filePath
  );
  
  if (existingIndex > -1) {
    this.recentFiles[existingIndex].lastOpened = new Date();
  } else {
    this.recentFiles.unshift({ projectId, filePath, lastOpened: new Date() });
  }
  
  // Keep only the 20 most recent files
  this.recentFiles = this.recentFiles.slice(0, 20);
  return this.save();
};

UserSchema.methods.addRecentProject = function(projectId: mongoose.Types.ObjectId) {
  const existingIndex = this.recentProjects.findIndex(
    (rp: any) => rp.projectId.toString() === projectId.toString()
  );
  
  if (existingIndex > -1) {
    this.recentProjects[existingIndex].lastOpened = new Date();
  } else {
    this.recentProjects.unshift({ projectId, lastOpened: new Date() });
  }
  
  // Keep only the 10 most recent projects
  this.recentProjects = this.recentProjects.slice(0, 10);
  return this.save();
};

export const User = mongoose.model<IUser>('User', UserSchema);