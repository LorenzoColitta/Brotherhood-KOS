import fetch from 'node-fetch';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Send a notification to Telegram (best-effort)
 */
export async function sendTelegramNotification(message) {
  // Check if Telegram is configured
  if (!config.telegram.botToken || !config.telegram.chatId) {
    logger.debug('Telegram not configured, skipping notification');
    return false;
  }
  
  try {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.telegram.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.warn('Telegram notification failed:', errorData.description || response.statusText);
      return false;
    }
    
    logger.debug('Telegram notification sent successfully');
    return true;
  } catch (error) {
    logger.warn('Failed to send Telegram notification:', error.message);
    return false;
  }
}

/**
 * Format and send KOS entry added notification
 */
export async function notifyKosAdded(entry) {
  const message = `
🚨 <b>New KOS Entry Added</b>

<b>Username:</b> ${entry.roblox_username}
<b>Reason:</b> ${entry.reason}
<b>Added by:</b> ${entry.added_by}
${entry.expiry_date ? `<b>Expires:</b> ${new Date(entry.expiry_date).toLocaleString()}` : '<b>Permanent Entry</b>'}
  `.trim();
  
  return sendTelegramNotification(message);
}

/**
 * Format and send KOS entry removed notification
 */
export async function notifyKosRemoved(entry, removedBy) {
  const message = `
✅ <b>KOS Entry Removed</b>

<b>Username:</b> ${entry.roblox_username}
<b>Removed by:</b> ${removedBy}
<b>Original reason:</b> ${entry.reason}
  `.trim();
  
  return sendTelegramNotification(message);
}
