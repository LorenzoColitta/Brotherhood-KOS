// url=https://github.com/LorenzoColitta/Brotherhood-KOS/blob/main/src/bot/events/interactionCreate.js
import { Events } from 'discord.js';
import { getPending, removePending } from '../state/pendingConfirmations.js';
import { addKosEntry } from '../../services/kos.service.js';
import { logger } from '../../utils/logger.js';

/*
This module registers a global interactionCreate listener.
If your bot already registers a listener in another file, merge the button-handling portion
(the interaction.isButton() block) into your existing listener.
*/

export default function registerInteractionHandler(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
        try {
            // --- Button handling (global) ---
            if (interaction.isButton()) {
                const customId = interaction.customId || '';
                const [action, token] = customId.split(':');

                if (!token) {
                    // Not one of our tokenized buttons; ignore or handle other buttons
                    return;
                }

                const pending = getPending(token);
                if (!pending) {
                    // expired or invalid token
                    await interaction.reply({ content: 'This confirmation has expired or is invalid.', ephemeral: true }).catch(()=>{});
                    return;
                }

                // Only the user who invoked the command may confirm/cancel
                if (interaction.user.id !== pending.invokerId) {
                    await interaction.reply({ content: 'Only the user who invoked this command can confirm/cancel it.', ephemeral: true }).catch(()=>{});
                    return;
                }

                // Cancel action
                if (action === 'cancel_add') {
                    try {
                        await interaction.update({
                            content: '❌ KOS entry cancelled.',
                            embeds: [],
                            components: [],
                        }).catch(()=>{});
                        removePending(token);
                        logger.debug(`add: cancelled token=${token} by ${interaction.user.tag}`);
                    } catch (err) {
                        logger.error('Error while handling cancel_add:', err);
                        try { await interaction.followUp({ content: 'Failed to cancel (internal error).', ephemeral: true }); } catch {}
                    }
                    return;
                }

                // Confirm action
                if (action === 'confirm_add') {
                    try {
                        await interaction.update({
                            content: '⏳ Adding entry to database...',
                            embeds: [],
                            components: [],
                        }).catch(()=>{});

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

                            // Success embed
                            const successEmbed = {
                                title: '✅ KOS Entry Added',
                                color: 0x4CAF50,
                                thumbnail: { url: pending.thumbnailUrl || undefined },
                                fields: [
                                    { name: 'Username', value: pending.robloxInfo.name, inline: true },
                                    { name: 'User ID', value: String(pending.robloxInfo.id), inline: true },
                                    { name: 'Reason', value: pending.reason, inline: false },
                                    { name: 'Status', value: pending.expiryDate ? `Expires <t:${Math.floor(new Date(pending.expiryDate).getTime() / 1000)}:R>` : 'Permanent', inline: false }
                                ],
                                timestamp: new Date().toISOString()
                            };

                            await interaction.editReply?.({ content: '', embeds: [successEmbed], components: [] }).catch(()=>{});
                            removePending(token);
                            logger.success(`KOS entry added for ${pending.robloxInfo.name} by ${interaction.user.tag}`);
                        } catch (err) {
                            logger.error('Error adding KOS entry (confirm handler):', err);
                            await interaction.followUp?.({ content: `❌ Error adding KOS entry: ${err.message}`, ephemeral: true }).catch(()=>{});
                            removePending(token);
                        }
                    } catch (err) {
                        logger.error('Error while handling confirm_add:', err);
                        try { await interaction.followUp({ content: 'Failed to confirm (internal error).', ephemeral: true }); } catch {}
                        removePending(token);
                    }
                    return;
                }

                // Unknown action: ignore
                return;
            }

            // --- Slash command handling (keep your existing logic) ---
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands?.get(interaction.commandName);
                if (!command) {
                    logger.warn(`No command handler for ${interaction.commandName}`);
                    return;
                }
                try {
                    await command.execute(interaction);
                } catch (err) {
                    logger.error(`Error executing command ${interaction.commandName}:`, err);
                    try {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: 'Internal error while executing command', ephemeral: true });
                        } else {
                            await interaction.followUp({ content: 'Internal error while executing command', ephemeral: true });
                        }
                    } catch (replyErr) {
                        logger.error('Failed to send error reply for command error:', replyErr);
                    }
                }
            }
        } catch (err) {
            logger.error('Global interaction handler error:', err);
            try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Internal error', ephemeral: true }); } catch {}
        }
    });
}