import mongoose from 'mongoose';

// Only overrides are stored; defaults and validation live in services/appConfig.service.js.
const appConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export const AppConfig = mongoose.models.AppConfig ?? mongoose.model('AppConfig', appConfigSchema);
