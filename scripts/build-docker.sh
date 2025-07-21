#!/bin/bash

# Build Docker image for Persona Chain Testnet
set -e

echo "🐳 Building Persona Chain Testnet Docker Image..."

# Get version from git or use default
VERSION=${1:-latest}
REGISTRY=${REGISTRY:-persona-chain}

IMAGE_NAME="$REGISTRY/testnet:$VERSION"

echo "Building image: $IMAGE_NAME"

# Build the Docker image
docker build -t "$IMAGE_NAME" .

# Tag as latest if not already
if [ "$VERSION" != "latest" ]; then
    docker tag "$IMAGE_NAME" "$REGISTRY/testnet:latest"
fi

echo "✅ Docker image built successfully!"
echo "Image: $IMAGE_NAME"

# Test the image
echo "🧪 Testing Docker image..."
docker run --rm "$IMAGE_NAME" testnet-daemon --version

echo "🚀 Docker build complete!"
echo ""
echo "To run the testnet:"
echo "  docker-compose up -d"
echo ""
echo "To push to registry:"
echo "  docker push $IMAGE_NAME"