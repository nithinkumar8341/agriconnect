import {
  getMarketFarmer,
  getMarketProduct,
  listNearbyProducts,
} from '../services/market.service.js';

export async function nearby(req, res) {
  res.json(await listNearbyProducts(req.query));
}

export async function product(req, res) {
  res.json({ product: await getMarketProduct(req.params.id, req.query) });
}

export async function farmer(req, res) {
  res.json({ farmer: await getMarketFarmer(req.params.id, req.query) });
}
