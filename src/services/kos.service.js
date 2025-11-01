import { getSupabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';

/**
 * Add a new KOS entry
 */
export async function addKosEntry(entryData) {
  try {
    const supabase = getSupabase();
    
    const entry = {
      roblox_username: entryData.robloxUsername,
      roblox_user_id: entryData.robloxUserId,
      reason: entryData.reason,
      added_by: entryData.addedBy,
      added_by_discord_id: entryData.addedByDiscordId,
      expiry_date: entryData.expiryDate,
      thumbnail_url: entryData.thumbnailUrl,
    };
    
    const { data, error } = await supabase
      .from('kos_entries')
      .insert(entry)
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('This user is already on the KOS list');
      }
      throw error;
    }
    
    // Log the action
    await logAction({
      action: 'add_entry',
      robloxUsername: entryData.robloxUsername,
      performedBy: entryData.addedBy,
      performedByDiscordId: entryData.addedByDiscordId,
      details: { entry_id: data.id, expiry_date: entryData.expiryDate },
    });
    
    logger.success(`KOS entry added: ${entryData.robloxUsername}`);
    return data;
  } catch (error) {
    logger.error('Error adding KOS entry:', error.message);
    throw error;
  }
}

/**
 * Remove a KOS entry (archives it to history)
 */
export async function removeKosEntry(username, removedBy, removedByDiscordId) {
  try {
    const supabase = getSupabase();
    
    // Get the entry first
    const { data: entry, error: fetchError } = await supabase
      .from('kos_entries')
      .select('*')
      .eq('roblox_username', username)
      .single();
    
    if (fetchError || !entry) {
      throw new Error('KOS entry not found');
    }
    
    // Archive to history
    const { error: historyError } = await supabase
      .from('kos_history')
      .insert({
        original_entry_id: entry.id,
        roblox_username: entry.roblox_username,
        roblox_user_id: entry.roblox_user_id,
        reason: entry.reason,
        added_by: entry.added_by,
        added_by_discord_id: entry.added_by_discord_id,
        removed_by: removedBy,
        removed_by_discord_id: removedByDiscordId,
        expiry_date: entry.expiry_date,
        created_at: entry.created_at,
        removal_reason: 'manual',
        thumbnail_url: entry.thumbnail_url,
      });
    
    if (historyError) throw historyError;
    
    // Delete from active entries
    const { error: deleteError } = await supabase
      .from('kos_entries')
      .delete()
      .eq('id', entry.id);
    
    if (deleteError) throw deleteError;
    
    // Log the action
    await logAction({
      action: 'remove_entry',
      robloxUsername: username,
      performedBy: removedBy,
      performedByDiscordId: removedByDiscordId,
      details: { entry_id: entry.id },
    });
    
    logger.success(`KOS entry removed: ${username}`);
    return entry;
  } catch (error) {
    logger.error('Error removing KOS entry:', error.message);
    throw error;
  }
}

/**
 * Get all active KOS entries
 */
export async function getKosEntries(limit = 100, offset = 0) {
  try {
    const supabase = getSupabase();
    
    const { data, error, count } = await supabase
      .from('kos_entries')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return { entries: data || [], total: count || 0 };
  } catch (error) {
    logger.error('Error fetching KOS entries:', error.message);
    throw error;
  }
}

/**
 * Get exit registry (history of removed entries)
 */
export async function getExitRegistry(limit = 100, offset = 0) {
  try {
    const supabase = getSupabase();
    
    const { data, error, count } = await supabase
      .from('kos_history')
      .select('*', { count: 'exact' })
      .order('removed_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return { entries: data || [], total: count || 0 };
  } catch (error) {
    logger.error('Error fetching exit registry:', error.message);
    throw error;
  }
}

/**
 * Get bot status
 */
export async function getBotStatus() {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', 'bot_enabled')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return data ? data.value === 'true' : true;
  } catch (error) {
    logger.error('Error fetching bot status:', error.message);
    return true; // Default to enabled
  }
}

/**
 * Toggle bot status
 */
export async function toggleBotStatus(enabled) {
  try {
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('bot_config')
      .upsert({
        key: 'bot_enabled',
        value: enabled ? 'true' : 'false',
      });
    
    if (error) throw error;
    
    logger.success(`Bot status set to: ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  } catch (error) {
    logger.error('Error toggling bot status:', error.message);
    throw error;
  }
}

/**
 * Get statistics
 */
export async function getStatistics() {
  try {
    const supabase = getSupabase();
    
    // Get active entries count
    const { count: activeCount } = await supabase
      .from('kos_entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    // Get history count
    const { count: historyCount } = await supabase
      .from('kos_history')
      .select('*', { count: 'exact', head: true });
    
    // Get entries expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { count: expiringCount } = await supabase
      .from('kos_entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', sevenDaysFromNow.toISOString());
    
    return {
      activeEntries: activeCount || 0,
      historicalEntries: historyCount || 0,
      expiringSoon: expiringCount || 0,
    };
  } catch (error) {
    logger.error('Error fetching statistics:', error.message);
    throw error;
  }
}

/**
 * Log an action
 */
export async function logAction({ action, robloxUsername, performedBy, performedByDiscordId, details }) {
  try {
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('kos_logs')
      .insert({
        action,
        roblox_username: robloxUsername,
        performed_by: performedBy,
        performed_by_discord_id: performedByDiscordId,
        details: details || {},
      });
    
    if (error) throw error;
  } catch (error) {
    logger.error('Error logging action:', error.message);
    // Don't throw - logging failures shouldn't break operations
  }
}

/**
 * Get recent logs
 */
export async function getRecentLogs(limit = 50) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('kos_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    logger.error('Error fetching recent logs:', error.message);
    throw error;
  }
}

/**
 * Archive expired entries (calls database function)
 */
export async function archiveExpiredEntries() {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase.rpc('archive_expired_kos');
    
    if (error) throw error;
    
    const count = data || 0;
    if (count > 0) {
      logger.info(`Archived ${count} expired KOS entries`);
    }
    
    return count;
  } catch (error) {
    logger.error('Error archiving expired entries:', error.message);
    throw error;
  }
}
