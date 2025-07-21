#!/bin/bash
# Setup firewall rules for PersonaChain

echo "🔥 Setting up firewall rules..."

# Allow PersonaChain ports
sudo ufw allow 26657/tcp comment "PersonaChain RPC"
sudo ufw allow 1317/tcp comment "PersonaChain REST API"
sudo ufw allow 9090/tcp comment "PersonaChain gRPC"
sudo ufw allow 26656/tcp comment "PersonaChain P2P"

# Check status
sudo ufw status

echo "✅ Firewall configured for PersonaChain"
