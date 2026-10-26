import { AuditLog } from '../src/models/AuditLog.js';
import { BuyerProfile } from '../src/models/BuyerProfile.js';
import { Crop } from '../src/models/Crop.js';
import { FarmerProfile } from '../src/models/FarmerProfile.js';
import { syncAllIndexes } from '../src/models/index.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { Review } from '../src/models/Review.js';
import { User } from '../src/models/User.js';
import { CROPS } from '../src/seeds/crops.data.js';
import { DEMO_ORDERS, DEMO_REVIEWS } from '../src/seeds/demo.data.js';
import { seedAdmin } from '../src/seeds/seedAdmin.js';
import { seedCrops } from '../src/seeds/seedCrops.js';
import { removeExistingDemoData, seedDemo } from '../src/seeds/seedDemo.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';

const TELUGU = /[ఀ-౿]/;
const DEVANAGARI = /[ऀ-ॿ]/;

describe('seed scripts', () => {
  beforeAll(async () => {
    await connectTestDb('seeds-test');
    await syncAllIndexes();
  });
  afterAll(() => dropTestDbAndDisconnect());

  describe('crop catalog data', () => {
    it('has 40+ crops with unique slugs', () => {
      expect(CROPS.length).toBeGreaterThanOrEqual(40);
      expect(new Set(CROPS.map((c) => c.slug)).size).toBe(CROPS.length);
    });

    it('covers vegetables, leafy greens and fruits', () => {
      const categories = new Set(CROPS.map((c) => c.category));
      expect([...categories].sort()).toEqual(['fruit', 'leafy', 'vegetable']);
    });

    it('names every crop in Telugu script, Devanagari script and English', () => {
      for (const crop of CROPS) {
        expect({ slug: crop.slug, te: TELUGU.test(crop.names.te) }).toEqual({
          slug: crop.slug,
          te: true,
        });
        expect({ slug: crop.slug, hi: DEVANAGARI.test(crop.names.hi) }).toEqual({
          slug: crop.slug,
          hi: true,
        });
        expect(crop.names.en).toMatch(/^[A-Z]/);
      }
    });

    it('gives every crop presets in its default unit and a sensible step and shelf life', () => {
      for (const crop of CROPS) {
        expect(crop.allowedUnits).toContain(crop.defaultUnit);
        expect(crop.quantityPresets.length).toBeGreaterThan(0);
        expect(crop.quantityStep).toBeGreaterThan(0);
        expect(crop.shelfLifeDays).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('seedCrops', () => {
    beforeEach(() => Crop.deleteMany({}));

    it('inserts every crop on the first run', async () => {
      const result = await seedCrops();

      expect(result).toMatchObject({ total: CROPS.length, inserted: CROPS.length });
      expect(await Crop.countDocuments()).toBe(CROPS.length);
    });

    it('is idempotent and keeps crop ids stable', async () => {
      await seedCrops();
      const before = await Crop.findOne({ slug: 'tomato' });

      const second = await seedCrops();

      expect(second).toMatchObject({ inserted: 0, updated: 0 });
      expect(await Crop.countDocuments()).toBe(CROPS.length);
      expect((await Crop.findOne({ slug: 'tomato' }))._id).toEqual(before._id);
    });

    it('applies edits to existing rows', async () => {
      await seedCrops();
      await Crop.updateOne({ slug: 'tomato' }, { shelfLifeDays: 99 });

      const result = await seedCrops();

      expect(result.updated).toBe(1);
      expect((await Crop.findOne({ slug: 'tomato' })).shelfLifeDays).toBe(5);
    });
  });

  describe('seedAdmin', () => {
    beforeEach(() => User.deleteMany({}));

    it('creates an admin once and audits it', async () => {
      const first = await seedAdmin({ phone: '9000000099' });
      const second = await seedAdmin({ phone: '+919000000099' });

      expect(first.status).toBe('created');
      expect(second).toEqual({ status: 'unchanged', userId: first.userId });
      expect(await User.countDocuments({ role: 'admin' })).toBe(1);
      const audits = await AuditLog.find({ entityId: first.userId, action: 'user.role_granted' });
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({ actorRole: 'system', after: { role: 'admin' } });
    });

    it('refuses to promote an existing farmer without --force', async () => {
      await User.create({ phone: '+919000000098', role: 'farmer' });

      await expect(seedAdmin({ phone: '9000000098' })).rejects.toThrow(/--force/);
      expect((await User.findOne({ phone: '+919000000098' })).role).toBe('farmer');

      expect((await seedAdmin({ phone: '9000000098', force: true })).status).toBe('promoted');
      expect((await User.findOne({ phone: '+919000000098' })).role).toBe('admin');
    });

    it('rejects a missing or invalid phone', async () => {
      await expect(seedAdmin({ phone: undefined })).rejects.toThrow(/SEED_ADMIN_PHONE/);
      await expect(seedAdmin({ phone: '12345' })).rejects.toThrow(/SEED_ADMIN_PHONE/);
    });
  });

  describe('seedDemo', () => {
    beforeEach(async () => {
      await Promise.all([
        User.deleteMany({}),
        FarmerProfile.deleteMany({}),
        BuyerProfile.deleteMany({}),
        Product.deleteMany({}),
        Order.deleteMany({}),
        Review.deleteMany({}),
      ]);
    });

    it('creates a demo marketplace where every record is flagged isDemo', async () => {
      const summary = await seedDemo({ isProduction: false });

      expect(summary).toEqual({
        agents: 1,
        farmers: 5,
        buyers: 3,
        products: 36,
        orders: 11,
        reviews: 7,
      });
      for (const model of [User, FarmerProfile, BuyerProfile, Product, Order, Review]) {
        expect(await model.countDocuments({ isDemo: { $ne: true } })).toBe(0);
      }
      expect(await FarmerProfile.countDocuments({ name: /\(Demo\)$/ })).toBe(5);
    });

    it('rates some farmers through verified orders and leaves others New', async () => {
      await seedDemo({ isProduction: false });

      for (const review of await Review.find({ isDemo: true })) {
        const order = await Order.findById(review.orderId);
        expect(order).toMatchObject({ status: 'delivered', buyerId: review.buyerId });
      }
      const rated = await Review.distinct('farmerId');
      expect(rated).toHaveLength(3);
      expect(await FarmerProfile.countDocuments({ userId: { $nin: rated } })).toBe(2);
    });

    it('seed:clear removes every demo record and keeps real ones', async () => {
      const realFarmer = await User.create({ phone: '+919876543210', role: 'farmer' });
      await seedDemo({ isProduction: false });

      expect(await removeExistingDemoData()).toEqual({
        users: 9,
        products: 36,
        orders: 11,
        reviews: 7,
      });
      for (const model of [FarmerProfile, BuyerProfile, Product, Order, Review]) {
        expect(await model.countDocuments()).toBe(0);
      }
      const left = await User.find();
      expect(left.map((u) => u._id.toString())).toEqual([realFarmer._id.toString()]);
    });

    it('is idempotent: a second run leaves the same amount of data', async () => {
      await seedDemo({ isProduction: false });
      const counts = async () =>
        Promise.all(
          [User, FarmerProfile, BuyerProfile, Product, Order].map((m) => m.countDocuments()),
        );
      const first = await counts();

      await seedDemo({ isProduction: false });

      expect(await counts()).toEqual(first);
    });

    it('never touches real (non-demo) data', async () => {
      const realFarmer = await User.create({ phone: '+919876543210', role: 'farmer' });

      await seedDemo({ isProduction: false });
      await seedDemo({ isProduction: false });

      expect(await User.findById(realFarmer._id)).not.toBeNull();
    });

    it('refuses to reuse a phone number that belongs to a real account', async () => {
      await User.create({ phone: '+919999900011', role: 'farmer' });

      await expect(seedDemo({ isProduction: false })).rejects.toThrow(/non-demo/);
    });

    it('refuses to run in production unless explicitly allowed', async () => {
      await expect(seedDemo({ isProduction: true })).rejects.toThrow(/production/);
      expect(await User.countDocuments()).toBe(0);
    });

    it('keeps stock consistent with orders: reserved by active orders, returned by cancelled ones', async () => {
      await seedDemo({ isProduction: false });

      for (const product of await Product.find({ isDemo: true })) {
        const holding = await Order.find({
          'items.productId': product._id,
          status: { $in: ['placed', 'accepted', 'out_for_delivery', 'delivered'] },
        });
        const reserved = holding
          .flatMap((order) => order.items)
          .filter((item) => item.productId.equals(product._id))
          .reduce((sum, item) => sum + item.quantity, 0);
        expect(product.availableQuantity).toBe(product.quantity - reserved);
      }
    });

    it('stores orders with consistent price breakdowns and status histories', async () => {
      await seedDemo({ isProduction: false });

      const orders = await Order.find({ isDemo: true });
      expect(orders).toHaveLength(DEMO_ORDERS.length + DEMO_REVIEWS.length);
      for (const order of orders) {
        const { itemsTotal, deliveryFee, platformFee, buyerTotal, farmerEarnings } =
          order.priceBreakdown;
        expect(itemsTotal).toBe(order.items.reduce((sum, item) => sum + item.lineTotal, 0));
        expect(buyerTotal).toBe(itemsTotal + deliveryFee);
        expect(farmerEarnings).toBe(buyerTotal - platformFee);
        expect(order.statusHistory.at(-1).status).toBe(order.status);
      }
      const delivered = orders.find((o) => o.status === 'delivered');
      expect(delivered).toMatchObject({ paymentStatus: 'paid' });
      expect(delivered.deliveredAt).toBeInstanceOf(Date);
    });
  });
});
