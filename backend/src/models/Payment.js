import mongoose from 'mongoose';
import { paise } from './shared.js';
import { PAYMENT_METHODS } from './Order.js';

export const PAYMENT_RECORD_STATUSES = ['created', 'captured', 'failed', 'refunded'];

// One payment per checkout: a UPI payment covers every farmer order in the checkout group.
const paymentSchema = new mongoose.Schema(
  {
    checkoutGroupId: { type: String, required: true },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    amount: paise({ required: true }),
    status: { type: String, enum: PAYMENT_RECORD_STATUSES, default: 'created' },
    // 'mock' is the MVP UPI test mode; 'razorpay' is future scope.
    provider: { type: String, enum: ['mock', 'razorpay', 'cod'], required: true },
    providerOrderId: { type: String },
    providerPaymentId: { type: String },
    // Webhook event ids already applied; a replayed webhook is recognised and ignored (Prompt 12).
    processedEventIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

paymentSchema.index({ checkoutGroupId: 1 });
paymentSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

export const Payment = mongoose.models.Payment ?? mongoose.model('Payment', paymentSchema);
