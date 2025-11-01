import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import * as kosService from '../../services/kos.service.js';
import * as robloxService from '../../services/roblox.service.js';

export const data = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Add a user to the KOS list')
  .addStringOption(option =>
    option
      .setName('userid')
      .setDescription('Roblox user ID')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for adding to KOS')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('expires_days')
      .setDescription('Days until entry expires (optional)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const robloxId = interaction.options.getString('userid');
  const reason = interaction.options.getString('reason');
  const expiresDays = interaction.options.getInteger('expires_days');
  
  try {
    // Validate Roblox ID format
    if (!/^\d+$/.test(robloxId)) {
      await interaction.editReply({
        content: '❌ Invalid Roblox user ID. Please provide a numeric ID.',
      });
      return;
    }
    
    // Fetch Roblox user information
    await interaction.editReply({
      content: '🔍 Fetching Roblox user information...',
    });
    
    const robloxUser = await robloxService.getRobloxUserWithThumbnail(robloxId);
    
    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresDays && expiresDays > 0) {
      expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);
    }
    
    // Add to KOS
    await interaction.editReply({
      content: '📝 Adding user to KOS list...',
    });
    
    const entry = await kosService.addKosEntry({
      robloxId: robloxUser.id,
      robloxUsername: robloxUser.name,
      reason,
      addedBy: interaction.user.id,
      addedByUsername: interaction.user.username,
      thumbnailUrl: robloxUser.thumbnailUrl,
      expiresAt,
    });
    
    // Create success embed
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('✅ User Added to KOS')
      .setThumbnail(robloxUser.thumbnailUrl || null)
      .addFields(
        { name: 'Username', value: robloxUser.name, inline: true },
        { name: 'User ID', value: robloxUser.id, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Added By', value: interaction.user.username, inline: true },
        { name: 'Date Added', value: new Date().toLocaleString(), inline: true }
      );
    
    if (expiresAt) {
      embed.addFields({
        name: 'Expires',
        value: expiresAt.toLocaleString(),
        inline: false,
      });
    }
    
    embed.setFooter({ text: `KOS ID: ${entry._id}` });
    
    await interaction.editReply({
      content: null,
      embeds: [embed],
    });
    
  } catch (error) {
    console.error('Error adding KOS entry:', error);
    
    let errorMessage = '❌ Failed to add user to KOS list.';
    
    if (error.message.includes('already on the KOS list')) {
      errorMessage = '❌ This user is already on the KOS list.';
    } else if (error.message.includes('not found')) {
      errorMessage = '❌ Roblox user not found. Please check the user ID.';
    } else if (error.message) {
      errorMessage += ` Error: ${error.message}`;
    }
    
    await interaction.editReply({
      content: errorMessage,
    });
  }
}
