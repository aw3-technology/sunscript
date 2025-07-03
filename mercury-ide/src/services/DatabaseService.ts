import { injectable } from 'inversify';
import { MongoClient, Db, Collection } from 'mongodb';
import mongoose from 'mongoose';
import { getActiveConfig } from '../config/database';

@injectable()
export class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this.isConnected && this.db) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  private async _connect(): Promise<void> {
    try {
      const config = getActiveConfig();
      
      // Connect using Mongoose for ODM features
      await mongoose.connect(config.uri, {
        dbName: config.dbName,
        ...config.options,
      });

      // Also maintain native MongoDB connection for advanced operations
      this.client = new MongoClient(config.uri, config.options);
      await this.client.connect();
      this.db = this.client.db(config.dbName);
      
      this.isConnected = true;
      console.log(`✅ Connected to MongoDB: ${config.dbName}`);
      
      // Test the connection
      await this.db.admin().ping();
      console.log('✅ MongoDB ping successful');
      
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      
      this.db = null;
      this.isConnected = false;
      this.connectionPromise = null;
      
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getDatabase(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.getDatabase().collection<T>(name);
  }

  isHealthy(): boolean {
    return this.isConnected && this.db !== null;
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected || !this.db) {
        return {
          status: 'unhealthy',
          details: { error: 'Database not connected' },
        };
      }

      const pingResult = await this.db.admin().ping();
      const stats = await this.db.stats();
      
      return {
        status: 'healthy',
        details: {
          ping: pingResult,
          dbStats: {
            collections: stats.collections,
            dataSize: stats.dataSize,
            storageSize: stats.storageSize,
            indexes: stats.indexes,
          },
          mongoose: {
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name,
          },
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  // Utility method for transactions
  async withTransaction<T>(
    operation: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Collection management utilities
  async createIndexes(): Promise<void> {
    try {
      const db = this.getDatabase();
      
      // Projects collection indexes
      await db.collection('projects').createIndexes([
        { key: { userId: 1 } },
        { key: { name: 1, userId: 1 }, unique: true },
        { key: { createdAt: -1 } },
        { key: { updatedAt: -1 } },
      ]);

      // Files collection indexes
      await db.collection('files').createIndexes([
        { key: { projectId: 1 } },
        { key: { path: 1, projectId: 1 }, unique: true },
        { key: { userId: 1 } },
        { key: { updatedAt: -1 } },
      ]);

      // Users collection indexes
      await db.collection('users').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { username: 1 }, unique: true },
        { key: { createdAt: -1 } },
      ]);

      // Sessions collection indexes
      await db.collection('sessions').createIndexes([
        { key: { userId: 1 } },
        { key: { sessionId: 1 }, unique: true },
        { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
      ]);

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }
}