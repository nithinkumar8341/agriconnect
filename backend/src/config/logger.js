import pino from 'pino';

// Field names that may carry OTPs, PINs, tokens or phone numbers anywhere in a logged object.
const SENSITIVE_FIELDS = ['otp', 'pin', 'token', 'accessToken', 'refreshToken', 'phone'];

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  ...SENSITIVE_FIELDS,
  ...SENSITIVE_FIELDS.map((field) => `*.${field}`),
];

export function createLogger(config, destination) {
  const usePretty = config.env === 'development' && !destination;

  return pino(
    {
      level: config.logLevel,
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      ...(usePretty && {
        transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } },
      }),
    },
    destination,
  );
}
