# PersonaPass API Reference 🔧

> **Complete API documentation** - Comprehensive reference for all PersonaPass APIs including REST endpoints, GraphQL schemas, and SDK methods.

## 📋 Table of Contents

- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Wallet API](#wallet-api)
- [Verifier API](#verifier-api)
- [Issuer API](#issuer-api)
- [Blockchain API](#blockchain-api)
- [SDK Reference](#sdk-reference)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)

## 🌐 API Overview

PersonaPass provides multiple API layers for different use cases:

| API Type | Base URL | Purpose | Authentication |
|----------|----------|---------|----------------|
| **Wallet API** | `https://api.personapass.id/wallet` | Wallet operations | Bearer Token |
| **Verifier API** | `https://api.personapass.id/verifier` | Verification requests | API Key |
| **Issuer API** | `https://api.personapass.id/issuer` | Credential issuance | OAuth 2.0 |
| **Blockchain API** | `https://rpc.personapass.id` | Direct chain access | None |
| **GraphQL API** | `https://api.personapass.id/graphql` | Unified queries | Bearer Token |

### 🔧 OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: PersonaPass API
  description: Digital Identity Platform API
  version: 1.0.0-rc1
  contact:
    name: PersonaPass Support
    url: https://personapass.id/support
    email: api-support@personapass.id
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.personapass.id/v1
    description: Production server
  - url: https://staging-api.personapass.id/v1
    description: Staging server
  - url: http://localhost:3001/v1
    description: Development server

security:
  - BearerAuth: []
  - ApiKeyAuth: []
  - OAuth2: [read, write]

paths:
  /wallet/credentials:
    get:
      tags: [Wallet]
      summary: List wallet credentials
      description: Retrieve all credentials stored in the user's wallet
      security:
        - BearerAuth: []
      parameters:
        - name: type
          in: query
          description: Filter by credential type
          schema:
            type: string
            example: "DriverLicense"
        - name: issuer
          in: query
          description: Filter by issuer DID
          schema:
            type: string
            example: "did:web:dmv.state.gov"
        - name: status
          in: query
          description: Filter by credential status
          schema:
            type: string
            enum: [active, expired, revoked]
            default: active
        - name: limit
          in: query
          description: Maximum number of results
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: offset
          in: query
          description: Number of results to skip
          schema:
            type: integer
            minimum: 0
            default: 0
      responses:
        '200':
          description: Credentials retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  credentials:
                    type: array
                    items:
                      $ref: '#/components/schemas/VerifiableCredential'
                  totalCount:
                    type: integer
                    example: 42
                  hasMore:
                    type: boolean
                    example: true
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.personapass.id/oauth/authorize
          tokenUrl: https://auth.personapass.id/oauth/token
          scopes:
            read: Read access to resources
            write: Write access to resources
            admin: Administrative access

  schemas:
    VerifiableCredential:
      type: object
      required:
        - "@context"
        - id
        - type
        - issuer
        - issuanceDate
        - credentialSubject
        - proof
      properties:
        "@context":
          type: array
          items:
            type: string
          example: ["https://www.w3.org/2018/credentials/v1"]
        id:
          type: string
          format: uri
          example: "https://credentials.personapass.id/123456"
        type:
          type: array
          items:
            type: string
          example: ["VerifiableCredential", "DriverLicense"]
        issuer:
          oneOf:
            - type: string
              format: uri
            - type: object
              properties:
                id:
                  type: string
                  format: uri
                name:
                  type: string
          example: "did:web:dmv.state.gov"
        issuanceDate:
          type: string
          format: date-time
          example: "2024-01-15T10:30:00Z"
        expirationDate:
          type: string
          format: date-time
          example: "2029-01-15T10:30:00Z"
        credentialSubject:
          type: object
          properties:
            id:
              type: string
              format: uri
          additionalProperties: true
        proof:
          type: object
          properties:
            type:
              type: string
              example: "Ed25519Signature2020"
            created:
              type: string
              format: date-time
            verificationMethod:
              type: string
              format: uri
            proofPurpose:
              type: string
              example: "assertionMethod"
            proofValue:
              type: string

  responses:
    Unauthorized:
      description: Authentication failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    InternalServerError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

## 🔐 Authentication

### 🎫 JWT Bearer Token Authentication

Most wallet operations require JWT authentication:

```http
Authorization: Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

#### Token Request
```bash
curl -X POST https://auth.personapass.id/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "securePassword123",
    "mfaCode": "123456"
  }'
```

#### Token Response
```json
{
  "accessToken": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "scope": "wallet:read wallet:write"
}
```

### 🗝️ API Key Authentication

Verifier and issuer operations use API keys:

```http
X-API-Key: pk_live_1234567890abcdef...
```

### 🔒 OAuth 2.0 Flow

Enterprise integrations use OAuth 2.0:

```bash
# Step 1: Authorization URL
https://auth.personapass.id/oauth/authorize?
  response_type=code&
  client_id=your_client_id&
  redirect_uri=https://yourapp.com/callback&
  scope=credentials:read presentations:create&
  state=random_state_string

# Step 2: Exchange code for token
curl -X POST https://auth.personapass.id/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&
      code=auth_code_from_step1&
      client_id=your_client_id&
      client_secret=your_client_secret&
      redirect_uri=https://yourapp.com/callback"
```

## 📱 Wallet API

### 🆔 DID Management

#### Create DID
```http
POST /wallet/dids
Content-Type: application/json
Authorization: Bearer {token}

{
  "method": "key",
  "keyType": "Ed25519",
  "options": {
    "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
  }
}
```

```typescript
// TypeScript interface
interface CreateDIDRequest {
  method: 'key' | 'web' | 'ion' | 'elem';
  keyType: 'Ed25519' | 'secp256k1' | 'P-256';
  options?: {
    publicKeyMultibase?: string;
    serviceEndpoints?: ServiceEndpoint[];
  };
}

interface CreateDIDResponse {
  did: string;
  didDocument: DIDDocument;
  keys: {
    privateKey: string;
    publicKey: string;
    keyId: string;
  };
}
```

#### Resolve DID
```http
GET /wallet/dids/{did}
Authorization: Bearer {token}
```

```json
{
  "didDocument": {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "verificationMethod": [{
      "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
    }],
    "authentication": [
      "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
    ],
    "assertionMethod": [
      "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
    ]
  },
  "metadata": {
    "created": "2024-01-15T10:30:00Z",
    "updated": "2024-01-15T10:30:00Z"
  }
}
```

### 📋 Credential Management

#### Store Credential
```http
POST /wallet/credentials
Content-Type: application/json
Authorization: Bearer {token}

{
  "credential": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://example.org/contexts/driver-license"
    ],
    "id": "https://credentials.personapass.id/123456",
    "type": ["VerifiableCredential", "DriverLicense"],
    "issuer": "did:web:dmv.state.gov",
    "issuanceDate": "2024-01-15T10:30:00Z",
    "expirationDate": "2029-01-15T10:30:00Z",
    "credentialSubject": {
      "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "licenseNumber": "D123456789",
      "dateOfBirth": "1990-05-15",
      "firstName": "John",
      "lastName": "Doe"
    },
    "proof": {
      "type": "Ed25519Signature2020",
      "created": "2024-01-15T10:30:00Z",
      "verificationMethod": "did:web:dmv.state.gov#key-1",
      "proofPurpose": "assertionMethod",
      "proofValue": "z5vgY4j9...signature..."
    }
  },
  "metadata": {
    "tags": ["license", "government"],
    "favorite": false,
    "notes": "Primary driver's license"
  }
}
```

#### Get Credentials
```http
GET /wallet/credentials?type=DriverLicense&issuer=did:web:dmv.state.gov
Authorization: Bearer {token}
```

#### Delete Credential
```http
DELETE /wallet/credentials/{credentialId}
Authorization: Bearer {token}
```

### 📄 Presentation Creation

#### Create Presentation
```http
POST /wallet/presentations
Content-Type: application/json
Authorization: Bearer {token}

{
  "presentationRequest": {
    "id": "presentation-request-123",
    "presentationDefinition": {
      "id": "age-verification",
      "input_descriptors": [{
        "id": "driver-license",
        "constraints": {
          "fields": [{
            "path": ["$.credentialSubject.dateOfBirth"],
            "filter": {
              "type": "string",
              "format": "date"
            }
          }]
        }
      }]
    }
  },
  "selectedCredentials": ["credential-id-1"],
  "domain": "https://verifier.example.com",
  "challenge": "random-challenge-string"
}
```

```typescript
interface CreatePresentationRequest {
  presentationRequest: PresentationRequest;
  selectedCredentials: string[];
  domain: string;
  challenge: string;
  options?: {
    selectiveDisclosure?: boolean;
    zkProof?: boolean;
    biometricBinding?: boolean;
  };
}

interface CreatePresentationResponse {
  presentation: VerifiablePresentation;
  metadata: {
    selectedFields: string[];
    proofType: string;
    biometricAttestation?: BiometricAttestation;
  };
}
```

### 🔐 Biometric Authentication

#### Enroll Biometric
```http
POST /wallet/biometrics/enroll
Content-Type: application/json
Authorization: Bearer {token}

{
  "biometricType": "face",
  "deviceId": "device-123",
  "options": {
    "livenessDetection": true,
    "qualityThreshold": 0.9,
    "privacyLevel": "zero_knowledge"
  }
}
```

#### Authenticate with Biometrics
```http
POST /wallet/biometrics/authenticate
Content-Type: application/json
Authorization: Bearer {token}

{
  "biometricType": "face",
  "challenge": "auth-challenge-123",
  "options": {
    "livenessRequired": true,
    "timeout": 30000
  }
}
```

## ✅ Verifier API

### 🎯 Presentation Requests

#### Create Presentation Request
```http
POST /verifier/presentation-requests
Content-Type: application/json
X-API-Key: {apiKey}

{
  "presentationDefinition": {
    "id": "age-verification-request",
    "name": "Age Verification",
    "purpose": "Verify age for alcohol purchase",
    "input_descriptors": [{
      "id": "age-credential",
      "name": "Age Verification Credential",
      "purpose": "Verify user is over 21",
      "constraints": {
        "fields": [{
          "path": ["$.credentialSubject.age"],
          "filter": {
            "type": "number",
            "minimum": 21
          }
        }]
      }
    }]
  },
  "options": {
    "challenge": "random-challenge-123",
    "domain": "https://liquor-store.example.com",
    "timeout": 300000,
    "biometricBinding": true
  }
}
```

```typescript
interface PresentationRequestResponse {
  requestId: string;
  qrCode: string;
  deepLink: string;
  expiresAt: string;
  status: 'pending' | 'completed' | 'expired' | 'rejected';
}
```

#### Get Presentation Request Status
```http
GET /verifier/presentation-requests/{requestId}
X-API-Key: {apiKey}
```

```json
{
  "requestId": "req-123456",
  "status": "completed",
  "presentation": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiablePresentation"],
    "verifiableCredential": [
      {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "id": "https://credentials.personapass.id/123456",
        "type": ["VerifiableCredential", "AgeCredential"],
        "credentialSubject": {
          "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
          "age": 25
        }
      }
    ],
    "proof": {
      "type": "Ed25519Signature2020",
      "created": "2024-01-15T10:30:00Z",
      "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1",
      "proofPurpose": "authentication"
    }
  },
  "verificationResult": {
    "verified": true,
    "credentialResults": [{
      "credentialId": "https://credentials.personapass.id/123456",
      "verified": true,
      "issuerTrusted": true,
      "notRevoked": true,
      "notExpired": true
    }],
    "biometricVerification": {
      "verified": true,
      "confidence": 0.95,
      "livenessConfirmed": true
    }
  },
  "submittedAt": "2024-01-15T10:32:00Z"
}
```

### 🔍 Verification Services

#### Verify Presentation
```http
POST /verifier/verify
Content-Type: application/json
X-API-Key: {apiKey}

{
  "presentation": {
    // VerifiablePresentation object
  },
  "options": {
    "challenge": "original-challenge",
    "domain": "https://verifier.example.com",
    "checkRevocation": true,
    "requireBiometric": true
  }
}
```

#### Batch Verification
```http
POST /verifier/verify/batch
Content-Type: application/json
X-API-Key: {apiKey}

{
  "presentations": [
    {
      "id": "presentation-1",
      "presentation": { /* VP object */ }
    },
    {
      "id": "presentation-2", 
      "presentation": { /* VP object */ }
    }
  ],
  "options": {
    "parallel": true,
    "checkRevocation": true
  }
}
```

## 🏭 Issuer API

### 📜 Credential Issuance

#### Issue Credential
```http
POST /issuer/credentials
Content-Type: application/json
Authorization: Bearer {oauthToken}

{
  "credentialTemplate": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://example.org/contexts/employee-credential"
    ],
    "type": ["VerifiableCredential", "EmployeeCredential"],
    "credentialSubject": {
      "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "employeeId": "EMP-12345",
      "department": "Engineering",
      "role": "Senior Developer",
      "startDate": "2023-01-15",
      "clearanceLevel": "Secret"
    }
  },
  "issuanceOptions": {
    "expirationDate": "2025-01-15T00:00:00Z",
    "revocable": true,
    "batchable": false,
    "proofFormat": "Ed25519Signature2020"
  }
}
```

#### Batch Credential Issuance
```http
POST /issuer/credentials/batch
Content-Type: application/json
Authorization: Bearer {oauthToken}

