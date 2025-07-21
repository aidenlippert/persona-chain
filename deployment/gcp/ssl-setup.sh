#!/bin/bash

# SSL/TLS Setup for PersonaChain - Google Cloud Load Balancer with SSL termination
# This resolves the Mixed Content error by providing HTTPS endpoints

set -e

# Configuration
PROJECT_ID="personachain-prod"
CLUSTER_NAME="personachain-cluster"
ZONE="us-central1-a"
DOMAIN_RPC="rpc.personachain.xyz"
DOMAIN_API="api.personachain.xyz"

echo "🔐 Setting up SSL/TLS termination for PersonaChain..."

# Ensure we're using the correct project
gcloud config set project $PROJECT_ID

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

echo "📋 Step 1: Create static IP addresses for load balancers..."

# Create static IP addresses
gcloud compute addresses create personachain-rpc-ip --global || echo "RPC IP already exists"
gcloud compute addresses create personachain-api-ip --global || echo "API IP already exists"

# Get the IP addresses
RPC_IP=$(gcloud compute addresses describe personachain-rpc-ip --global --format="value(address)")
API_IP=$(gcloud compute addresses describe personachain-api-ip --global --format="value(address)")

echo "📍 RPC IP: $RPC_IP"
echo "📍 API IP: $API_IP"

echo "📋 Step 2: Create SSL certificates..."

# Create managed SSL certificates
gcloud compute ssl-certificates create personachain-rpc-ssl --domains=$DOMAIN_RPC --global || echo "RPC SSL certificate already exists"
gcloud compute ssl-certificates create personachain-api-ssl --domains=$DOMAIN_API --global || echo "API SSL certificate already exists"

echo "📋 Step 3: Create health checks..."

# Create health checks for RPC (port 26657)
gcloud compute health-checks create http personachain-rpc-health \
    --port=26657 \
    --request-path=/health \
    --check-interval=30s \
    --timeout=10s \
    --unhealthy-threshold=3 \
    --healthy-threshold=2 || echo "RPC health check already exists"

# Create health checks for API (port 1317)
gcloud compute health-checks create http personachain-api-health \
    --port=1317 \
    --request-path=/cosmos/base/tendermint/v1beta1/node_info \
    --check-interval=30s \
    --timeout=10s \
    --unhealthy-threshold=3 \
    --healthy-threshold=2 || echo "API health check already exists"

echo "📋 Step 4: Create backend services..."

# Get the node pool for NEG
NODE_POOL=$(kubectl get nodes -o jsonpath='{.items[0].metadata.labels.cloud\.google\.com/gke-nodepool}')

# Create Network Endpoint Groups (NEG) for direct pod access
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: personachain-rpc-neg
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
    cloud.google.com/backend-config: '{"default": "personachain-rpc-backend-config"}'
spec:
  type: NodePort
  ports:
  - port: 26657
    targetPort: 26657
    nodePort: 30657
  selector:
    app: personachain
---
apiVersion: v1
kind: Service
metadata:
  name: personachain-api-neg
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
    cloud.google.com/backend-config: '{"default": "personachain-api-backend-config"}'
spec:
  type: NodePort
  ports:
  - port: 1317
    targetPort: 1317
    nodePort: 30317
  selector:
    app: personachain
EOF

# Create backend configurations
kubectl apply -f - <<EOF
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: personachain-rpc-backend-config
spec:
  healthCheck:
    checkIntervalSec: 30
    timeoutSec: 10
    healthyThreshold: 2
    unhealthyThreshold: 3
    type: HTTP
    requestPath: /health
    port: 26657
  connectionDraining:
    drainingTimeoutSec: 60
---
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: personachain-api-backend-config
spec:
  healthCheck:
    checkIntervalSec: 30
    timeoutSec: 10
    healthyThreshold: 2
    unhealthyThreshold: 3
    type: HTTP
    requestPath: /cosmos/base/tendermint/v1beta1/node_info
    port: 1317
  connectionDraining:
    drainingTimeoutSec: 60
