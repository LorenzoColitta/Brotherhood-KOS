import mongoose from 'mongoose';

const kosHistorySchema = new mongoose.Schema({
  robloxId: {
    type: String,
    required: true,
    index: true,
  },
  robloxUsername: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['added', 'removed', 'archived', 'status_changed'],
  },
  reason: {
    type: String,
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
  },
  performedByUsername: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Index for querying history by user
kosHistorySchema.index({ robloxId: 1, createdAt: -1 });

// Index for querying recent history
kosHistorySchema.index({ createdAt: -1 });

export const KosHistory = mongoose.model('KosHistory', kosHistorySchema);
export default KosHistory;
