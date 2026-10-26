import { Router } from 'express';
import * as orders from '../controllers/orders.controller.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requestReturn } from '../services/return.service.js';
import { createReview } from '../services/review.service.js';
import {
  checkoutSchema,
  farmerOrdersQuerySchema,
  orderActionSchema,
  orderIdParams,
  ordersQuerySchema,
  checkoutGroupParams,
  quoteSchema,
  returnSchema,
  reviewSchema,
} from '../validators/checkout.validators.js';

const objectIdParams = orderIdParams;

// Checkout: a quote re-checks the cart on the server; placing orders reserves stock atomically.
export function createCheckoutRouter({ requireAuth }) {
  const router = Router();
  const buyer = [requireAuth, requireRole('buyer')];
  router.post('/quote', ...buyer, validate({ body: quoteSchema }), orders.quote);
  router.post('/', ...buyer, validate({ body: checkoutSchema }), orders.placeOrder);
  return router;
}

// Orders for buyers and farmers. Each action is allowed only for its role and only from the
// statuses the state machine lists (services/orderStateMachine.js); ownership is checked in the
// service, so another person's order answers 404.
export function createOrdersRouter({ requireAuth, lifecycle }) {
  const router = Router();
  const buyer = [requireAuth, requireRole('buyer')];
  const farmer = [requireAuth, requireRole('farmer')];
  const either = [requireAuth, requireRole('buyer', 'farmer')];
  const params = validate({ params: orderIdParams });
  const action = validate({ params: orderIdParams, body: orderActionSchema });
  const { getOne, act } = orders.createOrderActions(lifecycle);

  router.get('/mine', ...buyer, validate({ query: ordersQuerySchema }), orders.mine);
  router.get(
    '/farmer',
    ...farmer,
    validate({ query: farmerOrdersQuerySchema }),
    orders.farmerOrders,
  );
  router.get('/:id', ...either, params, getOne);
  router.post('/:id/cancel', ...buyer, action, act('cancel'));
  router.post(
    '/:id/return',
    ...buyer,
    validate({ params: orderIdParams, body: returnSchema }),
    async (req, res) =>
      res.status(201).json({ return: await requestReturn(req.user, req.params.id, req.body) }),
  );
  router.post(
    '/:id/review',
    ...buyer,
    validate({ params: orderIdParams, body: reviewSchema }),
    async (req, res) =>
      res.status(201).json({ review: await createReview(req.user, req.params.id, req.body) }),
  );
  for (const name of ['accept', 'reject', 'dispatch', 'deliver', 'fail']) {
    router.post(`/:id/${name}`, ...farmer, action, act(name));
  }
  return router;
}

export function createNotificationsRouter({ requireAuth }) {
  const router = Router();
  router.get('/', requireAuth, validate({ query: ordersQuerySchema }), orders.notifications);
  router.post('/read-all', requireAuth, orders.readAllNotifications);
  router.post(
    '/:id/read',
    requireAuth,
    validate({ params: objectIdParams }),
    orders.readNotification,
  );
  return router;
}

// Mock UPI (test mode): the buyer pays for a whole checkout in one tap.
export function createPaymentsRouter({ requireAuth }) {
  const router = Router();
  router.post(
    '/:checkoutGroupId/pay',
    requireAuth,
    requireRole('buyer'),
    validate({ params: checkoutGroupParams }),
    orders.payUpiOrder,
  );
  return router;
}
