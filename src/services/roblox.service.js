import fetch from 'node-fetch';

/**
 * Fetch Roblox user information by user ID
 * @param {string} userId - Roblox user ID
 * @returns {Promise<{id: string, name: string, displayName: string}>}
 */
export async function getRobloxUser(userId) {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Roblox user not found');
      }
      throw new Error(`Roblox API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      id: data.id.toString(),
      name: data.name,
      displayName: data.displayName,
    };
  } catch (error) {
    console.error('Error fetching Roblox user:', error);
    throw error;
  }
}

/**
 * Fetch Roblox user thumbnail URL
 * @param {string} userId - Roblox user ID
 * @returns {Promise<string|null>} Thumbnail URL or null
 */
export async function getRobloxThumbnail(userId) {
  try {
    const response = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`
    );
    
    if (!response.ok) {
      console.warn(`Failed to fetch thumbnail for user ${userId}`);
      return null;
    }
    
    const data = await response.json();
    if (data.data && data.data.length > 0 && data.data[0].imageUrl) {
      return data.data[0].imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Roblox thumbnail:', error);
    return null;
  }
}

/**
 * Fetch Roblox user with thumbnail
 * @param {string} userId - Roblox user ID
 * @returns {Promise<{id: string, name: string, displayName: string, thumbnailUrl: string|null}>}
 */
export async function getRobloxUserWithThumbnail(userId) {
  const user = await getRobloxUser(userId);
  const thumbnailUrl = await getRobloxThumbnail(userId);
  
  return {
    ...user,
    thumbnailUrl,
  };
}

export default {
  getRobloxUser,
  getRobloxThumbnail,
  getRobloxUserWithThumbnail,
};
