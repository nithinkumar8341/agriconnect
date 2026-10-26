import { Crop } from '../models/Crop.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { WEEKDAYS } from '../models/shared.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { listCrops } from './crops.service.js';
import { farmerTrust } from './review.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
// The largest delivery radius a farmer can set (FarmerProfile.deliveryRadiusKm max).
const MAX_RADIUS_M = 50_000;
const EARTH_RADIUS_M = 6_371_000;
const VISIBLE_STATUSES = ['available', 'out_of_stock'];

const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found');

// Buyers see whole kilometres only ("under 1 km" is 0), never coordinates (CLAUDE.md privacy).
export function approximateKm(meters) {
  if (meters === null || meters === undefined) return null;
  return meters < 1000 ? 0 : Math.round(meters / 1000);
}

function haversineMeters([lng1, lat1], [lng2, lat2]) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// An order placed before the farmer's cutoff (IST) can go out from tomorrow; after it, from the day
// after. The first of those days that is one of the farmer's delivery days is the next delivery.
// The next `count` such days (as YYYY-MM-DD), for the buyer to choose from at checkout.
export function deliveryDateOptions({ deliveryDays, cutoffTime }, now = new Date(), count = 4) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  const beforeCutoff = ist.getUTCHours() * 60 + ist.getUTCMinutes() < hours * 60 + minutes;
  const firstDay = beforeCutoff ? 1 : 2;
  const dates = [];
  for (let offset = firstDay; dates.length < count && offset < firstDay + 7 * count; offset += 1) {
    const day = new Date(ist.getTime() + offset * DAY_MS);
    if (deliveryDays.includes(WEEKDAYS[(day.getUTCDay() + 6) % 7])) {
      dates.push(day.toISOString().slice(0, 10));
    }
  }
  return dates;
}

export function nextDeliveryDate(profile, now = new Date()) {
  return deliveryDateOptions(profile, now, 1)[0] ?? null;
}

function distanceTo(profile, point) {
  return profile.location && point ? haversineMeters(profile.location.coordinates, point) : null;
}

export function servesBuyer(profile, { point, pincode }) {
  const distance = distanceTo(profile, point);
  if (distance !== null && distance <= profile.deliveryRadiusKm * 1000) return true;
  return Boolean(pincode) && profile.servicePincodes.includes(pincode);
}

// Farmers who can deliver to the buyer: within their own radius of the buyer's location (from
// $geoNear on farmerprofiles), or listing the buyer's pincode. Map of userId -> { profile, distanceM }.
async function servingFarmers({ point, pincode }) {
  const found = new Map();
  if (point) {
    const near = await FarmerProfile.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: point },
          distanceField: 'distanceM',
          maxDistance: MAX_RADIUS_M,
          spherical: true,
        },
      },
      { $match: { $expr: { $lte: ['$distanceM', { $multiply: ['$deliveryRadiusKm', 1000] }] } } },
    ]);
    for (const profile of near) {
      found.set(profile.userId.toString(), { profile, distanceM: profile.distanceM });
    }
  }
  if (pincode) {
    const byPincode = await FarmerProfile.find({ servicePincodes: pincode }).lean();
    for (const profile of byPincode) {
      const key = profile.userId.toString();
      if (!found.has(key)) found.set(key, { profile, distanceM: distanceTo(profile, point) });
    }
  }
  if (found.size === 0) return found;

  // Blocked or deleted farmers never appear.
  const active = await User.find({
    _id: { $in: [...found.values()].map(({ profile }) => profile.userId) },
    status: 'active',
  })
    .select('_id')
    .lean();
  const activeIds = new Set(active.map((user) => user._id.toString()));
  for (const key of found.keys()) if (!activeIds.has(key)) found.delete(key);
  return found;
}

export function toFarmerSummary(profile) {
  return {
    id: profile.userId.toString(),
    firstName: profile.name.trim().split(/\s+/)[0],
    village: profile.village,
    verificationLevel: profile.verificationLevel,
  };
}