{
  "credentials": [
    {
      "subjectDid": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "credentialSubject": {
        "employeeId": "EMP-12345",
        "role": "Senior Developer"
      }
    },
    {
      "subjectDid": "did:key:z6MkrfeBbBm1mL2EePW8wKWvQ7E9K5J9xYF6o4QJNbYrM7GN",
      "credentialSubject": {
        "employeeId": "EMP-12346", 
        "role": "Product Manager"
      }
    }
  ],
  "template": "employee-credential-v2",
  "batchOptions": {
    "parallel": true,
    "maxConcurrency": 10
  }
}
```

### 🔄 Credential Lifecycle

#### Revoke Credential
```http
POST /issuer/credentials/{credentialId}/revoke
Content-Type: application/json
Authorization: Bearer {oauthToken}

{
  "reason": "employment_terminated",
  "effectiveDate": "2024-01-15T17:00:00Z",
  "notifyHolder": true
}
```

#### Update Credential Status
```http
PUT /issuer/credentials/{credentialId}/status
Content-Type: application/json
Authorization: Bearer {oauthToken}

{
  "status": "suspended",
  "reason": "security_review",
  "reviewDate": "2024-02-15T00:00:00Z"
}
```

## ⛓️ Blockchain API

### 🏛️ Cosmos SDK gRPC API

#### Query DID Document
```bash
# Using grpcurl
grpcurl -plaintext localhost:9090 \
  persona_chain.did.v1.Query/DidDocument \
  -d '{"did": "did:persona:alice"}'
