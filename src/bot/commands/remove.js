import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { removeKosEntry, getKosEntries } from '../../services/kos.service.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a player from the KOS list')
  .addStringOption(option =>
    option.setName('username')
      .setDescription('Roblox username of the player to remove')
      .setRequired(true));

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });
  
  const username = interaction.options.getString('username');
  
  try {
    // Check if entry exists
    const { entries } = await getKosEntries(1000);
    const entry = entries.find(e => e.roblox_username.toLowerCase() === username.toLowerCase());
    
    if (!entry) {
      return await interaction.editReply({
        content: `❌ No KOS entry found for: **${username}**`,
      });
    }
    
    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirm KOS Entry Removal')
      .setDescription('Are you sure you want to remove this entry?')
      .setColor(0xFFA500)
      .setThumbnail(entry.thumbnail_url || null)
      .addFields(
        { name: 'Roblox Username', value: entry.roblox_username, inline: true },
        { name: 'User ID', value: entry.roblox_user_id?.toString() || 'N/A', inline: true },
        { name: 'Reason', value: entry.reason, inline: false },
        { name: 'Added By', value: entry.added_by, inline: true },
        { name: 'Added On', value: `<t:${Math.floor(new Date(entry.created_at).getTime() / 1000)}:R>`, inline: true }
      )
      .setTimestamp();
    
    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_remove')
          .setLabel('Confirm Removal')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_remove')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.editReply({
      content: '',
      embeds: [confirmEmbed],
      components: [confirmRow],
    });
    
    // Wait for button interaction
    const filter = i => i.user.id === interaction.user.id && (i.customId === 'confirm_remove' || i.customId === 'cancel_remove');
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
    
    collector.on('collect', async i => {
      if (i.customId === 'cancel_remove') {
        await i.update({
          content: '❌ Removal cancelled.',
          embeds: [],
          components: [],
        });
        collector.stop();
        return;
      }
      
      if (i.customId === 'confirm_remove') {
        await i.update({
          content: '⏳ Removing entry from database...',
          embeds: [],
          components: [],
        });
        
        try {
          // Remove from database (archives to history)
          const removedEntry = await removeKosEntry(
            entry.roblox_username,
            interaction.user.tag,
            interaction.user.id
          );
          
          // Success message
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ KOS Entry Removed')
            .setDescription('The entry has been removed and archived to history.')
            .setColor(0x4CAF50)
            .setThumbnail(entry.thumbnail_url || null)
            .addFields(
              { name: 'Username', value: entry.roblox_username, inline: true },
              { name: 'Removed By', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();
          
          await i.editReply({
            content: '',
            embeds: [successEmbed],
          });
          
          logger.success(`KOS entry removed for ${entry.roblox_username} by ${interaction.user.tag}`);
        } catch (error) {
          await i.editReply({
            content: `❌ Error removing KOS entry: ${error.message}`,
          });
        }
        
        collector.stop();
      }
    });
    
    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({
          content: '⏱️ Confirmation timed out. Please try again.',
          embeds: [],
          components: [],
        }).catch(() => {});
      }
    });
    
  } catch (error) {
    logger.error('Error in remove command:', error);
    await interaction.editReply({
      content: `❌ An error occurred: ${error.message}`,
    }).catch(() => {});
  }
}
