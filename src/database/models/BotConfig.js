import mongoose from 'mongoose';

const botConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, {
  timestamps: true,
});

export const BotConfig = mongoose.model('BotConfig', botConfigSchema);
export default BotConfig;
