import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

let supabaseClient = null;

/**
 * Initialize Supabase client with service role key for server-side operations
 */
export function initializeSupabase() {
  if (!supabaseClient) {
    const { url, serviceRoleKey } = config.supabase;
    
    if (!url || !serviceRoleKey) {
      throw new Error('Supabase URL and Service Role Key are required');
    }
    
    supabaseClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    logger.info('Supabase client initialized');
  }
  
  return supabaseClient;
}

/**
 * Get the initialized Supabase client
 */
export function getSupabase() {
  if (!supabaseClient) {
    return initializeSupabase();
  }
  return supabaseClient;
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('bot_config').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is OK
      throw error;
    }
    
    logger.success('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error.message);
    return false;
  }
}
