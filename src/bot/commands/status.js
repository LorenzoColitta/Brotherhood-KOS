import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import * as kosService from '../../services/kos.service.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('View KOS system statistics and status');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    // Get statistics
    const stats = await kosService.getKosStats();
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('📊 KOS System Status')
      .addFields(
        { name: 'Active Entries', value: stats.totalActive.toString(), inline: true },
        { name: 'Archived Entries', value: stats.totalArchived.toString(), inline: true },
        { name: 'Total Entries', value: stats.total.toString(), inline: true },
        { name: 'Added Last 7 Days', value: stats.recentAdded.toString(), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Brotherhood KOS System' });
    
    await interaction.editReply({
      embeds: [embed],
    });
    
  } catch (error) {
    console.error('Error fetching KOS status:', error);
    
    await interaction.editReply({
      content: `❌ Failed to fetch KOS status. Error: ${error.message}`,
    });
  }
}
