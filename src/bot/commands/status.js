import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { findKosEntry } from '../../services/kos.service.js';
import { getRobloxUserInfo } from '../../services/roblox.service.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check the KOS status of a Roblox user')
  .addStringOption(option =>
    option
      .setName('roblox_id')
      .setDescription('The Roblox user ID to check')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const robloxUserId = interaction.options.getString('roblox_id');

  try {
    // Find KOS entry
    const entry = await findKosEntry(robloxUserId);

    if (!entry) {
      // User is not on KOS - get their info for a friendly response
      try {
        const userInfo = await getRobloxUserInfo(robloxUserId);
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ User Not on KOS')
          .addFields(
            { name: 'Roblox Username', value: userInfo.username, inline: true },
            { name: 'Roblox User ID', value: robloxUserId, inline: true },
            { name: 'Status', value: '✅ Clean - Not on KOS list', inline: false }
          )
          .setThumbnail(userInfo.thumbnail)
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        return await interaction.editReply({
          content: '❌ User not found on KOS list and could not verify Roblox user ID.',
        });
      }
    }

    // User is on KOS
    const timeOnKos = Math.ceil((new Date() - new Date(entry.createdAt)) / (1000 * 60 * 60 * 24));
    let expirationInfo = '⏰ Permanent';
    
    if (!entry.isPermanent && entry.expiresAt) {
      const daysUntilExpiry = Math.ceil((new Date(entry.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry > 0) {
        expirationInfo = `⏰ Expires in ${daysUntilExpiry} day(s) (${new Date(entry.expiresAt).toLocaleDateString()})`;
      } else {
        expirationInfo = `⏰ Expired ${Math.abs(daysUntilExpiry)} day(s) ago (pending archival)`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🚨 User on KOS List')
      .addFields(
        { name: 'Roblox Username', value: entry.robloxUsername, inline: true },
        { name: 'Roblox User ID', value: entry.robloxUserId, inline: true },
        { name: 'Reason', value: entry.reason, inline: false },
        { name: 'Added By', value: entry.addedBy.discordUsername, inline: true },
        { name: 'Time on KOS', value: `${timeOnKos} day(s)`, inline: true },
        { name: 'Expiration', value: expirationInfo, inline: false },
        { name: 'Added On', value: new Date(entry.createdAt).toLocaleString(), inline: false }
      )
      .setThumbnail(entry.thumbnailUrl)
      .setFooter({ text: 'KOS Status' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in status command:', error);
    
    await interaction.editReply({
      content: `❌ Failed to check KOS status: ${error.message || 'An unknown error occurred'}`,
    });
  }
}

export default { data, execute };
