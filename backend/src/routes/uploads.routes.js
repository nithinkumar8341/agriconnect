import { Router } from 'express';
import { createUploadsController } from '../controllers/uploads.controller.js';
import multer from 'multer';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';

// The app compresses photos to about 300 KB before sending; 8 MB leaves room for an uncompressed
// fallback while still stopping huge files before they reach memory-hungry image decoding.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOADS_PER_HOUR = 60;
const MAX_PHOTO_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
});

// Multer reports problems as its own errors; translate them into the API's error shape.
function receivePhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (!err) {
      if (!req.file) return next(new AppError(400, 'PHOTO_REQUIRED', 'Attach a photo'));
      return next();
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'PAYLOAD_TOO_LARGE', 'This photo is too large'));
    }
    return next(new AppError(400, 'INVALID_UPLOAD', 'The upload could not be read'));
  });
}

const uploadBodySchema = z.object({
  capturedAt: z.coerce
    .date()
    .refine((date) => date.getTime() <= Date.now() + 5 * 60 * 1000, 'cannot be in the future')
    .refine((date) => date.getTime() >= Date.now() - MAX_PHOTO_AGE_MS, 'is more than a year ago')
    .optional(),
});

const assetParamsSchema = z.object({ id: z.string().regex(/^[0-9a-f]{24}$/, 'is not a valid id') });

export function createUploadsRouter({ requireAuth, mediaService }) {
  const router = Router();
  const controller = createUploadsController(mediaService);
  const perUserLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: UPLOADS_PER_HOUR,
    keyGenerator: (req) => `upload:${req.user._id}`,
  });

  router.post(
    '/photos',
    requireAuth,
    requireRole('farmer', 'agent'),
    perUserLimit,
    receivePhoto,
    validate({ body: uploadBodySchema }),
    controller.uploadPhoto,
  );

  router.delete(
    '/photos/:id',
    requireAuth,
    requireRole('farmer', 'agent'),
    validate({ params: assetParamsSchema }),
    controller.deletePhoto,
  );

  return router;
}
