#!/bin/bash
# Google Cloud Deployment Script for PersonaChain
# Complete setup for production blockchain infrastructure

set -e

# Configuration
PROJECT_ID=${1:-"personachain-prod"}
REGION=${2:-"us-central1"}
ZONE=${3:-"us-central1-a"}
CLUSTER_NAME="personachain-cluster"
NODE_POOL_NAME="blockchain-pool"

echo "🚀 Deploying PersonaChain to Google Cloud"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Zone: $ZONE"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "📋 Setting up Google Cloud project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable compute.googleapis.com

# Build and push Docker image
echo "🐳 Building and pushing Docker image..."
cd "$(dirname "$0")/../.."

# Build the image
gcloud builds submit --tag gcr.io/$PROJECT_ID/personachain:latest .

echo "✅ Docker image built and pushed to gcr.io/$PROJECT_ID/personachain:latest"

# Create GKE cluster if it doesn't exist
if ! gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE &> /dev/null; then
    echo "🎯 Creating GKE cluster..."
    gcloud container clusters create $CLUSTER_NAME \
        --zone=$ZONE \
        --machine-type=e2-standard-4 \
        --num-nodes=1 \
        --disk-size=50GB \
        --disk-type=pd-ssd \
        --enable-autorepair \
        --enable-autoupgrade \
        --enable-autoscaling \
        --min-nodes=1 \
        --max-nodes=3 \
        --network=default \
        --subnetwork=default \
        --enable-ip-alias \
        --enable-stackdriver-kubernetes \
        --addons=HorizontalPodAutoscaling,HttpLoadBalancing \
        --no-enable-basic-auth \
        --no-issue-client-certificate \
        --enable-network-policy
    
    echo "✅ GKE cluster created successfully"
else
    echo "✅ GKE cluster already exists"
fi

# Get cluster credentials
echo "🔐 Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Create dedicated node pool for blockchain workloads
if ! gcloud container node-pools describe $NODE_POOL_NAME --cluster=$CLUSTER_NAME --zone=$ZONE &> /dev/null; then
    echo "🏗️ Creating dedicated node pool for blockchain..."
    gcloud container node-pools create $NODE_POOL_NAME \
        --cluster=$CLUSTER_NAME \
        --zone=$ZONE \
        --machine-type=n1-standard-4 \
        --disk-size=100GB \
        --disk-type=pd-ssd \
        --num-nodes=1 \
        --enable-autorepair \
        --enable-autoupgrade \
        --node-taints=blockchain=true:NoSchedule \
        --node-labels=workload=blockchain
    
    echo "✅ Blockchain node pool created"
else
    echo "✅ Blockchain node pool already exists"
fi

# Create persistent storage class
echo "💾 Setting up persistent storage..."
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ssd-retain
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-ssd
  replication-type: none
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
EOF

# Update deployment YAML with project ID
echo "📝 Updating deployment configuration..."
sed -i "s/PROJECT_ID/$PROJECT_ID/g" deployment/kubernetes/personachain-deployment.yaml

# Deploy to Kubernetes
echo "🚢 Deploying PersonaChain to Kubernetes..."
kubectl apply -f deployment/kubernetes/personachain-deployment.yaml

# Wait for deployment
echo "⏳ Waiting for deployment to be ready..."
kubectl -n personachain rollout status deployment/personachain-node --timeout=600s

# Get external IP
echo "🌐 Getting external IP address..."
echo "Waiting for LoadBalancer IP..."
external_ip=""
while [ -z $external_ip ]; do
    echo "Waiting for external IP..."
    external_ip=$(kubectl -n personachain get svc personachain-service --template="{{range .status.loadBalancer.ingress}}{{.ip}}{{end}}")
    [ -z "$external_ip" ] && sleep 10
done

echo ""
echo "🎉 PersonaChain deployment completed successfully!"
echo ""
echo "📡 Blockchain Endpoints:"
echo "  RPC:      http://$external_ip:26657"
echo "  REST API: http://$external_ip:8100"
echo "  P2P:      $external_ip:26656"
echo ""
echo "🔍 Useful commands:"
echo "  Check status: curl http://$external_ip:26657/status"
echo "  View logs:    kubectl -n personachain logs -f deployment/personachain-node"
echo "  Get pods:     kubectl -n personachain get pods"
echo "  Port forward: kubectl -n personachain port-forward svc/personachain-service 26657:26657"
echo ""
echo "🔧 To update your frontend, change the RPC endpoint to: http://$external_ip:26657"
echo "🔧 And REST endpoint to: http://$external_ip:8100"
echo ""

# Save endpoint information
cat > deployment-info.txt <<EOF
PersonaChain Google Cloud Deployment
=====================================
Project ID: $PROJECT_ID
Cluster: $CLUSTER_NAME
Region: $REGION

Endpoints:
- RPC: http://$external_ip:26657
- REST API: http://$external_ip:8100
- P2P: $external_ip:26656

Deployment Date: $(date)
EOF

echo "📄 Deployment information saved to deployment-info.txt"
echo ""
echo "🚀 Your PersonaChain blockchain is now running on Google Cloud!"
echo "   The blockchain will persist and auto-scale as needed."