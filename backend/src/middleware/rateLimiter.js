import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

export function createRateLimiter({ windowMs, max, skip }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip,
    handler: (req, res, next) => {
      next(
        new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.'),
      );
    },
  });
}
