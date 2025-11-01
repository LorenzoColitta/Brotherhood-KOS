import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Discord configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID, // Optional - for guild-specific commands
  },
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  
  // API security
  api: {
    secretKey: process.env.API_SECRET_KEY,
  },
  
  // Admin configuration
  admin: {
    password: process.env.ADMIN_PASSWORD, // Optional - for automated setup
  },
  
  // Telegram configuration (optional)
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Validate required configuration
export function validateConfig() {
  const required = [
    ['DISCORD_TOKEN', config.discord.token],
    ['DISCORD_CLIENT_ID', config.discord.clientId],
    ['SUPABASE_URL', config.supabase.url],
    ['SUPABASE_SERVICE_ROLE_KEY', config.supabase.serviceRoleKey],
    ['API_SECRET_KEY', config.api.secretKey],
  ];
  
  const missing = required
    .filter(([name, value]) => !value)
    .map(([name]) => name);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file against .env.example'
    );
  }
}
