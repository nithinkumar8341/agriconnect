import http from 'node:http';
import request from 'supertest';
import { createLogger } from '../src/config/logger.js';
import { Crop } from '../src/models/Crop.js';
import { FarmerProfile } from '../src/models/FarmerProfile.js';
import { PriceReference } from '../src/models/PriceReference.js';
import { User } from '../src/models/User.js';
import { createSessionService } from '../src/services/session.service.js';
import { createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const sessionService = createSessionService({
  config: testConfig(),
  logger: createLogger(testConfig()),
});
const as = (user) => ({
  Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
});

describe('AI features (backend side)', () => {
  let stub;
  let stubUrl;
  let calls;
  let farmer;

  beforeAll(async () => {
    await connectTestDb('ai-test');
    // Stands in for the Python AI service: records each call and answers with a fixed body.
    stub = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        calls.push({ path: req.url, key: req.headers['x-internal-key'], body: JSON.parse(body) });
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ status: 'mandi_reference', suggested: 2000 }));
      });
    });
    await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve));
    stubUrl = `http://127.0.0.1:${stub.address().port}`;

    farmer = await User.create({ phone: '+919700000001', role: 'farmer' });
    await FarmerProfile.create({
      userId: farmer._id,
      name: 'Ramu',
      village: 'Kankipadu',
      mandal: 'Kankipadu',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      pincode: '521151',
      deliveryRadiusKm: 10,
      deliveryDays: ['mon'],
    });
  });

  beforeEach(() => {
    calls = [];
  });

  afterAll(async () => {
    stub.close();
    await dropTestDbAndDisconnect();
  });

  it('sends district mandi prices per kg to the AI service and returns its hint', async () => {
    const { _id: cropId } = await Crop.create({
      slug: 'tomato',
      names: { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' },
      category: 'vegetable',
      defaultUnit: 'kg',
      allowedUnits: ['kg'],
      quantityPresets: [10],
      quantityStep: 0.5,
      shelfLifeDays: 5,
      icon: '🍅',
    });
    await PriceReference.create({
      cropId,
      commodity: 'Tomato',
      market: 'Vijayawada',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      minPrice: 150000,
      modalPrice: 200000,
      maxPrice: 250000,
      date: new Date('2026-10-25'),
      source: 'sample',
    });
    const { app } = createAuthTestApp({ AI_SERVICE_URL: stubUrl, AI_INTERNAL_KEY: 'k1' });

    const res = await request(app).get('/api/v1/ai/price-hint?crop=tomato&unit=kg').set(as(farmer));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ suggested: 2000, district: 'Krishna', windowDays: 30 });
    expect(calls).toEqual([
      {
        path: '/price/recommend',
        key: 'k1',
        body: {
          unit: 'kg',
          sales: [],
          mandi: [{ modalPrice: 2000, market: 'Vijayawada', date: '2026-10-25' }],
        },
      },
    ]);
  });

  it('answers 503 AI_UNAVAILABLE when the AI service is down', async () => {
    const { app } = createAuthTestApp({ AI_SERVICE_URL: 'http://127.0.0.1:9' });
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set(as(farmer))
      .send({ message: 'How do I pay?' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
  });
});
