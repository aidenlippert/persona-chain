#!/bin/bash

echo "🚀 Starting PersonaPass Connector Development Environment"

# Start Redis
echo "Starting Redis..."
docker run -d --name personapass-redis -p 6379:6379 redis:alpine

# Start connectors
echo "Starting connectors..."
cd apps/connectors

# Start each connector in background
for connector in github linkedin orcid plaid twitter stackexchange; do
    if [ -f "$connector/.env" ]; then
        echo "Starting $connector connector..."
        (cd $connector && npm run dev) &
    else
        echo "⚠️  Skipping $connector - no .env file found"
    fi
done

# Start API gateway
echo "Starting API gateway..."
node gateway.js &

# Start wallet frontend
echo "Starting wallet frontend..."
cd ../wallet
npm run dev &

echo "✅ All services started!"
echo ""
echo "Services running at:"
echo "- Wallet Frontend: http://localhost:5173"
echo "- API Gateway: http://localhost:8080"
echo "- Redis: localhost:6379"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait
