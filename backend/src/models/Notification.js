import mongoose from 'mongoose';

export const NOTIFICATION_CHANNELS = ['in_app', 'sms', 'push'];
const RETENTION_DAYS = 90;

// Stores a template key and parameters, not finished text, so the app renders it in the
// reader's current language (te/en/hi) even if they switch languages later.
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    templateKey: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, default: 'in_app' },
    link: { type: String },
    readAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Serves the inbox list and the unread count.
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification =
  mongoose.models.Notification ?? mongoose.model('Notification', notificationSchema);
