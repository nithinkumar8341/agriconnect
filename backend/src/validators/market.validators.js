import { z } from 'zod';
import { CROP_CATEGORIES } from '../models/Crop.js';
import { PINCODE_PATTERN, WEEKDAYS } from '../models/shared.js';

const slug = z.string().regex(/^[a-z0-9-]{1,60}$/, 'must be a crop slug');
const paise = z.coerce.number().int().min(0).max(1_000_000);

// Where the buyer is: their location (both coordinates, inside India) and/or a pincode.
const location = {
  lat: z.coerce.number().min(6).max(38).optional(),
  lng: z.coerce.number().min(68).max(98).optional(),
  pincode: z.string().regex(PINCODE_PATTERN, 'must be a 6-digit pincode').optional(),
};
const bothCoordinates = (query) => (query.lat === undefined) === (query.lng === undefined);

export const nearbyQuerySchema = z
  .object({
    ...location,
    q: z.string().trim().min(1).max(40).optional(),
    category: z.enum(CROP_CATEGORIES).optional(),
    crop: slug.optional(),
    minPrice: paise.optional(),
    maxPrice: paise.optional(),
    day: z.enum(WEEKDAYS).optional(),
    inStock: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    sort: z.enum(['distance', 'price', 'freshness', 'rating']).optional(),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine(bothCoordinates, 'send both lat and lng')
  .refine((query) => query.lat !== undefined || query.pincode, 'send a location or a pincode')
  .refine(
    (query) => query.sort !== 'distance' || query.lat !== undefined,
    'sorting by distance needs a location',
  );

export const marketLocationQuery = z
  .object(location)
  .refine(bothCoordinates, 'send both lat and lng');

export const marketIdParams = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/, 'is not a valid id'),
});
