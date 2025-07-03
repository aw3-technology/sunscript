export interface Document {
    _id?: any;
    save?: () => Promise<any>;
}
export declare class Schema {
    methods: any;
    statics: any;
    constructor(definition: any, options?: any);
    pre(hook: string, fn: Function): void;
    post(hook: string, fn: Function): void;
    virtual(name: string): {
        get: () => void;
        set: () => void;
    };
    index(fields: any, options?: any): void;
    static Types: {
        ObjectId: {
            new (id?: string): {
                toString(): string;
            };
        };
        Mixed: {};
    };
}
export declare const Types: {
    ObjectId: {
        new (id?: string): {
            toString(): string;
        };
    };
};
export interface Model<T> {
    new (doc?: any): T;
    find: (filter?: any) => any;
    findOne: (filter?: any) => any;
    findById: (id: any) => any;
    create: (doc: any) => Promise<T>;
    updateOne: (filter: any, update: any) => Promise<any>;
    deleteOne: (filter: any) => Promise<any>;
}
export declare function model<T = any>(name: string, schema?: Schema): Model<T>;
export declare const connection: {
    readyState: number;
    host: string;
    port: number;
    name: string;
    on: (event: string, handler: Function) => void;
    once: (event: string, handler: Function) => void;
};
export declare function connect(uri: string, options?: any): Promise<void>;
export declare function disconnect(): Promise<void>;
export declare function startSession(): Promise<{
    startTransaction: () => void;
    commitTransaction: () => Promise<void>;
    abortTransaction: () => Promise<void>;
    endSession: () => Promise<void>;
}>;
export interface ClientSession {
    startTransaction: () => void;
    commitTransaction: () => Promise<void>;
    abortTransaction: () => Promise<void>;
    endSession: () => Promise<void>;
}
declare const mongoose: {
    connect: typeof connect;
    disconnect: typeof disconnect;
    connection: {
        readyState: number;
        host: string;
        port: number;
        name: string;
        on: (event: string, handler: Function) => void;
        once: (event: string, handler: Function) => void;
    };
    model: typeof model;
    Schema: typeof Schema;
    Types: {
        ObjectId: {
            new (id?: string): {
                toString(): string;
            };
        };
    };
    startSession: typeof startSession;
};
export default mongoose;
