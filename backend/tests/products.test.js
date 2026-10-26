import mongoose from 'mongoose';
import request from 'supertest';
import { createLogger } from '../src/config/logger.js';
import { Crop } from '../src/models/Crop.js';
import { syncAllIndexes } from '../src/models/index.js';
import { MediaAsset } from '../src/models/MediaAsset.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { seedCrops } from '../src/seeds/seedCrops.js';
import { pauseExpiredListings } from '../src/services/product.service.js';
import { createSessionService } from '../src/services/session.service.js';
import { createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const config = testConfig();
const sessionService = createSessionService({ config, logger: createLogger(config) });

describe('product listings', () => {
  let app;
  let farmer;
  let otherFarmer;
  let buyer;
  const as = (user) => ({
    Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
  });
  const api = (user) => ({
    post: (path, body) => request(app).post(`/api/v1/products${path}`).set(as(user)).send(body),
    patch: (path, body) => request(app).patch(`/api/v1/products${path}`).set(as(user)).send(body),
    get: (path) => request(app).get(`/api/v1/products${path}`).set(as(user)),
    del: (path) => request(app).delete(`/api/v1/products${path}`).set(as(user)),
  });

  let hashSeed = 0;
  async function photo(owner, overrides = {}) {
    hashSeed += 1;
    const hash = hashSeed.toString(16).padStart(16, '0');
    return MediaAsset.create({
      ownerId: owner._id,
      provider: 'local',
      storageKey: `photos/t/${hashSeed}.jpg`,
      thumbnailKey: `photos/t/${hashSeed}-thumb.webp`,
      url: `/uploads/photos/t/${hashSeed}.jpg`,
      thumbnailUrl: `/uploads/photos/t/${hashSeed}-thumb.webp`,
      width: 1280,
      height: 960,
      bytes: 150_000,
      perceptualHash: hash,
      perceptualHashBands: ['0:a', '1:b', '2:c', '3:d'],
      ...overrides,
    });
  }

  async function listing(owner = farmer, overrides = {}) {
    const asset = await photo(owner);
    const res = await api(owner).post('', {
      cropSlug: 'tomato',
      photoAssetIds: [asset.id],
      quantity: 50,
      unit: 'kg',
      pricePerUnit: 2500,
      harvestDate: new Date().toISOString(),
      ...overrides,
    });
    return res;
  }

  beforeAll(async () => {
    await connectTestDb('products-test');
    await syncAllIndexes();
    await seedCrops();
    ({ app } = createAuthTestApp());
  });
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Product.deleteMany({}), MediaAsset.deleteMany({})]);
    [farmer, otherFarmer, buyer] = await User.create([
      { phone: '+919000000001', role: 'farmer' },
      { phone: '+919000000002', role: 'farmer' },
      { phone: '+919000000003', role: 'buyer' },
    ]);
  });

  describe('POST /products (publish)', () => {
    it('creates the listing and marks its photos as used, in one transaction', async () => {
      const [a, b] = [await photo(farmer), await photo(farmer)];

      const res = await api(farmer).post('', {
        cropSlug: 'tomato',
        photoAssetIds: [b.id, a.id],
        quantity: 25.5,
        unit: 'kg',
        pricePerUnit: 3000,
        harvestDate: new Date().toISOString(),
      });

      expect(res.status).toBe(201);
      expect(res.body.product).toMatchObject({
        crop: { slug: 'tomato', names: { te: 'టమాటా' } },
        quantity: 25.5,
        availableQuantity: 25.5,
        unit: 'kg',
        pricePerUnit: 3000,
        status: 'available',
        photos: [{ url: b.url }, { url: a.url }],
      });
      const assets = await MediaAsset.find({ _id: { $in: [a._id, b._id] } });
      expect(assets.map((x) => [x.status, x.attachedTo?.toString()])).toEqual([
        ['attached', res.body.product.id],
        ['attached', res.body.product.id],
      ]);
    });

    it('refuses another farmer’s photos or a photo already used, leaving nothing behind', async () => {
      const mine = await photo(farmer);
      const theirs = await photo(otherFarmer);
      const used = await photo(farmer, { status: 'attached' });

      for (const ids of [[mine.id, theirs.id], [used.id]]) {
        const res = await listing(farmer, { photoAssetIds: ids });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('PHOTOS_UNAVAILABLE');
      }
      expect(await Product.countDocuments()).toBe(0);
      expect((await MediaAsset.findById(mine._id)).status).toBe('pending');
    });

    it('lets only one of two simultaneous listings claim the same photo', async () => {
      const shared = await photo(farmer);

      const results = await Promise.all([
        listing(farmer, { photoAssetIds: [shared.id] }),
        listing(farmer, { photoAssetIds: [shared.id] }),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, expect.any(Number)].sort());
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(await Product.countDocuments()).toBe(1);
    });

    it.each([
      ['an unknown crop', { cropSlug: 'dragon-fruit' }, 'UNKNOWN_CROP'],
      ['a unit the crop does not use', { unit: 'dozen' }, 'UNIT_NOT_ALLOWED'],
      [
        'a future harvest date',
        { harvestDate: new Date(Date.now() + 3 * DAY_MS).toISOString() },
        'HARVEST_IN_FUTURE',
      ],
      [
        'a harvest older than the shelf life',
        { harvestDate: new Date(Date.now() - 9 * DAY_MS).toISOString() },
        'HARVEST_TOO_OLD',
      ],
    ])('rejects %s', async (_label, overrides, code) => {
      const res = await listing(farmer, overrides);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(code);
    });

    it('lists without a photo (the crop stock photo is shown instead)', async () => {
      const res = await listing(farmer, { photoAssetIds: [] });
      expect(res.status).toBe(201);
      expect(res.body.product.photos).toEqual([]);
    });

    it('validates quantity and price bounds', async () => {
      const res = await api(farmer).post('', {
        cropSlug: 'tomato',
        photoAssetIds: [],
        quantity: 0,
        unit: 'kg',
        pricePerUnit: 50,
        harvestDate: 'yesterday-ish',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.details.map((d) => d.field).sort()).toEqual([
        'body.harvestDate',
        'body.pricePerUnit',
        'body.quantity',
      ]);
    });

    it('is only for farmers', async () => {
      expect((await listing(buyer)).status).toBe(403);
    });
  });

  describe('editing', () => {
    it('changes the price and keeps what was already sold when the quantity changes', async () => {
      const { body } = await listing();
      await Product.updateOne({ _id: body.product.id }, { availableQuantity: 30 }); // 20 sold

      const res = await api(farmer).patch(`/${body.product.id}`, {
        pricePerUnit: 2800,
        quantity: 40,
      });

      expect(res.status).toBe(200);
      expect(res.body.product).toMatchObject({
        pricePerUnit: 2800,
        quantity: 40,
        availableQuantity: 20,
      });
    });

    it('refuses a quantity below what buyers already ordered', async () => {
      const { body } = await listing();
      await Product.updateOne({ _id: body.product.id }, { availableQuantity: 10 }); // 40 sold

      const res = await api(farmer).patch(`/${body.product.id}`, { quantity: 30 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('QUANTITY_BELOW_SOLD');
      expect((await Product.findById(body.product.id)).quantity).toBe(50);
    });

    it('puts an out-of-stock listing back on sale when stock is added', async () => {
      const { body } = await listing();
      await api(farmer).post(`/${body.product.id}/status`, { action: 'mark_out_of_stock' });

      const res = await api(farmer).patch(`/${body.product.id}`, { quantity: 80 });

      expect(res.body.product).toMatchObject({ status: 'available', availableQuantity: 80 });
    });

    it("answers 404 for another farmer's listing on every action", async () => {
      const { body } = await listing();
      const id = body.product.id;
      const other = api(otherFarmer);

      const responses = await Promise.all([
        other.get(`/${id}`),
        other.patch(`/${id}`, { pricePerUnit: 100 }),
        other.post(`/${id}/status`, { action: 'pause' }),
        other.post(`/${id}/duplicate`, { quantity: 5 }),
        other.del(`/${id}`),
      ]);

      expect(responses.map((r) => r.status)).toEqual([404, 404, 404, 404, 404]);
      expect((await Product.findById(id)).toObject()).toMatchObject({
        pricePerUnit: 2500,
        status: 'available',
      });
    });
  });

  describe('status changes', () => {
    it('pauses and resumes', async () => {
      const { body } = await listing();
      const id = body.product.id;

      const paused = await api(farmer).post(`/${id}/status`, { action: 'pause' });
      const resumed = await api(farmer).post(`/${id}/status`, { action: 'resume' });

      expect(paused.body.product).toMatchObject({ status: 'paused', pausedReason: 'farmer' });
      expect(resumed.body.product).toMatchObject({ status: 'available', pausedReason: null });
    });

    it('marking out of stock leaves nothing to buy and keeps only what sold through the app', async () => {
      const { body } = await listing();

      const res = await api(farmer).post(`/${body.product.id}/status`, {
        action: 'mark_out_of_stock',
      });

      expect(res.body.product).toMatchObject({
        status: 'out_of_stock',
        availableQuantity: 0,
        quantity: 0,
      });
    });

    it('rejects a change that does not apply to the current status', async () => {
      const { body } = await listing();

      const res = await api(farmer).post(`/${body.product.id}/status`, { action: 'resume' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATUS_CHANGE');
    });
  });

  describe('soft delete and sell again', () => {
    it('removes a listing from the farmer’s view but keeps the record', async () => {
      const { body } = await listing();

      expect((await api(farmer).del(`/${body.product.id}`)).status).toBe(204);
      expect((await api(farmer).get(`/${body.product.id}`)).status).toBe(404);
      expect((await api(farmer).get('/mine')).body.total).toBe(0);
      expect((await Product.findById(body.product.id)).status).toBe('removed');
    });

    it('sells again with the same crop, price and photos, harvested today', async () => {
      const { body } = await listing(farmer, {
        harvestDate: new Date(Date.now() - 2 * DAY_MS).toISOString(),
      });
      await api(farmer).post(`/${body.product.id}/status`, { action: 'mark_out_of_stock' });

      const res = await api(farmer).post(`/${body.product.id}/duplicate`, { quantity: 30 });

      expect(res.status).toBe(201);
      expect(res.body.product).toMatchObject({
        crop: { slug: 'tomato' },
        quantity: 30,
        availableQuantity: 30,
        pricePerUnit: 2500,
        status: 'available',
        photos: body.product.photos,
      });
      expect(res.body.product.id).not.toBe(body.product.id);
      expect(Date.now() - Date.parse(res.body.product.harvestDate)).toBeLessThan(60_000);
    });
  });

  describe('last price and expiry', () => {
    it('returns the farmer’s own most recent price for a crop, never another farmer’s', async () => {
      await listing(farmer, { pricePerUnit: 2000 });
      await listing(farmer, { pricePerUnit: 2600 });
      await listing(otherFarmer, { pricePerUnit: 9900 });

      const res = await api(farmer).get('/last-price?crop=tomato');
      const none = await api(farmer).get('/last-price?crop=onion');

      expect(res.body.lastPrice).toMatchObject({ pricePerUnit: 2600, unit: 'kg' });
      expect(none.body.lastPrice).toBeNull();
    });

    it('pauses listings past their crop’s shelf life and reopens them when the harvest date is updated', async () => {
      const { body } = await listing(farmer, {
        harvestDate: new Date(Date.now() - 4 * DAY_MS).toISOString(),
      });
      const onion = await Crop.findOne({ slug: 'onion' }); // keeps 30 days
      await Product.create({
        farmerId: farmer._id,
        cropId: onion._id,
        quantity: 10,
        availableQuantity: 10,
        unit: 'kg',
        pricePerUnit: 3000,
        harvestDate: new Date(Date.now() - 4 * DAY_MS),
      });

      // Tomato keeps about 5 days: two days later it is past that, the onion is not.
      expect(await pauseExpiredListings(new Date(Date.now() + 2 * DAY_MS))).toBe(1);
      const expired = await api(farmer).get(`/${body.product.id}`);
      expect(expired.body.product).toMatchObject({ status: 'paused', pausedReason: 'expired' });

      const stillExpired = await Product.findById(body.product.id);
      stillExpired.harvestDate = new Date(Date.now() - 6 * DAY_MS);
      await stillExpired.save();
      expect(
        (await api(farmer).post(`/${body.product.id}/status`, { action: 'resume' })).body.error
          .code,
      ).toBe('LISTING_EXPIRED');

      const refreshed = await api(farmer).patch(`/${body.product.id}`, {
        harvestDate: new Date().toISOString(),
      });
      expect(refreshed.body.product).toMatchObject({ status: 'available', pausedReason: null });
    });
  });

  it('keeps ids opaque: a malformed id is a validation error, not a crash', async () => {
    const res = await api(farmer).get('/not-an-id');
    expect(res.status).toBe(400);
    expect(mongoose.isValidObjectId('not-an-id')).toBe(false);
  });
});
