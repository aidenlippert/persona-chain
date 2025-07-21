#!/bin/bash
# PersonaChain Production Monitoring Script
# Real-time tracking of deployment status and health

set -e

PROJECT_ID="personachain-prod"
CLUSTER_NAME="personachain-cluster"
ZONE="us-central1-a"

echo "🔍 PersonaChain Production Monitoring Dashboard"
echo "=============================================="
echo ""

# Function to get external IP
get_external_ip() {
    gcloud compute addresses list --project=$PROJECT_ID --format="value(address)" --filter="name:personachain" 2>/dev/null || \
    gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(servicesIPV4Cidr)" 2>/dev/null || \
    echo "Pending..."
}

# Function to check service status
check_service_status() {
    local ip=$1
    if [ "$ip" != "Pending..." ] && [ ! -z "$ip" ]; then
        echo "🌐 Testing blockchain endpoints..."
        
        # Test RPC
        rpc_status=$(curl -s -o /dev/null -w "%{http_code}" "http://$ip:26657/status" 2>/dev/null || echo "000")
        
        # Test REST API
        api_status=$(curl -s -o /dev/null -w "%{http_code}" "http://$ip:8100/cosmos/base/tendermint/v1beta1/node_info" 2>/dev/null || echo "000")
        
        echo "  RPC (26657): $([ "$rpc_status" = "200" ] && echo "✅ Online" || echo "❌ Offline ($rpc_status)")"
        echo "  API (8100):  $([ "$api_status" = "200" ] && echo "✅ Online" || echo "❌ Offline ($api_status)")"
        
        if [ "$rpc_status" = "200" ]; then
            echo ""
            echo "📊 Blockchain Status:"
            curl -s "http://$ip:26657/status" | jq -r '.result | "  Chain ID: \(.node_info.network)", "  Block Height: \(.sync_info.latest_block_height)", "  Catching Up: \(.sync_info.catching_up)", "  Peers: \(.node_info.other.p2p_laddr)"' 2>/dev/null || echo "  Status data unavailable"
        fi
    else
        echo "⏳ LoadBalancer IP still being assigned..."
    fi
}

# Main monitoring loop
while true; do
    clear
    echo "🔍 PersonaChain Production Monitoring Dashboard"
    echo "=============================================="
    echo "$(date '+%Y-%m-%d %H:%M:%S UTC')"
    echo ""
    
    # Cluster status
    echo "☁️ Google Cloud Infrastructure:"
    cluster_status=$(gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(status)" 2>/dev/null || echo "Unknown")
    echo "  Cluster Status: $cluster_status"
    
    # Node status
    echo "  Nodes:"
    gcloud compute instances list --project=$PROJECT_ID --format="table[no-heading](name,zone.basename(),machineType.basename(),status,networkInterfaces[0].accessConfigs[0].natIP)" --filter="name:gke-personachain" | while read line; do
        echo "    $line"
    done
    
    echo ""
    
    # Service status
    echo "🌐 Blockchain Services:"
    external_ip=$(get_external_ip)
    echo "  External IP: $external_ip"
    
    check_service_status "$external_ip"
    
    echo ""
    echo "💰 Estimated Monthly Cost: ~$185 (3 nodes + storage + load balancer)"
    echo ""
    echo "🔄 Auto-refreshing every 30 seconds... (Ctrl+C to exit)"
    echo "📱 Frontend URL: http://localhost:3000/"
    if [ "$external_ip" != "Pending..." ] && [ ! -z "$external_ip" ]; then
        echo "🔧 To update frontend: ./deployment/update-frontend-config.sh $external_ip"
    fi
    
    sleep 30
done