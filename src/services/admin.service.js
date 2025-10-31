import crypto from 'crypto';
import { BotConfig } from '../database/models/BotConfig.js';

// In-memory sessions for admin authentication
const adminSessions = new Map();

/**
 * Hash a password using SHA-256
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Set admin password in database
 * @param {string} password - Plain text password
 */
export async function setAdminPassword(password) {
  const hashedPassword = hashPassword(password);
  
  await BotConfig.findOneAndUpdate(
    { key: 'admin_password' },
    { value: hashedPassword },
    { upsert: true, new: true }
  );
  
  console.log('Admin password set successfully');
}

/**
 * Verify admin password
 * @param {string} password - Plain text password to verify
 * @returns {Promise<boolean>} True if password is correct
 */
export async function verifyAdminPassword(password) {
  const hashedPassword = hashPassword(password);
  
  const config = await BotConfig.findOne({ key: 'admin_password' });
  
  if (!config) {
    return false;
  }
  
  return config.value === hashedPassword;
}

/**
 * Check if admin password is set
 * @returns {Promise<boolean>} True if password is set
 */
export async function isAdminPasswordSet() {
  const config = await BotConfig.findOne({ key: 'admin_password' });
  return !!config;
}

/**
 * Create an admin session
 * @param {string} userId - Discord user ID
 * @returns {string} Session ID
 */
export function createAdminSession(userId) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  adminSessions.set(sessionId, {
    userId,
    createdAt: Date.now(),
  });
  
  // Clean up old sessions (older than 1 hour)
  for (const [id, session] of adminSessions.entries()) {
    if (Date.now() - session.createdAt > 3600000) {
      adminSessions.delete(id);
    }
  }
  
  return sessionId;
}

/**
 * Verify an admin session
 * @param {string} sessionId - Session ID
 * @param {string} userId - Discord user ID
 * @returns {boolean} True if session is valid
 */
export function verifyAdminSession(sessionId, userId) {
  const session = adminSessions.get(sessionId);
  
  if (!session) {
    return false;
  }
  
  // Check if session is expired (1 hour)
  if (Date.now() - session.createdAt > 3600000) {
    adminSessions.delete(sessionId);
    return false;
  }
  
  return session.userId === userId;
}

/**
 * Delete an admin session
 * @param {string} sessionId - Session ID
 */
export function deleteAdminSession(sessionId) {
  adminSessions.delete(sessionId);
}

export default {
  setAdminPassword,
  verifyAdminPassword,
  isAdminPasswordSet,
  createAdminSession,
  verifyAdminSession,
  deleteAdminSession,
};
