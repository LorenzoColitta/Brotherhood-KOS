import mongoose from 'mongoose';

const botConfigSchema = new mongoose.Schema(
  {
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
    description: {
      type: String,
      default: null,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get a config value
botConfigSchema.statics.getValue = async function (key, defaultValue = null) {
  const config = await this.findOne({ key });
  return config ? config.value : defaultValue;
};

// Static method to set a config value
botConfigSchema.statics.setValue = async function (key, value, description = null) {
  return await this.findOneAndUpdate(
    { key },
    { value, description },
    { upsert: true, new: true }
  );
};

// Static method to delete a config value
botConfigSchema.statics.deleteValue = async function (key) {
  return await this.deleteOne({ key });
};

const BotConfig = mongoose.model('BotConfig', botConfigSchema);

export default BotConfig;
