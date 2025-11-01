import { KosEntry } from '../database/models/KosEntry.js';
import { KosHistory } from '../database/models/KosHistory.js';
import { KosLog } from '../database/models/KosLog.js';
import * as robloxService from './roblox.service.js';
import * as telegramService from './telegram.service.js';

/**
 * Add a new KOS entry
 * @param {Object} params - Entry parameters
 * @returns {Promise<Object>} Created entry
 */
export async function addKosEntry({
  robloxId,
  robloxUsername,
  reason,
  addedBy,
  addedByUsername,
  expiresAt = null,
  thumbnailUrl = null,
}) {
  try {
    // Check if user already exists
    const existing = await KosEntry.findOne({ robloxId });
    if (existing && existing.isActive) {
      throw new Error('User is already on the KOS list');
    }
    
    // If user was previously archived, update the existing entry
    if (existing && !existing.isActive) {
      existing.isActive = true;
      existing.reason = reason;
      existing.addedBy = addedBy;
      existing.addedByUsername = addedByUsername;
      existing.robloxUsername = robloxUsername;
      existing.thumbnailUrl = thumbnailUrl;
      existing.expiresAt = expiresAt;
      existing.archivedAt = null;
      existing.archivedBy = null;
      existing.archivedReason = null;
      
      await existing.save();
      
      // Log history
      await KosHistory.create({
        robloxId,
        robloxUsername,
        action: 'added',
        reason,
        performedBy: addedBy,
        performedByUsername: addedByUsername,
        metadata: { reactivated: true, expiresAt },
      });
      
      // Log action
      await KosLog.create({
        level: 'info',
        action: 'add_kos',
        message: `KOS entry reactivated for ${robloxUsername}`,
        userId: addedBy,
        username: addedByUsername,
        metadata: { robloxId, reason },
      });
      
      // Send Telegram notification
      await telegramService.notifyKosAdded(existing, addedByUsername);
      
      return existing;
    }
    
    // Create new entry
    const entry = await KosEntry.create({
      robloxId,
      robloxUsername,
      reason,
      addedBy,
      addedByUsername,
      thumbnailUrl,
      expiresAt,
      isActive: true,
    });
    
    // Log history
    await KosHistory.create({
      robloxId,
      robloxUsername,
      action: 'added',
      reason,
      performedBy: addedBy,
      performedByUsername: addedByUsername,
      metadata: { expiresAt },
    });
    
    // Log action
    await KosLog.create({
      level: 'info',
      action: 'add_kos',
      message: `KOS entry created for ${robloxUsername}`,
      userId: addedBy,
      username: addedByUsername,
      metadata: { robloxId, reason },
    });
    
    // Send Telegram notification
    await telegramService.notifyKosAdded(entry, addedByUsername);
    
    return entry;
  } catch (error) {
    // Log error
    await KosLog.create({
      level: 'error',
      action: 'add_kos',
      message: `Failed to add KOS entry: ${error.message}`,
      userId: addedBy,
      username: addedByUsername,
      metadata: { robloxId, error: error.message },
    });
    
    throw error;
  }
}

/**
 * Remove (archive) a KOS entry
 * @param {Object} params - Removal parameters
 * @returns {Promise<Object>} Archived entry
 */
export async function removeKosEntry({
  robloxId,
  reason,
  removedBy,
  removedByUsername,
}) {
  try {
    const entry = await KosEntry.findOne({ robloxId, isActive: true });
    
    if (!entry) {
      throw new Error('Active KOS entry not found');
    }
    
    // Archive the entry
    entry.isActive = false;
    entry.archivedAt = new Date();
    entry.archivedBy = removedBy;
    entry.archivedReason = reason;
    
    await entry.save();
    
    // Log history
    await KosHistory.create({
      robloxId,
      robloxUsername: entry.robloxUsername,
      action: 'removed',
      reason,
      performedBy: removedBy,
      performedByUsername: removedByUsername,
      metadata: {},
    });
    
    // Log action
    await KosLog.create({
      level: 'info',
      action: 'remove_kos',
      message: `KOS entry archived for ${entry.robloxUsername}`,
      userId: removedBy,
      username: removedByUsername,
      metadata: { robloxId, reason },
    });
    
    // Send Telegram notification
    await telegramService.notifyKosRemoved(
      entry.robloxUsername,
      robloxId,
      reason,
      removedByUsername
    );
    
    return entry;
  } catch (error) {
    // Log error
    await KosLog.create({
      level: 'error',
      action: 'remove_kos',
      message: `Failed to remove KOS entry: ${error.message}`,
      userId: removedBy,
      username: removedByUsername,
      metadata: { robloxId, error: error.message },
    });
    
    throw error;
  }
}

/**
 * Find a KOS entry by Roblox ID
 * @param {string} robloxId - Roblox user ID
 * @param {boolean} activeOnly - Only return active entries
 * @returns {Promise<Object|null>} KOS entry or null
 */
