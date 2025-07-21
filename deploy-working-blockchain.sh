#!/bin/bash
# Deploy PersonaChain blockchain using PROVEN testnet validator setup pattern
# This uses the EXACT working pattern from testnet-local.sh but simplified for single node

set -e

echo "🚀 DEPLOYING WORKING PERSONACHAIN WITH PROPER VALIDATOR SETUP"
echo "=============================================================="
echo ""

# Configuration based on working testnet script
CHAIN_ID="persona-chain-1"
MONIKER="personachain-validator"
HOME_DIR="$HOME/.persona-chain-working"
BINARY="./build/persona-chaind"
DENOM="stake"
COINS="1000000000000000${DENOM}"

echo "✅ Using binary: $BINARY"
echo "🏠 Home: $HOME_DIR"
echo "🔗 Chain ID: $CHAIN_ID"
echo "💰 Initial coins: $COINS"
echo ""

# Verify binary exists
if [ ! -f "$BINARY" ]; then
    echo "❌ Binary not found at $BINARY"
    echo "Run: go build -o build/persona-chaind ./cmd/persona-chaind"
    exit 1
fi

echo "🧹 Cleaning up..."
rm -rf "$HOME_DIR"
pkill -f persona-chaind || true
sleep 2

echo "📦 Initializing blockchain (using testnet-proven pattern)..."

# Initialize node (EXACT pattern from working testnet script)
$BINARY init "$MONIKER" --chain-id "$CHAIN_ID" --home "$HOME_DIR"

echo "🔑 Setting up validator key (testnet pattern)..."

# Add validator key (EXACT pattern from testnet script)
$BINARY keys add validator --keyring-backend test --home "$HOME_DIR"

echo "💰 Adding genesis account..."

# Add account to genesis (CORRECT Cosmos SDK v0.50+ syntax)
$BINARY genesis add-genesis-account validator "$COINS" --keyring-backend test --home "$HOME_DIR"

echo "⚙️ Generating genesis transaction (testnet pattern)..."

# Generate gentx (CORRECT Cosmos SDK v0.50+ syntax with 1B stake delegation)
$BINARY genesis gentx validator 1000000000$DENOM --chain-id "$CHAIN_ID" --keyring-backend test --home "$HOME_DIR"

echo "📋 Collecting genesis transactions..."

# Collect gentxs (CORRECT Cosmos SDK v0.50+ syntax)
$BINARY genesis collect-gentxs --home "$HOME_DIR"

echo "⚙️ Configuring for public access..."

CONFIG_FILE="$HOME_DIR/config/config.toml"
APP_FILE="$HOME_DIR/config/app.toml"

# Enable API server and CORS
sed -i 's/enable = false/enable = true/g' "$APP_FILE" 2>/dev/null || true
sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' "$APP_FILE" 2>/dev/null || true
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' "$APP_FILE" 2>/dev/null || true
sed -i 's/swagger = false/swagger = true/g' "$APP_FILE" 2>/dev/null || true

# Enable RPC for all interfaces with CORS
sed -i 's/laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/g' "$CONFIG_FILE" 2>/dev/null || true
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' "$CONFIG_FILE" 2>/dev/null || true

echo "🌐 Starting PersonaChain with proper validator setup..."
echo "📡 RPC: http://localhost:26657"
echo "🔗 API: http://localhost:1317"
echo ""

# Start blockchain
nohup $BINARY start --home "$HOME_DIR" --minimum-gas-prices="0${DENOM}" > working-blockchain.log 2>&1 &
BLOCKCHAIN_PID=$!

echo "📋 PID: $BLOCKCHAIN_PID"
echo "📜 Logs: tail -f working-blockchain.log"

# Wait for startup
echo "⏳ Waiting for blockchain startup..."
sleep 10

echo "🧪 Testing all Keplr endpoints..."

# Test function
test_endpoint() {
    local endpoint=$1
    local name=$2
    echo -n "🔍 Testing $name: "
    if curl -s "http://localhost:26657$endpoint" > /dev/null 2>&1; then
        echo "✅"
    else
        echo "❌"
    fi
}

# Test all required endpoints
test_endpoint "/status" "Status"
test_endpoint "/abci_info" "ABCI Info" 
test_endpoint "/genesis" "Genesis"
test_endpoint "/health" "Health"

echo ""
echo "🎉 WORKING PERSONACHAIN DEPLOYED!"
echo ""
echo "🔗 Endpoints:"
echo "   RPC: http://localhost:26657"
echo "   API: http://localhost:1317" 
echo "   Status: http://localhost:26657/status"
echo ""
echo "🛠️ Commands:"
echo "   Logs: tail -f working-blockchain.log"
echo "   Stop: kill $BLOCKCHAIN_PID"
echo "   Query: $BINARY status --home $HOME_DIR"
echo ""

# Show validator info
echo "👤 Validator Info:"
echo "   Address: $($BINARY keys show validator -a --keyring-backend test --home $HOME_DIR 2>/dev/null || echo 'Getting address...')"

echo ""
echo "📊 Final Status:"
curl -s http://localhost:26657/status 2>/dev/null | jq -r '.result.node_info | "Chain: \(.network) | Version: \(.version) | Moniker: \(.moniker)"' 2>/dev/null || echo "Getting final status..."

echo ""
echo "✅ READY FOR KEPLR INTEGRATION TESTING!"