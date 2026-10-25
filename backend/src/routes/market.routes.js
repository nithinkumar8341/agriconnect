import { Router } from 'express';
import * as market from '../controllers/market.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  marketIdParams,
  marketLocationQuery,
  nearbyQuerySchema,
} from '../validators/market.validators.js';

// What buyers browse: listings from farmers who can deliver to them, the listing detail, and a
// farmer's public page. Never exposes a farm's coordinates, only whole-kilometre distances.
export function createMarketRouter({ requireAuth }) {
  const router = Router();
  const buyer = [requireAuth, requireRole('buyer')];
  const byId = [validate({ params: marketIdParams, query: marketLocationQuery })];

  router.get('/products', ...buyer, validate({ query: nearbyQuerySchema }), market.nearby);
  router.get('/products/:id', ...buyer, ...byId, market.product);
  router.get('/farmers/:id', ...buyer, ...byId, market.farmer);
  return router;
}

export const nearbyRoute = (requireAuth) => [
  requireAuth,
  requireRole('buyer'),
  validate({ query: nearbyQuerySchema }),
  market.nearby,
];
