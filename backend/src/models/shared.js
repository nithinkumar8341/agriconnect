import mongoose from 'mongoose';

export const UNITS = ['kg', 'dozen', 'bunch', 'piece'];
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const PINCODE_PATTERN = /^[1-9]\d{5}$/;

// Money is stored as whole paise (₹1 = 100) so totals never suffer floating-point drift.
export const paise = (extra = {}) => ({
  type: Number,
  min: 0,
  validate: { validator: Number.isInteger, message: '{PATH} must be a whole number of paise' },
  ...extra,
});

// Generous bounding box around India. The service is India-only, and this catches the classic
// GeoJSON bug of swapping the order: [16.5, 80.6] (lat, lng for Vijayawada) passes a plain
// world-range check because 80.6 is a valid Arctic latitude, but it fails this one.
const INDIA_BOUNDS = { minLng: 68, maxLng: 98, minLat: 6, maxLat: 38 };

export function isPointInIndia([lng, lat] = []) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= INDIA_BOUNDS.minLng &&
    lng <= INDIA_BOUNDS.maxLng &&
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat
  );
}

// GeoJSON stores [longitude, latitude].
export const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: isPointInIndia,
        message: 'coordinates must be [longitude, latitude] inside India',
      },
    },
  },
  { _id: false },
);

export const localizedNameSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    te: { type: String, required: true, trim: true },
    hi: { type: String, required: true, trim: true },
  },
  { _id: false },
);

export const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    capturedAt: { type: Date },
    // Filled by the upload pipeline (Prompt 7) and used by the duplicate-photo fraud rule.
    perceptualHash: { type: String },
  },
  { _id: false },
);
