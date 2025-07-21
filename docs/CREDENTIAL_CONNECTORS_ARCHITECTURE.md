# PersonaPass Credential Connectors Architecture

## Overview

PersonaPass credential connectors enable users to import verified credentials from external platforms (GitHub, LinkedIn, ORCID, Plaid, Twitter, StackExchange) and convert them into W3C Verifiable Credentials with optional zero-knowledge proofs for selective disclosure.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend (React PWA)"
        UI[Connect Account UI]
        Dashboard[Credentials Dashboard]
        WalletStore[Wallet Store]
    end
    
    subgraph "Backend Services"
        Gateway[API Gateway/Envoy]
        Auth[Auth Service]
        
        subgraph "Connector Services"
            GH[GitHub Connector]
            LI[LinkedIn Connector]
            OR[ORCID Connector]
            PL[Plaid Connector]
            TW[Twitter Connector]
            SE[StackExchange Connector]
        end
        
        VC[VC Generator Service]
        ZK[ZK Commitment Service]
    end
    
    subgraph "External Platforms"
        GHO[GitHub OAuth]
        LIO[LinkedIn OAuth]
        ORO[ORCID OAuth]
        PLO[Plaid Link]
        TWO[Twitter OAuth]
        SEO[StackExchange OAuth]
    end
    
    subgraph "Storage"
        DB[(PostgreSQL)]
        IPFS[(IPFS/Arweave)]
        Chain[(Cosmos Chain)]
    end
    
    UI --> Gateway
    Dashboard --> Gateway
    Gateway --> Auth
    Gateway --> GH
    Gateway --> LI
    Gateway --> OR
    Gateway --> PL
    Gateway --> TW
    Gateway --> SE
    
    GH --> GHO
    LI --> LIO
    OR --> ORO
    PL --> PLO
    TW --> TWO
    SE --> SEO
    
    GH --> VC
    LI --> VC
    OR --> VC
    PL --> VC
    TW --> VC
    SE --> VC
    
    VC --> ZK
    VC --> DB
    ZK --> Chain
    VC --> IPFS
    
    WalletStore --> DB
```

## OAuth2 Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant Connector
    participant OAuth Provider
    participant VC Service
    participant ZK Service
    
    User->>Frontend: Click "Connect GitHub"
    Frontend->>Gateway: POST /api/connectors/github/auth
    Gateway->>Connector: Initiate OAuth flow
    Connector->>OAuth Provider: Authorization request
    OAuth Provider->>User: Login & consent page
    User->>OAuth Provider: Approve access
    OAuth Provider->>Connector: Authorization code
    Connector->>OAuth Provider: Exchange code for token
    OAuth Provider->>Connector: Access token
    Connector->>OAuth Provider: Fetch user profile
    OAuth Provider->>Connector: User data
    Connector->>VC Service: Generate VC request
    VC Service->>VC Service: Create W3C VC
    VC Service->>ZK Service: Generate ZK commitment
    ZK Service->>ZK Service: Create proof
    ZK Service->>VC Service: ZK commitment
    VC Service->>Connector: VC + ZK proof
    Connector->>Gateway: Return credential
    Gateway->>Frontend: Credential data
    Frontend->>User: Display success
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        TLS[TLS 1.3]
        MTLS[mTLS Between Services]
        JWT[JWT Authentication]
        PKCE[PKCE OAuth Flow]
        DPoP[DPoP Token Binding]
    end
    
    subgraph "Key Management"
        HSM[Hardware Security Module]
        KMS[Key Management Service]
        Vault[HashiCorp Vault]
    end
    
    subgraph "Access Control"
        RBAC[Role-Based Access]
        ABAC[Attribute-Based Access]
        Policy[OPA Policy Engine]
    end
    
    TLS --> MTLS
    MTLS --> JWT
    JWT --> PKCE
    PKCE --> DPoP
    
    HSM --> KMS
    KMS --> Vault
    
    RBAC --> ABAC
    ABAC --> Policy
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "Data Processing Pipeline"
        Raw[Raw OAuth Data]
        Normalized[Normalized Profile]
        Schema[JSON Schema Validation]
        VC[W3C VC Generation]
        ZK[ZK Commitment]
        Storage[Encrypted Storage]
    end
    
    Raw --> Normalized
    Normalized --> Schema
    Schema --> VC
    VC --> ZK
    ZK --> Storage
```

## Component Architecture

### 1. Frontend Components
- **ConnectorButton**: OAuth initiation UI
- **ConnectorStatus**: Connection state display
- **CredentialCard**: Imported credential display
- **CredentialActions**: Issue/present/revoke actions
- **ConsentDialog**: Data usage consent UI

### 2. Backend Services
- **OAuth Handler**: PKCE flow implementation
- **Profile Mapper**: Platform-specific data mapping
- **VC Generator**: W3C credential creation
- **ZK Service**: Privacy-preserving proofs
- **Storage Service**: Encrypted credential storage

### 3. Infrastructure
- **Kubernetes**: Container orchestration
- **Envoy Proxy**: Service mesh & TLS termination
- **Redis**: Session & token caching
- **PostgreSQL**: Credential metadata
- **IPFS**: Decentralized credential storage

## Deployment Architecture

```yaml
apiVersion: v1
kind: Service
metadata:
  name: connector-service
spec:
  type: ClusterIP
  ports:
  - port: 443
    targetPort: 8443
    protocol: TCP
  selector:
    app: connector
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: connector-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: connector
  template:
    metadata:
      labels:
        app: connector
    spec:
      containers:
      - name: connector
        image: personapass/connector:latest
        ports:
        - containerPort: 8443
        env:
        - name: OAUTH_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oauth-secrets
              key: client-id
        - name: OAUTH_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth-secrets
              key: client-secret
```

## Monitoring & Observability

```mermaid
graph TB
    subgraph "Metrics"
        Prometheus[Prometheus]
        Grafana[Grafana]
    end
    
    subgraph "Logging"
        Fluentd[Fluentd]
        Elasticsearch[Elasticsearch]
        Kibana[Kibana]
    end
    
    subgraph "Tracing"
        Jaeger[Jaeger]
        Zipkin[Zipkin]
    end
    
    Services[Connector Services]
    
    Services --> Prometheus
    Prometheus --> Grafana
    
    Services --> Fluentd
    Fluentd --> Elasticsearch
    Elasticsearch --> Kibana
    
    Services --> Jaeger
    Services --> Zipkin
```

## Performance Requirements

- OAuth flow completion: < 3 seconds
- VC generation: < 500ms
- ZK proof generation: < 2 seconds
- API response time: < 200ms (p99)
- Concurrent connections: 10,000+
- Availability: 99.9% uptime