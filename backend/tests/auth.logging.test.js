import { Writable } from 'node:stream';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/config/logger.js';
import { OtpRequest } from '../src/models/OtpRequest.js';
import { User } from '../src/models/User.js';
import { clearAuthCollections, FakeSmsProvider, refreshCookieFrom } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

// CLAUDE.md rule: never log OTPs, tokens, PINs or full phone numbers. This runs every auth flow
// with logging at its most verbose level and searches the captured output for each secret.
describe('auth logging', () => {
  beforeAll(() => connectTestDb('auth-logging-test'));
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(() => clearAuthCollections());

  it('never writes OTPs, PINs, tokens or full phone numbers to the logs', async () => {
    let logs = '';
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs += chunk;
        callback();
      },
    });
    const config = testConfig({ LOG_LEVEL: 'trace' });
    const sms = new FakeSmsProvider();
    const app = createApp(config, { logger: createLogger(config, stream), smsProvider: sms });
    const secrets = [];

    // Buyer: request, a wrong guess, verify, me, choose role, refresh, logout.
    const buyerPhone = '9876543210';
    await request(app).post('/api/v1/auth/otp/request').send({ phone: buyerPhone });
    const buyerOtp = sms.lastOtpFor(buyerPhone);
    await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: buyerPhone, otp: buyerOtp === '999999' ? '888888' : '999999' });
    const login = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: buyerPhone, otp: buyerOtp });
    const accessToken = login.body.accessToken;
    const cookie = refreshCookieFrom(login);
    await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    const roleRes = await request(app)
      .post('/api/v1/auth/role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'buyer' });
    const refreshed = await request(app).post('/api/v1/auth/token/refresh').set('Cookie', cookie);
    await request(app).post('/api/v1/auth/token/refresh').set('Cookie', cookie);
    await request(app).post('/api/v1/auth/logout').set('Cookie', refreshCookieFrom(refreshed));
    secrets.push(
      buyerOtp,
      accessToken,
      roleRes.body.accessToken,
      refreshed.body.accessToken,
      cookie.split('=')[1],
      refreshCookieFrom(refreshed).split('=')[1],
    );

    // Agent: OTP then a wrong and a right PIN.
    const agentPhone = '9123456780';
    const pin = '2468';
    await User.create({
      phone: '+919123456780',
      role: 'agent',
      pinHash: await bcrypt.hash(pin, 4),
    });
    await request(app).post('/api/v1/auth/otp/request').send({ phone: agentPhone });
    const agentOtp = sms.lastOtpFor(agentPhone);
    const pinStep = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: agentPhone, otp: agentOtp });
    await request(app)
      .post('/api/v1/auth/pin/verify')
      .send({ pinToken: pinStep.body.pinToken, pin: '1357' });
    const agentLogin = await request(app)
      .post('/api/v1/auth/pin/verify')
      .send({ pinToken: pinStep.body.pinToken, pin });
    secrets.push(agentOtp, pinStep.body.pinToken, agentLogin.body.accessToken);

    // A failed SMS takes the error-logging path, which mentions the phone.
    await OtpRequest.deleteMany({});
    sms.failNext = true;
    await request(app).post('/api/v1/auth/otp/request').send({ phone: buyerPhone });

    expect(logs.length).toBeGreaterThan(1000);
    expect(logs).toContain('Refresh token reuse detected');
    expect(logs).toContain('+91******3210');
    for (const secret of secrets) {
      expect(secret).toEqual(expect.any(String));
      expect(logs).not.toContain(secret);
    }
    for (const digits of ['9876543210', '9123456780', '1357', '2468']) {
      expect(logs).not.toContain(digits);
    }
  });
});
