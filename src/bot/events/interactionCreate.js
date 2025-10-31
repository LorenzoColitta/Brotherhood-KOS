import { Events } from 'discord.js';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
    
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      
      const errorMessage = {
        content: '❌ There was an error executing this command!',
        ephemeral: true,
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
  
  // Handle button interactions
  else if (interaction.isButton()) {
    const [action, ...params] = interaction.customId.split(':');
    
    try {
      // Find the command that handles this button
      for (const command of interaction.client.commands.values()) {
        if (command.handleButton && typeof command.handleButton === 'function') {
          const handled = await command.handleButton(interaction, action, params);
          if (handled) {
            return;
          }
        }
      }
      
      // If no command handled the button, send an error
      await interaction.reply({
        content: '❌ This button interaction is no longer valid.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(`Error handling button ${interaction.customId}:`, error);
      
      const errorMessage = {
        content: '❌ There was an error processing this button!',
        ephemeral: true,
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
}
