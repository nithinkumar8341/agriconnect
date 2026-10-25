import { loadConfig } from '../../src/config/env.js';

export function testConfig(overrides = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI: process.env.MONGO_TEST_URI ?? 'mongodb://localhost:27017/agriconnect-test',
    CORS_ORIGINS: 'http://localhost:5173',
    ...overrides,
  });
}
