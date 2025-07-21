/**
 * Persona Wallet Types
 * Comprehensive type definitions for the identity wallet system
 */

// Zero-Knowledge Proof Types
export interface ZKProof {
  type: "ZKProof";
  protocol: "groth16" | "plonk" | "stark" | "bulletproofs";
  curve: "bn128" | "bls12-381" | "secp256k1" | "ed25519";
  proof: string; // Encoded proof data
  publicSignals: string[]; // Public inputs/outputs
  verificationKey: string;
  commitment: string;
  nullifier: string;
  circuitId?: string;
  merkleRoot?: string;
  created: string;
}

export interface ZKCredential {
  id: string;
  type: string;
  circuitId: string;
  commitment: string;
  nullifierHash: string;
  metadata: {
    credentialType: string;
    source: string;
    commitment: string;
    nullifierHash: string;
    expiresAt?: string;
    privacy_level: "full" | "selective" | "zero_knowledge";
  };
  created: string;
}

export interface ZKProofRequest {
  id: string;
  type: "ZKProofRequest";
  from: string;
  challenge: string;
  circuitId: string;
  publicInputs: Record<string, unknown>;
  requiredCredentials: {
    type: string;
    constraints?: Record<string, unknown>;
  }[];
  zkpOptions: {
    protocol: ZKProof["protocol"];
    curve: ZKProof["curve"];
    allowedCircuits: string[];
    requiredCommitment?: string;
    merkleRoot?: string;
  };
  expires: string;
  created: string;
}

// Core DID and Identity Types
export interface DID {
  id: string;
  method: "persona" | "key" | "web";
  identifier: string;
  controller: string;
  created: string;
  updated: string;
  publicKeys: PublicKey[];
  authentication: string[];
  keyAgreement?: string[];
  capabilityInvocation?: string[];
  service?: ServiceEndpoint[];
  // Storage properties
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  document: any;
  keyType: string;
  purposes: string[];
}

export interface DIDKeyPair {
  did: string;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  document: any;
}

export interface PublicKey {
  id: string;
  type:
    | "Ed25519VerificationKey2020"
    | "JsonWebKey2020"
    | "EcdsaSecp256k1VerificationKey2019";
  controller: string;
  publicKeyJwk?: JsonWebKey;
  publicKeyMultibase?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | string[] | Record<string, unknown>;
}

// Credential Types
export interface VerifiableCredential {
  "@context": string | string[];
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
  "@context": string | string[];
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
    limit_disclosure?: "required" | "preferred";
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
  predicate?: "required" | "preferred";
}

// Wallet Storage Types
export interface WalletCredential {
  id: string;
  type: string;
  credential: VerifiableCredential | ZKCredential;
  metadata: {
    tags: string[];
    favorite: boolean;
    lastUsed?: string;
    usageCount: number;
    source:
      | "connector"
      | "manual"
      | "exchange"
      | "github"
      | "linkedin"
      | "plaid";
    connector?: string;
    // Display metadata
    name?: string;
    description?: string;
    issuer?: string;
    issuedAt?: string;
    expiresAt?: string;
    // Compliance flags
    eudiCompliant?: boolean;
    w3cCompliant?: boolean;
    // ZK properties
    zkCommitment?: string;
    revoked?: boolean;
    revokedAt?: string;
    revocationReason?: string;
  };
  storage: {
    encrypted: boolean;
    backed_up: boolean;
    synced: boolean;
  };
}

export interface WalletConnection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  domain: string;
  did?: string;
  trustLevel: "high" | "medium" | "low";
  permissions: Permission[];
  created: string;
  lastUsed?: string;
  active: boolean;
}

export interface Permission {
  type:
    | "read_credentials"
    | "create_presentations"
    | "sign_messages"
    | "decrypt_messages";
  scope?: string[];
  granted: string;
  expires?: string;
}

// Communication Types (DIDComm)
export interface DIDCommMessage {
  id: string;
  type: string;
  from?: string;
  to: string[];
  created_time?: string;
  expires_time?: string;
  body: Record<string, unknown>;
  attachments?: Attachment[];
  parent_thread_id?: string;
  thread_id?: string;
}

export interface Attachment {
  id: string;
  description?: string;
  filename?: string;
  media_type?: string;
  format?: string;
  data: {
    base64?: string;
    json?: Record<string, unknown>;
    links?: string[];
    hash?: string;
  };
}

// Proof Request/Response Types
export interface ProofRequest {
  id: string;
  type: "ProofRequest";
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
  type: "ProofResponse";
  request_id: string;
  from: string;
  to: string;
  created: string;
  presentation: VerifiablePresentation;
  status: "approved" | "denied" | "error";
  error?: string;
}

// Authentication Types (WebAuthn/FIDO2)
export interface PasskeyCredential {
  id: string;
  name: string;
  created: string;
  lastUsed?: string;
  counter: number;
  transport: AuthenticatorTransport[];
  credentialId: string;
  publicKey: string;
  active: boolean;
}

export interface BiometricOptions {
  enabled: boolean;
  type: "fingerprint" | "face" | "iris" | "voice";
  fallback_to_pin: boolean;
}