export async function findKosEntry(robloxId, activeOnly = true) {
  const query = { robloxId };
  if (activeOnly) {
    query.isActive = true;
  }
  
  return KosEntry.findOne(query);
}

/**
 * List KOS entries with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of entries
 */
export async function listKosEntries({
  isActive = true,
  limit = 100,
  skip = 0,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) {
  const query = {};
  if (isActive !== null) {
    query.isActive = isActive;
  }
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return KosEntry.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();
}

/**
 * Search KOS entries by username
 * @param {string} username - Username to search
 * @param {boolean} activeOnly - Only return active entries
 * @returns {Promise<Array>} List of matching entries
 */
export async function searchKosEntries(username, activeOnly = true) {
  const query = {
    robloxUsername: { $regex: username, $options: 'i' },
  };
  
  if (activeOnly) {
    query.isActive = true;
  }
  
  return KosEntry.find(query).sort({ createdAt: -1 }).lean();
}

/**
 * Get KOS statistics
 * @returns {Promise<Object>} Statistics
 */
export async function getKosStats() {
  const [totalActive, totalArchived, recentAdded] = await Promise.all([
    KosEntry.countDocuments({ isActive: true }),
    KosEntry.countDocuments({ isActive: false }),
    KosEntry.countDocuments({
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);
  
  return {
    totalActive,
    totalArchived,
    total: totalActive + totalArchived,
    recentAdded,
  };
}

/**
 * Archive expired KOS entries
 * @returns {Promise<number>} Number of archived entries
 */
export async function archiveExpiredEntries() {
  try {
    const expiredEntries = await KosEntry.find({
      isActive: true,
      expiresAt: { $ne: null, $lte: new Date() },
    });
    
    let archivedCount = 0;
    
    for (const entry of expiredEntries) {
      entry.isActive = false;
      entry.archivedAt = new Date();
      entry.archivedReason = 'Automatically archived (expired)';
      
      await entry.save();
      
      // Log history
      await KosHistory.create({
        robloxId: entry.robloxId,
        robloxUsername: entry.robloxUsername,
        action: 'archived',
        reason: 'Automatically archived (expired)',
        performedBy: 'system',
        performedByUsername: 'System',
        metadata: { expiresAt: entry.expiresAt },
      });
      
      archivedCount++;
    }
    
    if (archivedCount > 0) {
      await KosLog.create({
        level: 'info',
        action: 'archive_expired',
        message: `Archived ${archivedCount} expired KOS entries`,
        metadata: { count: archivedCount },
      });
    }
    
    return archivedCount;
  } catch (error) {
    await KosLog.create({
      level: 'error',
      action: 'archive_expired',
      message: `Failed to archive expired entries: ${error.message}`,
      metadata: { error: error.message },
    });
    
    throw error;
  }
}

/**
 * Get KOS history for a user
 * @param {string} robloxId - Roblox user ID
 * @param {number} limit - Maximum number of records
 * @returns {Promise<Array>} History records
 */
export async function getKosHistory(robloxId, limit = 50) {
  return KosHistory.find({ robloxId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get recent KOS logs
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Log records
 */
export async function getKosLogs({
  level = null,
  action = null,
  limit = 100,
  skip = 0,
}) {
  const query = {};
  if (level) {
    query.level = level;
  }
  if (action) {
    query.action = action;
  }
  
  return KosLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
}

/**
 * Toggle KOS entry status
 * @param {string} robloxId - Roblox user ID
 * @param {string} performedBy - User ID performing the action
 * @param {string} performedByUsername - Username performing the action
 * @returns {Promise<Object>} Updated entry
 */
export async function toggleKosStatus(robloxId, performedBy, performedByUsername) {
  const entry = await KosEntry.findOne({ robloxId });
  
  if (!entry) {
    throw new Error('KOS entry not found');
  }
  
  entry.isActive = !entry.isActive;
  
  if (!entry.isActive) {
    entry.archivedAt = new Date();
    entry.archivedBy = performedBy;
    entry.archivedReason = 'Status toggled via API';
  } else {
    entry.archivedAt = null;
    entry.archivedBy = null;
    entry.archivedReason = null;
  }
  
  await entry.save();
  
  // Log history
  await KosHistory.create({
    robloxId,
    robloxUsername: entry.robloxUsername,
    action: 'status_changed',
    reason: `Status toggled to ${entry.isActive ? 'active' : 'inactive'}`,
    performedBy,
    performedByUsername,
    metadata: { newStatus: entry.isActive },
  });
  
  return entry;
}

export default {
  addKosEntry,
  removeKosEntry,
  findKosEntry,
  listKosEntries,
  searchKosEntries,
  getKosStats,
  archiveExpiredEntries,
  getKosHistory,
  getKosLogs,
  toggleKosStatus,
};
