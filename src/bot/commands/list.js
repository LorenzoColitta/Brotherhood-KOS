import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { listKosEntries } from '../../services/kos.service.js';

export const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List KOS entries with filters')
  .addStringOption(option =>
    option
      .setName('filter')
      .setDescription('Filter type')
      .setRequired(false)
      .addChoices(
        { name: 'Active', value: 'active' },
        { name: 'Expiring Soon (7 days)', value: 'expiring' },
        { name: 'Permanent', value: 'permanent' },
        { name: 'Archived', value: 'archived' }
      )
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const filter = interaction.options.getString('filter') ?? 'active';
  const limit = 10; // Items per page

  try {
    // Get first page
    const result = await listKosEntries({
      filter,
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    if (result.entries.length === 0) {
      return await interaction.editReply({
        content: `📋 No KOS entries found for filter: **${filter}**`,
      });
    }

    // Create embed with entries
    const embed = createListEmbed(result, filter, 1);
    
    // Create pagination buttons if needed
    const components = [];
    if (result.pagination.totalPages > 1) {
      components.push(createPaginationRow(1, result.pagination.totalPages, filter));
    }

    await interaction.editReply({
      embeds: [embed],
      components,
    });

  } catch (error) {
    console.error('Error in list command:', error);
    
    await interaction.editReply({
      content: `❌ Failed to list KOS entries: ${error.message || 'An unknown error occurred'}`,
    });
  }
}

function createListEmbed(result, filter, page) {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`📋 KOS List - ${filter.charAt(0).toUpperCase() + filter.slice(1)}`)
    .setDescription(`Showing page ${page} of ${result.pagination.totalPages} (${result.pagination.total} total entries)`)
    .setFooter({ text: 'Brotherhood KOS System' })
    .setTimestamp();

  result.entries.forEach((entry, index) => {
    const number = (page - 1) * 10 + index + 1;
    let expirationInfo = '⏰ Permanent';
    
    if (!entry.isPermanent && entry.expiresAt) {
      const daysUntilExpiry = Math.ceil((new Date(entry.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
      expirationInfo = daysUntilExpiry > 0 
        ? `⏰ ${daysUntilExpiry}d left` 
        : `⏰ Expired`;
    }

    embed.addFields({
      name: `${number}. ${entry.robloxUsername}`,
      value: `**ID:** ${entry.robloxUserId}\n**Reason:** ${entry.reason.substring(0, 100)}${entry.reason.length > 100 ? '...' : ''}\n**Added:** ${new Date(entry.createdAt).toLocaleDateString()} | ${expirationInfo}`,
      inline: false,
    });
  });

  return embed;
}

function createPaginationRow(currentPage, totalPages, filter) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`list_first_${filter}`)
        .setLabel('⏮️ First')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId(`list_prev_${filter}_${currentPage}`)
        .setLabel('◀️ Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('list_page_info')
        .setLabel(`Page ${currentPage}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`list_next_${filter}_${currentPage}`)
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages),
      new ButtonBuilder()
        .setCustomId(`list_last_${filter}_${totalPages}`)
        .setLabel('Last ⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages)
    );
}

export async function handleButton(interaction) {
  const [, action, filter, ...pageArgs] = interaction.customId.split('_');
  
  let page = 1;
  const limit = 10;

  if (action === 'first') {
    page = 1;
  } else if (action === 'last') {
    page = parseInt(pageArgs[0]);
  } else if (action === 'prev') {
    page = Math.max(1, parseInt(pageArgs[0]) - 1);
  } else if (action === 'next') {
    page = parseInt(pageArgs[0]) + 1;
  }

  await interaction.deferUpdate();

  try {
    const result = await listKosEntries({
      filter,
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const embed = createListEmbed(result, filter, page);
    const components = [];
    
    if (result.pagination.totalPages > 1) {
      components.push(createPaginationRow(page, result.pagination.totalPages, filter));
    }

    await interaction.editReply({
      embeds: [embed],
      components,
    });
  } catch (error) {
    console.error('Error in list pagination:', error);
    
    await interaction.editReply({
      content: `❌ Failed to load page: ${error.message}`,
      embeds: [],
      components: [],
    });
  }
}

export default { data, execute, handleButton };
