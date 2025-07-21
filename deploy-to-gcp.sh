#!/bin/bash
# Quick PersonaChain deployment to existing GCP server
# Target: 34.170.121.182

set -e

GCP_IP="34.29.74.111"
GCP_USER="rocz"  # Change this to your GCP username
BINARY_PATH="./persona-chaind"
CONFIG_DIR="$HOME/.personachain"

echo "🚀 Deploying PersonaChain to GCP server $GCP_IP"

# Check if binary exists
if [ ! -f "$BINARY_PATH" ]; then
    echo "❌ PersonaChain binary not found at $BINARY_PATH"
    exit 1
fi

# Check if config exists
if [ ! -d "$CONFIG_DIR" ]; then
    echo "❌ PersonaChain config not found at $CONFIG_DIR"
    exit 1
fi

echo "📦 Packaging PersonaChain for deployment..."

# Create deployment package
DEPLOY_DIR="personachain-deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy binary
cp "$BINARY_PATH" "$DEPLOY_DIR/"
chmod +x "$DEPLOY_DIR/persona-chaind"

# Copy config
cp -r "$CONFIG_DIR" "$DEPLOY_DIR/config"

# Create startup script
cat > "$DEPLOY_DIR/start-personachain.sh" << 'EOF'
#!/bin/bash
# PersonaChain startup script for GCP

HOME_DIR="/home/rocz/.personachain"
BINARY="/home/rocz/persona-chaind"

echo "🚀 Starting PersonaChain on GCP..."

# Kill any existing process
pkill -f persona-chaind || true
sleep 2

# Create home directory if needed
mkdir -p "$HOME_DIR"

# Copy config if provided
if [ -d "./config/.personachain" ]; then
    echo "📁 Using provided config..."
    cp -r ./config/.personachain/* "$HOME_DIR/"
fi

# Start PersonaChain
echo "🌐 Starting PersonaChain daemon..."
echo "RPC: http://0.0.0.0:26657"
echo "REST API: http://0.0.0.0:1317"

nohup "$BINARY" start \
    --home="$HOME_DIR" \
    --rpc.laddr="tcp://0.0.0.0:26657" \
    --api.address="tcp://0.0.0.0:1317" \
    --grpc.address="0.0.0.0:9090" \
    > "$HOME_DIR/node.log" 2>&1 &

PID=$!
echo "🔢 PersonaChain PID: $PID"
echo "$PID" > "$HOME_DIR/persona.pid"

# Wait and check
sleep 5
if kill -0 "$PID" 2>/dev/null; then
    echo "✅ PersonaChain started successfully!"
    echo "📊 Checking status in 10 seconds..."
    sleep 10
    curl -s http://localhost:26657/status | head -5 || echo "Status check failed"
else
    echo "❌ PersonaChain failed to start"
    tail -20 "$HOME_DIR/node.log"
    exit 1
fi
EOF

chmod +x "$DEPLOY_DIR/start-personachain.sh"

# Create firewall script
cat > "$DEPLOY_DIR/setup-firewall.sh" << 'EOF'
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
EOF

chmod +x "$DEPLOY_DIR/setup-firewall.sh"

echo "📤 Uploading to GCP server..."

# Upload deployment package
scp -i ~/.ssh/gcp_key -r "$DEPLOY_DIR" "$GCP_USER@$GCP_IP:~/"

echo "🔧 Setting up PersonaChain on GCP server..."

# SSH and deploy
ssh -i ~/.ssh/gcp_key "$GCP_USER@$GCP_IP" << EOF
cd ~/$DEPLOY_DIR

echo "🔥 Setting up firewall..."
./setup-firewall.sh

echo "📁 Making binary executable..."
chmod +x persona-chaind
cp persona-chaind ~/

echo "🚀 Starting PersonaChain..."
./start-personachain.sh

echo "⏳ Waiting for PersonaChain to fully start..."
sleep 15

echo "🧪 Testing connectivity..."
curl -s http://localhost:26657/status || echo "Local test failed"

echo "🌐 Testing external connectivity..."
curl -s http://$GCP_IP:26657/status || echo "External test failed (might need firewall)"

echo "📊 PersonaChain logs:"
tail -10 ~/.personachain/node.log
EOF

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📡 PersonaChain should be running at:"
echo "  RPC: http://$GCP_IP:26657"
echo "  REST API: http://$GCP_IP:1317"
echo ""
echo "🧪 Test with:"
echo "  curl http://$GCP_IP:26657/status"
echo ""
echo "🔍 Check logs with:"
echo "  ssh $GCP_USER@$GCP_IP 'tail -f ~/.personachain/node.log'"

# Cleanup
rm -rf "$DEPLOY_DIR"

echo "✅ Deployment package cleaned up"