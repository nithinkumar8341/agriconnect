import { FarmerProfile } from '../models/FarmerProfile.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { getAppConfig } from './appConfig.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// India has one time zone and no daylight saving, so IST is a fixed +05:30.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const LOW_STOCK_PREVIEW = 5;

// "Today" for a farmer is the Indian calendar day, not the server's UTC day: an order at
// 01:00 IST belongs to today even though it is still yesterday in UTC.
export function startOfIstDay(now) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

// availableQuantity <= quantity * percent / 100, evaluated inside MongoDB.
const lowStockExpr = (percent) => ({
  $lte: ['$availableQuantity', { $multiply: ['$quantity', percent / 100] }],
});

function toCropSummary(crop) {
  return crop
    ? {
        slug: crop.slug,
        names: crop.names,
        image: crop.image,
        category: crop.category,
        shelfLifeDays: crop.shelfLifeDays,
        quantityStep: crop.quantityStep,
        allowedUnits: crop.allowedUnits,
      }
    : null;
}

// The owner's view of a listing (product.cropId must be populated).
export function toOwnProduct(product, { lowStockPercent, now = new Date() }) {
  const crop = product.cropId;
  const ageMs = now.getTime() - new Date(product.harvestDate).getTime();
  return {
    id: product._id.toString(),
    crop: toCropSummary(crop),
    quantity: product.quantity,
    availableQuantity: product.availableQuantity,
    unit: product.unit,
    pricePerUnit: product.pricePerUnit,
    status: product.status,
    pausedReason: product.pausedReason ?? null,
    harvestDate: product.harvestDate,
    photos: (product.photos ?? []).map((photo) => ({
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl ?? photo.url,
    })),
    updatedAt: product.updatedAt,
    photoUrl: product.photos?.[0]?.thumbnailUrl ?? product.photos?.[0]?.url ?? null,
    isLowStock:
      product.status === 'available' &&
      product.availableQuantity <= (product.quantity * lowStockPercent) / 100,
    isPastShelfLife: Boolean(crop) && ageMs > crop.shelfLifeDays * DAY_MS,
  };
}

export async function getFarmerDashboard(user, { now = new Date() } = {}) {
  const farmerId = user._id;
  const lowStockPercent = await getAppConfig('lowStockPercent');

  const [today, newOrders, pendingDelivery, statusCounts, lowStock, profile] = await Promise.all([
    Order.countDocuments({ farmerId, createdAt: { $gte: startOfIstDay(now) } }),
    Order.countDocuments({ farmerId, status: 'placed' }),
    Order.countDocuments({ farmerId, status: { $in: ['accepted', 'out_for_delivery'] } }),
    Product.aggregate([
      { $match: { farmerId, status: { $ne: 'removed' } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Product.find({ farmerId, status: 'available', $expr: lowStockExpr(lowStockPercent) })
      .sort({ availableQuantity: 1 })
      .limit(LOW_STOCK_PREVIEW)
      .populate('cropId')
      .lean(),
    FarmerProfile.findOne({ userId: farmerId }).populate('agentId', 'phone status').lean(),
  ]);

  const countFor = (status) => statusCounts.find((row) => row._id === status)?.count ?? 0;
  const agent = profile?.agentId;

  return {
    farmerName: profile?.name ?? null,
    orders: { today, new: newOrders, pendingDelivery },
    listings: {
      available: countFor('available'),
      outOfStock: countFor('out_of_stock'),
      paused: countFor('paused'),
    },
    lowStockPercent,
    lowStock: lowStock.map((product) => toOwnProduct(product, { lowStockPercent, now })),
    // Only the farmer's own assigned agent, and only while that agent is active.
    agent: agent && agent.status === 'active' ? { phone: agent.phone } : null,
  };
}

export async function listMyProducts(user, { status, page, limit }, { now = new Date() } = {}) {
  const lowStockPercent = await getAppConfig('lowStockPercent');
  // Removed listings are soft-deleted and never shown back to the farmer.
  const filter = { farmerId: user._id, status: { $ne: 'removed' } };
  if (status === 'low') {
    filter.status = 'available';
    filter.$expr = lowStockExpr(lowStockPercent);
  } else if (status) {
    filter.status = status;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('cropId')
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    items: products.map((product) => toOwnProduct(product, { lowStockPercent, now })),
    page,
    limit,
    total,
  };
}
