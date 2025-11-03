import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getRobloxUserInfo } from '../../services/roblox.service.js';
import { addKosEntry } from '../../services/kos.service.js';
import { logger } from '../../utils/logger.js';
import ms from 'ms';

export const data = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Add a player to the KOS list')
  .addStringOption(option =>
    option.setName('username')
      .setDescription('Roblox username of the player')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for adding to KOS')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('duration')
      .setDescription('Duration (e.g., 7d, 30d, 1y) - leave empty for permanent')
      .setRequired(false));

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const username = interaction.options.getString('username');
  const reason = interaction.options.getString('reason');
  const duration = interaction.options.getString('duration');
  
  try {
    // Validate duration if provided
    let expiryDate = null;
    if (duration) {
      const durationMs = ms(duration);
      if (!durationMs || durationMs <= 0) {
        return await interaction.editReply({
          content: '❌ Invalid duration format. Use formats like: 7d, 30d, 1y, 6mo',
        });
      }
      expiryDate = new Date(Date.now() + durationMs).toISOString();
    }
    
    // Fetch Roblox user info
    await interaction.editReply('🔍 Looking up Roblox user...');
    
    const robloxInfo = await getRobloxUserInfo(username);
    if (!robloxInfo) {
      return await interaction.editReply({
        content: `❌ Could not find Roblox user: **${username}**\nPlease check the username and try again.`,
      });
    }
    
    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirm KOS Entry')
      .setDescription('Please review the details below and confirm:')
      .setColor(0xFF6B6B)
      .setThumbnail(robloxInfo.thumbnailUrl || null)
      .addFields(
        { name: 'Roblox Username', value: robloxInfo.name, inline: true },
        { name: 'User ID', value: robloxInfo.id.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false },
        { 
          name: 'Duration', 
          value: expiryDate ? `Expires: <t:${Math.floor(new Date(expiryDate).getTime() / 1000)}:R>` : 'Permanent', 
          inline: false 
        },
        { name: 'Added By', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();
    
    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_add')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_add')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );
    
    // Send the embed (we already deferred, so we edit the deferred reply),
    // then fetch the Message object so we can safely create a collector on it.
    await interaction.editReply({
      content: '',
      embeds: [confirmEmbed],
      components: [confirmRow],
    });

    // IMPORTANT: fetch the updated reply message (interaction.fetchReply returns the Message)
    const replyMessage = await interaction.fetchReply().catch((err) => {
      logger.warn('Could not fetch reply message after editReply:', err);
      return null;
    });

    // Diagnostic log
    logger.debug(`add command: replyMessage id=${replyMessage?.id ?? '<null>'} components=${replyMessage?.components?.length ?? 0}`);

    // If we couldn't fetch a reply message (rare), fall back to interaction.awaitMessageComponent
    if (!replyMessage) {
      logger.warn('add command: replyMessage is null, using awaitMessageComponent fallback');
      try {
        const component = await interaction.awaitMessageComponent({
          filter: i => i.user.id === interaction.user.id && (i.customId === 'confirm_add' || i.customId === 'cancel_add'),
          time: 60000,
        });

        if (component.customId === 'cancel_add') {
          await component.update({
            content: '❌ KOS entry cancelled.',
            embeds: [],
            components: [],
          });
          return;
        }

        if (component.customId === 'confirm_add') {
          await component.update({
            content: '⏳ Adding entry to database...',
            embeds: [],
            components: [],
          });

          try {
            const entry = await addKosEntry({
              robloxUsername: robloxInfo.name,
              robloxUserId: robloxInfo.id,
              reason: reason,
              addedBy: interaction.user.tag,
              addedByDiscordId: interaction.user.id,
              expiryDate: expiryDate,
              thumbnailUrl: robloxInfo.thumbnailUrl,
            });

            const successEmbed = new EmbedBuilder()
              .setTitle('✅ KOS Entry Added')
              .setColor(0x4CAF50)
              .setThumbnail(robloxInfo.thumbnailUrl || null)
              .addFields(
                { name: 'Username', value: robloxInfo.name, inline: true },
                { name: 'User ID', value: robloxInfo.id.toString(), inline: true },
                { name: 'Reason', value: reason, inline: false },
                { 
                  name: 'Status', 
                  value: expiryDate ? `Expires <t:${Math.floor(new Date(expiryDate).getTime() / 1000)}:R>` : 'Permanent', 
                  inline: false 
                }
              )
              .setTimestamp();

            await component.update({
              content: '',
              embeds: [successEmbed],
              components: [],
            });

            logger.success(`KOS entry added for ${robloxInfo.name} by ${interaction.user.tag}`);
          } catch (error) {
            logger.error('Error adding KOS entry (fallback):', error);
            await component.update({
              content: `❌ Error adding KOS entry: ${error.message}`,
              embeds: [],
              components: [],
            }).catch(() => {});
          }
        }
      } catch (err) {
        logger.warn('add command: awaitMessageComponent timeout or error:', err);
        await interaction.editReply({
          content: '⏱️ Confirmation timed out. Please try again.',
          embeds: [],
          components: [],
        }).catch(() => {});
      }
      return;
    }

    // Create collector on the returned message (safe because fetchReply returned it)
    const filter = i => i.user.id === interaction.user.id && (i.customId === 'confirm_add' || i.customId === 'cancel_add');
    const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'cancel_add') {
        await i.update({
          content: '❌ KOS entry cancelled.',
          embeds: [],
          components: [],
        }).catch(() => {});
        collector.stop('cancelled');
        return;
      }
      
      if (i.customId === 'confirm_add') {
        await i.update({
          content: '⏳ Adding entry to database...',
          embeds: [],
          components: [],
        }).catch(() => {});
        
        try {
          // Add to database
          const entry = await addKosEntry({
            robloxUsername: robloxInfo.name,
            robloxUserId: robloxInfo.id,
            reason: reason,
            addedBy: interaction.user.tag,
            addedByDiscordId: interaction.user.id,
            expiryDate: expiryDate,
            thumbnailUrl: robloxInfo.thumbnailUrl,
          });
          
          // Success message
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ KOS Entry Added')
            .setColor(0x4CAF50)
            .setThumbnail(robloxInfo.thumbnailUrl || null)
            .addFields(
              { name: 'Username', value: robloxInfo.name, inline: true },
              { name: 'User ID', value: robloxInfo.id.toString(), inline: true },
              { name: 'Reason', value: reason, inline: false },
              { 
                name: 'Status', 
                value: expiryDate ? `Expires <t:${Math.floor(new Date(expiryDate).getTime() / 1000)}:R>` : 'Permanent', 
                inline: false 
              }
            )
            .setTimestamp();
          
          // Use i.update to update the message tied to the button interaction
          await i.update({
            content: '',
            embeds: [successEmbed],
            components: [],
          }).catch(() => {});
          
          logger.success(`KOS entry added for ${robloxInfo.name} by ${interaction.user.tag}`);
        } catch (error) {
          logger.error('Error adding KOS entry:', error);
          await i.update({
            content: `❌ Error adding KOS entry: ${error.message}`,
            embeds: [],
            components: [],
          }).catch(() => {});
        }
        
        collector.stop('confirmed');
      }
    });
    
    collector.on('end', async (collected, reason) => {
      logger.debug(`add command: collector ended, reason=${reason}, collected=${collected.size}`);
      if (collected.size === 0) {
        // No interactions were collected
        await interaction.editReply({
          content: '⏱️ Confirmation timed out. Please try again.',
          embeds: [],
          components: [],
        }).catch(() => {});
      } else {
        // Ensure components removed after interaction
        try {
          if (replyMessage && !replyMessage.deleted) {
            await replyMessage.edit({ components: [] }).catch(() => {});
          }
        } catch (err) {
          logger.warn('add command: failed to clean up components after end:', err);
        }
      }
    });
    
  } catch (error) {
    logger.error('Error in add command:', error);
    await interaction.editReply({
      content: `❌ An error occurred: ${error.message}`,
    }).catch(() => {});
  }
}
