import mongoose from 'mongoose';
import { paise } from './shared.js';

export const LEDGER_TYPES = [
  'buyer_payment',
  'platform_fee',
  'farmer_payout',
  'refund',
  'buyer_credit',
];

// Append-only money log. Corrections are new entries, never edits, so history stays auditable.
const ledgerEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: LEDGER_TYPES, required: true },
    // Whose balance this entry belongs to (buyer, farmer, or null for the platform).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    amount: paise({ required: true }),
    // Payouts are simulated in the MVP: no real money moves to farmers (Prompt 12).
    simulated: { type: Boolean, default: false },
    description: { type: String, maxlength: 200 },
    // Unique per business event (for example "payout:<orderId>") so retries cannot double-credit.
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ledgerEntrySchema.index({ userId: 1, createdAt: -1 });
ledgerEntrySchema.index({ orderId: 1 });

const IMMUTABLE_ERROR = 'LedgerEntry is append-only; record a correcting entry instead';
for (const op of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
  'findOneAndReplace',
]) {
  ledgerEntrySchema.pre(op, () => {
    throw new Error(IMMUTABLE_ERROR);
  });
}
ledgerEntrySchema.pre('save', function blockEdits() {
  if (!this.isNew) throw new Error(IMMUTABLE_ERROR);
});

export const LedgerEntry =
  mongoose.models.LedgerEntry ?? mongoose.model('LedgerEntry', ledgerEntrySchema);
