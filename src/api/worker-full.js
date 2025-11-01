/**
 * Cloudflare Worker for Brotherhood-KOS Full API
 * 
 * This worker provides full API access with Discord authentication.
 * It replaces the Express.js server for edge deployment.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Health check
      if (path === '/health' && request.method === 'GET') {
        return jsonResponse({ 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        }, 200, corsHeaders);
      }
      
      // Authentication endpoints
      if (path === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(request, env, corsHeaders);
      }
      
      if (path === '/api/auth/logout' && request.method === 'POST') {
        return await handleLogout(request, env, corsHeaders);
      }
      
      // Protected endpoints - require authentication
      const authResult = await authenticate(request, env);
      if (!authResult.valid) {
        return jsonResponse(
          { error: 'Unauthorized', message: authResult.message },
          401,
          corsHeaders
        );
      }
      
      // KOS endpoints
      if (path === '/api/kos' && request.method === 'GET') {
        return await listKosEntries(request, env, corsHeaders);
      }
      
      if (path.match(/^\/api\/kos\/[^\/]+$/) && request.method === 'GET') {
        const username = path.split('/')[3];
        return await getKosEntry(env, username, corsHeaders);
      }
      
      if (path === '/api/kos' && request.method === 'POST') {
        return await addKosEntry(request, env, authResult.user, corsHeaders);
      }
      
      if (path.match(/^\/api\/kos\/[^\/]+$/) && request.method === 'DELETE') {
        const username = path.split('/')[3];
        return await removeKosEntry(env, username, authResult.user, corsHeaders);
      }
      
      // History endpoint
      if (path === '/api/history' && request.method === 'GET') {
        return await listHistory(request, env, corsHeaders);
      }
      
      // Statistics endpoint
      if (path === '/api/stats' && request.method === 'GET') {
        return await getStats(env, corsHeaders);
      }
      
      // Status endpoint
      if (path === '/api/status' && request.method === 'GET') {
        return jsonResponse({
          success: true,
          user: authResult.user,
          timestamp: new Date().toISOString(),
        }, 200, corsHeaders);
      }
      
      // 404 for unknown routes
      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
      
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        error: 'Internal Server Error', 
        message: error.message 
      }, 500, corsHeaders);
    }
  }
};

/**
 * Authenticate request
 */
