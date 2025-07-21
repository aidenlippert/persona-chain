# Persona Chain Developer Onboarding Guide

Welcome to Persona Chain - a privacy-preserving blockchain for decentralized identity, verifiable credentials, and zero-knowledge proofs.

## 🚀 Quick Start

### Prerequisites
- **Go**: Version 1.21 or higher
- **Node.js**: Version 18 or higher (for frontend/tooling)
- **Rust**: Latest stable (for ZK circuits)
- **Docker**: For containerized deployment
- **Git**: For version control

### Network Information
- **Chain ID**: `persona-testnet-1`
- **Native Token**: `uprsn` (micro-persona, 1 PRSN = 1,000,000 uprsn)
- **Block Time**: ~6 seconds
- **Consensus**: Tendermint Byzantine Fault Tolerance

## 🌐 Testnet Endpoints

### RPC Endpoints
```
Primary:   http://localhost:26657
Secondary: http://localhost:26667
Tertiary:  http://localhost:26677
Quaternary: http://localhost:26687
```

### REST API Endpoints
```
Primary:   http://localhost:1317
Secondary: http://localhost:1318
Tertiary:  http://localhost:1319
Quaternary: http://localhost:1320
```

### Additional Services
```
Faucet:    http://localhost:8080
Explorer:  http://localhost:3000
```

## 💰 Getting Testnet Tokens

### Using the Faucet Web Interface
1. Open http://localhost:8080 in your browser
2. Enter your Persona Chain address (starts with `persona1`)
3. Click "Request Tokens"
4. Receive 1,000,000 uprsn (1 PRSN) per request

### Using the Faucet API
```bash
curl -X POST http://localhost:8080/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "persona1your_address_here"}'
```

### Rate Limits
- 5 requests per hour per IP
- 20 requests per day per IP

## 🔧 Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/persona-chain/persona-chain.git
cd persona-chain
```

### 2. Install Dependencies
```bash
# Go dependencies
go mod download

# Node.js dependencies (for frontend tools)
cd frontend && npm install

# Rust dependencies (for ZK circuits)
cd circuits/age_verification && cargo build
```

### 3. Build the Chain
```bash
make build
# or
go build -o persona-chaind ./cmd/persona-chaind
```

### 4. Run Local Development Node
```bash
# Initialize local chain
./persona-chaind init mynode --chain-id persona-dev-1

# Add a test account
./persona-chaind keys add alice

# Add genesis account
./persona-chaind add-genesis-account alice 100000000000uprsn

# Create genesis transaction
./persona-chaind gentx alice 100000000000uprsn --chain-id persona-dev-1

# Collect genesis transactions
./persona-chaind collect-gentxs

# Start the chain
./persona-chaind start
```

## 🏗️ Core Modules Overview

### 1. DID Module (`x/did`)
Manages decentralized identifiers and DID documents.

**Key Features:**
- Create, read, update, delete DID documents
- Support for multiple verification methods
- Controller-based authorization
- Service endpoint management

**Example Usage:**
```bash
# Create a DID
./persona-chaind tx did create-did \
  --did-id "did:persona:alice123" \
  --did-document '{"id":"did:persona:alice123","controller":"persona1alice..."}' \
  --from alice \
  --chain-id persona-testnet-1

# Query a DID
./persona-chaind query did show-did did:persona:alice123
```

### 2. Verifiable Credentials Module (`x/vc`)
Issues and manages verifiable credentials.

**Key Features:**
- Issue credentials linked to DIDs
- Schema validation
- Credential revocation
- Verification methods

**Example Usage:**
```bash
# Issue a credential
./persona-chaind tx vc issue-credential \
  --credential-id "cred123" \
  --issuer "did:persona:university" \
  --subject "did:persona:alice123" \
  --credential-type "EducationCredential" \
  --claims '{"degree":"Computer Science","year":"2024"}' \
  --from university \
  --chain-id persona-testnet-1

# Query a credential
./persona-chaind query vc show-credential cred123
```

### 3. Zero-Knowledge Module (`x/zk`)
Manages ZK circuits and proof verification.

**Key Features:**
- Register ZK verification circuits
- Submit and verify Groth16 proofs
- Circuit lifecycle management
- Public input validation

**Example Usage:**
```bash
# Register a circuit
./persona-chaind tx zk register-circuit \
  --circuit-id "age_verification_v1" \
  --name "Age Verification Circuit" \
  --description "Proves age >= 18 without revealing exact age" \
  --verifying-key "base64_encoded_vk" \
  --from admin \
  --chain-id persona-testnet-1

# Submit a proof
./persona-chaind tx zk submit-proof \
  --circuit-id "age_verification_v1" \
  --proof "base64_encoded_proof" \
  --public-inputs "2024,18" \
  --from alice \
  --chain-id persona-testnet-1
```

### 4. Guardian Module (`x/guardian`)
Provides account recovery through social guardianship.

**Key Features:**
- Set up guardian groups
- Create recovery proposals
- Multi-signature recovery approval
- Time-locked recovery process

**Example Usage:**
```bash
# Add guardians
./persona-chaind tx guardian add-guardian \
  --guardian "persona1guardian1..." \
  --threshold 2 \
  --from alice \
  --chain-id persona-testnet-1

