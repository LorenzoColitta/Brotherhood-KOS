import mongoose from 'mongoose';

const kosEntrySchema = new mongoose.Schema({
  robloxId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  robloxUsername: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  addedBy: {
    type: String,
    required: true,
  },
  addedByUsername: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  thumbnailUrl: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
    index: true,
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  archivedBy: {
    type: String,
    default: null,
  },
  archivedReason: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for querying active entries
kosEntrySchema.index({ isActive: 1, expiresAt: 1 });

// Index for searching by username
kosEntrySchema.index({ robloxUsername: 'text' });

export const KosEntry = mongoose.model('KosEntry', kosEntrySchema);
export default KosEntry;
