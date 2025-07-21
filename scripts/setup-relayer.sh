#!/bin/bash

# Setup script for Persona Chain IBC relayer

set -e

RELAYER_DIR="$HOME/.relayer"
CHAIN_1_ID="persona-chain-1"
CHAIN_2_ID="persona-chain-2"
RELAYER_KEY="persona-relayer"

echo "Setting up Persona Chain IBC relayer..."

# Initialize relayer config
rly config init

# Add chain configurations
rly chains add-dir relayer/

# Add relayer keys
echo "Adding relayer keys..."
rly keys add $CHAIN_1_ID $RELAYER_KEY
rly keys add $CHAIN_2_ID $RELAYER_KEY

# Fund relayer accounts (in testnet/devnet)
echo "Please fund the following relayer addresses:"
echo "Chain 1 ($CHAIN_1_ID): $(rly keys show $CHAIN_1_ID $RELAYER_KEY)"
echo "Chain 2 ($CHAIN_2_ID): $(rly keys show $CHAIN_2_ID $RELAYER_KEY)"
echo ""
echo "Press enter when accounts are funded..."
read

# Create clients
echo "Creating IBC clients..."
rly tx clients persona-did-channel

# Create connections
echo "Creating IBC connections..."
rly tx connection persona-did-channel

# Create channels for DID module
echo "Creating DID channels..."
rly tx channel persona-did-channel --src-port did --dst-port did --order ordered --version did-1

# Create channels for VC module
echo "Creating VC channels..."
rly tx channel persona-vc-channel --src-port vc --dst-port vc --order ordered --version vc-1

echo "IBC setup complete!"
echo "Start relaying with: rly start persona-did-channel persona-vc-channel"