# Propose recovery
./persona-chaind tx guardian propose-recovery \
  --account "persona1alice..." \
  --new-key "persona1newkey..." \
  --from guardian1 \
  --chain-id persona-testnet-1
```

## 🔬 Zero-Knowledge Circuit Development

### Supported Circuits

#### Age Verification Circuit
**Purpose**: Prove age >= minimum threshold without revealing exact age
**Inputs**:
- Private: `birth_year`
- Public: `current_year`, `min_age`

**Circuit Logic**:
```rust
// age = current_year - birth_year
// Constraint: age >= min_age
let age = &current_year - &birth_year;
let age_diff = &age - &min_age;
age_diff.enforce_cmp(&zero, std::cmp::Ordering::Greater, true)?;
```

### Creating Custom Circuits

1. **Define Circuit Structure**:
```rust
pub struct MyCircuit {
    pub private_input: Option<F>,
    pub public_input: Option<F>,
}
```

2. **Implement Constraint System**:
```rust
impl ConstraintSynthesizer<F> for MyCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        // Define your constraints here
    }
}
```

3. **Generate Proving/Verifying Keys**:
```rust
let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(circuit, &mut rng)?;
```

4. **Register on Chain**:
```bash
./persona-chaind tx zk register-circuit \
  --circuit-id "my_circuit_v1" \
  --verifying-key "$(base64 verifying_key.bin)" \
  --from admin
```

## 🌐 Frontend Integration

### JavaScript/TypeScript SDK

#### Installation
```bash
npm install @persona-chain/sdk
```

#### Basic Usage
```javascript
import { PersonaChain } from '@persona-chain/sdk';

const client = new PersonaChain({
  rpcEndpoint: 'http://localhost:26657',
  apiEndpoint: 'http://localhost:1317'
});

// Create a DID
const didTx = await client.did.createDid({
  didId: 'did:persona:alice123',
  didDocument: {
    id: 'did:persona:alice123',
    controller: 'persona1alice...'
  }
});

// Issue a credential
const vcTx = await client.vc.issueCredential({
  credentialId: 'cred123',
  issuer: 'did:persona:university',
  subject: 'did:persona:alice123',
  credentialType: 'EducationCredential',
  claims: {
    degree: 'Computer Science',
    year: '2024'
  }
});

// Generate and submit ZK proof
const proof = await client.zk.generateProof({
  circuitId: 'age_verification_v1',
  privateInputs: { birth_year: 1990 },
  publicInputs: { current_year: 2024, min_age: 18 }
});

const proofTx = await client.zk.submitProof(proof);
```

### React Components

#### DID Management
```jsx
import { useDid } from '@persona-chain/react';

