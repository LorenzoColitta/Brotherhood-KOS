import { Events } from 'discord.js';
import { logger } from '../../utils/logger.js';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    
    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }
    
    try {
      logger.info(`Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing ${interaction.commandName}:`, error);
      
      const errorMessage = 'There was an error while executing this command!';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
  
  // Handle button interactions
  if (interaction.isButton()) {
    // Button interactions are handled by the commands themselves
    // This is just logging
    logger.debug(`Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
  }
  
  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    logger.debug(`Select menu interaction: ${interaction.customId} by ${interaction.user.tag}`);
  }
}
