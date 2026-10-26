import mongoose from 'mongoose';
import { BuyerProfile } from '../models/BuyerProfile.js';
import { Crop } from '../models/Crop.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { getAppConfig } from './appConfig.service.js';
import { actorFromUser, recordAudit } from './audit.service.js';
import { deliveryDateOptions, servesBuyer, toFarmerSummary } from './market.service.js';
import { checkDuplicateAddress } from './fraud.service.js';
import { notify } from './notification.service.js';
import { createUpiPayment } from './payment.service.js';
import { buyerContext, toBuyerOrder } from './orders.service.js';
import { computeOrderPricing } from './pricing.service.js';

const ACTIVE_STATUSES = ['placed', 'accepted', 'out_for_delivery'];
// Thrown inside the transaction when a conditional stock update matches nothing.
class StockChanged extends Error {}

async function buyerAddress(user, addressId) {
  const profile = await BuyerProfile.findOne({ userId: user._id }).lean();
  const addresses = profile?.addresses ?? [];
  const address = addressId
    ? addresses.find((a) => a._id.toString() === addressId)
    : (addresses.find((a) => a.isDefault) ?? addresses[0]);
  if (!address) throw new AppError(400, 'ADDRESS_REQUIRED', 'Add a delivery address first');
  return { profile, address };
}

// Same item twice in the cart counts once, with the quantities added.
function mergeItems(items) {
  const merged = new Map();
  for (const item of items) {
    const existing = merged.get(item.productId);
    merged.set(
      item.productId,
      existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item },
    );
  }
  return [...merged.values()];
}

// Re-reads every product, price, stock level and farmer from the database (never trusting the
// cart), groups the lines by farmer and lists exactly what changed since the buyer saw the cart.
export async function buildQuote(user, { items, addressId }, { now = new Date() } = {}) {
  const { address } = await buyerAddress(user, addressId);
  const requested = mergeItems(items);
  const products = await Product.find({ _id: { $in: requested.map((i) => i.productId) } }).lean();
  const productById = new Map(products.map((p) => [p._id.toString(), p]));
  const farmerIds = [...new Set(products.map((p) => p.farmerId.toString()))];
  const [profiles, activeUsers, crops, platformFeePercent] = await Promise.all([
    FarmerProfile.find({ userId: { $in: farmerIds } }).lean(),
    User.find({ _id: { $in: farmerIds }, status: 'active' })
      .select('_id')
      .lean(),
    Crop.find({ _id: { $in: products.map((p) => p.cropId) } }).lean(),
    getAppConfig('platformFeePercent'),
  ]);
  const profileById = new Map(profiles.map((p) => [p.userId.toString(), p]));
  const active = new Set(activeUsers.map((u) => u._id.toString()));
  const cropById = new Map(crops.map((c) => [c._id.toString(), c]));
  const buyerAt = {
    point: address.location?.coordinates ?? null,
    pincode: address.pincode,
  };

  const changes = [];
  const linesByFarmer = new Map();
  for (const item of requested) {
    const product = productById.get(item.productId);
    const farmerKey = product?.farmerId.toString();
    const profile = profileById.get(farmerKey);
    if (!product || product.status !== 'available' || !profile || !active.has(farmerKey)) {
      changes.push({ productId: item.productId, kind: 'unavailable' });
      continue;
    }
    if (!servesBuyer(profile, buyerAt)) {
      changes.push({ productId: item.productId, kind: 'not_delivered' });
      continue;
    }
    let quantity = item.quantity;
    if (product.availableQuantity < quantity) {
      changes.push({
        productId: item.productId,
        kind: 'stock',
        requested: quantity,
        available: product.availableQuantity,
      });
      quantity = product.availableQuantity;
    }
    if (item.pricePerUnit !== undefined && item.pricePerUnit !== product.pricePerUnit) {
      changes.push({
        productId: item.productId,
        kind: 'price',
        old: item.pricePerUnit,
        new: product.pricePerUnit,
      });
    }
    if (quantity <= 0) continue;
    const lines = linesByFarmer.get(farmerKey) ?? [];
    lines.push({ product, crop: cropById.get(product.cropId.toString()), quantity });
    linesByFarmer.set(farmerKey, lines);
  }

  const groups = [...linesByFarmer.entries()].map(([farmerKey, lines]) => {
    const profile = profileById.get(farmerKey);
    const { items: priced, priceBreakdown } = computeOrderPricing({
      items: lines.map(({ product, quantity }) => ({
        quantity,
        pricePerUnit: product.pricePerUnit,
      })),
      deliveryFee: profile.deliveryFee,
      platformFeePercent,
    });
    return {
      farmer: toFarmerSummary(profile),
      items: lines.map(({ product, crop, quantity }, index) => ({
        productId: product._id.toString(),
        cropId: product.cropId,
        crop: crop && { slug: crop.slug, names: crop.names, image: crop.image },
        unit: product.unit,
        quantity,
        pricePerUnit: product.pricePerUnit,
        lineTotal: priced[index].lineTotal,
        availableQuantity: product.availableQuantity,
        quantityStep: crop?.quantityStep ?? 1,
      })),
      priceBreakdown,
      minOrderValue: profile.minOrderValue,
      meetsMinimum: priceBreakdown.itemsTotal >= profile.minOrderValue,
      deliveryDates: deliveryDateOptions(profile, now),
    };
  });

  const sum = (key) => groups.reduce((total, g) => total + g.priceBreakdown[key], 0);
  return {
    address: {
      id: address._id.toString(),
      label: address.label,
      landmark: address.landmark,
      area: address.area,
      pincode: address.pincode,
    },
    groups,
    totals: {
      itemsTotal: sum('itemsTotal'),
      deliveryFee: sum('deliveryFee'),
      buyerTotal: sum('buyerTotal'),
    },
    changes,
  };
}

