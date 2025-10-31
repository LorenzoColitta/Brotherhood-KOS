import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getKosStats, archiveExpiredEntries, getKosLogs } from '../../services/kos.service.js';
import { testTelegramConnection } from '../../services/telegram.service.js';
import { getConnectionStatus } from '../../database/mongo-connection.js';

export const data = new SlashCommandBuilder()
  .setName('manage')
  .setDescription('Management commands for KOS system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription('View KOS statistics')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('archive-expired')
      .setDescription('Manually archive expired KOS entries')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('logs')
      .setDescription('View recent system logs')
      .addStringOption(option =>
        option
          .setName('category')
          .setDescription('Log category filter')
          .setRequired(false)
          .addChoices(
            { name: 'All', value: 'all' },
            { name: 'Bot', value: 'bot' },
            { name: 'API', value: 'api' },
            { name: 'Database', value: 'database' },
            { name: 'Service', value: 'service' },
            { name: 'Command', value: 'command' },
            { name: 'System', value: 'system' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('test-telegram')
      .setDescription('Test Telegram notification integration')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('health')
      .setDescription('Check system health and connections')
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'stats':
        await handleStats(interaction);
        break;
      case 'archive-expired':
        await handleArchiveExpired(interaction);
        break;
      case 'logs':
        await handleLogs(interaction);
        break;
      case 'test-telegram':
        await handleTestTelegram(interaction);
        break;
      case 'health':
        await handleHealth(interaction);
        break;
      default:
        await interaction.editReply({
          content: '❌ Unknown subcommand',
        });
    }
  } catch (error) {
    console.error(`Error in manage ${subcommand}:`, error);
    
    await interaction.editReply({
      content: `❌ Failed to execute command: ${error.message || 'An unknown error occurred'}`,
    });
  }
}

async function handleStats(interaction) {
  const stats = await getKosStats();

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📊 KOS System Statistics')
    .addFields(
      { name: '🟢 Active Entries', value: stats.active.toString(), inline: true },
      { name: '⏰ Permanent', value: stats.permanent.toString(), inline: true },
      { name: '⏳ Expiring', value: stats.expiring.toString(), inline: true },
      { name: '📦 Archived', value: stats.archived.toString(), inline: true },
      { name: '📈 Total All-Time', value: stats.total.toString(), inline: true },
      { name: '📅 As of', value: new Date().toLocaleString(), inline: true }
    )
    .setFooter({ text: 'Brotherhood KOS System' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleArchiveExpired(interaction) {
  const count = await archiveExpiredEntries();

  const embed = new EmbedBuilder()
    .setColor(count > 0 ? 0x00FF00 : 0x0099FF)
    .setTitle('🗄️ Archive Expired Entries')
    .setDescription(
      count > 0
        ? `✅ Successfully archived ${count} expired KOS entr${count === 1 ? 'y' : 'ies'}.`
        : '✅ No expired entries found to archive.'
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleLogs(interaction) {
  const category = interaction.options.getString('category') ?? 'all';
  const categoryFilter = category === 'all' ? null : category;
  
  const logs = await getKosLogs(20, categoryFilter);

  if (logs.length === 0) {
    return await interaction.editReply({
      content: `📋 No logs found for category: **${category}**`,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`📋 System Logs - ${category.charAt(0).toUpperCase() + category.slice(1)}`)
    .setDescription(`Showing the 20 most recent logs`)
    .setFooter({ text: 'Brotherhood KOS System' })
    .setTimestamp();

  logs.slice(0, 10).forEach(log => {
    const levelEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      debug: '🐛',
    }[log.level] || 'ℹ️';

    embed.addFields({
      name: `${levelEmoji} ${log.category} - ${new Date(log.createdAt).toLocaleString()}`,
      value: log.message.substring(0, 200),
      inline: false,
    });
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleTestTelegram(interaction) {
  const result = await testTelegramConnection();

  const embed = new EmbedBuilder()
    .setColor(result.success ? 0x00FF00 : 0xFF0000)
    .setTitle(result.success ? '✅ Telegram Test Successful' : '❌ Telegram Test Failed')
    .setDescription(result.message)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleHealth(interaction) {
  const dbConnected = getConnectionStatus();
  
  const embed = new EmbedBuilder()
    .setColor(dbConnected ? 0x00FF00 : 0xFF0000)
    .setTitle('🏥 System Health Check')
    .addFields(
      { 
        name: 'Database Connection', 
        value: dbConnected ? '✅ Connected' : '❌ Disconnected', 
        inline: true 
      },
      { 
        name: 'Discord Bot', 
        value: '✅ Online', 
        inline: true 
      },
      {
        name: 'Telegram Integration',
        value: interaction.client.config?.telegram?.enabled ? '✅ Enabled' : '⚠️ Not Configured',
        inline: true
      },
      {
        name: 'Uptime',
        value: formatUptime(process.uptime()),
        inline: true
      },
      {
        name: 'Memory Usage',
        value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        inline: true
      },
      {
        name: 'Node Version',
        value: process.version,
        inline: true
      }
    )
    .setFooter({ text: 'Brotherhood KOS System' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '< 1m';
}

export default { data, execute };
