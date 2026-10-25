import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sanitizeRequest, stripUnsafeKeys } from '../src/middleware/sanitize.js';
import { testConfig } from './helpers/testConfig.js';

describe('stripUnsafeKeys', () => {
  it('removes operator and dotted keys at every depth, including inside arrays', () => {
    const input = {
      phone: { $ne: null },
      'profile.role': 'admin',
      items: [{ qty: 1, $where: 'sleep(1000)' }],
      name: 'Ramu',
    };

    expect(stripUnsafeKeys(input)).toEqual({ phone: {}, items: [{ qty: 1 }], name: 'Ramu' });
  });

  it('leaves primitives and safe objects unchanged', () => {
    expect(stripUnsafeKeys('9876543210')).toBe('9876543210');
    expect(stripUnsafeKeys(null)).toBeNull();
    expect(stripUnsafeKeys({ a: { b: [1, 2] } })).toEqual({ a: { b: [1, 2] } });
  });
});

describe('sanitizeRequest middleware', () => {
  function echoApp(queryParser) {
    const app = express();
    if (queryParser) app.set('query parser', queryParser);
    app.use(express.json());
    app.use(sanitizeRequest);
    app.post('/echo', (req, res) => res.json({ body: req.body, query: req.query }));
    return app;
  }

  it('strips operators from the JSON body', async () => {
    const res = await request(echoApp())
      .post('/echo')
      .send({ phone: { $gt: '' } });

    expect(res.body.body).toEqual({ phone: {} });
  });

  it('strips operators from nested query strings if the extended parser is ever enabled', async () => {
    const res = await request(echoApp('extended')).post('/echo?phone[$ne]=x&page=2');

    expect(res.body.query).toEqual({ phone: {}, page: '2' });
  });
});

describe('request id', () => {
  const app = createApp(testConfig());

  it('generates an id when none is sent', async () => {
    const res = await request(app).get('/api/v1/unknown');

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses a safe incoming id', async () => {
    const res = await request(app).get('/api/v1/unknown').set('X-Request-Id', 'proxy-abc-12345');

    expect(res.headers['x-request-id']).toBe('proxy-abc-12345');
  });

  it('replaces an unsafe incoming id', async () => {
    const res = await request(app)
      .get('/api/v1/unknown')
      .set('X-Request-Id', 'bad id {"level":"fatal"}');

    expect(res.headers['x-request-id']).not.toContain('fatal');
  });
});

describe('CORS', () => {
  const app = createApp(testConfig());

  it('allows a listed origin with credentials', async () => {
    const res = await request(app).get('/api/v1/unknown').set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not send CORS headers to an unlisted origin', async () => {
    const res = await request(app).get('/api/v1/unknown').set('Origin', 'https://evil.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('security headers', () => {
  it('sets helmet headers and hides the framework', async () => {
    const res = await request(createApp(testConfig())).get('/api/v1/unknown');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('rate limiter', () => {
  it('returns 429 RATE_LIMITED in the standard shape once the limit is hit', async () => {
    const app = createApp(testConfig({ RATE_LIMIT_MAX: '2' }));

    await request(app).get('/api/v1/unknown');
    await request(app).get('/api/v1/unknown');
    const res = await request(app).get('/api/v1/unknown');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('never throttles the health check', async () => {
    const app = createApp(testConfig({ RATE_LIMIT_MAX: '1' }));

    await request(app).get('/api/v1/health');
    const res = await request(app).get('/api/v1/health');

    expect(res.status).not.toBe(429);
  });
});
