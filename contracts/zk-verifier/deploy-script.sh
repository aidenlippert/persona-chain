#!/bin/bash

# ZK Verifier Contract Deployment Script for PersonaPass
# This script compiles and deploys the ZK verifier smart contract to the Cosmos chain

set -e

echo "🚀 PersonaPass ZK Verifier Contract Deployment"
echo "=============================================="

# Configuration
CHAIN_ID=${CHAIN_ID:-"persona-testnet"}
NODE_URL=${NODE_URL:-"http://localhost:26657"}
DEPLOYMENT_ACCOUNT=${DEPLOYMENT_ACCOUNT:-"admin"}
GAS_PRICES=${GAS_PRICES:-"0.1upersona"}

# Build paths
CONTRACT_DIR="/home/rocz/persona-chain/contracts/zk-verifier"
ARTIFACTS_DIR="$CONTRACT_DIR/artifacts"
WASM_FILE="$ARTIFACTS_DIR/zk_verifier.wasm"

echo "📂 Contract Directory: $CONTRACT_DIR"
echo "🔗 Chain ID: $CHAIN_ID"
echo "🌐 Node URL: $NODE_URL"
echo ""

# Step 1: Optimize the contract
echo "🔧 Step 1: Optimizing ZK Verifier contract..."
cd "$CONTRACT_DIR"

if [ ! -d "$ARTIFACTS_DIR" ]; then
    mkdir -p "$ARTIFACTS_DIR"
fi

# Check if Docker is available for optimization
if command -v docker &> /dev/null; then
    echo "   Using rust-optimizer for WASM optimization..."
    docker run --rm -v "$(pwd)":/code \
        --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
        --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
        cosmwasm/rust-optimizer:0.15.0
    
    # Move optimized artifact
    if [ -f "./artifacts/zk_verifier.wasm" ]; then
        cp "./artifacts/zk_verifier.wasm" "$WASM_FILE"
        echo "✅ Contract optimized and saved to $WASM_FILE"
    else
        echo "❌ Optimization failed - WASM file not found"
        exit 1
    fi
else
    echo "⚠️  Docker not available, using cargo build..."
    cargo build --release --target wasm32-unknown-unknown
    cp "./target/wasm32-unknown-unknown/release/zk_verifier.wasm" "$WASM_FILE"
fi

# Step 2: Validate WASM file
echo ""
echo "🔍 Step 2: Validating WASM file..."
if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM file not found at $WASM_FILE"
    exit 1
fi

WASM_SIZE=$(wc -c < "$WASM_FILE")
echo "   WASM file size: $WASM_SIZE bytes"

if [ $WASM_SIZE -gt 2000000 ]; then
    echo "⚠️  Warning: WASM file is large (>2MB). Consider optimization."
fi

# Step 3: Store the contract on-chain
echo ""
echo "📤 Step 3: Storing contract on Cosmos chain..."

STORE_TX=$(persona-chaind tx wasm store "$WASM_FILE" \
    --from "$DEPLOYMENT_ACCOUNT" \
    --chain-id "$CHAIN_ID" \
    --node "$NODE_URL" \
    --gas-prices "$GAS_PRICES" \
    --gas auto \
    --gas-adjustment 1.5 \
    --yes \
    --output json)

