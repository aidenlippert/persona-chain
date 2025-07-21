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
  let simulateResponse = false
  
  // Handle RPC requests
  if (url.pathname === '/rpc' || url.pathname.startsWith('/rpc/')) {
    let endpoint = url.pathname === '/rpc' ? '/' : url.pathname.replace('/rpc', '')
    
    // Check if this is an endpoint that needs simulation
    if (endpoint === '/abci_info' || endpoint === '/genesis' || endpoint === '/health') {
      simulateResponse = true
    } else {
      // Forward to real blockchain
      targetUrl = `http://blockchain.personapass.xyz:26657${endpoint}${url.search}`
    }
  } else if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    // Forward API requests to blockchain
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
          <h1>PersonaChain HTTPS Proxy - KEPLR SIMULATION</h1>
          <p>Using: blockchain.personapass.xyz (Static IP: 34.29.74.111)</p>
          
          <h2>Available Endpoints:</h2>
          <ul>
            <li><strong>RPC:</strong> <code>https://person.aidenlippert.workers.dev/rpc</code></li>
            <li><strong>API:</strong> <code>https://person.aidenlippert.workers.dev/api</code></li>
          </ul>
          
          <h2>Simulated Endpoints:</h2>
          <ul>
            <li><a href="/rpc/abci_info">ABCI Info</a></li>
            <li><a href="/rpc/genesis">Genesis</a></li>
            <li><a href="/rpc/health">Health</a></li>
            <li><a href="/rpc/status">Status (Real)</a></li>
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
  
  // Handle simulated responses for missing endpoints
  if (simulateResponse) {
    let endpoint = url.pathname.replace('/rpc', '')
    let response = {}
    
    if (endpoint === '/abci_info') {
      response = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          response: {
            data: "PersonaChain",
            version: "1.0.0",
            app_version: "1",
            last_block_height: "1000",
            last_block_app_hash: "0000000000000000000000000000000000000000000000000000000000000000"
          }
        }
      }
    } else if (endpoint === '/genesis') {
      response = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          genesis: {
            genesis_time: "2025-01-01T00:00:00Z",
            chain_id: "persona-mainnet-1",
            initial_height: "1",
            consensus_params: {
              block: {
                max_bytes: "22020096",
                max_gas: "-1",
                time_iota_ms: "1000"
              },
              evidence: {
                max_age_num_blocks: "100000",
                max_age_duration: "172800000000000",
                max_bytes: "1048576"
              },
              validator: {
                pub_key_types: ["ed25519"]
              },
              version: {}
            },
            app_hash: "",
            app_state: {
              bank: {
                balances: [],
                supply: [],
                denom_metadata: []
              },
              staking: {
                validators: [],
                delegations: [],
                unbonding_delegations: [],
                redelegations: [],
                exported: false
              }
            }
          }
        }
      }
    } else if (endpoint === '/health') {
      response = {
        jsonrpc: "2.0",
        id: 1,
        result: {}
      }
    }
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  }
  
  // Forward real requests to blockchain
  if (targetUrl) {
    try {
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
}