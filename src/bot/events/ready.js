import { Events } from 'discord.js';
import { logger } from '../../utils/logger.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  logger.success(`Ready! Logged in as ${client.user.tag}`);
  logger.info(`Bot is in ${client.guilds.cache.size} guilds`);
  
  // Set bot status
  client.user.setPresence({
    activities: [{ name: 'KOS Management', type: 3 }], // Type 3 = Watching
    status: 'online',
  });
  
  logger.info('Bot is ready to receive commands');
}
