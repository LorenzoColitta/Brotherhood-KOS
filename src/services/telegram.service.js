import fetch from 'node-fetch';
import config from '../config/config.js';

/**
 * Send a Telegram notification
 */
export async function sendTelegramNotification(message) {
  // Skip if Telegram is not configured
  if (!config.telegram.enabled) {
    return null;
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
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send Telegram notification:', error);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Non-blocking - just log the error
    console.error('Error sending Telegram notification:', error.message);
    return null;
  }
}

/**
 * Send a formatted KOS notification
 */
export async function sendKosNotification(type, entry, performedBy, additionalInfo = '') {
  let message = '';
  
  switch (type) {
    case 'added':
      message = `🚨 *KOS ENTRY ADDED*\n\n`;
      message += `User: ${entry.robloxUsername} (${entry.robloxUserId})\n`;
      message += `Reason: ${entry.reason}\n`;
      message += `Added by: ${performedBy.discordUsername}\n`;
      message += entry.isPermanent 
        ? `⏰ Permanent` 
        : `⏰ Expires: ${entry.expiresAt ? new Date(entry.expiresAt).toLocaleString() : 'Never'}`;
      break;
      
    case 'removed':
      message = `✅ *KOS ENTRY REMOVED*\n\n`;
      message += `User: ${entry.robloxUsername} (${entry.robloxUserId})\n`;
      message += `Removed by: ${performedBy.discordUsername}`;
      break;
      
    case 'expired':
      message = `⏰ *KOS ENTRY EXPIRED*\n\n`;
      message += `User: ${entry.robloxUsername} (${entry.robloxUserId})\n`;
      message += `Automatically archived`;
      break;
      
    default:
      message = additionalInfo;
  }

  if (additionalInfo && type !== 'default') {
    message += `\n\n${additionalInfo}`;
  }

  return await sendTelegramNotification(message);
}

/**
 * Test Telegram configuration
 */
export async function testTelegramConnection() {
  if (!config.telegram.enabled) {
    return {
      success: false,
      message: 'Telegram is not configured',
    };
  }

  try {
    const result = await sendTelegramNotification('🔧 *Test Message*\n\nTelegram connection is working!');
    
    return {
      success: !!result,
      message: result ? 'Telegram connection successful' : 'Failed to send test message',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

export default {
  sendTelegramNotification,
  sendKosNotification,
  testTelegramConnection,
};