// COD abuse controls (CLAUDE.md): thresholds come from AppConfig.
async function checkCodLimits(user, groups) {
  const [cap, newBuyerOrders, maxActive, blockAfter] = await Promise.all([
    getAppConfig('codCapNewBuyer'),
    getAppConfig('newBuyerDeliveredOrders'),
    getAppConfig('maxActiveCodOrders'),
    getAppConfig('codBlockAfterFailedDeliveries'),
  ]);
  const base = { buyerId: user._id, paymentMethod: 'cod' };
  const [delivered, failed, open] = await Promise.all([
    Order.countDocuments({ buyerId: user._id, status: 'delivered' }),
    Order.countDocuments({ ...base, status: 'failed' }),
    Order.countDocuments({ ...base, status: { $in: ACTIVE_STATUSES } }),
  ]);
  if (failed >= blockAfter) {
    throw new AppError(403, 'COD_BLOCKED', 'Cash on delivery is not available on this account');
  }
  if (open + groups.length > maxActive) {
    throw new AppError(409, 'TOO_MANY_OPEN_ORDERS', 'Wait for your open orders to be delivered', {
      max: maxActive,
      open,
    });
  }
  if (delivered < newBuyerOrders && groups.some((g) => g.priceBreakdown.buyerTotal > cap)) {
    throw new AppError(409, 'COD_LIMIT', 'This order is above the cash-on-delivery limit', {
      limit: cap,
    });
  }
}

const cartChanged = (quote) =>
  new AppError(409, 'CART_CHANGED', 'Some items changed. Please check your cart.', { quote });

const buyerView = async (order) => toBuyerOrder(order, await buyerContext(order));

async function existingCheckout(user, checkoutGroupId) {
  const orders = await Order.find({ buyerId: user._id, checkoutGroupId }).sort({ _id: 1 }).lean();
  return orders.length
    ? { checkoutGroupId, orders: await Promise.all(orders.map(buyerView)) }
    : null;
}

// Delivery day "YYYY-MM-DD" is stored as the start of that day in India.
const istDay = (date) => new Date(`${date}T00:00:00+05:30`);

