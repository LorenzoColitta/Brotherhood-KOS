import crypto from 'crypto';
import { getSupabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';

// In-memory session storage (user_id -> { token, expiresAt })
const sessions = new Map();

/**
 * Hash a password using SHA-256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate a random session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set the admin password (stores hash in database)
 */
export async function setAdminPassword(password) {
  try {
    const supabase = getSupabase();
    const passwordHash = hashPassword(password);
    
    const { error } = await supabase
      .from('bot_config')
      .upsert({
        key: 'admin_password',
        value: passwordHash,
      });
    
    if (error) throw error;
    
    logger.success('Admin password set successfully');
    return true;
  } catch (error) {
    logger.error('Error setting admin password:', error.message);
    return false;
  }
}

/**
 * Verify admin password
 */
export async function verifyAdminPassword(password) {
  try {
    const supabase = getSupabase();
    const passwordHash = hashPassword(password);
    
    const { data, error } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', 'admin_password')
      .single();
    
    if (error) {
      logger.error('Error verifying admin password:', error.message);
      return false;
    }
    
    return data && data.value === passwordHash;
  } catch (error) {
    logger.error('Error verifying admin password:', error.message);
    return false;
  }
}

/**
 * Create an admin session
 */
export function createAdminSession(userId) {
  const token = generateSessionToken();
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  sessions.set(userId, { token, expiresAt });
  
  logger.info(`Admin session created for user ${userId}`);
  return token;
}

/**
 * Verify an admin session
 */
export function verifyAdminSession(userId, token) {
  const session = sessions.get(userId);
  
  if (!session) {
    return false;
  }
  
  // Check if session expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(userId);
    return false;
  }
  
  return session.token === token;
}

/**
 * Invalidate an admin session
 */
export function invalidateAdminSession(userId) {
  sessions.delete(userId);
  logger.info(`Admin session invalidated for user ${userId}`);
}

/**
 * Clean up expired sessions (should be called periodically)
 */
export function cleanupExpiredSessions() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [userId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired admin sessions`);
  }
}