function DIDProfile({ didId }) {
  const { did, loading, error } = useDid(didId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>DID: {did.id}</h2>
      <p>Controller: {did.controller}</p>
      <h3>Verification Methods:</h3>
      {did.verificationMethod.map(vm => (
        <div key={vm.id}>
          <p>ID: {vm.id}</p>
          <p>Type: {vm.type}</p>
          <p>Public Key: {vm.publicKeyBase58}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Credential Display
```jsx
import { useCredential } from '@persona-chain/react';

function CredentialCard({ credentialId }) {
  const { credential, verify } = useCredential(credentialId);
  
  return (
    <div className="credential-card">
      <h3>{credential.type}</h3>
      <p>Issuer: {credential.issuer}</p>
      <p>Subject: {credential.credentialSubject.id}</p>
      <div className="claims">
        {Object.entries(credential.credentialSubject)
          .filter(([key]) => key !== 'id')
          .map(([key, value]) => (
            <p key={key}>{key}: {value}</p>
          ))}
      </div>
      <button onClick={verify}>Verify Credential</button>
    </div>
  );
}
```

## 🧪 Testing Framework

### Unit Testing
```go
func TestDIDCreation(t *testing.T) {
    app := simapp.Setup(false)
    ctx := app.BaseApp.NewContext(false, tmproto.Header{})
    
    // Test DID creation
    msgCreateDid := &types.MsgCreateDid{
        Creator: "persona1creator...",
        DidId: "did:persona:test123",
        DidDocument: `{"id":"did:persona:test123"}`,
    }
    
    _, err := server.CreateDid(sdk.WrapSDKContext(ctx), msgCreateDid)
    require.NoError(t, err)
    
    // Verify DID was created
    did, found := app.DidKeeper.GetDidDocument(ctx, "did:persona:test123")
    require.True(t, found)
    require.Equal(t, "did:persona:test123", did.Id)
}
```

### Integration Testing
```javascript
describe('DID-VC Integration', () => {
  it('should link credentials to DIDs correctly', async () => {
    // Create issuer DID
    const issuerDid = await client.did.createDid({
      didId: 'did:persona:issuer',
      didDocument: { ... }
    });
    
    // Create subject DID
    const subjectDid = await client.did.createDid({
      didId: 'did:persona:subject',
      didDocument: { ... }
    });
    
    // Issue credential
    const credential = await client.vc.issueCredential({
      issuer: 'did:persona:issuer',
      subject: 'did:persona:subject',
      credentialType: 'TestCredential'
    });
    
    // Verify credential links to valid DIDs
    expect(credential.issuer).toBe('did:persona:issuer');
    expect(credential.credentialSubject.id).toBe('did:persona:subject');
  });
});
```

### End-to-End Testing
```javascript
describe('Complete User Journey', () => {
  it('should handle full identity workflow', async () => {
    // 1. Create DID
    const did = await createDID();
    
    // 2. Get university credential
    const educationCredential = await getEducationCredential(did);
    
    // 3. Generate age proof without revealing birthdate
    const ageProof = await generateAgeProof(educationCredential);
    
    // 4. Verify proof
    const isValid = await verifyAgeProof(ageProof);
    expect(isValid).toBe(true);
    
    // 5. Use proof to access age-restricted service
    const accessGranted = await accessService(ageProof);
    expect(accessGranted).toBe(true);
  });
});
```

## 🔐 Security Best Practices

### Key Management
1. **Never store private keys in code**: Use environment variables or secure key stores
2. **Use hardware wallets**: For production and high-value accounts
3. **Implement key rotation**: Regular key updates for long-lived accounts
4. **Backup strategies**: Secure backup of all critical keys

### DID Security
1. **Controller verification**: Always verify controller authorization
2. **Document validation**: Validate DID document structure and content
3. **Update authentication**: Secure the DID update process
4. **Service endpoint security**: Validate service endpoints

### Credential Security
1. **Issuer verification**: Verify issuer DID and authorization
2. **Schema validation**: Enforce credential schema compliance
3. **Revocation checking**: Always check revocation status
4. **Proof validation**: Verify credential cryptographic proofs

### ZK Proof Security
1. **Trusted setup**: Use verifiable trusted setup ceremonies
2. **Circuit auditing**: Audit all circuits before deployment
3. **Input validation**: Validate all public inputs
4. **Proof verification**: Always verify proofs on-chain

## 📊 Monitoring and Analytics

### Health Monitoring
```bash
# Check node health
curl http://localhost:1317/health

# Check sync status
curl http://localhost:26657/status

# Check validator info
curl http://localhost:1317/cosmos/staking/v1beta1/validators
```

### Performance Metrics
```bash
# Transaction throughput
curl http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest

# Memory usage
curl http://localhost:26657/metrics | grep memory

# Disk usage
du -sh ~/.persona-chain/
```

### Custom Metrics
```go
// Add custom Prometheus metrics
var (
    didCreationCounter = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "persona_did_creations_total",
            Help: "Total number of DID creations",
        },
        []string{"method"},
    )
)
```

## 🤝 Contributing

### Development Workflow
1. **Fork the repository**: Create your own fork
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Implement your feature or fix
4. **Add tests**: Ensure comprehensive test coverage
5. **Run tests**: `make test`
6. **Submit PR**: Create a pull request with clear description

### Code Standards
1. **Go formatting**: Use `gofmt` and `golint`
2. **Documentation**: Comment all exported functions
3. **Error handling**: Proper error handling and logging
4. **Testing**: Minimum 90% test coverage

### Commit Messages
Follow conventional commits:
```
feat: add ZK proof batch verification
fix: resolve DID document validation issue
docs: update API documentation
test: add integration tests for VC module
```

## 🆘 Troubleshooting

### Common Issues

#### Connection Refused
```bash
# Check if service is running
curl http://localhost:1317/health

# Restart services if needed
./scripts/restart-testnet.sh
```

#### Invalid Proof Errors
```bash
# Check circuit registration
./persona-chaind query zk list-circuits

# Verify proof format
./persona-chaind query zk show-circuit age_verification_v1
```

#### DID Not Found
```bash
# List all DIDs
./persona-chaind query did list-did-documents

# Check DID format
echo "did:persona:alice123" | grep -E "^did:persona:[a-zA-Z0-9]+$"
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
./persona-chaind start --log_level debug

# Enable RPC debugging
export RPC_DEBUG=true
```

### Getting Help
1. **Documentation**: Check docs/ directory
2. **Issues**: Open GitHub issue with details
3. **Discord**: Join our Discord community
4. **Email**: Contact dev@persona-chain.dev

## 📚 Additional Resources

### Documentation
- [Technical Whitepaper](./WHITEPAPER.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Security Audit](./AUDIT-SPEC.md)

### Examples
- [Example DApps](./examples/)
- [Integration Examples](./examples/integration/)
- [Circuit Examples](./circuits/)

### Community
- [GitHub](https://github.com/persona-chain/persona-chain)
- [Discord](https://discord.gg/persona-chain)
- [Twitter](https://twitter.com/persona-chain)
- [Medium](https://medium.com/@persona-chain)

---

**Welcome to the Persona Chain ecosystem! Start building privacy-preserving applications with decentralized identity today.** 🚀