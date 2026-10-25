import mongoose from 'mongoose';
import { localizedNameSchema, paise, PINCODE_PATTERN, pointSchema, UNITS } from './shared.js';

export const ORDER_STATUSES = [
  'placed',
  'accepted',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'rejected',
  'failed',
];
export const PAYMENT_METHODS = ['cod', 'upi'];
// "held": UPI money received but not yet released to the farmer (released on delivery).
export const PAYMENT_STATUSES = [
  'pending',
  'held',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
];

// Item fields are snapshots taken at checkout, so later price or name edits never rewrite history.
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
    cropName: { type: localizedNameSchema, required: true },
    unit: { type: String, enum: UNITS, required: true },
    quantity: { type: Number, required: true, min: 0 },
    pricePerUnit: paise({ required: true }),
    lineTotal: paise({ required: true }),
  },
  { _id: false },
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    houseAndStreet: { type: String, default: '' },
    landmark: { type: String, required: true },
    area: { type: String, default: '' },
    pincode: { type: String, required: true, match: PINCODE_PATTERN },
    location: { type: pointSchema, default: undefined },
  },
  { _id: false },
);

const priceBreakdownSchema = new mongoose.Schema(
  {
    itemsTotal: paise({ required: true }),
    deliveryFee: paise({ required: true }),
    platformFee: paise({ required: true }),
    buyerTotal: paise({ required: true }),
    farmerEarnings: paise({ required: true }),
  },
  { _id: false },
);

const statusChangeSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true, default: Date.now },
    // null for system changes (for example an automatic expiry).
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, maxlength: 300 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    // One checkout with several farmers creates one order per farmer sharing this id.
    checkoutGroupId: { type: String, required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (list) => list.length > 0, message: 'an order needs items' },
    },
    delivery: {
      slotDate: { type: Date, required: true },
      address: { type: deliveryAddressSchema, required: true },
      fee: paise({ required: true }),
    },
    priceBreakdown: { type: priceBreakdownSchema, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
    statusHistory: { type: [statusChangeSchema], default: [] },
    // 4-digit code shown to the buyer; the farmer enters it at handover (Prompt 11).
    deliveryOtpHash: { type: String, select: false },
    deliveryOtpAttempts: { type: Number, default: 0, select: false },
    deliveredAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ farmerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ checkoutGroupId: 1 });
// The checkout idempotency key is the checkoutGroupId: a repeated submission cannot create a
// second order for the same buyer, checkout and farmer, even when both requests race.
orderSchema.index({ buyerId: 1, checkoutGroupId: 1, farmerId: 1 }, { unique: true });
orderSchema.index({ status: 1, 'delivery.slotDate': 1 });

export const Order = mongoose.models.Order ?? mongoose.model('Order', orderSchema);
