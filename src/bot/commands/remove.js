import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { findKosEntry, removeKosEntry } from '../../services/kos.service.js';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a user from the KOS list')
  .addStringOption(option =>
    option
      .setName('roblox_id')
      .setDescription('The Roblox user ID to remove')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for removal')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const robloxUserId = interaction.options.getString('roblox_id');
  const reason = interaction.options.getString('reason') ?? 'Removed from KOS';

  try {
    // Check if user is on KOS
    const entry = await findKosEntry(robloxUserId);
    
    if (!entry) {
      return await interaction.editReply({
        content: '❌ This user is not on the KOS list.',
      });
    }

    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0xFFAA00)
      .setTitle('⚠️ Confirm KOS Removal')
      .addFields(
        { name: 'Roblox Username', value: entry.robloxUsername, inline: true },
        { name: 'Roblox User ID', value: entry.robloxUserId, inline: true },
        { name: 'Original Reason', value: entry.reason, inline: false },
        { name: 'Removal Reason', value: reason, inline: false },
        { 
          name: 'Added By', 
          value: `${entry.addedBy.discordUsername} on ${new Date(entry.createdAt).toLocaleDateString()}`,
          inline: false 
        }
      )
      .setThumbnail(entry.thumbnailUrl)
      .setFooter({ text: 'This action will archive the entry and notify all configured channels' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`remove_confirm_${robloxUserId}`)
          .setLabel('Confirm Removal')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('remove_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    // Wait for button interaction
    try {
      const confirmation = await response.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        time: 60000,
      });

      if (confirmation.customId === 'remove_cancel') {
        await confirmation.update({
          content: '❌ KOS removal cancelled.',
          embeds: [],
          components: [],
        });
        return;
      }

      if (confirmation.customId.startsWith('remove_confirm_')) {
        await confirmation.deferUpdate();

        // Remove from KOS
        const removedEntry = await removeKosEntry(
          robloxUserId,
          {
            discordId: interaction.user.id,
            discordUsername: interaction.user.tag,
          },
          reason
        );

        const successEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ User Removed from KOS')
          .addFields(
            { name: 'Roblox Username', value: removedEntry.robloxUsername, inline: true },
            { name: 'Roblox User ID', value: removedEntry.robloxUserId, inline: true },
            { name: 'Removal Reason', value: reason, inline: false },
            { name: 'Removed By', value: interaction.user.tag, inline: true },
            { 
              name: 'Was on KOS for', 
              value: `${Math.ceil((new Date() - new Date(removedEntry.createdAt)) / (1000 * 60 * 60 * 24))} days`,
              inline: true 
            }
          )
          .setThumbnail(removedEntry.thumbnailUrl)
          .setTimestamp();

        await confirmation.editReply({
          content: null,
          embeds: [successEmbed],
          components: [],
        });
      }
    } catch (error) {
      if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
        await interaction.editReply({
          content: '⏱️ Confirmation timeout - KOS removal cancelled.',
          embeds: [],
          components: [],
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error in remove command:', error);
    
    const errorMessage = error.message || 'An unknown error occurred';
    
    await interaction.editReply({
      content: `❌ Failed to remove user from KOS: ${errorMessage}`,
      embeds: [],
      components: [],
    });
  }
}

export default { data, execute };
