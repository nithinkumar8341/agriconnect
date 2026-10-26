import mongoose from 'mongoose';
import { AuditLog } from '../src/models/AuditLog.js';
import { BuyerProfile } from '../src/models/BuyerProfile.js';
import { Crop } from '../src/models/Crop.js';
import { FarmerProfile } from '../src/models/FarmerProfile.js';
import { ALL_MODELS, syncAllIndexes } from '../src/models/index.js';
import { LedgerEntry } from '../src/models/LedgerEntry.js';
import { Order } from '../src/models/Order.js';
import { PriceReference } from '../src/models/PriceReference.js';
import { Product } from '../src/models/Product.js';
import { Review } from '../src/models/Review.js';
import { recordAudit, SYSTEM_ACTOR } from '../src/services/audit.service.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';

const id = () => new mongoose.Types.ObjectId();

const validFarmer = () => ({
  userId: id(),
  name: 'Ramu',
  village: 'Kankipadu',
  mandal: 'Kankipadu',
  district: 'Krishna',
  state: 'Andhra Pradesh',
  pincode: '521151',
  location: { type: 'Point', coordinates: [80.7826, 16.4384] },
});

const validProduct = () => ({
  farmerId: id(),
  cropId: id(),
  quantity: 50,
  availableQuantity: 50,
  unit: 'kg',
  pricePerUnit: 3000,
  harvestDate: new Date(),
});

