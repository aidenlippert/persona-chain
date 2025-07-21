#!/bin/bash
# Fix PersonaChain deployment using direct gcloud commands
# Bypass kubectl authentication issues

PROJECT_ID="personachain-prod"
CLUSTER_NAME="personachain-cluster"
ZONE="us-central1-a"
DOCKER_IMAGE="gcr.io/$PROJECT_ID/personachain:latest"

echo "🔧 Fixing PersonaChain Deployment..."
echo "===================================="

# Step 1: Verify cluster is accessible
echo "📊 Verifying cluster access..."
CLUSTER_STATUS=$(gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(status)" 2>/dev/null)
if [ "$CLUSTER_STATUS" != "RUNNING" ]; then
    echo "❌ Cluster not running. Status: $CLUSTER_STATUS"
    exit 1
fi
echo "✅ Cluster is running"

# Step 2: Check if our Docker image exists
echo "🐳 Verifying Docker image..."
IMAGE_EXISTS=$(gcloud container images list --repository=gcr.io/$PROJECT_ID --format="value(name)" --filter="name:personachain" 2>/dev/null)
if [ -z "$IMAGE_EXISTS" ]; then
    echo "❌ Docker image not found. Building..."
    # Build the image if it doesn't exist
    cd /home/rocz/persona-chain
    docker build -f deployment/docker/Dockerfile -t $DOCKER_IMAGE .
    docker push $DOCKER_IMAGE
else
    echo "✅ Docker image exists: $DOCKER_IMAGE"
fi

# Step 3: Create a working directory for manifests
WORK_DIR="/tmp/k8s-fix"
mkdir -p $WORK_DIR

# Step 4: Create simplified namespace manifest
cat > $WORK_DIR/namespace.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: personachain
EOF

# Step 5: Create simplified deployment manifest
cat > $WORK_DIR/deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personachain-node
  namespace: personachain
spec:
  replicas: 1
  selector:
    matchLabels:
      app: personachain
  template:
    metadata:
      labels:
        app: personachain
    spec:
      containers:
      - name: personachain
        image: $DOCKER_IMAGE
        ports:
        - containerPort: 26657
        - containerPort: 8100
        - containerPort: 26656
        env:
        - name: CHAIN_ID
          value: "persona-mainnet-1"
        - name: MONIKER
          value: "persona-gcp-validator"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /status
            port: 26657
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /status
            port: 26657
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: personachain-service
  namespace: personachain
spec:
  type: LoadBalancer
  ports:
  - port: 26657
    targetPort: 26657
    name: rpc
  - port: 8100
    targetPort: 8100
    name: rest-api
  selector:
    app: personachain
EOF

# Step 6: Apply manifests using gcloud with proper auth
echo "📦 Applying Kubernetes manifests..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID

# Try to apply without the auth plugin dependency
echo "   Creating namespace..."
cat $WORK_DIR/namespace.yaml | gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID && kubectl apply -f - 2>/dev/null || echo "Namespace creation attempted"

echo "   Creating deployment and service..."
cat $WORK_DIR/deployment.yaml | gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID && kubectl apply -f - 2>/dev/null || echo "Deployment creation attempted"

# Step 7: Alternative approach - use gcloud directly
echo "🔄 Alternative: Creating workload directly..."
gcloud run deploy personachain-alt \
    --image=$DOCKER_IMAGE \
    --platform=gke \
    --cluster=$CLUSTER_NAME \
    --cluster-location=$ZONE \
    --project=$PROJECT_ID \
    --port=26657 \
    --memory=2Gi \
    --cpu=1 \
    --max-instances=1 \
    --allow-unauthenticated 2>/dev/null || echo "Direct workload creation attempted"

# Step 8: Wait and check status
echo "⏳ Waiting 60 seconds for deployment..."
sleep 60

# Step 9: Check for any external IPs
echo "🌐 Checking for external access..."
EXTERNAL_IPS=$(gcloud compute forwarding-rules list --project=$PROJECT_ID --format="value(IPAddress)" 2>/dev/null | grep -v "^$")
if [ ! -z "$EXTERNAL_IPS" ]; then
    echo "✅ External IP found: $EXTERNAL_IPS"
    for ip in $EXTERNAL_IPS; do
        echo "🧪 Testing PersonaChain on $ip:26657..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$ip:26657/status" 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ]; then
            echo "🎉 PersonaChain is accessible at http://$ip:26657"
            echo "🔗 RPC endpoint: http://$ip:26657"
            echo "🔗 REST API: http://$ip:8100"
            
            # Save the working endpoint
            echo "$ip" > /tmp/personachain-ip.txt
            exit 0
        fi
    done
fi

# Step 10: Check node IPs as fallback
echo "🔍 Checking node IPs as fallback..."
NODE_IPS=$(gcloud compute instances list --project=$PROJECT_ID --filter="name~gke-$CLUSTER_NAME" --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null | grep -v "^$")
for ip in $NODE_IPS; do
    echo "🧪 Testing node $ip:26657..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$ip:26657/status" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "🎉 PersonaChain is accessible at http://$ip:26657"
        echo "🔗 RPC endpoint: http://$ip:26657"
        echo "🔗 REST API: http://$ip:8100"
        
        # Save the working endpoint
        echo "$ip" > /tmp/personachain-ip.txt
        exit 0
    fi
done

echo "⚠️ PersonaChain not yet accessible. May need more time to start."
echo "💡 Run this script again in 5 minutes."
EOF

chmod +x deployment/fix-deployment.sh