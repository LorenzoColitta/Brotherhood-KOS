import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
  },
  
  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  
  // Telegram Configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  },
  
  // API Configuration
  api: {
    secretKey: process.env.API_SECRET_KEY,
  },
  
  // General Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
};

// Validate required configuration
const requiredConfig = [
  { key: 'discord.token', value: config.discord.token, name: 'DISCORD_TOKEN' },
  { key: 'discord.clientId', value: config.discord.clientId, name: 'DISCORD_CLIENT_ID' },
  { key: 'mongodb.uri', value: config.mongodb.uri, name: 'MONGODB_URI' },
];

for (const { key, value, name } of requiredConfig) {
  if (!value) {
    throw new Error(`Missing required configuration: ${name}`);
  }
}

export default config;
