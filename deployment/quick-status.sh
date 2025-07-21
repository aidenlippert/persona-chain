#!/bin/bash
# Quick PersonaChain Production Status Check

echo "🚀 PersonaChain Production Status"
echo "================================="
echo ""

# Cluster status
echo "☁️ Infrastructure:"
gcloud container clusters describe personachain-cluster --zone=us-central1-a --project=personachain-prod --format="value(status)" | xargs echo "  Cluster:"

# Node count
node_count=$(gcloud compute instances list --project=personachain-prod --filter="name:gke-personachain" --format="value(name)" | wc -l)
echo "  Nodes: $node_count running"

# Try to get LoadBalancer IP
echo ""
echo "🌐 Network:"
external_ip=$(gcloud compute addresses list --project=personachain-prod --format="value(address)" 2>/dev/null | head -1)
if [ -z "$external_ip" ]; then
    echo "  LoadBalancer IP: ⏳ Being assigned..."
else
    echo "  LoadBalancer IP: ✅ $external_ip"
    echo "  RPC Endpoint: http://$external_ip:26657"
    echo "  REST API: http://$external_ip:8100"
fi

echo ""
echo "💡 Next Actions:"
echo "  1. Monitor: ./deployment/monitoring/track-deployment.sh"
echo "  2. Frontend: http://localhost:3000/"
echo "  3. Update config when IP ready: ./deployment/update-frontend-config.sh [IP]"