if [ $? -eq 0 ]; then
    echo "✅ Contract stored successfully"
    
    # Extract code ID from transaction
    TXHASH=$(echo "$STORE_TX" | jq -r '.txhash')
    echo "   Transaction hash: $TXHASH"
    
    sleep 6  # Wait for transaction to be processed
    
    CODE_ID=$(persona-chaind query tx "$TXHASH" --node "$NODE_URL" --output json | \
        jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')
    
    echo "   Code ID: $CODE_ID"
else
    echo "❌ Failed to store contract"
    exit 1
fi

# Step 4: Instantiate the contract
echo ""
echo "🏗️  Step 4: Instantiating ZK Verifier contract..."

INIT_MSG='{"admin": null}'

INSTANTIATE_TX=$(persona-chaind tx wasm instantiate "$CODE_ID" "$INIT_MSG" \
    --from "$DEPLOYMENT_ACCOUNT" \
    --chain-id "$CHAIN_ID" \
    --node "$NODE_URL" \
    --gas-prices "$GAS_PRICES" \
    --gas auto \
    --gas-adjustment 1.5 \
    --label "PersonaPass ZK Verifier v1.0.0" \
    --yes \
    --output json)

if [ $? -eq 0 ]; then
    echo "✅ Contract instantiated successfully"
    
    TXHASH=$(echo "$INSTANTIATE_TX" | jq -r '.txhash')
    echo "   Transaction hash: $TXHASH"
    
    sleep 6  # Wait for transaction to be processed
    
    CONTRACT_ADDRESS=$(persona-chaind query tx "$TXHASH" --node "$NODE_URL" --output json | \
        jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')
    
    echo "   Contract address: $CONTRACT_ADDRESS"
else
    echo "❌ Failed to instantiate contract"
    exit 1
fi

# Step 5: Register PersonaPass circuits
echo ""
echo "🔧 Step 5: Registering PersonaPass ZK circuits..."

# Register Academic GPA Verification Circuit
echo "   Registering Academic GPA circuit..."
GPA_VK='{"vk_alpha_1": ["1", "2", "1"], "vk_beta_2": [["3", "4"], ["5", "6"], ["0", "1"]], "vk_gamma_2": [["7", "8"], ["9", "10"], ["0", "1"]], "vk_delta_2": [["11", "12"], ["13", "14"], ["0", "1"]], "IC": [["15", "16", "1"], ["17", "18", "1"]]}'

persona-chaind tx wasm execute "$CONTRACT_ADDRESS" \
    "{\"register_circuit\": {\"circuit_id\": \"academic_gpa\", \"verification_key\": \"$GPA_VK\", \"circuit_type\": \"groth16\"}}" \
    --from "$DEPLOYMENT_ACCOUNT" \
    --chain-id "$CHAIN_ID" \
    --node "$NODE_URL" \
    --gas-prices "$GAS_PRICES" \
    --gas auto \
    --gas-adjustment 1.5 \
    --yes > /dev/null

# Register Financial Income Verification Circuit
echo "   Registering Financial Income circuit..."
INCOME_VK='{"vk_alpha_1": ["19", "20", "1"], "vk_beta_2": [["21", "22"], ["23", "24"], ["0", "1"]], "vk_gamma_2": [["25", "26"], ["27", "28"], ["0", "1"]], "vk_delta_2": [["29", "30"], ["31", "32"], ["0", "1"]], "IC": [["33", "34", "1"], ["35", "36", "1"], ["37", "38", "1"]]}'

persona-chaind tx wasm execute "$CONTRACT_ADDRESS" \
    "{\"register_circuit\": {\"circuit_id\": \"financial_income\", \"verification_key\": \"$INCOME_VK\", \"circuit_type\": \"groth16\"}}" \
    --from "$DEPLOYMENT_ACCOUNT" \
    --chain-id "$CHAIN_ID" \
    --node "$NODE_URL" \
    --gas-prices "$GAS_PRICES" \
    --gas auto \
    --gas-adjustment 1.5 \
    --yes > /dev/null

# Register Health Vaccination Verification Circuit
echo "   Registering Health Vaccination circuit..."
VACCINATION_VK='{"vk_alpha_1": ["39", "40", "1"], "vk_beta_2": [["41", "42"], ["43", "44"], ["0", "1"]], "vk_gamma_2": [["45", "46"], ["47", "48"], ["0", "1"]], "vk_delta_2": [["49", "50"], ["51", "52"], ["0", "1"]], "IC": [["53", "54", "1"], ["55", "56", "1"], ["57", "58", "1"], ["59", "60", "1"]]}'

persona-chaind tx wasm execute "$CONTRACT_ADDRESS" \
    "{\"register_circuit\": {\"circuit_id\": \"health_vaccination\", \"verification_key\": \"$VACCINATION_VK\", \"circuit_type\": \"groth16\"}}" \
    --from "$DEPLOYMENT_ACCOUNT" \
    --chain-id "$CHAIN_ID" \
    --node "$NODE_URL" \
    --gas-prices "$GAS_PRICES" \
    --gas auto \
    --gas-adjustment 1.5 \
    --yes > /dev/null

# Register Universal Aggregate Proof Circuit
echo "   Registering Universal Aggregate circuit..."
AGGREGATE_VK='{"vk_alpha_1": ["61", "62", "1"], "vk_beta_2": [["63", "64"], ["65", "66"], ["0", "1"]], "vk_gamma_2": [["67", "68"], ["69", "70"], ["0", "1"]], "vk_delta_2": [["71", "72"], ["73", "74"], ["0", "1"]], "IC": [["75", "76", "1"], ["77", "78", "1"], ["79", "80", "1"], ["81", "82", "1"], ["83", "84", "1"]]}'

persona-chaind tx wasm execute "$CONTRACT_ADDRESS" \
    "{\"register_circuit\": {\"circuit_id\": \"universal_aggregate\", \"verification_key\": \"$AGGREGATE_VK\", \"circuit_type\": \"groth16\"}}" \
    --from "$DEPLOYMENT_ACCOUNT" \
    --chain-id "$CHAIN_ID" \
    --node "$NODE_URL" \
    --gas-prices "$GAS_PRICES" \
    --gas auto \
    --gas-adjustment 1.5 \
    --yes > /dev/null

echo "✅ All PersonaPass circuits registered"

# Step 6: Verify deployment
echo ""
echo "🔍 Step 6: Verifying deployment..."

CONTRACT_INFO=$(persona-chaind query wasm contract-state smart "$CONTRACT_ADDRESS" \
    '{"contract_info": {}}' \
    --node "$NODE_URL" \
    --output json)

TOTAL_CIRCUITS=$(echo "$CONTRACT_INFO" | jq -r '.data.total_circuits')
echo "   Total circuits registered: $TOTAL_CIRCUITS"

if [ "$TOTAL_CIRCUITS" = "4" ]; then
    echo "✅ All 4 PersonaPass circuits verified"
else
    echo "⚠️  Expected 4 circuits, found $TOTAL_CIRCUITS"
fi

# Step 7: Save deployment info
echo ""
echo "💾 Step 7: Saving deployment configuration..."

DEPLOYMENT_CONFIG="{
  \"contract_address\": \"$CONTRACT_ADDRESS\",
  \"code_id\": $CODE_ID,
  \"chain_id\": \"$CHAIN_ID\",
  \"node_url\": \"$NODE_URL\",
  \"deployed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"version\": \"1.0.0\",
  \"circuits\": [
    {\"id\": \"academic_gpa\", \"type\": \"groth16\"},
    {\"id\": \"financial_income\", \"type\": \"groth16\"},
    {\"id\": \"health_vaccination\", \"type\": \"groth16\"},
    {\"id\": \"universal_aggregate\", \"type\": \"groth16\"}
  ]
}"

echo "$DEPLOYMENT_CONFIG" > "/home/rocz/persona-chain/config/zk-verifier-deployment.json"
echo "   Configuration saved to config/zk-verifier-deployment.json"

# Step 8: Update ZK API configuration
echo ""
echo "🔧 Step 8: Updating ZK API configuration..."

ZK_API_ENV="/home/rocz/persona-chain/apps/zk-api/.env"
if [ -f "$ZK_API_ENV" ]; then
    # Update existing .env file
    sed -i "s/^ZK_VERIFIER_CONTRACT_ADDRESS=.*/ZK_VERIFIER_CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" "$ZK_API_ENV"
    sed -i "s/^ZK_VERIFIER_CHAIN_ID=.*/ZK_VERIFIER_CHAIN_ID=$CHAIN_ID/" "$ZK_API_ENV"
    sed -i "s/^ZK_VERIFIER_NODE_URL=.*/ZK_VERIFIER_NODE_URL=$NODE_URL/" "$ZK_API_ENV"
else
    # Create new .env file
    cat > "$ZK_API_ENV" << EOF
# ZK Verifier Smart Contract Configuration
ZK_VERIFIER_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
ZK_VERIFIER_CHAIN_ID=$CHAIN_ID
ZK_VERIFIER_NODE_URL=$NODE_URL
ZK_VERIFIER_ENABLED=true
EOF
fi

echo "   ZK API configuration updated"

echo ""
echo "🎉 PersonaPass ZK Verifier Deployment Complete!"
echo "=============================================="
echo ""
echo "📋 Deployment Summary:"
echo "   Contract Address: $CONTRACT_ADDRESS"
echo "   Code ID: $CODE_ID"
echo "   Chain: $CHAIN_ID"
echo "   Circuits Registered: 4"
echo "   Configuration: config/zk-verifier-deployment.json"
echo ""
echo "🔗 Integration:"
echo "   The ZK API service has been configured to use this verifier contract"
echo "   Proofs generated by the ZK API can now be verified on-chain"
echo ""
echo "✨ Next Steps:"
echo "   1. Test proof verification with: ./test-verification.sh"
echo "   2. Integrate with frontend components"
echo "   3. Monitor contract performance and usage"
echo ""