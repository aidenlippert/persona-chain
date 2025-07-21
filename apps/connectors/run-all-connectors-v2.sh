#!/bin/bash

echo "🚀 Starting PersonaPass Connectors v2"
echo "===================================="

# Kill any existing processes on our ports
for port in 3000 3001 3002 3004; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done

# Start GitHub connector
echo "Starting GitHub connector on port 3001..."
node test-github-oauth.js &
GITHUB_PID=$!

# Start LinkedIn connector
echo "Starting LinkedIn connector on port 3002..."
node test-linkedin-oauth.js &
LINKEDIN_PID=$!

# Start Plaid connector
echo "Starting Plaid connector on port 3004..."
node test-plaid-identity.js &
PLAID_PID=$!

# Give services time to start
sleep 2

# Create enhanced dashboard
cat > enhanced-dashboard.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>PersonaPass Connector Dashboard</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 16px; margin-bottom: 30px; text-align: center; }
        .connector-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin: 30px 0; }
        .connector { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .connector:hover { transform: translateY(-4px); box-shadow: 0 8px 12px rgba(0,0,0,0.15); }
        .github { border-top: 4px solid #24292e; }
        .linkedin { border-top: 4px solid #0077b5; }
        .plaid { border-top: 4px solid #4B3F6B; }
        .button { padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 5px; font-weight: 600; transition: all 0.2s; }
        .primary { background: #667eea; color: white; }
        .primary:hover { background: #5a67d8; }
        .secondary { background: #e2e8f0; color: #4a5568; }
        .secondary:hover { background: #cbd5e0; }
        h1 { margin: 0; }
        .status { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
        .active { background: #10b981; color: white; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #718096; font-size: 0.9em; margin-top: 5px; }
        .code-snippet { background: #1a202c; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Fira Code', monospace; font-size: 14px; overflow-x: auto; margin: 20px 0; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { padding: 10px 0; padding-left: 30px; position: relative; }
        .feature-list li:before { content: "✅"; position: absolute; left: 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 PersonaPass Connector Dashboard</h1>
        <p style="font-size: 1.2em; margin-top: 10px;">Import verified credentials from trusted platforms</p>
      </div>
      
      <div class="stats">
        <div class="stat-card">
          <div class="stat-number">3</div>
          <div class="stat-label">Active Connectors</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">6</div>
          <div class="stat-label">Supported Platforms</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">∞</div>
          <div class="stat-label">Privacy Guaranteed</div>
        </div>
      </div>
      
      <div class="connector-grid">
        <div class="connector github">
          <h2>GitHub <span class="status active">ACTIVE</span></h2>
          <p>Import your developer profile, repositories, contributions, and verification status as verifiable credentials.</p>
          <ul class="feature-list">
            <li>Profile & verification status</li>
            <li>Repository statistics</li>
            <li>Contribution history</li>
            <li>Developer reputation</li>
          </ul>
          <a href="http://localhost:3001" class="button primary">Test GitHub OAuth</a>
          <a href="#" class="button secondary" onclick="alert('API: POST http://localhost:3001/api/v1/github/auth')">View API</a>
        </div>
        
        <div class="connector linkedin">
          <h2>LinkedIn <span class="status active">ACTIVE</span></h2>
          <p>Import your professional identity, verified email, and career information as credentials.</p>
          <ul class="feature-list">
            <li>Professional profile</li>
            <li>Verified email address</li>
            <li>Name & location</li>
            <li>Industry information</li>
          </ul>
          <a href="http://localhost:3002" class="button primary">Test LinkedIn OAuth</a>
          <a href="#" class="button secondary" onclick="alert('API: POST http://localhost:3002/api/v1/linkedin/auth')">View API</a>
        </div>
        
        <div class="connector plaid">
          <h2>Plaid Identity <span class="status active">ACTIVE</span></h2>
          <p>Verify your identity through secure bank account verification powered by Plaid.</p>
          <ul class="feature-list">
            <li>Bank-verified identity</li>
            <li>Name & contact info</li>
            <li>Address verification</li>
            <li>Financial institution link</li>
          </ul>
          <a href="http://localhost:3004" class="button primary">Test Plaid Link</a>
          <a href="#" class="button secondary" onclick="alert('API: POST http://localhost:3004/api/v1/plaid/auth')">View API</a>
        </div>
      </div>
      
      <h2 style="margin-top: 40px;">🚀 Integration Example</h2>
      <div class="code-snippet">
// Frontend integration example
const response = await fetch('http://localhost:3001/api/v1/github/auth', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ userId: 'user123' })
});

const { authUrl, sessionId } = await response.json();
window.location.href = authUrl; // Redirect to OAuth provider
      </div>
      
      <h2>📊 What's Next?</h2>
      <div style="background: white; padding: 30px; border-radius: 12px; margin: 20px 0;">
        <h3>Ready to add more connectors?</h3>
        <p>Expand your credential ecosystem with these platforms:</p>
        <ul>
          <li><strong>ORCID:</strong> Academic and research credentials - <a href="https://orcid.org/developer-tools">Get credentials</a></li>
          <li><strong>Twitter/X:</strong> Social media verification - <a href="https://developer.twitter.com/">Get credentials</a></li>
          <li><strong>StackExchange:</strong> Technical expertise verification - <a href="https://stackapps.com/apps/oauth/register">Get credentials</a></li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 40px; color: #718096;">
        <p>PersonaPass - Building the future of decentralized identity</p>
      </div>
    </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('Enhanced dashboard running at http://localhost:3000');
});
EOF

# Start enhanced dashboard
echo "Starting enhanced dashboard on port 3000..."
node enhanced-dashboard.js &
DASHBOARD_PID=$!

echo ""
echo "✅ All connectors started!"
echo ""
echo "🌐 Access points:"
echo "   Dashboard:  http://localhost:3000 (Enhanced UI)"
echo "   GitHub:     http://localhost:3001 ✅"
echo "   LinkedIn:   http://localhost:3002 ✅"
echo "   Plaid:      http://localhost:3004 ✅"
echo ""
echo "💡 Plaid Test Credentials:"
echo "   Username: user_good"
echo "   Password: pass_good"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to check if services are running
check_services() {
  echo ""
  echo "🔍 Service Status:"
  for port in 3000 3001 3002 3004; do
    if lsof -i:$port > /dev/null 2>&1; then
      echo "   Port $port: ✅ Running"
    else
      echo "   Port $port: ❌ Not running"
    fi
  done
}

# Check services after 3 seconds
sleep 3
check_services

# Wait and cleanup on exit
trap "kill $GITHUB_PID $LINKEDIN_PID $PLAID_PID $DASHBOARD_PID 2>/dev/null; echo 'Services stopped'; exit" INT
wait