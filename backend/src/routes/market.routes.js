import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { listFarmerReviews } from '../services/review.service.js';
import * as market from '../controllers/market.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  marketIdParams,
  marketLocationQuery,
  nearbyQuerySchema,
} from '../validators/market.validators.js';

const reviewsQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// What buyers browse: listings from farmers who can deliver to them, the listing detail, and a
// farmer's public page. Never exposes a farm's coordinates, only whole-kilometre distances.
export function createMarketRouter({ requireAuth }) {
  const router = Router();
  const buyer = [requireAuth, requireRole('buyer')];
  const byId = [validate({ params: marketIdParams, query: marketLocationQuery })];

  router.get('/products', ...buyer, validate({ query: nearbyQuerySchema }), market.nearby);
  router.get('/products/:id', ...buyer, ...byId, market.product);
  router.get('/farmers/:id', ...buyer, ...byId, market.farmer);
  router.get(
    '/farmers/:id/reviews',
    ...buyer,
    validate({ params: marketIdParams, query: reviewsQuery }),
    async (req, res) =>
      res.json(await listFarmerReviews(new mongoose.Types.ObjectId(req.params.id), req.query)),
  );
  return router;
}

export const nearbyRoute = (requireAuth) => [
  requireAuth,
  requireRole('buyer'),
  validate({ query: nearbyQuerySchema }),
  market.nearby,
];
