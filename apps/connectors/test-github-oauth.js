const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Your GitHub OAuth credentials
const GITHUB_CLIENT_ID = 'Ov23lifeCftrdv4dcMBW';
const GITHUB_CLIENT_SECRET = 'd1c2781ad3391283d62721cfee7239f3465af27b';
const REDIRECT_URI = 'http://localhost:3001/callback';

// Store sessions in memory (for demo)
const sessions = new Map();

// Home page with connect button
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>PersonaPass GitHub Connector Test</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .button { background: #24292e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .success { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .error { background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>PersonaPass GitHub Connector Test</h1>
      <p>Click the button below to test the GitHub OAuth flow:</p>
      <a href="/auth" class="button">Connect GitHub Account</a>
    </body>
    </html>
  `);
});

// Start OAuth flow
app.get('/auth', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  sessions.set(state, { timestamp: Date.now() });
  
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=read:user%20user:email&` +
    `state=${state}`;
  
  res.redirect(authUrl);
});

// OAuth callback
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.send(`
      <html><body>
        <h1>Error</h1>
        <div class="error">OAuth error: ${error}</div>
        <a href="/">Try again</a>
      </body></html>
    `);
  }
  
  // Verify state
  if (!sessions.has(state)) {
    return res.send(`
      <html><body>
        <h1>Error</h1>
        <div class="error">Invalid state parameter</div>
        <a href="/">Try again</a>
      </body></html>
    `);
  }
  
  try {
    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI
      },
      {
        headers: { 'Accept': 'application/json' }
      }
    );
    
    const { access_token } = tokenResponse.data;
    
    // Fetch user data
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json'
      }
    });
    
    const userData = userResponse.data;
    
    // Generate mock VC
    const credential = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential', 'GitHubCredential'],
      issuer: 'did:web:localhost',
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:key:user-${userData.id}`,
        username: userData.login,
        name: userData.name,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        createdAt: userData.created_at
      }
    };
    
    res.send(`
      <html>
      <head>
        <title>Success!</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .success { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Success! 🎉</h1>
        <div class="success">
          GitHub account connected successfully!
        </div>
        
        <h2>User Profile</h2>
        <p><strong>Username:</strong> @${userData.login}</p>
        <p><strong>Name:</strong> ${userData.name || 'Not set'}</p>
        <p><strong>Public Repos:</strong> ${userData.public_repos}</p>
        <p><strong>Followers:</strong> ${userData.followers}</p>
        
        <h2>Generated Verifiable Credential</h2>
        <pre>${JSON.stringify(credential, null, 2)}</pre>
        
        <p><a href="/">Connect another account</a></p>
      </body>
      </html>
    `);
    
    // Clean up session
    sessions.delete(state);
    
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error);
    res.send(`
      <html><body>
        <h1>Error</h1>
        <div class="error">Failed to complete OAuth flow: ${error.message}</div>
        <a href="/">Try again</a>
      </body></html>
    `);
  }
});

// API endpoint for frontend
app.post('/api/v1/github/auth', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const sessionId = `session-${Date.now()}`;
  sessions.set(state, { sessionId, timestamp: Date.now() });
  
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=read:user%20user:email&` +
    `state=${state}`;
  
  res.json({
    authUrl,
    sessionId,
    expiresIn: 600
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`
  ✅ GitHub OAuth Test Server Running!
  
  🚀 Test the OAuth flow:
     http://localhost:${PORT}
  
  📱 API endpoint for frontend:
     POST http://localhost:${PORT}/api/v1/github/auth
  
  🔑 Using your GitHub OAuth app:
     Client ID: ${GITHUB_CLIENT_ID}
     Redirect URI: ${REDIRECT_URI}
  `);
});