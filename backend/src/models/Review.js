import mongoose from 'mongoose';

const rating = { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger };

const reviewSchema = new mongoose.Schema(
  {
    // Unique: one review per order, and only for delivered orders (checked by the service, Prompt 16).
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratings: {
      quality: rating,
      freshness: rating,
      packaging: rating,
      delivery: rating,
    },
    comment: { type: String, trim: true, maxlength: 500, default: '' },
    farmerResponse: {
      text: { type: String, trim: true, maxlength: 500 },
      at: { type: Date },
    },
    appeal: {
      status: { type: String, enum: ['none', 'pending', 'upheld', 'rejected'], default: 'none' },
      reason: { type: String, maxlength: 500 },
    },
    // Hidden reviews (after a successful appeal) stay stored for audit but are not shown or scored.
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index({ farmerId: 1, isHidden: 1, createdAt: -1 });

export const Review = mongoose.models.Review ?? mongoose.model('Review', reviewSchema);
