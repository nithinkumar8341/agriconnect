import { z } from 'zod';
import { CROP_CATEGORIES } from '../models/Crop.js';

export const listCropsQuerySchema = z.object({
  search: z.string().trim().max(50).optional(),
  category: z.enum(CROP_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const cropSlugParamsSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,60}$/, 'must be a crop slug'),
});
