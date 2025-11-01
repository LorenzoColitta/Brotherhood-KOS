import { Events } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
  
  // Set bot status
  client.user.setActivity('KOS System', { type: 'WATCHING' });
}
