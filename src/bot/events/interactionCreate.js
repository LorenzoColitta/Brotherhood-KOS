import { Events } from 'discord.js';
import { getPending, removePending } from '../state/pendingConfirmations.js';
import { addKosEntry } from '../../services/kos.service.js';
import { logger } from '../../utils/logger.js';
import { logDiscordError } from '../utils/discordLogger.js';

/*
  Global interactionCreate handler.
  Exports name/once/execute to be loaded by src/bot/index.js.
  - Uses flags: 64 for ephemeral responses (discord-api response flags)
  - Uses interaction.update for component (button) flows
  - Uses deferReply/editReply/followUp for chat input command flows (commands should defer/reply as necessary)
*/

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction) {
    try {
        // --- Button / component handling ---
        if (typeof interaction.isButton === 'function' && interaction.isButton()) {
            const customId = interaction.customId || '';
            const [action, token] = customId.split(':');

            if (!token) {
                // Not one of our tokenized buttons
                return;
            }

            const pending = getPending(token);
            if (!pending) {
                await interaction.reply({ content: 'This confirmation has expired or is invalid.', flags: 64 })
                    .catch(err => logDiscordError(logger, 'reply (expired token) failed:', err));
                return;
            }

            // Only invoker may confirm/cancel
            if (interaction.user.id !== pending.invokerId) {
                await interaction.reply({ content: 'Only the user who invoked this command can confirm/cancel it.', flags: 64 })
                    .catch(err => logDiscordError(logger, 'reply (invoker mismatch) failed:', err));
                return;
            }

            // Cancel
            if (action === 'cancel_add') {
                try {
                    await interaction.update({
                        content: '❌ KOS entry cancelled.',
                        embeds: [],
                        components: [],
                    }).catch(err => logDiscordError(logger, 'interaction.update (cancel_add) failed:', err));
                    removePending(token);
                    logger.debug(`add: cancelled token=${token} by ${interaction.user.tag}`);
                } catch (err) {
                    logDiscordError(logger, 'Error while handling cancel_add:', err);
                    try {
                        await interaction.followUp({ content: 'Failed to cancel (internal error).', flags: 64 });
                    } catch (followErr) {
                        logDiscordError(logger, 'followUp after cancel_add failed:', followErr);
                    }
                }
                return;
            }

            // Confirm
            if (action === 'confirm_add') {
                try {
                    // Acknowledge the button by updating the original message
                    await interaction.update({
                        content: '⏳ Adding entry to database...',
                        embeds: [],
                        components: [],
                    }).catch(err => logDiscordError(logger, 'interaction.update (confirm_add) failed:', err));

                    // perform DB add using stored pending payload
                    try {
                        const entry = await addKosEntry({
                            robloxUsername: pending.robloxInfo.name,
                            robloxUserId: pending.robloxInfo.id,
                            reason: pending.reason,
                            addedBy: interaction.user.tag,
                            addedByDiscordId: interaction.user.id,
                            expiryDate: pending.expiryDate,
                            thumbnailUrl: pending.thumbnailUrl,
                        });

                        // Success payload (embed)
                        const successEmbed = {
                            title: '✅ KOS Entry Added',
                            color: 0x4CAF50,
                            thumbnail: { url: pending.thumbnailUrl || undefined },
                            fields: [
                                { name: 'Username', value: pending.robloxInfo.name, inline: true },
                                { name: 'User ID', value: String(pending.robloxInfo.id), inline: true },
                                { name: 'Reason', value: pending.reason, inline: false },
                                {
                                    name: 'Status',
                                    value: pending.expiryDate
                                        ? `Expires <t:${Math.floor(new Date(pending.expiryDate).getTime() / 1000)}:R>`
                                        : 'Permanent',
                                    inline: false,
                                },
                            ],
                            timestamp: new Date().toISOString(),
                        };

                        // For component interactions continue to use interaction.update (not editReply)
                        await interaction.update({ content: '', embeds: [successEmbed], components: [] })
                            .catch(err => logDiscordError(logger, 'interaction.update (confirm success) failed:', err));

                        removePending(token);
                        logger.success(`KOS entry added for ${pending.robloxInfo.name} by ${interaction.user.tag}`);
                    } catch (err) {
                        logDiscordError(logger, 'Error adding KOS entry (confirm handler):', err);
                        await interaction.followUp?.({ content: `❌ Error adding KOS entry: ${err.message}`, flags: 64 })
                            .catch(followErr => logDiscordError(logger, 'followUp after addKosEntry failed:', followErr));
                        removePending(token);
                    }
                } catch (err) {
                    logDiscordError(logger, 'Error while handling confirm_add:', err);
                    try {
                        await interaction.followUp({ content: 'Failed to confirm (internal error).', flags: 64 });
                    } catch (followErr) {
                        logDiscordError(logger, 'followUp after confirm_add failed:', followErr);
                    }
                    removePending(token);
                }
                return;
            }

            // Unknown action — ignore
            return;
        }

        // --- Slash command handling ---
        if (typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand()) {
            const command = interaction.client.commands?.get(interaction.commandName);
            if (!command) {
                logger.warn(`No command handler for ${interaction.commandName}`);
                return;
            }
            try {
                // command.execute should reply or defer within 3s (use deferReply for long tasks)
                await command.execute(interaction);
            } catch (err) {
                logDiscordError(logger, `Error executing command ${interaction.commandName}:`, err);
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: 'Internal error while executing command', flags: 64 });
                    } else {
                        await interaction.followUp({ content: 'Internal error while executing command', flags: 64 });
                    }
                } catch (replyErr) {
                    logDiscordError(logger, 'Failed to send error reply for command error:', replyErr);
                }
            }
        }
    } catch (err) {
        logDiscordError(logger, 'Global interaction handler error:', err);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Internal error', flags: 64 });
            }
        } catch (replyErr) {
            logDiscordError(logger, 'Global handler reply failed:', replyErr);
        }
    }
}