const validOrder = () => ({
  checkoutGroupId: 'group-1',
  buyerId: id(),
  farmerId: id(),
  items: [
    {
      productId: id(),
      cropId: id(),
      cropName: { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' },
      unit: 'kg',
      quantity: 2,
      pricePerUnit: 3000,
      lineTotal: 6000,
    },
  ],
  delivery: {
    slotDate: new Date(),
    address: { name: 'Lakshmi', landmark: 'Near temple', pincode: '520010' },
    fee: 2000,
  },
  priceBreakdown: {
    itemsTotal: 6000,
    deliveryFee: 2000,
    platformFee: 0,
    buyerTotal: 8000,
    farmerEarnings: 8000,
  },
  paymentMethod: 'cod',
});

async function validationErrorPaths(doc) {
  const error = doc.validateSync();
  return error ? Object.keys(error.errors) : [];
}

describe('marketplace models', () => {
  beforeAll(async () => {
    await connectTestDb('marketplace-models-test');
    await syncAllIndexes();
  });
  afterAll(() => dropTestDbAndDisconnect());

  describe('indexes', () => {
    it('creates a 2dsphere index on farmer locations', async () => {
      const indexes = await FarmerProfile.collection.indexes();

      expect(indexes).toContainEqual(expect.objectContaining({ key: { location: '2dsphere' } }));
    });

    it('creates the unique indexes that enforce business rules', async () => {
      const uniqueKeys = async (model) =>
        (await model.collection.indexes()).filter((i) => i.unique).map((i) => i.key);

      expect(await uniqueKeys(Review)).toContainEqual({ orderId: 1 });
      expect(await uniqueKeys(LedgerEntry)).toContainEqual({ idempotencyKey: 1 });
      expect(await uniqueKeys(Crop)).toContainEqual({ slug: 1 });
      expect(await uniqueKeys(FarmerProfile)).toContainEqual({ userId: 1 });
      expect(await uniqueKeys(PriceReference)).toContainEqual({
        source: 1,
        commodity: 1,
        variety: 1,
        market: 1,
        date: 1,
      });
    });

    it('creates every collection declared in the models', async () => {
      const collections = (await mongoose.connection.db.listCollections().toArray()).map(
        (c) => c.name,
      );

      for (const model of ALL_MODELS) {
        expect(collections).toContain(model.collection.collectionName);
      }
    });
  });

  describe('FarmerProfile', () => {
    it('accepts a valid profile with defaults for delivery settings', async () => {
      const farmer = new FarmerProfile(validFarmer());

      expect(await validationErrorPaths(farmer)).toEqual([]);
      expect(farmer).toMatchObject({
        deliveryRadiusKm: 5,
        cutoffTime: '18:00',
        minOrderValue: 10000,
        verificationLevel: 'phone_verified',
      });
      expect([...farmer.deliveryDays]).toEqual(['mon', 'wed', 'fri']);
    });

    it('rejects latitude and longitude in the wrong order', async () => {
      // [lat, lng] for Vijayawada. 80.6 is a valid latitude on Earth, so only the India check catches it.
      const farmer = new FarmerProfile({
        ...validFarmer(),
        location: { type: 'Point', coordinates: [16.5062, 80.648] },
      });

      expect(await validationErrorPaths(farmer)).toContain('location.coordinates');
    });

    it('allows a farmer without a location (pincode fallback)', async () => {
      const withoutLocation = validFarmer();
      delete withoutLocation.location;

      expect(await validationErrorPaths(new FarmerProfile(withoutLocation))).toEqual([]);
    });

    it('validates pincode, cutoff time, delivery days and money', async () => {
      const farmer = new FarmerProfile({
        ...validFarmer(),
        pincode: '12345',
        cutoffTime: '25:00',
        deliveryDays: ['someday'],
        deliveryFee: 20.5,
      });

      expect(await validationErrorPaths(farmer)).toEqual(
        expect.arrayContaining(['pincode', 'cutoffTime', 'deliveryDays.0', 'deliveryFee']),
      );
    });

    it('finds farmers by distance with $geoNear', async () => {
      await FarmerProfile.create([
        {
          ...validFarmer(),
          name: 'Near',
          location: { type: 'Point', coordinates: [80.65, 16.51] },
        },
        { ...validFarmer(), name: 'Far', location: { type: 'Point', coordinates: [78.49, 17.39] } },
      ]);

      const results = await FarmerProfile.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [80.648, 16.5062] },
            distanceField: 'distanceMeters',
            maxDistance: 20_000,
          },
        },
      ]);

      expect(results.map((r) => r.name)).toContain('Near');
      expect(results.map((r) => r.name)).not.toContain('Far');
    });
  });

  describe('BuyerProfile', () => {
    it('allows only one default address', async () => {
      const buyer = new BuyerProfile({
        userId: id(),
        name: 'Lakshmi',
        addresses: [
          { landmark: 'Near temple', pincode: '520010', isDefault: true },
          { landmark: 'Opp school', pincode: '520011', isDefault: true },
        ],
      });

      expect(await validationErrorPaths(buyer)).toContain('addresses');
    });
  });

  describe('Crop', () => {
    it('requires all three language names and the default unit among allowed units', async () => {
      const crop = new Crop({
        slug: 'tomato',
        names: { en: 'Tomato', te: 'టమాటా' },
        category: 'vegetable',
        defaultUnit: 'dozen',
        allowedUnits: ['kg'],
        shelfLifeDays: 5,
        icon: '🍅',
      });

      expect(await validationErrorPaths(crop)).toEqual(
        expect.arrayContaining(['names.hi', 'allowedUnits']),
      );
    });
  });

  describe('Product', () => {
    it('rejects more available stock than was listed', async () => {
      const product = new Product({ ...validProduct(), availableQuantity: 60 });

      expect(await validationErrorPaths(product)).toContain('availableQuantity');
    });

    it('rejects negative stock and fractional paise', async () => {
      const product = new Product({ ...validProduct(), availableQuantity: -1, pricePerUnit: 30.5 });

      expect(await validationErrorPaths(product)).toEqual(
        expect.arrayContaining(['availableQuantity', 'pricePerUnit']),
      );
    });
  });

  describe('Order', () => {
    it('accepts a complete order and starts as placed with pending payment', async () => {
      const order = new Order(validOrder());

      expect(await validationErrorPaths(order)).toEqual([]);
      expect(order).toMatchObject({ status: 'placed', paymentStatus: 'pending' });
    });

    it('requires at least one item and a price breakdown', async () => {
      const order = new Order({ ...validOrder(), items: [], priceBreakdown: undefined });

      expect(await validationErrorPaths(order)).toEqual(
        expect.arrayContaining(['items', 'priceBreakdown']),
      );
    });

    it('never returns the delivery OTP hash unless asked for', async () => {
      const created = await Order.create({ ...validOrder(), deliveryOtpHash: 'hash' });
      const loaded = await Order.findById(created._id);

      expect(loaded.deliveryOtpHash).toBeUndefined();
    });
  });

  describe('Review', () => {
    it('allows only one review per order', async () => {
      const review = {
        orderId: id(),
        buyerId: id(),
        farmerId: id(),
        stars: 5,
      };
      await Review.create(review);

      await expect(Review.create(review)).rejects.toThrow(/duplicate key/);
    });

    it('accepts only whole-number ratings from 1 to 5', async () => {
      const review = new Review({
        orderId: id(),
        buyerId: id(),
        farmerId: id(),
        stars: 3.5,
      });

      expect(await validationErrorPaths(review)).toEqual(['stars']);
      review.stars = 6;
      expect(await validationErrorPaths(review)).toEqual(['stars']);
    });
  });

  describe('LedgerEntry', () => {
    const entry = (key) => ({
      type: 'farmer_payout',
      userId: id(),
      orderId: id(),
      direction: 'credit',
      amount: 8000,
      simulated: true,
      idempotencyKey: key,
    });

    it('rejects a second entry for the same business event', async () => {
      await LedgerEntry.create(entry('payout:order-1'));

      await expect(LedgerEntry.create(entry('payout:order-1'))).rejects.toThrow(/duplicate key/);
    });

    it('is append-only', async () => {
      const created = await LedgerEntry.create(entry('payout:order-2'));

      await expect(LedgerEntry.updateOne({ _id: created._id }, { amount: 1 })).rejects.toThrow(
        /append-only/,
      );
      created.amount = 1;
      await expect(created.save()).rejects.toThrow(/append-only/);
    });
  });

  describe('AuditLog', () => {
    it('records who changed what, with before and after values', async () => {
      const entityId = id();
      const entry = await recordAudit({
        actor: SYSTEM_ACTOR,
        action: 'order.status_changed',
        entityType: 'Order',
        entityId,
        before: { status: 'placed' },
        after: { status: 'accepted' },
      });

      expect(entry).toMatchObject({ actorRole: 'system', action: 'order.status_changed' });
      expect((await AuditLog.findOne({ entityId })).after).toEqual({ status: 'accepted' });
    });

    it('cannot be edited or deleted', async () => {
      const entry = await recordAudit({
        actor: SYSTEM_ACTOR,
        action: 'user.role_granted',
        entityType: 'User',
        entityId: id(),
      });

      await expect(AuditLog.updateOne({ _id: entry._id }, { reason: 'x' })).rejects.toThrow(
        /append-only/,
      );
      await expect(AuditLog.deleteOne({ _id: entry._id })).rejects.toThrow(/append-only/);
    });

    it('rejects action names that are not "entity.verb"', async () => {
      await expect(
        recordAudit({
          actor: SYSTEM_ACTOR,
          action: 'Did Something',
          entityType: 'User',
          entityId: id(),
        }),
      ).rejects.toThrow(/action/);
    });
  });
});
