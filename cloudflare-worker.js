// Cloudflare Worker - HTTPS Proxy for PersonaChain
// This provides automatic SSL termination for PersonaChain endpoints

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // CORS headers for wallet connections
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Route requests to PersonaChain
  let targetUrl
  
  if (url.pathname === '/rpc' || url.pathname.startsWith('/rpc/')) {
    // RPC endpoint: https://worker.dev/rpc/status → http://192.184.204.181:26657/status (YOUR LIVE IP)
    const rpcPath = url.pathname.replace('/rpc', '')
    targetUrl = `http://192.184.204.181:26657${rpcPath}${url.search}`
  } else if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    // API endpoint: Use REST API on port 1317 (YOUR LIVE IP)
    const apiPath = url.pathname.replace('/api', '')
    targetUrl = `http://192.184.204.181:1317${apiPath}${url.search}`
  } else {
    // Default info page
    return new Response(`
      <html>
        <head><title>PersonaChain HTTPS Proxy</title></head>
        <body>
          <h1>PersonaChain HTTPS Proxy</h1>
          <p>This Cloudflare Worker provides HTTPS endpoints for PersonaChain blockchain.</p>
          
          <h2>Available Endpoints:</h2>
          <ul>
            <li><strong>RPC:</strong> <code>https://person.aidenlippert.workers.dev/rpc/</code></li>
            <li><strong>API:</strong> <code>https://person.aidenlippert.workers.dev/api/</code></li>
          </ul>
          
          <h2>Test Endpoints:</h2>
          <ul>
            <li><a href="/rpc/status">RPC Status Check</a></li>
            <li><a href="/api/cosmos/base/tendermint/v1beta1/node_info">API Node Info</a></li>
          </ul>
          
          <h2>Usage in PersonaPass Wallet:</h2>
          <pre>
VITE_PERSONA_CHAIN_RPC=https://person.aidenlippert.workers.dev/rpc
VITE_BLOCKCHAIN_REST=https://person.aidenlippert.workers.dev/api
          </pre>
        </body>
      </html>
    `, {
      headers: { 
        'Content-Type': 'text/html',
        ...corsHeaders 
      }
    })
  }
  
  try {
    console.log(`Proxying ${request.method} ${request.url} → ${targetUrl}`)
    
    // Forward the request to PersonaChain
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method === 'POST' ? request.body : undefined,
    })
    
    // Create new response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        ...corsHeaders,
      },
    })
    
    return newResponse
    
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    })
  }
}