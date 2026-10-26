import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { AppError } from '../utils/AppError.js';
import { getAppConfig } from './appConfig.service.js';
import { actorFromUser, recordAudit } from './audit.service.js';

// MVP payments: cash on delivery, plus a mock UPI "test mode" where the buyer taps Pay and the
// order is marked paid. No real gateway is called. All money movements go to the append-only
// ledger; each entry has a unique key per event, so a retry can never credit twice.
function addLedger(entries, session) {
  return entries.length ? LedgerEntry.create(entries, { session, ordered: true }) : [];
}

// Called by checkout for UPI: one payment record covering every farmer order in the checkout.
export async function createUpiPayment(user, checkoutGroupId, orders) {
  const existing = await Payment.findOne({ checkoutGroupId, buyerId: user._id }).lean();
  if (existing) return toClient(existing);
  const payment = await Payment.create({
    checkoutGroupId,
    orderIds: orders.map((o) => o._id ?? o.id),
    buyerId: user._id,
    method: 'upi',
    amount: orders.reduce((sum, o) => sum + o.priceBreakdown.buyerTotal, 0),
    provider: 'mock',
    providerOrderId: `mock_${randomUUID()}`,
  });
  return toClient(payment);
}

const toClient = (payment) => ({
  checkoutGroupId: payment.checkoutGroupId,
  amount: payment.amount,
  status: payment.status,
  testMode: true,
});

// The buyer taps "Pay" in test mode. Paying twice is harmless: the change is conditional on
// "created", so only the first call marks the orders paid and writes ledger entries.
export async function payUpi(user, checkoutGroupId, { requestId } = {}) {
  return mongoose.connection.transaction(async (session) => {
    const payment = await Payment.findOneAndUpdate(
      { checkoutGroupId, buyerId: user._id, method: 'upi', status: 'created' },
      { $set: { status: 'captured', providerPaymentId: `mockpay_${randomUUID()}` } },
      { session, returnDocument: 'after' },
    );
    if (!payment) {
      const exists = await Payment.exists({ checkoutGroupId, buyerId: user._id }).session(session);
      if (!exists) throw new AppError(404, 'NOT_FOUND', 'Not found');
      return { status: 'captured', alreadyPaid: true };
    }
    // "held": the platform keeps the money until delivery, then pays the farmer.
    await Order.updateMany(
      { _id: { $in: payment.orderIds }, paymentStatus: 'pending' },
      { $set: { paymentStatus: 'held' } },
      { session },
    );
    const orders = await Order.find({ _id: { $in: payment.orderIds } })
      .session(session)
      .lean();
    await addLedger(
      orders.map((order) => ({
        type: 'buyer_payment',
        userId: order.buyerId,
        orderId: order._id,
        direction: 'debit',
        amount: order.priceBreakdown.buyerTotal,
        simulated: true,
        description: 'UPI payment (test mode), held until delivery',
        idempotencyKey: `upi_payment:${order._id}`,
      })),
      session,
    );
    await recordAudit(
      {
        actor: actorFromUser(user),
        action: 'payment.captured',
        entityType: 'Payment',
        entityId: payment._id,
        after: { status: 'captured', amount: payment.amount },
        requestId,
      },
      { session },
    );
    return { status: 'captured', alreadyPaid: false };
  });
}

// On delivery: the farmer's earnings and the platform fee. COD cash went straight to the farmer;
// UPI payouts are simulated (labelled as such in the app and docs).
export async function settleDeliveredOrder(order, session) {
  const id = order._id.toString();
  const { buyerTotal, farmerEarnings, platformFee } = order.priceBreakdown;
  const cod = order.paymentMethod === 'cod';
  const entries = [
    {
      type: 'farmer_payout',
      userId: order.farmerId,
      orderId: order._id,
      direction: 'credit',
      amount: farmerEarnings,
      simulated: !cod,
      description: cod ? 'Cash collected at delivery' : 'Payout after delivery (simulated)',
      idempotencyKey: `payout:${id}`,
    },
  ];
  if (cod) {
    entries.push({
      type: 'buyer_payment',
      userId: order.buyerId,
      orderId: order._id,
      direction: 'debit',
      amount: buyerTotal,
      description: 'Cash paid on delivery',
      idempotencyKey: `cod_payment:${id}`,
    });
  }
  if (platformFee > 0) {
    entries.push({
      type: 'platform_fee',
      userId: null,
      orderId: order._id,
      direction: 'credit',
      amount: platformFee,
      description: 'Platform fee',
      idempotencyKey: `platform_fee:${id}`,
    });
  }
  await addLedger(entries, session);
}

// A refund ledger record (no gateway in the MVP): used when a paid order is cancelled or
// rejected, and for approved returns.
export async function refundOrder(order, { amount, reason, key, session }) {
  const refund = amount ?? order.priceBreakdown.buyerTotal;
  const full = refund >= order.priceBreakdown.buyerTotal;
  await Order.updateOne(
    { _id: order._id },
    { $set: { paymentStatus: full ? 'refunded' : 'partially_refunded' } },
    { session },
  );
  await addLedger(
    [
      {
        type: 'refund',
        userId: order.buyerId,
        orderId: order._id,
        direction: 'credit',
        amount: refund,
        simulated: true,
        description: `Refund${reason ? `: ${reason}` : ''}`.slice(0, 200),
        idempotencyKey: key ?? `refund:${order._id}`,
      },
    ],
    session,
  );
}

// Farmer earnings from delivered orders, with a clearly labelled estimate of what a typical mandi
// commission would have taken from the same produce.
export async function farmerEarnings(user, { page, limit }) {
  const filter = { farmerId: user._id, status: 'delivered' };
  const [totals] = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        itemsTotal: { $sum: '$priceBreakdown.itemsTotal' },
        deliveryFees: { $sum: '$priceBreakdown.deliveryFee' },
        platformFees: { $sum: '$priceBreakdown.platformFee' },
        earnings: { $sum: '$priceBreakdown.farmerEarnings' },
      },
    },
  ]);
  const [orders, mandiPercent] = await Promise.all([
    Order.find(filter)
      .sort({ deliveredAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    getAppConfig('mandiCommissionPercentEstimate'),
  ]);
  const summary = {
    orders: totals?.orders ?? 0,
    itemsTotal: totals?.itemsTotal ?? 0,
    deliveryFees: totals?.deliveryFees ?? 0,
    platformFees: totals?.platformFees ?? 0,
    earnings: totals?.earnings ?? 0,
  };
  return {
    totals: summary,
    mandiEstimate: {
      percent: mandiPercent,
      commissionAvoided: Math.round((summary.itemsTotal * mandiPercent) / 100),
    },
    items: orders.map((o) => ({
      id: o._id.toString(),
      deliveredAt: o.deliveredAt,
      items: o.items.map((i) => ({ cropName: i.cropName, quantity: i.quantity, unit: i.unit })),
      paymentMethod: o.paymentMethod,
      priceBreakdown: o.priceBreakdown,
      payoutSimulated: o.paymentMethod === 'upi',
    })),
    page,
    limit,
    total: summary.orders,
  };
}
