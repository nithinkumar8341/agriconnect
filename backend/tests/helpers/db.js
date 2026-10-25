import mongoose from 'mongoose';

// Each test file uses its own database so files running in parallel workers never share data.
export async function connectTestDb(dbName) {
  await mongoose.connect(process.env.MONGO_TEST_URI, { dbName });
}

export async function dropTestDbAndDisconnect() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
}
