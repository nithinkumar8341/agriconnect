import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { startMediaCleanupJob } from './jobs/mediaCleanup.js';
import { createMediaService } from './services/media.service.js';
import { createStorage } from './services/storage/index.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const logger = createLogger(config);

try {
  await connectDb(config.mongodbUri, logger);
} catch (err) {
  logger.fatal({ err }, 'Could not connect to MongoDB');
  process.exit(1);
}

const storage = createStorage(config.storage);
const server = createApp(config, { logger, storage }).listen(config.port, () => {
  logger.info(`AgriConnect backend listening on http://localhost:${config.port}`);
});
startMediaCleanupJob({ mediaService: createMediaService({ storage, logger }), logger });

let shuttingDown = false;

// Stop accepting new requests, let in-flight ones finish, then close the database.
// Hosts like Render send SIGTERM on every deploy, so this runs often in production.
function shutdown(reason, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down');

  setTimeout(() => {
    logger.error('Shutdown timed out; forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  server.close(async () => {
    await disconnectDb();
    logger.info('Shutdown complete');
    process.exit(exitCode);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM', 0));
process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});
