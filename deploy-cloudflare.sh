#!/bin/bash

echo "🚀 PersonaChain Cloudflare Worker Deployment Script"
echo "=================================================="
echo ""
echo "This script will help you deploy the HTTPS proxy for PersonaChain"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

echo "📝 Creating wrangler.toml configuration..."
cat > wrangler.toml << EOF
name = "person"
main = "cloudflare-worker.js"
compatibility_date = "2023-05-18"

[env.production]
workers_dev = true
route = "person.aidenlippert.workers.dev/*"
EOF

echo "✅ Configuration created!"
echo ""
echo "🔐 Please login to Cloudflare (if not already logged in):"
wrangler login

echo ""
echo "🚀 Deploying the updated worker..."
wrangler publish

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Add these environment variables:"
echo ""
echo "VITE_BLOCKCHAIN_RPC=https://person.aidenlippert.workers.dev/rpc"
echo "VITE_BLOCKCHAIN_REST=https://person.aidenlippert.workers.dev/api"
echo "VITE_CHAIN_ID=persona-chain-1"
echo "VITE_BLOCKCHAIN_NETWORK=persona-chain"
echo ""
echo "3. Redeploy your Vercel app"
echo ""
echo "🎉 Then test your Keplr integration - it should work!"