// Wallet Configuration Types
export interface WalletConfig {
  id: string;
  name: string;
  version: string;
  created: string;
  setupCompleted: boolean;
  security: {
    encryption_enabled: boolean;
    backup_enabled: boolean;
    biometric_enabled: boolean;
    auto_lock_timeout: number; // minutes
    passkey_enabled: boolean;
  };
  privacy: {
    anonymous_analytics: boolean;
    crash_reporting: boolean;
    usage_statistics: boolean;
    selective_disclosure_default: boolean;
  };
  sync: {
    enabled: boolean;
    provider: "icloud" | "google_drive" | "personapass_cloud" | "none";
    auto_sync: boolean;
    last_sync?: string;
  };
  ui: {
    theme: "light" | "dark" | "auto";
    language: string;
    currency: string;
    notifications_enabled: boolean;
  };
}

// Sharing and Consent Types
export interface SharingRecord {
  id: string;
  verifier: {
    name: string;
    domain: string;
    did?: string;
    logo?: string;
  };
  credentials_shared: string[];
  purpose: string;
  timestamp: string;
  proof_type: "full_disclosure" | "selective_disclosure" | "zero_knowledge";
  status: "completed" | "revoked" | "expired";
  expires?: string;
  metadata: {
    ip_address?: string;
    user_agent?: string;
    location?: string;
    session_id?: string;
  };
}

export interface ConsentRequest {
  id: string;
  verifier: {
    name: string;
    domain: string;
    did?: string;
    logo?: string;
    trust_level: "verified" | "unverified" | "suspicious";
  };
  requested_credentials: {
    credential_id: string;
    fields: string[];
    required: boolean;
    purpose: string;
  }[];
  presentation_definition: PresentationDefinition;
  purpose: string;
  callback_url?: string;
  expires: string;
  privacy_options: {
    selective_disclosure: boolean;
    zero_knowledge: boolean;
    anonymization: boolean;
  };
}

// Backup and Recovery Types
export interface BackupData {
  version: string;
  created: string;
  wallet_id: string;
  data: {
    dids: DID[];
    credentials: WalletCredential[];
    connections: WalletConnection[];
    config: WalletConfig;
    sharing_history: SharingRecord[];
  };
  encryption: {
    algorithm: string;
    key_derivation: string;
    salt: string;
    iv: string;
  };
  checksum: string;
}

export interface RecoveryPhrase {
  id: string;
  phrase: string;
  created: string;
  verified: boolean;
  backup_locations: string[];
  strength: 128 | 256;
}

// UI State Types
export interface WalletState {
  initialized: boolean;
  locked: boolean;
  online: boolean;
  syncing: boolean;
  current_did?: string;
  active_connections: WalletConnection[];
  pending_requests: ProofRequest[];
  notifications: WalletNotification[];
}

export interface WalletNotification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

// OpenID4VP/VCI Types for Standards Compliance
export interface OpenID4VPRequest {
  client_id: string;
  client_id_scheme?: "redirect_uri" | "entity_id" | "did";
  response_uri?: string;
  response_mode?: "direct_post" | "direct_post.jwt";
  presentation_definition?: PresentationDefinition;
  presentation_definition_uri?: string;
  scope?: string;
  nonce: string;
  state?: string;
  response_type: "vp_token";
  client_metadata?: {
    client_name?: string;
    logo_uri?: string;
    policy_uri?: string;
    tos_uri?: string;
  };
}

export interface OpenID4VCICredentialOffer {
  credential_issuer: string;
  credentials: string[] | CredentialOfferDetail[];
  grants?: {
    authorization_code?: AuthorizationCodeGrant;
    "urn:ietf:params:oauth:grant-type:pre-authorized_code"?: PreAuthorizedCodeGrant;
  };
}

export interface CredentialOfferDetail {
  format: "jwt_vc_json" | "ldp_vc";
  types: string[];
  trust_framework?: {
    name: string;
    type: string;
    uri?: string;
  };
}

export interface AuthorizationCodeGrant {
  issuer_state?: string;
}

export interface PreAuthorizedCodeGrant {
  "pre-authorized_code": string;
  user_pin_required?: boolean;
}

// Android Digital Credentials Types
export interface AndroidCredentialRequest {
  selector: {
    type: "DigitalCredential";
    requests: AndroidCredentialRequestEntry[];
  };
}

export interface AndroidCredentialRequestEntry {
  protocol: "openid4vp";
  data: string; // OpenID4VP request
}

export interface AndroidCredentialResponse {
  credential: {
    type: "DigitalCredential";
    data: string; // OpenID4VP response
  };
}

// Error Types
export interface WalletError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  context?: string;
}

// Event Types for Analytics and Monitoring
export interface WalletEvent {
  id: string;
  type:
    | "credential_added"
    | "credential_shared"
    | "proof_generated"
    | "connection_established"
    | "backup_created";
  timestamp: string;
  data: Record<string, unknown>;
  user_id?: string;
  session_id?: string;
}

// Window type extension for Web3
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      selectedAddress?: string;
      chainId?: string;
    };
  }
}
