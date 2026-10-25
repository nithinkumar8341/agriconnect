import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-f]{24}$/, 'is not a valid id');
const cartItem = z.object({
  productId: objectId,
  quantity: z.number().positive('must be more than 0').max(100_000),
  // The price the buyer saw, so the server can say exactly what changed.
  pricePerUnit: z.number().int().min(0).optional(),
});
const items = z.array(cartItem).min(1, 'the cart is empty').max(30, 'at most 30 items');

export const quoteSchema = z.object({ items, addressId: objectId.optional() });

export const checkoutSchema = z.object({
  // Generated once per checkout attempt by the app and reused on retries.
  idempotencyKey: z.uuid(),
  items: z
    .array(cartItem.required({ pricePerUnit: true }))
    .min(1)
    .max(30),
  addressId: objectId.optional(),
  paymentMethod: z.enum(['cod']),
  // farmerId -> chosen delivery day (YYYY-MM-DD).
  deliveryDates: z.record(objectId, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const orderIdParams = z.object({ id: objectId });
export const closeOrderSchema = z
  .object({ reason: z.string().trim().max(300).optional() })
  .default({});
export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
