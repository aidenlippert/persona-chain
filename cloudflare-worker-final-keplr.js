addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  let targetUrl
  
  // Handle RPC requests - Keplr often accesses /rpc directly for POST requests
  if (url.pathname === '/rpc' || url.pathname.startsWith('/rpc/')) {
    let rpcPath = url.pathname
    
    // If it's exactly /rpc, forward to the root of the RPC server
    if (rpcPath === '/rpc') {
      // For RPC root, we forward the request body (for JSON-RPC calls)
      targetUrl = `http://blockchain.personapass.xyz:26657/${url.search}`
    } else {
      // For specific RPC paths like /rpc/status
      const actualPath = rpcPath.replace('/rpc', '')
      targetUrl = `http://blockchain.personapass.xyz:26657${actualPath}${url.search}`
    }
    
  } else if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    let apiPath = url.pathname
    
    // If it's exactly /api, add a trailing slash
    if (apiPath === '/api') {
      apiPath = '/api/'
    }
    
    const actualPath = apiPath.replace('/api', '')
    targetUrl = `http://blockchain.personapass.xyz:1317${actualPath}${url.search}`
    
  } else {
    // Default info page
    return new Response(`
      <html>
        <head><title>PersonaChain HTTPS Proxy</title></head>
        <body>
          <h1>PersonaChain HTTPS Proxy - KEPLR COMPATIBLE</h1>
          <p>Using: blockchain.personapass.xyz (Static IP: 34.29.74.111)</p>
          
          <h2>Available Endpoints:</h2>
          <ul>
            <li><strong>RPC:</strong> <code>https://person.aidenlippert.workers.dev/rpc</code></li>
            <li><strong>API:</strong> <code>https://person.aidenlippert.workers.dev/api</code></li>
          </ul>
          
          <h2>Test Links:</h2>
          <ul>
            <li><a href="/rpc/status">RPC Status</a></li>
            <li><a href="/api/">API Root</a></li>
          </ul>
          
          <h2>Usage in PersonaPass Wallet:</h2>
          <pre>
VITE_PERSONA_CHAIN_RPC=https://person.aidenlippert.workers.dev/rpc
VITE_BLOCKCHAIN_REST=https://person.aidenlippert.workers.dev/api
          </pre>
          
          <h2>Debug Info:</h2>
          <p>Method: ${request.method}, Path: ${url.pathname}</p>
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
    // Forward the request with proper method and body
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
      },
      body: request.method === 'POST' ? request.body : undefined,
    })
    
    const text = await response.text()
    
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        ...corsHeaders,
      },
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message,
      target: targetUrl,
      method: request.method
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    })
  }
}