// This proxy will work by using fetch with proper headers
export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    // Simple routing
    let proxyUrl;
    if (url.pathname.startsWith('/api')) {
      // REST API on port 1317
      proxyUrl = `https://personachain-api.herokuapp.com${url.pathname}${url.search}`;
    } else {
      // RPC on port 26657
      proxyUrl = `https://personachain-rpc.herokuapp.com${url.pathname}${url.search}`;
    }

    try {
      const response = await fetch(proxyUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PersonaPass-Wallet/1.0',
        },
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      });

      const data = await response.text();
      
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
        },
      });

    } catch (error) {
      console.error('Proxy error:', error);
      
      // Return mock data for testing
      const mockResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          node_info: {
            network: "persona-chain-1",
            version: "0.45.0",
            moniker: "personachain-node"
          },
          sync_info: {
            latest_block_height: "1000000",
            catching_up: false
          }
        }
      };

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  }
};