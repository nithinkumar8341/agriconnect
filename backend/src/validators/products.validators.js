import { z } from 'zod';
import { UNITS } from '../models/shared.js';

const objectId = z.string().regex(/^[0-9a-f]{24}$/, 'is not a valid id');
// A farmer lists at most a few tonnes; quantities may be fractional (2.5 kg).
const quantity = z.number().positive('must be more than 0').max(100_000);
// ₹1 to ₹10,000 per unit, in whole paise.
const pricePerUnit = z.number().int('must be whole paise').min(100).max(1_000_000);
const harvestDate = z.coerce.date();

export const productIdParams = z.object({ id: objectId });

export const createProductSchema = z.object({
  cropSlug: z.string().regex(/^[a-z0-9-]{1,60}$/, 'must be a crop slug'),
  // Optional: without a photo the listing shows the crop's stock photo.
  photoAssetIds: z
    .array(objectId)
    .max(5, 'at most 5 photos')
    .refine((ids) => new Set(ids).size === ids.length, 'photos must not repeat')
    .default([]),
  quantity,
  unit: z.enum(UNITS),
  pricePerUnit,
  harvestDate,
});

export const updateProductSchema = z
  .object({ pricePerUnit, quantity, harvestDate })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'change at least one field');

export const statusSchema = z.object({
  action: z.enum(['pause', 'resume', 'mark_out_of_stock']),
});

export const duplicateSchema = z.object({ quantity });

export const lastPriceQuery = z.object({
  crop: z.string().regex(/^[a-z0-9-]{1,60}$/, 'must be a crop slug'),
});
