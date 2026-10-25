import mongoose from 'mongoose';
import { Crop } from '../models/Crop.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { getAppConfig } from './appConfig.service.js';
import { toOwnProduct } from './farmer.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// A small allowance so a harvest "today" late in the evening is not rejected by clock skew.
const FUTURE_TOLERANCE_MS = 12 * 60 * 60 * 1000;

const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found');

// Allowed status changes. "removed" is a soft delete and is never undone here.
const TRANSITIONS = {
  pause: { from: ['available', 'out_of_stock'], to: 'paused' },
  resume: { from: ['paused'], to: 'available' },
  mark_out_of_stock: { from: ['available', 'paused'], to: 'out_of_stock' },
};

async function activeCropBySlug(slug) {
  const crop = await Crop.findOne({ slug, isActive: true });
  if (!crop) throw new AppError(400, 'UNKNOWN_CROP', 'Choose a crop from the list');
  return crop;
}

function checkHarvestDate(harvestDate, crop, now) {
  if (harvestDate.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw new AppError(400, 'HARVEST_IN_FUTURE', 'The harvest date cannot be in the future');
  }
  if (now.getTime() - harvestDate.getTime() > crop.shelfLifeDays * DAY_MS) {
    throw new AppError(
      400,
      'HARVEST_TOO_OLD',
      `This crop keeps about ${crop.shelfLifeDays} days; this harvest is too old to sell`,
    );
  }
}

function checkUnit(unit, crop) {
  if (!crop.allowedUnits.includes(unit)) {
    throw new AppError(400, 'UNIT_NOT_ALLOWED', 'This unit is not used for this crop');
  }
}

async function present(product) {
  const lowStockPercent = await getAppConfig('lowStockPercent');
  const populated = product.populated?.('cropId')
    ? product
    : await Product.findById(product._id).populate('cropId');
  return toOwnProduct(populated.toObject ? populated.toObject() : populated, { lowStockPercent });
}

// Every query below filters by farmerId as well as _id, so another farmer's listing behaves
// exactly like a missing one (404) and ids cannot be probed.
async function ownProduct(user, id, extra = {}) {
  const product = await Product.findOne({
    _id: id,
    farmerId: user._id,
    status: { $ne: 'removed' },
    ...extra,
  }).populate('cropId');
  if (!product) throw notFound();
  return product;
}

export async function createProduct(user, input, { now = new Date() } = {}) {
  const crop = await activeCropBySlug(input.cropSlug);
  checkUnit(input.unit, crop);
  checkHarvestDate(input.harvestDate, crop, now);

  // The listing and its photos change together: either the listing exists and every photo is
  // marked as used by it, or nothing changed (no half-claimed photos, no listing without photos).
  const product = await mongoose.connection.transaction(async (session) => {
    const assets = await MediaAsset.find({
      _id: { $in: input.photoAssetIds },
      ownerId: user._id,
      status: 'pending',
    }).session(session);
    if (assets.length !== input.photoAssetIds.length) {
      throw new AppError(400, 'PHOTOS_UNAVAILABLE', 'Some photos are missing or already used');
    }
    const ordered = input.photoAssetIds.map((id) => assets.find((a) => a._id.equals(id)));

    const [created] = await Product.create(
      [
        {
          farmerId: user._id,
          cropId: crop._id,
          photos: ordered.map((asset) => ({
            url: asset.url,
            thumbnailUrl: asset.thumbnailUrl,
            capturedAt: asset.capturedAt,
            perceptualHash: asset.perceptualHash,
          })),
          quantity: input.quantity,
          availableQuantity: input.quantity,
          unit: input.unit,
          pricePerUnit: input.pricePerUnit,
          harvestDate: input.harvestDate,
          status: 'available',
        },
      ],
      { session },
    );

    // Conditional on still being pending: if another request claimed a photo in the meantime,
    // fewer rows change and the whole transaction is rolled back.
    const claimed = await MediaAsset.updateMany(
      { _id: { $in: input.photoAssetIds }, ownerId: user._id, status: 'pending' },
      { status: 'attached', attachedTo: created._id },
      { session },
    );
    if (claimed.modifiedCount !== input.photoAssetIds.length) {
      throw new AppError(409, 'PHOTOS_UNAVAILABLE', 'Some photos are missing or already used');
    }
    return created;
  });

  return present(product);
}

export async function getOwnProduct(user, id) {
  return present(await ownProduct(user, id));
}

