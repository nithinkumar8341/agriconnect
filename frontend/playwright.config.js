import { defineConfig, devices } from '@playwright/test';

// Smoke test of the core flow against a running app: backend on :4000 with the demo data
// (`npm run seed:demo`) and DEV_FIXED_OTP=123456, frontend on :5173 (or E2E_BASE_URL).
// PW_CHANNEL=msedge uses an installed Edge instead of downloading Chromium.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    ...devices['Pixel 7'],
    channel: process.env.PW_CHANNEL,
    trace: 'retain-on-failure',
  },
});
