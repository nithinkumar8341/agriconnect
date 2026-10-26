import mongoose from 'mongoose';
import request from 'supertest';
import { createLogger } from '../src/config/logger.js';
import { AppConfig } from '../src/models/AppConfig.js';
import { Crop } from '../src/models/Crop.js';
import { FarmerProfile } from '../src/models/FarmerProfile.js';
import { syncAllIndexes } from '../src/models/index.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { seedCrops } from '../src/seeds/seedCrops.js';
import { getFarmerDashboard, startOfIstDay } from '../src/services/farmer.service.js';
import { createSessionService } from '../src/services/session.service.js';
import { createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const config = testConfig();
const sessionService = createSessionService({ config, logger: createLogger(config) });

describe('farmer dashboard and my products', () => {
  let app;
  let farmer;
  let otherFarmer;
  let buyer;
  let agent;
  let crops;
  const as = (user) => ({
    Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
  });

  function product(overrides) {
    return {
      farmerId: farmer._id,
      cropId: crops.tomato._id,
      quantity: 100,
      availableQuantity: 100,
      unit: 'kg',
      pricePerUnit: 2500,
      harvestDate: new Date(),
      ...overrides,
    };
  }

  function order(overrides) {
    return {
      checkoutGroupId: new mongoose.Types.ObjectId().toString(),
      buyerId: buyer._id,
      farmerId: farmer._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          cropId: crops.tomato._id,
          cropName: crops.tomato.names,
          unit: 'kg',
          quantity: 1,
          pricePerUnit: 2500,
          lineTotal: 2500,
        },
      ],
      delivery: {
        slotDate: new Date(),
        address: { name: 'B', landmark: 'L', pincode: '520010' },
        fee: 0,
      },
      priceBreakdown: {
        itemsTotal: 2500,
        deliveryFee: 0,
        platformFee: 0,
        buyerTotal: 2500,
        farmerEarnings: 2500,
      },
      paymentMethod: 'cod',
      ...overrides,
    };
  }

  beforeAll(async () => {
    await connectTestDb('farmer-dashboard-test');
    await syncAllIndexes();
    await seedCrops();
    crops = Object.fromEntries((await Crop.find()).map((c) => [c.slug, c]));
    ({ app } = createAuthTestApp());
  });
  afterAll(() => dropTestDbAndDisconnect());

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      FarmerProfile.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      AppConfig.deleteMany({}),
    ]);
    [farmer, otherFarmer, buyer, agent] = await User.create([
      { phone: '+919000000001', role: 'farmer' },
      { phone: '+919000000002', role: 'farmer' },
      { phone: '+919000000003', role: 'buyer' },
      { phone: '+919000000004', role: 'agent' },
    ]);
    await FarmerProfile.create({
      userId: farmer._id,
      name: 'Ramu',
      village: 'Kankipadu',
      mandal: 'Kankipadu',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      pincode: '521151',
      agentId: agent._id,
    });
  });

  describe('GET /farmer/dashboard', () => {
    it('counts only this farmer’s orders and listings and lists low stock', async () => {
      await Order.create([
        order({ status: 'placed' }),
        order({ status: 'accepted' }),
        order({ status: 'out_for_delivery' }),
        order({ status: 'delivered' }),
        order({ farmerId: otherFarmer._id, status: 'placed' }),
      ]);
      await Product.create([
        product({ availableQuantity: 10 }),
        product({ cropId: crops.onion._id, availableQuantity: 21 }),
        product({ status: 'paused' }),
        product({ status: 'out_of_stock', availableQuantity: 0 }),
        product({ status: 'removed' }),
        product({ farmerId: otherFarmer._id, availableQuantity: 1 }),
      ]);

      const res = await request(app).get('/api/v1/farmer/dashboard').set(as(farmer));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        farmerName: 'Ramu',
        orders: { today: 4, new: 1, pendingDelivery: 2 },
        listings: { available: 2, outOfStock: 1, paused: 1 },
        lowStockPercent: 20,
        agent: { phone: '+919000000004' },
      });
      expect(res.body.lowStock).toHaveLength(1);
      expect(res.body.lowStock[0]).toMatchObject({
        availableQuantity: 10,
        quantity: 100,
        unit: 'kg',
        isLowStock: true,
        crop: { slug: 'tomato', names: { te: 'టమాటా' }, image: '/crops/tomato.jpg' },
      });
    });

    it('uses the low-stock threshold from AppConfig', async () => {
      await AppConfig.create({ key: 'lowStockPercent', value: 25 });
      await Product.create(product({ availableQuantity: 21 }));

      const res = await request(app).get('/api/v1/farmer/dashboard').set(as(farmer));

      expect(res.body.lowStock).toHaveLength(1);
    });

    it('shows a brand-new farmer zeros, not errors', async () => {
      const res = await request(app).get('/api/v1/farmer/dashboard').set(as(otherFarmer));

      expect(res.body).toEqual({
        farmerName: null,
        orders: { today: 0, new: 0, pendingDelivery: 0 },
        listings: { available: 0, outOfStock: 0, paused: 0 },
        lowStockPercent: 20,
        lowStock: [],
        agent: null,
      });
    });

    it('hides a suspended agent’s phone', async () => {
      await User.updateOne({ _id: agent._id }, { status: 'suspended' });

      const res = await request(app).get('/api/v1/farmer/dashboard').set(as(farmer));

      expect(res.body.agent).toBeNull();
    });

    it('is only for farmers', async () => {
      expect((await request(app).get('/api/v1/farmer/dashboard').set(as(buyer))).status).toBe(403);
      expect((await request(app).get('/api/v1/farmer/dashboard')).status).toBe(401);
    });
  });

  describe('today by the Indian calendar day', () => {
    it('starts "today" at midnight IST (18:30 UTC the day before)', () => {
      expect(startOfIstDay(new Date('2026-10-25T10:00:00Z')).toISOString()).toBe(
        '2026-10-24T18:30:00.000Z',
      );
      // 01:00 IST on the 26th is still the 25th in UTC, but is already "today" in India.
      expect(startOfIstDay(new Date('2026-10-25T19:30:00Z')).toISOString()).toBe(
        '2026-10-25T18:30:00.000Z',
      );
    });

    it('counts an order at 00:01 IST as today and one at 23:59 IST yesterday as not', async () => {
      const now = new Date('2026-10-25T12:00:00Z'); // 17:30 IST on 25 Oct
      const created = await Order.create([order({}), order({})]);
      await Order.collection.updateOne(
        { _id: created[0]._id },
        { $set: { createdAt: new Date('2026-10-24T18:31:00Z') } }, // 00:01 IST 25 Oct
      );
      await Order.collection.updateOne(
        { _id: created[1]._id },
        { $set: { createdAt: new Date('2026-10-24T18:29:00Z') } }, // 23:59 IST 24 Oct
      );

      const dashboard = await getFarmerDashboard(farmer, { now });

      expect(dashboard.orders.today).toBe(1);
    });
  });

  describe('GET /products/mine', () => {
    const mine = (user, query = '') =>
      request(app).get(`/api/v1/products/mine${query}`).set(as(user));

    it('lists only the caller’s listings, newest change first, never removed ones', async () => {
      const [older] = await Product.create([product({})]);
      await Product.create([
        product({ cropId: crops.onion._id }),
        product({ status: 'removed' }),
        product({ farmerId: otherFarmer._id }),
      ]);
      await Product.updateOne({ _id: older._id }, { pricePerUnit: 3000 });

      const res = await mine(farmer);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 1, limit: 20, total: 2 });
      expect(res.body.items.map((p) => p.crop.slug)).toEqual(['tomato', 'onion']);
      expect(res.body.items[0]).toMatchObject({
        id: older._id.toString(),
        pricePerUnit: 3000,
        status: 'available',
        photoUrl: null,
        isLowStock: false,
        isPastShelfLife: false,
      });
    });

    it.each([
      ['available', 2],
      ['out_of_stock', 1],
      ['paused', 1],
      ['low', 1],
    ])('filters by %s', async (status, expected) => {
      await Product.create([
        product({ availableQuantity: 5 }),
        product({ availableQuantity: 80 }),
        product({ status: 'out_of_stock', availableQuantity: 0 }),
        product({ status: 'paused' }),
      ]);

      const res = await mine(farmer, `?status=${status}`);

      expect(res.body.total).toBe(expected);
    });

    it('flags listings older than the crop’s shelf life', async () => {
      // Tomato keeps about 5 days.
      await Product.create(product({ harvestDate: new Date(Date.now() - 6 * DAY_MS) }));

      const res = await mine(farmer);

      expect(res.body.items[0].isPastShelfLife).toBe(true);
    });

    it('paginates', async () => {
      await Product.create(Array.from({ length: 5 }, () => product({})));

      const res = await mine(farmer, '?limit=2&page=3');

      expect(res.body).toMatchObject({ page: 3, limit: 2, total: 5 });
      expect(res.body.items).toHaveLength(1);
    });

    it('rejects unknown statuses and is only for farmers', async () => {
      expect((await mine(farmer, '?status=removed')).status).toBe(400);
      expect((await mine(farmer, '?limit=100')).status).toBe(400);
      expect((await mine(buyer)).status).toBe(403);
    });
  });
});
