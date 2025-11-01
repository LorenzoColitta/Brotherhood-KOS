import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getKosEntries } from '../../services/kos.service.js';
import { logger } from '../../utils/logger.js';

const ENTRIES_PER_PAGE = 10;

export const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('View the KOS list')
  .addStringOption(option =>
    option.setName('filter')
      .setDescription('Filter entries by username')
      .setRequired(false));

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const filter = interaction.options.getString('filter');
  
  try {
    // Fetch all entries
    const { entries, total } = await getKosEntries(1000);
    
    // Apply filter if provided
    let filteredEntries = entries;
    if (filter) {
      filteredEntries = entries.filter(e => 
        e.roblox_username.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    if (filteredEntries.length === 0) {
      return await interaction.editReply({
        content: filter 
          ? `❌ No KOS entries found matching: **${filter}**`
          : '✅ The KOS list is currently empty.',
      });
    }
    
    // Pagination
    let currentPage = 0;
    const totalPages = Math.ceil(filteredEntries.length / ENTRIES_PER_PAGE);
    
    const getPageEmbed = (page) => {
      const start = page * ENTRIES_PER_PAGE;
      const end = Math.min(start + ENTRIES_PER_PAGE, filteredEntries.length);
      const pageEntries = filteredEntries.slice(start, end);
      
      const embed = new EmbedBuilder()
        .setTitle('📋 KOS List')
        .setDescription(filter ? `Filtered by: **${filter}**` : null)
        .setColor(0xFF6B6B)
        .setFooter({ 
          text: `Page ${page + 1} of ${totalPages} • ${filteredEntries.length} total entries` 
        })
        .setTimestamp();
      
      pageEntries.forEach((entry, index) => {
        const entryNumber = start + index + 1;
        const expiryInfo = entry.expiry_date 
          ? `Expires: <t:${Math.floor(new Date(entry.expiry_date).getTime() / 1000)}:R>`
          : 'Permanent';
        
        embed.addFields({
          name: `${entryNumber}. ${entry.roblox_username}`,
          value: [
            `**Reason:** ${entry.reason}`,
            `**Added by:** ${entry.added_by}`,
            `**Added:** <t:${Math.floor(new Date(entry.created_at).getTime() / 1000)}:R>`,
            `**Status:** ${expiryInfo}`,
          ].join('\n'),
          inline: false,
        });
      });
      
      return embed;
    };
    
    const getButtons = (page) => {
      const row = new ActionRowBuilder();
      
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('first_page')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next_page')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages - 1),
        new ButtonBuilder()
          .setCustomId('last_page')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages - 1)
      );
      
      return row;
    };
    
    // Send initial page
    const message = await interaction.editReply({
      embeds: [getPageEmbed(currentPage)],
      components: totalPages > 1 ? [getButtons(currentPage)] : [],
    });
    
    if (totalPages > 1) {
      // Set up pagination collector
      const filter = i => i.user.id === interaction.user.id;
      const collector = message.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes
      
      collector.on('collect', async i => {
        if (i.customId === 'first_page') {
          currentPage = 0;
        } else if (i.customId === 'prev_page') {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'next_page') {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        } else if (i.customId === 'last_page') {
          currentPage = totalPages - 1;
        }
        
        await i.update({
          embeds: [getPageEmbed(currentPage)],
          components: [getButtons(currentPage)],
        });
      });
      
      collector.on('end', () => {
        interaction.editReply({
          components: [],
        }).catch(() => {});
      });
    }
    
  } catch (error) {
    logger.error('Error in list command:', error);
    await interaction.editReply({
      content: `❌ An error occurred: ${error.message}`,
    }).catch(() => {});
  }
}
