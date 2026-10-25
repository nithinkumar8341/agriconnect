import { isDeepStrictEqual } from 'node:util';
import { Crop } from '../models/Crop.js';
import { CROPS } from './crops.data.js';

function hasChanged(existing, crop) {
  const stored = existing.toObject();
  return Object.keys(crop).some((field) => !isDeepStrictEqual(stored[field], crop[field]));
}

// Upsert by slug: safe to run any number of times, and edits to crops.data.js are applied
// to existing rows without changing their _id (products keep pointing at the same crop).
// Only new or changed crops are written, so updatedAt reflects real changes.
export async function seedCrops() {
  // bulkWrite skips Mongoose validation, so every row is validated explicitly first.
  await Promise.all(CROPS.map((crop) => new Crop(crop).validate()));

  const existingBySlug = new Map((await Crop.find()).map((crop) => [crop.slug, crop]));
  const toWrite = CROPS.filter((crop) => {
    const existing = existingBySlug.get(crop.slug);
    return !existing || hasChanged(existing, crop);
  });

  if (toWrite.length === 0) {
    return { total: CROPS.length, inserted: 0, updated: 0 };
  }

  const result = await Crop.bulkWrite(
    toWrite.map((crop) => ({
      updateOne: { filter: { slug: crop.slug }, update: { $set: crop }, upsert: true },
    })),
  );
  return { total: CROPS.length, inserted: result.upsertedCount, updated: result.modifiedCount };
}
