// Deno Deploy Worker - HTTPS Proxy for PersonaChain
// This provides automatic SSL termination for PersonaChain endpoints

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // CORS headers for wallet connections
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Route requests to PersonaChain
  let targetUrl: string;
  
  if (url.pathname.startsWith('/rpc/')) {
    // RPC endpoint: https://worker.deno.dev/rpc/health → http://34.170.121.182:26657/health
    const rpcPath = url.pathname.replace('/rpc', '');
    targetUrl = `http://34.170.121.182:26657${rpcPath}${url.search}`;
  } else if (url.pathname.startsWith('/api/')) {
    // API endpoint: https://worker.deno.dev/api/cosmos/... → http://34.170.121.182:1317/cosmos/...
    const apiPath = url.pathname.replace('/api', '');
    targetUrl = `http://34.170.121.182:1317${apiPath}${url.search}`;
  } else {
    // Default info page
    return new Response(`
      <html>
        <head><title>PersonaChain HTTPS Proxy</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
          <h1>🔗 PersonaChain HTTPS Proxy</h1>
          <p>This Deno Deploy worker provides HTTPS endpoints for PersonaChain blockchain.</p>
          
          <h2>📡 Available Endpoints:</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <strong>RPC:</strong> <code>https://${url.host}/rpc/</code><br>
            <strong>API:</strong> <code>https://${url.host}/api/</code>
          </div>
          
          <h2>🧪 Test Endpoints:</h2>
          <ul>
            <li><a href="/rpc/health">RPC Health Check</a></li>
            <li><a href="/api/cosmos/base/tendermint/v1beta1/node_info">API Node Info</a></li>
          </ul>
          
          <h2>🛠️ Usage in PersonaPass Wallet:</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <pre>VITE_PERSONA_CHAIN_RPC=https://${url.host}/rpc
VITE_BLOCKCHAIN_REST=https://${url.host}/api</pre>
          </div>
          
          <h2>✅ Benefits:</h2>
          <ul>
            <li>🔒 Automatic SSL/TLS encryption</li>
            <li>🌐 Resolves Mixed Content errors</li>
            <li>⚡ Fast global CDN</li>
            <li>🔄 CORS enabled for wallet connections</li>
          </ul>
        </body>
      </html>
    `, {
      headers: { 
        'Content-Type': 'text/html',
        ...corsHeaders 
      }
    });
  }
  
  try {
    console.log(`Proxying ${request.method} ${request.url} → ${targetUrl}`);
    
    // Forward the request to PersonaChain
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method === 'POST' ? request.body : undefined,
    });
    
    // Create new response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        ...corsHeaders,
      },
    });
    
    return newResponse;
    
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    });
  }
}