import mongoose from 'mongoose';
import { paise, photoSchema, UNITS } from './shared.js';

export const PRODUCT_STATUSES = ['available', 'out_of_stock', 'paused', 'removed'];

const productSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
    photos: {
      type: [photoSchema],
      default: [],
      validate: { validator: (list) => list.length <= 5, message: 'at most 5 photos' },
    },
    // quantity is what was listed; availableQuantity is what is left after orders reserve stock.
    // Checkout decrements availableQuantity with a conditional atomic update (Prompt 10).
    quantity: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: UNITS, required: true },
    pricePerUnit: paise({ required: true }),
    harvestDate: { type: Date, required: true },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'available' },
    aiResultId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIResult', default: null },
    createdByAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.path('availableQuantity').validate(function notAboveListed(value) {
  return value <= this.quantity;
}, 'availableQuantity cannot exceed quantity');

productSchema.index({ farmerId: 1, status: 1, updatedAt: -1 });
productSchema.index({ cropId: 1, status: 1 });
productSchema.index({ status: 1, harvestDate: -1 });

export const Product = mongoose.models.Product ?? mongoose.model('Product', productSchema);
