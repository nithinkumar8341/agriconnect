import mongoose from 'mongoose';

// One document per refresh token. Every token issued from the same login shares a familyId,
// so presenting an already-rotated token lets us revoke the whole chain.
const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String, maxlength: 200, default: '' },
    rememberDevice: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    replacedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ familyId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.models.Session ?? mongoose.model('Session', sessionSchema);
