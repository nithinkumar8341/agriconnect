import { Router } from 'express';
import * as orders from '../controllers/orders.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  checkoutSchema,
  closeOrderSchema,
  orderIdParams,
  ordersQuerySchema,
  quoteSchema,
} from '../validators/checkout.validators.js';

// Checkout: a quote re-checks the cart on the server; placing orders reserves stock atomically.
export function createCheckoutRouter({ requireAuth }) {
  const router = Router();
  const buyer = [requireAuth, requireRole('buyer')];
  router.post('/quote', ...buyer, validate({ body: quoteSchema }), orders.quote);
  router.post('/', ...buyer, validate({ body: checkoutSchema }), orders.placeOrder);
  return router;
}

export function createOrdersRouter({ requireAuth }) {
  const router = Router();
  const buyer = [requireAuth, requireRole('buyer')];
  const params = validate({ params: orderIdParams });
  const close = validate({ params: orderIdParams, body: closeOrderSchema });

  router.get('/mine', ...buyer, validate({ query: ordersQuerySchema }), orders.mine);
  router.get('/:id', ...buyer, params, orders.getOne);
  router.post('/:id/cancel', ...buyer, close, orders.cancel);
  // The farmer's full order screens come in Prompt 11; rejecting already restores stock.
  router.post('/:id/reject', requireAuth, requireRole('farmer'), close, orders.reject);
  return router;
}