```

```go
// Go client example
client := didtypes.NewQueryClient(clientCtx)
res, err := client.DidDocument(context.Background(), &didtypes.QueryDidDocumentRequest{
    Did: "did:persona:alice",
})
```

#### Submit Transaction
```bash
# Create DID transaction
persona-chaind tx did create-did \
  "did:persona:alice" \
  '{"@context": ["https://www.w3.org/ns/did/v1"], "id": "did:persona:alice"}' \
  --from alice \
  --chain-id persona-1 \
  --gas auto \
  --gas-adjustment 1.3
```

### 📡 REST API Endpoints

#### GET DID Document
```http
GET /cosmos/persona_chain/did/v1/dids/did:persona:alice
```

#### GET Verifiable Credential
```http
GET /cosmos/persona_chain/vc/v1/credentials/{credentialId}
```

#### GET ZK Circuit Info
```http
GET /cosmos/persona_chain/zk/v1/circuits/{circuitId}
```

## 📦 SDK Reference

### 🔧 TypeScript SDK

#### Installation
```bash
npm install @personapass/sdk
```

#### Basic Usage
```typescript
import { PersonaPassSDK } from '@personapass/sdk';

// Initialize SDK
const sdk = new PersonaPassSDK({
  verifierId: 'your-verifier-id',
  apiKey: 'your-api-key',
  environment: 'production', // or 'staging', 'development'
  endpoint: 'https://api.personapass.id'
});

