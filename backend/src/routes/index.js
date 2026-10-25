import { Router } from 'express';
import { healthRouter } from './health.routes.js';

export function createApiRouter() {
  const router = Router();
  router.use('/health', healthRouter);
  return router;
}
