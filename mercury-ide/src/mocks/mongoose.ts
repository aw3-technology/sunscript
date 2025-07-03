// Mock Mongoose for browser environment

export interface Document {
  _id?: any;
  save?: () => Promise<any>;
}

export class Schema {
  methods: any = {};
  statics: any = {};
  
  constructor(definition: any, options?: any) {}
  
  pre(hook: string, fn: Function) {}
  post(hook: string, fn: Function) {}
  virtual(name: string) {
    return { get: () => {}, set: () => {} };
  }
  index(fields: any, options?: any) {
    console.warn('Schema.index called in browser - operation ignored');
  }
  
  static Types = {
    ObjectId: class ObjectId {
      constructor(id?: string) {}
      toString() { return 'mock-id'; }
    },
    Mixed: {},
  };
}

export const Types = {
  ObjectId: class ObjectId {
    constructor(id?: string) {}
    toString() { return 'mock-id'; }
  }
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

export function model<T = any>(name: string, schema?: Schema): Model<T> {
  const MockModel = class implements Document {
    constructor(data?: any) {
      Object.assign(this, data);
    }
    
    save = async () => this;
    
    static find = (filter?: any) => ({
      populate: (field: string) => ({
        exec: async () => []
      }),
      exec: async () => []
    });
    
    static findOne = (filter?: any) => ({
      populate: (field: string) => ({
        exec: async () => null
      }),
      exec: async () => null
    });
    
    static findById = (id: any) => ({
      populate: (field: string) => ({
        exec: async () => null
      }),
      exec: async () => null
    });
    
    static create = async (doc: any) => new MockModel(doc);
    
    static updateOne = async (filter: any, update: any) => ({
      acknowledged: true,
      modifiedCount: 0
    });
    
    static deleteOne = async (filter: any) => ({
      acknowledged: true,
      deletedCount: 0
    });
    
    static findByUser = async (userId: any) => [];
    static findActiveSession = async (sessionId: string) => null;
    static cleanupExpired = async () => ({});
    static createFromPath = async (path: string, userId: any) => new MockModel();
    static findByPath = async (projectId: any, path: string) => null;
  };
  
  return MockModel as any;
}

export const connection = {
  readyState: 0,
  host: 'localhost',
  port: 27017,
  name: 'mock',
  on: (event: string, handler: Function) => {},
  once: (event: string, handler: Function) => {},
};

export async function connect(uri: string, options?: any) {
  console.warn('Mongoose connect called in browser - no operation performed');
  connection.readyState = 1;
}

export async function disconnect() {
  console.warn('Mongoose disconnect called in browser - no operation performed');
  connection.readyState = 0;
}

export async function startSession() {
  return {
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: async () => {},
  };
}

export interface ClientSession {
  startTransaction: () => void;
  commitTransaction: () => Promise<void>;
  abortTransaction: () => Promise<void>;
  endSession: () => Promise<void>;
}

const mongoose = {
  connect,
  disconnect,
  connection,
  model,
  Schema,
  Types,
  startSession,
};

export default mongoose;