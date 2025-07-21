# PersonaPass Credential Connector Integration Guide

## Overview

The PersonaPass Credential Connector system enables users to import verified credentials from external platforms into their identity wallet. This guide covers the complete integration process.

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌────────────┐     ┌──────────────┐
│    Wallet    │────▶│  Connector   │────▶│   OAuth    │────▶│   External   │
│   Frontend   │◀────│   Service    │◀────│   Flow     │◀────│   Platform   │
└──────────────┘     └──────────────┘     └────────────┘     └──────────────┘
        │                    │                                          │
        │                    ▼                                          │
        │            ┌──────────────┐                                  │
        │            │    Redis     │                                  │
        │            │   Sessions   │                                  │
        │            └──────────────┘                                  │
        │                    │                                          │
        │                    ▼                                          │
        │            ┌──────────────┐     ┌────────────┐             │
        └───────────▶│      VC      │────▶│     ZK     │◀────────────┘
                     │  Generator   │     │ Commitment │
                     └──────────────┘     └────────────┘
```

## OAuth Application Setup

### GitHub

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Configure:
   - **Application name**: PersonaPass Identity Wallet
   - **Homepage URL**: https://personapass.xyz
   - **Authorization callback URL**: 
     - Development: `http://localhost:5173/credentials/callback`
     - Production: `https://wallet.personapass.xyz/credentials/callback`
4. Save Client ID and Client Secret

### LinkedIn

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Configure:
   - **App name**: PersonaPass Identity Wallet
   - **LinkedIn Page**: Your company page
   - **App logo**: Upload logo
4. In Auth tab:
   - Add redirect URLs (same as GitHub)
   - Request r_liteprofile and r_emailaddress scopes
5. Save Client ID and Client Secret

### Plaid

1. Sign up at [Plaid Dashboard](https://dashboard.plaid.com/)
2. Create new application
3. Enable Identity Verification product
4. Configure webhook URL: `https://api.personapass.xyz/webhooks/plaid`
5. Save Client ID and Secret

## Integration Flow

### 1. Frontend Integration

```typescript
// In your wallet frontend
const handleConnectPlatform = async (platform: string) => {
  try {
    // Initiate OAuth flow
    const response = await fetch(`${API_URL}/api/connectors/${platform}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        userId: currentUser.did,
        callbackUrl: `${window.location.origin}/credentials/callback`
      })
    });

    const { authUrl, sessionId } = await response.json();
    
    // Store session for callback
    sessionStorage.setItem('connector_session', JSON.stringify({
      connector: platform,
      sessionId,
      timestamp: Date.now()
    }));

    // Redirect to OAuth provider
    window.location.href = authUrl;
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

### 2. OAuth Callback Handling

```typescript
// CredentialsCallback.tsx
const handleCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  
  const session = JSON.parse(sessionStorage.getItem('connector_session'));
  
  const response = await fetch(
    `${API_URL}/api/connectors/${session.connector}/callback`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        code,
        state,
        sessionId: session.sessionId
      })
    }
  );

  const { credential, zkCommitment } = await response.json();
  
  // Store credential in wallet
  await walletStore.addCredential({
    ...credential,
    zkCommitment,
    platform: session.connector
  });
};
```

### 3. Credential Storage

```typescript
// Store credential with metadata
interface WalletCredential {
  id: string;
  type: string;
  credential: VerifiableCredential;
  zkCommitment: ZKCommitment;
  metadata: {
    source: string;
    issuedAt: string;
    expiresAt?: string;
    tags: string[];
  };
}
```

## Security Best Practices

### 1. OAuth Security
- Always use PKCE (Proof Key for Code Exchange)
- Validate state parameter to prevent CSRF
- Use secure session storage
- Implement proper token rotation

### 2. Credential Security
- Encrypt credentials at rest
- Use hardware-backed key storage when available
- Implement proper access controls
- Regular security audits

### 3. Network Security
- Always use HTTPS
- Implement certificate pinning
- Use secure headers (CSP, HSTS, etc.)
- Rate limiting on all endpoints

## Deployment

### Development

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Configure environment
cp .env.example .env
# Edit .env with your OAuth credentials

# Start connector service
cd apps/connectors
npm install
npm run dev

# Start wallet frontend
cd ../wallet
npm install
npm run dev
```

### Production

```bash
# Build Docker image
docker build -t personapass-connectors .

# Deploy to Kubernetes
kubectl apply -f k8s/

# Or use Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Monitoring

### Health Checks
- Service health: `GET /health`
- Redis connectivity
- OAuth provider availability

### Metrics
- OAuth success/failure rates
- Credential generation times
- API response times
- Error rates by type

### Alerts
- OAuth failures > 10%
- Response time > 2s
- Redis connection lost
- High error rates

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Verify OAuth app settings match exactly
   - Check for trailing slashes
   - Ensure protocol matches (http vs https)

2. **Session Expired**
   - Sessions expire after 10 minutes
   - Implement proper error handling
   - Show user-friendly messages

3. **Rate Limiting**
   - Implement exponential backoff
   - Cache successful responses
   - Use bulk operations where possible

4. **CORS Issues**
   - Configure allowed origins properly
   - Include credentials in requests
   - Check preflight responses

## API Reference

### POST /api/connectors/{platform}/auth
Initiate OAuth flow

**Request:**
```json
{
  "userId": "did:personachain:user123",
  "callbackUrl": "https://wallet.personapass.xyz/credentials/callback"
}
```

**Response:**
```json
{
  "authUrl": "https://github.com/login/oauth/authorize?...",
  "sessionId": "sess_abc123",
  "expiresIn": 600
}
```

### POST /api/connectors/{platform}/callback
Handle OAuth callback

**Request:**
```json
{
  "code": "oauth_code",
  "state": "oauth_state",
  "sessionId": "sess_abc123"
}
```

**Response:**
```json
{
  "credential": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiableCredential", "GitHubIdentityCredential"],
    "credentialSubject": { ... }
  },
  "zkCommitment": {
    "commitment": "0x...",
    "nullifier": "0x...",
    "metadata": { ... }
  }
}
```

## Support

- Documentation: https://docs.personapass.xyz
- GitHub Issues: https://github.com/personapass/wallet/issues
- Discord: https://discord.gg/personapass
- Email: support@personapass.xyz