// Create presentation request
const request = await sdk.createPresentationRequest({
  presentationDefinition: {
    id: 'age-verification',
    input_descriptors: [{
      id: 'age-proof',
      constraints: {
        fields: [{
          path: ['$.credentialSubject.age'],
          filter: { type: 'number', minimum: 18 }
        }]
      }
    }]
  },
  options: {
    timeout: 300000,
    biometricBinding: true
  }
});

// Wait for presentation
const presentation = await sdk.waitForPresentation(request.id, {
  timeout: 300000,
  pollingInterval: 2000
});

// Verify presentation
const verification = await sdk.verifyPresentation(presentation, {
  checkRevocation: true,
  requireBiometric: true
});

console.log('Verification result:', verification.verified);
```

#### Advanced SDK Features
```typescript
// Custom webhook handling
sdk.onPresentationReceived((presentation, requestId) => {
  console.log('Presentation received:', presentation);
  // Custom processing logic
});

// Error handling
sdk.onError((error, context) => {
  console.error('SDK Error:', error, 'Context:', context);
  // Custom error handling
});

// Batch operations
const batchResults = await sdk.verifyPresentations([
  { id: 'req1', presentation: presentation1 },
  { id: 'req2', presentation: presentation2 }
], {
  parallel: true,
  maxConcurrency: 5
});
```

### 🐍 Python SDK

#### Installation
```bash
pip install personapass-sdk
```

#### Basic Usage
```python
from personapass_sdk import PersonaPassSDK

