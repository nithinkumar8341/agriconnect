import { loadConfig } from '../../src/config/env.js';

export const TEST_SECRETS = {
  JWT_ACCESS_SECRET: 'test-jwt-access-secret-at-least-32-characters',
  OTP_HMAC_SECRET: 'test-otp-hmac-secret-at-least-32-characters!',
};

export function testConfig(overrides = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI: process.env.MONGO_TEST_URI ?? 'mongodb://localhost:27017/agriconnect-test',
    CORS_ORIGINS: 'http://localhost:5173',
    ...TEST_SECRETS,
    ...overrides,
  });
}
