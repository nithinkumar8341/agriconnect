import { Crop } from '../models/Crop.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { Order } from '../models/Order.js';
import { PriceReference } from '../models/PriceReference.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { AppError } from '../utils/AppError.js';

const PRICE_WINDOW_DAYS = 30;
const SOLD_STATUSES = ['placed', 'accepted', 'out_for_delivery', 'delivered'];
const INSIGHTS_TTL_MS = 10 * 60 * 1000;

// The AI service is stateless: this backend owns auth and the database, gathers the facts each
// feature needs, and sends them over. The AI side does the maths, the FAQ lookup and LLM calls.
export function createAiService({ config }) {
  const insightsCache = new Map();
  let cropNames = null;

  async function callAi(path, body) {
    let res;
    try {
      res = await fetch(`${config.ai.url}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-key': config.ai.internalKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      res = null;
    }
    if (!res?.ok) {
      throw new AppError(503, 'AI_UNAVAILABLE', 'The AI helper is not available right now');
    }
    return res.json();
  }

  // Median of what this crop sold for in the farmer's district over the last 30 days, with
  // mandi (wholesale) prices as a labelled fallback when there are too few sales.
  async function priceHint({ farmerId, slug, unit }) {
    const [profile, crop] = await Promise.all([
      FarmerProfile.findOne({ userId: farmerId }, 'district state').lean(),
      Crop.findOne({ slug }, '_id').lean(),
    ]);
    if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Farmer profile not found');
    if (!crop) throw new AppError(404, 'CROP_NOT_FOUND', 'Crop not found');
    const cropId = crop._id;
    const neighbours = await FarmerProfile.find({ district: profile.district }).distinct('userId');
    const since = new Date(Date.now() - PRICE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const sales = await Order.aggregate([
      { $match: { farmerId: { $in: neighbours }, status: { $in: SOLD_STATUSES } } },
      { $match: { createdAt: { $gte: since } } },
      { $unwind: '$items' },
      { $match: { 'items.cropId': cropId, 'items.unit': unit } },
      { $project: { _id: 0, price: '$items.pricePerUnit', date: '$createdAt' } },
      { $limit: 500 },
    ]);

    let mandi = await PriceReference.find({ cropId, district: profile.district })
      .sort({ date: -1 })
      .limit(10)
      .lean();
    if (mandi.length === 0) {
      mandi = await PriceReference.find({ cropId, state: profile.state })
        .sort({ date: -1 })
        .limit(10)
        .lean();
    }
    const result = await callAi('/price/recommend', {
      unit,
      sales: sales.map((s) => ({ price: s.price, date: s.date.toISOString().slice(0, 10) })),
      mandi: mandi.map((row) => ({
        modalPrice: row.priceUnit === 'quintal' ? Math.round(row.modalPrice / 100) : row.modalPrice,
        market: row.market,
        date: row.date.toISOString().slice(0, 10),
      })),
    });
    return { ...result, district: profile.district, windowDays: PRICE_WINDOW_DAYS, unit };
  }

  async function matchCrops(message) {
    cropNames ??= await Crop.find({}, 'names').lean();
    const text = message.toLowerCase();
    return cropNames
      .filter((crop) =>
        Object.values(crop.names ?? {}).some(
          (name) =>
            typeof name === 'string' && name.length >= 2 && text.includes(name.toLowerCase()),
        ),
      )
      .map((crop) => crop._id);
  }

  // Answers from the FAQ plus live listings of any crop the question names (cheapest first).
  async function chat({ message, language }) {
    const cropIds = await matchCrops(message);
    const listings = cropIds.length
      ? await Product.find({
          cropId: { $in: cropIds },
          status: 'available',
          availableQuantity: { $gt: 0 },
        })
          .sort({ pricePerUnit: 1 })
          .limit(5)
          .populate('cropId', 'names')
          .lean()
      : [];
    const farmers = await FarmerProfile.find(
      { userId: { $in: listings.map((p) => p.farmerId) } },
      'userId name',
    ).lean();
    const farmerName = new Map(farmers.map((f) => [String(f.userId), f.name]));
    return callAi('/chat', {
      message,
      language,
      // A listing whose farmer has no profile (e.g. a deleted account) is not offered.
      products: listings
        .filter((p) => farmerName.has(String(p.farmerId)))
        .map((p) => ({
          crop: p.cropId.names[language] ?? p.cropId.names.en,
          price: p.pricePerUnit,
          unit: p.unit,
          farmer: farmerName.get(String(p.farmerId)),
        })),
    });
  }

  // Cached briefly so a popular farmer page does not trigger an LLM call per visit.
  async function reviewInsights({ farmerId, language }) {
    const reviews = await Review.find({ farmerId, isHidden: false }, 'stars comment')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const key = `${farmerId}:${language}:${reviews.length}`;
    const cached = insightsCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;

    const value = await callAi('/reviews/insights', {
      language,
      reviews: reviews.map((r) => ({ stars: r.stars, comment: r.comment ?? '' })),
    });
    insightsCache.set(key, { value, expires: Date.now() + INSIGHTS_TTL_MS });
    return value;
  }

  return { priceHint, chat, reviewInsights };
}
