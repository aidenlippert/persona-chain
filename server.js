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
    const handler = require('./api/github-oauth.js').default;
    await handler(req, res);
  } catch (error) {
    console.error('GitHub OAuth API error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
});