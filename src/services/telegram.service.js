import fetch from 'node-fetch';
import config from '../config/config.js';

/**
 * Send a notification to Telegram
 * @param {string} message - Message to send
 * @returns {Promise<boolean>} Success status
 */
export async function sendNotification(message) {
  if (!config.telegram.enabled) {
    console.log('Telegram notifications disabled');
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
      const error = await response.text();
      console.error('Telegram API error:', error);
      return false;
    }
    
    console.log('Telegram notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}

/**
 * Send KOS entry added notification
 * @param {Object} entry - KOS entry object
 * @param {string} addedByUsername - Username of the user who added the entry
 */
export async function notifyKosAdded(entry, addedByUsername) {
  const message = `🚨 <b>KOS Entry Added</b>

<b>User:</b> ${entry.robloxUsername} (${entry.robloxId})
<b>Reason:</b> ${entry.reason}
<b>Added by:</b> ${addedByUsername}
${entry.expiresAt ? `<b>Expires:</b> ${new Date(entry.expiresAt).toLocaleString()}` : ''}`;

  return sendNotification(message);
}

/**
 * Send KOS entry removed notification
 * @param {string} robloxUsername - Roblox username
 * @param {string} robloxId - Roblox user ID
 * @param {string} reason - Removal reason
 * @param {string} removedByUsername - Username of the user who removed the entry
 */
export async function notifyKosRemoved(robloxUsername, robloxId, reason, removedByUsername) {
  const message = `✅ <b>KOS Entry Removed</b>

<b>User:</b> ${robloxUsername} (${robloxId})
<b>Reason:</b> ${reason}
<b>Removed by:</b> ${removedByUsername}`;

  return sendNotification(message);
}

export default {
  sendNotification,
  notifyKosAdded,
  notifyKosRemoved,
};
