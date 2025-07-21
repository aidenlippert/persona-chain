#!/bin/bash

# Quick SSL Setup using NGINX Ingress + Let's Encrypt
# This provides immediate HTTPS endpoints to resolve Mixed Content errors

set -e

# Configuration
PROJECT_ID="personachain-prod"
CLUSTER_NAME="personachain-cluster"
ZONE="us-central1-a"

echo "🚀 Quick SSL setup for PersonaChain using NGINX Ingress..."

# Ensure we're using the correct project
gcloud config set project $PROJECT_ID

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

echo "📋 Step 1: Install NGINX Ingress Controller..."

# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

echo "⏳ Waiting for NGINX Ingress Controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

echo "📋 Step 2: Install cert-manager..."

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml

echo "⏳ Waiting for cert-manager to be ready..."
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=300s

echo "📋 Step 3: Apply SSL ingress configuration..."

# Apply our ingress configuration
kubectl apply -f /home/rocz/persona-chain/deployment/kubernetes/nginx-ssl-ingress.yaml

echo "📋 Step 4: Get ingress IP address..."

# Wait for ingress to get an external IP
echo "⏳ Waiting for ingress to get external IP..."
for i in {1..30}; do
    INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ ! -z "$INGRESS_IP" ]; then
        break
    fi
    echo "  Attempt $i/30: Waiting for IP..."
    sleep 10
done

if [ -z "$INGRESS_IP" ]; then
    echo "❌ Failed to get ingress IP address"
    exit 1
fi

echo "✅ Ingress IP: $INGRESS_IP"

echo "📋 Step 5: Check certificate status..."

# Function to check certificate status
check_cert_status() {
    local secret_name=$1
    local namespace=${2:-default}
    
    for i in {1..10}; do
        STATUS=$(kubectl get secret $secret_name -n $namespace -o jsonpath='{.data.tls\.crt}' 2>/dev/null || echo "")
        if [ ! -z "$STATUS" ]; then
            echo "✅ Certificate $secret_name is ready"
            return 0
        fi
        echo "  Attempt $i/10: Waiting for certificate $secret_name..."
        sleep 30
    done
    echo "⚠️  Certificate $secret_name is still provisioning (this can take up to 10 minutes)"
    return 1
}

echo "⏳ Checking certificate provisioning status..."
check_cert_status "personachain-rpc-tls"
check_cert_status "personachain-api-tls"

echo ""
echo "✅ Quick SSL setup completed!"
echo ""
echo "🌐 Your HTTPS endpoints will be:"
echo "  RPC:  https://rpc.personachain.xyz"
echo "  API:  https://api.personachain.xyz"
echo ""
echo "📋 DNS Configuration Required:"
echo "  Add these A records to your DNS:"
echo "  rpc.personachain.xyz  → $INGRESS_IP"
echo "  api.personachain.xyz  → $INGRESS_IP"
echo ""
echo "⏳ SSL certificates are provisioning automatically via Let's Encrypt"
echo "   This process can take 5-10 minutes after DNS propagation"
echo ""
echo "🔍 Monitor certificate status:"
echo "  kubectl get certificates"
echo "  kubectl describe certificate personachain-rpc-tls"
echo "  kubectl describe certificate personachain-api-tls"
echo ""
echo "🧪 Test endpoints once DNS and certificates are ready:"
echo "  curl -k https://rpc.personachain.xyz/health"
echo "  curl -k https://api.personachain.xyz/cosmos/base/tendermint/v1beta1/node_info"