import { z } from 'zod';

// "low" is a view, not a stored status: available listings at or below the low-stock threshold.
export const myProductsQuerySchema = z.object({
  status: z.enum(['available', 'out_of_stock', 'paused', 'low']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