export async function checkout(user, body, { now = new Date(), requestId } = {}) {
  const checkoutGroupId = body.idempotencyKey;
  const withPayment = async (result) =>
    body.paymentMethod === 'upi'
      ? { ...result, payment: await createUpiPayment(user, checkoutGroupId, result.orders) }
      : result;
  const replay = await existingCheckout(user, checkoutGroupId);
  if (replay) return withPayment({ ...replay, replayed: true });

  const quote = await buildQuote(user, body, { now });
  if (quote.changes.length || quote.groups.length === 0) throw cartChanged(quote);
  const below = quote.groups.filter((g) => !g.meetsMinimum);
  if (below.length) {
    throw new AppError(409, 'BELOW_MINIMUM', 'Some farmers have a minimum order', {
      farmerIds: below.map((g) => g.farmer.id),
    });
  }
  for (const group of quote.groups) {
    if (!group.deliveryDates.includes(body.deliveryDates?.[group.farmer.id])) {
      throw new AppError(400, 'INVALID_DELIVERY_DATE', 'Choose a delivery day for each farmer', {
        farmerId: group.farmer.id,
      });
    }
  }
  if (body.paymentMethod === 'cod') await checkCodLimits(user, quote.groups);

  const { profile, address } = await buyerAddress(user, body.addressId);
  const deliveryAddress = {
    name: profile.name,
    houseAndStreet: address.houseAndStreet,
    landmark: address.landmark,
    area: address.area,
    pincode: address.pincode,
    ...(address.location && { location: address.location }),
  };

  let created;
  try {
    created = await mongoose.connection.transaction(async (session) => {
      // One conditional update per item: it only matches while enough stock is left, so two
      // buyers can never both take the last units. Any miss aborts the whole checkout.
      for (const group of quote.groups) {
        for (const item of group.items) {
          const result = await Product.updateOne(
            {
              _id: item.productId,
              status: 'available',
              pricePerUnit: item.pricePerUnit,
              availableQuantity: { $gte: item.quantity },
            },
            { $inc: { availableQuantity: -item.quantity } },
            { session },
          );
          if (result.modifiedCount !== 1) throw new StockChanged();
        }
      }
      const productIds = quote.groups.flatMap((g) => g.items.map((i) => i.productId));
      await Product.updateMany(
        { _id: { $in: productIds }, status: 'available', availableQuantity: { $lte: 0 } },
        { $set: { status: 'out_of_stock', availableQuantity: 0 } },
        { session },
      );

      const orders = await Order.create(
        quote.groups.map((group) => ({
          checkoutGroupId,
          buyerId: user._id,
          farmerId: group.farmer.id,
          items: group.items.map((item) => ({
            productId: item.productId,
            cropId: item.cropId,
            cropName: item.crop.names,
            unit: item.unit,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            lineTotal: item.lineTotal,
          })),
          delivery: {
            slotDate: istDay(body.deliveryDates[group.farmer.id]),
            address: deliveryAddress,
            fee: group.priceBreakdown.deliveryFee,
          },
          priceBreakdown: group.priceBreakdown,
          paymentMethod: body.paymentMethod,
          statusHistory: [{ status: 'placed', at: now, byUserId: user._id }],
        })),
        { session, ordered: true },
      );
      for (const order of orders) {
        await recordAudit(
          {
            actor: actorFromUser(user),
            action: 'order.placed',
            entityType: 'Order',
            entityId: order._id,
            after: { status: 'placed', buyerTotal: order.priceBreakdown.buyerTotal },
            requestId,
          },
          { session },
        );
        // The farmer hears about the new order straight away (in-app; Prompt 11).
        await notify(
          {
            userId: order.farmerId,
            templateKey: 'order.placed',
            params: { orderId: order._id.toString(), name: profile.name.trim().split(/\s+/)[0] },
            link: `/farmer/orders/${order._id}`,
          },
          { session },
        );
      }
      return orders;
    });
  } catch (err) {
    if (err instanceof StockChanged) throw cartChanged(await buildQuote(user, body, { now }));
    // The same idempotency key submitted twice at once: the other request created the orders.
    if (err.code === 11000) {
      const winner = await existingCheckout(user, checkoutGroupId);
      if (winner) return withPayment({ ...winner, replayed: true });
    }
    throw err;
  }

  await checkDuplicateAddress(created);
  return withPayment({
    checkoutGroupId,
    orders: await Promise.all(created.map((order) => buyerView(order.toObject()))),
    replayed: false,
  });
}
