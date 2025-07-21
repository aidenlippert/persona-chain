// Vercel API Route - HTTPS Proxy for PersonaChain REST API
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the path from the route
    const { path } = req.query;
    const apiPath = Array.isArray(path) ? '/' + path.join('/') : (path ? '/' + path : '');
    
    // Construct target URL
    const targetUrl = `http://34.170.121.182:1317${apiPath}`;
    const searchParams = new URLSearchParams(req.url.split('?')[1] || '');
    const fullUrl = searchParams.toString() ? `${targetUrl}?${searchParams}` : targetUrl;

    console.log(`[API PROXY] ${req.method} ${req.url} → ${fullUrl}`);

    // Forward request to PersonaChain
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PersonaPass-Proxy/1.0'
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text();
    
    // Set content type from response
    const contentType = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    return res.status(response.status).send(data);

  } catch (error) {
    console.error('[API PROXY] Error:', error);
    return res.status(500).json({ 
      error: 'Proxy server error', 
      details: error.message 
    });
  }
}