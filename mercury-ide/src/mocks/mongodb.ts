// Mock MongoDB for browser environment
// This prevents MongoDB from being bundled in the client

export class MongoClient {
  constructor(uri: string, options?: any) {
    console.warn('MongoDB operations are not available in browser');
  }
  
  async connect() {
    console.warn('MongoDB connect called in browser - no operation performed');
  }
  
  async close() {
    console.warn('MongoDB close called in browser - no operation performed');
  }
  
  db(name: string) {
    return {
      collection: () => ({
        find: () => ({ toArray: async () => [] }),
        findOne: async () => null,
        insertOne: async () => ({ acknowledged: false }),
        updateOne: async () => ({ acknowledged: false }),
        deleteOne: async () => ({ acknowledged: false }),
        createIndexes: async () => {},
      }),
      admin: () => ({
        ping: async () => ({}),
      }),
      stats: async () => ({}),
    };
  }
}

export class Db {}
export class Collection {}

export default { MongoClient, Db, Collection };