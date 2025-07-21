const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const app = express();
app.use(cors());
app.use(express.json());

// Plaid configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': '68767d9fff726d0023e27e50',
      'PLAID-SECRET': 'e441e726dca25352e2a19badf19fad',
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Store sessions
const sessions = new Map();

// Home page
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>PersonaPass Plaid Identity Connector</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .button { background: #4B3F6B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        .success { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info { background: #17a2b8; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
        .connector-list { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>🏦 PersonaPass Plaid Identity Connector</h1>
      <p>Verify your identity through secure bank account verification using Plaid.</p>
      
      <div class="info">
        <strong>Sandbox Mode:</strong> Use these test credentials when prompted:
        <ul>
          <li>Username: <code>user_good</code></li>
          <li>Password: <code>pass_good</code></li>
        </ul>
      </div>
      
      <a href="/link" class="button">Connect Bank Account</a>
      
      <div class="connector-list">
        <h3>🔗 Active Connectors:</h3>
        <ul>
          <li><a href="http://localhost:3001">GitHub</a> ✅</li>
          <li><a href="http://localhost:3002">LinkedIn</a> ✅</li>
          <li><strong>Plaid Identity</strong> (current) 🏦</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// Create Plaid Link token
app.get('/link', async (req, res) => {
  try {
    const linkTokenResponse = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: 'user-' + Date.now(),
      },
      client_name: 'PersonaPass',
      products: ['identity'],
      country_codes: ['US'],
      language: 'en',
    });
    
    const linkToken = linkTokenResponse.data.link_token;
    
    res.send(`
      <html>
      <head>
        <title>Connect Your Bank</title>
        <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .info { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Connect Your Bank Account</h1>
        <div class="info">
          <p>Click the button below to securely connect your bank account through Plaid.</p>
          <p><strong>Test Credentials:</strong></p>
          <ul>
            <li>Username: <code>user_good</code></li>
            <li>Password: <code>pass_good</code></li>
            <li>If asked for MFA: <code>1234</code></li>
          </ul>
        </div>
        
        <button id="link-button">Connect Bank Account</button>
        
        <script>
          const handler = Plaid.create({
            token: '${linkToken}',
            onSuccess: (public_token, metadata) => {
              // Send public token to server
              fetch('/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_token })
              })
              .then(response => response.json())
              .then(data => {
                window.location.href = '/success?session=' + data.sessionId;
              });
            },
            onExit: (err, metadata) => {
              console.log('User exited', err, metadata);
            },
            onEvent: (eventName, metadata) => {
              console.log('Event', eventName);
            }
          });
          
          document.getElementById('link-button').onclick = () => {
            handler.open();
          };
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).send('Error creating link token');
  }
});

// Exchange public token for access token and fetch identity
app.post('/exchange', async (req, res) => {
  try {
    const { public_token } = req.body;
    
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });
    
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    
    // Get identity information
    const identityResponse = await plaidClient.identityGet({
      access_token: accessToken,
    });
    
    const sessionId = 'session-' + Date.now();
    sessions.set(sessionId, {
      accessToken,
      itemId,
      identity: identityResponse.data,
    });
    
    res.json({ sessionId });
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Display success and credential
app.get('/success', async (req, res) => {
  const { session } = req.query;
  const sessionData = sessions.get(session);
  
  if (!sessionData) {
    return res.redirect('/');
  }
  
  const { identity } = sessionData;
  const account = identity.accounts[0];
  const identityData = identity.identity[0];
  
  // Generate verifiable credential
  const credential = {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential', 'PlaidIdentityCredential'],
    issuer: 'did:web:localhost',
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: `did:key:plaid-${Date.now()}`,
      name: identityData.names?.[0] || 'Not provided',
      emails: identityData.emails || [],
      phoneNumbers: identityData.phone_numbers || [],
      addresses: identityData.addresses || [],
      dateOfBirth: identityData.date_of_birth,
      institution: account.name,
      mask: account.mask,
      verifiedAt: new Date().toISOString(),
    }
  };
  
  res.send(`
    <html>
    <head>
      <title>Identity Verified!</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .success { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .data-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
        .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 5px; }
      </style>
    </head>
    <body>
      <h1>✅ Identity Verified Successfully!</h1>
      
      <div class="success">
        Your bank-verified identity has been imported as a verifiable credential!
      </div>
      
      <div class="data-box">
        <h2>Verified Information</h2>
        <p><strong>Name:</strong> ${identityData.names?.[0] || 'Not provided'}</p>
        <p><strong>Institution:</strong> ${account.name}</p>
        <p><strong>Account:</strong> ****${account.mask || ''}</p>
        ${identityData.emails?.length ? `<p><strong>Emails:</strong> ${identityData.emails.map(e => e.data).join(', ')}</p>` : ''}
        ${identityData.phone_numbers?.length ? `<p><strong>Phone Numbers:</strong> ${identityData.phone_numbers.map(p => p.data).join(', ')}</p>` : ''}
      </div>
      
      <h2>Generated Verifiable Credential</h2>
      <pre>${JSON.stringify(credential, null, 2)}</pre>
      
      <a href="/" class="button">Verify Another Account</a>
      <a href="http://localhost:3000" class="button">Back to Dashboard</a>
    </body>
    </html>
  `);
});

// API endpoint for frontend integration
app.post('/api/v1/plaid/auth', async (req, res) => {
  try {
    const linkTokenResponse = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: req.body.userId || 'user-' + Date.now(),
      },
      client_name: 'PersonaPass',
      products: ['identity'],
      country_codes: ['US'],
      language: 'en',
    });
    
    res.json({
      linkToken: linkTokenResponse.data.link_token,
      sessionId: 'session-' + Date.now(),
      expiresIn: 1800 // 30 minutes
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

const PORT = 3004;
app.listen(PORT, () => {
  console.log(`
  ✅ Plaid Identity Connector Running!
  
  🏦 Test the identity verification:
     http://localhost:${PORT}
  
  📱 API endpoint for frontend:
     POST http://localhost:${PORT}/api/v1/plaid/auth
  
  🔑 Using Plaid Sandbox:
     Client ID: 68767d9fff726d0023e27e50
     Environment: Sandbox
     
  📝 Test Credentials:
     Username: user_good
     Password: pass_good
     MFA (if asked): 1234
  `);
});