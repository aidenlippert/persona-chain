#!/bin/bash

# PersonaChain Development Environment Setup
# Sets up comprehensive development tools for the world's most advanced identity platform

set -e

echo "🚀 Setting up PersonaChain development environment..."

# Create tools directory structure
mkdir -p tools/{mcp,generators,scripts,validators,security,performance,ai}
mkdir -p docs/{api,architecture,compliance,security,guides}
mkdir -p test/{unit,integration,e2e,security,performance,compliance}
mkdir -p deploy/{k8s,helm,terraform,monitoring}
mkdir -p sdk/{js,python,java,go,dotnet,rust,php}
mkdir -p services/{auth,compliance,security,analytics,marketplace}

# Install essential development tools
echo "📦 Installing development dependencies..."

# Node.js tooling for MCPs and web services
cat > package.json << 'EOF'
{
  "name": "persona-chain-platform",
  "version": "1.0.0",
  "description": "World's most advanced enterprise identity platform",
  "main": "index.js",
  "scripts": {
    "dev": "concurrently \"npm run blockchain\" \"npm run api\" \"npm run web\"",
    "blockchain": "./persona-chaind start",
    "api": "node services/api/server.js",
    "web": "cd apps/wallet && npm run dev",
    "test": "jest --coverage",
    "test:e2e": "playwright test",
    "test:security": "node tools/security/scan.js",
    "test:performance": "k6 run test/performance/load-test.js",
    "build": "npm run build:blockchain && npm run build:services && npm run build:web",
    "build:blockchain": "go build -o persona-chaind ./cmd/persona-chaind",
    "build:services": "node tools/generators/build-services.js",
    "build:web": "cd apps/wallet && npm run build",
    "deploy": "node tools/deploy/deploy.js",
    "monitor": "node tools/monitoring/dashboard.js",
    "docs": "node tools/generators/docs.js",
    "sdk": "node tools/generators/sdk.js",
    "compliance": "node tools/compliance/audit.js",
    "security": "node tools/security/audit.js"
  },
  "dependencies": {
    "@cosmjs/proto-signing": "^0.32.4",
    "@cosmjs/stargate": "^0.32.4",
    "@digitalcredentials/did-io": "^1.0.0",
    "@digitalcredentials/vc": "^6.0.0",
    "@playwright/test": "^1.40.0",
    "@prisma/client": "^5.7.0",
    "@rapidapi/sdk": "^1.2.0",
    "axios": "^1.6.2",
    "concurrently": "^8.2.2",
    "ethers": "^6.8.1",
    "express": "^4.18.2",
    "jest": "^29.7.0",
    "jsonld": "^8.3.0",
    "k6": "^0.1.0",
    "prisma": "^5.7.0",
    "ws": "^8.14.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.4",
    "nodemon": "^3.0.2",
    "typescript": "^5.3.3"
  }
}
EOF

# Install Node.js dependencies
npm install

# Install Go tools
echo "🔧 Installing Go development tools..."
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
go install github.com/securecodewarrior/sast-scan@latest
go install github.com/google/wire/cmd/wire@latest
go install github.com/bufbuild/buf/cmd/buf@latest
go install github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@latest
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Install security tools
echo "🔒 Installing security tools..."
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin

# Install compliance tools
echo "📋 Installing compliance tools..."
npm install -g @drata/cli @vanta/cli @onetrust/cli

# Install monitoring tools
echo "📊 Installing monitoring tools..."
curl -L https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz | tar xz
curl -L https://github.com/grafana/grafana/releases/download/v10.2.2/grafana-10.2.2.linux-amd64.tar.gz | tar xz

# Create development environment file
cat > .env.development << 'EOF'
# PersonaChain Development Environment

# Blockchain Configuration
CHAIN_ID=persona-chain-dev
MONIKER=persona-dev-node
RPC_PORT=26657
API_PORT=1317
GRPC_PORT=9090

# Database Configuration
DATABASE_URL=postgresql://persona:persona@localhost:5432/persona_chain_dev
REDIS_URL=redis://localhost:6379

# API Configuration
API_BASE_URL=http://localhost:8080
JWT_SECRET=dev-secret-key-change-in-production

# MCP Server Configuration
CONTEXT7_API_KEY=your-context7-key
SEQUENTIAL_API_KEY=your-sequential-key
MAGIC_API_KEY=your-magic-key
RAPIDAPI_KEY=your-rapidapi-key

# AI/ML Configuration
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Cloud Provider Keys
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-secret
GCP_PROJECT_ID=your-gcp-project

# Security Tools
CROWDSTRIKE_API_KEY=your-crowdstrike-key
SENTINELONE_API_KEY=your-sentinelone-key

# Compliance Tools  
DRATA_API_KEY=your-drata-key
VANTA_API_KEY=your-vanta-key
ONETRUST_API_KEY=your-onetrust-key

# Monitoring
DATADOG_API_KEY=your-datadog-key
NEW_RELIC_API_KEY=your-newrelic-key

# HSM Configuration
HSM_ENABLED=false
HSM_PIN=your-hsm-pin
HSM_SLOT=0

# Performance Targets
TARGET_TPS=10000
TARGET_LATENCY=200
TARGET_UPTIME=99.99
EOF

# Create Makefile for easy development
cat > Makefile << 'EOF'
.PHONY: dev build test deploy clean

# Development
dev:
	npm run dev

blockchain:
	./persona-chaind start --home ~/.persona-chain

api:
	node services/api/server.js

web:
	cd apps/wallet && npm run dev

# Build
build:
	npm run build

