import mongoose from 'mongoose';
import { paise, photoSchema } from './shared.js';

// Defaults for the allowed reasons live in AppConfig; this enum is the full set the code understands.
export const RETURN_REASONS = ['damaged', 'rotten', 'wrong_item', 'underweight'];
export const RETURN_STATUSES = ['open', 'farmer_accepted', 'farmer_countered', 'resolved'];
export const RETURN_OUTCOMES = ['partial_refund', 'replacement', 'credit', 'rejected'];

const maxPhotos = (limit) => ({
  validator: (list) => list.length <= limit,
  message: `at most ${limit} photos`,
});

const returnRequestSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [
        {
          _id: false,
          productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
          quantity: { type: Number, required: true, min: 0 },
        },
      ],
      validate: { validator: (list) => list.length > 0, message: 'pick at least one item' },
    },
    reason: { type: String, enum: RETURN_REASONS, required: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    photos: { type: [photoSchema], default: [], validate: maxPhotos(3) },
    // Collected automatically when the claim is filed (Prompt 14).
    evidence: {
      listingPhotoUrls: { type: [String], default: [] },
      deliveredAt: { type: Date },
      aiResultId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIResult' },
    },
    status: { type: String, enum: RETURN_STATUSES, default: 'open' },
    farmerResponse: {
      decision: { type: String, enum: ['accept', 'counter'] },
      note: { type: String, maxlength: 500 },
      photos: { type: [photoSchema], default: undefined, validate: maxPhotos(3) },
      at: { type: Date },
    },
    resolution: {
      outcome: { type: String, enum: RETURN_OUTCOMES },
      amount: paise(),
      note: { type: String, maxlength: 500 },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date },
    },
  },
  { timestamps: true },
);

returnRequestSchema.index({ orderId: 1 });
returnRequestSchema.index({ status: 1, createdAt: 1 });
returnRequestSchema.index({ buyerId: 1, createdAt: -1 });
returnRequestSchema.index({ farmerId: 1, status: 1 });

export const ReturnRequest =
  mongoose.models.ReturnRequest ?? mongoose.model('ReturnRequest', returnRequestSchema);
