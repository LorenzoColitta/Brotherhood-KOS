import mongoose from 'mongoose';

const kosHistorySchema = new mongoose.Schema(
  {
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KosEntry',
      required: true,
      index: true,
    },
    robloxUserId: {
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
      enum: ['added', 'removed', 'archived', 'updated', 'expired'],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: null,
    },
    performedBy: {
      discordId: {
        type: String,
        required: true,
      },
      discordUsername: {
        type: String,
        required: true,
      },
    },
    changes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
kosHistorySchema.index({ createdAt: -1 });
kosHistorySchema.index({ action: 1, createdAt: -1 });
kosHistorySchema.index({ 'performedBy.discordId': 1 });

const KosHistory = mongoose.model('KosHistory', kosHistorySchema);

export default KosHistory;
