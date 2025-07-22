/**
 * Simple JavaScript test function for Vercel deployment
 */

export default function handler(req, res) {
  console.log('🧪 Hello API function called:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Hello from Vercel serverless function!',
    method: req.method,
    timestamp: new Date().toISOString(),
    deployment: 'vercel-serverless',
    working: true
  });
}