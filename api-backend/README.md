# PersonaPass API Backend

Production-ready API backend for PersonaPass identity wallet.

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run dev
```

### Production Deployment
```bash
npm install
npm start
```

### Deploy to Vercel
```bash
vercel deploy
```

## 📋 API Endpoints

### Health Check
- `GET /health` - Service health status

### DID Management
- `POST /api/v1/did/register` - Register a new DID
- `GET /api/v1/did/resolve/:did` - Resolve DID document

### Credential Management
- `POST /api/v1/credentials/issue` - Issue a new credential
- `POST /api/v1/credentials/verify` - Verify a credential

### ZK Proofs
- `POST /api/v1/zk/generate` - Generate ZK proof
- `POST /api/v1/zk/verify` - Verify ZK proof

### Connectors
- `POST /api/v1/connectors/github/auth` - GitHub OAuth
- `POST /api/v1/connectors/linkedin/auth` - LinkedIn OAuth
- `POST /api/v1/connectors/plaid/auth` - Plaid integration

## 🔧 Configuration

All configuration is environment-based. Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `JWT_SECRET` - JWT signing secret
- External service credentials

## 🛡️ Security

- Helmet.js for security headers
- CORS configured for personapass.xyz
- Rate limiting (100 requests per 15 minutes)
- JWT authentication ready
- Input validation

## 📊 Monitoring

- Health check endpoint
- Request logging
- Error handling
- Performance metrics ready

## 🌐 CORS

Configured for:
- https://personapass.xyz
- https://www.personapass.xyz
- http://localhost:5173 (development)
