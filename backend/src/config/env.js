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
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'is required in production',
      });
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
  });
}
