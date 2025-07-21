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
  
  if (url.pathname.startsWith('/rpc/')) {
    const rpcPath = url.pathname.replace('/rpc', '')
    targetUrl = `http://blockchain.personapass.xyz:26657${rpcPath}${url.search}`
  } else if (url.pathname.startsWith('/api/')) {
    const apiPath = url.pathname.replace('/api', '')
    targetUrl = `http://blockchain.personapass.xyz:1317${apiPath}${url.search}`
  } else {
    return new Response(`
      <html>
        <head><title>PersonaChain HTTPS Proxy</title></head>
        <body>
          <h1>PersonaChain HTTPS Proxy</h1>
          <p>Using: blockchain.personapass.xyz (Static IP: 34.29.74.111)</p>
          
          <h2>Available Endpoints:</h2>
          <ul>
            <li><strong>RPC:</strong> <code>https://person.aidenlippert.workers.dev/rpc/</code></li>
            <li><strong>API:</strong> <code>https://person.aidenlippert.workers.dev/api/</code></li>
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