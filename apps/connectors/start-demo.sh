#!/bin/bash

echo "🚀 Starting PersonaPass Connector Demo Environment"
echo "================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Start Redis if not running
if ! docker ps | grep -q personapass-redis; then
    echo -e "${YELLOW}Starting Redis...${NC}"
    docker run -d --name personapass-redis -p 6379:6379 redis:alpine
    sleep 2
else
    echo -e "${GREEN}Redis already running${NC}"
fi

# Create mock OAuth app settings
echo -e "${YELLOW}Creating demo OAuth configuration...${NC}"

# Update GitHub .env with demo credentials
cat > github/.env << 'EOF'
PORT=3001
NODE_ENV=development
GITHUB_CLIENT_ID=demo_github_client_id
GITHUB_CLIENT_SECRET=demo_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3001/api/v1/github/callback
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret-please-change-in-production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
ISSUER_DID=did:web:localhost
ISSUER_NAME=PersonaPass Local Development
ISSUER_PRIVATE_KEY={"crv":"Ed25519","d":"WpLtiRGMeLDO7yOhtoHBJyUD2n2EALPGKpmiGRUq3vM","x":"yBJUjPQnMEWA2_l_czr8YnhJKIdClNzSflYjF4Qvzw8","kty":"OKP"}
ISSUER_PUBLIC_KEY={"crv":"Ed25519","x":"yBJUjPQnMEWA2_l_czr8YnhJKIdClNzSflYjF4Qvzw8","kty":"OKP"}
FRONTEND_URL=http://localhost:5173
EOF

# Create a simple demo server that shows the connector is working
cat > demo-server.js << 'EOF'
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
EOF

# Update wallet to show connector status
echo -e "${YELLOW}Updating wallet configuration...${NC}"
cd ../wallet
if ! grep -q "VITE_CONNECTOR_API_URL" .env 2>/dev/null; then
    echo "VITE_CONNECTOR_API_URL=http://localhost:3001" >> .env
fi

cd ../connectors

echo -e "${GREEN}✅ Demo environment ready!${NC}"
echo ""
echo "Starting demo server..."
node demo-server.js