/**
 * Simple test function to verify Vercel serverless deployment
 */

export default function handler(req: any, res: any) {
  console.log('🧪 Test API function called:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Test API function is working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    deployment: 'vercel-serverless'
  });
}