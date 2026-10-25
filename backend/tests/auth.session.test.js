import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { OtpRequest } from '../src/models/OtpRequest.js';
import { Session } from '../src/models/Session.js';
import { User } from '../src/models/User.js';
import {
  clearAuthCollections,
  createAuthTestApp,
  getRefreshSetCookie,
  loginWithOtp,
  refreshCookieFrom,
} from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { TEST_SECRETS } from './helpers/testConfig.js';

const PHONE = '9876543210';

describe('sessions and tokens', () => {
  let app;
  let sms;

  const refresh = (cookie) => {
    const req = request(app).post('/api/v1/auth/token/refresh');
    return cookie ? req.set('Cookie', cookie) : req;
  };
  const me = (token) => request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

  beforeAll(() => connectTestDb('auth-session-test'));
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await clearAuthCollections();
    ({ app, sms } = createAuthTestApp());
  });

  describe('GET /auth/me', () => {
    it('returns the current user for a valid access token', async () => {
      const { accessToken } = await loginWithOtp(app, sms, PHONE);

      const res = await me(accessToken);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ phone: '+919876543210', role: null });
    });

    it('requires a bearer token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('rejects a tampered or foreign token', async () => {
      const forged = jwt.sign({ role: 'admin' }, 'some-other-secret-that-is-long-enough', {
        subject: '64b000000000000000000000',
      });

      expect((await me('not-a-jwt')).body.error.code).toBe('TOKEN_INVALID');
      expect((await me(forged)).body.error.code).toBe('TOKEN_INVALID');
    });

    it('reports an expired token distinctly so the client knows to refresh', async () => {
      const user = await User.create({ phone: '+919000000001', role: 'buyer' });
      const expired = jwt.sign({ role: 'buyer', sid: 'x' }, TEST_SECRETS.JWT_ACCESS_SECRET, {
        subject: user._id.toString(),
        issuer: 'agriconnect',
        audience: 'agriconnect-api',
        expiresIn: -10,
      });

      const res = await me(expired);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects suspended users immediately, even with an unexpired token', async () => {
      const { accessToken } = await loginWithOtp(app, sms, PHONE);
      await User.updateOne({ phone: '+919876543210' }, { status: 'suspended' });

      const res = await me(accessToken);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('POST /auth/token/refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      const { cookie } = await loginWithOtp(app, sms, PHONE);

      const res = await refresh(cookie);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.phone).toBe('+919876543210');
      expect(refreshCookieFrom(res)).not.toBe(cookie);
      expect((await me(res.body.accessToken)).status).toBe(200);
    });

    it('stores refresh tokens only as SHA-256 hashes', async () => {
      const { cookie } = await loginWithOtp(app, sms, PHONE);
      const rawToken = cookie.split('=')[1];
      const sessions = await Session.find().lean();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(sessions)).not.toContain(rawToken);
    });

    it('detects reuse of a rotated token and revokes the whole session family', async () => {
      const { cookie: original } = await loginWithOtp(app, sms, PHONE);
      const rotated = refreshCookieFrom(await refresh(original));

      const replay = await refresh(original);
      expect(replay.status).toBe(401);
      expect(replay.body.error.code).toBe('REFRESH_INVALID');

      // The legitimate-looking newer token is revoked too: we cannot tell which holder is the thief.
      const afterReuse = await refresh(rotated);
      expect(afterReuse.status).toBe(401);
      expect(await Session.countDocuments({ revokedAt: null })).toBe(0);
    });

    it('leaves sessions on other devices untouched when one family is revoked', async () => {
      const { cookie: phoneA } = await loginWithOtp(app, sms, PHONE);
      // Clear the used code so the second device is not blocked by the resend cooldown.
      await OtpRequest.deleteMany({});
      const { cookie: phoneB } = await loginWithOtp(app, sms, PHONE);

      const rotatedA = refreshCookieFrom(await refresh(phoneA));
      await refresh(phoneA);

      expect((await refresh(rotatedA)).status).toBe(401);
      expect((await refresh(phoneB)).status).toBe(200);
    });

    it('ends the session when two requests race with the same token', async () => {
      const { cookie } = await loginWithOtp(app, sms, PHONE);

      const results = await Promise.all([refresh(cookie), refresh(cookie)]);

      // Documented trade-off: the client must send one refresh at a time (see ADR 0003).
      // Whatever the interleaving, at least one request is treated as reuse and no token survives.
      expect(results.some((r) => r.status === 401)).toBe(true);
      for (const winner of results.filter((r) => r.status === 200)) {
        expect((await refresh(refreshCookieFrom(winner))).status).toBe(401);
      }
      expect(await Session.countDocuments({ revokedAt: null })).toBe(0);
    });

    it('does not let a new token escape a revocation that lands mid-rotation', async () => {
      const { cookie } = await loginWithOtp(app, sms, PHONE);
      const originalCreate = Session.create.bind(Session);
      // Force the worst interleaving: reuse detection revokes the family after this request has
      // claimed the old token but before it inserts the new one.
      const spy = jest.spyOn(Session, 'create').mockImplementation(async (doc) => {
        await Session.updateMany({ familyId: doc.familyId }, { revokedAt: new Date() });
        return originalCreate(doc);
      });

      try {
        const res = await refresh(cookie);
        expect(res.status).toBe(401);
      } finally {
        spy.mockRestore();
      }
      expect(await Session.countDocuments({ revokedAt: null })).toBe(0);
    });

    it('requires the refresh cookie', async () => {
      const res = await refresh();

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('REFRESH_INVALID');
    });

    it('rejects an unknown token and clears the cookie', async () => {
      const res = await refresh('agc_rt=made-up-token');

      expect(res.status).toBe(401);
      expect(getRefreshSetCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    it('rejects an expired session', async () => {
      const { cookie } = await loginWithOtp(app, sms, PHONE);
      await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });

      expect((await refresh(cookie)).status).toBe(401);
    });

    it('revokes the session when the user has been suspended', async () => {
      const { cookie } = await loginWithOtp(app, sms, PHONE);
      await User.updateOne({ phone: '+919876543210' }, { status: 'suspended' });

      expect((await refresh(cookie)).status).toBe(401);
      expect(await Session.countDocuments({ revokedAt: null })).toBe(0);
    });

    it('keeps a not-remembered device on a browser-session cookie after rotation', async () => {
      const { cookie } = await loginWithOtp(app, sms, PHONE, { rememberDevice: false });

      const res = await refresh(cookie);

      expect(getRefreshSetCookie(res)).not.toMatch(/Max-Age/);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the session and clears the cookie', async () => {
      const { cookie } = await loginWithOtp(app, sms, PHONE);

      const res = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);

      expect(res.status).toBe(204);
      expect(getRefreshSetCookie(res)).toMatch(/agc_rt=;/);
      expect((await refresh(cookie)).status).toBe(401);
    });

    it('succeeds even without a cookie', async () => {
      expect((await request(app).post('/api/v1/auth/logout')).status).toBe(204);
    });
  });
});
