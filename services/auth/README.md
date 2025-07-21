# PersonaChain Enterprise Authentication Service

A production-ready, enterprise-grade authentication service supporting OAuth 2.0, OpenID Connect (OIDC), SAML 2.0, social providers, biometric authentication, and multi-factor authentication (MFA).

## 🚀 Features

### Core Authentication
- **JWT-based Authentication** with access and refresh tokens
- **Password Authentication** with bcrypt hashing and salt rounds
- **Account Security** with failed attempt tracking and account lockout
- **Session Management** with configurable timeouts and token rotation

### Multi-Factor Authentication (MFA)
- **TOTP (Time-based One-Time Password)** with QR code generation
- **SMS Authentication** via Twilio integration
- **Email Authentication** with HTML templates
- **Backup Codes** for account recovery (10 single-use codes)
- **Hardware Tokens** support via WebAuthn/FIDO2

### Biometric Authentication
- **WebAuthn/FIDO2** support for hardware authenticators
- **Platform Authenticators** (Touch ID, Face ID, Windows Hello)
- **Cross-platform** support (iOS, Android, Windows, macOS)
- **Device Management** with registration and removal capabilities

### Social Authentication
- **Google OAuth 2.0** integration
- **Microsoft OAuth 2.0** integration  
- **GitHub OAuth 2.0** integration
- **Extensible** for additional providers (Facebook, LinkedIn, etc.)

### Enterprise SSO
- **SAML 2.0** support for enterprise identity providers
- **Active Directory** integration via Microsoft Graph API
- **Okta, Auth0, OneLogin** compatibility
- **Custom SAML** configurations

### Security Features
- **Rate Limiting** with Redis-backed storage
- **CORS Protection** with configurable origins
- **Security Headers** (HSTS, CSP, X-Frame-Options, etc.)
- **Input Validation** with express-validator
- **SQL Injection Protection** with parameterized queries
- **XSS Protection** with content sanitization

### Enterprise Features
- **Multi-tenant** support with organization isolation
- **Audit Logging** with comprehensive event tracking
- **Compliance** support (SOC 2, GDPR, HIPAA)
- **High Availability** with horizontal scaling
- **Monitoring** with Prometheus and Grafana
- **Backup** and disaster recovery

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 13+
- Redis 6+
- Docker and Docker Compose (for containerized deployment)

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/persona-chain/persona-chain.git
cd persona-chain/services/auth
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# The service will automatically create tables on first run
```

### 4. Start Development Server

```bash
npm run dev
```

The service will be available at `http://localhost:8080`

## 🐳 Docker Deployment

### Production Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f auth-service

# Scale the service
docker-compose up -d --scale auth-service=3
```

### Health Checks

```bash
curl http://localhost:8080/health
```

## 📖 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Biometric Authentication

#### Start WebAuthn Registration
```http
POST /auth/biometric/register/begin
Authorization: Bearer your-access-token
```

#### Complete WebAuthn Registration
```http
POST /auth/biometric/register/complete
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "challengeId": "challenge-id",
  "credential": { /* WebAuthn credential */ },
  "deviceName": "iPhone Touch ID"
}
```

#### Biometric Login
```http
POST /auth/biometric/authenticate/begin
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Multi-Factor Authentication

#### Enable TOTP
```http
POST /auth/mfa/enable
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "method": "totp"
}
```

#### Verify MFA Setup
```http
POST /auth/mfa/verify-setup
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "method": "totp",
  "code": "123456",
  "secret": "base32-secret"
}
```

### Social Authentication

#### Google OAuth
```http
GET /auth/google
```

#### Microsoft OAuth
```http
GET /auth/microsoft
```

#### GitHub OAuth
```http
GET /auth/github
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `AUTH_PORT` | Server port | `8080` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `REDIS_HOST` | Redis host | `localhost` |
| `JWT_SECRET` | JWT signing secret | Required |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Optional |

### Database Schema

The service automatically creates the following tables:

- `organizations` - Multi-tenant organization data
- `users` - User accounts and profiles
- `user_social_connections` - OAuth provider links
- `user_mfa_methods` - MFA configurations
- `user_authenticators` - WebAuthn devices
- `auth_events` - Audit log events

## 🔒 Security Considerations

### Production Checklist

- [ ] Use strong, unique secrets for JWT and database
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure CORS with specific allowed origins
- [ ] Set up rate limiting and monitoring
- [ ] Enable audit logging
- [ ] Configure backup and disaster recovery
- [ ] Review and update dependencies regularly
- [ ] Implement network security (VPC, firewalls)
- [ ] Use HSM for key management (optional)

### Security Headers

The service automatically adds security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

## 📊 Monitoring

### Metrics

The service exposes metrics for:

- Authentication success/failure rates
- Response times and throughput
- Active sessions and token usage
- Database connection health
- Rate limiting statistics

### Logging

Structured JSON logging with:

- Authentication events
- Security events
- Error tracking
- Performance metrics
- Audit trails

### Health Checks

```bash
# Application health
curl http://localhost:8080/health

# Database connectivity
# Redis connectivity  
# External service status
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Coverage Report
```bash
npm run test:coverage
```

### Load Testing
```bash
# Using k6 (install separately)
k6 run test/load/auth-load-test.js
```

## 🚀 Deployment

### Kubernetes

```yaml
# See deploy/k8s/ directory for complete manifests
apiVersion: apps/v1
kind: Deployment
metadata:
  name: persona-auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: persona-auth-service
  template:
    metadata:
      labels:
        app: persona-auth-service
    spec:
      containers:
      - name: auth-service
        image: persona-chain/auth-service:latest
        ports:
        - containerPort: 8080
```

### AWS ECS

```json
{
  "family": "persona-auth-service",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "auth-service",
      "image": "persona-chain/auth-service:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ]
    }
  ]
}
```

## 🔧 Development

### Adding New Authentication Providers

1. Install the passport strategy:
```bash
npm install passport-facebook
```

2. Add configuration to passport setup:
```javascript
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: '/auth/facebook/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // Handle Facebook authentication
}));
```

3. Add routes:
```javascript
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { session: false }));
```

### Custom MFA Methods

Extend the MFA manager to support additional methods:

```javascript
class CustomMFAMethod {
  async verify(userId, code) {
    // Implement custom verification logic
  }
}
```

## 📚 Additional Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [SAML 2.0 Documentation](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## 🆘 Support

- Create an issue on [GitHub](https://github.com/persona-chain/persona-chain/issues)
- Check the [documentation](https://docs.persona-chain.com)
- Join our [Discord community](https://discord.gg/persona-chain)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**PersonaChain** - Building the future of decentralized identity 🌟