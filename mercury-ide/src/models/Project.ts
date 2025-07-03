import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  type: 'sunscript' | 'typescript' | 'javascript' | 'other';
  settings: {
    mainFile?: string;
    buildCommand?: string;
    runCommand?: string;
    outputDir?: string;
    sourceDir?: string;
    dependencies?: string[];
  };
  structure: {
    root: string;
    files: Array<{
      path: string;
      type: 'file' | 'directory';
      size?: number;
      lastModified?: Date;
    }>;
  };
  metadata: {
    version?: string;
    author?: string;
    license?: string;
    repository?: string;
    tags?: string[];
  };
  collaboration: {
    isPublic: boolean;
    allowedUsers: mongoose.Types.ObjectId[];
    permissions: {
      userId: mongoose.Types.ObjectId;
      role: 'owner' | 'editor' | 'viewer';
      grantedAt: Date;
    }[];
  };
  activity: {
    lastOpenedAt?: Date;
    lastEditedAt?: Date;
    totalEdits: number;
    openCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Methods
  addFile(filePath: string, type: 'file' | 'directory', size?: number): Promise<IProject>;
  removeFile(filePath: string): Promise<IProject>;
  recordOpen(): Promise<IProject>;
  softDelete(): Promise<IProject>;
  restore(): Promise<IProject>;
}

const ProjectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['sunscript', 'typescript', 'javascript', 'other'],
    default: 'sunscript',
  },
  settings: {
    mainFile: {
      type: String,
      trim: true,
    },
    buildCommand: {
      type: String,
      trim: true,
    },
    runCommand: {
      type: String,
      trim: true,
    },
    outputDir: {
      type: String,
      trim: true,
      default: 'dist',
    },
    sourceDir: {
      type: String,
      trim: true,
      default: 'src',
    },
    dependencies: [{
      type: String,
      trim: true,
    }],
  },
  structure: {
    root: {
      type: String,
      required: true,
      default: '/',
    },
    files: [{
      path: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ['file', 'directory'],
        required: true,
      },
      size: {
        type: Number,
        min: 0,
      },
      lastModified: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  metadata: {
    version: {
      type: String,
      trim: true,
      default: '1.0.0',
    },
    author: {
      type: String,
      trim: true,
    },
    license: {
      type: String,
      trim: true,
      default: 'MIT',
    },
    repository: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
  },
  collaboration: {
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    permissions: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      role: {
        type: String,
        enum: ['owner', 'editor', 'viewer'],
        required: true,
      },
      grantedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  activity: {
    lastOpenedAt: {
      type: Date,
    },
    lastEditedAt: {
      type: Date,
    },
    totalEdits: {
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
ProjectSchema.index({ userId: 1 });
ProjectSchema.index({ name: 1, userId: 1 }, { unique: true });
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ updatedAt: -1 });
ProjectSchema.index({ 'activity.lastOpenedAt': -1 });
ProjectSchema.index({ type: 1 });
ProjectSchema.index({ 'metadata.tags': 1 });
ProjectSchema.index({ isDeleted: 1 });

// Methods
ProjectSchema.methods.addFile = function(filePath: string, type: 'file' | 'directory', size?: number) {
  const existingIndex = this.structure.files.findIndex((f: any) => f.path === filePath);
  
  if (existingIndex > -1) {
    this.structure.files[existingIndex].lastModified = new Date();
    if (size !== undefined) {
      this.structure.files[existingIndex].size = size;
    }
  } else {
    this.structure.files.push({
      path: filePath,
      type,
      size,
      lastModified: new Date(),
    });
  }
  
  this.activity.lastEditedAt = new Date();
  this.activity.totalEdits += 1;
  
  return this.save();
};

ProjectSchema.methods.removeFile = function(filePath: string) {
  this.structure.files = this.structure.files.filter((f: any) => f.path !== filePath);
  this.activity.lastEditedAt = new Date();
  this.activity.totalEdits += 1;
  
  return this.save();
};

ProjectSchema.methods.recordOpen = function() {
  this.activity.lastOpenedAt = new Date();
  this.activity.openCount += 1;
  
  return this.save();
};

ProjectSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  
  return this.save();
};

ProjectSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  
  return this.save();
};

// Static methods
ProjectSchema.statics.findByUser = function(userId: mongoose.Types.ObjectId, includeDeleted = false) {
  const query: any = { userId };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return this.find(query).sort({ updatedAt: -1 });
};

ProjectSchema.statics.findPublic = function() {
  return this.find({ 
    'collaboration.isPublic': true, 
    isDeleted: false 
  }).sort({ createdAt: -1 });
};

interface IProjectModel extends Model<IProject> {
  findByUser(userId: mongoose.Types.ObjectId, includeDeleted?: boolean): Promise<IProject[]>;
  findPublic(): Promise<IProject[]>;
}

export const Project = mongoose.model<IProject, IProjectModel>('Project', ProjectSchema);