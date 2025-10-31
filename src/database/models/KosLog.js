import mongoose from 'mongoose';

const kosLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'debug'],
      default: 'info',
      index: true,
    },
    category: {
      type: String,
      enum: ['bot', 'api', 'database', 'service', 'command', 'system'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    username: {
      type: String,
      default: null,
    },
    error: {
      message: String,
      stack: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
kosLogSchema.index({ createdAt: -1 });
kosLogSchema.index({ level: 1, createdAt: -1 });
kosLogSchema.index({ category: 1, createdAt: -1 });

// Static method to create log entries
kosLogSchema.statics.log = async function (level, category, message, details = null) {
  return await this.create({
    level,
    category,
    message,
    details,
  });
};

// Static method to get recent logs
kosLogSchema.statics.getRecent = function (limit = 100, filter = {}) {
  return this.find(filter).sort({ createdAt: -1 }).limit(limit);
};

const KosLog = mongoose.model('KosLog', kosLogSchema);

export default KosLog;
