import mongoose from 'mongoose';

export const ROLES = ['farmer', 'buyer', 'agent', 'admin'];
export const SELF_SELECTABLE_ROLES = ['farmer', 'buyer'];
export const PIN_ROLES = ['agent', 'admin'];
export const LANGUAGES = ['te', 'en', 'hi'];
export const USER_STATUSES = ['active', 'suspended'];

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, match: /^\+91[6-9]\d{9}$/ },
    // null until a new user picks farmer or buyer on first login.
    role: { type: String, enum: ROLES, default: null },
    language: { type: String, enum: LANGUAGES, default: 'te' },
    status: { type: String, enum: USER_STATUSES, default: 'active' },
    pinHash: { type: String, select: false },
    pinFailedAttempts: { type: Number, default: 0, select: false },
    pinLockedUntil: { type: Date, select: false },
    // Access tokens issued before this instant are rejected (set by logout-all).
    tokensValidAfter: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    // Set only by the demo seed so demo accounts can be found and removed safely.
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    phone: this.phone,
    role: this.role,
    language: this.language,
    status: this.status,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
