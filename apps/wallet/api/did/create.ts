import { VercelRequest, VercelResponse } from '@vercel/node';

// BigInt serialization fix
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (typeof BigInt.prototype.toJSON === 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

// Serialize BigInt for JSON responses
const serializeBigInt = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? `${value}n` : value
  ));
};

// Input validation
const validateDIDCreationRequest = (body: any) => {
  const errors: string[] = [];
  
  if (!body.method || typeof body.method !== 'string') {
    errors.push('method is required and must be a string');
  }
  
  if (body.method && !['key', 'persona', 'web'].includes(body.method)) {
    errors.push('method must be one of: key, persona, web');
  }
  
  if (body.keyType && !['Ed25519', 'secp256k1'].includes(body.keyType)) {
    errors.push('keyType must be one of: Ed25519, secp256k1');
  }
  
  return errors;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { method = 'key', keyType = 'Ed25519', metadata = {}, options = {} } = req.body;

    console.log('DID Creation Request:', {
      method,
      keyType,
      hasMetadata: Object.keys(metadata).length > 0,
      hasOptions: Object.keys(options).length > 0
    });

    // Validate input
    const validationErrors = validateDIDCreationRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // Create a basic DID for now (simplified)
    const timestamp = Date.now();
    const did = `did:${method}:${timestamp}`;
    
    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: did,
      verificationMethod: [{
        id: `${did}#key-1`,
        type: `${keyType}VerificationKey2018`,
        controller: did,
        publicKeyBase58: `generated-key-${timestamp}`
      }],
      authentication: [`${did}#key-1`],
      assertionMethod: [`${did}#key-1`],
      keyAgreement: [`${did}#key-1`],
      capabilityInvocation: [`${did}#key-1`],
      capabilityDelegation: [`${did}#key-1`],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    console.log('DID Created Successfully:', {
      did,
      method,
      keyType
    });

    // Return the DID creation result
    res.status(201).json({
      success: true,
      did,
      document: didDocument,
      metadata: {
        method,
        keyType,
        createdAt: new Date().toISOString(),
        ...metadata
      },
      message: 'DID created successfully'
    });

  } catch (error: any) {
    console.error('DID Creation Error:', {
      error: error.message,
      stack: error.stack
    });

    // Handle specific error types
    if (error.message?.includes('Invalid key type')) {
      return res.status(400).json({
        error: 'Invalid key type specified',
        code: 'INVALID_KEY_TYPE',
        message: error.message
      });
    }

    if (error.message?.includes('Invalid method')) {
      return res.status(400).json({
        error: 'Invalid DID method specified',
        code: 'INVALID_DID_METHOD',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to create DID',
      code: 'DID_CREATION_ERROR',
      message: error.message
    });
  }
}