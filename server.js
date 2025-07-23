const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting PersonaPass Wallet server...');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('📍 Port:', process.env.PORT);
console.log('📍 Working Directory:', process.cwd());

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse JSON bodies
app.use(express.json());

// Serve static files from the dist directory
const staticPath = path.join(__dirname, 'dist');
console.log('📁 Serving static files from:', staticPath);
app.use(express.static(staticPath));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  console.log('🧪 Test API endpoint called');
  res.status(200).json({ 
    success: true, 
    message: 'API routes working correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// GitHub OAuth API endpoint
app.all('/api/github-oauth', async (req, res) => {
  try {
    console.log('🔍 GitHub OAuth API endpoint called:', req.method, req.url);
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Body:', req.body);
    
    // Use dynamic import for ES module API handler
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

// Handle React Router - serve index.html for all non-API routes
app.get('*', (req, res) => {
  console.log('📄 Serving index.html for:', req.url);
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(indexPath);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PersonaPass Wallet server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 Server binding: 0.0.0.0:${PORT}`);
  console.log(`🔍 API endpoints: /health, /api/test, /api/github-oauth`);
  console.log(`📁 Static files served from: ${staticPath}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});