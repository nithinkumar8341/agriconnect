import mongoose from 'mongoose';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { AppError } from '../utils/AppError.js';
import { getAppConfig } from './appConfig.service.js';
import { actorFromUser, recordAudit } from './audit.service.js';
import { notify } from './notification.service.js';
import { refundOrder } from './payment.service.js';

const HOUR_MS = 60 * 60 * 1000;
const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found');

// Can this delivered order still be reported? (Perishables: no change-of-mind returns, only
// problems reported within a short window after delivery; CLAUDE.md.)
export async function returnWindowOpen(order, now = new Date()) {
  if (order.status !== 'delivered' || !order.deliveredAt) return false;
  const hours = await getAppConfig('returnWindowHours');
  return now.getTime() - new Date(order.deliveredAt).getTime() <= hours * HOUR_MS;
}

export const toReturnView = (r) =>
  r && {
    id: r._id.toString(),
    orderId: r.orderId.toString(),
    reason: r.reason,
    note: r.note,
    photos: r.photos.map((p) => ({ url: p.url, thumbnailUrl: p.thumbnailUrl })),
    status: r.status,
    outcome: r.resolution?.outcome ?? null,
    refundAmount: r.resolution?.amount ?? null,
    createdAt: r.createdAt,
  };

export const findReturnForOrder = (orderId) => ReturnRequest.findOne({ orderId }).lean();

// The buyer reports a problem with a reason and one photo they uploaded (POST /uploads/photos).
export async function requestReturn(
  buyer,
  orderId,
  { reason, note = '', photoAssetId },
  { now = new Date() } = {},
) {
  const order = await Order.findOne({ _id: orderId, buyerId: buyer._id }).lean();
  if (!order) throw notFound();
  if (!(await returnWindowOpen(order, now))) {
    throw new AppError(
      409,
      'RETURN_WINDOW_CLOSED',
      'Problems can be reported only soon after delivery',
    );
  }
  if (!(await getAppConfig('returnReasons')).includes(reason)) {
    throw new AppError(400, 'INVALID_REASON', 'Choose a reason from the list');
  }
  if (await ReturnRequest.exists({ orderId: order._id })) {
    throw new AppError(409, 'ALREADY_REPORTED', 'A problem was already reported for this order');
  }

  return mongoose.connection.transaction(async (session) => {
    const photo = await MediaAsset.findOneAndUpdate(
      { _id: photoAssetId, ownerId: buyer._id, status: 'pending' },
      { $set: { status: 'attached' } },
      { session, returnDocument: 'after' },
    );
    if (!photo) throw new AppError(400, 'PHOTO_UNAVAILABLE', 'Take the photo again');
    const products = await Product.find({ _id: { $in: order.items.map((i) => i.productId) } })
      .select('photos')
      .session(session)
      .lean();
    const [request] = await ReturnRequest.create(
      [
        {
          orderId: order._id,
          buyerId: buyer._id,
          farmerId: order.farmerId,
          items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          reason,
          note,
          photos: [{ url: photo.url, thumbnailUrl: photo.thumbnailUrl }],
          // Evidence for the admin: what the farmer listed and when it was delivered.
          evidence: {
            listingPhotoUrls: products.flatMap((p) => (p.photos ?? []).map((ph) => ph.url)),
            deliveredAt: order.deliveredAt,
          },
        },
      ],
      { session },
    );
    await notify(
      {
        userId: order.farmerId,
        templateKey: 'return.requested',
        params: { orderId: order._id.toString(), reason },
        link: `/farmer/orders/${order._id}`,
      },
      { session },
    );
    return toReturnView(request.toObject());
  });
}

export async function listReturns({ status = 'open', page, limit }) {
  const filter = { status };
  const [items, total] = await Promise.all([
    ReturnRequest.find(filter)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ReturnRequest.countDocuments(filter),
  ]);
  const orders = await Order.find({ _id: { $in: items.map((r) => r.orderId) } }).lean();
  const byId = new Map(orders.map((o) => [o._id.toString(), o]));
  return {
    items: items.map((r) => {
      const order = byId.get(r.orderId.toString());
      return {
        ...toReturnView(r),
        evidence: r.evidence,
        order: order && {
          buyerName: order.delivery.address.name,
          itemsTotal: order.priceBreakdown.itemsTotal,
          paymentMethod: order.paymentMethod,
          items: order.items.map((i) => ({
            cropName: i.cropName,
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
      };
    }),
    total,
    page,
    limit,
  };
}

// Admin decision. Approve: refund the produce value (delivery fee is not refunded), take it back
// from the farmer's earnings, and put "wrong item" produce back on sale (damaged or rotten produce
// cannot be resold). Reject: nothing moves. Either way the buyer is told.
export async function resolveReturn(admin, id, { decision, note }, { requestId } = {}) {
  return mongoose.connection.transaction(async (session) => {
    const request = await ReturnRequest.findOneAndUpdate(
      { _id: id, status: 'open' },
      {
        $set: {
          status: 'resolved',
          resolution: {
            outcome: decision === 'approve' ? 'partial_refund' : 'rejected',
            note,
            resolvedBy: admin._id,
            at: new Date(),
          },
        },
      },
      { session, returnDocument: 'after' },
    );
    if (!request) throw new AppError(409, 'ALREADY_RESOLVED', 'This return was already handled');
    const order = await Order.findById(request.orderId).session(session).lean();

    if (decision === 'approve') {
      const amount = order.priceBreakdown.itemsTotal;
      request.resolution.amount = amount;
      await request.save({ session });
      await refundOrder(order, {
        amount,
        reason: request.reason,
        key: `return:${request._id}`,
        session,
      });
      await LedgerEntry.create(
        [
          {
            type: 'farmer_payout',
            userId: order.farmerId,
            orderId: order._id,
            direction: 'debit',
            amount,
            simulated: order.paymentMethod === 'upi',
            description: `Return approved: ${request.reason}`,
            idempotencyKey: `return_debit:${request._id}`,
          },
        ],
        { session },
      );
      if (request.reason === 'wrong_item') {
        for (const item of request.items) {
          await Product.updateOne(
            { _id: item.productId },
            [
              {
                $set: {
                  availableQuantity: {
                    $min: [{ $add: ['$availableQuantity', item.quantity] }, '$quantity'],
                  },
                },
              },
            ],
            { session, updatePipeline: true },
          );
        }
      }
    }

    await recordAudit(
      {
        actor: actorFromUser(admin),
        action: `return.${decision === 'approve' ? 'approved' : 'rejected'}`,
        entityType: 'ReturnRequest',
        entityId: request._id,
        after: { outcome: request.resolution.outcome, amount: request.resolution.amount ?? 0 },
        reason: note,
        requestId,
      },
      { session },
    );
    await notify(
      {
        userId: order.buyerId,
        templateKey: decision === 'approve' ? 'return.approved' : 'return.rejected',
        params: { orderId: order._id.toString() },
        link: `/buyer/orders/${order._id}`,
      },
      { session },
    );
    return toReturnView(request.toObject());
  });
}
