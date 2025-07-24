/**
 * 🚀 PERSONAPASS BACKEND SERVER
 * Railway deployment - API-only backend server
 * Handles OAuth callbacks, API routes, and backend services
 */

// BigInt serialization fix for Railway compatibility
if (typeof BigInt.prototype.toJSON === 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

const express = require('express');
const cors = require('cors');
const { fileURLToPath } = require('url');

const app = express();
const PORT = process.env.PORT || 8080;

// Configure CORS for frontend communication
const corsOptions = {
  origin: [
    'https://personapass.xyz',
    'https://www.personapass.xyz',
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

// GitHub OAuth init endpoint
app.get('/oauth/github/init', async (req, res) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'GitHub OAuth not configured' });
    }

    // Generate secure state parameter
    const state = Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15)
    })).toString('base64');

    // Build GitHub OAuth URL
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', 'https://api.personapass.xyz/oauth/github/callback');
    authUrl.searchParams.set('scope', 'user:email read:user');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    console.log(`🐙 GitHub OAuth init: ${authUrl.toString()}`);
    
    res.json({
      authUrl: authUrl.toString(),
      state: state,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GitHub OAuth init error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GitHub OAuth callback handler
app.get('/oauth/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    console.log('🐙 GitHub OAuth callback received:', {
      code: code ? code.substring(0, 8) + '...' : 'missing',
      state: state ? state.substring(0, 15) + '...' : 'missing',
      timestamp: new Date().toISOString()
    });

    if (!code) {
      return res.redirect('https://personapass.xyz/oauth/github/callback?error=no_code');
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.redirect('https://personapass.xyz/oauth/github/callback?error=oauth_not_configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('🐙 GitHub token exchange:', tokenData.access_token ? 'SUCCESS' : 'FAILED');

    if (tokenData.error) {
      return res.redirect(`https://personapass.xyz/oauth/github/callback?error=${tokenData.error}`);
    }

    // Get user data
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'PersonaPass-App'
      }
    });

    const userData = await userResponse.json();
    console.log('🐙 GitHub user data:', userData.login || 'NO LOGIN');

    // Create credential data
    const credentialData = {
      id: `github-${userData.id}-${Date.now()}`,
      type: ['VerifiableCredential', 'GitHubProfile'],
      issuer: 'did:persona:github',
      credentialSubject: {
        id: `github:${userData.login}`,
        login: userData.login,
        name: userData.name,
        email: userData.email,
        bio: userData.bio,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        createdAt: userData.created_at,
        avatarUrl: userData.avatar_url,
        htmlUrl: userData.html_url,
        verificationTimestamp: new Date().toISOString()
      },
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    };

    // Redirect to frontend with credential data
    const credentialParam = encodeURIComponent(JSON.stringify(credentialData));
    res.redirect(`https://personapass.xyz/oauth/github/callback?credential=${credentialParam}&success=true`);
    
  } catch (error) {
    console.error('❌ GitHub OAuth callback error:', error);
    res.redirect(`https://personapass.xyz/oauth/github/callback?error=${encodeURIComponent(error.message)}`);
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