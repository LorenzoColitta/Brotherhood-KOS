import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { addKosEntry } from '../../services/kos.service.js';
import { validateRobloxUserId } from '../../services/roblox.service.js';

export const data = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Add a user to the KOS list')
  .addStringOption(option =>
    option
      .setName('roblox_id')
      .setDescription('The Roblox user ID to add')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for adding to KOS')
      .setRequired(true)
  )
  .addBooleanOption(option =>
    option
      .setName('permanent')
      .setDescription('Is this a permanent KOS entry?')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('duration_days')
      .setDescription('Duration in days (if not permanent)')
      .setMinValue(1)
      .setMaxValue(365)
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const robloxUserId = interaction.options.getString('roblox_id');
  const reason = interaction.options.getString('reason');
  const isPermanent = interaction.options.getBoolean('permanent') ?? false;
  const durationDays = interaction.options.getInteger('duration_days');

  try {
    // Validate Roblox user ID
    const isValid = await validateRobloxUserId(robloxUserId);
    if (!isValid) {
      return await interaction.editReply({
        content: '❌ Invalid Roblox user ID. Please check and try again.',
      });
    }

    // Calculate expiration date
    let expiresAt = null;
    if (!isPermanent && durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('⚠️ Confirm KOS Addition')
      .addFields(
        { name: 'Roblox User ID', value: robloxUserId, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { 
          name: 'Duration', 
          value: isPermanent ? '⏰ Permanent' : (expiresAt ? `⏰ ${durationDays} days (until ${expiresAt.toLocaleDateString()})` : '⏰ Until manually removed'),
          inline: false 
        }
      )
      .setFooter({ text: 'This action will notify all configured channels' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`add_confirm_${robloxUserId}`)
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('add_cancel')
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

      if (confirmation.customId === 'add_cancel') {
        await confirmation.update({
          content: '❌ KOS addition cancelled.',
          embeds: [],
          components: [],
        });
        return;
      }

      if (confirmation.customId.startsWith('add_confirm_')) {
        await confirmation.deferUpdate();

        // Add to KOS
        const entry = await addKosEntry({
          robloxUserId,
          reason,
          addedBy: {
            discordId: interaction.user.id,
            discordUsername: interaction.user.tag,
          },
          expiresAt,
          isPermanent,
        });

        const successEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ User Added to KOS')
          .addFields(
            { name: 'Roblox Username', value: entry.robloxUsername, inline: true },
            { name: 'Roblox User ID', value: entry.robloxUserId, inline: true },
            { name: 'Reason', value: entry.reason, inline: false },
            { 
              name: 'Status', 
              value: entry.isPermanent ? '⏰ Permanent' : `⏰ Expires: ${entry.expiresAt ? new Date(entry.expiresAt).toLocaleString() : 'Never'}`,
              inline: false 
            }
          )
          .setThumbnail(entry.thumbnailUrl)
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
          content: '⏱️ Confirmation timeout - KOS addition cancelled.',
          embeds: [],
          components: [],
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error in add command:', error);
    
    const errorMessage = error.message || 'An unknown error occurred';
    
    await interaction.editReply({
      content: `❌ Failed to add user to KOS: ${errorMessage}`,
      embeds: [],
      components: [],
    });
  }
}

export default { data, execute };
