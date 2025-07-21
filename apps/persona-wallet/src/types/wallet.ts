import { z } from 'zod';

// Core wallet types
export const CredentialSchema = z.object({
  id: z.string(),
  domain: z.enum(['academic', 'financial', 'health', 'social', 'government', 'iot']),
  type: z.string(),
  issuer: z.object({
    did: z.string(),
    name: z.string(),
    logoUrl: z.string().optional(),
  }),
  subject: z.object({
    did: z.string(),
    name: z.string(),
  }),
  claims: z.record(z.any()),
  issuedAt: z.string(),
  expiresAt: z.string().optional(),
  status: z.enum(['active', 'expired', 'revoked', 'pending']),
  proof: z.object({
    type: z.string(),
    created: z.string(),
    verificationMethod: z.string(),
    proofValue: z.string(),
  }),
  metadata: z.object({
    source: z.string(),
    connector: z.string(),
    lastUpdated: z.string(),
    verified: z.boolean(),
    trustScore: z.number().min(0).max(100),
  }),
});

export const ProofHistorySchema = z.object({
  id: z.string(),
  domain: z.string(),
  operation: z.string(),
  requester: z.object({
    did: z.string(),
    name: z.string(),
    logoUrl: z.string().optional(),
  }),
  sharedAt: z.string(),
  purpose: z.string(),
  consentGiven: z.boolean(),
  proofVerified: z.boolean(),
  onChainTxHash: z.string().optional(),
  expiresAt: z.string().optional(),
  status: z.enum(['active', 'expired', 'revoked']),
  metadata: z.object({
    sessionId: z.string(),
    sharingMethod: z.enum(['qr', 'did', 'direct', 'api']),
    constraints: z.record(z.any()).optional(),
  }),
});

