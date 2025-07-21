export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    // Direct proxy to PersonaChain
    let targetUrl = `http://34.170.121.182:26657${url.pathname}${url.search}`;
    
    // Route /api requests to port 1317
    if (url.pathname.startsWith('/api')) {
      targetUrl = `http://34.170.121.182:1317${url.pathname.slice(4)}${url.search}`;
    }

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'PersonaChain-Proxy/1.0',
          'Accept': 'application/json',
        },
        body: request.method === 'GET' ? null : request.body,
      });

      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
      });

      Object.entries(corsHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });

      return newResponse;
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};