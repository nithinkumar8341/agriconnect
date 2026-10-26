import mongoose from 'mongoose';
import { localizedNameSchema, UNITS } from './shared.js';

export const CROP_CATEGORIES = ['vegetable', 'fruit', 'leafy', 'other'];

const cropSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]+$/ },
    names: { type: localizedNameSchema, required: true },
    category: { type: String, enum: CROP_CATEGORIES, required: true },
    defaultUnit: { type: String, enum: UNITS, required: true },
    allowedUnits: {
      type: [{ type: String, enum: UNITS }],
      validate: { validator: (units) => units.length > 0, message: 'needs at least one unit' },
    },
    // One-tap stock amounts in the farmer's listing flow, in the default unit.
    quantityPresets: { type: [{ type: Number, min: 0 }], default: [] },
    // Smallest amount a buyer can add or remove at a time (0.5 kg, 1 bunch, ...).
    quantityStep: { type: Number, min: 0.25, default: 1 },
    shelfLifeDays: { type: Number, min: 1, required: true },
    // Stock photo path served by the frontend (public/crops/<slug>.jpg).
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

cropSchema.path('allowedUnits').validate(function includesDefault(units) {
  return units.includes(this.defaultUnit);
}, 'allowedUnits must include defaultUnit');

cropSchema.index({ category: 1, isActive: 1 });

export const Crop = mongoose.models.Crop ?? mongoose.model('Crop', cropSchema);
