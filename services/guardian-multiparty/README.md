# 🛡️ Guardian Multi-Party Control System

**Enterprise governance with threshold signatures and approval workflows for PersonaChain identity infrastructure**

## 🌟 Overview

The Guardian Multi-Party Control System is a production-ready microservice that implements enterprise-grade governance, threshold cryptography, and approval workflows for decentralized identity credential management. It provides democratic decision-making, multi-party signatures, and comprehensive audit trails for institutional-grade security.

## 🏗️ Architecture

### System Components

```
Guardian Multi-Party Control
├── 🏛️ Governance Service          # Democratic proposal and voting system
├── 🔐 Threshold Signature Service # Multi-party cryptographic signatures
├── ⚡ Approval Workflow Service   # Automated proposal execution
├── 👥 Guardian Management Service # Guardian lifecycle and authentication
├── 📋 Policy Engine Service       # Rule validation and compliance
├── 📊 Audit Service              # Comprehensive compliance logging
├── 📧 Notification Service       # Multi-channel communication
└── 🔒 Encryption Service         # Data protection and key management
```

### Key Features

- **🏛️ Democratic Governance**: Proposal creation, voting, and consensus mechanisms
- **🔐 Threshold Cryptography**: Multi-party signatures with Shamir's Secret Sharing
- **⚡ Automated Execution**: Workflow orchestration with rollback capabilities
- **👥 Guardian Management**: Complete lifecycle management with MFA and RBAC
- **📋 Policy Enforcement**: Real-time validation and compliance checking
- **📊 Audit & Compliance**: SOC 2, GDPR, HIPAA compliance with forensic analysis
- **📧 Multi-Channel Alerts**: Email, SMS, Slack, Discord notifications
- **🔒 Enterprise Security**: AES-256-GCM encryption with HSM integration

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+
npm 9+
Redis 6+
MongoDB 5+
```

### Installation

```bash
# Clone the repository
git clone https://github.com/persona-chain/guardian-multiparty.git
cd guardian-multiparty

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the service
npm start
```

### Configuration

```javascript
// .env file
PORT=3006
NODE_ENV=production
JWT_SECRET=your_jwt_secret_here
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/guardian-multiparty

# Threshold configuration
DEFAULT_THRESHOLD=3
MAX_GUARDIANS=10
MIN_GUARDIANS=3

# Governance configuration
VOTING_PERIOD=604800000  # 7 days
QUORUM_THRESHOLD=0.6     # 60%
APPROVAL_THRESHOLD=0.5   # 50%

# Security configuration
MFA_REQUIRED=true
MAX_LOGIN_ATTEMPTS=5
SESSION_TIMEOUT=86400000 # 24 hours

# Notification channels
SLACK_WEBHOOK_URL=your_slack_webhook
DISCORD_WEBHOOK_URL=your_discord_webhook
SMTP_HOST=smtp.your-provider.com
TWILIO_ACCOUNT_SID=your_twilio_sid
```

## 🔧 API Reference

### Core Endpoints

#### 🏛️ Governance

**Create Proposal**
```http
POST /api/governance/proposals
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "title": "Add New Guardian",
  "description": "Proposal to add Alice as a new guardian",
  "type": "GUARDIAN_ADDITION",
  "actions": [{
    "type": "add_guardian",
    "target": "guardian_system",
    "parameters": {
      "guardianId": "alice_guardian",
      "name": "Alice Smith",
      "permissions": ["vote", "sign"]
    }
  }],
  "metadata": {
    "priority": "normal",
    "category": "administration"
  }
}
```

**Vote on Proposal**
```http
POST /api/governance/proposals/{proposalId}/vote
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "vote": "approve",
  "signature": "0x1234...",
  "comments": "Approved - Alice has demonstrated expertise"
}
```

#### 🔐 Threshold Signatures

**Initiate Threshold Signing**
```http
POST /api/threshold/sign
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "credentialData": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiableCredential", "IdentityCredential"],
    "credentialSubject": {
      "id": "did:persona:user:12345",
      "fullName": "John Doe",
      "dateOfBirth": "1990-01-15"
    }
  },
  "threshold": 3,
  "guardians": ["guardian_1", "guardian_2", "guardian_3", "guardian_4"],
  "metadata": {
    "scheme": "ED25519",
    "keySetId": "keyset_abc123"
  }
}
```

**Participate in Signing**
```http
POST /api/threshold/sign/{sessionId}/participate
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "guardianId": "guardian_1",
  "partialSignature": "0xabcd...",
  "nonce": "0x1234..."
}
```

#### 👥 Guardian Management

**Get All Guardians**
```http
GET /api/guardians
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "guardians": [
    {
      "id": "guardian_1",
      "name": "Alice Smith",
      "email": "alice@company.com",
      "role": "ADMIN",
      "status": "active",
      "lastActive": "2024-01-15T10:30:00Z",
      "permissions": ["guardian.create", "proposal.vote"]
    }
  ],
  "total": 7
}
```

#### 📊 Audit & Compliance

**Get Audit Logs**
```http
GET /api/audit/logs?limit=100&type=proposal_created&fromDate=2024-01-01
Authorization: Bearer <jwt-token>
```

**Export Compliance Report**
```http
GET /api/audit/compliance/soc2?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <jwt-token>
```

## 🏛️ Governance Framework

### Proposal Types

| Type | Description | Required Approval | Voting Period | Emergency |
|------|-------------|-------------------|---------------|-----------|
| **GUARDIAN_ADDITION** | Add new guardian | 60% | 7 days | No |
| **GUARDIAN_REMOVAL** | Remove guardian | 70% | 7 days | Yes |
| **THRESHOLD_CHANGE** | Change signing threshold | 80% | 14 days | No |
| **POLICY_UPDATE** | Update governance policies | 60% | 7 days | No |
| **EMERGENCY_ACTION** | Emergency governance action | 80% | 24 hours | Yes |
| **CREDENTIAL_POLICY** | Update credential policies | 50% | 7 days | No |
| **SYSTEM_UPGRADE** | System upgrades | 70% | 7 days | Yes |

### Voting Process

1. **Proposal Creation**: Any guardian can create proposals
2. **Validation**: Policy engine validates proposal against rules
3. **Notification**: All guardians notified via multiple channels
4. **Voting Period**: Guardians cast cryptographically signed votes
5. **Consensus**: Automatic resolution when thresholds met
6. **Execution**: Approved proposals executed via workflow service
7. **Audit**: Complete audit trail maintained

## 🔐 Threshold Cryptography

### Supported Schemes

- **ED25519**: EdDSA signatures with Curve25519
- **SECP256K1**: ECDSA signatures (Bitcoin/Ethereum compatible)
- **BLS12-381**: BLS signatures with aggregation support

### Key Management

```javascript
// Generate threshold keys
const keys = await thresholdService.generateThresholdKeys(
  3,    // threshold
  5,    // total guardians
  'ED25519'  // signature scheme
);

