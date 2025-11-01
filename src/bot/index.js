import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config from '../config/config.js';
import { connectToDatabase } from '../database/mongo-connection.js';
import { archiveExpiredEntries } from '../services/kos.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Archive expired entries every hour
setInterval(async () => {
  try {
    const count = await archiveExpiredEntries();
    if (count > 0) {
      console.log(`Archived ${count} expired KOS entries`);
    }
  } catch (error) {
    console.error('Error archiving expired entries:', error);
  }
}, 60 * 60 * 1000); // 1 hour

// Connect to MongoDB and start bot
(async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectToDatabase();
    
    console.log('🤖 Logging in to Discord...');
    await client.login(config.discord.token);
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
})();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down bot...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down bot...');
  client.destroy();
  process.exit(0);
});
