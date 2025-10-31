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
    // Button handlers can be added here for confirmation flows
    const command = interaction.client.commands.get(interaction.customId.split('_')[0]);
    
    if (command && command.handleButton) {
      try {
        await command.handleButton(interaction);
      } catch (error) {
        console.error(`Error handling button interaction:`, error);
        await interaction.reply({
          content: '❌ There was an error processing your interaction!',
          ephemeral: true,
        });
      }
    }
  }
  
  // Handle select menu interactions
  else if (interaction.isStringSelectMenu()) {
    const command = interaction.client.commands.get(interaction.customId.split('_')[0]);
    
    if (command && command.handleSelectMenu) {
      try {
        await command.handleSelectMenu(interaction);
      } catch (error) {
        console.error(`Error handling select menu interaction:`, error);
        await interaction.reply({
          content: '❌ There was an error processing your selection!',
          ephemeral: true,
        });
      }
    }
  }
  
  // Handle modal submissions
  else if (interaction.isModalSubmit()) {
    const command = interaction.client.commands.get(interaction.customId.split('_')[0]);
    
    if (command && command.handleModal) {
      try {
        await command.handleModal(interaction);
      } catch (error) {
        console.error(`Error handling modal submission:`, error);
        await interaction.reply({
          content: '❌ There was an error processing your submission!',
          ephemeral: true,
        });
      }
    }
  }
}

export default { name, execute };