build-blockchain:
	go build -o persona-chaind ./cmd/persona-chaind

build-services:
	node tools/generators/build-services.js

# Testing
test:
	npm test

test-unit:
	go test ./... -v

test-integration:
	npm run test:integration

test-e2e:
	npm run test:e2e

test-security:
	npm run test:security

test-performance:
	npm run test:performance

test-compliance:
	npm run compliance

# Security
security-scan:
	golangci-lint run
	grype .
	syft .

dependency-scan:
	npm audit --audit-level=high

# Quality
lint:
	golangci-lint run
	npm run lint

format:
	gofmt -w .
	npm run format

# Documentation
docs:
	npm run docs

# SDK Generation
sdk:
	npm run sdk

# Deployment
deploy-dev:
	kubectl apply -f deploy/k8s/dev/

deploy-staging:
	kubectl apply -f deploy/k8s/staging/

deploy-prod:
	kubectl apply -f deploy/k8s/production/

# Monitoring
monitor:
	npm run monitor

# Database
db-migrate:
	prisma migrate dev

db-seed:
	node tools/scripts/seed.js

db-reset:
	prisma migrate reset

# Clean
clean:
	rm -rf node_modules dist build
	go clean

# Help
help:
	@echo "PersonaChain Development Commands:"
	@echo "  dev              - Start development environment"
	@echo "  build            - Build all components"
	@echo "  test             - Run all tests"
	@echo "  security-scan    - Run security scans"
	@echo "  deploy-dev       - Deploy to development"
	@echo "  docs             - Generate documentation"
	@echo "  sdk              - Generate SDKs"
	@echo "  monitor          - Start monitoring dashboard"
	@echo "  clean            - Clean build artifacts"
EOF

# Create Git hooks for quality
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# PersonaChain pre-commit hook

set -e

echo "🔍 Running pre-commit checks..."

# Run linting
make lint

# Run security scan
make security-scan

# Run unit tests
make test-unit

echo "✅ Pre-commit checks passed!"
EOF

chmod +x .git/hooks/pre-commit

# Create development shortcuts
cat > tools/scripts/quick-start.sh << 'EOF'
#!/bin/bash

echo "🚀 PersonaChain Quick Start"
echo "1. Starting blockchain..."
make blockchain &

echo "2. Starting API services..."
make api &

echo "3. Starting web interface..."
make web &

echo "4. Opening monitoring dashboard..."
make monitor &

echo "✅ PersonaChain development environment is ready!"
echo "   🌐 Web UI: http://localhost:3000"
echo "   🔗 API: http://localhost:8080"
echo "   ⛓️  RPC: http://localhost:26657" 
echo "   📊 Monitor: http://localhost:9090"
EOF

chmod +x tools/scripts/quick-start.sh

# Create AI-powered development assistant
cat > tools/ai/dev-assistant.js << 'EOF'
#!/usr/bin/env node

// PersonaChain AI Development Assistant
// Provides intelligent code suggestions, documentation, and testing

const { OpenAI } = require('openai');

class PersonaChainDevAssistant {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateCode(prompt, language = 'go') {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: `You are an expert developer for PersonaChain, the world's most advanced enterprise identity platform. Generate production-ready ${language} code that follows best practices, includes error handling, and is thoroughly documented.`
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0.1
    });

    return response.choices[0].message.content;
  }

  async generateTests(codeFile) {
    // Auto-generate comprehensive tests for code files
    const code = require('fs').readFileSync(codeFile, 'utf8');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system', 
        content: 'Generate comprehensive unit tests with 95%+ coverage for the provided code. Include edge cases, error scenarios, and performance tests.'
      }, {
        role: 'user',
        content: `Generate tests for this code:\n\n${code}`
      }]
    });

    return response.choices[0].message.content;
  }

  async generateDocs(codeFile) {
    // Auto-generate technical documentation
    const code = require('fs').readFileSync(codeFile, 'utf8');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'Generate comprehensive technical documentation for the provided code. Include API references, usage examples, and architecture explanations.'
      }, {
        role: 'user', 
        content: `Generate documentation for:\n\n${code}`
      }]
    });

    return response.choices[0].message.content;
  }
}

module.exports = PersonaChainDevAssistant;

// CLI interface
if (require.main === module) {
  const assistant = new PersonaChainDevAssistant();
  const command = process.argv[2];
  const input = process.argv[3];

  switch (command) {
    case 'code':
      assistant.generateCode(input).then(console.log);
      break;
    case 'test':
      assistant.generateTests(input).then(console.log);
      break;
    case 'docs':
      assistant.generateDocs(input).then(console.log);
      break;
    default:
      console.log('Usage: node dev-assistant.js [code|test|docs] [input]');
  }
}
EOF

echo "✅ PersonaChain development environment setup complete!"
echo ""
echo "🚀 Quick start commands:"
echo "  make dev         - Start full development environment"
echo "  make test        - Run comprehensive test suite"
echo "  make security    - Run security scans"
echo "  make docs        - Generate documentation"
echo ""
echo "🔧 Development tools configured:"
echo "  • Comprehensive build system with Makefile"
echo "  • AI-powered development assistant"
echo "  • Security scanning with Grype/Syft"
echo "  • Performance testing with K6"
echo "  • Compliance automation"
echo "  • Multi-language SDK generation"
echo "  • Git hooks for quality gates"
echo ""
echo "📚 Next steps:"
echo "  1. Configure your .env.development file with API keys"
echo "  2. Run 'make dev' to start the development environment"
echo "  3. Visit http://localhost:3000 to access the web interface"
echo ""
echo "🌟 Ready to build the future of identity!"