import { Router } from 'express';
import {
  getMyProfile,
  listDistricts,
  putBuyerProfile,
  putFarmerProfile,
  updateMe,
} from '../controllers/profile.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  buyerProfileSchema,
  districtsQuerySchema,
  farmerProfileSchema,
  updateMeSchema,
} from '../validators/profile.validators.js';

// Every route works on the caller's own records: the user id comes from the token, never the body.
export function createProfileRouter({ requireAuth }) {
  const router = Router();
  router.get('/', requireAuth, getMyProfile);
  router.put(
    '/farmer',
    requireAuth,
    requireRole('farmer'),
    validate({ body: farmerProfileSchema }),
    putFarmerProfile,
  );
  router.put(
    '/buyer',
    requireAuth,
    requireRole('buyer'),
    validate({ body: buyerProfileSchema }),
    putBuyerProfile,
  );
  return router;
}

export function createUsersRouter({ requireAuth }) {
  const router = Router();
  router.patch('/me', requireAuth, validate({ body: updateMeSchema }), updateMe);
  return router;
}

export function createLocationsRouter() {
  const router = Router();
  router.get('/districts', validate({ query: districtsQuerySchema }), listDistricts);
  return router;
}
