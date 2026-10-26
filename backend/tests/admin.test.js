import request from 'supertest';
import { createLogger } from '../src/config/logger.js';
import { BuyerProfile } from '../src/models/BuyerProfile.js';
import { FraudFlag } from '../src/models/FraudFlag.js';
import { syncAllIndexes } from '../src/models/index.js';
import { Order } from '../src/models/Order.js';
import { User } from '../src/models/User.js';
import { checkDuplicateAddress } from '../src/services/fraud.service.js';
import { createSessionService } from '../src/services/session.service.js';
import { createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const config = testConfig();
const sessionService = createSessionService({ config, logger: createLogger(config) });
const as = (user) => ({
  Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
});

describe('fraud flags and admin', () => {
  let app;
  let admin;
  let n = 0;

  // A buyer whose saved address is "12 Temple Road" (spelled slightly differently each time).
  async function buyerAtSharedAddress(spelling = '12, Temple Road') {
    n += 1;
    const user = await User.create({
      phone: `+9196000${String(n).padStart(5, '0')}`,
      role: 'buyer',
    });
    await BuyerProfile.create({
      userId: user._id,
      name: `Buyer ${n}`,
      addresses: [
        { houseAndStreet: spelling, landmark: 'Temple', pincode: '520010', isDefault: true },
      ],
    });
    return user;
  }

  const orderFor = (buyer) =>
    Order.create({
      checkoutGroupId: `g${n}`,
      buyerId: buyer._id,
      farmerId: admin._id,
      items: [
        {
          productId: admin._id,
          cropId: admin._id,
          cropName: { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' },
          unit: 'kg',
          quantity: 1,
          pricePerUnit: 3000,
          lineTotal: 3000,
        },
      ],
      delivery: {
        slotDate: new Date(),
        fee: 0,
        address: {
          name: 'Buyer',
          houseAndStreet: '12, Temple Road',
          landmark: 'Temple',
          pincode: '520010',
        },
      },
      priceBreakdown: {
        itemsTotal: 3000,
        deliveryFee: 0,
        platformFee: 0,
        buyerTotal: 3000,
        farmerEarnings: 3000,
      },
      paymentMethod: 'cod',
    });

  beforeAll(async () => {
    await connectTestDb('admin-test');
    await syncAllIndexes();
    ({ app } = createAuthTestApp());
  });
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await Promise.all([User, BuyerProfile, Order, FraudFlag].map((m) => m.deleteMany({})));
    admin = await User.create({ phone: '+919500000001', role: 'admin' });
  });

  it('flags the 4th account at one address and lets an admin review it', async () => {
    const buyers = [];
    for (const spelling of [
      '12, Temple Road',
      '12 temple road',
      '12 TEMPLE ROAD.',
      '12-Temple Road',
    ]) {
      buyers.push(await buyerAtSharedAddress(spelling));
    }
    const order = await orderFor(buyers[3]);

    const [flag] = await checkDuplicateAddress([order]);
    expect(flag).toMatchObject({
      ruleId: 'duplicate_address',
      evidence: { accounts: 4, limit: 3 },
    });

    const list = await request(app).get('/api/v1/admin/fraud-flags').set(as(admin));
    expect(list.body).toMatchObject({
      total: 1,
      items: [{ ruleId: 'duplicate_address', order: { id: order.id } }],
    });

    const resolved = await request(app)
      .post(`/api/v1/admin/fraud-flags/${flag.id}/resolve`)
      .set(as(admin))
      .send({ status: 'dismissed', note: 'Same family' });
    expect(resolved.body).toEqual({ id: flag.id, status: 'dismissed' });

    const users = await request(app).get('/api/v1/admin/users?role=buyer').set(as(admin));
    expect(users.body.total).toBe(4);
    const suspended = await request(app)
      .post(`/api/v1/admin/users/${buyers[0].id}/status`)
      .set(as(admin))
      .send({ status: 'suspended', reason: 'test' });
    expect(suspended.body.status).toBe('suspended');
  });

  it('does not flag 3 accounts, and refuses non-admins', async () => {
    const buyers = [
      await buyerAtSharedAddress(),
      await buyerAtSharedAddress(),
      await buyerAtSharedAddress(),
    ];
    expect(await checkDuplicateAddress([await orderFor(buyers[0])])).toEqual([]);
    expect((await request(app).get('/api/v1/admin/fraud-flags').set(as(buyers[0]))).status).toBe(
      403,
    );
  });
});
