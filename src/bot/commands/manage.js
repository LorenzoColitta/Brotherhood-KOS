import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import * as adminService from '../../services/admin.service.js';
import * as kosService from '../../services/kos.service.js';

export const data = new SlashCommandBuilder()
  .setName('manage')
  .setDescription('Administrative management commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('setpassword')
      .setDescription('Set the admin password for API access')
      .addStringOption(option =>
        option
          .setName('password')
          .setDescription('New admin password')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('archive-expired')
      .setDescription('Manually archive all expired KOS entries')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('logs')
      .setDescription('View recent system logs')
      .addStringOption(option =>
        option
          .setName('level')
          .setDescription('Filter by log level')
          .setRequired(false)
          .addChoices(
            { name: 'Info', value: 'info' },
            { name: 'Warning', value: 'warn' },
            { name: 'Error', value: 'error' }
          )
      )
      .addIntegerOption(option =>
        option
          .setName('limit')
          .setDescription('Number of logs to show (default: 10, max: 25)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(25)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'setpassword') {
    await handleSetPassword(interaction);
  } else if (subcommand === 'archive-expired') {
    await handleArchiveExpired(interaction);
  } else if (subcommand === 'logs') {
    await handleLogs(interaction);
  }
}

async function handleSetPassword(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const password = interaction.options.getString('password');
  
  try {
    if (password.length < 8) {
      await interaction.editReply({
        content: '❌ Password must be at least 8 characters long.',
      });
      return;
    }
    
    await adminService.setAdminPassword(password);
    
    await interaction.editReply({
      content: '✅ Admin password has been set successfully. This password can be used for API admin endpoints.',
    });
    
  } catch (error) {
    console.error('Error setting admin password:', error);
    
    await interaction.editReply({
      content: `❌ Failed to set admin password. Error: ${error.message}`,
    });
  }
}

async function handleArchiveExpired(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const count = await kosService.archiveExpiredEntries();
    
    if (count === 0) {
      await interaction.editReply({
        content: '✅ No expired entries to archive.',
      });
    } else {
      await interaction.editReply({
        content: `✅ Successfully archived ${count} expired KOS entr${count === 1 ? 'y' : 'ies'}.`,
      });
    }
    
  } catch (error) {
    console.error('Error archiving expired entries:', error);
    
    await interaction.editReply({
      content: `❌ Failed to archive expired entries. Error: ${error.message}`,
    });
  }
}

async function handleLogs(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const level = interaction.options.getString('level');
  const limit = interaction.options.getInteger('limit') || 10;
  
  try {
    const logs = await kosService.getKosLogs({
      level,
      limit,
      skip: 0,
    });
    
    if (logs.length === 0) {
      await interaction.editReply({
        content: '📋 No logs found matching your criteria.',
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`📋 System Logs (${logs.length})`)
      .setTimestamp();
    
    if (level) {
      embed.setDescription(`Filter: ${level}`);
    }
    
    for (let i = 0; i < Math.min(logs.length, 25); i++) {
      const log = logs[i];
      const levelEmoji = log.level === 'error' ? '🔴' : (log.level === 'warn' ? '🟡' : '🟢');
      const userInfo = log.username ? ` by ${log.username}` : '';
      
      embed.addFields({
        name: `${levelEmoji} ${log.action}${userInfo}`,
        value: `${log.message}\n${new Date(log.createdAt).toLocaleString()}`,
        inline: false,
      });
    }
    
    await interaction.editReply({
      embeds: [embed],
    });
    
  } catch (error) {
    console.error('Error fetching logs:', error);
    
    await interaction.editReply({
      content: `❌ Failed to fetch logs. Error: ${error.message}`,
    });
  }
}
