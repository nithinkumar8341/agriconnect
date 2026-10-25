import { randomUUID } from 'node:crypto';
import { MediaAsset } from '../models/MediaAsset.js';
import { AppError } from '../utils/AppError.js';
import { getAppConfig } from './appConfig.service.js';
import { hammingDistance, hashBands, processPhoto } from './image.service.js';

const PENDING_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function toPublicAsset(asset) {
  return {
    id: asset._id.toString(),
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    capturedAt: asset.capturedAt,
    status: asset.status,
  };
}

// Finds the closest near-identical photo uploaded by someone else. Candidates must share at least
// one 16-bit band of the hash (an indexed lookup); by the pigeonhole principle any photo within
// 3 differing bits shares a band, and the exact Hamming check then applies the real threshold.
async function findDuplicate({ ownerId, perceptualHash, bands }) {
  const maxDistance = await getAppConfig('duplicatePhotoMaxDistance');
  const candidates = await MediaAsset.find({
    ownerId: { $ne: ownerId },
    perceptualHashBands: { $in: bands },
  })
    .select('_id ownerId perceptualHash')
    .limit(200)
    .lean();

  let best = null;
  for (const candidate of candidates) {
    const distance = hammingDistance(perceptualHash, candidate.perceptualHash);
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { assetId: candidate._id, ownerId: candidate.ownerId, distance };
    }
  }
  return best;
}

export function createMediaService({ storage, logger }) {
  async function uploadPhoto(user, { buffer, capturedAt }) {
    const processed = await processPhoto(buffer);
    const id = randomUUID();
    const month = new Date().toISOString().slice(0, 7);
    const storageKey = `photos/${month}/${id}.jpg`;
    const thumbnailKey = `photos/${month}/${id}-thumb.webp`;

    const [full, thumbnail] = await Promise.all([
      storage.put({ key: storageKey, buffer: processed.full, contentType: 'image/jpeg' }),
      storage.put({ key: thumbnailKey, buffer: processed.thumbnail, contentType: 'image/webp' }),
    ]);

    const bands = hashBands(processed.perceptualHash);
    const duplicateOf = await findDuplicate({
      ownerId: user._id,
      perceptualHash: processed.perceptualHash,
      bands,
    });
    if (duplicateOf) {
      logger.warn(
        { userId: user._id.toString(), duplicateOwner: duplicateOf.ownerId.toString() },
        'Uploaded photo matches another farmer’s photo',
      );
    }

    const asset = await MediaAsset.create({
      ownerId: user._id,
      provider: storage.provider,
      storageKey,
      thumbnailKey,
      url: full.url,
      thumbnailUrl: thumbnail.url,
      width: processed.width,
      height: processed.height,
      bytes: processed.full.length,
      capturedAt: capturedAt ?? null,
      perceptualHash: processed.perceptualHash,
      perceptualHashBands: bands,
      duplicateOf,
    });
    return asset;
  }

  async function removeAssetFiles(asset) {
    await Promise.all([storage.remove(asset.storageKey), storage.remove(asset.thumbnailKey)]);
  }

  // Owners may delete photos that are not yet on a listing. Someone else's photo answers 404,
  // exactly like a missing one, so ids cannot be probed.
  async function deletePhoto(user, assetId) {
    const asset = await MediaAsset.findOne({ _id: assetId, ownerId: user._id });
    if (!asset) throw new AppError(404, 'NOT_FOUND', 'Not found');
    if (asset.status === 'attached') {
      throw new AppError(409, 'PHOTO_IN_USE', 'This photo is used by a listing');
    }
    await removeAssetFiles(asset);
    await asset.deleteOne();
  }

  // Photos uploaded but never attached to a listing (abandoned drafts) are removed after a day.
  async function cleanupPendingPhotos(now = new Date()) {
    const stale = await MediaAsset.find({
      status: 'pending',
      createdAt: { $lt: new Date(now.getTime() - PENDING_LIFETIME_MS) },
    }).limit(500);
    for (const asset of stale) {
      await removeAssetFiles(asset);
      await asset.deleteOne();
    }
    return stale.length;
  }

  return { uploadPhoto, deletePhoto, cleanupPendingPhotos };
}
