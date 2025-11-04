// url=https://github.com/LorenzoColitta/Brotherhood-KOS/blob/main/src/bot/commands/add.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getRobloxUserInfo } from '../../services/roblox.service.js';
import { addKosEntry } from '../../services/kos.service.js';
import { logger } from '../../utils/logger.js';
import ms from 'ms';
import { randomUUID } from 'crypto';
import { setPending } from '../state/pendingConfirmations.js';

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

        // generate a token and embed it in customId
        const token = randomUUID();

        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_add:${token}`)
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`cancel_add:${token}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Edit the deferred reply to send embed + buttons
        await interaction.editReply({
            content: '',
            embeds: [confirmEmbed],
            components: [confirmRow],
        });

        // fetch the message we just edited (for timeout editing)
        const replyMessage = await interaction.fetchReply().catch(err => {
            logger.warn('add: fetchReply failed', err);
            return null;
        });

        // Save pending data with a timeout that cleans up and edits the message on expire
        const timeoutHandle = setTimeout(async () => {
            try {
                // if still pending, edit message to remove buttons / indicate timeout
                // note: it's ok if fetch/edit fails (message deleted or ephemeral)
                if (replyMessage) {
                    await replyMessage.edit({
                        content: '⏱️ Confirmation timed out. Please try again.',
                        embeds: [],
                        components: []
                    }).catch(() => {});
                }
            } catch (e) {
                // ignore
            } finally {
                // ensure cleanup by key removal (the global handler will also remove on confirm/cancel)
                // removePending(token) will be done by the global handler or expiry; keep minimal here
            }
        }, 60_000);

        // store pending info for token lookup in global handler
        setPending(token, {
            invokerId: interaction.user.id,
            robloxInfo,
            reason,
            expiryDate,
            thumbnailUrl: robloxInfo.thumbnailUrl || null,
            timeoutHandle
        });

        // Reply already sent by editReply (deferred previously), function returns
        return;
    } catch (error) {
        logger.error('Error in add command:', error);
        await interaction.editReply({
            content: `❌ An error occurred: ${error.message}`,
        }).catch(() => {});
    }
}