import mongoose from 'mongoose';

export const MEDIA_STATUSES = ['pending', 'attached'];

// One uploaded photo. Photos are uploaded before the listing exists (the listing flow attaches
// them in Prompt 8), so they live in their own collection; unattached ones are cleaned up.
const mediaAssetSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['local', 'cloudinary'], required: true },
    storageKey: { type: String, required: true },
    thumbnailKey: { type: String, required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
    capturedAt: { type: Date, default: null },
    // 64-bit difference hash as 16 hex characters, plus its four 16-bit bands. Two photos whose
    // hashes differ in only a few bits are visually the same; sharing at least one band is the
    // cheap indexed pre-filter before the exact bit comparison.
    perceptualHash: { type: String, required: true, match: /^[0-9a-f]{16}$/ },
    perceptualHashBands: { type: [String], required: true },
    // Set when another farmer already uploaded a near-identical photo (fraud signal, Prompt 13).
    duplicateOf: {
      type: {
        assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        distance: Number,
      },
      default: null,
      _id: false,
    },
    status: { type: String, enum: MEDIA_STATUSES, default: 'pending' },
    attachedTo: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

mediaAssetSchema.index({ ownerId: 1, createdAt: -1 });
mediaAssetSchema.index({ perceptualHashBands: 1 });
mediaAssetSchema.index({ status: 1, createdAt: 1 });

export const MediaAsset =
  mongoose.models.MediaAsset ?? mongoose.model('MediaAsset', mediaAssetSchema);
