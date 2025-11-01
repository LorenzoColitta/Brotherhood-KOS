/**
 * Cloudflare Worker for Brotherhood KOS REST API
 * Provides public read endpoints and admin-protected endpoints
 */

// This is a Cloudflare Worker - it uses a different runtime than Node.js
// MongoDB connection is handled differently in Workers

const MONGODB_DATA_API_URL = 'https://data.mongodb-api.com/app/data-XXXXX/endpoint/data/v1';

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
      // Public endpoints
      if (path === '/entries' && request.method === 'GET') {
        return await getEntries(url, env, corsHeaders);
      }
      
      if (path.match(/^\/entries\/[^\/]+$/) && request.method === 'GET') {
        const id = path.split('/')[2];
        return await getEntry(id, env, corsHeaders);
      }
      
      if (path === '/history' && request.method === 'GET') {
        return await getHistory(url, env, corsHeaders);
      }
      
      if (path === '/stats' && request.method === 'GET') {
        return await getStats(env, corsHeaders);
      }
      
      // Admin endpoints
      if (path === '/admin/toggle-status' && request.method === 'POST') {
        return await toggleStatus(request, env, corsHeaders);
      }
      
      // 404 Not Found
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
      
    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

/**
 * Get list of KOS entries
 */
async function getEntries(url, env, corsHeaders) {
  const isActive = url.searchParams.get('active') !== 'false';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100);
  const skip = parseInt(url.searchParams.get('skip') || '0');
  
  // In a real implementation, you would query MongoDB here
  // For now, returning a placeholder response
  const response = {
    success: true,
    data: [],
    count: 0,
    message: 'MongoDB connection should be configured with MONGODB_URI environment variable',
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Get a specific KOS entry by Roblox ID
 */
async function getEntry(robloxId, env, corsHeaders) {
  // In a real implementation, you would query MongoDB here
  const response = {
    success: true,
    data: null,
    message: 'MongoDB connection should be configured with MONGODB_URI environment variable',
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Get KOS history
 */
async function getHistory(url, env, corsHeaders) {
  const robloxId = url.searchParams.get('robloxId');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  
  // In a real implementation, you would query MongoDB here
  const response = {
    success: true,
    data: [],
    count: 0,
    message: 'MongoDB connection should be configured with MONGODB_URI environment variable',
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Get KOS statistics
 */
async function getStats(env, corsHeaders) {
  // In a real implementation, you would query MongoDB here
  const response = {
    success: true,
    data: {
      totalActive: 0,
      totalArchived: 0,
      total: 0,
      recentAdded: 0,
    },
    message: 'MongoDB connection should be configured with MONGODB_URI environment variable',
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Toggle KOS entry status (admin only)
 */
async function toggleStatus(request, env, corsHeaders) {
  // Verify API secret
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || authHeader !== `Bearer ${env.API_SECRET_KEY}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  const body = await request.json();
  const { robloxId } = body;
  
  if (!robloxId) {
    return new Response(
      JSON.stringify({ error: 'Missing robloxId parameter' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  // In a real implementation, you would update MongoDB here
  const response = {
    success: true,
    message: 'MongoDB connection should be configured with MONGODB_URI environment variable',
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
