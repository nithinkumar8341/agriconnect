import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { createRequireAuth } from '../middleware/auth.js';
import { createAuthService } from '../services/auth.service.js';
import { createOtpService } from '../services/otp.service.js';
import { createSessionService } from '../services/session.service.js';
import { createAuthRouter } from './auth.routes.js';
import { createCropsRouter } from './crops.routes.js';
import { createFarmerRouter, createProductsRouter } from './farmer.routes.js';
import { healthRouter } from './health.routes.js';
import { createLocationsRouter, createProfileRouter, createUsersRouter } from './profile.routes.js';

// Services are built here from injected dependencies (config, logger, SMS provider), so tests can
// swap the SMS provider for a fake that records messages.
export function createApiRouter({ config, logger, smsProvider }) {
  const sessionService = createSessionService({ config, logger });
  const otpService = createOtpService({ config, smsProvider, logger });
  const authService = createAuthService({ otpService, sessionService, logger });
  const requireAuth = createRequireAuth(sessionService);

  const authController = createAuthController({ config, otpService, authService, sessionService });

  const router = Router();
  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter({ controller: authController, requireAuth }));
  router.use('/profile', createProfileRouter({ requireAuth }));
  router.use('/users', createUsersRouter({ requireAuth }));
  router.use('/locations', createLocationsRouter());
  router.use('/crops', createCropsRouter());
  router.use('/farmer', createFarmerRouter({ requireAuth }));
  router.use('/products', createProductsRouter({ requireAuth }));
  return router;
}
