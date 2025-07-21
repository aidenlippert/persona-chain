// Vercel Edge Function - HTTPS Proxy for PersonaChain
// This resolves Mixed Content errors by providing HTTPS endpoints

export default async function handler(request, response) {
  // Enable CORS for wallet connections
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    const { url } = request;
    const { searchParams } = new URL(url, `https://${request.headers.host}`);
    
    // Get the target endpoint from query parameter
    const endpoint = searchParams.get('endpoint') || '';
    const path = searchParams.get('path') || '';
    
    if (!endpoint) {
      return response.status(400).json({ 
        error: 'Missing endpoint parameter. Use ?endpoint=rpc or ?endpoint=api' 
      });
    }

    // PersonaChain endpoints
    const PERSONACHAIN_RPC = 'http://34.170.121.182:26657';
    const PERSONACHAIN_API = 'http://34.170.121.182:1317';
    
    let targetUrl;
    if (endpoint === 'rpc') {
      targetUrl = `${PERSONACHAIN_RPC}${path}`;
    } else if (endpoint === 'api') {
      targetUrl = `${PERSONACHAIN_API}${path}`;
    } else {
      return response.status(400).json({ 
        error: 'Invalid endpoint. Use rpc or api' 
      });
    }

    console.log(`Proxying ${request.method} request to: ${targetUrl}`);

    // Forward the request to PersonaChain
    const fetchOptions = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PersonaPass-Proxy/1.0'
      }
    };

    // Forward request body for POST requests
    if (request.method === 'POST' && request.body) {
      fetchOptions.body = JSON.stringify(request.body);
    }

    const personaChainResponse = await fetch(targetUrl, fetchOptions);
    const data = await personaChainResponse.text();

    // Set content type based on response
    const contentType = personaChainResponse.headers.get('content-type') || 'application/json';
    response.setHeader('Content-Type', contentType);

    // Return the response
    return response.status(personaChainResponse.status).send(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return response.status(500).json({ 
      error: 'Proxy server error', 
      details: error.message 
    });
  }
}