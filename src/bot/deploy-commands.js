import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config, { validateConfig } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate configuration
validateConfig();

const commands = [];

// Load commands
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('Loading commands...');

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`⚠️  Command at ${filePath} is missing required "data" or "execute" property`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.discord.token);

// Deploy commands
(async () => {
  try {
    console.log(`\nStarted refreshing ${commands.length} application (/) commands.`);

    let data;

    if (config.discord.guildId) {
      // Guild-specific commands (faster for testing)
      console.log(`Deploying to guild: ${config.discord.guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
    } else {
      // Global commands (takes up to an hour to propagate)
      console.log('Deploying globally...');
      data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
    }

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error deploying commands:', error);
    process.exit(1);
  }
})();
