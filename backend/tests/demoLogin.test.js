import request from 'supertest';
import { User } from '../src/models/User.js';
import { createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';

describe('demo login (DEMO_OTP)', () => {
  beforeAll(async () => {
    await connectTestDb('demo-login-test');
    await User.create({ phone: '+919999900011', role: 'farmer', isDemo: true });
    await User.create({ phone: '+919812345678', role: 'buyer' });
  });
  afterAll(() => dropTestDbAndDisconnect());

  it('lets a seeded demo account sign in with the demo code and sends no SMS', async () => {
    const { app, sms } = createAuthTestApp({ DEMO_OTP: '246810' });
    await request(app).post('/api/v1/auth/otp/request').send({ phone: '9999900011' }).expect(202);
    expect(sms.messages).toHaveLength(0);

    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '9999900011', otp: '246810' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('never accepts the demo code for a real account', async () => {
    const { app, sms } = createAuthTestApp({ DEMO_OTP: '246810' });
    await request(app).post('/api/v1/auth/otp/request').send({ phone: '9812345678' }).expect(202);
    expect(sms.messages).toHaveLength(1);

    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '9812345678', otp: '246810' });
    expect(res.status).toBe(400);
  });
});
