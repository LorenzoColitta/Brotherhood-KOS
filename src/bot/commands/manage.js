import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getStatistics, toggleBotStatus, getBotStatus } from '../../services/kos.service.js';
import { verifyAdminPassword, createAdminSession, verifyAdminSession } from '../../services/admin.service.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('manage')
  .setDescription('Manage bot settings (Admin only)');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Check if user has an active admin session
    const userId = interaction.user.id;
    const hasSession = false; // We'll check for session token in DM flow
    
    // Send DM to user for authentication
    await interaction.editReply({
      content: '📨 Check your DMs for authentication!',
    });
    
    try {
      const dmChannel = await interaction.user.createDM();
      
      // Request admin password
      await dmChannel.send({
        content: '🔐 **Admin Authentication Required**\n\nPlease enter the admin password to continue:',
      });
      
      // Wait for password message
      const filter = m => m.author.id === userId;
      const collected = await dmChannel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const password = collected.first().content;
      
      // Delete password message for security
      await collected.first().delete().catch(() => {});
      
      // Verify password
      const isValid = await verifyAdminPassword(password);
      if (!isValid) {
        await dmChannel.send('❌ Invalid password. Access denied.');
        return await interaction.editReply({
          content: '❌ Authentication failed.',
        });
      }
      
      // Create admin session
      const sessionToken = createAdminSession(userId);
      
      // Show management menu
      await showManagementMenu(dmChannel, interaction, userId, sessionToken);
      
    } catch (error) {
      if (error.code === 50007) {
        // Cannot send DM to user
        return await interaction.editReply({
          content: '❌ Could not send you a DM. Please enable DMs from server members.',
        });
      }
      
      if (error.message === 'time') {
        return await interaction.editReply({
          content: '⏱️ Authentication timed out.',
        });
      }
      
      throw error;
    }
    
  } catch (error) {
    logger.error('Error in manage command:', error);
    await interaction.editReply({
      content: `❌ An error occurred: ${error.message}`,
    }).catch(() => {});
  }
}

async function showManagementMenu(dmChannel, interaction, userId, sessionToken) {
  try {
    // Get current statistics
    const stats = await getStatistics();
    const botEnabled = await getBotStatus();
    
    const menuEmbed = new EmbedBuilder()
      .setTitle('🛠️ Bot Management Panel')
      .setDescription('Select an action below:')
      .setColor(0x5865F2)
      .addFields(
        { name: 'Bot Status', value: botEnabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
        { name: 'Active Entries', value: stats.activeEntries.toString(), inline: true },
        { name: 'Historical Entries', value: stats.historicalEntries.toString(), inline: true },
        { name: 'Expiring Soon', value: `${stats.expiringSoon} entries`, inline: true }
      )
      .setTimestamp();
    
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('toggle_bot')
          .setLabel(botEnabled ? 'Disable Bot' : 'Enable Bot')
          .setStyle(botEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('view_stats')
          .setLabel('Refresh Stats')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('close_menu')
          .setLabel('Close')
          .setStyle(ButtonStyle.Secondary)
      );
    
    const message = await dmChannel.send({
      embeds: [menuEmbed],
      components: [actionRow],
    });
    
    // Handle button interactions
    const filter = i => i.user.id === userId;
    const collector = message.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes
    
    collector.on('collect', async i => {
      // Verify session is still valid
      if (!verifyAdminSession(userId, sessionToken)) {
        await i.update({
          content: '⏱️ Your session has expired. Please authenticate again.',
          embeds: [],
          components: [],
        });
        collector.stop();
        return;
      }
      
      if (i.customId === 'close_menu') {
        await i.update({
          content: '✅ Management panel closed.',
          embeds: [],
          components: [],
        });
        collector.stop();
        return;
      }
      
      if (i.customId === 'toggle_bot') {
        const currentStatus = await getBotStatus();
        await toggleBotStatus(!currentStatus);
        
        await i.update({
          content: `✅ Bot has been ${!currentStatus ? 'enabled' : 'disabled'}.`,
          embeds: [],
          components: [],
        });
        
        // Show menu again after 2 seconds
        setTimeout(() => showManagementMenu(dmChannel, interaction, userId, sessionToken), 2000);
        collector.stop();
        return;
      }
      
      if (i.customId === 'view_stats') {
        await i.deferUpdate();
        // Refresh and show menu again
        collector.stop();
        await showManagementMenu(dmChannel, interaction, userId, sessionToken);
        return;
      }
    });
    
    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        dmChannel.send('⏱️ Management panel timed out.').catch(() => {});
      }
    });
    
  } catch (error) {
    logger.error('Error showing management menu:', error);
    await dmChannel.send(`❌ Error: ${error.message}`).catch(() => {});
  }
}
