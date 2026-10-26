import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { UNITS } from '../models/shared.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAiService } from '../services/ai.service.js';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'invalid id');
const language = z.enum(['en', 'te', 'hi']).default('en');

export function createAiRouter({ config, requireAuth }) {
  const ai = createAiService({ config });
  const router = Router();

  router.get(
    '/price-hint',
    requireAuth,
    requireRole('farmer'),
    validate({ query: z.object({ crop: z.string().regex(/^[a-z0-9-]+$/), unit: z.enum(UNITS) }) }),
    async (req, res) =>
      res.json(
        await ai.priceHint({ farmerId: req.user._id, slug: req.query.crop, unit: req.query.unit }),
      ),
  );

  router.post(
    '/chat',
    requireAuth,
    validate({ body: z.object({ message: z.string().trim().min(1).max(500), language }) }),
    async (req, res) => res.json(await ai.chat(req.body)),
  );

  router.get(
    '/review-insights/:farmerId',
    requireAuth,
    validate({ params: z.object({ farmerId: objectId }), query: z.object({ language }) }),
    async (req, res) =>
      res.json(
        await ai.reviewInsights({
          farmerId: new mongoose.Types.ObjectId(req.params.farmerId),
          language: req.query.language,
        }),
      ),
  );

  return router;
}
