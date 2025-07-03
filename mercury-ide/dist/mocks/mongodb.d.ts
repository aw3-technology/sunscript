export declare class MongoClient {
    constructor(uri: string, options?: any);
    connect(): Promise<void>;
    close(): Promise<void>;
    db(name: string): {
        collection: () => {
            find: () => {
                toArray: () => Promise<never[]>;
            };
            findOne: () => Promise<null>;
            insertOne: () => Promise<{
                acknowledged: boolean;
            }>;
            updateOne: () => Promise<{
                acknowledged: boolean;
            }>;
            deleteOne: () => Promise<{
                acknowledged: boolean;
            }>;
            createIndexes: () => Promise<void>;
        };
        admin: () => {
            ping: () => Promise<{}>;
        };
        stats: () => Promise<{}>;
    };
}
export declare class Db {
}
export declare class Collection {
}
declare const _default: {
    MongoClient: typeof MongoClient;
    Db: typeof Db;
    Collection: typeof Collection;
};
export default _default;
