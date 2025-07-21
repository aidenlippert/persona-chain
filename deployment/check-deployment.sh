#!/bin/bash
# Check PersonaChain deployment status

PROJECT_ID="personachain-prod"
CLUSTER_NAME="personachain-cluster"
ZONE="us-central1-a"

echo "🔍 PersonaChain Deployment Status Check"
echo "======================================="
echo ""

# Cluster status
echo "☁️ Cluster Status:"
CLUSTER_STATUS=$(gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(status)" 2>/dev/null)
echo "   Status: $CLUSTER_STATUS"

NODE_COUNT=$(gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(currentNodeCount)" 2>/dev/null)
echo "   Nodes: $NODE_COUNT"

# Check for LoadBalancer IPs
echo ""
echo "🌐 LoadBalancer Status:"
FORWARDING_RULES=$(gcloud compute forwarding-rules list --project=$PROJECT_ID --format="value(name,IPAddress)" 2>/dev/null)
if [ -z "$FORWARDING_RULES" ]; then
    echo "   No LoadBalancer IPs assigned yet"
else
    echo "   Forwarding Rules:"
    echo "$FORWARDING_RULES" | while read rule; do
        echo "     $rule"
    done
fi

# Check external addresses
EXTERNAL_IPS=$(gcloud compute addresses list --project=$PROJECT_ID --format="value(name,address)" 2>/dev/null)
if [ -z "$EXTERNAL_IPS" ]; then
    echo "   No external IPs assigned yet"
else
    echo "   External IPs:"
    echo "$EXTERNAL_IPS" | while read ip; do
        echo "     $ip"
    done
fi

# Check recent operations
echo ""
echo "⚙️ Recent Operations:"
gcloud container operations list --filter="targetLink:$CLUSTER_NAME" --project=$PROJECT_ID --limit=3 --format="table[no-heading](operationType,status,startTime)" 2>/dev/null | head -3

# Check for any LoadBalancer services in project
echo ""
echo "🔗 Load Balancer Services:"
LB_SERVICES=$(gcloud compute backend-services list --project=$PROJECT_ID --format="value(name)" 2>/dev/null)
if [ -z "$LB_SERVICES" ]; then
    echo "   No backend services found yet"
else
    echo "   Backend services: $LB_SERVICES"
fi

# Try to find any external IP that might be assigned
echo ""
echo "💡 Looking for any assigned external IPs..."
ALL_IPS=$(gcloud compute instances list --project=$PROJECT_ID --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null | grep -v "^$")
if [ ! -z "$ALL_IPS" ]; then
    echo "   Node external IPs:"
    echo "$ALL_IPS" | while read ip; do
        echo "     $ip"
        # Try to test if PersonaChain is accessible
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$ip:26657/status" 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ]; then
            echo "       ✅ PersonaChain accessible on $ip:26657"
        else
            echo "       ❌ Not accessible on $ip:26657 (code: $HTTP_CODE)"
        fi
    done
fi

echo ""
echo "📊 Summary:"
if [ "$CLUSTER_STATUS" = "RUNNING" ]; then
    echo "   ✅ Cluster is healthy"
else
    echo "   ⚠️ Cluster status: $CLUSTER_STATUS"
fi

if [ -z "$FORWARDING_RULES" ] && [ -z "$EXTERNAL_IPS" ]; then
    echo "   ⏳ LoadBalancer IP still being assigned (normal, can take 5-15 minutes)"
    echo "   💡 Suggestion: Run this script again in 5 minutes"
else
    echo "   ✅ External access configured"
fi