import { Events } from 'discord.js';
import { archiveExpiredEntries } from '../../services/kos.service.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
  
  // Set bot status
  client.user.setPresence({
    activities: [{ name: 'KOS System | /help' }],
    status: 'online',
  });

  // Schedule periodic archival of expired entries (every hour)
  const ARCHIVE_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  async function scheduleArchival() {
    try {
      const count = await archiveExpiredEntries();
      if (count > 0) {
        console.log(`✅ Archived ${count} expired KOS entries`);
      }
    } catch (error) {
      console.error('Error archiving expired entries:', error);
    }
  }

  // Run immediately on startup
  scheduleArchival();
  
  // Then run periodically
  setInterval(scheduleArchival, ARCHIVE_INTERVAL);
  
  console.log('✅ Bot is ready and scheduled tasks are running');
}

export default { name, once, execute };
