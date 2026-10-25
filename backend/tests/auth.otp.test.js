import request from 'supertest';
import { OtpRequest } from '../src/models/OtpRequest.js';
import { User } from '../src/models/User.js';
import {
  clearAuthCollections,
  createAuthTestApp,
  getRefreshSetCookie,
  loginWithOtp,
  requestOtp,
} from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';

const PHONE = '9876543210';
const NORMALIZED = '+919876543210';

async function backdateOtps(phone, ms) {
  const rows = await OtpRequest.find({ phone }).lean();
  // Raw driver update: Mongoose treats createdAt as immutable.
  await Promise.all(
    rows.map((row) =>
      OtpRequest.collection.updateOne(
        { _id: row._id },
        { $set: { createdAt: new Date(row.createdAt.getTime() - ms) } },
      ),
    ),
  );
}

describe('POST /api/v1/auth/otp/request', () => {
  let app;
  let sms;

  beforeAll(() => connectTestDb('auth-otp-request-test'));
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await clearAuthCollections();
    ({ app, sms } = createAuthTestApp());
  });

  it('sends a 6-digit code in Telugu by default and reports the timings', async () => {
    const res = await request(app).post('/api/v1/auth/otp/request').send({ phone: PHONE });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ expiresInSeconds: 300, resendAfterSeconds: 30 });
    expect(sms.messages).toHaveLength(1);
    expect(sms.messages[0].to).toBe(NORMALIZED);
    expect(sms.messages[0].message).toMatch(/\d{6}/);
    expect(sms.messages[0].message).toMatch(/[ఀ-౿]/);
  });

  it('uses the requested language for a new number and the saved language for a known one', async () => {
    await request(app).post('/api/v1/auth/otp/request').send({ phone: PHONE, language: 'en' });
    await User.create({ phone: '+919000000001', language: 'hi' });
    await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ phone: '9000000001', language: 'en' });

    expect(sms.messages[0].message).toMatch(/AgriConnect login code/);
    expect(sms.messages[1].message).toMatch(/[ऀ-ॿ]/);
  });

  it('stores only an HMAC of the code', async () => {
    const otp = await requestOtp(app, sms, PHONE);
    const row = await OtpRequest.findOne({ phone: NORMALIZED }).lean();

    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(otp);
  });

  it('rejects an invalid phone number', async () => {
    const res = await request(app).post('/api/v1/auth/otp/request').send({ phone: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { field: 'body.phone', message: 'must be a valid 10-digit Indian mobile number' },
    ]);
  });

  it('enforces a 30-second resend cooldown', async () => {
    await requestOtp(app, sms, PHONE);
    const res = await request(app).post('/api/v1/auth/otp/request').send({ phone: PHONE });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_COOLDOWN');
    expect(res.body.error.details.retryAfterSeconds).toBeGreaterThan(25);
    expect(sms.messages).toHaveLength(1);
  });

  it('allows a resend once the cooldown has passed', async () => {
    await requestOtp(app, sms, PHONE);
    await backdateOtps(NORMALIZED, 31_000);

    const res = await request(app).post('/api/v1/auth/otp/request').send({ phone: PHONE });

    expect(res.status).toBe(202);
  });

  it('caps each phone at 5 codes per hour', async () => {
    for (let i = 0; i < 5; i += 1) {
      await requestOtp(app, sms, PHONE);
      await backdateOtps(NORMALIZED, 31_000);
    }

    const res = await request(app).post('/api/v1/auth/otp/request').send({ phone: PHONE });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_LIMIT_REACHED');
  });

  it('limits one IP to 10 code requests per 15 minutes across different numbers', async () => {
    for (let i = 0; i < 10; i += 1) {
      await requestOtp(app, sms, `90000000${String(i).padStart(2, '0')}`);
    }

    const res = await request(app).post('/api/v1/auth/otp/request').send({ phone: '9111111111' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('returns 503 when the SMS fails and does not start the cooldown', async () => {
    sms.failNext = true;
    const failed = await request(app).post('/api/v1/auth/otp/request').send({ phone: PHONE });
    const retried = await request(app).post('/api/v1/auth/otp/request').send({ phone: PHONE });

    expect(failed.status).toBe(503);
    expect(failed.body.error.code).toBe('SMS_FAILED');
    expect(retried.status).toBe(202);
  });

  it('uses the dev fixed OTP when configured', async () => {
    ({ app, sms } = createAuthTestApp({ DEV_FIXED_OTP: '123456' }));

    const otp = await requestOtp(app, sms, PHONE);
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: PHONE, otp: '123456' });

    expect(otp).toBe('123456');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/auth/otp/verify', () => {
  let app;
  let sms;

  beforeAll(() => connectTestDb('auth-otp-verify-test'));
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await clearAuthCollections();
    ({ app, sms } = createAuthTestApp());
  });

  it('creates a new user without a role and starts a session', async () => {
    const { res } = await loginWithOtp(app, sms, PHONE, { language: 'en' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      isNewUser: true,
      user: expect.objectContaining({ phone: NORMALIZED, role: null, language: 'en' }),
    });
    expect(res.body).not.toHaveProperty('refreshToken');
    expect(await User.countDocuments({ phone: NORMALIZED })).toBe(1);
  });

  it('sets the refresh token as an httpOnly, Secure, SameSite=Strict cookie scoped to auth routes', async () => {
    const { res } = await loginWithOtp(app, sms, PHONE);
    const cookie = getRefreshSetCookie(res);

    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookie).toMatch(/Max-Age=2592000/);
  });

  it('uses a browser-session cookie when the device should not be remembered', async () => {
    const { res } = await loginWithOtp(app, sms, PHONE, { rememberDevice: false });

    expect(getRefreshSetCookie(res)).not.toMatch(/Max-Age|Expires/);
  });

  it('logs in a returning farmer with their existing role', async () => {
    await User.create({ phone: NORMALIZED, role: 'farmer' });

    const { res } = await loginWithOtp(app, sms, PHONE);

    expect(res.body.isNewUser).toBe(false);
    expect(res.body.user.role).toBe('farmer');
    expect((await User.findOne({ phone: NORMALIZED })).lastLoginAt).toBeInstanceOf(Date);
  });

  it('counts wrong codes and locks the code after 5', async () => {
    const otp = await requestOtp(app, sms, PHONE);
    const wrong = otp === '000000' ? '111111' : '000000';
    const verify = (code) =>
      request(app).post('/api/v1/auth/otp/verify').send({ phone: PHONE, otp: code });

    const first = await verify(wrong);
    expect(first.status).toBe(400);
    expect(first.body.error).toMatchObject({ code: 'OTP_INVALID', details: { attemptsLeft: 4 } });

    for (let i = 0; i < 3; i += 1) await verify(wrong);
    const fifth = await verify(wrong);
    expect(fifth.status).toBe(429);
    expect(fifth.body.error.code).toBe('OTP_LOCKED');

    const correctAfterLock = await verify(otp);
    expect(correctAfterLock.status).toBe(429);
    expect(correctAfterLock.body.error.code).toBe('OTP_LOCKED');
  });

  it('never allows more than 5 attempts, even with parallel guesses', async () => {
    await requestOtp(app, sms, PHONE);

    await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        request(app)
          .post('/api/v1/auth/otp/verify')
          .send({ phone: PHONE, otp: String(100000 + i) }),
      ),
    );

    expect((await OtpRequest.findOne({ phone: NORMALIZED })).attempts).toBe(5);
  });

  it('rejects an expired code', async () => {
    const otp = await requestOtp(app, sms, PHONE);
    await OtpRequest.updateMany({ phone: NORMALIZED }, { expiresAt: new Date(Date.now() - 1000) });

    const res = await request(app).post('/api/v1/auth/otp/verify').send({ phone: PHONE, otp });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_EXPIRED');
  });

  it('accepts each code only once', async () => {
    const otp = await requestOtp(app, sms, PHONE);
    await request(app).post('/api/v1/auth/otp/verify').send({ phone: PHONE, otp }).expect(200);

    const replay = await request(app).post('/api/v1/auth/otp/verify').send({ phone: PHONE, otp });

    expect(replay.status).toBe(400);
    expect(replay.body.error.code).toBe('OTP_NOT_FOUND');
  });

  it('invalidates the previous code when a new one is requested', async () => {
    const firstOtp = await requestOtp(app, sms, PHONE);
    await backdateOtps(NORMALIZED, 31_000);
    const secondOtp = await requestOtp(app, sms, PHONE);

    if (firstOtp !== secondOtp) {
      const old = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ phone: PHONE, otp: firstOtp });
      expect(old.body.error.code).toBe('OTP_INVALID');
    }
    const current = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: PHONE, otp: secondOtp });
    expect(current.status).toBe(200);
  });

  it('rejects a verify for a number that was never sent a code', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: PHONE, otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_NOT_FOUND');
  });

  it('refuses suspended accounts', async () => {
    await User.create({ phone: NORMALIZED, role: 'buyer', status: 'suspended' });

    const { res } = await loginWithOtp(app, sms, PHONE);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    expect(getRefreshSetCookie(res)).toBeUndefined();
  });

  it('validates the code format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: PHONE, otp: '12ab' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('body.otp');
  });
});
