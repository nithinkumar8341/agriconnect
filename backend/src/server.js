import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const logger = createLogger(config);

createApp(config, logger).listen(config.port, () => {
  logger.info(`AgriConnect backend listening on http://localhost:${config.port}`);
});
