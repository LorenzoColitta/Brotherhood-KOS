import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

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

  // Telegram Configuration (Optional)
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  },

  // API Configuration
  api: {
    secretKey: process.env.API_SECRET_KEY,
  },

  // Cloudflare Configuration
  cloudflare: {
    accountId: process.env.CF_ACCOUNT_ID,
    apiToken: process.env.CF_API_TOKEN,
  },

  // MongoDB Data API (for Cloudflare Workers)
  mongoDataApi: {
    key: process.env.MONGODB_DATA_API_KEY,
    url: process.env.MONGODB_DATA_API_URL,
  },
};

// Validate required configuration
export function validateConfig() {
  const required = [
    { key: 'DISCORD_TOKEN', value: config.discord.token },
    { key: 'DISCORD_CLIENT_ID', value: config.discord.clientId },
    { key: 'MONGODB_URI', value: config.mongodb.uri },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(({ key }) => key).join(', ')}`
    );
  }
}

export default config;
