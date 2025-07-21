#!/bin/bash
# Google Cloud Setup Script
# Quick setup for PersonaChain deployment

set -e

echo "🌩️ Setting up Google Cloud for PersonaChain deployment"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "📦 Installing Google Cloud CLI..."
    
    # For Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
        curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
        sudo apt-get update && sudo apt-get install google-cloud-cli kubectl -y
    
    # For macOS
    elif command -v brew &> /dev/null; then
        brew install google-cloud-sdk kubectl
    
    # Manual installation
    else
        echo "Please install Google Cloud CLI manually:"
        echo "https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    echo "✅ Google Cloud CLI installed"
fi

echo ""
echo "🔐 Please complete the following setup steps:"
echo ""
echo "1️⃣ Authenticate with Google Cloud:"
echo "   gcloud auth login"
echo ""
echo "2️⃣ Create or select a project:"
echo "   gcloud projects create personachain-prod --name='PersonaChain Production'"
echo "   gcloud config set project personachain-prod"
echo ""
echo "3️⃣ Enable billing (required for GKE):"
echo "   https://console.cloud.google.com/billing"
echo ""
echo "4️⃣ Deploy PersonaChain:"
echo "   cd /home/rocz/persona-chain"
echo "   ./deployment/gcp/deploy.sh personachain-prod"
echo ""
echo "🎯 After setup, your blockchain will be accessible at:"
echo "   - RPC: http://[EXTERNAL-IP]:26657"
echo "   - REST API: http://[EXTERNAL-IP]:8100"
echo ""
echo "💡 The deployment script will output the actual IP addresses."
echo ""

# Create .dockerignore for efficient builds
cat > /home/rocz/persona-chain/.dockerignore <<EOF
# Development files
node_modules/
.git/
.gitignore
*.log
*.md
README.md

# Build artifacts
dist/
build/
target/

# Local config
.env
.env.local
*.pid

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Test files
*_test.go
*test*
coverage.out

# Documentation
docs/
*.md
!README.md

# Deployment local files
deployment/nodes/
deployment/*.txt
deployment/*.log
EOF

echo "📄 Created .dockerignore for efficient builds"
echo ""
echo "🚀 Ready for Google Cloud deployment!"