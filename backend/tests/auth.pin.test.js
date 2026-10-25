import bcrypt from 'bcryptjs';
import request from 'supertest';
import { User } from '../src/models/User.js';
import {
  clearAuthCollections,
  createAuthTestApp,
  getRefreshSetCookie,
  loginWithOtp,
} from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';

const AGENT_PHONE = '9123456780';
const AGENT_NORMALIZED = '+919123456780';
const PIN = '2468';

describe('PIN step for agents and admins', () => {
  let app;
  let sms;

  const verifyPin = (pinToken, pin) =>
    request(app).post('/api/v1/auth/pin/verify').send({ pinToken, pin });
  const setupPin = (pinToken, pin) =>
    request(app).post('/api/v1/auth/pin/setup').send({ pinToken, pin });

  async function createAgent({ pin, role = 'agent', phone = AGENT_NORMALIZED } = {}) {
    // Low cost factor keeps tests fast; production uses PIN_RULES.bcryptRounds.
    return User.create({ phone, role, ...(pin && { pinHash: await bcrypt.hash(pin, 4) }) });
  }

  beforeAll(() => connectTestDb('auth-pin-test'));
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await clearAuthCollections();
    ({ app, sms } = createAuthTestApp());
  });

  it('asks an agent for their PIN after the OTP instead of starting a session', async () => {
    await createAgent({ pin: PIN });

    const { res } = await loginWithOtp(app, sms, AGENT_PHONE);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ next: 'pin', pinToken: expect.any(String) });
    expect(getRefreshSetCookie(res)).toBeUndefined();
  });

  it('starts a session after the correct PIN', async () => {
    await createAgent({ pin: PIN });
    const { res: otpRes } = await loginWithOtp(app, sms, AGENT_PHONE);

    const res = await verifyPin(otpRes.body.pinToken, PIN);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('agent');
    expect(getRefreshSetCookie(res)).toMatch(/HttpOnly/);
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.body.user.role).toBe('agent');
  });

  it('applies the same PIN step to admins', async () => {
    await createAgent({ pin: PIN, role: 'admin' });
    const { res: otpRes } = await loginWithOtp(app, sms, AGENT_PHONE);

    expect(otpRes.body.next).toBe('pin');
    expect((await verifyPin(otpRes.body.pinToken, PIN)).body.user.role).toBe('admin');
  });

  it('lets an agent without a PIN set one once, then logs them in', async () => {
    await createAgent();
    const { res: otpRes } = await loginWithOtp(app, sms, AGENT_PHONE);
    expect(otpRes.body.next).toBe('pin_setup');

    const res = await setupPin(otpRes.body.pinToken, '135790');
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));

    const stored = await User.findOne({ phone: AGENT_NORMALIZED }).select('+pinHash');
    expect(stored.pinHash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare('135790', stored.pinHash)).toBe(true);

    const again = await setupPin(otpRes.body.pinToken, '000000');
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('PIN_ALREADY_SET');
  });

  it('asks to set up a PIN before verifying one', async () => {
    await createAgent();
    const { res: otpRes } = await loginWithOtp(app, sms, AGENT_PHONE);

    const res = await verifyPin(otpRes.body.pinToken, PIN);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PIN_NOT_SET');
  });

  it('locks the PIN for 15 minutes after 5 wrong attempts, then unlocks', async () => {
    await createAgent({ pin: PIN });
    const { res: otpRes } = await loginWithOtp(app, sms, AGENT_PHONE);
    const { pinToken } = otpRes.body;

    const first = await verifyPin(pinToken, '0000');
    expect(first.status).toBe(400);
    expect(first.body.error).toMatchObject({ code: 'PIN_INVALID', details: { attemptsLeft: 4 } });

    for (let i = 0; i < 3; i += 1) await verifyPin(pinToken, '0000');
    const fifth = await verifyPin(pinToken, '0000');
    expect(fifth.status).toBe(429);
    expect(fifth.body.error.code).toBe('PIN_LOCKED');

    const correctWhileLocked = await verifyPin(pinToken, PIN);
    expect(correctWhileLocked.status).toBe(429);
    expect(correctWhileLocked.body.error.details.retryAfterSeconds).toBeGreaterThan(800);

    await User.updateOne({ phone: AGENT_NORMALIZED }, { pinLockedUntil: new Date(Date.now() - 1) });
    const afterLock = await verifyPin(pinToken, PIN);
    expect(afterLock.status).toBe(200);
    const stored = await User.findOne({ phone: AGENT_NORMALIZED }).select('+pinFailedAttempts');
    expect(stored.pinFailedAttempts).toBe(0);
  });

  it('runs at most 5 PIN comparisons even with parallel guesses', async () => {
    await createAgent({ pin: PIN });
    const { res: otpRes } = await loginWithOtp(app, sms, AGENT_PHONE);

    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => verifyPin(otpRes.body.pinToken, String(1000 + i))),
    );

    expect(results.filter((r) => r.body.error?.code === 'PIN_INVALID').length).toBeLessThanOrEqual(
      4,
    );
    expect(results.every((r) => r.status !== 200)).toBe(true);
    const stored = await User.findOne({ phone: AGENT_NORMALIZED }).select('+pinLockedUntil');
    expect(stored.pinLockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects an invalid PIN token, including an access token used in its place', async () => {
    const { accessToken } = await loginWithOtp(app, sms, '9876543210');

    for (const token of ['garbage', accessToken]) {
      const res = await verifyPin(token, PIN);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('PIN_TOKEN_INVALID');
    }
  });

  it('does not accept a PIN token as an access token', async () => {
    await createAgent({ pin: PIN });
    const { res: otpRes } = await loginWithOtp(app, sms, AGENT_PHONE);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${otpRes.body.pinToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('validates the PIN format', async () => {
    const res = await verifyPin('token', '12');

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('body.pin');
  });

  it('refuses a suspended agent at the PIN step', async () => {
    await createAgent({ pin: PIN });
    const { res: otpRes } = await loginWithOtp(app, sms, AGENT_PHONE);
    await User.updateOne({ phone: AGENT_NORMALIZED }, { status: 'suspended' });

    const res = await verifyPin(otpRes.body.pinToken, PIN);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});
