import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config, { validateConfig } from '../config/config.js';
import { connectToMongoDB } from '../database/mongo-connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate configuration
validateConfig();

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

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`⚠️  Command at ${filePath} is missing required "data" or "execute" property`);
  }
}

// Load events
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  const event = await import(`file://${filePath}`);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`✅ Loaded event: ${event.name}`);
}

// Graceful shutdown handler
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  try {
    // Disconnect from MongoDB
    const { disconnectFromMongoDB } = await import('../database/mongo-connection.js');
    await disconnectFromMongoDB();
    
    // Destroy Discord client
    client.destroy();
    
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Connect to MongoDB and login to Discord
async function start() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Login to Discord
    await client.login(config.discord.token);
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

start();

export default client;
