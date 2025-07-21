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
