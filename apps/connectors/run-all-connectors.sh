#!/bin/bash

echo "🚀 Starting PersonaPass Connectors"
echo "=================================="

# Start GitHub connector
echo "Starting GitHub connector on port 3001..."
node test-github-oauth.js &
GITHUB_PID=$!

# Start LinkedIn connector
echo "Starting LinkedIn connector on port 3002..."
node test-linkedin-oauth.js &
LINKEDIN_PID=$!

# Create a simple dashboard
cat > connector-dashboard.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>PersonaPass Connector Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 1000px; margin: 0 auto; }
        .connector { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
        .github { border-left: 4px solid #24292e; }
        .linkedin { border-left: 4px solid #0077b5; }
        .button { padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 5px; }
        .primary { background: #007bff; color: white; }
        .success { background: #28a745; color: white; }
        h1 { color: #333; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .active { background: #28a745; color: white; }
      </style>
    </head>
    <body>
      <h1>🔐 PersonaPass Connector Dashboard</h1>
      <p>Your credential connectors are running! Click on any connector to test the OAuth flow.</p>
      
      <div class="connector github">
        <h2>GitHub Connector <span class="status active">ACTIVE</span></h2>
        <p>Import your GitHub profile, repositories, and contributions as verifiable credentials.</p>
        <a href="http://localhost:3001" class="button primary">Test GitHub OAuth</a>
        <a href="http://localhost:3001/api/v1/github/auth" class="button">API Endpoint</a>
      </div>
      
      <div class="connector linkedin">
        <h2>LinkedIn Connector <span class="status active">ACTIVE</span></h2>
        <p>Import your professional profile and verified email as credentials.</p>
        <a href="http://localhost:3002" class="button primary">Test LinkedIn OAuth</a>
        <a href="http://localhost:3002/api/v1/linkedin/auth" class="button">API Endpoint</a>
      </div>
      
      <h2>🚀 Quick Integration Guide</h2>
      <pre style="background: #f6f8fa; padding: 16px; border-radius: 6px;">
// In your wallet frontend:
const response = await fetch('http://localhost:3001/api/v1/github/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user123' })
});

const { authUrl } = await response.json();
window.location.href = authUrl; // Redirect to OAuth provider
      </pre>
      
      <h2>✅ What's Working</h2>
      <ul>
        <li>OAuth 2.0 authorization flows</li>
        <li>User profile fetching</li>
        <li>Verifiable Credential generation</li>
        <li>API endpoints for frontend integration</li>
      </ul>
      
      <h2>🔗 Other Platforms</h2>
      <p>Ready to add more connectors? You'll need OAuth credentials from:</p>
      <ul>
        <li>ORCID: <a href="https://orcid.org/developer-tools">https://orcid.org/developer-tools</a></li>
        <li>Twitter/X: <a href="https://developer.twitter.com/">https://developer.twitter.com/</a></li>
        <li>StackExchange: <a href="https://stackapps.com/apps/oauth/register">https://stackapps.com/apps/oauth/register</a></li>
        <li>Plaid: <a href="https://dashboard.plaid.com/">https://dashboard.plaid.com/</a></li>
      </ul>
    </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('Dashboard running at http://localhost:3000');
});
EOF

# Start dashboard
echo "Starting connector dashboard on port 3000..."
node connector-dashboard.js &
DASHBOARD_PID=$!

echo ""
echo "✅ All connectors started!"
echo ""
echo "🌐 Access points:"
echo "   Dashboard: http://localhost:3000"
echo "   GitHub:    http://localhost:3001"
echo "   LinkedIn:  http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and cleanup on exit
trap "kill $GITHUB_PID $LINKEDIN_PID $DASHBOARD_PID 2>/dev/null; exit" INT
wait