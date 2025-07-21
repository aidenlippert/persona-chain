#!/bin/bash

# Quick Cloudflare Worker deployment for PersonaChain HTTPS proxy

echo "🚀 Deploying PersonaChain HTTPS proxy to Cloudflare Workers..."

# Try to deploy using npx wrangler (works without account for simple deployments)
echo "📋 Step 1: Deploy worker to Cloudflare..."

cd /home/rocz/persona-chain

# Create a simple deployment using wrangler
npx wrangler deploy cloudflare-worker.js --name personachain-proxy --compatibility-date 2024-01-01 --no-bundle || {
    echo "❌ Direct deployment failed - authentication required"
    echo ""
    echo "🔧 Alternative: Manual Cloudflare Worker Setup"
    echo ""
    echo "1. Go to https://workers.cloudflare.com"
    echo "2. Click 'Create a Worker'"
    echo "3. Replace the default code with the contents of cloudflare-worker.js"
    echo "4. Click 'Save and Deploy'"
    echo "5. You'll get a URL like: https://personachain-proxy.YOUR-ACCOUNT.workers.dev"
    echo ""
    echo "Then update your wallet configuration with:"
    echo "VITE_PERSONA_CHAIN_RPC=https://personachain-proxy.YOUR-ACCOUNT.workers.dev/rpc"
    echo "VITE_BLOCKCHAIN_REST=https://personachain-proxy.YOUR-ACCOUNT.workers.dev/api"
    exit 1
}

echo "✅ Cloudflare Worker deployed successfully!"