import { getFarmerDashboard, listMyProducts } from '../services/farmer.service.js';

export async function getDashboard(req, res) {
  res.json(await getFarmerDashboard(req.user));
}

export async function getMyProducts(req, res) {
  res.json(await listMyProducts(req.user, req.query));
}
