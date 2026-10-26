import { Router } from 'express';
import { getDashboard, getEarnings, getMyProducts } from '../controllers/farmer.controller.js';
import { ordersQuerySchema } from '../validators/checkout.validators.js';
import * as products from '../controllers/products.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { nearbyRoute } from './market.routes.js';
import { myProductsQuerySchema } from '../validators/farmer.validators.js';
import {
  createProductSchema,
  duplicateSchema,
  lastPriceQuery,
  productIdParams,
  statusSchema,
  updateProductSchema,
} from '../validators/products.validators.js';

// Farmer-only reads of the farmer's own data; the farmer id always comes from the token.
export function createFarmerRouter({ requireAuth }) {
  const router = Router();
  router.get('/dashboard', requireAuth, requireRole('farmer'), getDashboard);
  router.get(
    '/earnings',
    requireAuth,
    requireRole('farmer'),
    validate({ query: ordersQuerySchema }),
    getEarnings,
  );
  return router;
}

// A farmer's own listings. Every write is scoped to the farmer from the token, so another
// farmer's listing answers 404 exactly like a missing one. (Agents act for farmers in Prompt 15.)
export function createProductsRouter({ requireAuth }) {
  const router = Router();
  const farmer = [requireAuth, requireRole('farmer')];
  const params = validate({ params: productIdParams });

  // The prompt-pack name for the buyer search; same handler as GET /market/products.
  router.get('/nearby', ...nearbyRoute(requireAuth));
  router.get('/mine', ...farmer, validate({ query: myProductsQuerySchema }), getMyProducts);
  router.get('/last-price', ...farmer, validate({ query: lastPriceQuery }), products.getLastPrice);
  router.post('/', ...farmer, validate({ body: createProductSchema }), products.create);
  router.get('/:id', ...farmer, params, products.getOne);
  router.patch('/:id', ...farmer, params, validate({ body: updateProductSchema }), products.update);
  router.post(
    '/:id/status',
    ...farmer,
    params,
    validate({ body: statusSchema }),
    products.setStatus,
  );
  router.post(
    '/:id/duplicate',
    ...farmer,
    params,
    validate({ body: duplicateSchema }),
    products.duplicate,
  );
  router.delete('/:id', ...farmer, params, products.remove);
  return router;
}
