import mongoose from 'mongoose';

export const COMPLAINT_CATEGORIES = ['app_problem', 'payment', 'behaviour', 'listing', 'other'];
export const COMPLAINT_STATUSES = ['open', 'in_progress', 'resolved'];

// Non-order issues. Problems with delivered produce use ReturnRequest instead.
const complaintSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: COMPLAINT_CATEGORIES, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

complaintSchema.index({ status: 1, createdAt: 1 });
complaintSchema.index({ userId: 1, createdAt: -1 });

export const Complaint = mongoose.models.Complaint ?? mongoose.model('Complaint', complaintSchema);
