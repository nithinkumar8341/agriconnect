import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createLogger } from '../src/config/logger.js';
import { AppConfig } from '../src/models/AppConfig.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { BuyerProfile } from '../src/models/BuyerProfile.js';
import { Crop } from '../src/models/Crop.js';
import { FarmerProfile } from '../src/models/FarmerProfile.js';
import { syncAllIndexes } from '../src/models/index.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { seedCrops } from '../src/seeds/seedCrops.js';
import { createSessionService } from '../src/services/session.service.js';
import { createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const config = testConfig();
const sessionService = createSessionService({ config, logger: createLogger(config) });
const HOME = [80.6, 16.5];

describe('cart and checkout', () => {
  let app;
  let crops;
  let phone = 0;
  const as = (user) => ({
    Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
  });

  async function buyer() {
    phone += 1;
    const user = await User.create({
      phone: `+9180000${String(phone).padStart(5, '0')}`,
      role: 'buyer',
    });
    await BuyerProfile.create({
      userId: user._id,
      name: 'Padma',
      addresses: [
        {
          landmark: 'Temple',
          pincode: '520010',
          location: { type: 'Point', coordinates: HOME },
          isDefault: true,
        },
      ],
    });
    return user;
  }

  async function farmer(profile = {}) {
    phone += 1;
    const user = await User.create({
      phone: `+9170000${String(phone).padStart(5, '0')}`,
      role: 'farmer',
    });
    await FarmerProfile.create({
      userId: user._id,
      name: 'Ramu Naidu',
      village: 'Kankipadu',
      mandal: 'Kankipadu',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      pincode: '521151',
      location: { type: 'Point', coordinates: [80.61, 16.5] },
      deliveryRadiusKm: 10,
      deliveryDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      minOrderValue: 5000,
      deliveryFee: 2000,
      ...profile,
    });
    return user;
  }

  const product = (owner, overrides = {}) =>
    Product.create({
      farmerId: owner._id,
      cropId: crops.tomato._id,
      quantity: 50,
      availableQuantity: 50,
      unit: 'kg',
      pricePerUnit: 3000,
      harvestDate: new Date(),
      ...overrides,
    });

  const quote = (user, body) =>
    request(app).post('/api/v1/checkout/quote').set(as(user)).send(body);

  // Checks out using the server's own quote for prices and the first delivery day per farmer.
  async function placeOrder(user, items, overrides = {}) {
    const q = (await quote(user, { items })).body;
    const deliveryDates = Object.fromEntries(
      (q.groups ?? []).map((g) => [g.farmer.id, g.deliveryDates[0]]),
    );
    return request(app)
      .post('/api/v1/checkout')
      .set(as(user))
      .send({
        idempotencyKey: randomUUID(),
        paymentMethod: 'cod',
        deliveryDates,
        items: items.map((i) => ({ pricePerUnit: 3000, ...i })),
        ...overrides,
      });
  }

  beforeAll(async () => {
    await connectTestDb('checkout-test');
    await syncAllIndexes();
    await seedCrops();
    crops = Object.fromEntries((await Crop.find().lean()).map((c) => [c.slug, c]));
    ({ app } = createAuthTestApp());
  });
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await Promise.all(
      [User, BuyerProfile, FarmerProfile, Product, Order, AppConfig].map((m) => m.deleteMany({})),
    );
  });

  describe('quote', () => {
    it('groups by farmer with fees, minimum order, delivery days and totals', async () => {
      const [b, f1, f2] = [await buyer(), await farmer(), await farmer({ deliveryFee: 0 })];
      const [p1, p2] = [await product(f1), await product(f2, { pricePerUnit: 2000 })];

      const res = await quote(b, {
        items: [
          { productId: p1.id, quantity: 2, pricePerUnit: 3000 },
          { productId: p2.id, quantity: 1, pricePerUnit: 2000 },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.changes).toEqual([]);
      const [g1, g2] = res.body.groups;
      expect(g1).toMatchObject({
        farmer: { id: f1.id, firstName: 'Ramu' },
        items: [{ productId: p1.id, quantity: 2, lineTotal: 6000 }],
        priceBreakdown: { itemsTotal: 6000, deliveryFee: 2000, buyerTotal: 8000 },
        meetsMinimum: true,
      });
      expect(g1.deliveryDates).toHaveLength(4);
      expect(g2).toMatchObject({ meetsMinimum: false, priceBreakdown: { buyerTotal: 2000 } });
      expect(res.body.totals).toEqual({ itemsTotal: 8000, deliveryFee: 2000, buyerTotal: 10000 });
      expect(res.body.address).toMatchObject({ pincode: '520010', landmark: 'Temple' });
    });

    it('says exactly what changed: price, stock, unavailable, not delivered here', async () => {
      const b = await buyer();
      const near = await farmer();
      const far = await farmer({ location: { type: 'Point', coordinates: [81.5, 17.5] } });
      const priced = await product(near, { pricePerUnit: 3500 });
      const low = await product(near, { availableQuantity: 3 });
      const paused = await product(near, { status: 'paused' });
      const distant = await product(far);

      const res = await quote(b, {
        items: [
          { productId: priced.id, quantity: 1, pricePerUnit: 3000 },
          { productId: low.id, quantity: 5, pricePerUnit: 3000 },
          { productId: paused.id, quantity: 1 },
          { productId: distant.id, quantity: 1 },
        ],
      });

      expect(res.body.changes).toEqual([
        { productId: priced.id, kind: 'price', old: 3000, new: 3500 },
        { productId: low.id, kind: 'stock', requested: 5, available: 3 },
        { productId: paused.id, kind: 'unavailable' },
        { productId: distant.id, kind: 'not_delivered' },
      ]);
      expect(res.body.groups[0].items.map((i) => i.quantity)).toEqual([1, 3]);
    });
  });

  describe('placing orders', () => {
    it('creates one order per farmer with a shared group id, reserves stock and audits', async () => {
      const [b, f1, f2] = [await buyer(), await farmer(), await farmer()];
      const p1 = await product(f1);
      const p2 = await product(f2, { availableQuantity: 4 });

      const res = await placeOrder(b, [
        { productId: p1.id, quantity: 2 },
        { productId: p2.id, quantity: 4 },
      ]);

      expect(res.status).toBe(201);
      expect(res.body.orders).toHaveLength(2);
      expect(new Set(res.body.orders.map((o) => o.checkoutGroupId)).size).toBe(1);
      expect(res.body.orders[0]).toMatchObject({
        status: 'placed',
        paymentMethod: 'cod',
        farmer: { firstName: 'Ramu' },
        items: [{ quantity: 2, pricePerUnit: 3000, lineTotal: 6000 }],
        priceBreakdown: { itemsTotal: 6000, deliveryFee: 2000, platformFee: 0, buyerTotal: 8000 },
        canCancel: true,
      });
      expect((await Product.findById(p1.id)).availableQuantity).toBe(48);
      expect(await Product.findById(p2.id)).toMatchObject({
        availableQuantity: 0,
        status: 'out_of_stock',
      });
      expect(
        await AuditLog.countDocuments({
          action: 'order.placed',
          entityId: { $in: res.body.orders.map((o) => o.id) },
        }),
      ).toBe(2);
    });

    it('re-checks on the server and creates nothing when the price changed', async () => {
      const [b, f] = [await buyer(), await farmer()];
      const p = await product(f, { pricePerUnit: 4000 });

      const res = await placeOrder(b, [{ productId: p.id, quantity: 2, pricePerUnit: 3000 }]);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CART_CHANGED');
      expect(res.body.error.details.quote.changes).toEqual([
        { productId: p.id, kind: 'price', old: 3000, new: 4000 },
      ]);
      expect(await Order.countDocuments()).toBe(0);
      expect((await Product.findById(p.id)).availableQuantity).toBe(50);
    });

    it('rolls back every item when one cannot be reserved', async () => {
      const [b, f] = [await buyer(), await farmer()];
      const ok = await product(f);
      const scarce = await product(f, {
        slug: 'onion',
        cropId: crops.onion._id,
        availableQuantity: 1,
      });
      const q = (
        await quote(b, {
          items: [
            { productId: ok.id, quantity: 2 },
            { productId: scarce.id, quantity: 1 },
          ],
        })
      ).body;
      // Someone else buys the last onion between the quote and the checkout.
      await Product.updateOne({ _id: scarce._id }, { $set: { availableQuantity: 0 } });

      const res = await request(app)
        .post('/api/v1/checkout')
        .set(as(b))
        .send({
          idempotencyKey: randomUUID(),
          paymentMethod: 'cod',
          deliveryDates: { [f.id]: q.groups[0].deliveryDates[0] },
          items: [
            { productId: ok.id, quantity: 2, pricePerUnit: 3000 },
            { productId: scarce.id, quantity: 1, pricePerUnit: 3000 },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.details.quote.changes).toEqual([
        { productId: scarce.id, kind: 'stock', requested: 1, available: 0 },
      ]);
      expect((await Product.findById(ok.id)).availableQuantity).toBe(50);
      expect(await Order.countDocuments()).toBe(0);
    });

    it('treats a repeated submission (same idempotency key) as the same checkout', async () => {
      const [b, f] = [await buyer(), await farmer()];
      const p = await product(f);
      const q = (await quote(b, { items: [{ productId: p.id, quantity: 2 }] })).body;
      const body = {
        idempotencyKey: randomUUID(),
        paymentMethod: 'cod',
        deliveryDates: { [f.id]: q.groups[0].deliveryDates[0] },
        items: [{ productId: p.id, quantity: 2, pricePerUnit: 3000 }],
      };
      const send = () => request(app).post('/api/v1/checkout').set(as(b)).send(body);

      const [first, second] = await Promise.all([send(), send()]);
      const third = await send();

      expect([first.status, second.status].sort()).toEqual([200, 201]);
      expect(third.status).toBe(200);
      expect(third.body.orders[0].id).toBe(first.body.orders[0].id);
      expect(await Order.countDocuments()).toBe(1);
      expect((await Product.findById(p.id)).availableQuantity).toBe(48);
    });

    it('enforces the minimum order, a valid delivery day and the new-buyer COD cap', async () => {
      const [b, f] = [await buyer(), await farmer({ minOrderValue: 10000 })];
      const p = await product(f, { pricePerUnit: 3000 });

      const small = await placeOrder(b, [{ productId: p.id, quantity: 1 }]);
      expect(small.body.error.code).toBe('BELOW_MINIMUM');

      const badDay = await placeOrder(b, [{ productId: p.id, quantity: 4 }], {
        deliveryDates: { [f.id]: '2020-01-01' },
      });
      expect(badDay.body.error.code).toBe('INVALID_DELIVERY_DATE');

      // New buyers: at most ₹500 per cash-on-delivery order by default.
      const big = await placeOrder(b, [{ productId: p.id, quantity: 20 }]);
      expect(big.status).toBe(409);
      expect(big.body.error).toMatchObject({ code: 'COD_LIMIT', details: { limit: 50000 } });
      expect(await Order.countDocuments()).toBe(0);
    });

    it('is for buyers only', async () => {
      const f = await farmer();
      const res = await request(app)
        .post('/api/v1/checkout/quote')
        .set(as(f))
        .send({
          items: [{ productId: f.id, quantity: 1 }],
        });
      expect(res.status).toBe(403);
    });
  });

  describe('concurrency', () => {
    it('sells exactly 30 units to 50 buyers racing for them, never going negative', async () => {
      const f = await farmer({ minOrderValue: 0 });
      const p = await product(f, { quantity: 30, availableQuantity: 30 });
      const buyers = await Promise.all(Array.from({ length: 50 }, () => buyer()));
      const date = (await quote(buyers[0], { items: [{ productId: p.id, quantity: 1 }] })).body
        .groups[0].deliveryDates[0];

      const results = await Promise.all(
        buyers.map((b) =>
          request(app)
            .post('/api/v1/checkout')
            .set(as(b))
            .send({
              idempotencyKey: randomUUID(),
              paymentMethod: 'cod',
              deliveryDates: { [f.id]: date },
              items: [{ productId: p.id, quantity: 1, pricePerUnit: 3000 }],
            }),
        ),
      );

      const statuses = results.map((r) => r.status);
      expect(statuses.filter((s) => s === 201)).toHaveLength(30);
      expect(statuses.filter((s) => s === 409)).toHaveLength(20);
      const after = await Product.findById(p.id);
      expect(after).toMatchObject({ availableQuantity: 0, status: 'out_of_stock' });
      const sold = await Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: null, units: { $sum: '$items.quantity' } } },
      ]);
      expect(sold[0].units).toBe(30);
    }, 120_000);
  });

  describe('cancel and reject restore stock', () => {
    it('buyer cancels a placed order: stock returns and the listing sells again', async () => {
      const [b, f] = [await buyer(), await farmer()];
      const p = await product(f, { availableQuantity: 3 });
      const placed = await placeOrder(b, [{ productId: p.id, quantity: 3 }]);
      const id = placed.body.orders[0].id;
      expect((await Product.findById(p.id)).status).toBe('out_of_stock');

      const res = await request(app).post(`/api/v1/orders/${id}/cancel`).set(as(b)).send({});

      expect(res.status).toBe(200);
      expect(res.body.order).toMatchObject({ status: 'cancelled', canCancel: false });
      expect(await Product.findById(p.id)).toMatchObject({
        availableQuantity: 3,
        status: 'available',
      });
      expect(await AuditLog.countDocuments({ action: 'order.cancelled', entityId: id })).toBe(1);

      const again = await request(app).post(`/api/v1/orders/${id}/cancel`).set(as(b));
      expect(again.body.error.code).toBe('INVALID_STATUS_CHANGE');
      expect((await Product.findById(p.id)).availableQuantity).toBe(3);
    });

    it('farmer rejects: stock returns; others cannot touch the order', async () => {
      const [b, other, f] = [await buyer(), await buyer(), await farmer()];
      const p = await product(f);
      const id = (await placeOrder(b, [{ productId: p.id, quantity: 5 }])).body.orders[0].id;

      expect((await request(app).post(`/api/v1/orders/${id}/cancel`).set(as(other))).status).toBe(
        404,
      );
      expect((await request(app).get(`/api/v1/orders/${id}`).set(as(other))).status).toBe(404);

      const res = await request(app)
        .post(`/api/v1/orders/${id}/reject`)
        .set(as(f))
        .send({ reason: 'Rain damaged the crop' });

      expect(res.body.order.status).toBe('rejected');
      expect((await Product.findById(p.id)).availableQuantity).toBe(50);
      const mine = await request(app).get('/api/v1/orders/mine').set(as(b));
      expect(mine.body).toMatchObject({ total: 1, items: [{ status: 'rejected' }] });
    });
  });
});