EOF

echo "⏳ Waiting for NEGs to be created..."
sleep 30

# Create backend services
gcloud compute backend-services create personachain-rpc-backend \
    --protocol=HTTP \
    --health-checks=personachain-rpc-health \
    --global || echo "RPC backend service already exists"

gcloud compute backend-services create personachain-api-backend \
    --protocol=HTTP \
    --health-checks=personachain-api-health \
    --global || echo "API backend service already exists"

echo "📋 Step 5: Add NEGs to backend services..."

# Get NEG names
RPC_NEG=$(gcloud compute network-endpoint-groups list --filter="name~personachain-rpc-neg" --format="value(name)" | head -1)
API_NEG=$(gcloud compute network-endpoint-groups list --filter="name~personachain-api-neg" --format="value(name)" | head -1)

if [ ! -z "$RPC_NEG" ]; then
    NEG_ZONE=$(gcloud compute network-endpoint-groups list --filter="name=$RPC_NEG" --format="value(zone)")
    gcloud compute backend-services add-backend personachain-rpc-backend \
        --network-endpoint-group=$RPC_NEG \
        --network-endpoint-group-zone=$NEG_ZONE \
        --global || echo "RPC NEG already added"
fi

if [ ! -z "$API_NEG" ]; then
    NEG_ZONE=$(gcloud compute network-endpoint-groups list --filter="name=$API_NEG" --format="value(zone)")
    gcloud compute backend-services add-backend personachain-api-backend \
        --network-endpoint-group=$API_NEG \
        --network-endpoint-group-zone=$NEG_ZONE \
        --global || echo "API NEG already added"
fi

echo "📋 Step 6: Create URL maps..."

# Create URL map for RPC
gcloud compute url-maps create personachain-rpc-url-map \
    --default-service=personachain-rpc-backend || echo "RPC URL map already exists"

# Create URL map for API
gcloud compute url-maps create personachain-api-url-map \
    --default-service=personachain-api-backend || echo "API URL map already exists"

echo "📋 Step 7: Create HTTPS target proxies..."

# Create target HTTPS proxies
gcloud compute target-https-proxies create personachain-rpc-https-proxy \
    --url-map=personachain-rpc-url-map \
    --ssl-certificates=personachain-rpc-ssl || echo "RPC HTTPS proxy already exists"

gcloud compute target-https-proxies create personachain-api-https-proxy \
    --url-map=personachain-api-url-map \
    --ssl-certificates=personachain-api-ssl || echo "API HTTPS proxy already exists"

echo "📋 Step 8: Create forwarding rules..."

# Create global forwarding rules
gcloud compute forwarding-rules create personachain-rpc-https-forwarding-rule \
    --address=personachain-rpc-ip \
    --global \
    --target-https-proxy=personachain-rpc-https-proxy \
    --ports=443 || echo "RPC forwarding rule already exists"

gcloud compute forwarding-rules create personachain-api-https-forwarding-rule \
    --address=personachain-api-ip \
    --global \
    --target-https-proxy=personachain-api-https-proxy \
    --ports=443 || echo "API forwarding rule already exists"

echo "✅ SSL/TLS setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Point your DNS records to:"
echo "   $DOMAIN_RPC → $RPC_IP"
echo "   $DOMAIN_API → $API_IP"
echo ""
echo "2. Wait for SSL certificates to provision (15-30 minutes)"
echo "3. Test HTTPS endpoints:"
echo "   https://$DOMAIN_RPC/health"
echo "   https://$DOMAIN_API/cosmos/base/tendermint/v1beta1/node_info"
echo ""
echo "4. Update wallet configuration to use HTTPS endpoints"

# Check certificate status
echo "📋 Certificate provisioning status:"
gcloud compute ssl-certificates describe personachain-rpc-ssl --global --format="value(managed.status)"
gcloud compute ssl-certificates describe personachain-api-ssl --global --format="value(managed.status)"