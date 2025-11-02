/**
 * Cloudflare Worker for Brotherhood-KOS Messages API
 * 
 * This worker provides a simple API with x-api-key authentication.
 * Endpoints:
 * - GET /health - Health check
 * - GET /messages - List messages
 * - POST /messages - Create a new message
 */

import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Health check - no authentication required
      if (path === '/health' && request.method === 'GET') {
        return jsonResponse({ 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        }, 200, corsHeaders);
      }
      
      // Protected endpoints - require x-api-key authentication
      const apiKey = request.headers.get('x-api-key');
      if (!apiKey || apiKey !== env.API_SECRET_KEY) {
        return jsonResponse(
          { error: 'Unauthorized', message: 'Invalid or missing x-api-key' },
          401,
          corsHeaders
        );
      }
      
      // Initialize Supabase client
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          fetch: fetch.bind(globalThis),
        },
      });
      
      // GET /messages - List messages
      if (path === '/messages' && request.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit')) || 100;
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        
        const { data, error, count } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (error) {
          return jsonResponse(
            { error: 'Database Error', message: error.message },
            500,
            corsHeaders
          );
        }
        
        return jsonResponse({
          success: true,
          messages: data,
          total: count,
          limit,
          offset,
        }, 200, corsHeaders);
      }
      
      // POST /messages - Create a new message
      if (path === '/messages' && request.method === 'POST') {
        const body = await request.json();
        const { content, author } = body;
        
        if (!content || !author) {
          return jsonResponse(
            { error: 'Bad Request', message: 'content and author are required' },
            400,
            corsHeaders
          );
        }
        
        const { data, error } = await supabase
          .from('messages')
          .insert([{ content, author }])
          .select()
          .single();
        
        if (error) {
          return jsonResponse(
            { error: 'Database Error', message: error.message },
            500,
            corsHeaders
          );
        }
        
        return jsonResponse({
          success: true,
          message: data,
        }, 201, corsHeaders);
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
