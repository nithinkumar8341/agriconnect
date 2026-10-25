import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

describe('GET /api/v1/health', () => {
  const app = createApp(testConfig());

  beforeEach(async () => {
    await connectTestDb('health-test');
  });

  afterEach(async () => {
    await dropTestDbAndDisconnect();
  });

  it('returns 200 with db up when MongoDB is reachable', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up', uptimeSeconds: expect.any(Number) });
  });

  it('returns 503 with db down when MongoDB is disconnected', async () => {
    await mongoose.disconnect();

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'down' });
  });
});
