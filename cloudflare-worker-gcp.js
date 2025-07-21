/**
 * Cloudflare Worker - HTTPS Proxy for PersonaChain on Google Cloud
 * This worker provides HTTPS endpoints for the HTTP-only PersonaChain blockchain
 */

// PersonaChain endpoints on Google Cloud
const PERSONA_CHAIN_RPC = 'http://34.170.121.182:26657';
const PERSONA_CHAIN_REST = 'http://34.170.121.182:1317';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    let targetUrl;

    // Route based on path
    if (url.pathname.startsWith('/rpc')) {
      // RPC endpoint (Tendermint)
      targetUrl = PERSONA_CHAIN_RPC + url.pathname.substring(4) + url.search;
    } else if (url.pathname.startsWith('/api')) {
      // REST API endpoint
      targetUrl = PERSONA_CHAIN_REST + url.pathname.substring(4) + url.search;
    } else if (url.pathname === '/status') {
      // Direct status check
      targetUrl = PERSONA_CHAIN_RPC + '/status';
    } else if (url.pathname === '/health') {
      // Health check
      targetUrl = PERSONA_CHAIN_RPC + '/health';
    } else {
      // Default to RPC
      targetUrl = PERSONA_CHAIN_RPC + url.pathname + url.search;
    }

    try {
      // Create headers without Host to avoid issues
      const newHeaders = new Headers(request.headers);
      newHeaders.delete('Host');
      
      // Create a new request with the target URL
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: 'follow',
      });

      // Forward the request to PersonaChain
      const response = await fetch(modifiedRequest);

      // Create new response with CORS headers
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // Add CORS headers
      Object.entries(corsHeaders).forEach(([key, value]) => {
        modifiedResponse.headers.set(key, value);
      });

      // Add cache control for better performance
      modifiedResponse.headers.set('Cache-Control', 'public, max-age=10');

      return modifiedResponse;
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message,
        target: targetUrl 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};