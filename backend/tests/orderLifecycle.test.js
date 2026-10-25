import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createLogger } from '../src/config/logger.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { BuyerProfile } from '../src/models/BuyerProfile.js';
import { Crop } from '../src/models/Crop.js';
import { FarmerProfile } from '../src/models/FarmerProfile.js';
import { syncAllIndexes } from '../src/models/index.js';
import { Notification } from '../src/models/Notification.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { seedCrops } from '../src/seeds/seedCrops.js';
import { createDeliveryOtp } from '../src/services/deliveryOtp.js';
import { allowedActions, nextStatus, ORDER_ACTIONS } from '../src/services/orderStateMachine.js';
import { createSessionService } from '../src/services/session.service.js';
import { createAuthTestApp } from './helpers/auth.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const config = testConfig();
const sessionService = createSessionService({ config, logger: createLogger(config) });
const STATUSES = [
  'placed',
  'accepted',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'rejected',
  'failed',
];

describe('order state machine', () => {
  it('allows exactly the transitions in CLAUDE.md and nothing else', () => {
    const allowed = [];
    for (const status of STATUSES) {
      for (const action of Object.keys(ORDER_ACTIONS)) {
        const to = nextStatus(status, action);
        if (to) allowed.push(`${status} -${action}-> ${to}`);
      }
    }
    expect(allowed.sort()).toEqual(
      [
        'placed -accept-> accepted',
        'placed -reject-> rejected',
        'placed -cancel-> cancelled',
        'accepted -dispatch-> out_for_delivery',
        'accepted -fail-> failed',
        'out_for_delivery -deliver-> delivered',
        'out_for_delivery -fail-> failed',
      ].sort(),
    );
    expect(nextStatus('placed', 'teleport')).toBeNull();
    expect(allowedActions('placed', 'buyer')).toEqual(['cancel']);
    expect(allowedActions('out_for_delivery', 'farmer')).toEqual(['deliver', 'fail']);
    expect(allowedActions('delivered', 'farmer')).toEqual([]);
  });

  it('derives a 4-digit code that only verifies for its own order', () => {
    const otp = createDeliveryOtp('x'.repeat(40));
    const { salt, hash } = otp.issue('order-1');
    const code = otp.codeFor('order-1', salt);
    expect(code).toMatch(/^\d{4}$/);
    expect(hash).not.toContain(code);
    expect(otp.verify('order-1', code, hash)).toBe(true);
    expect(otp.verify('order-2', code, hash)).toBe(false);
    expect(otp.verify('order-1', 'abcd', hash)).toBe(false);
  });
});

