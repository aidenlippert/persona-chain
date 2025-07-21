#!/bin/bash
# PersonaChain Docker Startup Script - Fixed version

set -e

CHAIN_ID=${CHAIN_ID:-persona-mainnet-1}
MONIKER=${MONIKER:-persona-gcp-validator}
HOME_DIR="/home/persona/.personachain"

echo "🚀 Starting PersonaChain node..."
echo "Chain ID: $CHAIN_ID"
echo "Moniker: $MONIKER"
echo "Home: $HOME_DIR"

# Initialize node if not already done
if [ ! -f "$HOME_DIR/config/genesis.json" ]; then
    echo "📦 Initializing PersonaChain node..."
    
    # Initialize the chain
    personachaind init "$MONIKER" --chain-id="$CHAIN_ID" --home="$HOME_DIR"
    
    # Create basic genesis if not provided
    echo "📄 Creating basic genesis file..."
    cat > "$HOME_DIR/config/genesis.json" <<EOF
{
  "genesis_time": "$(date -u +%Y-%m-%dT%H:%M:%S.000000000Z)",
  "chain_id": "$CHAIN_ID",
  "initial_height": "1",
  "consensus_params": {
    "block": {
      "max_bytes": "22020096",
      "max_gas": "-1",
      "time_iota_ms": "1000"
    },
    "evidence": {
      "max_age_num_blocks": "100000",
      "max_age_duration": "172800000000000",
      "max_bytes": "1048576"
    },
    "validator": {
      "pub_key_types": ["ed25519"]
    },
    "version": {}
  },
  "app_hash": "",
  "app_state": {
    "auth": {
      "params": {
        "max_memo_characters": "256",
        "tx_sig_limit": "7",
        "tx_size_cost_per_byte": "10",
        "sig_verify_cost_ed25519": "590",
        "sig_verify_cost_secp256k1": "1000"
      },
      "accounts": []
    },
    "bank": {
      "params": {
        "send_enabled": [],
        "default_send_enabled": true
      },
      "balances": [],
      "supply": [],
      "denom_metadata": []
    },
    "did": {
      "params": {},
      "did_documents": []
    },
    "vc": {
      "params": {},
      "credentials": []
    }
  }
}
EOF
    
    # Generate validator key if not exists
    if [ ! -f "$HOME_DIR/config/priv_validator_key.json" ]; then
        echo "🔑 Generating validator key..."
        # This would be replaced with proper key management in production
        personachaind tendermint show-validator --home="$HOME_DIR"
    fi
    
    # Set up configuration
    echo "⚙️ Configuring node..."
    
    # Enable API server in app.toml
    sed -i 's/enable = false/enable = true/g' "$HOME_DIR/config/app.toml"
    sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' "$HOME_DIR/config/app.toml"
    
    # Enable CORS in config.toml
    sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' "$HOME_DIR/config/config.toml"
    sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' "$HOME_DIR/config/app.toml"
    
    # Set external address if provided
    if [ ! -z "$EXTERNAL_IP" ]; then
        sed -i "s/external_address = \"\"/external_address = \"$EXTERNAL_IP:26656\"/g" "$HOME_DIR/config/config.toml"
    fi
    
    echo "✅ Node initialized successfully"
fi

# Start the blockchain
echo "🌐 Starting PersonaChain daemon..."
echo "RPC: http://0.0.0.0:26657"
echo "REST API: http://0.0.0.0:1317"
echo "P2P: 0.0.0.0:26656"

# Execute the daemon with simplified flags
exec personachaind start \
    --home="$HOME_DIR" \
    --rpc.laddr="tcp://0.0.0.0:26657" \
    --api.address="tcp://0.0.0.0:1317"