// Initiate signing session
const session = await thresholdService.initiateSigning({
  credentialData: vcData,
  threshold: 3,
  guardians: ['g1', 'g2', 'g3', 'g4', 'g5'],
  metadata: { scheme: 'ED25519', keySetId: keys.keySetId }
});

// Add partial signatures
await thresholdService.addPartialSignature(session.id, {
  guardianId: 'g1',
  partialSignature: signature,
  nonce: nonce
});

// Combine when threshold reached
const finalSignature = await thresholdService.combineSignatures(session.id);
```

### Security Features

- **Shamir's Secret Sharing**: Keys split across guardians
- **Forward Secrecy**: Regular key rotation
- **Zero-Knowledge Proofs**: Optional privacy preservation
- **Hardware Security**: HSM integration support
- **Audit Trails**: Complete cryptographic audit logs

## 📋 Policy Engine

### Policy Types

- **Governance Policies**: Voting rules, quorum requirements
- **Threshold Policies**: Signing thresholds, guardian authorization
- **Credential Policies**: Issuance rules, schema validation
- **Security Policies**: Authentication, access control
- **Compliance Policies**: Regulatory requirements, data handling

### Policy Example

```yaml
---
name: "Minimum Threshold Policy"
type: "threshold"
description: "Enforce minimum signing threshold"
rules:
  - id: "min_threshold_rule"
    condition:
      type: "min_threshold"
      value: 3
    action: "reject"
    severity: "error"
conditions:
  - type: "equals"
    field: "credentialType"
    value: "IdentityCredential"
---
```

## 📊 Monitoring & Analytics

### Health Endpoints

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "governance": { "status": "healthy", "totalProposals": 142 },
    "thresholdSignature": { "status": "healthy", "activeSessions": 3 },
    "guardianManagement": { "status": "healthy", "activeGuardians": 7 }
  },
  "metrics": {
    "uptime": 86400,
    "memory": { "used": 256, "total": 1024 },
    "cpu": { "user": 12.5, "system": 3.2 }
  }
}
```

### Metrics & KPIs

- **Governance Metrics**: Proposals created/approved, voting participation
- **Security Metrics**: Failed logins, policy violations, threshold compliance
- **Performance Metrics**: Response times, throughput, error rates
- **Compliance Metrics**: Audit coverage, retention compliance, access logs

## 🔒 Security Architecture

### Multi-Layer Security

1. **Transport Security**: TLS 1.3, certificate pinning
2. **Authentication**: JWT, OAuth 2.0, MFA required
3. **Authorization**: RBAC, resource-based permissions
4. **Encryption**: AES-256-GCM, Argon2id key derivation
5. **Audit**: Comprehensive logging, integrity protection
6. **Network**: Rate limiting, DDoS protection, IP allowlisting

### Guardian Security Model

