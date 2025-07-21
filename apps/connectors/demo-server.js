const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock GitHub connector endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'github-connector-demo',
    message: 'Connector is ready! Please register OAuth app to enable full functionality.'
  });
});

app.post('/api/v1/github/auth', (req, res) => {
  res.json({
    message: 'OAuth flow would start here',
    nextStep: 'Register a GitHub OAuth app at https://github.com/settings/developers',
    authUrl: 'https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID',
    sessionId: 'demo-session-' + Date.now()
  });
});

app.get('/api/v1/github/schema', (req, res) => {
  res.json({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "username": { "type": "string" },
      "publicRepos": { "type": "integer" },
      "followers": { "type": "integer" }
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`
  ✅ GitHub Connector Demo running on port ${PORT}
  
  Next steps to enable full OAuth:
  1. Go to https://github.com/settings/developers
  2. Click "New OAuth App"
  3. Use these settings:
     - Application name: PersonaPass Dev
     - Homepage URL: http://localhost:5173
     - Callback URL: http://localhost:3001/api/v1/github/callback
  4. Update github/.env with your Client ID and Secret
  5. Restart this server
  
  Test the demo: curl http://localhost:3001/health
  `);
});
