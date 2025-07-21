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
  
  // Handle all /rpc requests by forwarding them to the blockchain RPC
  if (url.pathname === '/rpc' || url.pathname.startsWith('/rpc/')) {
    if (url.pathname === '/rpc') {
      // For /rpc requests, forward to the blockchain root with query params
      targetUrl = `http://blockchain.personapass.xyz:26657/${url.search}`
    } else {
      // For /rpc/* requests, forward to the specific path
      const rpcPath = url.pathname.replace('/rpc', '')
      targetUrl = `http://blockchain.personapass.xyz:26657${rpcPath}${url.search}`
    }
  } else if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api') {
      targetUrl = `http://blockchain.personapass.xyz:1317/${url.search}`
    } else {
      const apiPath = url.pathname.replace('/api', '')
      targetUrl = `http://blockchain.personapass.xyz:1317${apiPath}${url.search}`
    }
  } else {
    // Default info page
    return new Response(`
      <html>
        <head><title>PersonaChain HTTPS Proxy</title></head>
        <body>
          <h1>PersonaChain HTTPS Proxy - SIMPLE</h1>
          <p>Using: blockchain.personapass.xyz (Static IP: 34.29.74.111)</p>
          
          <h2>Available Endpoints:</h2>
          <ul>
            <li><strong>RPC:</strong> <code>https://person.aidenlippert.workers.dev/rpc</code></li>
            <li><strong>API:</strong> <code>https://person.aidenlippert.workers.dev/api</code></li>
          </ul>
          
          <h2>Test Links:</h2>
          <ul>
            <li><a href="/rpc">RPC Root</a></li>
            <li><a href="/rpc/status">RPC Status</a></li>
            <li><a href="/api/">API Root</a></li>
          </ul>
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
    // Forward all requests as-is
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method === 'POST' ? request.body : undefined,
    })
    
    const text = await response.text()
    
    return new Response(text, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
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