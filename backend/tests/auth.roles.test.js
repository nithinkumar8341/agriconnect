import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { createLogger } from '../src/config/logger.js';
import { createRequireAuth, requireOwnership, requireRole } from '../src/middleware/auth.js';
import { createErrorHandler } from '../src/middleware/errorHandler.js';
import { OtpRequest } from '../src/models/OtpRequest.js';
import { User } from '../src/models/User.js';
import { createSessionService } from '../src/services/session.service.js';
import { clearAuthCollections, createAuthTestApp, loginWithOtp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const PHONE = '9876543210';
const Note = mongoose.model('GuardTestNote', new mongoose.Schema({ userId: mongoose.ObjectId }));

describe('POST /auth/role', () => {
  let app;
  let sms;
  const chooseRole = (token, role) =>
    request(app).post('/api/v1/auth/role').set('Authorization', `Bearer ${token}`).send({ role });

  beforeAll(() => connectTestDb('auth-role-test'));
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await clearAuthCollections();
    ({ app, sms } = createAuthTestApp());
  });

  it('lets a new user become a farmer and returns a token carrying the role', async () => {
    const { accessToken } = await loginWithOtp(app, sms, PHONE);

    const res = await chooseRole(accessToken, 'farmer');

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('farmer');
    const payload = JSON.parse(Buffer.from(res.body.accessToken.split('.')[1], 'base64url'));
    expect(payload.role).toBe('farmer');
  });

  it('allows the role to be chosen only once', async () => {
    const { accessToken } = await loginWithOtp(app, sms, PHONE);
    await chooseRole(accessToken, 'buyer');

    const res = await chooseRole(accessToken, 'farmer');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROLE_ALREADY_SET');
    expect((await User.findOne({ phone: '+919876543210' })).role).toBe('buyer');
  });

  it('only one of two simultaneous role choices wins', async () => {
    const { accessToken } = await loginWithOtp(app, sms, PHONE);

    const results = await Promise.all([
      chooseRole(accessToken, 'farmer'),
      chooseRole(accessToken, 'buyer'),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it.each(['agent', 'admin', 'superuser'])('refuses to self-assign %s', async (role) => {
    const { accessToken } = await loginWithOtp(app, sms, PHONE);

    const res = await chooseRole(accessToken, role);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toEqual({
      field: 'body.role',
      message: 'must be farmer or buyer',
    });
    expect((await User.findOne({ phone: '+919876543210' })).role).toBeNull();
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/auth/role').send({ role: 'farmer' });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout-all', () => {
  let app;
  let sms;
  const me = (token) => request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
  const refresh = (cookie) => request(app).post('/api/v1/auth/token/refresh').set('Cookie', cookie);

  beforeAll(() => connectTestDb('auth-logout-all-test'));
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await clearAuthCollections();
    ({ app, sms } = createAuthTestApp());
  });

  it('ends every session and invalidates access tokens already issued', async () => {
    const deviceA = await loginWithOtp(app, sms, PHONE);
    await OtpRequest.deleteMany({});
    const deviceB = await loginWithOtp(app, sms, PHONE);

    const res = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${deviceA.accessToken}`);

    expect(res.status).toBe(204);
    for (const device of [deviceA, deviceB]) {
      expect((await refresh(device.cookie)).status).toBe(401);
      const meRes = await me(device.accessToken);
      expect(meRes.status).toBe(401);
      expect(meRes.body.error.code).toBe('TOKEN_REVOKED');
    }
  });

  it('lets the user log in again straight away', async () => {
    const before = await loginWithOtp(app, sms, PHONE);
    await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${before.accessToken}`)
      .expect(204);
    await OtpRequest.deleteMany({});

    const after = await loginWithOtp(app, sms, PHONE);

    expect((await me(after.accessToken)).status).toBe(200);
    expect((await refresh(after.cookie)).status).toBe(200);
  });
});

describe('requireRole and requireOwnership', () => {
  const config = testConfig();
  const sessionService = createSessionService({ config, logger: createLogger(config) });
  let users;

  function guardedApp() {
    const requireAuth = createRequireAuth(sessionService);
    const loadNote = (req) =>
      mongoose.isValidObjectId(req.params.id) ? Note.findById(req.params.id) : null;
    const app = express();
    app.get('/farmer-only', requireAuth, requireRole('farmer'), (req, res) => res.json({ ok: 1 }));
    app.get('/staff-only', requireAuth, requireRole('agent', 'admin'), (req, res) =>
      res.json({ ok: 1 }),
    );
    app.get(
      '/notes/:id',
      requireAuth,
      requireOwnership(loadNote, { bypassRoles: ['admin'] }),
      (req, res) => res.json({ id: req.resource.id }),
    );
    app.use(createErrorHandler({ isProduction: true }));
    return app;
  }

  const tokenFor = (user) => sessionService.issueAccessToken(user, 'family');
  const get = (path, user) =>
    request(guardedApp())
      .get(path)
      .set('Authorization', `Bearer ${tokenFor(user)}`);

  beforeAll(async () => {
    await connectTestDb('auth-guards-test');
    const [farmer, buyer, agent, admin, newcomer] = await User.create([
      { phone: '+919000000001', role: 'farmer' },
      { phone: '+919000000002', role: 'buyer' },
      { phone: '+919000000003', role: 'agent' },
      { phone: '+919000000004', role: 'admin' },
      { phone: '+919000000005' },
    ]);
    users = { farmer, buyer, agent, admin, newcomer };
  });
  afterAll(() => dropTestDbAndDisconnect());

  it('allows a listed role', async () => {
    expect((await get('/farmer-only', users.farmer)).status).toBe(200);
    expect((await get('/staff-only', users.agent)).status).toBe(200);
    expect((await get('/staff-only', users.admin)).status).toBe(200);
  });

  it('forbids other roles', async () => {
    const res = await get('/farmer-only', users.buyer);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await get('/staff-only', users.farmer)).status).toBe(403);
  });

  it('asks users without a role to choose one', async () => {
    const res = await get('/farmer-only', users.newcomer);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_REQUIRED');
  });

  it('uses the role in the database, not the one in the token', async () => {
    const promoted = await User.create({ phone: '+919000000006', role: 'buyer' });
    const tokenFromWhenBuyer = tokenFor(promoted);
    await User.updateOne({ _id: promoted._id }, { role: 'farmer' });

    const res = await request(guardedApp())
      .get('/farmer-only')
      .set('Authorization', `Bearer ${tokenFromWhenBuyer}`);

    expect(res.status).toBe(200);
  });

  it('lets the owner see their record', async () => {
    const note = await Note.create({ userId: users.buyer._id });

    const res = await get(`/notes/${note.id}`, users.buyer);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(note.id);
  });

  it("answers 404 for someone else's record, exactly as for a missing one", async () => {
    const note = await Note.create({ userId: users.buyer._id });

    const notMine = await get(`/notes/${note.id}`, users.farmer);
    const missing = await get(`/notes/${new mongoose.Types.ObjectId()}`, users.farmer);
    const malformed = await get('/notes/not-an-id', users.farmer);

    for (const res of [notMine, missing, malformed]) {
      expect(res.status).toBe(404);
      expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Not found' });
    }
  });

  it('lets a bypass role (admin) see any record', async () => {
    const note = await Note.create({ userId: users.buyer._id });

    expect((await get(`/notes/${note.id}`, users.admin)).status).toBe(200);
  });
});
