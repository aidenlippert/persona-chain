#!/bin/bash

# Deploy Cloudflare Worker for PersonaChain HTTPS Proxy
# This script deploys the worker to provide HTTPS access to the HTTP-only blockchain

echo "🚀 Deploying PersonaChain Cloudflare Worker..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Create wrangler.toml configuration
cat > wrangler.toml << EOF
name = "personachain-proxy"
main = "cloudflare-worker-gcp.js"
compatibility_date = "2023-05-18"

[env.production]
name = "personachain-proxy"
EOF

echo "📝 Created wrangler.toml configuration"

# Login to Cloudflare (if not already logged in)
echo "🔐 Logging in to Cloudflare..."
wrangler login

# Deploy the worker
echo "🚀 Deploying worker..."
wrangler deploy --env production

echo "✅ Worker deployed successfully!"
echo ""
echo "📌 Your worker URL will be displayed above."
echo "📌 Update the following environment variables in Vercel:"
echo ""
echo "VITE_BLOCKCHAIN_RPC=https://[your-worker-subdomain].workers.dev/rpc"
echo "VITE_BLOCKCHAIN_REST=https://[your-worker-subdomain].workers.dev/api"
echo ""
echo "🔧 To test the worker:"
echo "curl https://[your-worker-subdomain].workers.dev/status"