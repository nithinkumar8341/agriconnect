import mongoose from 'mongoose';
import { paise } from './shared.js';

export const PRICE_SOURCES = ['agmarknet', 'sample'];

// One mandi price row as published (Agmarknet reports rupees per quintal; stored as paise per
// quintal with the unit kept explicit). source "sample" marks the labelled fallback dataset.
const priceReferenceSchema = new mongoose.Schema(
  {
    cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', default: null },
    commodity: { type: String, required: true },
    variety: { type: String, default: '' },
    market: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    priceUnit: { type: String, enum: ['quintal', 'kg'], default: 'quintal' },
    minPrice: paise({ required: true }),
    modalPrice: paise({ required: true }),
    maxPrice: paise({ required: true }),
    date: { type: Date, required: true },
    source: { type: String, enum: PRICE_SOURCES, required: true },
  },
  { timestamps: { createdAt: 'ingestedAt', updatedAt: false } },
);

// Re-running the daily ingestion must not create duplicates.
priceReferenceSchema.index(
  { source: 1, commodity: 1, variety: 1, market: 1, date: 1 },
  { unique: true },
);
priceReferenceSchema.index({ cropId: 1, district: 1, date: -1 });
priceReferenceSchema.index({ cropId: 1, state: 1, date: -1 });

export const PriceReference =
  mongoose.models.PriceReference ?? mongoose.model('PriceReference', priceReferenceSchema);
