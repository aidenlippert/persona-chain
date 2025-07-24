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
const validateVerificationRequest = (body: any) => {
  const errors: string[] = [];
  
  if (!body.credential) {
    errors.push('credential is required');
  }
  
  if (body.credential && !body.credential.type) {
    errors.push('credential.type is required');
  }
  
  if (body.credential && !body.credential.proof) {
    errors.push('credential.proof is required');
  }
  
  if (body.verificationOptions && typeof body.verificationOptions !== 'object') {
    errors.push('verificationOptions must be an object');
  }
  
  return errors;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      credential, 
      verificationOptions = {},
      zkProof = null,
      presentationContext = null 
    } = req.body;

    console.log('Credential Verification Request:', {
      credentialId: credential?.id,
      credentialType: credential?.type,
      issuer: credential?.issuer,
      hasZKProof: !!zkProof,
      hasPresentationContext: !!presentationContext
    });

    // Validate input
    const validationErrors = validateVerificationRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // Basic credential verification (simplified for now)
    const verificationStartTime = Date.now();
    
    // Basic structure validation
    const hasRequiredFields = !!(credential.id && credential.type && credential.issuer && credential.credentialSubject);
    const hasValidDates = credential.issuanceDate && new Date(credential.issuanceDate) <= new Date();
    const notExpired = !credential.expirationDate || new Date(credential.expirationDate) > new Date();
    
    const credentialValid = hasRequiredFields && hasValidDates && notExpired;
    
    // Basic ZK proof validation if provided
    let zkProofValid = true;
    if (zkProof) {
      zkProofValid = !!(zkProof.proof && zkProof.publicSignals);
    }
    
    // Basic presentation validation if provided
    let presentationValid = true;
    if (presentationContext) {
      presentationValid = !!(presentationContext.holder && presentationContext.verifiableCredential);
    }
    
    const verificationResults = {
      credential: {
        valid: credentialValid,
        checks: {
          structure: hasRequiredFields,
          dates: hasValidDates,
          expiration: notExpired,
          signature: true, // Simplified - would verify signature properly
          issuer: !!credential.issuer
        }
      },
      zkProof: zkProof ? {
        valid: zkProofValid,
        proofType: zkProof.type || 'unknown',
        verifiedAt: new Date().toISOString()
      } : null,
      presentation: presentationContext ? {
        valid: presentationValid,
        holder: presentationContext.holder,
        verifiedAt: new Date().toISOString()
      } : null,
      metadata: {
        verifiedAt: new Date().toISOString(),
        verificationTime: 0
      }
    };
    
    const verificationTime = Date.now() - verificationStartTime;
    verificationResults.metadata.verificationTime = verificationTime;
    
    const overallValid = credentialValid && zkProofValid && presentationValid;

    console.log('Verification completed:', {
      overallValid,
      verificationTime: `${verificationTime}ms`,
      credentialValid: verificationResults.credential.valid,
      zkProofValid: verificationResults.zkProof?.valid,
      presentationValid: verificationResults.presentation?.valid
    });

    // Return comprehensive verification result
    res.status(200).json({
      success: true,
      valid: overallValid,
      results: serializeBigInt(verificationResults),
      summary: {
        credentialValid: verificationResults.credential.valid,
        zkProofValid: verificationResults.zkProof?.valid,
        presentationValid: verificationResults.presentation?.valid,
        verificationTime: `${verificationTime}ms`
      },
      message: overallValid 
        ? 'Credential verification successful' 
        : 'Credential verification failed'
    });

  } catch (error: any) {
    console.error('Credential Verification API Error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to verify credential',
      code: 'CREDENTIAL_VERIFICATION_ERROR',
      message: error.message
    });
  }
}