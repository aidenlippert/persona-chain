#!/bin/bash

# PersonaPass Development Environment Startup Script

set -e

echo "🚀 Starting PersonaPass Development Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Redis is running
check_redis() {
    if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis is running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Redis is not running${NC}"
        return 1
    fi
}

# Start Redis if needed
if ! check_redis; then
    if command -v redis-server &> /dev/null; then
        echo "Starting Redis..."
        redis-server --daemonize yes
        sleep 2
        check_redis || { echo -e "${RED}❌ Failed to start Redis${NC}"; exit 1; }
    else
        echo -e "${RED}❌ Redis is not installed. Please install Redis first.${NC}"
        echo "On Ubuntu/Debian: sudo apt-get install redis-server"
        echo "On macOS: brew install redis"
        exit 1
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    # Kill connector service
    if [ ! -z "$CONNECTOR_PID" ] && ps -p $CONNECTOR_PID > /dev/null; then
        kill $CONNECTOR_PID 2>/dev/null || true
    fi
    
    # Kill wallet service
    if [ ! -z "$WALLET_PID" ] && ps -p $WALLET_PID > /dev/null; then
        kill $WALLET_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Services stopped${NC}"
    exit 0
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Start Connector Service
echo -e "\n${YELLOW}Starting Connector Service...${NC}"
cd apps/connectors

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing connector dependencies..."
    npm install
fi

# Build TypeScript if needed
if [ ! -d "dist" ]; then
    echo "Building connector service..."
    npm run build
fi

# Start connector service
npm run dev > ../../logs/connectors.log 2>&1 &
CONNECTOR_PID=$!
echo -e "${GREEN}✅ Connector service started (PID: $CONNECTOR_PID)${NC}"

# Wait for connector service to be ready
echo "Waiting for connector service to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8080/health | grep -q "healthy"; then
        echo -e "${GREEN}✅ Connector service is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Connector service failed to start${NC}"
        cat ../../logs/connectors.log
        exit 1
    fi
    sleep 1
done

# Start Wallet Frontend
echo -e "\n${YELLOW}Starting Wallet Frontend...${NC}"
cd ../wallet

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing wallet dependencies..."
    npm install
fi

# Start wallet frontend
npm run dev > ../../logs/wallet.log 2>&1 &
WALLET_PID=$!
echo -e "${GREEN}✅ Wallet frontend started (PID: $WALLET_PID)${NC}"

# Display information
echo -e "\n=============================================="
echo -e "${GREEN}✅ PersonaPass Development Environment Ready!${NC}"
echo -e "=============================================="
echo ""
echo "Services:"
echo "  - Wallet Frontend: http://localhost:5173"
echo "  - Connector API: http://localhost:8080"
echo "  - API Documentation: http://localhost:8080/api"
echo ""
echo "OAuth Configuration Required:"
echo "  Update your OAuth apps with these redirect URIs:"
echo "  - GitHub: http://localhost:5173/credentials/callback"
echo "  - LinkedIn: http://localhost:5173/credentials/callback"
echo ""
echo "Logs:"
echo "  - Connector: tail -f logs/connectors.log"
echo "  - Wallet: tail -f logs/wallet.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running
wait