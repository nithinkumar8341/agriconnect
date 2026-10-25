import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    MONGODB_URI: z
      .string({ error: 'is required' })
      .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url({ error: 'must be a comma-separated list of URLs' }))),
    LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
    JSON_BODY_LIMIT: z
      .string()
      .regex(/^\d+(b|kb|mb)$/i, 'must look like 100kb or 1mb')
      .default('100kb'),
    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    // Number of reverse proxies in front of the app (1 on Render). Without it every request
    // appears to come from the proxy's IP and all users share one rate-limit bucket.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    JWT_ACCESS_SECRET: z.string({ error: 'is required' }).min(32, 'must be at least 32 characters'),
    // Keys the OTP hashes, so a leaked database alone cannot be brute-forced back to codes.
    OTP_HMAC_SECRET: z.string({ error: 'is required' }).min(32, 'must be at least 32 characters'),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    // Strict works because the frontend reaches the API same-origin (Vite proxy in dev,
    // Vercel rewrite in production). "none" would additionally need CSRF tokens.
    COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),
    SMS_PROVIDER: z.enum(['console', 'msg91']).default('console'),
    MSG91_AUTH_KEY: z.string().optional(),
    DEV_FIXED_OTP: z
      .string()
      .regex(/^\d{6}$/, 'must be exactly 6 digits')
      .optional(),
  })
  .superRefine((env, ctx) => {
    const fail = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });

    if (env.NODE_ENV === 'production') {
      if (env.CORS_ORIGINS.length === 0) fail('CORS_ORIGINS', 'is required in production');
      if (env.DEV_FIXED_OTP) fail('DEV_FIXED_OTP', 'must not be set in production');
      if (env.SMS_PROVIDER === 'console') {
        fail('SMS_PROVIDER', 'console prints OTPs to the log and is not allowed in production');
      }
    }
    if (env.SMS_PROVIDER === 'msg91' && !env.MSG91_AUTH_KEY) {
      fail('MSG91_AUTH_KEY', 'is required when SMS_PROVIDER=msg91');
    }
    if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.OTP_HMAC_SECRET) {
      fail('OTP_HMAC_SECRET', 'must differ from JWT_ACCESS_SECRET');
    }
  });

export class ConfigError extends Error {
  constructor(issues) {
    // Only variable names and rule descriptions are reported; values may be secrets.
    const lines = issues.map(
      (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    super(`Invalid environment configuration:\n${lines.join('\n')}`);
    this.name = 'ConfigError';
  }
}

export function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(result.error.issues);
  }

  const parsed = result.data;
  const defaultLogLevel = parsed.NODE_ENV === 'test' ? 'silent' : 'info';

  return Object.freeze({
    env: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === 'production',
    port: parsed.PORT,
    mongodbUri: parsed.MONGODB_URI,
    corsOrigins: parsed.CORS_ORIGINS,
    logLevel: parsed.LOG_LEVEL ?? defaultLogLevel,
    jsonBodyLimit: parsed.JSON_BODY_LIMIT,
    rateLimit: { windowMs: parsed.RATE_LIMIT_WINDOW_MS, max: parsed.RATE_LIMIT_MAX },
    trustProxy: parsed.TRUST_PROXY,
    auth: Object.freeze({
      jwtAccessSecret: parsed.JWT_ACCESS_SECRET,
      otpHmacSecret: parsed.OTP_HMAC_SECRET,
      accessTokenTtlMinutes: parsed.ACCESS_TOKEN_TTL_MINUTES,
      refreshTokenTtlDays: parsed.REFRESH_TOKEN_TTL_DAYS,
      cookieSameSite: parsed.COOKIE_SAMESITE,
      devFixedOtp: parsed.DEV_FIXED_OTP,
    }),
    sms: Object.freeze({ provider: parsed.SMS_PROVIDER, msg91AuthKey: parsed.MSG91_AUTH_KEY }),
  });
}
