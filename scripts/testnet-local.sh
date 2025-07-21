#!/bin/bash

# Persona Chain Local Testnet Setup Script
# This script sets up a local 4-node testnet for testing E2E workflows

set -e

CHAIN_ID="persona-testnet-1"
CHAIN_DIR="./testnet"
NODES=4
DENOM="stake"
COINS="1000000000000000${DENOM}"

echo "Setting up Persona Chain local testnet..."

# Clean up any existing testnet data
rm -rf $CHAIN_DIR

# Create chain directory
mkdir -p $CHAIN_DIR

# Initialize configuration for each node
for ((i=0; i<$NODES; i++)); do
    NODE_DIR="$CHAIN_DIR/node$i"
    NODE_MONIKER="node$i"
    
    echo "Initializing node $i..."
    
    # Initialize node
    persona-chaind init $NODE_MONIKER --chain-id $CHAIN_ID --home $NODE_DIR
    
    # Add validator key
    persona-chaind keys add validator$i --keyring-backend test --home $NODE_DIR
    
    # Add account to genesis
    persona-chaind add-genesis-account validator$i $COINS --keyring-backend test --home $NODE_DIR
    
    # Generate gentx
    persona-chaind gentx validator$i 1000000000$DENOM --chain-id $CHAIN_ID --keyring-backend test --home $NODE_DIR
done

# Collect genesis transactions
echo "Collecting genesis transactions..."
for ((i=1; i<$NODES; i++)); do
    cp $CHAIN_DIR/node$i/config/gentx/*.json $CHAIN_DIR/node0/config/gentx/
done

# Collect gentxs
persona-chaind collect-gentxs --home $CHAIN_DIR/node0

# Copy genesis file to all nodes
echo "Distributing genesis file..."
for ((i=1; i<$NODES; i++)); do
    cp $CHAIN_DIR/node0/config/genesis.json $CHAIN_DIR/node$i/config/genesis.json
done

# Update node configurations
echo "Configuring nodes..."
for ((i=0; i<$NODES; i++)); do
    NODE_DIR="$CHAIN_DIR/node$i"
    CONFIG_PATH="$NODE_DIR/config/config.toml"
    APP_CONFIG_PATH="$NODE_DIR/config/app.toml"
    
    # Set node ports (RPC, P2P, gRPC, API)
    RPC_PORT=$((26657 + i))
    P2P_PORT=$((26656 + i))
    GRPC_PORT=$((9090 + i))
    API_PORT=$((1317 + i))
    
    # Update config.toml
    sed -i "s/laddr = \"tcp:\/\/127.0.0.1:26657\"/laddr = \"tcp:\/\/127.0.0.1:$RPC_PORT\"/" $CONFIG_PATH
    sed -i "s/laddr = \"tcp:\/\/0.0.0.0:26656\"/laddr = \"tcp:\/\/0.0.0.0:$P2P_PORT\"/" $CONFIG_PATH
    sed -i "s/external_address = \"\"/external_address = \"127.0.0.1:$P2P_PORT\"/" $CONFIG_PATH
    
    # Update app.toml
    sed -i "s/address = \"tcp:\/\/0.0.0.0:1317\"/address = \"tcp:\/\/0.0.0.0:$API_PORT\"/" $APP_CONFIG_PATH
    sed -i "s/address = \"0.0.0.0:9090\"/address = \"0.0.0.0:$GRPC_PORT\"/" $APP_CONFIG_PATH
    
    # Enable API
    sed -i "s/enable = false/enable = true/" $APP_CONFIG_PATH
    sed -i "s/swagger = false/swagger = true/" $APP_CONFIG_PATH
    
    # Configure persistent peers
    if [ $i -eq 0 ]; then
        PEERS=""
        for ((j=1; j<$NODES; j++)); do
            PEER_P2P_PORT=$((26656 + j))
            if [ -z "$PEERS" ]; then
                PEERS="node$j@127.0.0.1:$PEER_P2P_PORT"
            else
                PEERS="$PEERS,node$j@127.0.0.1:$PEER_P2P_PORT"
            fi
        done
        sed -i "s/persistent_peers = \"\"/persistent_peers = \"$PEERS\"/" $CONFIG_PATH
    fi
done

echo "Testnet setup complete!"
echo ""
echo "To start the testnet:"
echo "1. Start node 0: persona-chaind start --home $CHAIN_DIR/node0"
echo "2. Start node 1: persona-chaind start --home $CHAIN_DIR/node1"
echo "3. Start node 2: persona-chaind start --home $CHAIN_DIR/node2"
echo "4. Start node 3: persona-chaind start --home $CHAIN_DIR/node3"
echo ""
echo "Chain ID: $CHAIN_ID"
echo "Node 0 RPC: http://localhost:26657"
echo "Node 0 API: http://localhost:1317"
echo "Node 0 gRPC: localhost:9090"
echo ""
echo "To interact with the testnet:"
echo "persona-chaind status --home $CHAIN_DIR/node0"
echo "persona-chaind query bank balances \$(persona-chaind keys show validator0 -a --keyring-backend test --home $CHAIN_DIR/node0) --home $CHAIN_DIR/node0"