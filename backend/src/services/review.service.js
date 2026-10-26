import { BuyerProfile } from '../models/BuyerProfile.js';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { AppError } from '../utils/AppError.js';

// Sellers with fewer delivered orders than this are labelled "New" (never penalised: CLAUDE.md).
const NEW_SELLER_ORDERS = 3;

// Verified purchase only: the buyer's own order, and only once it is delivered. The unique index
// on orderId makes "one review per order" hold even for two taps at once.
export async function createReview(buyer, orderId, { stars, comment = '' }) {
  const order = await Order.findOne({ _id: orderId, buyerId: buyer._id }).lean();
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Not found');
  if (order.status !== 'delivered') {
    throw new AppError(409, 'NOT_DELIVERED', 'You can review an order after it is delivered');
  }
  try {
    const review = await Review.create({
      orderId: order._id,
      buyerId: buyer._id,
      farmerId: order.farmerId,
      stars,
      comment,
    });
    return { id: review.id, stars: review.stars, comment: review.comment };
  } catch (err) {
    if (err.code === 11000)
      throw new AppError(409, 'ALREADY_REVIEWED', 'You already reviewed this order');
    throw err;
  }
}

// Trust score (documented formula): average star rating of visible reviews, shown together with
// the number of completed (delivered) orders. Fewer than 3 completed orders shows "New" instead
// of a low or empty score.
export async function farmerTrust(farmerId) {
  const [[ratings], completedOrders] = await Promise.all([
    Review.aggregate([
      { $match: { farmerId, isHidden: false } },
      { $group: { _id: null, average: { $avg: '$stars' }, count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ farmerId, status: 'delivered' }),
  ]);
  return {
    averageRating: ratings ? Math.round(ratings.average * 10) / 10 : null,
    reviewCount: ratings?.count ?? 0,
    completedOrders,
    isNew: completedOrders < NEW_SELLER_ORDERS,
  };
}

export async function listFarmerReviews(farmerId, { page, limit }) {
  const filter = { farmerId, isHidden: false };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  const buyers = await BuyerProfile.find({ userId: { $in: reviews.map((r) => r.buyerId) } })
    .select('userId name')
    .lean();
  const names = new Map(buyers.map((b) => [b.userId.toString(), b.name.trim().split(/\s+/)[0]]));
  return {
    items: reviews.map((r) => ({
      id: r._id.toString(),
      stars: r.stars,
      comment: r.comment,
      buyerFirstName: names.get(r.buyerId.toString()) ?? null,
      createdAt: r.createdAt,
    })),
    total,
    page,
    limit,
  };
}

export const hasReview = (orderId) => Review.exists({ orderId });
