import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { createErrorHandler } from '../src/middleware/errorHandler.js';
import { requestId } from '../src/middleware/requestId.js';
import { AppError } from '../src/utils/AppError.js';
import { testConfig } from './helpers/testConfig.js';

// A minimal app with routes that throw, so the handler can be tested without adding test routes to src/.
function appThatThrows({ isProduction }) {
  const app = express();
  app.use(requestId);
  app.get('/boom', () => {
    throw new Error('connection string mongodb://admin:secret@db leaked');
  });
  app.get('/async-boom', async () => {
    throw new Error('async failure');
  });
  app.get('/app-error', () => {
    throw new AppError(409, 'ALREADY_EXISTS', 'That item already exists');
  });
  app.get('/zod-error', () => {
    z.object({ quantity: z.number() }).parse({ quantity: 'ten' });
  });
  app.use(createErrorHandler({ isProduction }));
  return app;
}

describe('error responses', () => {
  const app = createApp(testConfig());

  it('returns a standard 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Route GET /api/v1/does-not-exist not found',
    });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('returns 400 INVALID_JSON for a malformed body', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 PAYLOAD_TOO_LARGE when the body exceeds the limit', async () => {
    const smallLimitApp = createApp(testConfig({ JSON_BODY_LIMIT: '1kb' }));
    const res = await request(smallLimitApp)
      .post('/api/v1/anything')
      .send({ notes: 'x'.repeat(2048) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('passes AppError status, code and message through', async () => {
    const res = await request(appThatThrows({ isProduction: true })).get('/app-error');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'ALREADY_EXISTS',
      message: 'That item already exists',
    });
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with field details', async () => {
    const res = await request(appThatThrows({ isProduction: true })).get('/zod-error');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'quantity', message: expect.any(String) }]);
  });

  it('hides the message and stack of unexpected errors in production', async () => {
    const res = await request(appThatThrows({ isProduction: true })).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        requestId: expect.any(String),
      },
    });
    expect(res.text).not.toContain('secret');
    expect(res.text).not.toMatch(/at .+\.js:\d+/);
  });

  it('catches errors from async handlers', async () => {
    const res = await request(appThatThrows({ isProduction: true })).get('/async-boom');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('shows the message, but still no stack, outside production', async () => {
    const res = await request(appThatThrows({ isProduction: false })).get('/async-boom');

    expect(res.body.error.message).toBe('async failure');
    expect(res.body.error.stack).toBeUndefined();
  });
});
