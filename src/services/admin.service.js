import crypto from 'crypto';
import BotConfig from '../database/models/BotConfig.js';

// In-memory session storage
const sessions = new Map();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Hash a password using SHA-256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Set admin password (hashed)
 */
export async function setAdminPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const hashedPassword = hashPassword(password);
  
  await BotConfig.setValue('admin_password', hashedPassword, 'Hashed admin password');
  
  return true;
}

/**
 * Verify admin password
 */
export async function verifyAdminPassword(password) {
  const storedHash = await BotConfig.getValue('admin_password');
  
  if (!storedHash) {
    throw new Error('Admin password not set. Please run set-admin-password script.');
  }

  const hashedPassword = hashPassword(password);
  
  return hashedPassword === storedHash;
}

/**
 * Create a session token
 */
export function createSessionToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_DURATION;
  
  sessions.set(token, {
    userId,
    expiresAt,
  });

  // Clean up expired sessions
  cleanupExpiredSessions();
  
  return {
    token,
    expiresAt: new Date(expiresAt),
  };
}

/**
 * Verify a session token
 */
export function verifySessionToken(token) {
  const session = sessions.get(token);
  
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Invalidate a session token
 */
export function invalidateSessionToken(token) {
  return sessions.delete(token);
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}

/**
 * Get all active sessions (for admin purposes)
 */
export function getActiveSessions() {
  cleanupExpiredSessions();
  return Array.from(sessions.entries()).map(([token, session]) => ({
    token,
    userId: session.userId,
    expiresAt: new Date(session.expiresAt),
  }));
}

// Cleanup expired sessions every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

export default {
  setAdminPassword,
  verifyAdminPassword,
  createSessionToken,
  verifySessionToken,
  invalidateSessionToken,
  getActiveSessions,
};