// Price, quantity and harvest date can change. Changing the quantity keeps what has already been
// sold: available = new quantity - sold. Done in one atomic pipeline update, so a checkout that
// reserves stock at the same moment can never make available stock negative.
export async function updateProduct(user, id, changes, { now = new Date() } = {}) {
  const product = await ownProduct(user, id);
  const crop = product.cropId;
  if (changes.harvestDate) checkHarvestDate(changes.harvestDate, crop, now);

  const set = {};
  if (changes.pricePerUnit !== undefined) set.pricePerUnit = changes.pricePerUnit;
  if (changes.harvestDate) set.harvestDate = changes.harvestDate;

  const filter = { _id: product._id, farmerId: user._id, status: { $ne: 'removed' } };
  const pipeline = Object.keys(set).length > 0 ? [{ $set: set }] : [];
  if (changes.quantity !== undefined) {
    const newAvailable = {
      $add: ['$availableQuantity', { $subtract: [changes.quantity, '$quantity'] }],
    };
    filter.$expr = { $gte: [newAvailable, 0] };
    pipeline.push({ $set: { availableQuantity: newAvailable, quantity: changes.quantity } });
  }

  const updated = await Product.findOneAndUpdate(filter, pipeline, {
    returnDocument: 'after',
    // Mongoose 9 requires opting in to pipeline (array) updates per query.
    updatePipeline: true,
  });
  if (!updated) {
    throw new AppError(
      409,
      'QUANTITY_BELOW_SOLD',
      'The new quantity is less than what buyers have already ordered',
    );
  }

  // Keep the status consistent with the new stock and harvest date: an expired listing given a
  // fresh harvest date sells again; a listing with no stock left is out of stock, with stock is on sale.
  let status = updated.status;
  const expiredPause = status === 'paused' && updated.pausedReason === 'expired';
  if (expiredPause && changes.harvestDate) status = 'available';
  if (status === 'available' && updated.availableQuantity === 0) status = 'out_of_stock';
  if (
    status === 'out_of_stock' &&
    changes.quantity !== undefined &&
    updated.availableQuantity > 0
  ) {
    status = 'available';
  }
  if (status !== updated.status) {
    updated.status = status;
    updated.pausedReason = status === 'paused' ? updated.pausedReason : null;
    await updated.save();
  }
  return present(updated);
}

export async function changeStatus(user, id, action, { now = new Date() } = {}) {
  const { from, to } = TRANSITIONS[action];
  const product = await ownProduct(user, id);
  if (!from.includes(product.status)) {
    throw new AppError(
      409,
      'INVALID_STATUS_CHANGE',
      `Cannot ${action} a listing that is ${product.status}`,
    );
  }

  const update = { status: to, pausedReason: to === 'paused' ? 'farmer' : null };
  const filter = { _id: product._id, farmerId: user._id, status: product.status };
  if (action === 'mark_out_of_stock') {
    // The rest was sold or used elsewhere: the listed amount becomes what sold through the app, so a
    // later restock ("I have 80 kg more") makes exactly 80 kg available. Conditional on the stock
    // read above, so a checkout reserving stock at this moment is never silently overwritten.
    update.availableQuantity = 0;
    update.quantity = product.quantity - product.availableQuantity;
    filter.availableQuantity = product.availableQuantity;
  }
  if (action === 'resume') {
    const crop = product.cropId;
    if (now.getTime() - product.harvestDate.getTime() > crop.shelfLifeDays * DAY_MS) {
      throw new AppError(409, 'LISTING_EXPIRED', 'Update the harvest date before selling again');
    }
    if (product.availableQuantity === 0) update.status = 'out_of_stock';
  }

  // Conditional on the status the decision was made from, so two quick taps cannot both apply.
  const updated = await Product.findOneAndUpdate(filter, update, { returnDocument: 'after' });
  if (!updated)
    throw new AppError(409, 'INVALID_STATUS_CHANGE', 'The listing just changed; try again');
  return present(updated);
}

// Soft delete: the listing disappears for everyone but stays for order history and audits.
export async function removeProduct(user, id) {
  const removed = await Product.findOneAndUpdate(
    { _id: id, farmerId: user._id, status: { $ne: 'removed' } },
    { status: 'removed', pausedReason: null },
  );
  if (!removed) throw notFound();
}

// "Sell again": a fresh listing with the same crop, unit, price and photos, harvested today.
export async function duplicateProduct(user, id, { quantity }, { now = new Date() } = {}) {
  const original = await Product.findOne({ _id: id, farmerId: user._id }).populate('cropId');
  if (!original) throw notFound();
  if (!original.cropId?.isActive)
    throw new AppError(400, 'UNKNOWN_CROP', 'This crop is no longer listed');

  const copy = await Product.create({
    farmerId: user._id,
    cropId: original.cropId._id,
    photos: original.photos.map((photo) => photo.toObject()),
    quantity,
    availableQuantity: quantity,
    unit: original.unit,
    pricePerUnit: original.pricePerUnit,
    harvestDate: now,
    status: 'available',
  });
  return present(copy);
}

// The farmer's most recent price for a crop, used to prefill the price and to warn about typos.
export async function lastPrice(user, cropSlug) {
  const crop = await Crop.findOne({ slug: cropSlug });
  if (!crop) return null;
  const latest = await Product.findOne({ farmerId: user._id, cropId: crop._id })
    .sort({ createdAt: -1 })
    .select('pricePerUnit unit createdAt')
    .lean();
  return latest
    ? { pricePerUnit: latest.pricePerUnit, unit: latest.unit, listedAt: latest.createdAt }
    : null;
}

// Hourly job: listings older than their crop's shelf life are paused (reason "expired") so buyers
// never order produce that has likely spoiled. The farmer re-lists by updating the harvest date.
export async function pauseExpiredListings(now = new Date()) {
  const crops = await Crop.find().select('_id shelfLifeDays').lean();
  let paused = 0;
  for (const crop of crops) {
    const result = await Product.updateMany(
      {
        cropId: crop._id,
        status: { $in: ['available', 'out_of_stock'] },
        harvestDate: { $lt: new Date(now.getTime() - crop.shelfLifeDays * DAY_MS) },
      },
      { status: 'paused', pausedReason: 'expired' },
    );
    paused += result.modifiedCount;
  }
  return paused;
}
