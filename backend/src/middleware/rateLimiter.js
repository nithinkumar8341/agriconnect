import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

// keyGenerator is optional: the default limits per IP; logged-in features can limit per user.
export function createRateLimiter({ windowMs, max, skip, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip,
    ...(keyGenerator && { keyGenerator }),
    handler: (req, res, next) => {
      next(
        new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.'),
      );
    },
  });
}
