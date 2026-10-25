import mongoose from 'mongoose';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { actorFromUser, recordAudit } from './audit.service.js';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found');
const istDateString = (date) =>
  new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

// The buyer's view of an order. Until the farmer accepts, only their first name and village show.
export async function toBuyerOrder(order, farmerProfile) {
  const profile = farmerProfile ?? (await FarmerProfile.findOne({ userId: order.farmerId }).lean());
  return {
    id: order._id.toString(),
    checkoutGroupId: order.checkoutGroupId,
    status: order.status,
    farmer: profile && {
      id: profile.userId.toString(),
      firstName: profile.name.trim().split(/\s+/)[0],
      village: profile.village,
    },
    items: order.items.map((item) => ({
      productId: item.productId.toString(),
      cropName: item.cropName,
      unit: item.unit,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      lineTotal: item.lineTotal,
    })),
    delivery: {
      date: istDateString(order.delivery.slotDate),
      fee: order.delivery.fee,
      address: {
        landmark: order.delivery.address.landmark,
        area: order.delivery.address.area,
        pincode: order.delivery.address.pincode,
      },
    },
    priceBreakdown: order.priceBreakdown,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    statusHistory: order.statusHistory.map(({ status, at }) => ({ status, at })),
    canCancel: order.status === 'placed',
    createdAt: order.createdAt,
  };
}

export async function listBuyerOrders(user, { page, limit }) {
  const filter = { buyerId: user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  const profiles = await FarmerProfile.find({
    userId: { $in: orders.map((o) => o.farmerId) },
  }).lean();
  const byId = new Map(profiles.map((p) => [p.userId.toString(), p]));
  const items = await Promise.all(
    orders.map((o) => toBuyerOrder(o, byId.get(o.farmerId.toString()))),
  );
  return { items, page, limit, total };
}

export async function getBuyerOrder(user, id) {
  const order = await Order.findOne({ _id: id, buyerId: user._id }).lean();
  if (!order) throw notFound();
  return toBuyerOrder(order);
}

// Puts the ordered quantities back. A listing that sold out is on sale again; a paused or removed
// one stays as it is (the stock is still counted, ready if the farmer resumes).
async function restoreStock(order, session) {
  for (const item of order.items) {
    const restored = { $add: ['$availableQuantity', item.quantity] };
    await Product.updateOne(
      { _id: item.productId },
      [
        {
          $set: {
            availableQuantity: { $min: [restored, '$quantity'] },
            status: {
              $cond: [{ $eq: ['$status', 'out_of_stock'] }, 'available', '$status'],
            },
          },
        },
      ],
      { session, updatePipeline: true },
    );
  }
}

// placed -> cancelled (buyer) or rejected (farmer). The status change is conditional, so a
// cancel racing an accept (Prompt 11) can only win if the order is still "placed".
async function closePlacedOrder(user, id, { owner, status, reason, requestId }) {
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findOneAndUpdate(
      { _id: id, [owner]: user._id, status: 'placed' },
      {
        $set: { status },
        $push: { statusHistory: { status, at: new Date(), byUserId: user._id, reason } },
      },
      { session, returnDocument: 'after' },
    ).lean();
    if (!order) {
      const exists = await Order.exists({ _id: id, [owner]: user._id }).session(session);
      if (!exists) throw notFound();
      throw new AppError(409, 'INVALID_STATUS_CHANGE', 'This order can no longer be changed');
    }
    await restoreStock(order, session);
    await recordAudit(
      {
        actor: actorFromUser(user),
        action: `order.${status}`,
        entityType: 'Order',
        entityId: order._id,
        before: { status: 'placed' },
        after: { status },
        reason,
        requestId,
      },
      { session },
    );
    return order;
  });
}

export async function cancelOrder(user, id, { reason, requestId } = {}) {
  const order = await closePlacedOrder(user, id, {
    owner: 'buyerId',
    status: 'cancelled',
    reason,
    requestId,
  });
  return toBuyerOrder(order);
}

export async function rejectOrder(user, id, { reason, requestId } = {}) {
  const order = await closePlacedOrder(user, id, {
    owner: 'farmerId',
    status: 'rejected',
    reason,
    requestId,
  });
  return { id: order._id.toString(), status: order.status };
}
