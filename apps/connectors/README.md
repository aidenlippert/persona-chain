# PersonaPass Credential Connectors

Production-ready OAuth2 credential connector service for PersonaPass Identity Wallet.

## Overview

This service enables users to import verified credentials from external platforms:
- **GitHub**: Developer identity and contributions
- **LinkedIn**: Professional identity and career
- **Plaid**: Bank-verified identity
- **Coming Soon**: ORCID, Twitter, Stack Exchange

## Features

- 🔐 **OAuth2 with PKCE**: Secure authorization flows
- 📜 **W3C Verifiable Credentials**: Standard-compliant credential generation
- 🔒 **Zero-Knowledge Proofs**: Privacy-preserving commitments
- 🚀 **Production Ready**: Rate limiting, error handling, logging
- 🐳 **Docker Support**: Easy deployment with Docker Compose

## Quick Start

### Prerequisites
- Node.js 18+
- Redis 6+
- Docker (optional)

### Setup

1. **Configure OAuth Apps**
   
   Update your OAuth applications with these redirect URIs:
   - GitHub: `http://localhost:5173/credentials/callback`
   - LinkedIn: `http://localhost:5173/credentials/callback`

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your OAuth credentials
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Services**
   
   With Docker:
   ```bash
   docker-compose up
   ```
   
   Without Docker:
   ```bash
   # Start Redis first
   redis-server
   
   # Start connector service
   npm run dev
   ```

## API Documentation

### Health Check
```
GET /health
```

### Connector Endpoints

Each connector follows the same pattern:

#### Initiate OAuth Flow
```
POST /api/connectors/{platform}/auth
Body: {
  "userId": "user-did",
  "callbackUrl": "optional-custom-callback"
}
```

#### Handle OAuth Callback
```
POST /api/connectors/{platform}/callback
Body: {
  "code": "oauth-code",
  "state": "oauth-state",
  "sessionId": "session-id"
}
```

#### Get Connector Status
```
GET /api/connectors/{platform}/status
```

#### Revoke Credential
```
DELETE /api/connectors/{platform}/revoke
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Wallet    │────▶│  Connector   │────▶│  External  │
│  Frontend   │     │   Service    │     │ Platforms  │
└─────────────┘     └──────────────┘     └────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │    Redis     │
                    │   Session    │
                    └──────────────┘
```

## Security

- **JWT Authentication**: All endpoints require valid JWT tokens
- **Rate Limiting**: Configurable per-endpoint rate limits
- **PKCE**: OAuth2 flows use Proof Key for Code Exchange
- **Session Management**: Redis-backed secure sessions
- **Error Handling**: No sensitive data in error responses

## Development

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Deployment

### Docker
```bash
docker build -t personapass-connectors .
docker run -p 8080:8080 --env-file .env personapass-connectors
```

### Kubernetes
See `k8s/` directory for Kubernetes manifests.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | JWT signing secret | Yes |
| `REDIS_HOST` | Redis host | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | Yes |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | Yes |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret | Yes |
| `PLAID_CLIENT_ID` | Plaid client ID | Yes |
| `PLAID_SECRET` | Plaid secret | Yes |

## Troubleshooting

### Redirect URI Mismatch
Update your OAuth app settings with the correct redirect URI:
`http://localhost:5173/credentials/callback`

### Redis Connection Failed
Ensure Redis is running:
```bash
redis-cli ping
```

### Port Already in Use
Change the port in `.env`:
```
PORT=8081
```

## License

MIT