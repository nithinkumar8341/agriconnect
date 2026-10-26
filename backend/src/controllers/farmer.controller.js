import { getFarmerDashboard, listMyProducts } from '../services/farmer.service.js';
import { farmerEarnings } from '../services/payment.service.js';

export async function getDashboard(req, res) {
  res.json(await getFarmerDashboard(req.user));
}

export async function getMyProducts(req, res) {
  res.json(await listMyProducts(req.user, req.query));
}

export async function getEarnings(req, res) {
  res.json(await farmerEarnings(req.user, req.query));
}
