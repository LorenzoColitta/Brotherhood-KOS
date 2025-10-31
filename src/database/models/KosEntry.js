import mongoose from 'mongoose';

const kosEntrySchema = new mongoose.Schema(
  {
    robloxUserId: {
      type: String,
      required: true,
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
      discordId: {
        type: String,
        required: true,
      },
      discordUsername: {
        type: String,
        required: true,
      },
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    isPermanent: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'removed'],
      default: 'active',
      index: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
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
kosEntrySchema.index({ robloxUserId: 1, status: 1 });
kosEntrySchema.index({ createdAt: -1 });
kosEntrySchema.index({ expiresAt: 1, status: 1 });

// Virtual for checking if entry is expired
kosEntrySchema.virtual('isExpired').get(function () {
  if (this.isPermanent || !this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
});

// Method to archive the entry
kosEntrySchema.methods.archive = async function () {
  this.status = 'archived';
  return await this.save();
};

// Static method to find active entries
kosEntrySchema.statics.findActive = function () {
  return this.find({ status: 'active' });
};

// Static method to find expiring soon entries
kosEntrySchema.statics.findExpiringSoon = function (days = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    isPermanent: false,
    expiresAt: {
      $gte: now,
      $lte: futureDate,
    },
  });
};

kosEntrySchema.set('toJSON', { virtuals: true });
kosEntrySchema.set('toObject', { virtuals: true });

const KosEntry = mongoose.model('KosEntry', kosEntrySchema);

export default KosEntry;
