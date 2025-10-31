import mongoose from 'mongoose';

const kosLogSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    enum: ['info', 'warn', 'error'],
    index: true,
  },
  action: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
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
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Index for querying logs by date
kosLogSchema.index({ createdAt: -1 });

// Index for querying logs by level and date
kosLogSchema.index({ level: 1, createdAt: -1 });

export const KosLog = mongoose.model('KosLog', kosLogSchema);
export default KosLog;
