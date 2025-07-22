export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    success: true,
    message: "ROOT LEVEL API WORKS!",
    timestamp: new Date().toISOString()
  });
}