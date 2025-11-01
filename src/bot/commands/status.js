import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getStatistics, getBotStatus } from '../../services/kos.service.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('View bot status and statistics');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Get bot status and statistics
    const botEnabled = await getBotStatus();
    const stats = await getStatistics();
    
    // Calculate uptime
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`;
    
    // Create status embed
    const statusEmbed = new EmbedBuilder()
      .setTitle('🤖 Bot Status')
      .setColor(botEnabled ? 0x4CAF50 : 0xFF6B6B)
      .addFields(
        { 
          name: 'Status', 
          value: botEnabled ? '🟢 Online & Enabled' : '🔴 Disabled', 
          inline: true 
        },
        { 
          name: 'Uptime', 
          value: uptimeString, 
          inline: true 
        },
        { 
          name: 'Database', 
          value: '🟢 Connected', 
          inline: true 
        },
        { 
          name: '\u200B', 
          value: '\u200B', 
          inline: false 
        },
        { 
          name: '📊 Statistics', 
          value: [
            `**Active KOS Entries:** ${stats.activeEntries}`,
            `**Historical Entries:** ${stats.historicalEntries}`,
            `**Expiring Soon:** ${stats.expiringSoon}`,
            `**Total Processed:** ${stats.activeEntries + stats.historicalEntries}`,
          ].join('\n'),
          inline: false 
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Brotherhood KOS System' });
    
    await interaction.editReply({
      embeds: [statusEmbed],
    });
    
  } catch (error) {
    logger.error('Error in status command:', error);
    await interaction.editReply({
      content: `❌ An error occurred: ${error.message}`,
    }).catch(() => {});
  }
}
