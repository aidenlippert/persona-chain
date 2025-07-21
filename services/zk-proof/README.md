# PersonaChain Zero-Knowledge Proof Service

A production-grade Zero-Knowledge proof generation and verification service supporting multiple circuit types and proving systems.

## 🚀 Features

### Supported Circuits
- **Age Verification**: Prove age threshold without revealing exact age
- **Membership Proof**: Prove set membership without revealing identity  
- **Range Proof**: Prove value within range without revealing exact value
- **Selective Disclosure**: Selectively reveal credential attributes

### Proving Systems
- **Groth16**: High performance, constant proof size
- **PLONK**: Universal setup, flexible circuit updates

### Enterprise Features
- **Job Queue**: Async proof generation with Redis backing
- **Caching**: Redis-based result caching for performance
- **Rate Limiting**: Enterprise-grade request throttling
- **Monitoring**: Comprehensive logging and metrics
- **Security**: JWT authentication, input validation, secure headers

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Redis 6+
- Circom 2.0+
- SnarkJS 0.7+
- 16GB+ RAM (for large circuits)
- 50GB+ storage (for circuit artifacts)

## ⚡ Quick Start

### 1. Install Dependencies

```bash
cd /home/rocz/persona-chain/services/zk-proof
npm install
```

### 2. Compile Circuits

```bash
# Compile all circuits
npm run build

# Or compile specific circuit
cd ../../circuits
./compile.sh circuit age_verification
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start Redis

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or install locally
redis-server
```

### 5. Start Service

```bash
# Development
npm run dev

# Production
npm start
```

The service will be available at `http://localhost:8083`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ZK_PORT` | Service port | `8083` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging level | `info` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

### Circuit Configuration

Circuits are automatically discovered from the `/circuits` directory. Each circuit must have:

```
circuits/
├── {circuit_name}.circom          # Circuit source
├── build/{circuit_name}/           # Compiled artifacts
│   ├── {circuit_name}.r1cs
│   ├── {circuit_name}.wasm
│   └── {circuit_name}_js/
└── keys/{circuit_name}/            # Proving keys
    ├── {circuit_name}_groth16_final.zkey
    ├── {circuit_name}_plonk_final.zkey
    └── verification keys...
```

## 📖 API Documentation

### Authentication

Most endpoints require JWT authentication:

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8083/api/...
```

### Available Endpoints

#### Get Service Health
```http
GET /health
```

#### List Available Circuits
```http
GET /api/circuits
```

#### Get Circuit Information
```http
GET /api/circuits/{circuit_name}
```

#### Generate Proof (Async)
```http
POST /api/proof/generate/{circuit_name}
Content-Type: application/json

{
  "proving_system": "groth16",
  "inputs": {
    "minimum_age": "18",
    "current_timestamp": "1704067200",
    "date_of_birth": "946684800",
    "salt": "123456789",
    "nonce": "987654321",
    "secret_key": "111111111"
  },
  "priority": "normal"
}
```

#### Generate Proof (Sync - Testing Only)
```http
POST /api/proof/generate-sync/{circuit_name}
Content-Type: application/json

{
  "proving_system": "groth16", 
  "inputs": { ... }
}
```

#### Check Job Status
```http
GET /api/proof/status/{job_id}
```

#### Verify Proof
```http
POST /api/proof/verify/{circuit_name}
Content-Type: application/json

{
  "proving_system": "groth16",
  "proof": { ... },
  "public_signals": [ ... ]
}
```

#### Get Verification Key
```http
GET /api/circuits/{circuit_name}/vkey/{proving_system}
```

#### Queue Statistics
```http
GET /api/queue/stats
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

### Load Testing
```bash
# Using k6 (install separately)
k6 run test/load/proof-load-test.js
```

### Manual Testing

#### Age Verification Example
```bash
# Generate age verification proof
curl -X POST http://localhost:8083/api/proof/generate-sync/age_verification \
  -H "Content-Type: application/json" \
  -d '{
    "proving_system": "groth16",
    "inputs": {
      "minimum_age": "18",
      "maximum_age": "120",
      "current_timestamp": "'$(date +%s)'",
      "merkle_root": "123456789",
      "verifier_id": "1",
      "date_of_birth": "'$(($(date +%s) - 18 * 365 * 24 * 3600))'",
      "salt": "987654321",
      "nonce": "555",
      "secret_key": "111111111"
    }
  }'
```

#### Membership Proof Example
```bash
curl -X POST http://localhost:8083/api/proof/generate-sync/membership_proof \
  -H "Content-Type: application/json" \
  -d '{
    "proving_system": "groth16",
    "inputs": {
      "merkle_root": "123456789",
      "set_id": "1",
      "verifier_id": "1",
      "timestamp": "'$(date +%s)'",
      "challenge": "999888777",
      "member_value": "555666777",
      "path_elements": ["0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"],
      "path_indices": ["0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"],
      "salt": "123123123",
      "secret_key": "456456456"
    }
  }'