function toMarketProduct(product, crop, { profile, distanceM }, now, rating) {
  return {
    id: product._id.toString(),
    crop: crop && {
      slug: crop.slug,
      names: crop.names,
      image: crop.image,
      category: crop.category,
      quantityStep: crop.quantityStep,
      shelfLifeDays: crop.shelfLifeDays,
    },
    // The farmer's rating (reviews are per farmer); count 0 means show "New".
    rating: rating ?? { average: null, count: 0 },
    pricePerUnit: product.pricePerUnit,
    unit: product.unit,
    availableQuantity: product.availableQuantity,
    status: product.status,
    harvestDate: product.harvestDate,
    photoUrl: product.photos?.[0]?.thumbnailUrl ?? product.photos?.[0]?.url ?? null,
    distanceKm: approximateKm(distanceM),
    farmer: toFarmerSummary(profile),
    nextDeliveryDate: nextDeliveryDate(profile, now),
    deliveryFee: profile.deliveryFee,
    minOrderValue: profile.minOrderValue,
  };
}

async function cropsById(ids) {
  const crops = await Crop.find({ _id: { $in: ids } }).lean();
  return new Map(crops.map((crop) => [crop._id.toString(), crop]));
}

// Crop ids matching the search text (te/en/hi), category and crop filters; null means "any crop".
async function cropFilter({ q, category, crop }) {
  if (!q && !category && !crop) return null;
  const { items } = await listCrops({ search: q, category, page: 1, limit: 1000 });
  const slugs = items.map((item) => item.slug).filter((slug) => !crop || slug === crop);
  const crops = await Crop.find({ slug: { $in: slugs } })
    .select('_id')
    .lean();
  return crops.map((c) => c._id);
}

const SORTS = {
  distance: { sortDistance: 1, harvestDate: -1, _id: 1 },
  price: { pricePerUnit: 1, sortDistance: 1, _id: 1 },
  freshness: { harvestDate: -1, sortDistance: 1, _id: 1 },
  rating: { sortRating: -1, sortDistance: 1, _id: 1 },
};

// Average stars and review count per farmer, for the cards and the "rating" sort.
async function farmerRatings(farmerIds) {
  const rows = await Review.aggregate([
    { $match: { farmerId: { $in: farmerIds }, isHidden: false } },
    { $group: { _id: '$farmerId', average: { $avg: '$stars' }, count: { $sum: 1 } } },
  ]);
  return new Map(
    rows.map((row) => [
      row._id.toString(),
      { average: Math.round(row.average * 10) / 10, count: row.count },
    ]),
  );
}

export async function listNearbyProducts(query, { now = new Date() } = {}) {
  const { lat, lng, pincode, day, inStock, minPrice, maxPrice, page, limit } = query;
  const point = lat !== undefined ? [lng, lat] : null;
  const sort = query.sort ?? (point ? 'distance' : 'freshness');
  const empty = { items: [], page, limit, total: 0, sort };

  const farmers = await servingFarmers({ point, pincode });
  if (day) {
    for (const [key, { profile }] of farmers) {
      if (!profile.deliveryDays.includes(day)) farmers.delete(key);
    }
  }
  if (farmers.size === 0) return empty;

  const cropIds = await cropFilter(query);
  if (cropIds && cropIds.length === 0) return empty;

  const entries = [...farmers.values()];
  const farmerIds = entries.map(({ profile }) => profile.userId);
  const distances = entries.map(({ distanceM }) => distanceM ?? null);
  const ratings = await farmerRatings(farmerIds);
  // Farmers without reviews sort after rated ones.
  const averages = farmerIds.map((id) => ratings.get(id.toString())?.average ?? 0);
  const match = {
    farmerId: { $in: farmerIds },
    status: inStock ? 'available' : { $in: VISIBLE_STATUSES },
  };
  if (cropIds) match.cropId = { $in: cropIds };
  if (minPrice !== undefined || maxPrice !== undefined) {
    match.pricePerUnit = {};
    if (minPrice !== undefined) match.pricePerUnit.$gte = minPrice;
    if (maxPrice !== undefined) match.pricePerUnit.$lte = maxPrice;
  }

  const [result] = await Product.aggregate([
    { $match: match },
    // Each product gets its farmer's distance; farmers found only by pincode sort last.
    {
      $addFields: {
        sortDistance: {
          $ifNull: [
            { $arrayElemAt: [distances, { $indexOfArray: [farmerIds, '$farmerId'] }] },
            Number.MAX_SAFE_INTEGER,
          ],
        },
        sortRating: { $arrayElemAt: [averages, { $indexOfArray: [farmerIds, '$farmerId'] }] },
      },
    },
    { $sort: SORTS[sort] },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'n' }],
      },
    },
  ]);

  const crops = await cropsById(result.items.map((product) => product.cropId));
  const items = result.items.map((product) =>
    toMarketProduct(
      product,
      crops.get(product.cropId.toString()),
      farmers.get(product.farmerId.toString()),
      now,
      ratings.get(product.farmerId.toString()),
    ),
  );
  return { items, page, limit, total: result.total[0]?.n ?? 0, sort };
}

