import request from 'supertest';
import { createLogger } from '../src/config/logger.js';
import { Crop } from '../src/models/Crop.js';
import { FarmerProfile } from '../src/models/FarmerProfile.js';
import { syncAllIndexes } from '../src/models/index.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { seedCrops } from '../src/seeds/seedCrops.js';
import { approximateKm, nextDeliveryDate } from '../src/services/market.service.js';
import { createSessionService } from '../src/services/session.service.js';
import { createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const config = testConfig();
const sessionService = createSessionService({ config, logger: createLogger(config) });
// The buyer stands here (Vijayawada). One degree of latitude is about 111.2 km.
const BUYER = { lat: 16.5, lng: 80.6 };
const METERS_PER_DEGREE_LAT = 111_195;
const northBy = (meters) => [BUYER.lng, BUYER.lat + meters / METERS_PER_DEGREE_LAT];

describe('buyer discovery (market)', () => {
  let app;
  let buyer;
  let phone = 0;
  let crops;
  const as = (user) => ({
    Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
  });
  const nearby = (query, user = buyer) =>
    request(app).get('/api/v1/market/products').query(query).set(as(user));
  const near = (extra = {}) => nearby({ ...BUYER, ...extra });

  async function farmer({ name = 'Ramu Naidu', coordinates, profile = {}, user = {} } = {}) {
    phone += 1;
    const account = await User.create({
      phone: `+9190000${String(phone).padStart(5, '0')}`,
      role: 'farmer',
      ...user,
    });
    await FarmerProfile.create({
      userId: account._id,
      name,
      village: 'Kankipadu',
      mandal: 'Kankipadu',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      pincode: '521151',
      deliveryRadiusKm: 10,
      deliveryDays: ['mon', 'wed', 'fri'],
      ...(coordinates && { location: { type: 'Point', coordinates } }),
      ...profile,
    });
    return account;
  }

  function product(owner, overrides = {}) {
    const { slug = 'tomato', ...fields } = overrides;
    return Product.create({
      farmerId: owner._id,
      cropId: crops[slug]._id,
      quantity: 50,
      availableQuantity: 50,
      unit: crops[slug].defaultUnit,
      pricePerUnit: 3000,
      harvestDate: new Date(),
      photos: [{ url: '/uploads/a.jpg', thumbnailUrl: '/uploads/a-thumb.webp' }],
      ...fields,
    });
  }

  beforeAll(async () => {
    await connectTestDb('market-test');
    await syncAllIndexes();
    await seedCrops();
    crops = Object.fromEntries((await Crop.find().lean()).map((crop) => [crop.slug, crop]));
    ({ app } = createAuthTestApp());
  });
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), FarmerProfile.deleteMany({}), Product.deleteMany({})]);
    buyer = await User.create({ phone: '+919999999999', role: 'buyer' });
  });

  describe('who can deliver', () => {
    it('shows only farmers whose own radius covers the buyer, at the radius edge too', async () => {
      const inside = await farmer({ coordinates: northBy(9_900) });
      const outside = await farmer({ coordinates: northBy(10_100) });
      const wideRadius = await farmer({
        coordinates: northBy(30_000),
        profile: { deliveryRadiusKm: 35 },
      });
      await Promise.all([product(inside), product(outside), product(wideRadius)]);

      const res = await near();

      expect(res.status).toBe(200);
      expect(res.body.items.map((item) => item.farmer.id).sort()).toEqual(
        [inside.id, wideRadius.id].sort(),
      );
      expect(res.body).toMatchObject({ total: 2, sort: 'distance' });
    });

    it('includes farmers who list the buyer pincode, even without a location', async () => {
      const pincodeOnly = await farmer({ profile: { servicePincodes: ['520010'] } });
      const farAway = await farmer({
        coordinates: northBy(40_000),
        profile: { servicePincodes: ['520010'] },
      });
      await Promise.all([product(pincodeOnly), product(farAway)]);

      const res = await near({ pincode: '520010' });

      const byFarmer = Object.fromEntries(res.body.items.map((i) => [i.farmer.id, i.distanceKm]));
      expect(byFarmer).toEqual({ [farAway.id]: 40, [pincodeOnly.id]: null });
      // Farmers without a known distance come after those with one.
      expect(res.body.items.at(-1).farmer.id).toBe(pincodeOnly.id);
    });

    it('falls back to pincode search, sorted by freshness, when there is no location', async () => {
      const a = await farmer({ profile: { servicePincodes: ['500032'] } });
      const b = await farmer({
        coordinates: northBy(1_000),
        profile: { servicePincodes: ['500032'] },
      });
      await product(a, { harvestDate: new Date(Date.now() - DAY_MS) });
      await product(b, { slug: 'onion' });

      const res = await nearby({ pincode: '500032' });

      expect(res.body.sort).toBe('freshness');
      expect(res.body.items.map((i) => [i.crop.slug, i.distanceKm])).toEqual([
        ['onion', null],
        ['tomato', null],
      ]);
    });

    it('hides blocked farmers and listings that are paused or removed', async () => {
      const blocked = await farmer({ coordinates: northBy(500), user: { status: 'suspended' } });
      const ok = await farmer({ coordinates: northBy(500) });
      await product(blocked);
      await product(ok, { status: 'paused', pausedReason: 'farmer' });
      await product(ok, { status: 'removed' });
      const visible = await product(ok, { slug: 'onion' });

      const res = await near();

      expect(res.body.items.map((i) => i.id)).toEqual([visible.id]);
    });

    it('shows out-of-stock listings only when asked', async () => {
      const f = await farmer({ coordinates: northBy(500) });
      await product(f, { status: 'out_of_stock', availableQuantity: 0 });

      expect((await near()).body.total).toBe(0);
      expect((await near({ inStock: 'false' })).body.total).toBe(1);
    });
  });

  describe('privacy and card contents', () => {
    it('gives whole kilometres ("under 1 km" is 0) and never coordinates', async () => {
      const close = await farmer({ name: 'Lakshmi Devi Reddy', coordinates: northBy(400) });
      const further = await farmer({ coordinates: northBy(3_400) });
      await product(close);
      await product(further);

      const res = await near();

      expect(res.body.items.map((i) => i.distanceKm)).toEqual([0, 3]);
      expect(res.body.items[0]).toMatchObject({
        farmer: { id: close.id, firstName: 'Lakshmi', village: 'Kankipadu' },
        crop: { slug: 'tomato', icon: expect.any(String) },
        photoUrl: '/uploads/a-thumb.webp',
        deliveryFee: 2000,
        nextDeliveryDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
      expect(JSON.stringify(res.body)).not.toMatch(/coordinates|"location"|\+91/);
    });

    it('rounds distances and computes the next delivery day in IST', () => {
      expect([999, 1_000, 1_499, 1_500, null].map(approximateKm)).toEqual([0, 1, 1, 2, null]);
      const days = { deliveryDays: ['mon', 'thu'], cutoffTime: '18:00' };
      // Sunday 2026-10-25, 17:00 IST: before the cutoff, so Monday is possible.
      expect(nextDeliveryDate(days, new Date('2026-10-25T11:30:00Z'))).toBe('2026-10-26');
      // Sunday 19:00 IST: after the cutoff, so Monday is too soon; Thursday it is.
      expect(nextDeliveryDate(days, new Date('2026-10-25T13:30:00Z'))).toBe('2026-10-29');
    });
  });

  describe('filters, sorting and pages', () => {
    let f1;
    let f2;
    beforeEach(async () => {
      f1 = await farmer({ coordinates: northBy(2_000), profile: { deliveryDays: ['tue'] } });
      f2 = await farmer({ coordinates: northBy(6_000) });
      await product(f1, { slug: 'tomato', pricePerUnit: 4000 });
      await product(f1, {
        slug: 'mango',
        pricePerUnit: 9000,
        harvestDate: new Date(Date.now() - DAY_MS),
      });
      await product(f2, { slug: 'spinach', pricePerUnit: 1500 });
      await product(f2, { slug: 'onion', pricePerUnit: 2500 });
    });

    const slugs = (res) => res.body.items.map((i) => i.crop.slug);

    it('filters by category, search in Telugu, price range and delivery day', async () => {
      expect(slugs(await near({ category: 'fruit' }))).toEqual(['mango']);
      expect(slugs(await near({ q: 'ఉల్లి' }))).toEqual(['onion']);
      expect(slugs(await near({ q: 'nothing-like-this' }))).toEqual([]);
      expect(slugs(await near({ minPrice: 2000, maxPrice: 5000 })).sort()).toEqual([
        'onion',
        'tomato',
      ]);
      expect(slugs(await near({ day: 'tue' })).sort()).toEqual(['mango', 'tomato']);
    });

    it('sorts by distance, price or freshness', async () => {
      expect(
        slugs(await near())
          .slice(0, 2)
          .sort(),
      ).toEqual(['mango', 'tomato']);
      expect(slugs(await near({ sort: 'price' }))).toEqual(['spinach', 'onion', 'tomato', 'mango']);
      expect(slugs(await near({ sort: 'freshness' })).at(-1)).toBe('mango');
    });

    it('pages through results', async () => {
      const first = await near({ limit: 3, sort: 'price' });
      const second = await near({ limit: 3, page: 2, sort: 'price' });
      expect(first.body).toMatchObject({ total: 4, page: 1, limit: 3 });
      expect([...slugs(first), ...slugs(second)]).toEqual(['spinach', 'onion', 'tomato', 'mango']);
    });

    it('also answers on GET /products/nearby', async () => {
      const res = await request(app)
        .get('/api/v1/products/nearby')
        .query({ ...BUYER, sort: 'price' })
        .set(as(buyer));
      expect(slugs(res)).toEqual(['spinach', 'onion', 'tomato', 'mango']);
    });
  });

  describe('rules', () => {
    it('is for buyers only and needs a location or pincode', async () => {
      const f = await farmer({ coordinates: northBy(100) });
      expect((await nearby(BUYER, f)).status).toBe(403);
      expect((await nearby({ q: 'tomato' })).status).toBe(400);
      expect((await nearby({ lat: 16.5 })).status).toBe(400);
      expect((await nearby({ pincode: '500032', sort: 'distance' })).status).toBe(400);
      expect((await nearby({ lat: 51.5, lng: -0.1 })).status).toBe(400);
    });
  });

  describe('detail pages', () => {
    it('shows a listing with its photos and whether the farmer delivers here', async () => {
      const f = await farmer({ coordinates: northBy(12_000) });
      const p = await product(f);
      const get = (query) =>
        request(app).get(`/api/v1/market/products/${p.id}`).query(query).set(as(buyer));

      const outside = await get(BUYER);
      expect(outside.status).toBe(200);
      expect(outside.body.product).toMatchObject({
        id: p.id,
        distanceKm: 12,
        canDeliver: false,
        photos: [{ url: '/uploads/a.jpg' }],
        deliveryDays: ['mon', 'wed', 'fri'],
      });
      expect((await get({ lat: BUYER.lat + 0.05, lng: BUYER.lng })).body.product.canDeliver).toBe(
        true,
      );

      await Product.updateOne({ _id: p._id }, { status: 'paused' });
      expect((await get(BUYER)).status).toBe(404);
    });

    it("shows a farmer's public page with their listings and no exact location", async () => {
      const f = await farmer({ coordinates: northBy(2_000) });
      await product(f);
      await product(f, { slug: 'onion', status: 'paused' });

      const res = await request(app)
        .get(`/api/v1/market/farmers/${f.id}`)
        .query(BUYER)
        .set(as(buyer));

      expect(res.status).toBe(200);
      expect(res.body.farmer).toMatchObject({
        id: f.id,
        firstName: 'Ramu',
        district: 'Krishna',
        isNew: true,
        distanceKm: 2,
        canDeliver: true,
      });
      expect(res.body.farmer.products.map((i) => i.crop.slug)).toEqual(['tomato']);
      expect(JSON.stringify(res.body)).not.toMatch(/coordinates|\+91/);

      const missing = await request(app).get(`/api/v1/market/farmers/${buyer.id}`).set(as(buyer));
      expect(missing.status).toBe(404);
    });
  });
});
