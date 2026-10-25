import { ConfigError, loadConfig } from '../src/config/env.js';
import { TEST_SECRETS } from './helpers/testConfig.js';

const validEnv = {
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://localhost:27017/agriconnect',
  ...TEST_SECRETS,
};

describe('loadConfig', () => {
  it('applies defaults for optional variables', () => {
    const config = loadConfig(validEnv);

    expect(config).toMatchObject({
      env: 'development',
      isProduction: false,
      port: 4000,
      corsOrigins: [],
      logLevel: 'info',
      jsonBodyLimit: '100kb',
      rateLimit: { windowMs: 900000, max: 300 },
      trustProxy: 0,
    });
  });

  it('splits and trims CORS_ORIGINS', () => {
    const config = loadConfig({
      ...validEnv,
      CORS_ORIGINS: 'http://localhost:5173, https://agriconnect.example ,',
    });

    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'https://agriconnect.example']);
  });

  it('coerces numeric variables from strings', () => {
    const config = loadConfig({ ...validEnv, PORT: '5000', TRUST_PROXY: '1' });

    expect(config.port).toBe(5000);
    expect(config.trustProxy).toBe(1);
  });

  it('defaults to silent logging in tests', () => {
    expect(loadConfig({ ...validEnv, NODE_ENV: 'test' }).logLevel).toBe('silent');
  });

  it('fails when MONGODB_URI is missing', () => {
    expect(() => loadConfig({ NODE_ENV: 'development' })).toThrow(/MONGODB_URI: is required/);
  });

  it('fails on a malformed MONGODB_URI without echoing its value', () => {
    const secretLookingUri = 'postgres://admin:hunter2@db';
    let error;
    try {
      loadConfig({ ...validEnv, MONGODB_URI: secretLookingUri });
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toMatch(/MONGODB_URI/);
    expect(error.message).not.toContain('hunter2');
  });

  it('reports every invalid variable at once', () => {
    expect(() => loadConfig({ ...validEnv, PORT: 'abc', CORS_ORIGINS: 'not a url' })).toThrow(
      /PORT[\s\S]*CORS_ORIGINS|CORS_ORIGINS[\s\S]*PORT/,
    );
  });

  it('requires CORS_ORIGINS in production', () => {
    expect(() => loadConfig({ ...validEnv, NODE_ENV: 'production' })).toThrow(
      /CORS_ORIGINS: is required in production/,
    );
  });
});

describe('loadConfig: authentication and SMS', () => {
  const productionEnv = {
    ...validEnv,
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://agriconnect.example',
    SMS_PROVIDER: 'msg91',
    MSG91_AUTH_KEY: 'key',
    STORAGE_PROVIDER: 'cloudinary',
    CLOUDINARY_CLOUD_NAME: 'demo',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret',
  };

  it('refuses local disk storage in production and needs all Cloudinary keys', () => {
    expect(() => loadConfig({ ...productionEnv, STORAGE_PROVIDER: 'local' })).toThrow(
      /STORAGE_PROVIDER: local disk is wiped on redeploy/,
    );
    expect(() => loadConfig({ ...productionEnv, CLOUDINARY_API_SECRET: undefined })).toThrow(
      /CLOUDINARY_API_SECRET: is required/,
    );
  });

  it('maps auth and SMS settings with defaults', () => {
    const config = loadConfig({ ...validEnv, DEV_FIXED_OTP: '123456' });

    expect(config.auth).toEqual({
      jwtAccessSecret: TEST_SECRETS.JWT_ACCESS_SECRET,
      otpHmacSecret: TEST_SECRETS.OTP_HMAC_SECRET,
      accessTokenTtlMinutes: 15,
      refreshTokenTtlDays: 30,
      cookieSameSite: 'strict',
      devFixedOtp: '123456',
    });
    expect(config.sms).toEqual({ provider: 'console', msg91AuthKey: undefined });
  });

  it('requires both secrets with at least 32 characters', () => {
    expect(() =>
      loadConfig({ ...validEnv, JWT_ACCESS_SECRET: undefined, OTP_HMAC_SECRET: 'short' }),
    ).toThrow(/JWT_ACCESS_SECRET: is required[\s\S]*OTP_HMAC_SECRET: must be at least 32/);
  });

  it('rejects reusing the JWT secret as the OTP secret', () => {
    expect(() =>
      loadConfig({ ...validEnv, OTP_HMAC_SECRET: TEST_SECRETS.JWT_ACCESS_SECRET }),
    ).toThrow(/OTP_HMAC_SECRET: must differ/);
  });

  it('accepts a valid production configuration', () => {
    expect(loadConfig(productionEnv).isProduction).toBe(true);
  });

  it('rejects the dev fixed OTP in production', () => {
    expect(() => loadConfig({ ...productionEnv, DEV_FIXED_OTP: '123456' })).toThrow(
      /DEV_FIXED_OTP: must not be set in production/,
    );
  });

  it('rejects the console SMS provider in production', () => {
    expect(() => loadConfig({ ...productionEnv, SMS_PROVIDER: 'console' })).toThrow(
      /SMS_PROVIDER: console prints OTPs/,
    );
  });

  it('requires an auth key for msg91', () => {
    expect(() => loadConfig({ ...productionEnv, MSG91_AUTH_KEY: undefined })).toThrow(
      /MSG91_AUTH_KEY: is required/,
    );
  });

  it('only accepts a 6-digit dev OTP', () => {
    expect(() => loadConfig({ ...validEnv, DEV_FIXED_OTP: '1234' })).toThrow(/DEV_FIXED_OTP/);
  });
});
