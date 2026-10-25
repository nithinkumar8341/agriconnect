import { Router } from 'express';
import { getCrop, getCrops } from '../controllers/crops.controller.js';
import { validate } from '../middleware/validate.js';
import { cropSlugParamsSchema, listCropsQuerySchema } from '../validators/crops.validators.js';

// Public: the catalog is not private and buyers need it before logging in.
export function createCropsRouter() {
  const router = Router();
  router.get('/', validate({ query: listCropsQuerySchema }), getCrops);
  router.get('/:slug', validate({ params: cropSlugParamsSchema }), getCrop);
  return router;
}
