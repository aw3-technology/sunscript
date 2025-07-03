export interface DatabaseConfig {
  uri: string;
  dbName: string;
  options?: {
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    retryWrites?: boolean;
  };
}

export const DATABASE_CONFIG: DatabaseConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB_NAME || 'sunscript_ide',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
  },
};

// For development, you can also use MongoDB Atlas (cloud)
export const MONGODB_ATLAS_CONFIG: DatabaseConfig = {
  uri: process.env.MONGODB_ATLAS_URI || '',
  dbName: 'sunscript_ide',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
  },
};

// Determine which config to use
export const getActiveConfig = (): DatabaseConfig => {
  if (process.env.NODE_ENV === 'production' && process.env.MONGODB_ATLAS_URI) {
    return MONGODB_ATLAS_CONFIG;
  }
  return DATABASE_CONFIG;
};