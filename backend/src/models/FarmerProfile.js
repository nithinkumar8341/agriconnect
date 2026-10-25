import mongoose from 'mongoose';
import { paise, PINCODE_PATTERN, pointSchema, WEEKDAYS } from './shared.js';

export const VERIFICATION_LEVELS = ['phone_verified', 'agent_verified', 'trusted_seller'];

const farmerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    village: { type: String, required: true, trim: true, maxlength: 80 },
    mandal: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, enum: ['Andhra Pradesh', 'Telangana'], required: true },
    pincode: { type: String, required: true, match: PINCODE_PATTERN },
    // Optional: a farmer may refuse location permission and rely on servicePincodes instead.
    location: { type: pointSchema, default: undefined },
    deliveryRadiusKm: { type: Number, min: 0, max: 50, default: 5 },
    servicePincodes: {
      type: [{ type: String, match: PINCODE_PATTERN }],
      default: [],
      validate: { validator: (list) => list.length <= 30, message: 'at most 30 pincodes' },
    },
    deliveryDays: {
      type: [{ type: String, enum: WEEKDAYS }],
      default: ['mon', 'wed', 'fri'],
      validate: { validator: (days) => days.length > 0, message: 'pick at least one day' },
    },
    // Orders placed after this local time (Asia/Kolkata) go to the next delivery day.
    cutoffTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '18:00' },
    minOrderValue: paise({ default: 10000 }),
    deliveryFee: paise({ default: 2000 }),
    verificationLevel: { type: String, enum: VERIFICATION_LEVELS, default: 'phone_verified' },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// $geoNear (Prompt 9) needs a 2dsphere index; it skips documents without a location.
farmerProfileSchema.index({ location: '2dsphere' });
farmerProfileSchema.index({ servicePincodes: 1 });
farmerProfileSchema.index({ agentId: 1 });

export const FarmerProfile =
  mongoose.models.FarmerProfile ?? mongoose.model('FarmerProfile', farmerProfileSchema);
