import { Db, Collection } from 'mongodb';
import mongoose from 'mongoose';
export declare class DatabaseService {
    private client;
    private db;
    private isConnected;
    private connectionPromise;
    connect(): Promise<void>;
    private _connect;
    disconnect(): Promise<void>;
    getDatabase(): Db;
    getCollection<T extends Document = Document>(name: string): Collection<T>;
    isHealthy(): boolean;
    healthCheck(): Promise<{
        status: string;
        details: any;
    }>;
    withTransaction<T>(operation: (session: mongoose.ClientSession) => Promise<T>): Promise<T>;
    createIndexes(): Promise<void>;
}
