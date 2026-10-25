import { buildQuote, checkout } from '../services/checkout.service.js';
import { listNotifications, markAllRead, markRead } from '../services/notification.service.js';
import { listBuyerOrders, listFarmerOrders } from '../services/orders.service.js';

export async function quote(req, res) {
  res.json(await buildQuote(req.user, req.body));
}

export async function placeOrder(req, res) {
  const result = await checkout(req.user, req.body, { requestId: req.id });
  // A replayed submission answers 200 with the orders the first one created.
  res.status(result.replayed ? 200 : 201).json(result);
}

export async function mine(req, res) {
  res.json(await listBuyerOrders(req.user, req.query));
}

export async function farmerOrders(req, res) {
  res.json(await listFarmerOrders(req.user, req.query));
}

export function createOrderActions(lifecycle) {
  return {
    async getOne(req, res) {
      res.json({ order: await lifecycle.getOrder(req.user, req.params.id) });
    },
    // One handler per action keeps the routes readable: POST /orders/:id/accept and so on.
    act: (action) => async (req, res) => {
      const order = await lifecycle.transition(req.user, req.params.id, action, {
        ...req.body,
        requestId: req.id,
      });
      res.json({ order });
    },
  };
}

export async function notifications(req, res) {
  res.json(await listNotifications(req.user, req.query));
}

export async function readNotification(req, res) {
  await markRead(req.user, req.params.id);
  res.status(204).end();
}

export async function readAllNotifications(req, res) {
  await markAllRead(req.user);
  res.status(204).end();
}
