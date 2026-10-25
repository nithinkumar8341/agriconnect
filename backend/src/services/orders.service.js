import { BuyerProfile } from '../models/BuyerProfile.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { allowedActions, TERMINAL_STATUSES } from './orderStateMachine.js';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const istDateString = (date) =>
  new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const firstName = (name) => name.trim().split(/\s+/)[0];
// Contact details are shared only once the farmer has committed to the order.
const SHARES_CONTACT = ['accepted', 'out_for_delivery'];

function commonView(order) {
  return {
    id: order._id.toString(),
    checkoutGroupId: order.checkoutGroupId,
    status: order.status,
    isOpen: !TERMINAL_STATUSES.includes(order.status),
    items: order.items.map((item) => ({
      productId: item.productId.toString(),
      cropName: item.cropName,
      unit: item.unit,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      lineTotal: item.lineTotal,
    })),
    priceBreakdown: order.priceBreakdown,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    statusHistory: order.statusHistory.map(({ status, at, reason }) => ({
      status,
      at,
      ...(reason && { reason }),
    })),
    createdAt: order.createdAt,
  };
}

// The buyer's view. The delivery code (deliveryCode) and the farmer's phone appear once accepted.
export function toBuyerOrder(order, { farmerProfile, farmerPhone, deliveryCode } = {}) {
  const contact = SHARES_CONTACT.includes(order.status);
  return {
    ...commonView(order),
    farmer: farmerProfile && {
      id: farmerProfile.userId.toString(),
      firstName: firstName(farmerProfile.name),
      village: farmerProfile.village,
      ...(contact && farmerPhone && { phone: farmerPhone }),
    },
    delivery: {
      date: istDateString(order.delivery.slotDate),
      fee: order.delivery.fee,
      address: {
        landmark: order.delivery.address.landmark,
        area: order.delivery.address.area,
        pincode: order.delivery.address.pincode,
      },
    },
    deliveryCode: contact ? (deliveryCode ?? null) : null,
    canCancel: allowedActions(order.status, 'buyer').includes('cancel'),
    actions: allowedActions(order.status, 'buyer'),
  };
}

// The farmer's view: before accepting, only the area and pincode; afterwards the full address,
// the buyer's name and phone, and the map location if the buyer shared one.
export function toFarmerOrder(order, { buyerPhone } = {}) {
  const contact = SHARES_CONTACT.includes(order.status);
  const { address } = order.delivery;
  return {
    ...commonView(order),
    buyer: {
      firstName: firstName(address.name),
      ...(contact && { name: address.name, phone: buyerPhone ?? null }),
    },
    delivery: {
      date: istDateString(order.delivery.slotDate),
      fee: order.delivery.fee,
      address: contact
        ? {
            houseAndStreet: address.houseAndStreet,
            landmark: address.landmark,
            area: address.area,
            pincode: address.pincode,
            location: address.location
              ? {
                  latitude: address.location.coordinates[1],
                  longitude: address.location.coordinates[0],
                }
              : null,
          }
        : { area: address.area, pincode: address.pincode },
    },
    deliveryOtpLocked: Boolean(order.deliveryOtpLocked),
    actions: allowedActions(order.status, 'farmer'),
  };
}

async function phonesById(ids) {
  const users = await User.find({ _id: { $in: ids } })
    .select('phone')
    .lean();
  return new Map(users.map((u) => [u._id.toString(), u.phone]));
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
  const farmerIds = orders.map((o) => o.farmerId);
  const [profiles, phones] = await Promise.all([
    FarmerProfile.find({ userId: { $in: farmerIds } }).lean(),
    phonesById(farmerIds),
  ]);
  const byId = new Map(profiles.map((p) => [p.userId.toString(), p]));
  const items = orders.map((o) =>
    toBuyerOrder(o, {
      farmerProfile: byId.get(o.farmerId.toString()),
      farmerPhone: phones.get(o.farmerId.toString()),
    }),
  );
  return { items, page, limit, total };
}

// Farmer order tabs: "new" waits for a decision, "active" is accepted or on the way, "done" is closed.
const FARMER_FILTERS = {
  new: ['placed'],
  active: ['accepted', 'out_for_delivery'],
  done: TERMINAL_STATUSES,
};

export async function listFarmerOrders(user, { status, page, limit }) {
  const filter = { farmerId: user._id };
  if (status) filter.status = { $in: FARMER_FILTERS[status] };
  // Open orders by delivery day (soonest first); closed ones newest first.
  const sort = status === 'done' ? { updatedAt: -1, _id: -1 } : { 'delivery.slotDate': 1, _id: 1 };
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  const phones = await phonesById(orders.map((o) => o.buyerId));
  const items = orders.map((o) =>
    toFarmerOrder(o, { buyerPhone: phones.get(o.buyerId.toString()) }),
  );
  return { items, page, limit, total };
}

export async function buyerContext(order) {
  const [farmerProfile, phones] = await Promise.all([
    FarmerProfile.findOne({ userId: order.farmerId }).lean(),
    phonesById([order.farmerId]),
  ]);
  return { farmerProfile, farmerPhone: phones.get(order.farmerId.toString()) };
}

export async function buyerDisplayName(order) {
  const profile = await BuyerProfile.findOne({ userId: order.buyerId }).select('name').lean();
  return firstName(profile?.name ?? order.delivery.address.name);
}

// Puts the ordered quantities back. A listing that sold out is on sale again; a paused or removed
// one stays as it is (the stock is still counted, ready if the farmer resumes).
export async function restoreStock(order, session) {
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
