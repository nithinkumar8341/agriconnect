import mongoose from 'mongoose';

// Who did what to which record, with the values before and after. Written by services
// (never by clients) for agent actions, admin actions, order status changes, fraud flags and refunds.
const auditLogSchema = new mongoose.Schema(
  {
    // null actor means the system itself (seed scripts, scheduled jobs).
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: {
      type: String,
      enum: ['farmer', 'buyer', 'agent', 'admin', 'system'],
      required: true,
    },
    action: { type: String, required: true, match: /^[a-z_]+\.[a-z_]+$/ },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, maxlength: 500 },
    requestId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const IMMUTABLE_ERROR = 'AuditLog is append-only';
for (const op of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
  'findOneAndReplace',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
]) {
  auditLogSchema.pre(op, () => {
    throw new Error(IMMUTABLE_ERROR);
  });
}
auditLogSchema.pre('save', function blockEdits() {
  if (!this.isNew) throw new Error(IMMUTABLE_ERROR);
});

export const AuditLog = mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema);
