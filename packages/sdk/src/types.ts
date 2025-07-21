/**
 * PersonaPass SDK Type Definitions
 * Core types for verifiable credential proof requests and validation
 */

// Core Credential Types
export interface VerifiableCredential {
  '@context': string | string[];
  id: string;
  type: string[];
  issuer: string | { id: string; [key: string]: unknown };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, unknown>;
  credentialStatus?: CredentialStatus;
  proof?: Proof | Proof[];
  credentialSchema?: CredentialSchema;
}

export interface CredentialStatus {
  id: string;
  type: string;
  statusListIndex?: string;
  statusListCredential?: string;
}

export interface CredentialSchema {
  id: string;
  type: string;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  challenge?: string;
  domain?: string;
  jws?: string;
  proofValue?: string;
}

// Presentation Types
export interface VerifiablePresentation {
  '@context': string | string[];
  id: string;
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof: Proof;
}

export interface PresentationDefinition {
  id: string;
  name?: string;
  purpose?: string;
  input_descriptors: InputDescriptor[];
  format?: {
    [format: string]: {
      alg?: string[];
      proof_type?: string[];
    };
  };
}

export interface InputDescriptor {
  id: string;
  name?: string;
  purpose?: string;
  group?: string[];
  constraints: {
    limit_disclosure?: 'required' | 'preferred';
    fields: FieldConstraint[];
  };
}

export interface FieldConstraint {
  path: string[];
  id?: string;
  purpose?: string;
  filter?: {
    type?: string;
    pattern?: string;
    const?: unknown;
    enum?: unknown[];
  };
  predicate?: 'required' | 'preferred';
}

// Zero-Knowledge Proof Types
export interface ZKProof {
  type: 'ZKProof';
  protocol: 'groth16' | 'plonk' | 'stark' | 'bulletproofs';
  curve: 'bn128' | 'bls12-381' | 'secp256k1';
  proof: string;
  publicSignals: string[];
  verificationKey: string;
  commitment: string;
  nullifier: string;
  merkleRoot?: string;
  circuitId?: string;
}

export interface ZKCredential {
  id: string;
  type: string[];
  holder: string;
  proof: ZKProof;
  credentialSubject: {
    id: string;
    [key: string]: unknown;
  };
  metadata: {
    credentialType: string;
    source: string;
    verified: boolean;
    commitment: string;
    nullifierHash: string;
    createdAt: string;
    expiresAt?: string;
  };
}

// OpenID4VP Types
export interface OpenID4VPRequest {
  client_id: string;
  client_id_scheme?: 'redirect_uri' | 'entity_id' | 'did';
  response_uri?: string;
  response_mode?: 'direct_post' | 'direct_post.jwt';
  presentation_definition?: PresentationDefinition;
  presentation_definition_uri?: string;
  scope?: string;
  nonce: string;
  state?: string;
  response_type: 'vp_token';
  client_metadata?: {
    client_name?: string;
    logo_uri?: string;
    policy_uri?: string;
    tos_uri?: string;
  };
}

export interface OpenID4VPResponse {
  vp_token: string | VerifiablePresentation;
  presentation_submission: PresentationSubmission;
  state?: string;
}

export interface PresentationSubmission {
  id: string;
  definition_id: string;
  descriptor_map: DescriptorMap[];
}

export interface DescriptorMap {
  id: string;
  format: string;
  path: string;
  path_nested?: DescriptorMap;
}

// Proof Request Types
export interface ProofRequest {
  id: string;
  type: 'ProofRequest';
  from: string;
  to: string;
  created: string;
  expires?: string;
  presentation_definition: PresentationDefinition;
  challenge: string;
  domain?: string;
  callback_url?: string;
  metadata: {
    purpose: string;
    verifier_name: string;
    verifier_logo?: string;
    requirements: string[];
  };
}

export interface ProofResponse {
  id: string;
  type: 'ProofResponse';
  request_id: string;
  from: string;
  to: string;
  created: string;
  presentation: VerifiablePresentation;
  status: 'approved' | 'denied' | 'error';
  error?: string;
}

// Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: {
    verified_at: string;
    verifier: string;
    validation_time_ms: number;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  recommendation?: string;
}

// SDK Configuration
export interface SDKConfig {
  verifier: {
    id: string;
    name: string;
    did?: string;
    domain: string;
    logo?: string;
  };
  endpoints: {
    callback?: string;
    presentation_definition?: string;
    revocation_check?: string;
  };
  validation: {
    check_revocation: boolean;
    check_expiration: boolean;
    check_issuer_trust: boolean;
    trusted_issuers?: string[];
    max_age_seconds?: number;
  };
  zk: {
    enabled: boolean;
    supported_protocols: ZKProof['protocol'][];
    verification_keys: Record<string, string>;
    trusted_circuits?: string[];
  };
  security: {
    require_https: boolean;
    allowed_origins?: string[];
    signature_validation: boolean;
  };
}

// Cryptographic Types
export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  publicKeyJwk: JsonWebKey;
  keyId: string;
}

export interface DID {
  id: string;
  method: 'persona' | 'key' | 'web';
  identifier: string;
  controller: string;
  created: string;
  updated: string;
  publicKeys: PublicKey[];
  authentication: string[];
  keyAgreement?: string[];
  capabilityInvocation?: string[];
  service?: ServiceEndpoint[];
}

export interface PublicKey {
  id: string;
  type: 'Ed25519VerificationKey2020' | 'JsonWebKey2020' | 'EcdsaSecp256k1VerificationKey2019';
  controller: string;
  publicKeyJwk?: JsonWebKey;
  publicKeyMultibase?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | string[] | Record<string, unknown>;
}

// Event Types
export interface ProofRequestEvent {
  type: 'proof_request_sent';
  request_id: string;
  verifier: string;
  holder: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ProofResponseEvent {
  type: 'proof_response_received';
  request_id: string;
  response_id: string;
  verifier: string;
  holder: string;
  timestamp: string;
  status: 'approved' | 'denied' | 'error';
  validation_result?: ValidationResult;
}

export interface ValidationEvent {
  type: 'validation_completed';
  request_id: string;
  presentation_id: string;
  result: ValidationResult;
  timestamp: string;
}

// Utility Types
export type SupportedFormat = 'jwt_vc_json' | 'ldp_vc' | 'jwt_vp_json' | 'ldp_vp';
export type ProofType = 'Ed25519Signature2020' | 'EcdsaSecp256k1Signature2019' | 'JsonWebSignature2020';
export type CurveType = 'Ed25519' | 'secp256k1' | 'P-256' | 'P-384' | 'P-521';

// Error Types
export class PersonaPassSDKError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PersonaPassSDKError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationErrorClass extends PersonaPassSDKError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class ProofRequestError extends PersonaPassSDKError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROOF_REQUEST_ERROR', message, details);
    this.name = 'ProofRequestError';
  }
}

export class ZKProofError extends PersonaPassSDKError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('ZK_PROOF_ERROR', message, details);
    this.name = 'ZKProofError';
  }
}