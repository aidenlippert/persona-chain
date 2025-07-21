#!/bin/bash
# Update Frontend Configuration for Production Blockchain
# Switches from localhost to production Google Cloud endpoints

set -e

EXTERNAL_IP=${1:-""}
FRONTEND_CONFIG="/home/rocz/persona-chain/apps/wallet/src/services/personaChainService.ts"

if [ -z "$EXTERNAL_IP" ]; then
    echo "❌ Usage: $0 <EXTERNAL_IP>"
    echo "   Example: $0 34.123.45.67"
    echo ""
    echo "🔍 To get your external IP after deployment:"
    echo "   kubectl -n personachain get svc personachain-service"
    exit 1
fi

echo "🔧 Updating frontend configuration..."
echo "External IP: $EXTERNAL_IP"

# Backup original config
cp "$FRONTEND_CONFIG" "$FRONTEND_CONFIG.backup"

# Update the PersonaChain service configuration
sed -i "s|rpcEndpoint: 'http://localhost:26657'|rpcEndpoint: 'http://$EXTERNAL_IP:26657'|g" "$FRONTEND_CONFIG"
sed -i "s|restEndpoint: 'http://localhost:8100'|restEndpoint: 'http://$EXTERNAL_IP:8100'|g" "$FRONTEND_CONFIG"

echo "✅ Frontend configuration updated!"
echo ""
echo "📝 Changes made:"
echo "  RPC Endpoint:  http://localhost:26657  →  http://$EXTERNAL_IP:26657"
echo "  REST Endpoint: http://localhost:8100   →  http://$EXTERNAL_IP:8100"
echo ""
echo "🔄 Restart your development server:"
echo "   cd /home/rocz/persona-chain/apps/wallet"
echo "   npm run dev"
echo ""
echo "🌐 Your wallet will now connect to the production blockchain!"
echo ""
echo "💾 Backup saved to: $FRONTEND_CONFIG.backup"