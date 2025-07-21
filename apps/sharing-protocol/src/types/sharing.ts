import { z } from 'zod';

// Core sharing protocol types
export const ProofShareRequestSchema = z.object({
  id: z.string(),
  requester: z.object({
    did: z.string(),
    name: z.string(),
    description: z.string().optional(),
    domain: z.string().optional(),
    logoUrl: z.string().optional(),
  }),
  requestedProofs: z.array(z.object({
    domain: z.enum(['academic', 'financial', 'health', 'social', 'government', 'iot']),
    operation: z.string(),
    constraints: z.record(z.any()).optional(),
    reason: z.string(),
    required: z.boolean().default(true),
  })),
  purpose: z.string(),
  expiresAt: z.string(), // ISO date string
  createdAt: z.string(),
  callback: z.object({
    url: z.string().url().optional(),
    method: z.enum(['POST', 'PUT']).default('POST'),
    headers: z.record(z.string()).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

export const ProofShareResponseSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  holder: z.object({
    did: z.string(),
    publicKey: z.string().optional(),
  }),
  sharedProofs: z.array(z.object({
    domain: z.string(),
    operation: z.string(),
    proof: z.object({
      proof: z.any(), // ZK proof data
      publicSignals: z.array(z.string()),
      verification: z.boolean(),
      onChainTxHash: z.string().optional(),
    }),
    metadata: z.object({
      proofId: z.string(),
      timestamp: z.number(),
      circuitType: z.string(),
      constraints: z.record(z.any()).optional(),
    }),
  })),
  consentGiven: z.boolean(),
  consentSignature: z.string().optional(),
  sharedAt: z.string(),
  expiresAt: z.string().optional(),
  auditTrail: z.array(z.object({
    action: z.string(),
    timestamp: z.string(),
    details: z.record(z.any()).optional(),
  })).optional(),
});

export const SelectiveDisclosureSchema = z.object({
  allowedDomains: z.array(z.string()),
  excludedFields: z.array(z.string()).optional(),
  minimumThresholds: z.record(z.number()).optional(),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
  maxShares: z.number().optional(),
  requireConsent: z.boolean().default(true),
});

export const QRShareDataSchema = z.object({
  version: z.string().default('1.0'),
  type: z.enum(['request', 'response', 'invitation']),
  data: z.union([
    ProofShareRequestSchema,
    ProofShareResponseSchema,
    z.object({
      sessionId: z.string(),
      endpoint: z.string().url(),
      publicKey: z.string().optional(),
    }),
  ]),
  signature: z.string().optional(),
  checksum: z.string(),
});

export const SharingSessionSchema = z.object({
  id: z.string(),
  type: z.enum(['qr', 'did', 'direct', 'api']),
  status: z.enum(['pending', 'active', 'completed', 'expired', 'revoked']),
  participants: z.object({
    requester: z.string(), // DID
    holder: z.string().optional(), // DID
  }),
  request: ProofShareRequestSchema.optional(),
  response: ProofShareResponseSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const ConsentRecordSchema = z.object({
  id: z.string(),
  holderDid: z.string(),
  requesterDid: z.string(),
  sharedProofs: z.array(z.string()), // proof IDs
  purpose: z.string(),
  consentGiven: z.boolean(),
  consentWithdrawn: z.boolean().default(false),
  signature: z.string(),
  timestamp: z.string(),
  expiresAt: z.string().optional(),
  auditLog: z.array(z.object({
    action: z.enum(['given', 'withdrawn', 'accessed', 'shared']),
    timestamp: z.string(),
    details: z.record(z.any()).optional(),
  })),
});

// Type exports
export type ProofShareRequest = z.infer<typeof ProofShareRequestSchema>;
export type ProofShareResponse = z.infer<typeof ProofShareResponseSchema>;
export type SelectiveDisclosure = z.infer<typeof SelectiveDisclosureSchema>;
export type QRShareData = z.infer<typeof QRShareDataSchema>;
export type SharingSession = z.infer<typeof SharingSessionSchema>;
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

// Domain-specific proof request types
export interface AcademicProofRequest {
  domain: 'academic';
  operation: 'gpa_verification';
  constraints: {
    minimumGpa?: number;
    institution?: string;
    graduationYear?: number;
    degreeType?: string;
  };
  reason: string;
}

export interface FinancialProofRequest {
  domain: 'financial';
  operation: 'income_verification';
  constraints: {
    minimumIncome?: number;
    verificationMethod?: string[];
    taxYear?: number;
    employmentStatus?: string;
  };
  reason: string;
}

export interface HealthProofRequest {
  domain: 'health';
  operation: 'vaccination_verification';
  constraints: {
    requiredVaccines?: string[];
    minimumDate?: string;
    providerType?: string;
  };
  reason: string;
}

export interface AgeProofRequest {
  domain: 'government';
  operation: 'age_verification';
  constraints: {
    minimumAge?: number;
    maximumAge?: number;
    jurisdiction?: string;
  };
  reason: string;
}

// Use case templates
export interface UseCase {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredProofs: Array<AcademicProofRequest | FinancialProofRequest | HealthProofRequest | AgeProofRequest>;
  icon: string;
  popularityScore: number;
  estimatedTime: string; // "2 minutes"
  examples: string[];
}

// Sharing analytics
export interface SharingAnalytics {
  totalShares: number;
  sharesByDomain: Record<string, number>;
  sharesByUseCase: Record<string, number>;
  averageResponseTime: number;
  successRate: number;
  topRequesters: Array<{
    did: string;
    name: string;
    shareCount: number;
  }>;
  consentWithdrawalRate: number;
  recentActivity: Array<{
    action: string;
    timestamp: string;
    details: Record<string, any>;
  }>;
}

// Error types
export class SharingProtocolError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SharingProtocolError';
  }
}

export class ConsentError extends SharingProtocolError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONSENT_ERROR', details);
  }
}

export class ValidationError extends SharingProtocolError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class SessionError extends SharingProtocolError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SESSION_ERROR', details);
  }
}