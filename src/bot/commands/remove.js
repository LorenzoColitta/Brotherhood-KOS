import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import * as kosService from '../../services/kos.service.js';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a user from the KOS list')
  .addStringOption(option =>
    option
      .setName('userid')
      .setDescription('Roblox user ID')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for removal')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const robloxId = interaction.options.getString('userid');
  const reason = interaction.options.getString('reason');
  
  try {
    // Validate Roblox ID format
    if (!/^\d+$/.test(robloxId)) {
      await interaction.editReply({
        content: '❌ Invalid Roblox user ID. Please provide a numeric ID.',
      });
      return;
    }
    
    // Check if entry exists
    const entry = await kosService.findKosEntry(robloxId, true);
    
    if (!entry) {
      await interaction.editReply({
        content: '❌ This user is not on the active KOS list.',
      });
      return;
    }
    
    // Create confirmation buttons
    const confirmButton = new ButtonBuilder()
      .setCustomId(`remove_confirm:${robloxId}:${reason}`)
      .setLabel('Confirm Removal')
      .setStyle(ButtonStyle.Danger);
    
    const cancelButton = new ButtonBuilder()
      .setCustomId('remove_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);
    
    const row = new ActionRowBuilder()
      .addComponents(confirmButton, cancelButton);
    
    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('⚠️ Confirm KOS Removal')
      .addFields(
        { name: 'Username', value: entry.robloxUsername, inline: true },
        { name: 'User ID', value: entry.robloxId, inline: true },
        { name: 'Current Reason', value: entry.reason, inline: false },
        { name: 'Removal Reason', value: reason, inline: false }
      )
      .setDescription('Are you sure you want to remove this user from the KOS list?')
      .setFooter({ text: 'This action can be reversed by adding the user again.' });
    
    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
    
  } catch (error) {
    console.error('Error removing KOS entry:', error);
    
    await interaction.editReply({
      content: `❌ Failed to remove user from KOS list. Error: ${error.message}`,
    });
  }
}

export async function handleButton(interaction, action, params) {
  if (action === 'remove_confirm') {
    await interaction.deferUpdate();
    
    const [robloxId, ...reasonParts] = params;
    const reason = reasonParts.join(':');
    
    try {
      const entry = await kosService.removeKosEntry({
        robloxId,
        reason,
        removedBy: interaction.user.id,
        removedByUsername: interaction.user.username,
      });
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ User Removed from KOS')
        .addFields(
          { name: 'Username', value: entry.robloxUsername, inline: true },
          { name: 'User ID', value: entry.robloxId, inline: true },
          { name: 'Removal Reason', value: reason, inline: false },
          { name: 'Removed By', value: interaction.user.username, inline: true },
          { name: 'Date Removed', value: new Date().toLocaleString(), inline: true }
        );
      
      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
      
    } catch (error) {
      console.error('Error confirming removal:', error);
      
      await interaction.editReply({
        content: `❌ Failed to remove user from KOS list. Error: ${error.message}`,
        embeds: [],
        components: [],
      });
    }
    
    return true;
  }
  
  if (action === 'remove_cancel') {
    await interaction.update({
      content: '❌ Removal cancelled.',
      embeds: [],
      components: [],
    });
    return true;
  }
  
  return false;
}