export const IdentityProfileSchema = z.object({
  did: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  publicKeys: z.array(z.object({
    id: z.string(),
    type: z.string(),
    publicKeyHex: z.string(),
    purpose: z.array(z.string()),
  })),
  services: z.array(z.object({
    id: z.string(),
    type: z.string(),
    serviceEndpoint: z.string(),
  })),
  preferences: z.object({
    privacy: z.enum(['public', 'private', 'selective']),
    shareAnalytics: z.boolean(),
    requireExplicitConsent: z.boolean(),
    autoBackup: z.boolean(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WalletConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']),
  language: z.string(),
  currency: z.string(),
  notifications: z.object({
    proofRequests: z.boolean(),
    credentialUpdates: z.boolean(),
    securityAlerts: z.boolean(),
    pushEnabled: z.boolean(),
  }),
  security: z.object({
    biometricEnabled: z.boolean(),
    pinEnabled: z.boolean(),
    autoLockMinutes: z.number(),
    requireConfirmationForSharing: z.boolean(),
  }),
  connectivity: z.object({
    zkApiUrl: z.string(),
    sharingProtocolUrl: z.string(),
    blockchainRpcUrl: z.string(),
    offlineMode: z.boolean(),
  }),
  features: z.object({
    enableExperimentalFeatures: z.boolean(),
    debugMode: z.boolean(),
    analytics: z.boolean(),
  }),
});

export const SharingRequestSchema = z.object({
  id: z.string(),
  requester: z.object({
    did: z.string(),
    name: z.string(),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
    domain: z.string().optional(),
    trustScore: z.number().min(0).max(100).optional(),
  }),
  requestedProofs: z.array(z.object({
    domain: z.enum(['academic', 'financial', 'health', 'social', 'government', 'iot']),
    operation: z.string(),
    constraints: z.record(z.any()).optional(),
    reason: z.string(),
    required: z.boolean(),
    estimatedTime: z.string().optional(),
  })),
  purpose: z.string(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  expiresAt: z.string(),
  createdAt: z.string(),
  sessionId: z.string(),
  sharingMethod: z.enum(['qr', 'did', 'direct', 'api']),
  metadata: z.record(z.any()).optional(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  type: z.enum(['proof_request', 'credential_update', 'security_alert', 'system', 'success', 'error']),
  title: z.string(),
  message: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  read: z.boolean().default(false),
  dismissed: z.boolean().default(false),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  actionable: z.boolean().default(false),
  actions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['primary', 'secondary', 'danger']),
    action: z.string(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

export const WalletStatsSchema = z.object({
  credentials: z.object({
    total: z.number(),
    active: z.number(),
    expired: z.number(),
    byDomain: z.record(z.number()),
    trustScoreAverage: z.number(),
  }),
  proofs: z.object({
    totalGenerated: z.number(),
    totalShared: z.number(),
    successRate: z.number(),
    byDomain: z.record(z.number()),
    recentActivity: z.number(),
  }),
  sharing: z.object({
    totalRequests: z.number(),
    consentRate: z.number(),
    averageResponseTime: z.number(),
    topRequesters: z.array(z.object({
      name: z.string(),
      count: z.number(),
    })),
  }),
  security: z.object({
    lastBackup: z.string().optional(),
    securityScore: z.number().min(0).max(100),
    vulnerabilities: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
});

// Type exports
export type Credential = z.infer<typeof CredentialSchema>;
export type ProofHistory = z.infer<typeof ProofHistorySchema>;
export type IdentityProfile = z.infer<typeof IdentityProfileSchema>;
export type WalletConfig = z.infer<typeof WalletConfigSchema>;
export type SharingRequest = z.infer<typeof SharingRequestSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type WalletStats = z.infer<typeof WalletStatsSchema>;

// UI state types
export interface WalletState {
  isLoading: boolean;
  isUnlocked: boolean;
  hasBackup: boolean;
  connectivity: 'online' | 'offline' | 'syncing';
  lastSync: string | null;
  pendingActions: number;
}

export interface NavigationState {
  currentTab: 'home' | 'credentials' | 'proofs' | 'sharing' | 'settings';
  previousTab: string | null;
  modalStack: string[];
  bottomSheetOpen: boolean;
}

export interface SharingState {
  activeRequest: SharingRequest | null;
  selectedCredentials: string[];
  consentGiven: boolean;
  generateProofInProgress: boolean;
  shareInProgress: boolean;
  qrCodeVisible: boolean;
  scannerActive: boolean;
}

// Domain-specific types
export interface AcademicCredential extends Credential {
  domain: 'academic';
  claims: {
    gpa: number;
    degree: string;
    institution: string;
    graduationYear: number;
    major: string;
    honors?: string[];
  };
}

export interface FinancialCredential extends Credential {
  domain: 'financial';
  claims: {
    income: number;
    verificationMethod: string;
    taxYear: number;
    employmentStatus: string;
    employer?: string;
    accountVerified: boolean;
  };
}

export interface HealthCredential extends Credential {
  domain: 'health';
  claims: {
    vaccinations: Array<{
      vaccine: string;
      date: string;
      provider: string;
      lotNumber?: string;
    }>;
    allergies?: string[];
    bloodType?: string;
    emergencyContact?: string;
  };
}

// Use case templates
export interface UseCase {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  requiredDomains: string[];
  estimatedTime: string;
  popularity: number;
  examples: string[];
  template: {
    purpose: string;
    constraints: Record<string, any>;
    instructions: string[];
  };
}

// Backup and recovery
export interface BackupData {
  version: string;
  createdAt: string;
  identity: IdentityProfile;
  credentials: Credential[];
  proofHistory: ProofHistory[];
  config: WalletConfig;
  encryptedData: string;
  checksum: string;
}

export interface RecoveryPhrase {
  words: string[];
  entropy: string;
  createdAt: string;
  verified: boolean;
}

// Error types
export class WalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

export class CredentialError extends WalletError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CREDENTIAL_ERROR', details);
  }
}

export class ProofError extends WalletError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'PROOF_ERROR', details);
  }
}

export class SharingError extends WalletError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SHARING_ERROR', details);
  }
}

export class SecurityError extends WalletError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SECURITY_ERROR', details);
  }
}