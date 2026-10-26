import { BuyerProfile } from '../models/BuyerProfile.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { FraudFlag } from '../models/FraudFlag.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { actorFromUser, recordAudit } from './audit.service.js';

const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found');
const paged = async (model, filter, { page, limit }, sort = { createdAt: -1, _id: -1 }) => {
  const [items, total] = await Promise.all([
    model
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    model.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

const orderSummary = (o) => ({
  id: o._id.toString(),
  status: o.status,
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus,
  buyerTotal: o.priceBreakdown.buyerTotal,
  buyerName: o.delivery.address.name,
  pincode: o.delivery.address.pincode,
  createdAt: o.createdAt,
});

export async function listUsers({ role, q, page, limit }) {
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.phone = { $regex: q.replace(/\D/g, '') };
  const result = await paged(User, filter, { page, limit });
  const ids = result.items.map((u) => u._id);
  const [farmers, buyers] = await Promise.all([
    FarmerProfile.find({ userId: { $in: ids } })
      .select('userId name village')
      .lean(),
    BuyerProfile.find({ userId: { $in: ids } })
      .select('userId name')
      .lean(),
  ]);
  const names = new Map([...farmers, ...buyers].map((p) => [p.userId.toString(), p.name]));
  return {
    ...result,
    items: result.items.map((u) => ({
      id: u._id.toString(),
      phone: u.phone,
      role: u.role,
      status: u.status,
      name: names.get(u._id.toString()) ?? null,
      createdAt: u.createdAt,
    })),
  };
}

// Suspending blocks login and hides a farmer's listings from buyers (market.service checks it).
export async function setUserStatus(admin, id, { status, reason }, { requestId } = {}) {
  const user = await User.findById(id);
  if (!user) throw notFound();
  if (user.role === 'admin')
    throw new AppError(409, 'CANNOT_CHANGE_ADMIN', 'Admins cannot be suspended here');
  const before = user.status;
  user.status = status;
  await user.save();
  await recordAudit({
    actor: actorFromUser(admin),
    action: 'user.status_changed',
    entityType: 'User',
    entityId: user._id,
    before: { status: before },
    after: { status },
    reason,
    requestId,
  });
  return { id: user.id, status: user.status };
}

export async function listOrders({ status, page, limit }) {
  const result = await paged(Order, status ? { status } : {}, { page, limit });
  return { ...result, items: result.items.map(orderSummary) };
}

export async function listFraudFlags({ status = 'open', page, limit }) {
  const result = await paged(FraudFlag, { status }, { page, limit });
  const orders = await Order.find({
    _id: { $in: result.items.filter((f) => f.subjectType === 'order').map((f) => f.subjectId) },
  }).lean();
  const byId = new Map(orders.map((o) => [o._id.toString(), orderSummary(o)]));
  return {
    ...result,
    items: result.items.map((f) => ({
      id: f._id.toString(),
      ruleId: f.ruleId,
      severity: f.severity,
      action: f.action,
      status: f.status,
      evidence: f.evidence,
      subjectType: f.subjectType,
      order: byId.get(f.subjectId.toString()) ?? null,
      createdAt: f.createdAt,
    })),
  };
}

export async function resolveFraudFlag(admin, id, { status, note }, { requestId } = {}) {
  const flag = await FraudFlag.findOneAndUpdate(
    { _id: id, status: 'open' },
    { $set: { status, resolvedBy: admin._id, resolutionNote: note } },
    { returnDocument: 'after' },
  );
  if (!flag) throw new AppError(409, 'ALREADY_RESOLVED', 'This flag was already handled');
  await recordAudit({
    actor: actorFromUser(admin),
    action: 'fraud_flag.resolved',
    entityType: 'FraudFlag',
    entityId: flag._id,
    before: { status: 'open' },
    after: { status },
    reason: note,
    requestId,
  });
  return { id: flag.id, status: flag.status };
}
