/**
 * Cloudflare Worker for Brotherhood-KOS Public API
 * 
 * This worker provides read-only access to KOS data via Supabase REST API.
 * Admin operations require API_SECRET_KEY but are not implemented (placeholder returns 501).
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // GET /api/kos - List all active KOS entries
      if (path === '/api/kos' && request.method === 'GET') {
        return await listKosEntries(env, corsHeaders);
      }
      
      // GET /api/kos/:username - Get specific KOS entry
      if (path.startsWith('/api/kos/') && request.method === 'GET') {
        const username = path.split('/')[3];
        return await getKosEntry(env, username, corsHeaders);
      }
      
      // GET /api/history - List exit registry
      if (path === '/api/history' && request.method === 'GET') {
        return await listHistory(env, corsHeaders);
      }
      
      // GET /api/stats - Get statistics
      if (path === '/api/stats' && request.method === 'GET') {
        return await getStats(env, corsHeaders);
      }
      
      // POST /admin/* - Admin endpoints (require API_SECRET_KEY)
      if (path.startsWith('/admin/') && request.method === 'POST') {
        // Verify API secret
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${env.API_SECRET_KEY}`) {
          return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
        }
        
        // Admin operations are not implemented in Worker - must use server-side bot
        return jsonResponse({ 
          error: 'Not Implemented',
          message: 'Admin operations must be performed via the Discord bot or server-side scripts using SERVICE_ROLE key'
        }, 501, corsHeaders);
      }
      
      // 404 for unknown routes
      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
      
    } catch (error) {
      return jsonResponse({ 
        error: 'Internal Server Error', 
        message: error.message 
      }, 500, corsHeaders);
    }
  }
};

/**
 * List all active KOS entries
 */
async function listKosEntries(env, corsHeaders) {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/kos_entries?is_active=eq.true&order=created_at.desc`,
    {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch KOS entries');
  }
  
  const data = await response.json();
  return jsonResponse({ entries: data, total: data.length }, 200, corsHeaders);
}

/**
 * Get specific KOS entry by username
 */
async function getKosEntry(env, username, corsHeaders) {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/kos_entries?roblox_username=eq.${encodeURIComponent(username)}&is_active=eq.true`,
    {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch KOS entry');
  }
  
  const data = await response.json();
  
  if (data.length === 0) {
    return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
  }
  
  return jsonResponse({ entry: data[0] }, 200, corsHeaders);
}

/**
 * List exit registry (history)
 */
async function listHistory(env, corsHeaders) {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/kos_history?order=removed_at.desc&limit=100`,
    {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch history');
  }
  
  const data = await response.json();
  return jsonResponse({ entries: data, total: data.length }, 200, corsHeaders);
}

/**
 * Get statistics
 */
async function getStats(env, corsHeaders) {
  // Get active count
  const activeResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/kos_entries?is_active=eq.true&select=count`,
    {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );
  
  // Get history count
  const historyResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/kos_history?select=count`,
    {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );
  
  const activeCount = parseInt(activeResponse.headers.get('Content-Range')?.split('/')[1] || '0');
  const historyCount = parseInt(historyResponse.headers.get('Content-Range')?.split('/')[1] || '0');
  
  return jsonResponse({
    activeEntries: activeCount,
    historicalEntries: historyCount,
    totalProcessed: activeCount + historyCount,
  }, 200, corsHeaders);
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
