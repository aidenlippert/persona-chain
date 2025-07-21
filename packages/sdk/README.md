# PersonaPass SDK

The PersonaPass SDK enables verifiers to send OpenID4VP-style proof requests and validate verifiable credential presentations with support for zero-knowledge proofs.

## Features

- 🔐 **OpenID4VP Compatible** - Standards-compliant proof requests
- ⚡ **Zero-Knowledge Proofs** - Support for Groth16, PLONK, STARK, and Bulletproofs
- 🛡️ **Comprehensive Validation** - Credential, proof, and issuer validation
- 📱 **QR Code Generation** - Easy mobile wallet integration
- 🔄 **Event-Driven** - Real-time validation events
- 🎯 **TypeScript** - Full type safety and IntelliSense
- 🌐 **Cross-Platform** - Works in browsers and Node.js

## Installation

```bash
npm install @personapass/sdk
```

## Quick Start

```typescript
import { createPersonaPassSDK, createDefaultConfig } from '@personapass/sdk';

// Initialize SDK
const config = createDefaultConfig('verifier-123', 'My Verifier App');
const sdk = createPersonaPassSDK(config);

// Create a proof request
const presentationDefinition = sdk.createPresentationDefinition([
  {
    id: 'identity_credential',
    name: 'Identity Verification',
    purpose: 'Verify your identity',
    fields: [
      {
        path: ['$.credentialSubject.firstName'],
        required: true
      },
      {
        path: ['$.credentialSubject.lastName'],
        required: true
      },
      {
        path: ['$.credentialSubject.dateOfBirth'],
        filter: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        required: true
      }
    ]
  }
]);

const proofRequest = await sdk.createProofRequest(presentationDefinition, {
  purpose: 'Account verification',
  expires_in: 3600 // 1 hour
});

// Generate QR code for mobile wallets
const qrCode = await sdk.generateQRCode(proofRequest);
console.log('QR Code:', qrCode);

// Validate a received presentation
sdk.on('proof_response_received', async (event) => {
  const validation = await sdk.validatePresentation(
    event.presentation,
    proofRequest.challenge
  );
  
  if (validation.valid) {
    console.log('✅ Valid presentation received');
  } else {
    console.log('❌ Invalid presentation:', validation.errors);
  }
});
```

## OpenID4VP Integration

The SDK fully supports OpenID4VP specification:

```typescript
// Create OpenID4VP request
const openid4vpRequest = await sdk.createOpenID4VPRequest(
  presentationDefinition,
  {
    response_uri: 'https://verifier.example.com/response',
    response_mode: 'direct_post',
    client_metadata: {
      client_name: 'My Verifier App',
      logo_uri: 'https://verifier.example.com/logo.png'
    }
  }
);

// Generate QR code with OpenID4VP URL
const qrCode = await sdk.generateQRCode(openid4vpRequest);
```

## Zero-Knowledge Proof Validation

Validate ZK proofs with comprehensive verification:

```typescript
// Configure ZK proof support
const config = {
  verifier: {
    id: 'verifier-123',
    name: 'My Verifier'
  },
  zk: {
    enabled: true,
    supported_protocols: ['groth16', 'plonk'],
    verification_keys: {
      'groth16_bn128': 'your-verification-key-here',
      'plonk_bls12-381': 'another-verification-key'
    },
    trusted_circuits: ['identity-circuit-v1', 'age-proof-circuit']
  },
  validation: {
    check_revocation: true,
    check_expiration: true,
    check_issuer_trust: true
  }
};

const sdk = createPersonaPassSDK(config);

// Validate ZK credential
const zkValidation = await sdk.validateZKCredential(zkCredential, {
  expectedCommitment: 'commitment-hash',
  allowedCircuits: ['identity-circuit-v1']
});

if (zkValidation.valid) {
  console.log('✅ ZK proof is valid');
} else {
  console.log('❌ ZK proof validation failed:', zkValidation.errors);
}
```

## Advanced Configuration

```typescript
import { SDKConfig } from '@personapass/sdk';

const advancedConfig: SDKConfig = {
  verifier: {
    id: 'advanced-verifier',
    name: 'Advanced Verifier',
    did: 'did:example:123456789abcdefghi',
    domain: 'verifier.example.com',
    logo: 'https://verifier.example.com/logo.png'
  },
  endpoints: {
    callback: 'https://verifier.example.com/callback',
    presentation_definition: 'https://verifier.example.com/pd',
    revocation_check: 'https://verifier.example.com/revocation'
  },
  validation: {
    check_revocation: true,
    check_expiration: true,
    check_issuer_trust: true,
    trusted_issuers: [
      'did:example:trusted-issuer-1',
      'did:example:trusted-issuer-2'
    ],
    max_age_seconds: 86400 // 24 hours
  },
  zk: {
    enabled: true,
    supported_protocols: ['groth16', 'plonk', 'stark'],
    verification_keys: {
      'groth16_bn128': 'verification-key-1',
      'plonk_bls12-381': 'verification-key-2'
    },
    trusted_circuits: ['circuit-1', 'circuit-2']
  },
  security: {
    require_https: true,
    allowed_origins: ['https://wallet.example.com'],
    signature_validation: true
  }
};
```