async function authenticate(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, message: 'Missing or invalid Authorization header' };
    }
    
    const token = authHeader.substring(7);
    
    // Verify session token
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/api_sessions?token=eq.${token}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!response.ok) {
      return { valid: false, message: 'Failed to verify token' };
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      return { valid: false, message: 'Invalid session token' };
    }
    
    const session = data[0];
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    
    if (now > expiresAt) {
      return { valid: false, message: 'Session expired' };
    }
    
    // Update last_used_at (best-effort, don't wait)
    fetch(
      `${env.SUPABASE_URL}/rest/v1/api_sessions?id=eq.${session.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ last_used_at: new Date().toISOString() }),
      }
    ).catch(() => {}); // Fire and forget
    
    return {
      valid: true,
      user: {
        userId: session.discord_user_id,
        username: session.discord_username,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { valid: false, message: 'Authentication error' };
  }
}

/**
 * Handle login
 */
async function handleLogin(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { code } = body;
    
    if (!code) {
      return jsonResponse(
        { error: 'Bad Request', message: 'Code is required' },
        400,
        corsHeaders
      );
    }
    
    // Verify auth code
    const codeResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/api_auth_codes?code=eq.${code.toUpperCase()}&is_used=eq.false`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!codeResponse.ok) {
      return jsonResponse(
        { error: 'Unauthorized', message: 'Invalid or expired code' },
        401,
        corsHeaders
      );
    }
    
    const codeData = await codeResponse.json();
    
    if (codeData.length === 0) {
      return jsonResponse(
        { error: 'Unauthorized', message: 'Invalid or expired code' },
        401,
        corsHeaders
      );
    }
    
    const authCode = codeData[0];
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(authCode.expires_at);
    
    if (now > expiresAt) {
      return jsonResponse(
        { error: 'Unauthorized', message: 'Code has expired' },
        401,
        corsHeaders
      );
    }
    
    // Mark code as used
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/api_auth_codes?id=eq.${authCode.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          is_used: true,
          used_at: new Date().toISOString(),
        }),
      }
    );
    
    // Generate session token
    const token = await generateToken();
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Create session
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/api_sessions`,
      {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          token,
          discord_user_id: authCode.discord_user_id,
          discord_username: authCode.discord_username,
          expires_at: sessionExpiresAt,
        }),
      }
    );
    
    return jsonResponse({
      success: true,
      token,
      expiresAt: sessionExpiresAt,
      user: {
        userId: authCode.discord_user_id,
        username: authCode.discord_username,
      },
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * Handle logout
 */
async function handleLogout(request, env, corsHeaders) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(
        { error: 'Unauthorized', message: 'Missing Authorization header' },
        401,
        corsHeaders
      );
    }
    
    const token = authHeader.substring(7);
    
    // Delete session
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/api_sessions?token=eq.${token}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    return jsonResponse({
      success: true,
      message: 'Logged out successfully',
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Logout error:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * List all active KOS entries
 */
async function listKosEntries(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const filter = url.searchParams.get('filter');
    
    let query = `${env.SUPABASE_URL}/rest/v1/kos_entries?is_active=eq.true&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    if (filter) {
      query += `&roblox_username=ilike.*${encodeURIComponent(filter)}*`;
    }
    
    const response = await fetch(query, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch KOS entries');
    }
    
    const data = await response.json();
    const total = parseInt(response.headers.get('Content-Range')?.split('/')[1] || data.length);
    
    return jsonResponse({
      success: true,
      entries: data,
      total,
      limit,
      offset,
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Error fetching KOS entries:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * Get specific KOS entry by username
 */
async function getKosEntry(env, username, corsHeaders) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_entries?roblox_username=ilike.${encodeURIComponent(username)}&is_active=eq.true`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch KOS entry');
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      return jsonResponse({ error: 'Not Found', message: 'KOS entry not found' }, 404, corsHeaders);
    }
    
    return jsonResponse({ success: true, entry: data[0] }, 200, corsHeaders);
  } catch (error) {
    console.error('Error fetching KOS entry:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * Add KOS entry
 */
async function addKosEntry(request, env, user, corsHeaders) {
  try {
    const body = await request.json();
    const { username, reason, duration } = body;
    
    if (!username || !reason) {
      return jsonResponse(
        { error: 'Bad Request', message: 'username and reason are required' },
        400,
        corsHeaders
      );
    }
    
    // Validate duration if provided
    let expiryDate = null;
    if (duration) {
      const durationMs = parseDuration(duration);
      if (!durationMs || durationMs <= 0) {
        return jsonResponse(
          { error: 'Bad Request', message: 'Invalid duration format' },
          400,
          corsHeaders
        );
      }
      expiryDate = new Date(Date.now() + durationMs).toISOString();
    }
    
    // Fetch Roblox user info
    const robloxInfo = await getRobloxUserInfo(username);
    if (!robloxInfo) {
      return jsonResponse(
        { error: 'Not Found', message: `Could not find Roblox user: ${username}` },
        404,
        corsHeaders
      );
    }
    
    // Add to database
    const insertResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_entries`,
      {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          roblox_username: robloxInfo.name,
          roblox_user_id: robloxInfo.id,
          reason,
          added_by: user.username,
          added_by_discord_id: user.userId,
          expiry_date: expiryDate,
          thumbnail_url: robloxInfo.thumbnailUrl,
        }),
      }
    );
    
    if (!insertResponse.ok) {
      const error = await insertResponse.text();
      if (error.includes('duplicate') || error.includes('unique')) {
        return jsonResponse(
          { error: 'Conflict', message: 'This user is already on the KOS list' },
          409,
          corsHeaders
        );
      }
      throw new Error('Failed to add KOS entry');
    }
    
    const entry = await insertResponse.json();
    
    // Log the action
    await logAction(env, {
      action: 'add_entry',
      roblox_username: robloxInfo.name,
      performed_by: user.username,
      performed_by_discord_id: user.userId,
      details: { entry_id: entry[0].id, expiry_date: expiryDate },
    });
    
    return jsonResponse({
      success: true,
      message: 'KOS entry added successfully',
      entry: entry[0],
    }, 201, corsHeaders);
  } catch (error) {
    console.error('Error adding KOS entry:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * Remove KOS entry
 */
async function removeKosEntry(env, username, user, corsHeaders) {
  try {
    // Get the entry first
    const getResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_entries?roblox_username=ilike.${encodeURIComponent(username)}&is_active=eq.true`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    if (!getResponse.ok) {
      throw new Error('Failed to fetch KOS entry');
    }
    
    const entries = await getResponse.json();
    
    if (entries.length === 0) {
      return jsonResponse(
        { error: 'Not Found', message: 'KOS entry not found' },
        404,
        corsHeaders
      );
    }
    
    const entry = entries[0];
    
    // Archive to history
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_history`,
      {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          original_entry_id: entry.id,
          roblox_username: entry.roblox_username,
          roblox_user_id: entry.roblox_user_id,
          reason: entry.reason,
          added_by: entry.added_by,
          added_by_discord_id: entry.added_by_discord_id,
          removed_by: user.username,
          removed_by_discord_id: user.userId,
          expiry_date: entry.expiry_date,
          created_at: entry.created_at,
          removal_reason: 'manual',
          thumbnail_url: entry.thumbnail_url,
        }),
      }
    );
    
    // Delete from active entries
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_entries?id=eq.${entry.id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    // Log the action
    await logAction(env, {
      action: 'remove_entry',
      roblox_username: username,
      performed_by: user.username,
      performed_by_discord_id: user.userId,
      details: { entry_id: entry.id },
    });
    
    return jsonResponse({
      success: true,
      message: 'KOS entry removed successfully',
      entry,
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Error removing KOS entry:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * List exit registry (history)
 */
async function listHistory(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_history?order=removed_at.desc&limit=${limit}&offset=${offset}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }
    
    const data = await response.json();
    const total = parseInt(response.headers.get('Content-Range')?.split('/')[1] || data.length);
    
    return jsonResponse({
      success: true,
      entries: data,
      total,
      limit,
      offset,
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Error fetching history:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * Get statistics
 */
async function getStats(env, corsHeaders) {
  try {
    // Get active count
    const activeResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_entries?is_active=eq.true&select=count`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );
    
    // Get history count
    const historyResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_history?select=count`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );
    
    // Get expiring soon count
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const expiringResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_entries?is_active=eq.true&expiry_date=not.is.null&expiry_date=lte.${sevenDaysFromNow}&select=count`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );
    
    // Get bot status
    const botStatusResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/bot_config?key=eq.bot_enabled`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    const activeCount = parseInt(activeResponse.headers.get('Content-Range')?.split('/')[1] || '0');
    const historyCount = parseInt(historyResponse.headers.get('Content-Range')?.split('/')[1] || '0');
    const expiringCount = parseInt(expiringResponse.headers.get('Content-Range')?.split('/')[1] || '0');
    
    let botEnabled = true;
    if (botStatusResponse.ok) {
      const botData = await botStatusResponse.json();
      if (botData.length > 0) {
        botEnabled = botData[0].value === 'true';
      }
    }
    
    return jsonResponse({
      success: true,
      statistics: {
        activeEntries: activeCount,
        historicalEntries: historyCount,
        expiringSoon: expiringCount,
        totalProcessed: activeCount + historyCount,
      },
      botStatus: {
        enabled: botEnabled,
      },
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      500,
      corsHeaders
    );
  }
}

// Helper functions

/**
 * Get Roblox user info
 */
async function getRobloxUserInfo(username) {
  try {
    const response = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false,
      }),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const user = data.data[0];
      
      // Get thumbnail
      const thumbResponse = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=false`
      );
      
      let thumbnailUrl = null;
      if (thumbResponse.ok) {
        const thumbData = await thumbResponse.json();
        if (thumbData.data && thumbData.data.length > 0) {
          thumbnailUrl = thumbData.data[0].imageUrl;
        }
      }
      
      return {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        thumbnailUrl,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Roblox user info:', error);
    return null;
  }
}

/**
 * Parse duration string to milliseconds
 * Note: Uses approximate values for months (30 days) and years (365 days)
 */
function parseDuration(duration) {
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    mo: 30 * 24 * 60 * 60 * 1000,  // Approximate: 30 days
    y: 365 * 24 * 60 * 60 * 1000,  // Approximate: 365 days (no leap year)
  };
  
  const match = duration.match(/^(\d+)(s|m|h|d|w|mo|y)$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return value * (units[unit] || 0);
}

/**
 * Generate random token
 */
async function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Log an action
 */
async function logAction(env, { action, roblox_username, performed_by, performed_by_discord_id, details }) {
  try {
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/kos_logs`,
      {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          action,
          roblox_username,
          performed_by,
          performed_by_discord_id,
          details: details || {},
        }),
      }
    );
  } catch (error) {
    console.error('Error logging action:', error);
    // Don't throw - logging failures shouldn't break operations
  }
}

/**
 * Helper to create JSON response
 */
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}