# Initialize SDK
sdk = PersonaPassSDK(
    verifier_id='your-verifier-id',
    api_key='your-api-key',
    environment='production'
)

# Create presentation request
request = sdk.create_presentation_request({
    'presentation_definition': {
        'id': 'age-verification',
        'input_descriptors': [{
            'id': 'age-proof',
            'constraints': {
                'fields': [{
                    'path': ['$.credentialSubject.age'],
                    'filter': {'type': 'number', 'minimum': 18}
                }]
            }
        }]
    }
})

# Wait for presentation
presentation = sdk.wait_for_presentation(request['id'], timeout=300)

# Verify presentation
verification = sdk.verify_presentation(presentation)
print(f"Verified: {verification['verified']}")
```

## ❌ Error Handling

### 📋 Error Response Format
```json
{
  "error": {
    "code": "CREDENTIAL_NOT_FOUND",
    "message": "The requested credential could not be found",
    "details": {
      "credentialId": "cred-123456",
      "timestamp": "2024-01-15T10:30:00Z",
      "requestId": "req-abcdef"
    },
    "documentation": "https://docs.personapass.id/errors#credential-not-found"
  }
}
```

### 🔢 HTTP Status Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| **200** | Success | Request completed successfully |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid request parameters |
| **401** | Unauthorized | Missing or invalid authentication |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource does not exist |
| **409** | Conflict | Resource already exists |
| **422** | Unprocessable Entity | Validation failed |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server-side error |
| **502** | Bad Gateway | Upstream service error |
| **503** | Service Unavailable | Service temporarily unavailable |

### 🚨 Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INVALID_CREDENTIAL` | Credential format is invalid | Check credential structure |
| `CREDENTIAL_EXPIRED` | Credential has expired | Renew credential |
| `CREDENTIAL_REVOKED` | Credential has been revoked | Contact issuer |
| `INSUFFICIENT_PERMISSIONS` | API key lacks permissions | Check API key scopes |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement backoff strategy |
| `BIOMETRIC_FAILED` | Biometric verification failed | Retry authentication |
| `ZK_PROOF_INVALID` | Zero-knowledge proof invalid | Regenerate proof |
| `ISSUER_NOT_TRUSTED` | Issuer not in trust registry | Contact administrator |

