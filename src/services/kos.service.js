import KosEntry from '../database/models/KosEntry.js';
import KosHistory from '../database/models/KosHistory.js';
import KosLog from '../database/models/KosLog.js';
import { getRobloxUserInfo } from './roblox.service.js';
import { sendTelegramNotification } from './telegram.service.js';

/**
 * Add a new KOS entry
 */
export async function addKosEntry({
  robloxUserId,
  reason,
  addedBy,
  expiresAt = null,
  isPermanent = false,
}) {
  try {
    // Check if user is already on KOS
    const existing = await KosEntry.findOne({
      robloxUserId,
      status: 'active',
    });

    if (existing) {
      throw new Error('User is already on the KOS list');
    }

    // Get Roblox user info
    const robloxInfo = await getRobloxUserInfo(robloxUserId);

    // Create KOS entry
    const entry = await KosEntry.create({
      robloxUserId,
      robloxUsername: robloxInfo.username,
      reason,
      addedBy,
      expiresAt: isPermanent ? null : expiresAt,
      isPermanent,
      thumbnailUrl: robloxInfo.thumbnail,
      status: 'active',
    });

    // Create history record
    await KosHistory.create({
      entryId: entry._id,
      robloxUserId,
      robloxUsername: robloxInfo.username,
      action: 'added',
      reason,
      performedBy: addedBy,
    });

    // Log the action
    await KosLog.log('info', 'service', `KOS entry added for ${robloxInfo.username}`, {
      robloxUserId,
      addedBy: addedBy.discordUsername,
    });

    // Send Telegram notification
    await sendTelegramNotification(
      `🚨 *KOS ENTRY ADDED*\n\n` +
      `User: ${robloxInfo.username} (${robloxUserId})\n` +
      `Reason: ${reason}\n` +
      `Added by: ${addedBy.discordUsername}\n` +
      `${isPermanent ? '⏰ Permanent' : `⏰ Expires: ${expiresAt ? new Date(expiresAt).toLocaleString() : 'Never'}`}`
    );

    return entry;
  } catch (error) {
    await KosLog.log('error', 'service', 'Failed to add KOS entry', {
      error: error.message,
      robloxUserId,
    });
    throw error;
  }
}

/**
 * Find KOS entry by Roblox user ID
 */
export async function findKosEntry(robloxUserId) {
  return await KosEntry.findOne({
    robloxUserId,
    status: 'active',
  });
}

/**
 * Remove (archive) a KOS entry
 */
export async function removeKosEntry(robloxUserId, removedBy, reason = 'Removed from KOS') {
  try {
    const entry = await KosEntry.findOne({
      robloxUserId,
      status: 'active',
    });

    if (!entry) {
      throw new Error('User is not on the KOS list');
    }

    // Archive the entry
    entry.status = 'archived';
    await entry.save();

    // Create history record
    await KosHistory.create({
      entryId: entry._id,
      robloxUserId,
      robloxUsername: entry.robloxUsername,
      action: 'removed',
      reason,
      performedBy: removedBy,
    });

    // Log the action
    await KosLog.log('info', 'service', `KOS entry removed for ${entry.robloxUsername}`, {
      robloxUserId,
      removedBy: removedBy.discordUsername,
    });

    // Send Telegram notification
    await sendTelegramNotification(
      `✅ *KOS ENTRY REMOVED*\n\n` +
      `User: ${entry.robloxUsername} (${robloxUserId})\n` +
      `Reason: ${reason}\n` +
      `Removed by: ${removedBy.discordUsername}`
    );

    return entry;
  } catch (error) {
    await KosLog.log('error', 'service', 'Failed to remove KOS entry', {
      error: error.message,
      robloxUserId,
    });
    throw error;
  }
}

/**
 * List KOS entries with filters
 */
export async function listKosEntries({
  filter = 'active',
  page = 1,
  limit = 10,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) {
  const skip = (page - 1) * limit;
  const query = {};

  switch (filter) {
    case 'active':
      query.status = 'active';
      break;
    case 'expiring':
      query.status = 'active';
      query.isPermanent = false;
      query.expiresAt = { $ne: null, $gte: new Date() };
      break;
    case 'permanent':
      query.status = 'active';
      query.isPermanent = true;
      break;
    case 'archived':
      query.status = 'archived';
      break;
    default:
      query.status = 'active';
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [entries, total] = await Promise.all([
    KosEntry.find(query).sort(sort).skip(skip).limit(limit),
    KosEntry.countDocuments(query),
  ]);

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get KOS statistics
 */
export async function getKosStats() {
  const [activeCount, permanentCount, expiringCount, archivedCount] = await Promise.all([
    KosEntry.countDocuments({ status: 'active' }),
    KosEntry.countDocuments({ status: 'active', isPermanent: true }),
    KosEntry.countDocuments({
      status: 'active',
      isPermanent: false,
      expiresAt: { $ne: null, $gte: new Date() },
    }),
    KosEntry.countDocuments({ status: 'archived' }),
  ]);

  return {
    active: activeCount,
    permanent: permanentCount,
    expiring: expiringCount,
    archived: archivedCount,
    total: activeCount + archivedCount,
  };
}

/**
 * Archive expired entries
 */
export async function archiveExpiredEntries() {
  try {
    const expiredEntries = await KosEntry.find({
      status: 'active',
      isPermanent: false,
      expiresAt: { $ne: null, $lt: new Date() },
    });

    let archivedCount = 0;

    for (const entry of expiredEntries) {
      entry.status = 'archived';
      await entry.save();

      // Create history record
      await KosHistory.create({
        entryId: entry._id,
        robloxUserId: entry.robloxUserId,
        robloxUsername: entry.robloxUsername,
        action: 'expired',
        reason: 'Entry expired automatically',
        performedBy: {
          discordId: 'system',
          discordUsername: 'System',
        },
      });

      archivedCount++;
    }

    if (archivedCount > 0) {
      await KosLog.log('info', 'system', `Archived ${archivedCount} expired KOS entries`);
    }

    return archivedCount;
  } catch (error) {
    await KosLog.log('error', 'system', 'Failed to archive expired entries', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get recent KOS logs
 */
export async function getKosLogs(limit = 50, category = null) {
  const filter = category ? { category } : {};
  return await KosLog.getRecent(limit, filter);
}

/**
 * Get KOS history
 */
export async function getKosHistory({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [history, total] = await Promise.all([
    KosHistory.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    KosHistory.countDocuments(),
  ]);

  return {
    history,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default {
  addKosEntry,
  findKosEntry,
  removeKosEntry,
  listKosEntries,
  getKosStats,
  archiveExpiredEntries,
  getKosLogs,
  getKosHistory,
};
