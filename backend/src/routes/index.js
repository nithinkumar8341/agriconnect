import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { createRequireAuth } from '../middleware/auth.js';
import { createAuthService } from '../services/auth.service.js';
import { createOtpService } from '../services/otp.service.js';
import { createMediaService } from '../services/media.service.js';
import { createOrderLifecycle } from '../services/orderLifecycle.service.js';
import { createSessionService } from '../services/session.service.js';
import { createAdminRouter } from './admin.routes.js';
import { createAiRouter } from './ai.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createCropsRouter } from './crops.routes.js';
import { createFarmerRouter, createProductsRouter } from './farmer.routes.js';
import { healthRouter } from './health.routes.js';
import { createMarketRouter } from './market.routes.js';
import {
  createCheckoutRouter,
  createNotificationsRouter,
  createPaymentsRouter,
  createOrdersRouter,
} from './orders.routes.js';
import { createLocationsRouter, createProfileRouter, createUsersRouter } from './profile.routes.js';
import { createUploadsRouter } from './uploads.routes.js';

// Services are built here from injected dependencies (config, logger, SMS provider, storage), so
// tests can swap in fakes (an SMS provider that records messages, a temporary upload folder).
export function createApiRouter({ config, logger, smsProvider, storage }) {
  const sessionService = createSessionService({ config, logger });
  const otpService = createOtpService({ config, smsProvider, logger });
  const authService = createAuthService({ otpService, sessionService, logger });
  const requireAuth = createRequireAuth(sessionService);
  const mediaService = createMediaService({ storage, logger });
  const lifecycle = createOrderLifecycle({ config, smsProvider, logger });

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
  router.use('/market', createMarketRouter({ requireAuth }));
  router.use('/checkout', createCheckoutRouter({ requireAuth }));
  router.use('/payments', createPaymentsRouter({ requireAuth }));
  router.use('/orders', createOrdersRouter({ requireAuth, lifecycle }));
  router.use('/notifications', createNotificationsRouter({ requireAuth }));
  router.use('/admin', createAdminRouter({ requireAuth }));
  router.use('/uploads', createUploadsRouter({ requireAuth, mediaService }));
  router.use('/ai', createAiRouter({ config, requireAuth }));
  return router;
}
