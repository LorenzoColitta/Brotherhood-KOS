import { getSupabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Generate a random authentication code
 */
export function generateAuthCode() {
  // Generate a 8-character alphanumeric code
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Create a new API authentication code
 * @param {string} discordUserId - Discord user ID
 * @param {string} discordUsername - Discord username
 * @param {number} expiresInMinutes - Expiration time in minutes (default 60)
 * @returns {Promise<{code: string, expiresAt: string}>}
 */
export async function createApiAuthCode(discordUserId, discordUsername, expiresInMinutes = 60) {
  try {
    const supabase = getSupabase();
    const code = generateAuthCode();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('api_auth_codes')
      .insert({
        code,
        discord_user_id: discordUserId,
        discord_username: discordUsername,
        expires_at: expiresAt,
        is_used: false,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    logger.success(`API auth code created for ${discordUsername}`);
    return { code, expiresAt };
  } catch (error) {
    logger.error('Error creating API auth code:', error.message);
    throw error;
  }
}

/**
 * Verify and use an authentication code
 * @param {string} code - The authentication code
 * @returns {Promise<{valid: boolean, userId?: string, username?: string}>}
 */
export async function verifyAuthCode(code) {
  try {
    const supabase = getSupabase();
    
    // Find the code
    const { data, error } = await supabase
      .from('api_auth_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_used', false)
      .single();
    
    if (error || !data) {
      return { valid: false };
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (now > expiresAt) {
      return { valid: false };
    }
    
    // Mark as used
    const { error: updateError } = await supabase
      .from('api_auth_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', data.id);
    
    if (updateError) throw updateError;
    
    logger.success(`API auth code verified for ${data.discord_username}`);
    return {
      valid: true,
      userId: data.discord_user_id,
      username: data.discord_username,
    };
  } catch (error) {
    logger.error('Error verifying API auth code:', error.message);
    return { valid: false };
  }
}

/**
 * Create API session token
 * @param {string} discordUserId - Discord user ID
 * @param {string} discordUsername - Discord username
 * @param {number} expiresInHours - Expiration time in hours (default 24)
 * @returns {Promise<{token: string, expiresAt: string}>}
 */
export async function createApiSession(discordUserId, discordUsername, expiresInHours = 24) {
  try {
    const supabase = getSupabase();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('api_sessions')
      .insert({
        token,
        discord_user_id: discordUserId,
        discord_username: discordUsername,
        expires_at: expiresAt,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    logger.success(`API session created for ${discordUsername}`);
    return { token, expiresAt };
  } catch (error) {
    logger.error('Error creating API session:', error.message);
    throw error;
  }
}

/**
 * Verify API session token
 * @param {string} token - The session token
 * @returns {Promise<{valid: boolean, userId?: string, username?: string}>}
 */
export async function verifyApiSession(token) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('api_sessions')
      .select('*')
      .eq('token', token)
      .single();
    
    if (error || !data) {
      return { valid: false };
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (now > expiresAt) {
      return { valid: false };
    }
    
    // Update last used (best-effort, don't fail if this fails)
    try {
      await supabase
        .from('api_sessions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);
    } catch (updateError) {
      logger.warn('Failed to update last_used_at:', updateError.message);
    }
    
    return {
      valid: true,
      userId: data.discord_user_id,
      username: data.discord_username,
    };
  } catch (error) {
    logger.error('Error verifying API session:', error.message);
    return { valid: false };
  }
}

/**
 * Revoke API session token
 * @param {string} token - The session token
 * @returns {Promise<boolean>}
 */
export async function revokeApiSession(token) {
  try {
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('api_sessions')
      .delete()
      .eq('token', token);
    
    if (error) throw error;
    
    logger.success('API session revoked');
    return true;
  } catch (error) {
    logger.error('Error revoking API session:', error.message);
    return false;
  }
}

/**
 * Clean up expired codes and sessions
 * @returns {Promise<{expiredCodes: number, expiredSessions: number}>}
 */
export async function cleanupExpired() {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    
    // Delete expired codes
    const { error: codesError, count: expiredCodes } = await supabase
      .from('api_auth_codes')
      .delete()
      .lt('expires_at', now);
    
    if (codesError) throw codesError;
    
    // Delete expired sessions
    const { error: sessionsError, count: expiredSessions } = await supabase
      .from('api_sessions')
      .delete()
      .lt('expires_at', now);
    
    if (sessionsError) throw sessionsError;
    
    if (expiredCodes > 0 || expiredSessions > 0) {
      logger.info(`Cleaned up ${expiredCodes || 0} expired codes and ${expiredSessions || 0} expired sessions`);
    }
    
    return { expiredCodes: expiredCodes || 0, expiredSessions: expiredSessions || 0 };
  } catch (error) {
    logger.error('Error cleaning up expired auth data:', error.message);
    return { expiredCodes: 0, expiredSessions: 0 };
  }
}
