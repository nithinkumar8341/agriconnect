import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/v1/hello', () => {
  it('returns a greeting from the backend', async () => {
    const res = await request(createApp()).get('/api/v1/hello');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ service: 'backend', message: 'Hello from AgriConnect' });
  });
});
