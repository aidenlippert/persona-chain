#!/bin/bash
# Deploy PersonaChain directly on Google Compute Engine VM
# Much simpler than Kubernetes for our use case

PROJECT_ID="personachain-prod"
ZONE="us-central1-a"
VM_NAME="personachain-vm"
DOCKER_IMAGE="gcr.io/$PROJECT_ID/personachain:latest"

echo "🚀 Deploying PersonaChain on Compute Engine VM..."
echo "================================================="

# Step 1: Create VM instance with Docker
echo "🖥️ Creating VM instance..."
gcloud compute instances create $VM_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --machine-type=e2-standard-4 \
    --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --tags=personachain-server,http-server \
    --create-disk=auto-delete=yes,boot=yes,device-name=$VM_NAME,image=projects/cos-cloud/global/images/family/cos-stable,mode=rw,size=50,type=projects/$PROJECT_ID/zones/$ZONE/diskTypes/pd-ssd \
    --shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=app=personachain \
    --reservation-affinity=any 2>/dev/null || echo "VM might already exist"

# Step 2: Create firewall rules for PersonaChain ports
echo "🔥 Creating firewall rules..."
gcloud compute firewall-rules create allow-personachain-rpc \
    --project=$PROJECT_ID \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:26657,tcp:8100,tcp:26656 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=personachain-server 2>/dev/null || echo "Firewall rule might already exist"

# Step 3: Wait for VM to be ready
echo "⏳ Waiting for VM to be ready..."
sleep 30

# Step 4: Get VM external IP
VM_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null)
echo "🌐 VM External IP: $VM_IP"

# Step 5: Deploy PersonaChain container on VM
echo "🐳 Deploying PersonaChain container..."
gcloud compute ssh $VM_NAME \
    --zone=$ZONE \
    --project=$PROJECT_ID \
    --command="
        # Configure Docker for GCR
        docker-credential-gcr configure-docker --registries=gcr.io
        
        # Pull and run PersonaChain
        docker pull $DOCKER_IMAGE
        
        # Stop any existing container
        docker stop personachain 2>/dev/null || true
        docker rm personachain 2>/dev/null || true
        
        # Run PersonaChain with proper port mapping
        docker run -d \
            --name personachain \
            --restart unless-stopped \
            -p 26657:26657 \
            -p 8100:8100 \
            -p 26656:26656 \
            -e CHAIN_ID=persona-mainnet-1 \
            -e MONIKER=persona-gcp-vm \
            $DOCKER_IMAGE
            
        # Wait a moment for container to start
        sleep 10
        
        # Check if container is running
        docker ps | grep personachain
        
        # Check logs
        docker logs personachain --tail 20
    " 2>/dev/null || echo "SSH deployment attempted"

# Step 6: Wait for PersonaChain to start
echo "⏳ Waiting 30 seconds for PersonaChain to start..."
sleep 30

# Step 7: Test PersonaChain connectivity
echo "🧪 Testing PersonaChain connectivity..."
if [ ! -z "$VM_IP" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$VM_IP:26657/status" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "🎉 SUCCESS! PersonaChain is running!"
        echo "📡 RPC Endpoint: http://$VM_IP:26657"
        echo "🔗 REST API: http://$VM_IP:8100"
        echo "📊 Status URL: http://$VM_IP:26657/status"
        
        # Save the working endpoint
        echo "$VM_IP" > /tmp/personachain-ip.txt
        echo "http://$VM_IP:26657" > /tmp/personachain-rpc.txt
        echo "http://$VM_IP:8100" > /tmp/personachain-rest.txt
        
        # Test the status endpoint
        echo ""
        echo "📊 PersonaChain Status:"
        curl -s "http://$VM_IP:26657/status" | jq '.result.node_info' 2>/dev/null || curl -s "http://$VM_IP:26657/status"
        
        exit 0
    else
        echo "⚠️ PersonaChain not responding yet (HTTP $HTTP_CODE)"
    fi
else
    echo "❌ Could not get VM IP"
fi

echo ""
echo "🔍 Troubleshooting info:"
echo "VM Name: $VM_NAME"
echo "VM IP: $VM_IP"
echo "Project: $PROJECT_ID"
echo ""
echo "📝 Manual check commands:"
echo "gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID"
echo "docker logs personachain"
echo "docker ps"