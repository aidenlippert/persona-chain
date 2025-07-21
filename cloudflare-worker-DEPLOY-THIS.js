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
  
  // Special handling for /rpc root - this is what Keplr hits
  if (url.pathname === '/rpc') {
    // Keplr expects the RPC root to work - redirect to status for GET, handle POST for JSON-RPC
    if (request.method === 'GET') {
      // For GET requests to /rpc, return status
      targetUrl = `http://blockchain.personapass.xyz:26657/status${url.search}`
    } else {
      // For POST requests, this might be JSON-RPC - but our blockchain doesn't support it at root
      // So we'll return an error that explains this
      return new Response(JSON.stringify({
        error: "JSON-RPC not supported at root. Use specific endpoints like /rpc/status"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    }
  } else if (url.pathname.startsWith('/rpc/')) {
    // Regular RPC endpoints like /rpc/status
    const rpcPath = url.pathname.replace('/rpc', '')
    targetUrl = `http://blockchain.personapass.xyz:26657${rpcPath}${url.search}`
  } else if (url.pathname === '/api') {
    // API root
    targetUrl = `http://blockchain.personapass.xyz:1317/${url.search}`
  } else if (url.pathname.startsWith('/api/')) {
    // Regular API endpoints
    const apiPath = url.pathname.replace('/api', '')
    targetUrl = `http://blockchain.personapass.xyz:1317${apiPath}${url.search}`
  } else {
    // Default info page - only for root path
    return new Response(`
      <html>
        <head><title>PersonaChain HTTPS Proxy</title></head>
        <body>
          <h1>PersonaChain HTTPS Proxy - KEPLR READY</h1>
          <p>Using: blockchain.personapass.xyz (Static IP: 34.29.74.111)</p>
          
          <h2>Available Endpoints:</h2>
          <ul>
            <li><strong>RPC:</strong> <code>https://person.aidenlippert.workers.dev/rpc</code></li>
            <li><strong>API:</strong> <code>https://person.aidenlippert.workers.dev/api</code></li>
          </ul>
          
          <h2>Test Links:</h2>
          <ul>
            <li><a href="/rpc">RPC Root (Status)</a></li>
            <li><a href="/rpc/status">RPC Status</a></li>
            <li><a href="/api/">API Root</a></li>
          </ul>
          
          <h2>Keplr Configuration:</h2>
          <pre>
RPC: https://person.aidenlippert.workers.dev/rpc
REST: https://person.aidenlippert.workers.dev/api
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
      method: request.method,
      path: url.pathname
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    })
  }
}