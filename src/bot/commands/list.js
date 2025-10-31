import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import * as kosService from '../../services/kos.service.js';

export const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List KOS entries')
  .addStringOption(option =>
    option
      .setName('filter')
      .setDescription('Filter entries')
      .setRequired(false)
      .addChoices(
        { name: 'Active Only', value: 'active' },
        { name: 'Archived Only', value: 'archived' },
        { name: 'All Entries', value: 'all' }
      )
  )
  .addStringOption(option =>
    option
      .setName('search')
      .setDescription('Search by username')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('limit')
      .setDescription('Number of entries to show (default: 10, max: 25)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(25)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const filter = interaction.options.getString('filter') || 'active';
  const search = interaction.options.getString('search');
  const limit = interaction.options.getInteger('limit') || 10;
  
  try {
    let entries;
    
    // Search or list
    if (search) {
      const isActive = filter === 'archived' ? false : (filter === 'all' ? null : true);
      entries = await kosService.searchKosEntries(search, isActive !== null ? isActive : true);
      entries = entries.slice(0, limit);
    } else {
      const isActive = filter === 'archived' ? false : (filter === 'all' ? null : true);
      entries = await kosService.listKosEntries({
        isActive,
        limit,
        skip: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    }
    
    if (entries.length === 0) {
      await interaction.editReply({
        content: '📋 No entries found matching your criteria.',
      });
      return;
    }
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`📋 KOS Entries (${entries.length})`)
      .setDescription(search ? `Search results for: "${search}"` : `Filter: ${filter}`)
      .setTimestamp();
    
    // Add entries as fields (max 25 fields)
    for (let i = 0; i < Math.min(entries.length, 25); i++) {
      const entry = entries[i];
      const status = entry.isActive ? '🟢 Active' : '🔴 Archived';
      const expiryInfo = entry.expiresAt 
        ? `\nExpires: ${new Date(entry.expiresAt).toLocaleDateString()}` 
        : '';
      
      embed.addFields({
        name: `${i + 1}. ${entry.robloxUsername} (${entry.robloxId})`,
        value: `${status}\nReason: ${entry.reason}\nAdded: ${new Date(entry.createdAt).toLocaleDateString()}${expiryInfo}`,
        inline: false,
      });
    }
    
    if (entries.length > 25) {
      embed.setFooter({ text: `Showing first 25 of ${entries.length} entries` });
    }
    
    await interaction.editReply({
      embeds: [embed],
    });
    
  } catch (error) {
    console.error('Error listing KOS entries:', error);
    
    await interaction.editReply({
      content: `❌ Failed to list KOS entries. Error: ${error.message}`,
    });
  }
}
