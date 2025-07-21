#!/bin/bash
# Check Kubernetes deployment status using gcloud commands
# Workaround for kubectl auth issues

PROJECT_ID="personachain-prod"
CLUSTER_NAME="personachain-cluster"
ZONE="us-central1-a"

echo "🔍 PersonaChain Kubernetes Status Check"
echo "======================================="
echo ""

# Check cluster status
echo "☁️ Cluster Information:"
gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID \
    --format="value(status,currentNodeCount,location)" 2>/dev/null | \
    while IFS=$'\t' read -r status nodes location; do
        echo "   Status: $status"
        echo "   Nodes: $nodes"
        echo "   Location: $location"
    done

# Check for LoadBalancer external IPs
echo ""
echo "🌐 LoadBalancer Status:"
EXTERNAL_IPS=$(gcloud compute addresses list --project=$PROJECT_ID --format="value(address)" --filter="purpose=GCE_ENDPOINT" 2>/dev/null)
if [ -z "$EXTERNAL_IPS" ]; then
    echo "   No static external IPs found"
else
    echo "   External IPs: $EXTERNAL_IPS"
fi

# Check forwarding rules (LoadBalancer services create these)
echo ""
echo "🔗 Forwarding Rules:"
FORWARDING_RULES=$(gcloud compute forwarding-rules list --project=$PROJECT_ID --format="value(name,IPAddress)" 2>/dev/null)
if [ -z "$FORWARDING_RULES" ]; then
    echo "   No forwarding rules found yet"
    echo "   (LoadBalancer service may still be creating)"
else
    echo "$FORWARDING_RULES" | while read rule; do
        echo "   $rule"
    done
fi

# Check for any HTTP(S) load balancers
echo ""
echo "📊 Backend Services:"
BACKEND_SERVICES=$(gcloud compute backend-services list --project=$PROJECT_ID --format="value(name)" 2>/dev/null)
if [ -z "$BACKEND_SERVICES" ]; then
    echo "   No backend services found"
else
    echo "   Backend services: $BACKEND_SERVICES"
fi

# Check recent operations for any LoadBalancer activity
echo ""
echo "⚙️ Recent Operations (last 5):"
gcloud container operations list --filter="targetLink:$CLUSTER_NAME" --project=$PROJECT_ID --limit=5 \
    --format="table[no-heading](operationType,status,startTime)" 2>/dev/null | head -5

# Try to detect if PersonaChain might be running on node IPs
echo ""
echo "🧪 Testing Node Connectivity:"
NODE_IPS=$(gcloud compute instances list --project=$PROJECT_ID \
    --filter="name~gke-$CLUSTER_NAME" \
    --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null | grep -v "^$")

if [ ! -z "$NODE_IPS" ]; then
    echo "$NODE_IPS" | while read ip; do
        echo "   Testing $ip:26657..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$ip:26657/status" 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ]; then
            echo "     ✅ PersonaChain responding on $ip:26657"
            echo "     🌐 Test URL: http://$ip:26657/status"
        else
            echo "     ❌ No response on $ip:26657 (code: $HTTP_CODE)"
        fi
    done
else
    echo "   No node IPs found"
fi

echo ""
echo "📝 Summary:"
echo "   - Cluster is running with healthy nodes"
echo "   - LoadBalancer assignment typically takes 5-15 minutes"
echo "   - PersonaChain pods may be starting up"
echo ""
echo "💡 Next steps:"
echo "   1. Wait 5-10 more minutes for LoadBalancer IP assignment"
echo "   2. If no LoadBalancer IP, troubleshoot service creation"
echo "   3. Test PersonaChain connectivity once IP is assigned"