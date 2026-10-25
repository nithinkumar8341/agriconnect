import { buildQuote, checkout } from '../services/checkout.service.js';
import {
  cancelOrder,
  getBuyerOrder,
  listBuyerOrders,
  rejectOrder,
} from '../services/orders.service.js';

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

export async function getOne(req, res) {
  res.json({ order: await getBuyerOrder(req.user, req.params.id) });
}

export async function cancel(req, res) {
  const order = await cancelOrder(req.user, req.params.id, { ...req.body, requestId: req.id });
  res.json({ order });
}

export async function reject(req, res) {
  const order = await rejectOrder(req.user, req.params.id, { ...req.body, requestId: req.id });
  res.json({ order });
}
