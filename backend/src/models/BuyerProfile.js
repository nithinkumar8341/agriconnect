import mongoose from 'mongoose';
import { PINCODE_PATTERN, pointSchema } from './shared.js';

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 30, default: 'Home' },
  houseAndStreet: { type: String, trim: true, maxlength: 120, default: '' },
  landmark: { type: String, required: true, trim: true, maxlength: 120 },
  area: { type: String, trim: true, maxlength: 80, default: '' },
  pincode: { type: String, required: true, match: PINCODE_PATTERN },
  // Optional: buyers who deny location permission are matched to farmers by pincode.
  location: { type: pointSchema, default: undefined },
  isDefault: { type: Boolean, default: false },
});

const buyerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    addresses: {
      type: [addressSchema],
      default: [],
      validate: [
        { validator: (list) => list.length <= 5, message: 'at most 5 saved addresses' },
        {
          validator: (list) => list.filter((a) => a.isDefault).length <= 1,
          message: 'only one address can be the default',
        },
      ],
    },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Used by the "many accounts at one address" fraud rule (Prompt 13).
buyerProfileSchema.index({ 'addresses.pincode': 1, 'addresses.landmark': 1 });

export const BuyerProfile =
  mongoose.models.BuyerProfile ?? mongoose.model('BuyerProfile', buyerProfileSchema);
