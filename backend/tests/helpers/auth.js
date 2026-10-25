import request from 'supertest';
import { createApp } from '../../src/app.js';
import { OtpRequest } from '../../src/models/OtpRequest.js';
import { Session } from '../../src/models/Session.js';
import { User } from '../../src/models/User.js';
import { normalizeIndianPhone } from '../../src/utils/phone.js';
import { REFRESH_COOKIE_NAME } from '../../src/utils/refreshCookie.js';
import { testConfig } from './testConfig.js';

// Records messages instead of sending them, so tests read the real (random) OTP like a phone would.
export class FakeSmsProvider {
  constructor() {
    this.messages = [];
    this.failNext = false;
  }

  async send(message) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('gateway unavailable');
    }
    this.messages.push(message);
  }

  lastOtpFor(phone) {
    const to = normalizeIndianPhone(phone);
    const message = this.messages.findLast((m) => m.to === to);
    return message?.message.match(/\d{6}/)?.[0];
  }
}

export function createAuthTestApp(configOverrides = {}) {
  const sms = new FakeSmsProvider();
  const app = createApp(testConfig(configOverrides), { smsProvider: sms });
  return { app, sms };
}

export function getRefreshSetCookie(res) {
  return (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
}

// Returns "agc_rt=<value>", ready to send back in a Cookie header.
export function refreshCookieFrom(res) {
  return getRefreshSetCookie(res)?.split(';')[0];
}

export async function requestOtp(app, sms, phone, body = {}) {
  await request(app)
    .post('/api/v1/auth/otp/request')
    .send({ phone, ...body })
    .expect(202);
  return sms.lastOtpFor(phone);
}

export async function loginWithOtp(app, sms, phone, body = {}) {
  const otp = await requestOtp(app, sms, phone);
  const res = await request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ phone, otp, ...body });
  return { res, accessToken: res.body.accessToken, cookie: refreshCookieFrom(res) };
}

export async function clearAuthCollections() {
  await Promise.all([User.deleteMany({}), OtpRequest.deleteMany({}), Session.deleteMany({})]);
}
