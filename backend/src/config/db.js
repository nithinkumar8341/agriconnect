import mongoose from 'mongoose';

// Reject filter fields that are not in the schema instead of silently matching everything.
mongoose.set('strictQuery', true);

export async function connectDb(uri, logger) {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info('MongoDB connected');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
