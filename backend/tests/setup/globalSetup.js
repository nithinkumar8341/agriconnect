import { MongoMemoryReplSet } from 'mongodb-memory-server';

// One in-memory replica set for the whole run. A replica set (not a standalone server)
// is required for multi-document transactions, which checkout relies on.
export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  globalThis.__MONGO_REPLSET__ = replSet;
  process.env.MONGO_TEST_URI = replSet.getUri();
}
