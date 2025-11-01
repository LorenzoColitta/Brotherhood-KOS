import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];

// Load all command files
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  
  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`⚠️  Command at ${filePath} is missing required "data" property`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.discord.token);

// Deploy commands
(async () => {
  try {
    console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.`);
    
    // Deploy to specific guild (faster for development)
    if (config.discord.guildId) {
      const data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      
      console.log(`✅ Successfully reloaded ${data.length} guild application (/) commands.`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      const data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      
      console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
      console.log('⚠️  Global commands may take up to 1 hour to update.');
    }
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
})();