## 🚦 Rate Limiting

### 📊 Rate Limit Rules

| API Endpoint | Rate Limit | Window | Burst Limit |
|--------------|------------|--------|-------------|
| **Authentication** | 10 req/min | 1 minute | 20 |
| **Wallet Operations** | 100 req/min | 1 minute | 200 |
| **Verification** | 1000 req/min | 1 minute | 2000 |
| **Issuance** | 500 req/min | 1 minute | 1000 |
| **Blockchain Queries** | 10000 req/min | 1 minute | 20000 |

### 📈 Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642683600
X-RateLimit-Burst: 200
```

### 🔄 Handling Rate Limits
```typescript
// Automatic retry with exponential backoff
class APIClient {
  async makeRequest(url: string, options: RequestOptions): Promise<Response> {
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        const delay = Math.min(1000 * Math.pow(2, attempt), retryAfter * 1000);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      
      return response;
    }
    
    throw new Error('Max retry attempts exceeded');
  }
}
```

## 🔔 Webhooks

### 📡 Webhook Events

PersonaPass can send webhook notifications for various events:

| Event Type | Description | Payload |
|------------|-------------|---------|
| `credential.issued` | Credential successfully issued | Credential data |
| `credential.revoked` | Credential revoked by issuer | Revocation details |
| `presentation.submitted` | Presentation submitted to verifier | Presentation data |
| `verification.completed` | Verification process completed | Verification result |
| `biometric.enrolled` | Biometric successfully enrolled | Enrollment metadata |
| `error.occurred` | Error in processing | Error details |

### 🎯 Webhook Configuration
```http
POST /webhooks
Content-Type: application/json
Authorization: Bearer {token}

{
  "url": "https://yourapp.com/webhooks/personapass",
  "events": [
    "credential.issued",
    "presentation.submitted",
    "verification.completed"
  ],
  "secret": "webhook-secret-key",
  "active": true
}
```

### 📨 Webhook Payload Example
```json
{
  "id": "evt_1234567890",
  "type": "presentation.submitted", 
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "requestId": "req-123456",
    "presentationId": "pres-789012",
    "verifierId": "verifier-345",
    "status": "submitted"
  },
  "signature": "sha256=a1b2c3d4e5f6..."
}
```

### 🔐 Webhook Signature Verification
```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expectedSignature}`),
    Buffer.from(signature)
  );
}

// Express.js middleware example
app.use('/webhooks/personapass', express.raw({ type: 'application/json' }));

app.post('/webhooks/personapass', (req, res) => {
  const signature = req.headers['x-personapass-signature'] as string;
  const payload = req.body.toString();
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  console.log('Webhook event:', event);
  
  res.status(200).send('OK');
});
```

---

<div align="center">

**🔧 Complete API reference for building with PersonaPass**

[📖 Back to Documentation](README.md) | [🛠️ SDK Examples](https://github.com/personapass/examples) | [🧪 API Playground](https://docs.personapass.id/playground)

*Build the future of digital identity* ⚡

</div>