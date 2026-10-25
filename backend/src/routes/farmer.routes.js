import { Router } from 'express';
import { getDashboard, getMyProducts } from '../controllers/farmer.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { myProductsQuerySchema } from '../validators/farmer.validators.js';

// Farmer-only reads of the farmer's own data; the farmer id always comes from the token.
export function createFarmerRouter({ requireAuth }) {
  const router = Router();
  router.get('/dashboard', requireAuth, requireRole('farmer'), getDashboard);
  return router;
}

export function createProductsRouter({ requireAuth }) {
  const router = Router();
  router.get(
    '/mine',
    requireAuth,
    requireRole('farmer'),
    validate({ query: myProductsQuerySchema }),
    getMyProducts,
  );
  return router;
}
