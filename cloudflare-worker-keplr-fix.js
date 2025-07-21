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
  
  // Handle RPC requests - both /rpc and /rpc/ should work
  if (url.pathname === '/rpc' || url.pathname.startsWith('/rpc/')) {
    let rpcPath = url.pathname
    
    // If it's exactly /rpc, add a trailing slash to make it /rpc/
    if (rpcPath === '/rpc') {
      rpcPath = '/rpc/'
    }
    
    // Remove /rpc prefix and build target URL
    const actualPath = rpcPath.replace('/rpc', '')
    targetUrl = `http://blockchain.personapass.xyz:26657${actualPath}${url.search}`
    
  } else if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    let apiPath = url.pathname
    
    // If it's exactly /api, add a trailing slash to make it /api/
    if (apiPath === '/api') {
      apiPath = '/api/'
    }
    
    // Remove /api prefix and build target URL
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
            <li><a href="/rpc">RPC Root</a></li>
            <li><a href="/api/">API Root</a></li>
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
    const response = await fetch(targetUrl)
    const text = await response.text()
    
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message,
      target: targetUrl
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    })
  }
}