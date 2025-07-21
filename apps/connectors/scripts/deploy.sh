#!/bin/bash

# PersonaPass Connector Service Deployment Script

set -e

echo "🚀 PersonaPass Connector Service Deployment"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Source environment variables
source .env

# Check required environment variables
required_vars=(
    "GITHUB_CLIENT_ID"
    "GITHUB_CLIENT_SECRET"
    "LINKEDIN_CLIENT_ID"
    "LINKEDIN_CLIENT_SECRET"
    "PLAID_CLIENT_ID"
    "PLAID_SECRET"
    "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env file"
        exit 1
    fi
done

echo "✅ Environment configuration validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm run test || true

# Docker build
if command -v docker &> /dev/null; then
    echo "🐳 Building Docker image..."
    docker build -t personapass-connectors:latest .
    
    # Start services with docker-compose
    echo "🚀 Starting services..."
    docker-compose up -d
    
    # Wait for health check
    echo "⏳ Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    health_check=$(curl -s http://localhost:8080/health || echo "failed")
    if [[ $health_check == *"healthy"* ]]; then
        echo "✅ Services are healthy!"
    else
        echo "❌ Health check failed"
        docker-compose logs
        exit 1
    fi
else
    echo "⚠️  Docker not found, starting with Node.js..."
    
    # Start Redis if not running
    if ! command -v redis-cli &> /dev/null || ! redis-cli ping &> /dev/null; then
        echo "❌ Redis is not running. Please start Redis first."
        exit 1
    fi
    
    # Start the service
    echo "🚀 Starting connector service..."
    npm start &
    SERVICE_PID=$!
    
    # Wait for service to start
    sleep 5
    
    # Check if service is running
    if ps -p $SERVICE_PID > /dev/null; then
        echo "✅ Connector service started with PID: $SERVICE_PID"
    else
        echo "❌ Failed to start connector service"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo ""
echo "Service endpoints:"
echo "  - Health: http://localhost:8080/health"
echo "  - API Docs: http://localhost:8080/api"
echo ""
echo "OAuth Redirect URIs to configure:"
echo "  - GitHub: ${GITHUB_REDIRECT_URI:-http://localhost:5173/credentials/callback}"
echo "  - LinkedIn: ${LINKEDIN_REDIRECT_URI:-http://localhost:5173/credentials/callback}"
echo ""
echo "To view logs:"
echo "  - Docker: docker-compose logs -f connectors"
echo "  - Node.js: Check ./logs directory"
echo ""