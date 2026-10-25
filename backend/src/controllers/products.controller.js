import {
  changeStatus,
  createProduct,
  duplicateProduct,
  getOwnProduct,
  lastPrice,
  removeProduct,
  updateProduct,
} from '../services/product.service.js';

export async function create(req, res) {
  res.status(201).json({ product: await createProduct(req.user, req.body) });
}

export async function getOne(req, res) {
  res.json({ product: await getOwnProduct(req.user, req.params.id) });
}

export async function update(req, res) {
  res.json({ product: await updateProduct(req.user, req.params.id, req.body) });
}

export async function setStatus(req, res) {
  res.json({ product: await changeStatus(req.user, req.params.id, req.body.action) });
}

export async function remove(req, res) {
  await removeProduct(req.user, req.params.id);
  res.status(204).end();
}

export async function duplicate(req, res) {
  res.status(201).json({ product: await duplicateProduct(req.user, req.params.id, req.body) });
}

export async function getLastPrice(req, res) {
  res.json({ lastPrice: await lastPrice(req.user, req.query.crop) });
}