async function activeFarmerProfile(userId) {
  const [profile, user] = await Promise.all([
    FarmerProfile.findOne({ userId }).lean(),
    User.findOne({ _id: userId, status: 'active', role: 'farmer' }).select('_id').lean(),
  ]);
  if (!profile || !user) throw notFound();
  return profile;
}

const buyerPoint = ({ lat, lng }) => (lat !== undefined ? [lng, lat] : null);

export async function getMarketProduct(id, location, { now = new Date() } = {}) {
  const product = await Product.findOne({ _id: id, status: { $in: VISIBLE_STATUSES } }).lean();
  if (!product) throw notFound();
  const profile = await activeFarmerProfile(product.farmerId);
  const point = buyerPoint(location);
  const [crop, trust] = await Promise.all([
    Crop.findById(product.cropId).lean(),
    farmerTrust(profile.userId),
  ]);
  const rating = { average: trust.averageRating, count: trust.reviewCount };
  return {
    ...toMarketProduct(
      product,
      crop,
      { profile, distanceM: distanceTo(profile, point) },
      now,
      rating,
    ),
    photos: (product.photos ?? []).map((photo) => ({
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl ?? photo.url,
    })),
    canDeliver: servesBuyer(profile, { point, pincode: location.pincode }),
    trust,
    deliveryDays: profile.deliveryDays,
    cutoffTime: profile.cutoffTime,
  };
}

export async function getMarketFarmer(userId, location, { now = new Date() } = {}) {
  const profile = await activeFarmerProfile(userId);
  const point = buyerPoint(location);
  const distanceM = distanceTo(profile, point);
  const products = await Product.find({ farmerId: profile.userId, status: 'available' })
    .sort({ harvestDate: -1 })
    .limit(50)
    .lean();
  const [crops, trust] = await Promise.all([
    cropsById(products.map((product) => product.cropId)),
    farmerTrust(profile.userId),
  ]);
  return {
    ...toFarmerSummary(profile),
    mandal: profile.mandal,
    district: profile.district,
    deliveryDays: profile.deliveryDays,
    cutoffTime: profile.cutoffTime,
    deliveryFee: profile.deliveryFee,
    minOrderValue: profile.minOrderValue,
    memberSince: profile.createdAt,
    trust,
    isNew: trust.isNew,
    distanceKm: approximateKm(distanceM),
    canDeliver: servesBuyer(profile, { point, pincode: location.pincode }),
    nextDeliveryDate: nextDeliveryDate(profile, now),
    products: products.map((product) =>
      toMarketProduct(product, crops.get(product.cropId.toString()), { profile, distanceM }, now, {
        average: trust.averageRating,
        count: trust.reviewCount,
      }),
    ),
  };
}
