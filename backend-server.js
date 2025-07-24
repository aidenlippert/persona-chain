/**
 * 🚀 PERSONAPASS BACKEND SERVER
 * Railway deployment - API-only backend server
 * Handles OAuth callbacks, API routes, and backend services
 */

const express = require('express');
const cors = require('cors');
const { fileURLToPath } = require('url');

const app = express();
const PORT = process.env.PORT || 8080;

// Configure CORS for frontend communication
const corsOptions = {
  origin: [
    'https://personapass.vercel.app',
    'https://wallet-git-master-aiden-lipperts-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'PersonaPass Backend API',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PersonaPass Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health - Health check',
      '/api/oauth/github - GitHub OAuth handling',
      '/api/credentials - Credential management',
      '/api/auth - Authentication services'
    ]
  });
});

// OAuth callback handlers
app.get('/oauth/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    console.log('🐙 GitHub OAuth callback received:', {
      code: code ? code.substring(0, 8) + '...' : 'missing',
      state: state ? state.substring(0, 15) + '...' : 'missing',
      timestamp: new Date().toISOString()
    });

    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code',
        timestamp: new Date().toISOString()
      });
    }

    // Here you would normally:
    // 1. Exchange code for access token
    // 2. Validate state parameter
    // 3. Get user data from GitHub
    // 4. Store credentials securely
    
    // For now, redirect back to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'https://personapass.vercel.app';
    const redirectUrl = `${frontendUrl}/oauth/github/success?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    
    console.log('🔄 Redirecting to frontend:', redirectUrl);
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ GitHub OAuth callback error:', error);
    res.status(500).json({
      error: 'OAuth callback failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes placeholder
app.use('/api', (req, res) => {
  res.json({
    message: 'PersonaPass API v1.0',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PersonaPass Backend API running on port ${PORT}`);
  console.log(`🌐 Server binding: 0.0.0.0:${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

module.exports = app;