```javascript
// Guardian roles and permissions
const roles = {
  ADMIN: {
    permissions: [
      'guardian.create', 'guardian.delete', 'guardian.modify',
      'proposal.create', 'proposal.vote', 'proposal.execute',
      'threshold.sign', 'threshold.manage',
      'policy.create', 'policy.modify', 'audit.view'
    ]
  },
  SENIOR_GUARDIAN: {
    permissions: [
      'proposal.create', 'proposal.vote',
      'threshold.sign', 'policy.view', 'audit.view'
    ]
  },
  GUARDIAN: {
    permissions: ['proposal.vote', 'threshold.sign']
  }
};

// Multi-factor authentication
const mfaSetup = {
  totp: true,           // Time-based OTP
  backupCodes: true,    // Recovery codes
  sms: true,           // SMS verification
  email: true,         // Email verification
  hardware: false      // Hardware tokens (optional)
};
```

## 📧 Notification System

### Supported Channels

- **📧 Email**: SMTP integration with templates
- **📱 SMS**: Twilio integration for critical alerts
- **💬 Slack**: Webhook integration for team notifications
- **🎮 Discord**: Webhook integration for community alerts
- **🔗 Webhooks**: Custom HTTP callbacks
- **📲 Push**: Mobile push notifications (future)

### Notification Types

- **Governance**: Proposal created/approved, voting reminders
- **Security**: Failed logins, policy violations, emergency actions
- **Operations**: System maintenance, guardian changes
- **Threshold**: Signing requests, signature completion
- **Compliance**: Audit alerts, regulatory notifications

## 🧪 Testing

### Comprehensive Test Suite

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:security     # Security tests
npm run test:performance  # Performance tests

# Run system integration test
node test-guardian-system.js
```

### Test Coverage

- **Unit Tests**: 95%+ coverage for all services
- **Integration Tests**: Complete API workflow testing
- **End-to-End Tests**: Full guardian governance scenarios
- **Security Tests**: Penetration testing, vulnerability scans
- **Performance Tests**: Load testing up to 1000 concurrent operations

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3006
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: guardian-multiparty
spec:
  replicas: 3
  selector:
    matchLabels:
      app: guardian-multiparty
  template:
    metadata:
      labels:
        app: guardian-multiparty
    spec:
      containers:
      - name: guardian-multiparty
        image: persona-chain/guardian-multiparty:latest
        ports:
        - containerPort: 3006
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: MONGODB_URL
          value: "mongodb://mongo-service:27017/guardian"
```

### Environment Configuration

```bash
# Production environment
NODE_ENV=production
PORT=3006
JWT_SECRET=your-256-bit-secret
ENCRYPTION_KEY=your-256-bit-encryption-key

# Database configuration
REDIS_URL=redis://redis-cluster:6379
MONGODB_URL=mongodb://mongo-cluster:27017/guardian-prod

# High availability
CLUSTER_MODE=true
REPLICAS=3
LOAD_BALANCER=nginx

# Security
CORS_ORIGIN=https://persona-chain.com
RATE_LIMIT=1000
MFA_REQUIRED=true
HSM_ENABLED=true

# Monitoring
METRICS_ENABLED=true
PROMETHEUS_PORT=9090
GRAFANA_ENABLED=true
```

## 📚 API Documentation

### Interactive Documentation

Access the interactive API documentation at:
- **Development**: http://localhost:3006/api-docs
- **Production**: https://api.persona-chain.com/guardian/api-docs

### OpenAPI Specification

The complete OpenAPI 3.0 specification includes:
- All endpoints with request/response schemas
- Authentication requirements
- Error codes and responses
- Interactive testing interface
- Code generation samples

## 🤝 Contributing

### Development Setup

```bash
# Clone and setup
git clone https://github.com/persona-chain/guardian-multiparty.git
cd guardian-multiparty
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Code Standards

- **ESLint**: Airbnb configuration with customizations
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages
- **Test Coverage**: 90%+ required for new code
- **Security**: SAST scanning required

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support

- **📖 Documentation**: [docs.persona-chain.com/guardian](https://docs.persona-chain.com/guardian)
- **💬 Discord**: [discord.gg/persona-chain](https://discord.gg/persona-chain)
- **🐛 Issues**: [github.com/persona-chain/guardian-multiparty/issues](https://github.com/persona-chain/guardian-multiparty/issues)
- **📧 Enterprise Support**: enterprise@persona-chain.com

---

**🛡️ Building the future of decentralized identity governance**

The Guardian Multi-Party Control System provides the enterprise-grade governance and security infrastructure needed for institutional adoption of decentralized identity. With democratic decision-making, threshold cryptography, and comprehensive compliance, it enables organizations to manage identity credentials with the highest levels of security and transparency.

[**Get Started**](https://docs.persona-chain.com/guardian/quickstart) | [**View Demo**](https://demo.persona-chain.com/guardian) | [**Enterprise Sales**](mailto:enterprise@persona-chain.com)