const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Your LinkedIn OAuth credentials
const LINKEDIN_CLIENT_ID = '861ja0f20lfhjp';
const LINKEDIN_CLIENT_SECRET = 'WPL_AP1.76rast4Wnu2rhqNK.vctKXw==';
const REDIRECT_URI = 'http://localhost:3002/callback';

// Store sessions in memory (for demo)
const sessions = new Map();

// Home page with connect button
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>PersonaPass LinkedIn Connector Test</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .button { background: #0077b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .success { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .error { background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>PersonaPass LinkedIn Connector Test</h1>
      <p>Click the button below to test the LinkedIn OAuth flow:</p>
      <a href="/auth" class="button">Connect LinkedIn Account</a>
      
      <h2>Available Connectors:</h2>
      <ul>
        <li><a href="http://localhost:3001">GitHub Connector</a> ✅</li>
        <li><strong>LinkedIn Connector</strong> (current)</li>
      </ul>
    </body>
    </html>
  `);
});

// Start OAuth flow
app.get('/auth', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  sessions.set(state, { timestamp: Date.now() });
  
  // LinkedIn OAuth 2.0 uses different scopes
  const scope = 'openid profile email';
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `state=${state}&` +
    `scope=${encodeURIComponent(scope)}`;
  
  res.redirect(authUrl);
});

// OAuth callback
app.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  if (error) {
    return res.send(`
      <html><body>
        <h1>Error</h1>
        <div class="error">OAuth error: ${error}<br>${error_description || ''}</div>
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
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token } = tokenResponse.data;
    
    // Fetch user profile using OpenID Connect
    const userResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const userData = userResponse.data;
    
    // Generate mock VC
    const credential = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential', 'LinkedInCredential'],
      issuer: 'did:web:localhost',
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:key:linkedin-${userData.sub}`,
        email: userData.email,
        emailVerified: userData.email_verified,
        name: userData.name,
        givenName: userData.given_name,
        familyName: userData.family_name,
        picture: userData.picture,
        locale: userData.locale
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
          img { max-width: 100px; border-radius: 50%; }
        </style>
      </head>
      <body>
        <h1>Success! 🎉</h1>
        <div class="success">
          LinkedIn account connected successfully!
        </div>
        
        <h2>User Profile</h2>
        ${userData.picture ? `<img src="${userData.picture}" alt="Profile picture">` : ''}
        <p><strong>Name:</strong> ${userData.name}</p>
        <p><strong>Email:</strong> ${userData.email} ${userData.email_verified ? '✓' : '(unverified)'}</p>
        <p><strong>Locale:</strong> ${userData.locale || 'Not set'}</p>
        
        <h2>Generated Verifiable Credential</h2>
        <pre>${JSON.stringify(credential, null, 2)}</pre>
        
        <p><a href="/">Connect another account</a> | <a href="http://localhost:3001">Try GitHub</a></p>
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
        <div class="error">
          Failed to complete OAuth flow: ${error.message}<br>
          ${error.response?.data ? `<pre>${JSON.stringify(error.response.data, null, 2)}</pre>` : ''}
        </div>
        <a href="/">Try again</a>
      </body></html>
    `);
  }
});

// API endpoint for frontend
app.post('/api/v1/linkedin/auth', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const sessionId = `session-${Date.now()}`;
  sessions.set(state, { sessionId, timestamp: Date.now() });
  
  const scope = 'openid profile email';
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `state=${state}&` +
    `scope=${encodeURIComponent(scope)}`;
  
  res.json({
    authUrl,
    sessionId,
    expiresIn: 600
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`
  ✅ LinkedIn OAuth Test Server Running!
  
  🚀 Test the OAuth flow:
     http://localhost:${PORT}
  
  📱 API endpoint for frontend:
     POST http://localhost:${PORT}/api/v1/linkedin/auth
  
  🔑 Using your LinkedIn OAuth app:
     Client ID: ${LINKEDIN_CLIENT_ID}
     Redirect URI: ${REDIRECT_URI}
     
  Note: Make sure you've added ${REDIRECT_URI} to your LinkedIn app's authorized redirect URLs!
  `);
});