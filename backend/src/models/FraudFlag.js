import mongoose from 'mongoose';

export const FRAUD_SUBJECT_TYPES = ['order', 'product', 'user'];
export const FRAUD_SEVERITIES = ['low', 'medium', 'high'];
export const FRAUD_ACTIONS = [
  'allow',
  'require_confirmation',
  'restrict_cod',
  'block',
  'admin_review',
];
export const FRAUD_STATUSES = ['open', 'resolved', 'dismissed'];

// Output of the rule engine (Prompt 13). evidence holds the numbers the rule saw, so an admin
// can see exactly why something was flagged.
const fraudFlagSchema = new mongoose.Schema(
  {
    subjectType: { type: String, enum: FRAUD_SUBJECT_TYPES, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    ruleId: { type: String, required: true },
    severity: { type: String, enum: FRAUD_SEVERITIES, required: true },
    action: { type: String, enum: FRAUD_ACTIONS, required: true },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: FRAUD_STATUSES, default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

fraudFlagSchema.index({ status: 1, severity: 1, createdAt: 1 });
fraudFlagSchema.index({ subjectType: 1, subjectId: 1 });

export const FraudFlag = mongoose.models.FraudFlag ?? mongoose.model('FraudFlag', fraudFlagSchema);
