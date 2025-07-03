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
export declare const DATABASE_CONFIG: DatabaseConfig;
export declare const MONGODB_ATLAS_CONFIG: DatabaseConfig;
export declare const getActiveConfig: () => DatabaseConfig;