## Event Handling

The SDK emits various events for real-time monitoring:

```typescript
// Listen to all events
sdk.on('*', (eventName, data) => {
  console.log(`Event: ${eventName}`, data);
});

// Specific event listeners
sdk.on('proof_request_sent', (event) => {
  console.log('Proof request sent:', event.request_id);
});

sdk.on('proof_response_received', (event) => {
  console.log('Response received:', event.status);
});

sdk.on('validation_completed', (event) => {
  console.log('Validation result:', event.result.valid);
});

sdk.on('zk_proof_validated', (event) => {
  console.log('ZK proof validated:', event.result.valid);
});
```

## Presentation Definition Builder

Create complex presentation definitions easily:

```typescript
const presentationDefinition = sdk.createPresentationDefinition([
  {
    id: 'driver_license',
    name: 'Driver License',
    purpose: 'Verify driving eligibility',
    fields: [
      {
        path: ['$.credentialSubject.licenseNumber'],
        required: true
      },
      {
        path: ['$.credentialSubject.expiryDate'],
        filter: {
          type: 'string',
          // Must not be expired
          pattern: '^(?!.*202[0-3]).*$'
        },
        required: true
      }
    ]
  },
  {
    id: 'age_verification',
    name: 'Age Verification',
    purpose: 'Verify minimum age',
    fields: [
      {
        path: ['$.credentialSubject.over21'],
        filter: {
          const: true
        },
        required: true
      }
    ]
  }
]);
```

## Error Handling

```typescript
import { PersonaPassSDKError, ValidationError, ProofRequestError, ZKProofError } from '@personapass/sdk';

try {
  const validation = await sdk.validatePresentation(presentation);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation error:', error.message, error.details);
  } else if (error instanceof ProofRequestError) {
    console.error('Proof request error:', error.message);
  } else if (error instanceof ZKProofError) {
    console.error('ZK proof error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Validation Statistics

Monitor validation performance:

```typescript
const stats = sdk.getValidationStats();
console.log(`
  Total validations: ${stats.total_validations}
  Success rate: ${(stats.successful_validations / stats.total_validations * 100).toFixed(1)}%
  Average validation time: ${stats.average_validation_time_ms}ms
`);

// Clear validation cache
sdk.clearValidationCache();
```

## Browser Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>Verifier App</title>
</head>
<body>
  <div id="qr-code"></div>
  <script type="module">
    import { createPersonaPassSDK, createDefaultConfig } from 'https://unpkg.com/@personapass/sdk/dist/index.esm.js';
    
    const config = createDefaultConfig('web-verifier', 'Web Verifier');
    const sdk = createPersonaPassSDK(config);
    
    // Create and display QR code
    const presentationDefinition = sdk.createPresentationDefinition([
      {
        id: 'basic_info',
        fields: [{ path: ['$.credentialSubject.name'], required: true }]
      }
    ]);
    
    const proofRequest = await sdk.createProofRequest(presentationDefinition);
    const qrCode = await sdk.generateQRCode(proofRequest);
    
    document.getElementById('qr-code').innerHTML = `<img src="${qrCode}" alt="QR Code" />`;
  </script>
</body>
</html>
```

## API Reference

### Core Classes

- **PersonaPassSDK** - Main SDK client
- **ProofRequestService** - Handles proof request creation
- **ValidationService** - Validates presentations and credentials
- **ZKProofService** - Zero-knowledge proof validation
- **CryptoService** - Cryptographic operations

### Types

- **SDKConfig** - SDK configuration
- **ProofRequest** - Proof request structure
- **OpenID4VPRequest** - OpenID4VP request
- **PresentationDefinition** - Presentation definition
- **ValidationResult** - Validation result
- **ZKProof** - Zero-knowledge proof
- **ZKCredential** - ZK credential

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: [https://docs.personapass.com](https://docs.personapass.com)
- Issues: [https://github.com/personapass/persona-chain/issues](https://github.com/personapass/persona-chain/issues)
- Discord: [https://discord.gg/personapass](https://discord.gg/personapass)