import fetch from 'node-fetch';

const ROBLOX_USERS_API = 'https://users.roblox.com/v1/users';
const ROBLOX_THUMBNAILS_API = 'https://thumbnails.roblox.com/v1/users/avatar-headshot';

/**
 * Get Roblox user information by user ID
 */
export async function getRobloxUserInfo(userId) {
  try {
    const response = await fetch(`${ROBLOX_USERS_API}/${userId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Roblox user not found');
      }
      throw new Error(`Failed to fetch Roblox user: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Get thumbnail
    const thumbnail = await getRobloxUserThumbnail(userId);

    return {
      id: data.id,
      username: data.name,
      displayName: data.displayName,
      description: data.description,
      created: data.created,
      isBanned: data.isBanned,
      thumbnail,
    };
  } catch (error) {
    console.error(`Error fetching Roblox user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Get Roblox user thumbnail
 */
export async function getRobloxUserThumbnail(userId, size = '150x150') {
  try {
    const response = await fetch(
      `${ROBLOX_THUMBNAILS_API}?userIds=${userId}&size=${size}&format=Png&isCircular=false`
    );
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data[0].imageUrl;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Roblox thumbnail for ${userId}:`, error.message);
    return null;
  }
}

/**
 * Search Roblox users by username
 */
export async function searchRobloxUsers(keyword, limit = 10) {
  try {
    const response = await fetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to search Roblox users: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.data || [];
  } catch (error) {
    console.error('Error searching Roblox users:', error.message);
    throw error;
  }
}

/**
 * Validate Roblox user ID
 */
export async function validateRobloxUserId(userId) {
  try {
    await getRobloxUserInfo(userId);
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  getRobloxUserInfo,
  getRobloxUserThumbnail,
  searchRobloxUsers,
  validateRobloxUserId,
};
