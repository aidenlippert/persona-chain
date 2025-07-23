const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Parse JSON bodies
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GitHub OAuth API endpoint
app.all('/api/github-oauth', async (req, res) => {
  try {
    console.log('🔍 GitHub OAuth API endpoint called:', req.method, req.url);
    // Use dynamic import for ES module
    const { default: handler } = await import('./api/github-oauth.js');
    await handler(req, res);
  } catch (error) {
    console.error('❌ GitHub OAuth API error:', error);
    console.error('❌ Error details:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'API routes working correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Handle React Router - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PersonaPass Wallet server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 Access: http://localhost:${PORT}`);
  console.log(`🔍 API endpoints: /health, /api/test, /api/github-oauth`);
});