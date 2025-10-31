/**
 * Cloudflare Worker for Brotherhood KOS REST API
 * 
 * This worker provides read-only public endpoints and admin-protected endpoints
 * for the KOS system using MongoDB Data API.
 */

// Environment variables expected:
// - API_SECRET_KEY: Secret key for admin endpoints
// - MONGODB_DATA_API_URL: MongoDB Data API URL
// - MONGODB_DATA_API_KEY: MongoDB Data API key
// - MONGODB_DATABASE: Database name (default: brotherhood-kos)
// - MONGODB_COLLECTION: Collection name (default: kosentries)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Check if Data API is configured
    if (!env.MONGODB_DATA_API_URL || !env.MONGODB_DATA_API_KEY) {
      return jsonResponse(
        {
          error: 'MongoDB Data API not configured',
          message: 'Please set up MongoDB Data API and configure MONGODB_DATA_API_URL and MONGODB_DATA_API_KEY environment variables.',
          documentation: 'https://www.mongodb.com/docs/atlas/app-services/data-api/',
        },
        501,
        corsHeaders
      );
    }

    try {
      // Route handling
      if (url.pathname === '/entries' && request.method === 'GET') {
        return await handleGetEntries(request, env, corsHeaders);
      }

      if (url.pathname.match(/^\/entries\/[a-f0-9]+$/) && request.method === 'GET') {
        return await handleGetEntry(request, env, corsHeaders);
      }

      if (url.pathname === '/history' && request.method === 'GET') {
        return await handleGetHistory(request, env, corsHeaders);
      }

      if (url.pathname === '/admin/toggle-status' && request.method === 'POST') {
        return await handleToggleStatus(request, env, corsHeaders);
      }

      // 404 Not Found
      return jsonResponse(
        { error: 'Not Found', message: 'Endpoint not found' },
        404,
        corsHeaders
      );
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse(
        { error: 'Internal Server Error', message: error.message },
        500,
        corsHeaders
      );
    }
  },
};

/**
 * GET /entries?filter=active|expiring|permanent
 */
async function handleGetEntries(request, env, corsHeaders) {
  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'active';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  // Build MongoDB filter
  let mongoFilter = {};
  
  switch (filter) {
    case 'active':
      mongoFilter = { status: 'active' };
      break;
    case 'expiring':
      mongoFilter = {
        status: 'active',
        isPermanent: false,
        expiresAt: { $ne: null, $gte: { $date: new Date().toISOString() } },
      };
      break;
    case 'permanent':
      mongoFilter = {
        status: 'active',
        isPermanent: true,
      };
      break;
    default:
      mongoFilter = { status: 'active' };
  }

  try {
    const result = await queryMongoDB(env, {
      filter: mongoFilter,
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });

    return jsonResponse(
      {
        entries: result.documents || [],
        pagination: {
          page,
          limit,
          total: result.documents?.length || 0,
        },
      },
      200,
      corsHeaders
    );
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch entries', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * GET /entries/:id
 */
async function handleGetEntry(request, env, corsHeaders) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  try {
    const result = await queryMongoDB(env, {
      filter: { _id: { $oid: id }, status: 'active' },
      limit: 1,
    });

    if (!result.documents || result.documents.length === 0) {
      return jsonResponse(
        { error: 'Not Found', message: 'KOS entry not found' },
        404,
        corsHeaders
      );
    }

    return jsonResponse(result.documents[0], 200, corsHeaders);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch entry', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * GET /history
 */
async function handleGetHistory(request, env, corsHeaders) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  try {
    const result = await queryMongoDB(
      env,
      {
        filter: {},
        sort: { createdAt: -1 },
        skip: (page - 1) * limit,
        limit,
      },
      'koshistories'
    );

    return jsonResponse(
      {
        history: result.documents || [],
        pagination: {
          page,
          limit,
          total: result.documents?.length || 0,
        },
      },
      200,
      corsHeaders
    );
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch history', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * POST /admin/toggle-status
 * Requires API_SECRET_KEY header
 */
async function handleToggleStatus(request, env, corsHeaders) {
  // Check API key
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== env.API_SECRET_KEY) {
    return jsonResponse(
      { error: 'Unauthorized', message: 'Invalid or missing API key' },
      401,
      corsHeaders
    );
  }

  try {
    const body = await request.json();
    const { entryId, status } = body;

    if (!entryId || !status) {
      return jsonResponse(
        { error: 'Bad Request', message: 'Missing required fields: entryId, status' },
        400,
        corsHeaders
      );
    }

    // Update via Data API (updateOne)
    const result = await updateMongoDB(env, {
      filter: { _id: { $oid: entryId } },
      update: {
        $set: {
          status,
          updatedAt: { $date: new Date().toISOString() },
        },
      },
    });

    return jsonResponse(
      { success: true, modifiedCount: result.modifiedCount || 0 },
      200,
      corsHeaders
    );
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to update status', message: error.message },
      500,
      corsHeaders
    );
  }
}

/**
 * Query MongoDB Data API (find)
 */
async function queryMongoDB(env, query, collection = 'kosentries') {
  const dataSource = env.MONGODB_DATASOURCE || 'Cluster0';
  const database = env.MONGODB_DATABASE || 'brotherhood-kos';

  const response = await fetch(`${env.MONGODB_DATA_API_URL}/action/find`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.MONGODB_DATA_API_KEY,
    },
    body: JSON.stringify({
      dataSource,
      database,
      collection,
      ...query,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MongoDB API error: ${error}`);
  }

  return await response.json();
}

/**
 * Update MongoDB Data API (updateOne)
 */
async function updateMongoDB(env, query, collection = 'kosentries') {
  const dataSource = env.MONGODB_DATASOURCE || 'Cluster0';
  const database = env.MONGODB_DATABASE || 'brotherhood-kos';

  const response = await fetch(`${env.MONGODB_DATA_API_URL}/action/updateOne`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.MONGODB_DATA_API_KEY,
    },
    body: JSON.stringify({
      dataSource,
      database,
      collection,
      ...query,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MongoDB API error: ${error}`);
  }

  return await response.json();
}

/**
 * Helper to create JSON response
 */
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}
