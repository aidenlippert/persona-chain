/**
 * Type definitions for Verifiable Credentials and related structures
 */

export interface CredentialSubject {
  id: string;
  [key: string]: any;
}

export interface CredentialProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  jws?: string;
  [key: string]: any;
}

export interface CredentialEvidence {
  type: string;
  [key: string]: any;
}

export interface CredentialStatus {
  id: string;
  type: string;
  [key: string]: any;
}

export interface CredentialIssuer {
  id: string;
  name?: string;
  description?: string;
  [key: string]: any;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: CredentialIssuer | string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  proof?: CredentialProof;
  evidence?: CredentialEvidence[];
  credentialStatus?: CredentialStatus;
  [key: string]: any;
}

export interface VerifiablePresentation {
  '@context': string[];
  id: string;
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof?: CredentialProof;
  [key: string]: any;
}

export interface CredentialMetadata {
  id: string;
  type: string;
  status: 'active' | 'revoked' | 'pending' | 'expired';
  provider: string;
  issuanceDate: string;
  expirationDate?: string;
  lastVerified: string;
  usageCount: number;
  trustScore?: number;
  blockchainTxHash?: string;
  [key: string]: any;
}

export interface APICredentialMapping {
  apiId: string;
  credentialType: string;
  fieldMappings: Record<string, string>;
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  value?: any;
  message: string;
}

export interface CredentialTemplate {
  id: string;
  name: string;
  description: string;
  type: string[];
  context: string[];
  subjectSchema: Record<string, any>;
  requiredFields: string[];
  optionalFields: string[];
  [key: string]: any;
}