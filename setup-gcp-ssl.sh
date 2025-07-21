#!/bin/bash

echo "🚀 Setting up SSL/HTTPS for PersonaChain on Google Cloud"

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK first."
    exit 1
fi

echo "📋 Current setup checklist:"
echo "1. PersonaChain running on GKE cluster"
echo "2. Internal IP: 34.170.121.182"
echo "3. Need: SSL termination with public access"

echo ""
echo "🔧 Setting up NGINX Ingress with SSL..."

# Create NGINX Ingress Controller
cat > nginx-ingress.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: personachain-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "Content-Type, Authorization"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - rpc.personachain.io
    - api.personachain.io
    secretName: personachain-tls
  rules:
  - host: rpc.personachain.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personachain-service
            port:
              number: 26657
  - host: api.personachain.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: personachain-service
            port:
              number: 1317
EOF

echo "✅ Created nginx-ingress.yaml"

# Create Let's Encrypt ClusterIssuer
cat > letsencrypt-issuer.yaml << 'EOF'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@personachain.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

echo "✅ Created letsencrypt-issuer.yaml"

echo ""
echo "📝 Manual steps to complete:"
echo "1. Set up DNS records:"
echo "   rpc.personachain.io → [LoadBalancer IP]"
echo "   api.personachain.io → [LoadBalancer IP]"
echo ""
echo "2. Apply the configurations:"
echo "   kubectl apply -f nginx-ingress.yaml"
echo "   kubectl apply -f letsencrypt-issuer.yaml"
echo ""
echo "3. Get the LoadBalancer IP:"
echo "   kubectl get svc -l app.kubernetes.io/name=ingress-nginx"
echo ""
echo "4. Wait for SSL certificate provisioning (5-10 minutes)"
echo "   kubectl get certificates"
echo ""

echo "🎯 Final URLs will be:"
echo "   https://rpc.personachain.io"
echo "   https://api.personachain.io"