import { ConfigError, loadConfig } from '../src/config/env.js';

const validEnv = {
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://localhost:27017/agriconnect',
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
