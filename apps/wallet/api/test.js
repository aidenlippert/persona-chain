export default async function handler(req, res) {
  console.log('🧪 TEST API ROUTE HIT!');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  return res.status(200).json({
    success: true,
    message: 'TEST API ROUTE WORKING!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}