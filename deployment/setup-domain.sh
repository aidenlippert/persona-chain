#!/bin/bash
# PersonaPass Domain Setup Script
# Configure personapass.xyz with SSL and production endpoints

set -e

DOMAIN="personapass.xyz"
PROJECT_ID="personachain-prod"
EXTERNAL_IP=${1:-""}

echo "🌐 Setting up personapass.xyz domain"
echo "===================================="
echo ""

if [ -z "$EXTERNAL_IP" ]; then
    echo "❌ Usage: $0 <EXTERNAL_IP>"
    echo "   Get the IP first: gcloud compute addresses list --project=$PROJECT_ID"
    echo "   Or wait for LoadBalancer: kubectl get svc -n personachain"
    exit 1
fi

echo "📍 External IP: $EXTERNAL_IP"
echo "🌐 Domain: $DOMAIN"
echo ""

# Create DNS records instructions
echo "📋 DNS Configuration Required:"
echo "================================"
echo ""
echo "Add these DNS records to your domain registrar:"
echo ""
echo "Type: A"
echo "Name: @"
echo "Value: $EXTERNAL_IP"
echo "TTL: 300"
echo ""
echo "Type: A" 
echo "Name: api"
echo "Value: $EXTERNAL_IP"
echo "TTL: 300"
echo ""
echo "Type: A"
echo "Name: rpc"
echo "Value: $EXTERNAL_IP"
echo "TTL: 300"
echo ""

# Production endpoints
echo "🚀 Production Endpoints (after DNS propagation):"
echo "================================================"
echo ""
echo "Frontend:     https://$DOMAIN"
echo "RPC:          https://rpc.$DOMAIN:26657"
echo "REST API:     https://api.$DOMAIN:8100"
echo "Health Check: https://rpc.$DOMAIN:26657/status"
echo ""

# SSL setup
echo "🔒 SSL Certificate Setup:"
echo "========================="
echo ""
echo "1. Install cert-manager in cluster:"
echo "   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml"
echo ""
echo "2. Create SSL certificate:"
cat > ssl-certificate.yaml <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@$DOMAIN
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: personapass-ingress
  namespace: personachain
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - $DOMAIN
    - api.$DOMAIN
    - rpc.$DOMAIN
    secretName: personapass-tls
  rules:
  - host: $DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personachain-service
            port:
              number: 8100
  - host: api.$DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personachain-service
            port:
              number: 8100
  - host: rpc.$DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personachain-service
            port:
              number: 26657
EOF

echo "   kubectl apply -f ssl-certificate.yaml"
echo ""

# Frontend configuration
echo "🔧 Frontend Configuration:"
echo "========================="
echo ""
echo "Update frontend to use production endpoints:"
echo "  ./deployment/update-frontend-config.sh $EXTERNAL_IP"
echo ""
echo "For HTTPS endpoints (after SSL setup):"
echo "  RPC: https://rpc.$DOMAIN:26657"
echo "  API: https://api.$DOMAIN:8100"
echo ""

# Monitoring setup
echo "📊 Monitoring Setup:"
echo "==================="
echo ""
echo "1. Add UptimeRobot monitors:"
echo "   - https://rpc.$DOMAIN:26657/status"
echo "   - https://api.$DOMAIN:8100/health"
echo "   - https://$DOMAIN"
echo ""
echo "2. Set up alerts for:"
echo "   - Blockchain sync status"
echo "   - Node health"
echo "   - Certificate expiration"
echo ""

echo "✅ Domain setup instructions generated!"
echo "📧 Email: Update MX records if needed for admin@$DOMAIN"
echo ""

# Save configuration
cat > domain-config.txt <<EOF
PersonaPass Domain Configuration
===============================
Domain: $DOMAIN
External IP: $EXTERNAL_IP
Date: $(date)

Production URLs:
- Frontend: https://$DOMAIN
- RPC: https://rpc.$DOMAIN:26657  
- API: https://api.$DOMAIN:8100

Next Steps:
1. Configure DNS records
2. Install cert-manager
3. Apply SSL certificate
4. Update frontend config
5. Set up monitoring
EOF

echo "💾 Configuration saved to domain-config.txt"