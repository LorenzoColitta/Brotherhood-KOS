import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { config, validateConfig } from '../config/config.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate configuration
try {
  validateConfig();
} catch (error) {
  logger.error(error.message);
  process.exit(1);
}

const commands = [];

// Load commands
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

logger.info(`Loading ${commandFiles.length} commands for deployment...`);
for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  
  if ('data' in command) {
    commands.push(command.data.toJSON());
    logger.info(`Loaded command: ${command.data.name}`);
  } else {
    logger.warn(`Command at ${file} is missing required "data" property`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.discord.token);

// Deploy commands
(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);
    
    // Deploy to guild (faster) or globally
    if (config.discord.guildId) {
      // Guild commands (instant update)
      const data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      );
      
      logger.success(`Successfully deployed ${data.length} guild commands to guild ${config.discord.guildId}`);
    } else {
      // Global commands (takes up to 1 hour to propagate)
      const data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands },
      );
      
      logger.success(`Successfully deployed ${data.length} global commands (may take up to 1 hour to propagate)`);
    }
  } catch (error) {
    logger.error('Error deploying commands:', error);
    process.exit(1);
  }
})();
