import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { createLogger } from './config/logger.js';
import { createErrorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { requestId } from './middleware/requestId.js';
import { sanitizeRequest } from './middleware/sanitize.js';
import { createApiRouter } from './routes/index.js';

function httpLogLevel(req, res, err) {
  if (err || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}

// Building the app separately from server.js lets tests import it without opening a port.
export function createApp(config, logger = createLogger(config)) {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      customLogLevel: httpLogLevel,
      // Query strings and bodies are never logged: they can contain phone numbers and OTPs.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      // Requests without an Origin header (curl, server-to-server) are not subject to CORS.
      origin: (origin, callback) => callback(null, !origin || config.corsOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(
    '/api',
    createRateLimiter({
      ...config.rateLimit,
      // The host's health monitor polls every few seconds from one IP and must never be throttled.
      skip: (req) => req.path === '/v1/health',
    }),
  );
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(sanitizeRequest);

  app.use('/api/v1', createApiRouter());

  app.use(notFound);
  app.use(createErrorHandler(config));

  return app;
}
