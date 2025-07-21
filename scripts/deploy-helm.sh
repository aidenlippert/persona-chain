#!/bin/bash

# Deploy Persona Chain Testnet using Helm
set -e

NAMESPACE=${NAMESPACE:-persona-testnet}
RELEASE_NAME=${RELEASE_NAME:-persona-testnet}
CHART_PATH="./helm/persona-testnet"
VALUES_FILE=${VALUES_FILE:-""}

echo "🚀 Deploying Persona Chain Testnet with Helm..."
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"

# Create namespace if it doesn't exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Install or upgrade Helm release
if [ -n "$VALUES_FILE" ] && [ -f "$VALUES_FILE" ]; then
    echo "Using custom values file: $VALUES_FILE"
    helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE" \
        --wait \
        --timeout 10m
else
    echo "Using default values"
    helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --wait \
        --timeout 10m
fi

echo "✅ Deployment complete!"
echo ""
echo "📋 Getting deployment status..."
kubectl get pods -n "$NAMESPACE"
kubectl get svc -n "$NAMESPACE"

echo ""
echo "🌐 To get external endpoints:"
echo "  kubectl get svc -n $NAMESPACE"
echo ""
echo "📊 To view logs:"
echo "  kubectl logs -f deployment/$RELEASE_NAME -n $NAMESPACE"
echo ""
echo "🔧 To port-forward for local access:"
echo "  kubectl port-forward svc/$RELEASE_NAME-rpc 26657:26657 -n $NAMESPACE"
echo "  kubectl port-forward svc/$RELEASE_NAME-api 1317:1317 -n $NAMESPACE"