```

## 🔒 Security

### Security Features
- JWT-based authentication
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- Security headers (HSTS, CSP, etc.)
- CORS protection
- Request size limits (10MB max)

### Production Security Checklist
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS with valid certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Audit circuit implementations
- [ ] Secure key storage (HSM recommended)
- [ ] Network segmentation

### Circuit Security
- All circuits use Poseidon hash function
- Nullifiers prevent double-spending
- Timestamp validation prevents replay attacks
- Input range validation prevents overflow
- Secure randomness for commitments

## 📊 Monitoring

### Metrics Available
- Proof generation times by circuit/proving system
- Queue lengths and processing rates
- Error rates and types
- Resource utilization (CPU, memory, storage)
- Request patterns and rate limiting

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Security events

### Health Checks
```bash
# Service health
curl http://localhost:8083/health

# Queue status
curl http://localhost:8083/api/queue/stats
```

## ⚡ Performance

### Benchmarks
| Circuit | Proving System | Proof Time | Verification Time | Proof Size |
|---------|---------------|------------|-------------------|------------|
| Age Verification | Groth16 | ~5s | ~10ms | 128 bytes |
| Age Verification | PLONK | ~8s | ~15ms | 768 bytes |
| Membership Proof | Groth16 | ~10s | ~10ms | 128 bytes |
| Range Proof | Groth16 | ~15s | ~10ms | 128 bytes |
| Selective Disclosure | Groth16 | ~20s | ~10ms | 128 bytes |

### Optimization
- Use job queue for async processing
- Redis caching for repeated proofs
- Witness generation optimization
- Memory-efficient circuit compilation
- Parallel proof generation

### Scaling
- Horizontal scaling with load balancer
- Redis cluster for high availability
- Multiple worker processes
- Circuit-specific worker pools
- Database sharding for large scales

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t persona-chain/zk-proof-service .

# Run container
docker run -p 8083:8083 \
  -e REDIS_URL=redis://redis:6379 \
  persona-chain/zk-proof-service
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zk-proof-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zk-proof-service
  template:
    metadata:
      labels:
        app: zk-proof-service
    spec:
      containers:
      - name: zk-proof-service
        image: persona-chain/zk-proof-service:latest
        ports:
        - containerPort: 8083
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "4Gi"
            cpu: "1"
          limits:
            memory: "8Gi"
            cpu: "2"
```

### Production Considerations
- Use dedicated hardware for circuit compilation
- SSD storage for circuit artifacts
- Sufficient RAM for large circuits (16GB+)
- Network optimization for proof transfer
- Backup strategies for circuit keys
- Disaster recovery procedures

## 🔧 Development

### Adding New Circuits

1. Create circuit in `/circuits/{circuit_name}.circom`
2. Add circuit configuration to `CIRCUITS` object in `server.js`
3. Compile circuit: `./circuits/compile.sh circuit {circuit_name}`
4. Add tests and documentation
5. Update API documentation

### Circuit Development Guidelines
- Use Poseidon for all hashing
- Include nullifiers for uniqueness
- Validate all inputs and ranges
- Add timestamp checks for freshness
- Document circuit purpose and security model
- Test with edge cases and invalid inputs

### Testing Guidelines
- Unit tests for all endpoints
- Integration tests with real circuits
- Load tests for performance validation
- Security tests for input validation
- End-to-end tests for full workflows

## 📚 Additional Resources

### Circom & SnarkJS
- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS GitHub](https://github.com/iden3/snarkjs)
- [ZK Learning Resources](https://zkp.science/)

### Zero-Knowledge Proofs
- [ZK-SNARKs Explained](https://blog.ethereum.org/2016/12/05/zksnarks-in-a-nutshell/)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [PLONK Paper](https://eprint.iacr.org/2019/953.pdf)

### Security
- [ZK Security Guidelines](https://github.com/0xPARC/zk-bug-tracker)
- [Circuit Security Checklist](https://github.com/iden3/circom/blob/master/SECURITY.md)

## 🆘 Troubleshooting

### Common Issues

#### Circuit Compilation Errors
```bash
# Check Circom version
circom --version

# Verify circuit syntax
circom --help

# Check dependencies
npm list circomlib
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Monitor memory usage
top -p $(pgrep node)
```

#### Redis Connection Issues
```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
docker logs redis-container
```

#### Proof Generation Timeouts
- Increase proof timeout in configuration
- Use async endpoints for large circuits
- Monitor system resources during generation
- Consider circuit optimization

### Getting Help
- Create an issue on [GitHub](https://github.com/persona-chain/persona-chain/issues)
- Check the [documentation](https://docs.persona-chain.com)
- Join our [Discord community](https://discord.gg/persona-chain)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**PersonaChain** - Building the future of privacy-preserving identity verification 🔐