import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

const ROBLOX_API_BASE = 'https://api.roblox.com';
const ROBLOX_USERS_API = 'https://users.roblox.com';
const ROBLOX_THUMBNAILS_API = 'https://thumbnails.roblox.com';

/**
 * Get Roblox user ID from username
 */
export async function getRobloxUserId(username) {
  try {
    const response = await fetch(`${ROBLOX_USERS_API}/v1/usernames/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Roblox API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return {
        id: data.data[0].id,
        name: data.data[0].name,
        displayName: data.data[0].displayName,
      };
    }
    
    return null;
  } catch (error) {
    logger.error(`Error fetching Roblox user ID for ${username}:`, error.message);
    return null;
  }
}

/**
 * Get Roblox user thumbnail URL
 */
export async function getRobloxThumbnail(userId) {
  try {
    const response = await fetch(
      `${ROBLOX_THUMBNAILS_API}/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
    );
    
    if (!response.ok) {
      throw new Error(`Roblox Thumbnails API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data[0].imageUrl;
    }
    
    return null;
  } catch (error) {
    logger.error(`Error fetching Roblox thumbnail for user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get complete Roblox user information
 */
export async function getRobloxUserInfo(username) {
  try {
    const userInfo = await getRobloxUserId(username);
    
    if (!userInfo) {
      return null;
    }
    
    const thumbnailUrl = await getRobloxThumbnail(userInfo.id);
    
    return {
      ...userInfo,
      thumbnailUrl,
    };
  } catch (error) {
    logger.error(`Error fetching Roblox user info for ${username}:`, error.message);
    return null;
  }
}
