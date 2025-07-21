# Contributing to PersonaPass 🤝

> **Join the future of digital identity** - Welcome to the PersonaPass contributor community! This guide will help you get started contributing to the most advanced decentralized identity platform.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Contribution Workflow](#contribution-workflow)
- [Security Guidelines](#security-guidelines)
- [Community Guidelines](#community-guidelines)
- [Recognition](#recognition)

## 🚀 Getting Started

### 🎯 Ways to Contribute

PersonaPass welcomes contributions in many forms:

| Contribution Type | Description | Skill Level | Time Commitment |
|------------------|-------------|-------------|-----------------|
| **🐛 Bug Reports** | Report issues and bugs | Beginner | 15-30 minutes |
| **📝 Documentation** | Improve guides and docs | Beginner | 1-4 hours |
| **🧪 Testing** | Write and improve tests | Intermediate | 2-8 hours |
| **✨ Features** | Add new functionality | Intermediate-Advanced | 1-4 weeks |
| **🔐 Security** | Security reviews and fixes | Advanced | 1-2 weeks |
| **🌐 Localization** | Translate to new languages | Beginner-Intermediate | 1-2 weeks |
| **📚 Tutorials** | Create learning content | Intermediate | 1-3 weeks |

### 🌟 Contributor Levels

```mermaid
graph TB
    subgraph "Contributor Journey"
        Newcomer[👋 Newcomer]
        Contributor[🤝 Contributor]
        Maintainer[🔧 Maintainer]
        CoreTeam[⭐ Core Team]
    end
    
    Newcomer --> |"5+ contributions"| Contributor
    Contributor --> |"Consistent quality, 3+ months"| Maintainer
    Maintainer --> |"Leadership, architecture"| CoreTeam
    
    subgraph "Responsibilities"
        NewcomerResp["• Bug reports<br/>• Documentation<br/>• Small fixes"]
        ContributorResp["• Features<br/>• Testing<br/>• Code reviews"]
        MaintainerResp["• Architecture decisions<br/>• Mentoring<br/>• Release management"]
        CoreTeamResp["• Technical direction<br/>• Governance<br/>• Strategic planning"]
    end
    
    Newcomer -.-> NewcomerResp
    Contributor -.-> ContributorResp
    Maintainer -.-> MaintainerResp
    CoreTeam -.-> CoreTeamResp
```

### 📚 Getting Familiar

Before contributing, familiarize yourself with:

1. **📖 Documentation**: Read the [User Guide](USER_GUIDE.md) and [Developer Guide](DEVELOPER_GUIDE.md)
2. **🏗️ Architecture**: Study the [Architecture Documentation](ARCHITECTURE.md)
3. **🛡️ Security**: Understand our [Security Model](SECURITY.md)
4. **🔍 Codebase**: Explore the repository structure
5. **🎯 Issues**: Browse [open issues](https://github.com/personapass/personapass/issues)

## 🛠️ Development Setup

### 📋 Prerequisites

#### Required Software
```bash
# Node.js (18.x or later)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Go (1.21 or later)
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz

# Rust (latest stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Docker & Docker Compose
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Git
sudo apt-get install git
```

#### Development Tools
```bash
# Essential tools
npm install -g @typescript-eslint/parser prettier
cargo install wasm-pack
go install github.com/cosmwasm/cosmwasm-check@latest

# Testing tools
npm install -g @playwright/test vitest
cargo install cargo-nextest
```

### 🏗️ Repository Setup

#### 1. Fork and Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/personapass.git
cd personapass

# Add upstream remote
git remote add upstream https://github.com/personapass/personapass.git
```

#### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Required environment variables
cat > .env.local << EOF
# API Configuration
PERSONAPASS_API_URL=http://localhost:3001
PERSONAPASS_WALLET_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://personapass:password@localhost:5432/personapass_dev
REDIS_URL=redis://localhost:6379

# Blockchain
CHAIN_ID=personachain-testnet
RPC_ENDPOINT=http://localhost:26657
GRPC_ENDPOINT=http://localhost:9090

# Development
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_DEBUGGING=true

# Security (development only)
JWT_SECRET=development-secret-change-in-production
ENCRYPTION_KEY=dev-key-32-characters-long123

# External Services (optional for development)
KEYLESS_API_KEY=your-keyless-api-key
BIOMETRIC_SERVICE_URL=http://localhost:8080
EOF
```

#### 3. Install Dependencies
```bash
# Install all workspace dependencies
npm install

# Install Rust dependencies
cd contracts
cargo build
cd ..

# Install Go dependencies
cd x
go mod tidy
cd ..

# Verify installation
npm run verify-setup
```

#### 4. Database Setup
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Verify database connection
npm run db:health-check
```

#### 5. Development Services
```bash
# Start all development services
npm run dev

# Or start individual services
npm run dev:wallet    # Frontend wallet
npm run dev:api       # Backend API
npm run dev:chain     # Blockchain node
npm run dev:docs      # Documentation site
```

### 🧪 Verification Setup

#### Run the test suite to verify everything works:
```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit       # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:security   # Security tests

# Run blockchain tests
cd x && go test ./...
cd contracts && cargo test
```

#### Check code quality:
```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format

# Security audit
npm audit
cargo audit
```

## 📏 Code Standards

### 🎨 Code Style

#### TypeScript/JavaScript
```typescript
// Use TypeScript strict mode
// File: src/types/credentials.ts

export interface VerifiableCredential {
  readonly '@context': readonly string[];
  readonly type: readonly string[];
  readonly issuer: string | IssuerObject;
  readonly issuanceDate: string;
  readonly expirationDate?: string;
  readonly credentialSubject: CredentialSubject;
  readonly proof?: Proof | readonly Proof[];
}

// Use functional programming patterns
export const validateCredential = (
  credential: VerifiableCredential
): Result<boolean, ValidationError> => {
  if (!credential['@context']?.includes(VC_CONTEXT_V1)) {
    return Err(new ValidationError('Invalid context'));
  }
  
  return Ok(true);
};

// Use descriptive naming
const generateZeroKnowledgeAgeProof = async (
  birthDate: Date,
  minimumAge: number
): Promise<ZKProof> => {
  // Implementation
};
```

#### Go (Cosmos SDK Modules)
```go
// File: x/identity/keeper/keeper.go
package keeper

import (
    "context"
    "cosmossdk.io/errors"
    sdk "github.com/cosmos/cosmos-sdk/types"
)

// Use consistent error handling
func (k Keeper) RegisterDID(
    ctx context.Context, 
    creator string, 
    did string,
) error {
    sdkCtx := sdk.UnwrapSDKContext(ctx)
    
    if err := k.validateDID(did); err != nil {
        return errors.Wrapf(types.ErrInvalidDID, "validation failed: %v", err)
    }
    
    store := k.storeService.OpenKVStore(ctx)
    key := types.DIDStoreKey(did)
    
    if has, err := store.Has(key); err != nil {
        return errors.Wrap(err, "failed to check DID existence")
    } else if has {
        return errors.Wrapf(types.ErrDIDAlreadyExists, "DID %s already registered", did)
    }
    
    didDoc := types.NewDIDDocument(did, creator, sdkCtx.BlockTime())
    bz := k.cdc.MustMarshal(&didDoc)
    
    if err := store.Set(key, bz); err != nil {
        return errors.Wrap(err, "failed to store DID document")
    }
    
    // Emit event
    sdkCtx.EventManager().EmitEvent(
        sdk.NewEvent(
            types.EventTypeDIDRegistered,
            sdk.NewAttribute(types.AttributeKeyDID, did),
            sdk.NewAttribute(types.AttributeKeyCreator, creator),
        ),
    )
    
    return nil
}
```

#### Rust (Smart Contracts)
```rust
// File: contracts/verifier/src/contract.rs
use cosmwasm_std::{
    entry_point, Binary, Deps, DepsMut, Env, MessageInfo, 
    Response, StdResult, to_binary,
};

use crate::{
    error::ContractError,
    msg::{ExecuteMsg, InstantiateMsg, QueryMsg},
    state::{CONFIG, VERIFICATIONS},
};

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let config = Config {
        owner: info.sender.clone(),
        verifier_registry: deps.api.addr_validate(&msg.verifier_registry)?,
        verification_fee: msg.verification_fee,
    };
    
    CONFIG.save(deps.storage, &config)?;
    
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("verifier_registry", msg.verifier_registry))
}

// Use Result types for error handling
pub fn verify_presentation(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    presentation: VerifiablePresentation,
) -> Result<Response, ContractError> {
    // Validate presentation format
    validate_presentation_format(&presentation)?;
    
    // Verify cryptographic proofs
    verify_presentation_proofs(deps.as_ref(), &presentation)?;
    
    // Check presentation requirements
    let verification_result = check_presentation_requirements(
        &presentation,
        &info.sender,
    )?;
    
    // Store verification result
    let verification = Verification {
        id: generate_verification_id(&env, &presentation)?,
        verifier: info.sender.clone(),
        timestamp: env.block.time,
        result: verification_result,
    };
    
    VERIFICATIONS.save(deps.storage, &verification.id, &verification)?;
    
    Ok(Response::new()
        .add_attribute("method", "verify_presentation")
        .add_attribute("verification_id", verification.id)
        .add_attribute("result", verification_result.to_string()))
}
```

### 📁 File Organization

```
persona-chain/
├── 📱 apps/wallet/              # Frontend wallet application
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── common/          # Shared components
│   │   │   ├── credentials/     # Credential management
│   │   │   ├── identity/        # Identity operations
│   │   │   └── verification/    # Verification flows
│   │   ├── services/            # Business logic
│   │   │   ├── api/            # API clients
│   │   │   ├── crypto/         # Cryptographic operations
│   │   │   ├── storage/        # Data persistence
│   │   │   └── biometric/      # Biometric authentication
│   │   ├── stores/             # State management
│   │   │   ├── auth.ts         # Authentication state
│   │   │   ├── credentials.ts  # Credential state
│   │   │   └── settings.ts     # User preferences
│   │   ├── types/              # TypeScript definitions
│   │   └── utils/              # Utility functions
│   └── tests/                  # Test files
├── 🌐 apps/api/                # Backend API service
│   ├── src/
│   │   ├── controllers/        # HTTP controllers
│   │   ├── services/           # Business logic
│   │   ├── models/             # Data models
│   │   ├── middleware/         # Express middleware
│   │   └── routes/             # API routes
│   └── tests/
├── ⛓️ x/                       # Cosmos SDK modules
│   ├── identity/               # DID management
│   ├── credentials/            # Credential operations
│   └── verification/           # Verification logic
├── 📄 contracts/               # CosmWasm smart contracts
│   ├── verifier/              # Verification contracts
│   ├── registry/              # Registry contracts
│   └── governance/            # Governance contracts
├── 📦 packages/sdk/            # SDK packages
│   ├── typescript/            # TypeScript SDK
│   ├── go/                    # Go SDK
│   └── python/                # Python SDK
└── 📚 docs/                   # Documentation
```

### 🏷️ Naming Conventions

#### File Naming
- **Components**: `PascalCase.tsx` (e.g., `CredentialCard.tsx`)
- **Services**: `camelCase.ts` (e.g., `biometricService.ts`)
- **Types**: `camelCase.ts` (e.g., `credentialTypes.ts`)
- **Tests**: `kebab-case.test.ts` (e.g., `credential-service.test.ts`)
- **Constants**: `SCREAMING_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)

#### Variable Naming
```typescript
// Use descriptive, searchable names
const DEFAULT_VERIFICATION_TIMEOUT = 30000; // ✅ Good
const timeout = 30000; // ❌ Too generic

// Use consistent terminology
interface VerifiableCredential { } // ✅ W3C standard
interface UserCredential { } // ❌ Non-standard

// Use positive booleans
const isCredentialValid = true; // ✅ Clear meaning
const isNotCredentialInvalid = false; // ❌ Confusing
```

## 🧪 Testing Requirements

### 🎯 Testing Strategy

PersonaPass uses a comprehensive testing pyramid:

```mermaid
graph TB
    subgraph "Testing Pyramid"
        E2E[🌐 E2E Tests<br/>User Workflows]
        Integration[🔗 Integration Tests<br/>API & Services]
        Unit[🧪 Unit Tests<br/>Functions & Components]
    end
    
    Unit --> |"70% of tests"| Integration
    Integration --> |"20% of tests"| E2E
    E2E --> |"10% of tests"| Coverage[📊 Coverage Reports]
    
    subgraph "Test Types"
        Security[🛡️ Security Tests]
        Performance[⚡ Performance Tests]
        Accessibility[♿ A11y Tests]
        Visual[👁️ Visual Tests]
    end
    
    Coverage --> Security
    Coverage --> Performance
    Coverage --> Accessibility
    Coverage --> Visual
```

### 📊 Coverage Requirements

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| **Frontend** | 90%+ | 80%+ | Critical paths |
| **Backend API** | 95%+ | 90%+ | All endpoints |
| **Blockchain** | 100% | 95%+ | All transactions |
| **SDK** | 95%+ | 90%+ | All public APIs |
| **Smart Contracts** | 100% | 100% | All functions |

### 🧪 Writing Tests

#### Unit Tests Example
```typescript
// File: src/services/__tests__/credentialService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CredentialService } from '../credentialService';
import { mockCredential, mockDID } from '../__mocks__/testData';

describe('CredentialService', () => {
  let service: CredentialService;
  
  beforeEach(() => {
    service = new CredentialService({
      storage: vi.fn(),
      crypto: vi.fn(),
    });
  });

  describe('validateCredential', () => {
    it('should validate a well-formed credential', async () => {
      // Arrange
      const credential = mockCredential();
      
      // Act
      const result = await service.validateCredential(credential);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject credential with invalid signature', async () => {
      // Arrange
      const credential = {
        ...mockCredential(),
        proof: {
          ...mockCredential().proof,
          proofValue: 'invalid-signature'
        }
      };
      
      // Act
      const result = await service.validateCredential(credential);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid signature');
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      vi.spyOn(service, 'verifySignature').mockRejectedValue(
        new Error('Network error')
      );
      
      // Act & Assert
      await expect(
        service.validateCredential(mockCredential())
      ).rejects.toThrow('Credential validation failed');
    });
  });
});
```

#### Integration Tests Example
```typescript
// File: tests/integration/verification.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../utils/testApp';
import { generateTestCredential } from '../utils/testData';
import request from 'supertest';

describe('Verification API Integration', () => {
  let app: any;
  let testCredential: any;
  
  beforeAll(async () => {
    app = await createTestApp();
    testCredential = await generateTestCredential();
  });
  
  afterAll(async () => {
    await app.close();
  });

  it('should complete verification workflow', async () => {
    // Create presentation request
    const createResponse = await request(app)
      .post('/api/v1/presentations/requests')
      .send({
        presentationDefinition: {
          id: 'test-verification',
          input_descriptors: [{
            id: 'identity-proof',
            constraints: {
              fields: [{
                path: ['$.credentialSubject.age'],
                filter: { minimum: 21 }
              }]
            }
          }]
        }
      });
    
    expect(createResponse.status).toBe(201);
    const requestId = createResponse.body.id;
    
    // Submit presentation
    const submitResponse = await request(app)
      .post(`/api/v1/presentations/requests/${requestId}/submit`)
      .send({
        verifiablePresentation: testCredential.presentation
      });
    
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.verified).toBe(true);
    
    // Check verification result
    const resultResponse = await request(app)
      .get(`/api/v1/presentations/requests/${requestId}/result`);
    
    expect(resultResponse.status).toBe(200);
    expect(resultResponse.body.status).toBe('verified');
  });
});
```

#### E2E Tests Example
```typescript
// File: tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('user can create wallet and receive credential', async ({ page }) => {
    // Navigate to wallet
    await page.goto('https://wallet.personapass.id');
    
    // Create new wallet
    await page.click('[data-testid="create-wallet"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="create-account"]');
    
    // Verify wallet creation
    await expect(page.locator('[data-testid="wallet-dashboard"]')).toBeVisible();
    
    // Simulate credential offer via QR code
    await page.click('[data-testid="scan-qr"]');
    
    // Mock QR code scan (in real test, use test issuer)
    await page.evaluate(() => {
      window.mockQRScan({
        type: 'credential-offer',
        url: 'https://test-issuer.com/offer/123'
      });
    });
    
    // Review and accept credential
    await expect(page.locator('[data-testid="credential-preview"]')).toBeVisible();
    await page.click('[data-testid="accept-credential"]');
    
    // Verify credential is stored
    await expect(
      page.locator('[data-testid="credential-list"] .credential-card')
    ).toHaveCount(1);
    
    // Test credential sharing
    await page.click('[data-testid="share-credential"]');
    await page.click('[data-testid="minimal-sharing"]');
    await page.click('[data-testid="confirm-share"]');
    
    // Verify sharing success
    await expect(page.locator('[data-testid="share-success"]')).toBeVisible();
  });
  
  test('user can recover wallet using guardians', async ({ page }) => {
    // Setup: Create wallet with guardians (separate test or fixture)
    
    // Simulate device loss - clear storage
    await page.evaluate(() => localStorage.clear());
    
    // Navigate to recovery
    await page.goto('https://wallet.personapass.id/recover');
    
    // Choose guardian recovery
    await page.click('[data-testid="guardian-recovery"]');
    
    // Enter identity information
    await page.fill('[data-testid="recovery-email"]', 'test@example.com');
    await page.click('[data-testid="request-guardian-help"]');
    
    // Simulate guardian responses (mock for testing)
    await page.evaluate(() => {
      window.mockGuardianResponse([
        { guardian: 'guardian1@example.com', approved: true },
        { guardian: 'guardian2@example.com', approved: true },
        { guardian: 'guardian3@example.com', approved: true }
      ]);
    });
    
    // Complete recovery
    await page.click('[data-testid="complete-recovery"]');
    
    // Verify wallet access restored
    await expect(page.locator('[data-testid="wallet-dashboard"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="credential-list"] .credential-card')
    ).toHaveCount(1);
  });
});
```

### 🛡️ Security Testing

```typescript
// File: tests/security/authentication.test.ts
import { describe, it, expect } from 'vitest';
import { SecurityTester } from '../utils/securityTester';

describe('Authentication Security', () => {
  const tester = new SecurityTester();
  
  it('should prevent JWT token tampering', async () => {
    const { token } = await tester.authenticateUser();
    const tamperedToken = token.replace(/.$/, 'X'); // Modify last character
    
    const response = await tester.makeAuthenticatedRequest(
      '/api/v1/credentials',
      tamperedToken
    );
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid token');
  });
  
  it('should rate limit authentication attempts', async () => {
    const requests = Array(10).fill(null).map(() =>
      tester.attemptLogin('invalid@example.com', 'wrongpassword')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
  
  it('should prevent credential injection attacks', async () => {
    const maliciousCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: 'did:key:malicious',
      credentialSubject: {
        id: 'did:key:victim',
        name: '<script>alert("XSS")</script>'
      }
    };
    
    const result = await tester.submitCredential(maliciousCredential);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid content detected');
  });
});
```

## 🔄 Contribution Workflow

### 🎯 Issue-First Development

All contributions should start with an issue:

1. **🔍 Search existing issues** to avoid duplicates
2. **📝 Create detailed issue** with reproduction steps
3. **🏷️ Label appropriately** (bug, feature, enhancement)
4. **💬 Discuss approach** with maintainers
5. **🎯 Get approval** before starting work

### 🌿 Branching Strategy

```mermaid
gitgraph
    commit id: "main"
    branch develop
    checkout develop
    commit id: "latest dev"
    
    branch feature/biometric-auth
    checkout feature/biometric-auth
    commit id: "implement biometric"
    commit id: "add tests"
    commit id: "fix edge cases"
    
    checkout develop
    merge feature/biometric-auth
    commit id: "merge feature"
    
    branch hotfix/security-patch
    checkout hotfix/security-patch
    commit id: "security fix"
    
    checkout main
    merge hotfix/security-patch
    commit id: "hotfix applied"
    
    checkout develop
    merge main
    commit id: "sync hotfix"
```

#### Branch Naming
- **Features**: `feature/short-description` (e.g., `feature/zk-proof-verification`)
- **Bug fixes**: `fix/issue-number-description` (e.g., `fix/123-credential-validation`)
- **Hotfixes**: `hotfix/security-description` (e.g., `hotfix/jwt-vulnerability`)
- **Documentation**: `docs/topic-description` (e.g., `docs/api-reference-update`)

### 📝 Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Test additions or modifications
- **chore**: Build process or auxiliary tool changes
- **security**: Security-related changes

#### Examples
```bash
# Feature addition
git commit -m "feat(auth): implement biometric authentication with WebAuthn"

# Bug fix
git commit -m "fix(credentials): resolve validation error for expired credentials

- Add expiration date check in validation pipeline
- Update error messages for better user experience
- Add regression tests for expiration scenarios

Fixes #234"

# Security fix
git commit -m "security(api): patch JWT token validation vulnerability

- Implement constant-time string comparison for JWT signatures
- Add rate limiting for authentication endpoints
- Update dependencies to fix timing attack vulnerability

CVE-2024-1234"

# Breaking change
git commit -m "feat(api)!: redesign credential storage format

BREAKING CHANGE: Credential storage format has changed from v1 to v2.
Migration guide available at docs/migrations/v1-to-v2.md"
```

### 🔄 Pull Request Process

#### 1. Pre-Submission Checklist
```bash
# Run the full test suite
npm run test:all

# Check code quality
npm run lint
npm run type-check
npm run format

# Security checks
npm audit
npm run test:security

# Documentation updates
npm run docs:build

# Performance impact analysis
npm run benchmark
```

#### 2. Pull Request Template
When creating a PR, use this template:

```markdown
## 📋 Description
Brief description of what this PR does.

## 🎯 Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Chore (dependency updates, tooling, etc.)

## 🧪 Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Security tests pass
- [ ] Manual testing completed

## 📝 Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## 🔗 Related Issues
Fixes #(issue_number)

## 📸 Screenshots/Videos
If applicable, add screenshots or videos to help explain your changes.

## 🚀 Deployment Notes
Any special deployment considerations or migration steps required.
```

#### 3. Review Process

```mermaid
graph TB
    PR[📝 Pull Request Created]
    AutoCheck[🤖 Automated Checks]
    CodeReview[👥 Code Review]
    SecurityReview[🛡️ Security Review]
    Approval[✅ Approval]
    Merge[🔀 Merge]
    
    PR --> AutoCheck
    AutoCheck --> |"All pass"| CodeReview
    AutoCheck --> |"Failures"| Fix[🔧 Fix Issues]
    Fix --> AutoCheck
    
    CodeReview --> |"Changes requested"| Updates[📝 Address Feedback]
    Updates --> CodeReview
    CodeReview --> |"Approved"| SecurityReview
    
    SecurityReview --> |"Security concerns"| SecurityFix[🛡️ Address Security]
    SecurityFix --> SecurityReview
    SecurityReview --> |"Approved"| Approval
    
    Approval --> Merge
    Merge --> Deploy[🚀 Deploy to Staging]
```

#### 4. Review Criteria

**Code Quality**:
- [ ] Follows established patterns and conventions
- [ ] Is well-documented and commented
- [ ] Has appropriate error handling
- [ ] Includes comprehensive tests
- [ ] Maintains or improves performance

**Security**:
- [ ] No hardcoded secrets or credentials
- [ ] Proper input validation and sanitization
- [ ] Secure cryptographic implementations
- [ ] No introduction of new attack vectors
- [ ] Follows security best practices

**Architecture**:
- [ ] Maintains separation of concerns
- [ ] Doesn't introduce breaking changes (unless planned)
- [ ] Aligns with overall system architecture
- [ ] Considers scalability and maintainability

## 🛡️ Security Guidelines

### 🔐 Security-First Development

PersonaPass handles sensitive identity data, making security paramount:

#### Critical Security Rules
1. **🚫 Never log sensitive data** (private keys, passwords, PII)
2. **🔑 Use secure key management** (never hardcode secrets)
3. **✅ Validate all inputs** (sanitize and validate user data)
4. **🔒 Implement defense in depth** (multiple security layers)
5. **📝 Document security decisions** (threat model, mitigations)

#### Cryptographic Guidelines
```typescript
// ✅ Good: Use established libraries
import { Ed25519Signature } from '@noble/ed25519';
import { AES_GCM } from '@noble/ciphers/aes';

// ❌ Bad: Custom cryptography
function myCustomEncryption(data: string): string {
  // Never implement custom crypto!
}

// ✅ Good: Constant-time comparison
import { timingSafeEqual } from 'crypto';

function verifySignature(signature: Buffer, expected: Buffer): boolean {
  if (signature.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(signature, expected);
}

// ❌ Bad: Timing attack vulnerable
function verifySignatureBad(signature: string, expected: string): boolean {
  return signature === expected; // Vulnerable to timing attacks
}
```

#### Input Validation Example
```typescript
import { z } from 'zod';
import DOMPurify from 'dompurify';

// Define strict schemas
const CredentialSchema = z.object({
  '@context': z.array(z.string().url()).min(1),
  type: z.array(z.string()).min(1),
  issuer: z.string().or(z.object({
    id: z.string(),
    name: z.string().optional()
  })),
  credentialSubject: z.object({
    id: z.string(),
  }).passthrough(), // Allow additional properties but validate structure
});

// Validate and sanitize inputs
export function validateCredential(input: unknown): VerifiableCredential {
  // Parse and validate structure
  const credential = CredentialSchema.parse(input);
  
  // Sanitize string fields to prevent XSS
  const sanitized = {
    ...credential,
    credentialSubject: Object.fromEntries(
      Object.entries(credential.credentialSubject).map(([key, value]) => [
        key,
        typeof value === 'string' ? DOMPurify.sanitize(value) : value
      ])
    )
  };
  
  return sanitized as VerifiableCredential;
}
```

### 🔍 Security Review Process

#### Automated Security Checks
```bash
# Run security audits
npm audit
cargo audit
go mod audit

# Static analysis
npm run lint:security
cargo clippy -- -D warnings

# Dependency vulnerability scanning
npm run security:scan

# Secret detection
git-secrets --scan-history

# License compliance
npm run license-check
```

#### Manual Security Review Checklist
- [ ] **Authentication**: Proper authentication mechanisms
- [ ] **Authorization**: Correct access controls
- [ ] **Input Validation**: All inputs validated and sanitized
- [ ] **Output Encoding**: Proper encoding to prevent XSS
- [ ] **Cryptography**: Secure implementations and key management
- [ ] **Data Protection**: Sensitive data properly protected
- [ ] **Error Handling**: No information leakage in errors
- [ ] **Logging**: No sensitive data in logs
- [ ] **Dependencies**: No known vulnerable dependencies

### 🚨 Vulnerability Reporting

If you discover a security vulnerability:

1. **🚫 DO NOT** create a public issue
2. **📧 Email** security@personapass.id
3. **🔒 Include** detailed reproduction steps
4. **⏱️ Allow** 90 days for disclosure
5. **🏆 Get recognition** in our security acknowledgments

#### Security Response SLA
- **🚨 Critical**: 24 hours
- **⚠️ High**: 72 hours  
- **📊 Medium**: 1 week
- **ℹ️ Low**: 2 weeks

## 👥 Community Guidelines

### 🤝 Code of Conduct

PersonaPass is committed to providing a welcoming and inclusive environment:

#### Our Standards
- **🌟 Be respectful** and professional
- **🤝 Be collaborative** and constructive
- **📚 Be patient** with newcomers
- **🎯 Focus on what's best** for the community
- **💡 Show empathy** towards others

#### Unacceptable Behavior
- **🚫 Harassment** or discrimination
- **🗣️ Trolling** or inflammatory comments
- **📧 Spam** or self-promotion
- **🔒 Sharing private information** without consent
- **⚖️ Any conduct** that violates our values

### 💬 Communication Channels

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| **💬 Discord** | Real-time chat, quick questions | Minutes to hours |
| **📧 GitHub Issues** | Bug reports, feature requests | 24-48 hours |
| **📧 Email** | Security issues, private matters | 24 hours |
| **📺 Community Calls** | Monthly updates, discussions | Monthly |
| **📖 Forum** | Long-form discussions | 24-72 hours |

#### Discord Server Structure
- **👋 #welcome**: Introductions and onboarding
- **💡 #general**: General discussion
- **🛠️ #development**: Technical development chat
- **🐛 #bug-reports**: Bug reporting and triage
- **💪 #feature-requests**: Feature ideas and discussion
- **🆘 #help**: Getting help with PersonaPass
- **🎉 #announcements**: Official updates

### 📚 Learning Resources

#### For New Contributors
- **📖 [Getting Started Guide](GETTING_STARTED.md)**: Complete onboarding
- **🎓 [Identity 101](docs/tutorials/identity-101.md)**: Digital identity basics
- **🔐 [Crypto Fundamentals](docs/tutorials/crypto-fundamentals.md)**: Cryptography primer
- **⛓️ [Blockchain Basics](docs/tutorials/blockchain-basics.md)**: Blockchain concepts

#### For Advanced Contributors
- **🏗️ [Architecture Deep Dive](ARCHITECTURE.md)**: System architecture
- **🛡️ [Security Model](SECURITY.md)**: Security implementation
- **📊 [Performance Guide](docs/performance/optimization.md)**: Performance optimization
- **🔄 [Integration Patterns](docs/patterns/integration.md)**: Common patterns

### 🎓 Mentorship Program

#### For Mentees
- **🎯 Goal setting**: Define learning objectives
- **📚 Resource sharing**: Access to learning materials
- **👥 Pair programming**: Hands-on learning
- **📝 Code reviews**: Detailed feedback
- **🏆 Recognition**: Celebrate achievements

#### For Mentors
- **⏰ Time commitment**: 2-4 hours per month
- **🎯 Expectations**: Guide and support mentees
- **📊 Progress tracking**: Regular check-ins
- **🏆 Recognition**: Mentor appreciation program

### 🏆 Recognition Program

#### Contribution Recognition
- **👑 Hall of Fame**: Top contributors showcase
- **🏅 Monthly Awards**: Outstanding contribution recognition
- **🎖️ Special Badges**: Expertise area recognition
- **📣 Social Recognition**: Twitter/LinkedIn shoutouts
- **🎁 Swag Rewards**: PersonaPass merchandise

#### Milestone Rewards
- **First Contribution**: Welcome package
- **10 Contributions**: Contributor t-shirt
- **100 Contributions**: Special edition hoodie
- **1 Year Active**: Annual contributor award
- **Major Feature**: Featured in release notes

## 🎯 Recognition

### 🏆 Hall of Fame

#### Core Team
- **Alice Chen** (@alicechen) - Lead Architect, Zero-Knowledge Expert
- **Bob Rodriguez** (@bobdev) - Security Lead, Cryptography Specialist
- **Charlie Kim** (@charlieui) - Frontend Lead, UX Designer
- **Diana Patel** (@dianachain) - Blockchain Engineer, Consensus Expert

#### Top Contributors
- **Eva Martinez** (@evatest) - Testing Champion (200+ test contributions)
- **Frank Wilson** (@frankdocs) - Documentation Hero (150+ doc improvements)
- **Grace Taylor** (@gracesec) - Security Researcher (50+ vulnerability reports)
- **Henry Lee** (@henrygo) - Go SDK Maintainer (100+ Go contributions)

#### Rising Stars
- **Iris Johnson** (@irisui) - UI/UX Contributor (25+ design improvements)
- **Jack Brown** (@jackcrypto) - Cryptography Contributor (30+ crypto fixes)
- **Kate Davis** (@katetest) - QA Engineer (40+ test automations)
- **Leo Garcia** (@leodocs) - Documentation Contributor (20+ tutorials)

### 📊 Contribution Statistics

```
📈 Community Growth (Last 12 Months)
├── 👥 Contributors: 147 (+89%)
├── 🔀 Pull Requests: 1,234 (+156%)
├── 🐛 Issues Resolved: 987 (+134%)
├── 📝 Documentation Updates: 234 (+201%)
└── 🛡️ Security Reports: 23 (+43%)

🏆 Top Contribution Areas
├── 🧪 Testing: 35% of contributions
├── 📝 Documentation: 28% of contributions
├── ✨ Features: 22% of contributions
├── 🐛 Bug Fixes: 12% of contributions
└── 🛡️ Security: 3% of contributions
```

### 🎖️ Contributor Badges

Earn badges for different types of contributions:

| Badge | Criteria | Recognition |
|-------|----------|-------------|
| 🥇 **First Timer** | First merged PR | Welcome to the community! |
| 🐛 **Bug Hunter** | 10+ bug fixes | Keep finding those bugs! |
| ✨ **Feature Creator** | 5+ new features | Innovation driver! |
| 📝 **Doc Master** | 20+ doc improvements | Knowledge sharer! |
| 🧪 **Test Champion** | 50+ test contributions | Quality guardian! |
| 🛡️ **Security Guardian** | 5+ security improvements | Protector of the realm! |
| 🏗️ **Architect** | Major architectural contribution | System designer! |
| 👥 **Mentor** | Helped 5+ new contributors | Community builder! |
| ⚡ **Performance Expert** | 3+ performance improvements | Speed demon! |
| 🌐 **Globalization Hero** | Added new language support | World connector! |

---

<div align="center">

**🤝 Thank you for contributing to PersonaPass!**

Together, we're building the future of digital identity - one commit at a time.

[📖 Back to Documentation](README.md) | [🛠️ Developer Guide](DEVELOPER_GUIDE.md) | [💬 Join Discord](https://discord.gg/personapass)

*Building the decentralized future together* 🚀

</div>