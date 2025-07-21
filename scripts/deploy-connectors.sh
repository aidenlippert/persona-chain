#!/bin/bash

# PersonaPass Connector Quick Deployment Script
# This script sets up the connector infrastructure for immediate testing

set -e

echo "🚀 PersonaPass Connector Deployment Script"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Setup connector structure
setup_connectors() {
    echo -e "${YELLOW}Setting up connector infrastructure...${NC}"
    
    cd apps/connectors
    
    # Initialize main package.json if not exists
    if [ ! -f "package.json" ]; then
        npm init -y
        
        # Install shared dependencies
        npm install express cors helmet ioredis dotenv axios jsonwebtoken jose \
            @noble/curves uint8arrays uuid poseidon-lite snarkjs
        
        npm install -D typescript @types/node @types/express @types/cors \
            @types/jsonwebtoken nodemon tsx vitest @playwright/test
    fi
    
    # Create TypeScript config
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

    # Create a simple Docker Compose for development
    cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  github-connector:
    build:
      context: .
      dockerfile: github/Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    env_file:
      - ./github/.env
    depends_on:
      redis:
        condition: service_healthy
    volumes:
      - ./github:/app
      - /app/node_modules

volumes:
  redis_data:
EOF

    # Create development Dockerfile
    cat > github/Dockerfile.dev << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "dev"]
EOF

    echo -e "${GREEN}✅ Connector infrastructure ready${NC}"
}

# Create environment templates
create_env_templates() {
    echo -e "${YELLOW}Creating environment templates...${NC}"
    
    # GitHub connector env template
    cat > github/.env.example << 'EOF'
PORT=3001
NODE_ENV=development

# OAuth Settings (Get from https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3001/api/v1/github/callback

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=dev-secret-please-change-in-production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Issuer Configuration
ISSUER_DID=did:web:localhost
ISSUER_NAME=PersonaPass Local Development

# Ed25519 Keys (Generate with: node scripts/generate-keys.js)
ISSUER_PRIVATE_KEY={"kty":"OKP","crv":"Ed25519","d":"...","x":"..."}
ISSUER_PUBLIC_KEY={"kty":"OKP","crv":"Ed25519","x":"..."}

# Frontend
FRONTEND_URL=http://localhost:5173
EOF

    # Copy template for other connectors
    for connector in linkedin orcid plaid twitter stackexchange; do
        cp github/.env.example $connector/.env.example
        sed -i.bak "s/3001/300${RANDOM:0:1}/g" $connector/.env.example
        sed -i.bak "s/github/$connector/g" $connector/.env.example
        rm $connector/.env.example.bak
    done
    
    echo -e "${GREEN}✅ Environment templates created${NC}"
}

# Generate cryptographic keys
generate_keys() {
    echo -e "${YELLOW}Generating Ed25519 keys for VC signing...${NC}"
    
    # Create key generation script
    cat > scripts/generate-keys.js << 'EOF'
const { generateKeyPair, exportJWK } = require('jose');

async function generateKeys() {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA', {
        crv: 'Ed25519',
    });
    
    const publicJWK = await exportJWK(publicKey);
    const privateJWK = await exportJWK(privateKey);
    
    console.log('ISSUER_PRIVATE_KEY=' + JSON.stringify(privateJWK));
    console.log('ISSUER_PUBLIC_KEY=' + JSON.stringify(publicJWK));
}

generateKeys().catch(console.error);
EOF

    node scripts/generate-keys.js > keys.env
    echo -e "${GREEN}✅ Keys generated and saved to keys.env${NC}"
}

# Setup wallet integration
setup_wallet_integration() {
    echo -e "${YELLOW}Setting up wallet frontend integration...${NC}"
    
    cd ../../apps/wallet
    
    # Add connector API URL to .env
    if ! grep -q "VITE_CONNECTOR_API_URL" .env 2>/dev/null; then
        echo "VITE_CONNECTOR_API_URL=http://localhost:8080" >> .env
    fi
    
    # Update package.json to include proxy for development
    if [ -f "vite.config.ts" ]; then
        # Check if proxy already exists
        if ! grep -q "proxy:" vite.config.ts; then
            cat > vite.config.ts.tmp << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA()],
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
EOF
            mv vite.config.ts.tmp vite.config.ts
        fi
    fi
    
    echo -e "${GREEN}✅ Wallet integration configured${NC}"
}

# Create simple API gateway
create_api_gateway() {
    echo -e "${YELLOW}Creating simple API gateway...${NC}"
    
    cd ../../apps/connectors
    
    cat > gateway.js << 'EOF'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Connector proxies
const connectors = {
  github: 'http://localhost:3001',
  linkedin: 'http://localhost:3002',
  orcid: 'http://localhost:3003',
  plaid: 'http://localhost:3004',
  twitter: 'http://localhost:3005',
  stackexchange: 'http://localhost:3006',
};

// Setup proxies
Object.entries(connectors).forEach(([name, target]) => {
  app.use(`/api/v1/${name}`, createProxyMiddleware({
    target,
    changeOrigin: true,
  }));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connectors: Object.keys(connectors) });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Available connectors:', Object.keys(connectors));
});
EOF

    # Install gateway dependencies
    npm install http-proxy-middleware
    
    echo -e "${GREEN}✅ API gateway created${NC}"
}

# Create start script
create_start_script() {
    echo -e "${YELLOW}Creating start script...${NC}"
    
    cat > start-dev.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting PersonaPass Connector Development Environment"

# Start Redis
echo "Starting Redis..."
docker run -d --name personapass-redis -p 6379:6379 redis:alpine

# Start connectors
echo "Starting connectors..."
cd apps/connectors

# Start each connector in background
for connector in github linkedin orcid plaid twitter stackexchange; do
    if [ -f "$connector/.env" ]; then
        echo "Starting $connector connector..."
        (cd $connector && npm run dev) &
    else
        echo "⚠️  Skipping $connector - no .env file found"
    fi
done

# Start API gateway
echo "Starting API gateway..."
node gateway.js &

# Start wallet frontend
echo "Starting wallet frontend..."
cd ../wallet
npm run dev &

echo "✅ All services started!"
echo ""
echo "Services running at:"
echo "- Wallet Frontend: http://localhost:5173"
echo "- API Gateway: http://localhost:8080"
echo "- Redis: localhost:6379"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait
EOF

    chmod +x start-dev.sh
    
    echo -e "${GREEN}✅ Start script created${NC}"
}

# Main execution
main() {
    check_prerequisites
    setup_connectors
    create_env_templates
    generate_keys
    setup_wallet_integration
    create_api_gateway
    create_start_script
    
    echo ""
    echo -e "${GREEN}🎉 Connector setup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Register OAuth apps on each platform:"
    echo "   - GitHub: https://github.com/settings/developers"
    echo "   - LinkedIn: https://www.linkedin.com/developers/"
    echo "   - ORCID: https://orcid.org/developer-tools"
    echo "   - Plaid: https://dashboard.plaid.com/"
    echo "   - Twitter: https://developer.twitter.com/"
    echo "   - StackExchange: https://stackapps.com/apps/oauth/register"
    echo ""
    echo "2. Copy .env.example to .env for each connector and add your OAuth credentials"
    echo ""
    echo "3. Add the Ed25519 keys from keys.env to each .env file"
    echo ""
    echo "4. Run ./start-dev.sh to start all services"
    echo ""
    echo "5. Visit http://localhost:5173/credentials to test the connectors!"
}

# Run main function
main