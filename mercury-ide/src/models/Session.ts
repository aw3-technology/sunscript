import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  data: {
    openProjects: mongoose.Types.ObjectId[];
    openFiles: Array<{
      projectId: mongoose.Types.ObjectId;
      filePath: string;
      cursorPosition?: { line: number; column: number };
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
    totalDuration: number; // in milliseconds
    activityCount: number;
  };
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateActivity(): Promise<ISession>;
  openFile(projectId: mongoose.Types.ObjectId, filePath: string): Promise<ISession>;
  closeFile(projectId: mongoose.Types.ObjectId, filePath: string): Promise<ISession>;
  updateCursorPosition(projectId: mongoose.Types.ObjectId, filePath: string, line: number, column: number): Promise<ISession>;
  expire(): Promise<ISession>;
  extend(hours?: number): Promise<ISession>;
}

const SessionSchema = new Schema<ISession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  data: {
    openProjects: [{
      type: Schema.Types.ObjectId,
      ref: 'Project',
    }],
    openFiles: [{
      projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
      },
      filePath: {
        type: String,
        required: true,
      },
      cursorPosition: {
        line: {
          type: Number,
          min: 0,
        },
        column: {
          type: Number,
          min: 0,
        },
      },
      scrollPosition: {
        type: Number,
        min: 0,
      },
    }],
    activeProject: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    activeFile: {
      projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
      },
      filePath: String,
    },
    layout: {
      sidebarVisible: {
        type: Boolean,
        default: true,
      },
      terminalVisible: {
        type: Boolean,
        default: false,
      },
      panelSizes: {
        sidebar: {
          type: Number,
          default: 300,
          min: 200,
          max: 600,
        },
        editor: {
          type: Number,
          default: 600,
          min: 400,
        },
        terminal: {
          type: Number,
          default: 200,
          min: 100,
          max: 400,
        },
      },
    },
    editorState: {
      theme: {
        type: String,
        default: 'dark',
      },
      fontSize: {
        type: Number,
        default: 14,
        min: 10,
        max: 24,
      },
      wordWrap: {
        type: Boolean,
        default: true,
      },
      minimap: {
        type: Boolean,
        default: true,
      },
    },
  },
  metadata: {
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    browserInfo: {
      name: {
        type: String,
        trim: true,
      },
      version: {
        type: String,
        trim: true,
      },
      platform: {
        type: String,
        trim: true,
      },
    },
  },
  activity: {
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    totalDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    activityCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
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
SessionSchema.index({ userId: 1 });
SessionSchema.index({ sessionId: 1 }, { unique: true });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ 'activity.lastActivityAt': -1 });
SessionSchema.index({ isActive: 1 });

// Methods
SessionSchema.methods.updateActivity = function() {
  const now = new Date();
  const duration = now.getTime() - this.activity.lastActivityAt.getTime();
  
  this.activity.lastActivityAt = now;
  this.activity.totalDuration += duration;
  this.activity.activityCount += 1;
  
  return this.save();
};

SessionSchema.methods.openFile = function(projectId: mongoose.Types.ObjectId, filePath: string) {
  const existingIndex = this.data.openFiles.findIndex(
    (f: any) => f.projectId.toString() === projectId.toString() && f.filePath === filePath
  );
  
  if (existingIndex === -1) {
    this.data.openFiles.push({ projectId, filePath });
  }
  
  this.data.activeFile = { projectId, filePath };
  return this.updateActivity();
};

SessionSchema.methods.closeFile = function(projectId: mongoose.Types.ObjectId, filePath: string) {
  this.data.openFiles = this.data.openFiles.filter(
    (f: any) => !(f.projectId.toString() === projectId.toString() && f.filePath === filePath)
  );
  
  if (this.data.activeFile?.projectId?.toString() === projectId.toString() && 
      this.data.activeFile?.filePath === filePath) {
    this.data.activeFile = this.data.openFiles.length > 0 ? {
      projectId: this.data.openFiles[0].projectId,
      filePath: this.data.openFiles[0].filePath,
    } : undefined;
  }
  
  return this.updateActivity();
};

SessionSchema.methods.updateCursorPosition = function(
  projectId: mongoose.Types.ObjectId, 
  filePath: string, 
  line: number, 
  column: number
) {
  const file = this.data.openFiles.find(
    (f: any) => f.projectId.toString() === projectId.toString() && f.filePath === filePath
  );
  
  if (file) {
    file.cursorPosition = { line, column };
    return this.save();
  }
  
  return Promise.resolve(this);
};

SessionSchema.methods.expire = function() {
  this.isActive = false;
  this.expiresAt = new Date();
  
  return this.save();
};

SessionSchema.methods.extend = function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  this.isActive = true;
  
  return this.save();
};

// Static methods
SessionSchema.statics.findByUser = function(userId: mongoose.Types.ObjectId) {
  return this.find({ userId, isActive: true }).sort({ 'activity.lastActivityAt': -1 });
};

SessionSchema.statics.findActiveSession = function(sessionId: string) {
  return this.findOne({ sessionId, isActive: true });
};

SessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({ expiresAt: { $lte: new Date() } });
};

interface ISessionModel extends Model<ISession> {
  findByUser(userId: mongoose.Types.ObjectId): Promise<ISession[]>;
  findActiveSession(sessionId: string): Promise<ISession | null>;
  cleanupExpired(): Promise<any>;
}

export const Session = mongoose.model<ISession, ISessionModel>('Session', SessionSchema);