describe('order lifecycle API', () => {
  let app;
  let sms;
  let crops;
  let buyer;
  let farmer;
  let product;
  const as = (user) => ({
    Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
  });
  const act = (user, id, action, body = {}) =>
    request(app).post(`/api/v1/orders/${id}/${action}`).set(as(user)).send(body);
  const view = (user, id) => request(app).get(`/api/v1/orders/${id}`).set(as(user));

  async function placeOrder(quantity = 5) {
    const quote = await request(app)
      .post('/api/v1/checkout/quote')
      .set(as(buyer))
      .send({ items: [{ productId: product.id, quantity }] });
    const res = await request(app)
      .post('/api/v1/checkout')
      .set(as(buyer))
      .send({
        idempotencyKey: randomUUID(),
        paymentMethod: 'cod',
        items: [{ productId: product.id, quantity, pricePerUnit: 3000 }],
        deliveryDates: { [farmer.id]: quote.body.groups[0].deliveryDates[0] },
      });
    expect(res.status).toBe(201);
    return res.body.orders[0].id;
  }

  beforeAll(async () => {
    await connectTestDb('order-lifecycle-test');
    await syncAllIndexes();
    await seedCrops();
    crops = Object.fromEntries((await Crop.find().lean()).map((c) => [c.slug, c]));
    ({ app, sms } = createAuthTestApp());
  });
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(async () => {
    await Promise.all(
      [User, BuyerProfile, FarmerProfile, Product, Order, Notification].map((m) =>
        m.deleteMany({}),
      ),
    );
    sms.messages.length = 0;
    [buyer, farmer] = await User.create([
      { phone: '+919000000101', role: 'buyer', language: 'te' },
      { phone: '+919000000102', role: 'farmer' },
    ]);
    await BuyerProfile.create({
      userId: buyer._id,
      name: 'Padma Rani',
      addresses: [
        {
          houseAndStreet: '12-3, Temple Street',
          landmark: 'Temple',
          area: 'Benz Circle',
          pincode: '520010',
          location: { type: 'Point', coordinates: [80.6, 16.5] },
          isDefault: true,
        },
      ],
    });
    await FarmerProfile.create({
      userId: farmer._id,
      name: 'Ramu Naidu',
      village: 'Kankipadu',
      mandal: 'Kankipadu',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      pincode: '521151',
      location: { type: 'Point', coordinates: [80.61, 16.5] },
      deliveryRadiusKm: 10,
      deliveryDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      minOrderValue: 0,
    });
    product = await Product.create({
      farmerId: farmer._id,
      cropId: crops.tomato._id,
      quantity: 20,
      availableQuantity: 20,
      unit: 'kg',
      pricePerUnit: 3000,
      harvestDate: new Date(),
    });
  });

  it('runs the happy path: accept, out for delivery, deliver with the code; COD becomes paid', async () => {
    const id = await placeOrder();
    expect(
      await Notification.countDocuments({ userId: farmer._id, templateKey: 'order.placed' }),
    ).toBe(1);

    // Before accepting, the farmer sees only the area; the buyer sees no code.
    const early = (await view(farmer, id)).body.order;
    expect(early.delivery.address).toEqual({ area: 'Benz Circle', pincode: '520010' });
    expect(early.buyer).toEqual({ firstName: 'Padma' });
    expect(early.actions).toEqual(['accept', 'reject']);
    expect((await view(buyer, id)).body.order.deliveryCode).toBeNull();

    const accepted = await act(farmer, id, 'accept');
    expect(accepted.status).toBe(200);
    expect(accepted.body.order).toMatchObject({
      status: 'accepted',
      buyer: { name: 'Padma Rani', phone: '+919000000101' },
      delivery: {
        address: { houseAndStreet: '12-3, Temple Street', location: { latitude: 16.5 } },
      },
      actions: ['dispatch', 'fail'],
    });
    const buyerView = (await view(buyer, id)).body.order;
    expect(buyerView.deliveryCode).toMatch(/^\d{4}$/);
    expect(buyerView.farmer.phone).toBe('+919000000102');
    expect(buyerView.canCancel).toBe(false);
    // The SMS goes in the buyer's language (Telugu) and carries the code.
    expect(sms.messages.at(-1)).toMatchObject({ to: '+919000000101' });
    expect(sms.messages.at(-1).message).toContain('అంగీకరించారు');
    expect(sms.messages.at(-1).message).toContain(buyerView.deliveryCode);
    const stored = await Order.findById(id).select('+deliveryOtpHash +deliveryOtpSalt').lean();
    expect(JSON.stringify(stored)).not.toContain(`"${buyerView.deliveryCode}"`);

    expect((await act(farmer, id, 'dispatch')).body.order.status).toBe('out_for_delivery');
    const delivered = await act(farmer, id, 'deliver', { code: buyerView.deliveryCode });
    expect(delivered.body.order).toMatchObject({
      status: 'delivered',
      paymentStatus: 'paid',
      isOpen: false,
      actions: [],
    });
    expect(delivered.body.order.statusHistory.map((h) => h.status)).toEqual([
      'placed',
      'accepted',
      'out_for_delivery',
      'delivered',
    ]);
    expect(sms.messages).toHaveLength(3);
    expect(await AuditLog.countDocuments({ entityId: id, action: { $regex: /^order\./ } })).toBe(4);
    expect(await Notification.find({ userId: buyer._id }).distinct('templateKey')).toEqual(
      expect.arrayContaining(['order.accepted', 'order.out_for_delivery', 'order.delivered']),
    );
    // Delivered stock stays sold.
    expect((await Product.findById(product.id)).availableQuantity).toBe(15);
  });

  it('counts wrong codes and locks after 5', async () => {
    const id = await placeOrder();
    await act(farmer, id, 'accept');
    await act(farmer, id, 'dispatch');
    const code = (await view(buyer, id)).body.order.deliveryCode;
    const wrong = code === '0000' ? '1111' : '0000';

    const first = await act(farmer, id, 'deliver', { code: wrong });
    expect(first.status).toBe(400);
    expect(first.body.error).toMatchObject({
      code: 'DELIVERY_OTP_WRONG',
      details: { attemptsLeft: 4 },
    });
    for (let i = 0; i < 4; i += 1) await act(farmer, id, 'deliver', { code: wrong });

    const locked = await act(farmer, id, 'deliver', { code });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('DELIVERY_OTP_LOCKED');
    expect((await view(farmer, id)).body.order.deliveryOtpLocked).toBe(true);
    expect((await act(farmer, id, 'deliver', {})).status).toBe(429);
  });

  it('restores stock on reject, cancel and failed delivery', async () => {
    const rejected = await placeOrder(5);
    const res = await act(farmer, rejected, 'reject', { reason: 'Crop damaged by rain' });
    expect(res.body.order.statusHistory.at(-1)).toMatchObject({
      status: 'rejected',
      reason: 'Crop damaged by rain',
    });
    expect((await Product.findById(product.id)).availableQuantity).toBe(20);
    expect(
      await Notification.findOne({ userId: buyer._id, templateKey: 'order.rejected' }).lean(),
    ).toMatchObject({ params: { reason: 'Crop damaged by rain', name: 'Ramu' } });

    const cancelled = await placeOrder(5);
    expect((await act(buyer, cancelled, 'cancel')).body.order.status).toBe('cancelled');
    expect((await Product.findById(product.id)).availableQuantity).toBe(20);
    expect(
      await Notification.countDocuments({ userId: farmer._id, templateKey: 'order.cancelled' }),
    ).toBe(1);

    // All that is left (kept under the new-buyer cash limit of ₹500).
    await Product.updateOne({ _id: product._id }, { $set: { availableQuantity: 15 } });
    const failed = await placeOrder(15);
    expect((await Product.findById(product.id)).status).toBe('out_of_stock');
    await act(farmer, failed, 'accept');
    await act(farmer, failed, 'dispatch');
    expect((await act(farmer, failed, 'fail')).body.error.code).toBe('REASON_REQUIRED');
    const failedRes = await act(farmer, failed, 'fail', { reason: 'Nobody at home' });
    expect(failedRes.body.order.status).toBe('failed');
    expect(await Product.findById(product.id)).toMatchObject({
      availableQuantity: 15,
      status: 'available',
    });
  });

  it('rejects invalid transitions, the wrong role and other people', async () => {
    const id = await placeOrder();
    const stranger = await User.create({ phone: '+919000000199', role: 'farmer' });

    expect((await act(farmer, id, 'dispatch')).body.error).toMatchObject({
      code: 'INVALID_STATUS_CHANGE',
      details: { status: 'placed' },
    });
    expect((await act(farmer, id, 'deliver', { code: '1234' })).status).toBe(409);
    expect((await act(buyer, id, 'accept')).status).toBe(403);
    expect((await act(stranger, id, 'accept')).status).toBe(404);
    expect((await view(stranger, id)).status).toBe(404);

    await act(farmer, id, 'accept');
    expect((await act(buyer, id, 'cancel')).body.error.code).toBe('INVALID_STATUS_CHANGE');
    expect((await act(farmer, id, 'accept')).status).toBe(409);
  });

  it('lets only one of a racing cancel and accept win', async () => {
    const id = await placeOrder();
    const [cancel, accept] = await Promise.all([
      act(buyer, id, 'cancel'),
      act(farmer, id, 'accept'),
    ]);
    expect([cancel.status, accept.status].sort()).toEqual([200, 409]);
    const order = await Order.findById(id).lean();
    expect(['cancelled', 'accepted']).toContain(order.status);
    expect(order.statusHistory).toHaveLength(2);
    expect((await Product.findById(product.id)).availableQuantity).toBe(
      order.status === 'cancelled' ? 20 : 15,
    );
  });

  it('lists farmer orders by tab and the notification inbox', async () => {
    const a = await placeOrder(2);
    const b = await placeOrder(3);
    await act(farmer, b, 'accept');
    const tab = (status) =>
      request(app).get('/api/v1/orders/farmer').query({ status }).set(as(farmer));

    expect((await tab('new')).body.items.map((o) => o.id)).toEqual([a]);
    expect((await tab('active')).body.items.map((o) => o.id)).toEqual([b]);
    expect((await tab('done')).body.total).toBe(0);

    const inbox = await request(app).get('/api/v1/notifications').set(as(buyer));
    expect(inbox.body).toMatchObject({ total: 1, unread: 1 });
    expect(inbox.body.items[0]).toMatchObject({
      templateKey: 'order.accepted',
      params: { name: 'Ramu' },
      link: `/buyer/orders/${b}`,
      read: false,
    });
    await request(app).post(`/api/v1/notifications/${inbox.body.items[0].id}/read`).set(as(buyer));
    expect((await request(app).get('/api/v1/notifications').set(as(buyer))).body.unread).toBe(0);
    await request(app).post('/api/v1/notifications/read-all').set(as(farmer));
    expect((await request(app).get('/api/v1/notifications').set(as(farmer))).body.unread).toBe(0);
  });
});
