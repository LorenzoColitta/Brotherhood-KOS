import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { config, validateConfig } from '../config/config.js';
import { initializeSupabase, testConnection } from '../database/connection.js';
import { archiveExpiredEntries } from '../services/kos.service.js';
import { cleanupExpiredSessions } from '../services/admin.service.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate configuration
try {
  validateConfig();
  logger.success('Configuration validated');
} catch (error) {
  logger.error(error.message);
  process.exit(1);
}

// Initialize Supabase
initializeSupabase();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

logger.info(`Loading ${commandFiles.length} commands...`);
for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    logger.success(`Loaded command: ${command.data.name}`);
  } else {
    logger.warn(`Command at ${file} is missing required "data" or "execute" property`);
  }
}

// Load events
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

logger.info(`Loading ${eventFiles.length} events...`);
for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  const event = await import(`file://${filePath}`);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  logger.success(`Loaded event: ${event.name}`);
}

// Test database connection
logger.info('Testing database connection...');
const dbConnected = await testConnection();
if (!dbConnected) {
  logger.error('Failed to connect to database. Please check your configuration.');
  process.exit(1);
}

// Set up periodic tasks
logger.info('Setting up periodic tasks...');

// Archive expired entries every 5 minutes
setInterval(async () => {
  try {
    await archiveExpiredEntries();
  } catch (error) {
    logger.error('Error in scheduled archival task:', error.message);
  }
}, 5 * 60 * 1000);

// Clean up expired admin sessions every hour
setInterval(() => {
  cleanupExpiredSessions();
}, 60 * 60 * 1000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Login to Discord
logger.info('Logging in to Discord...');
client.login(config.discord.token).catch((error) => {
  logger.error('Failed to login to Discord:', error.message);
  process.exit(1);
});
