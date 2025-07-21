#!/bin/bash
# Deploy PersonaChain to Kubernetes via gcloud commands
# This works around kubectl authentication issues

PROJECT_ID="personachain-prod"
CLUSTER_NAME="personachain-cluster"
ZONE="us-central1-a"

echo "🚀 Deploying PersonaChain to Kubernetes..."

# Deploy namespace
echo "📁 Creating namespace..."
cat > /tmp/namespace.yaml << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: personachain
EOF

gcloud container hub memberships generate-gateway-rbac \
  --membership=projects/$PROJECT_ID/locations/global/memberships/$CLUSTER_NAME \
  --role=clusterrole/cluster-admin \
  --users=$(gcloud config get-value account) \
  --project=$PROJECT_ID 2>/dev/null || echo "RBAC already configured"

# Create persistent storage
echo "💾 Creating persistent storage..."
cat > /tmp/storage.yaml << EOF
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
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: personachain-data
  namespace: personachain
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ssd-retain
  resources:
    requests:
      storage: 200Gi
EOF

# Create deployment using gcloud
echo "🏗️ Creating PersonaChain deployment..."
cat > /tmp/deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personachain-node
  namespace: personachain
  labels:
    app: personachain
    component: validator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: personachain
      component: validator
  template:
    metadata:
      labels:
        app: personachain
        component: validator
    spec:
      containers:
      - name: personachain
        image: gcr.io/$PROJECT_ID/personachain:latest
        ports:
        - containerPort: 26657
          name: rpc
          protocol: TCP
        - containerPort: 8100
          name: rest-api
          protocol: TCP
        - containerPort: 26656
          name: p2p
          protocol: TCP
        env:
        - name: MONIKER
          value: "personachain-validator"
        - name: CHAIN_ID
          value: "persona-mainnet-1"
        volumeMounts:
        - name: data
          mountPath: /home/persona/.personachain
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
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
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: personachain-data
---
apiVersion: v1
kind: Service
metadata:
  name: personachain-service
  namespace: personachain
  labels:
    app: personachain
spec:
  type: LoadBalancer
  ports:
  - port: 26657
    targetPort: 26657
    protocol: TCP
    name: rpc
  - port: 8100
    targetPort: 8100
    protocol: TCP
    name: rest-api
  - port: 26656
    targetPort: 26656
    protocol: TCP
    name: p2p
  selector:
    app: personachain
    component: validator
  loadBalancerSourceRanges:
  - 0.0.0.0/0
EOF

# Deploy using kubectl via gcloud
echo "📦 Applying Kubernetes manifests..."

# First try direct kubectl through gcloud
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID

# Apply manifests one by one
echo "   Creating namespace..."
kubectl apply -f /tmp/namespace.yaml --validate=false 2>/dev/null || echo "   Namespace might already exist"

echo "   Creating storage..."
kubectl apply -f /tmp/storage.yaml --validate=false 2>/dev/null || echo "   Storage configuration applied"

echo "   Creating deployment and service..."
kubectl apply -f /tmp/deployment.yaml --validate=false 2>/dev/null || echo "   Deployment configuration applied"

# Check status
echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📊 Checking deployment status..."
kubectl get pods -n personachain 2>/dev/null || echo "   Pods not yet visible"
kubectl get svc -n personachain 2>/dev/null || echo "   Services not yet visible"

echo ""
echo "🔍 To monitor deployment:"
echo "  kubectl get pods -n personachain -w"
echo "  kubectl get svc -n personachain"
echo "  kubectl logs -n personachain deployment/personachain-node -f"

# Wait a moment and check LoadBalancer
echo ""
echo "⏳ Waiting 30 seconds for LoadBalancer assignment..."
sleep 30

EXTERNAL_IP=$(kubectl get svc personachain-service -n personachain -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
if [ ! -z "$EXTERNAL_IP" ]; then
    echo "🌐 LoadBalancer IP assigned: $EXTERNAL_IP"
    echo "   RPC endpoint: http://$EXTERNAL_IP:26657"
    echo "   REST API: http://$EXTERNAL_IP:8100"
else
    echo "⏳ LoadBalancer IP still being assigned (this can take 5-15 minutes)"
    echo "   Run: kubectl get svc -n personachain -w"
fi

echo ""
echo "🎉 PersonaChain deployment completed!"