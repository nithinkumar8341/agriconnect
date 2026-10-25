import mongoose from 'mongoose';

export const OTP_PURPOSES = ['login'];

const otpRequestSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    // Kept well past expiry so the per-phone hourly cap can count recent requests; then MongoDB deletes it.
    purgeAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Serves both "latest OTP for this phone" and "how many OTPs in the last hour".
otpRequestSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
otpRequestSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const OtpRequest =
  mongoose.models.OtpRequest ?? mongoose.model('OtpRequest', otpRequestSchema);
