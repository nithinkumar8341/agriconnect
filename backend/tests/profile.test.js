import request from 'supertest';
import { DISTRICTS } from '../src/data/districts.js';
import { BuyerProfile } from '../src/models/BuyerProfile.js';
import { FarmerProfile } from '../src/models/FarmerProfile.js';
import { syncAllIndexes } from '../src/models/index.js';
import { User } from '../src/models/User.js';
import { createLogger } from '../src/config/logger.js';
import { createSessionService } from '../src/services/session.service.js';
import { clearAuthCollections, createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const config = testConfig();
const sessionService = createSessionService({ config, logger: createLogger(config) });

const validFarmer = () => ({
  name: 'Ramu',
  state: 'Andhra Pradesh',
  district: 'Krishna',
  mandal: 'Kankipadu',
  village: 'Kankipadu',
  pincode: '521151',
  location: { latitude: 16.4384, longitude: 80.7826 },
  deliveryRadiusKm: 10,
  servicePincodes: [],
  deliveryDays: ['mon', 'thu'],
  cutoffTime: '18:00',
  minOrderValue: 10000,
  deliveryFee: 2000,
});

const validBuyer = () => ({
  name: 'Padma',
  address: {
    houseAndStreet: '12-3, MG Road',
    landmark: 'Near Benz Circle',
    area: 'Vijayawada',
    pincode: '520010',
    location: { latitude: 16.5062, longitude: 80.648 },
  },
});

describe('profile API', () => {
  let app;
  let users;
  const as = (user) => ({
    Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
  });

  beforeAll(async () => {
    await connectTestDb('profile-test');
    await syncAllIndexes();
  });
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await clearAuthCollections();
    await Promise.all([FarmerProfile.deleteMany({}), BuyerProfile.deleteMany({})]);
    ({ app } = createAuthTestApp());
    const [farmer, buyer, newcomer, agent] = await User.create([
      { phone: '+919000000001', role: 'farmer' },
      { phone: '+919000000002', role: 'buyer' },
      { phone: '+919000000003' },
      { phone: '+919000000004', role: 'agent' },
    ]);
    users = { farmer, buyer, newcomer, agent };
  });

  describe('GET /profile', () => {
    it('reports no profile yet for a new farmer, so the app can start onboarding', async () => {
      const res = await request(app).get('/api/v1/profile').set(as(users.farmer));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ role: 'farmer', profile: null });
    });

    it('requires login', async () => {
      expect((await request(app).get('/api/v1/profile')).status).toBe(401);
    });
  });

  describe('PUT /profile/farmer', () => {
    const put = (user, body) => request(app).put('/api/v1/profile/farmer').set(as(user)).send(body);

    it('creates the profile, storing the location as GeoJSON [lng, lat]', async () => {
      const res = await put(users.farmer, validFarmer());

      expect(res.status).toBe(200);
      expect(res.body.profile).toMatchObject({
        name: 'Ramu',
        location: { latitude: 16.4384, longitude: 80.7826 },
        verificationLevel: 'phone_verified',
      });
      const stored = await FarmerProfile.findOne({ userId: users.farmer._id });
      expect(stored.location.coordinates).toEqual([80.7826, 16.4384]);
      expect(
        (await request(app).get('/api/v1/profile').set(as(users.farmer))).body.profile.name,
      ).toBe('Ramu');
    });

    it('updates in place on a second save and can remove the location', async () => {
      await put(users.farmer, validFarmer());

      const res = await put(users.farmer, {
        ...validFarmer(),
        name: 'Ramu Naidu',
        location: null,
        servicePincodes: ['521151'],
      });

      expect(res.body.profile).toMatchObject({ name: 'Ramu Naidu', location: null });
      expect(await FarmerProfile.countDocuments({ userId: users.farmer._id })).toBe(1);
    });

    it('ignores fields the farmer may not set', async () => {
      const res = await put(users.farmer, {
        ...validFarmer(),
        verificationLevel: 'trusted_seller',
        agentId: users.agent._id.toString(),
        userId: users.buyer._id.toString(),
      });

      expect(res.body.profile.verificationLevel).toBe('phone_verified');
      const stored = await FarmerProfile.findOne({ userId: users.farmer._id });
      expect(stored.agentId).toBeNull();
      expect(await FarmerProfile.countDocuments({ userId: users.buyer._id })).toBe(0);
    });

    it('rejects a district from the other state and a pincode from the wrong postal circle', async () => {
      const res = await put(users.farmer, {
        ...validFarmer(),
        district: 'Rangareddy',
        pincode: '500032',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.details.map((d) => d.field).sort()).toEqual([
        'body.district',
        'body.pincode',
      ]);
    });

    it('rejects a location outside India (for example swapped latitude and longitude)', async () => {
      const res = await put(users.farmer, {
        ...validFarmer(),
        location: { latitude: 80.7826, longitude: 16.4384 },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('body.location');
    });

    it('needs service pincodes when the farmer shares no location', async () => {
      const res = await put(users.farmer, {
        ...validFarmer(),
        location: null,
        servicePincodes: [],
      });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('body.servicePincodes');
    });

    it('rejects fractional paise, empty delivery days and a bad cutoff time', async () => {
      const res = await put(users.farmer, {
        ...validFarmer(),
        deliveryFee: 20.5,
        deliveryDays: [],
        cutoffTime: '7pm',
      });

      expect(res.body.error.details.map((d) => d.field).sort()).toEqual([
        'body.cutoffTime',
        'body.deliveryDays',
        'body.deliveryFee',
      ]);
    });

    it('is only for farmers', async () => {
      expect((await put(users.buyer, validFarmer())).status).toBe(403);
      expect((await put(users.newcomer, validFarmer())).body.error.code).toBe('ROLE_REQUIRED');
    });
  });

  describe('PUT /profile/buyer', () => {
    const put = (user, body) => request(app).put('/api/v1/profile/buyer').set(as(user)).send(body);

    it('creates the profile with one default address', async () => {
      const res = await put(users.buyer, validBuyer());

      expect(res.status).toBe(200);
      expect(res.body.profile).toMatchObject({
        name: 'Padma',
        addresses: [
          expect.objectContaining({
            landmark: 'Near Benz Circle',
            isDefault: true,
            location: { latitude: 16.5062, longitude: 80.648 },
          }),
        ],
      });
    });

    it('replaces the default address on a second save instead of adding another', async () => {
      await put(users.buyer, validBuyer());

      const res = await put(users.buyer, {
        name: 'Padma K',
        address: { landmark: 'Opp school', pincode: '520011' },
      });

      expect(res.body.profile.name).toBe('Padma K');
      expect(res.body.profile.addresses).toHaveLength(1);
      expect(res.body.profile.addresses[0]).toMatchObject({
        landmark: 'Opp school',
        location: null,
      });
    });

    it('requires a landmark and a valid pincode', async () => {
      const res = await put(users.buyer, {
        name: 'Padma',
        address: { landmark: ' ', pincode: '12' },
      });

      expect(res.body.error.details.map((d) => d.field).sort()).toEqual([
        'body.address.landmark',
        'body.address.pincode',
      ]);
    });

    it('is only for buyers', async () => {
      expect((await put(users.farmer, validBuyer())).status).toBe(403);
    });
  });

  describe('PATCH /users/me', () => {
    it('saves the language so SMS arrive in it', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(as(users.buyer))
        .send({ language: 'hi', role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ language: 'hi', role: 'buyer' });
    });

    it('rejects unsupported languages', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(as(users.buyer))
        .send({ language: 'fr' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /locations/districts', () => {
    it('lists all 59 districts of both states in three languages, cacheable', async () => {
      const res = await request(app).get('/api/v1/locations/districts');

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toMatch(/max-age=86400/);
      const counts = Object.fromEntries(res.body.states.map((s) => [s.state, s.districts.length]));
      expect(counts).toEqual({ 'Andhra Pradesh': 26, Telangana: 33 });
      expect(res.body.states[0].districts[0]).toEqual({
        en: 'Srikakulam',
        te: 'శ్రీకాకుళం',
        hi: 'श्रीकाकुलम',
      });
    });

    it('filters by state', async () => {
      const res = await request(app).get('/api/v1/locations/districts?state=Telangana');

      expect(res.body.states).toHaveLength(1);
      expect(res.body.states[0].districts.map((d) => d.en)).toContain('Rangareddy');
    });
  });

  it('district data has unique names with Telugu and Devanagari script', () => {
    for (const [, list] of Object.entries(DISTRICTS)) {
      expect(new Set(list.map((d) => d.en)).size).toBe(list.length);
      for (const district of list) {
        expect(district.te).toMatch(/[ఀ-౿]/);
        expect(district.hi).toMatch(/[ऀ-ॿ]/);
      }
    }
  });
});
