/**
 * PersonaPass Issuer SDK Types
 * Comprehensive type definitions for credential issuance
 */

import type { VerifiableCredential, DIDDocument, ProofOptions } from '../types';

// Core Configuration
export interface IssuerConfig {
  apiEndpoint: string;
  chainEndpoint: string;
  issuerDID: string;
  privateKey: string;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enableMetrics: boolean;
  enableCompliance: boolean;
  notifications: NotificationConfig;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  webhook?: WebhookConfig;
  email?: EmailConfig;
  slack?: SlackConfig;
}

export type NotificationChannel = 'webhook' | 'email' | 'slack' | 'sms';

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  from: string;
}

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
}

// Credential Templates
export interface CredentialTemplate {
  id: string;
  name: string;
  description: string;
  type: string[];
  version: string;
  schema: CredentialSchema;
  proofOptions: ProofOptions;
  validityPeriod?: number; // in seconds
  renewable?: boolean;
  revocable?: boolean;
  metadata: TemplateMetadata;
  createdAt: string;
  updatedAt?: string;
}

export interface CredentialSchema {
  $schema: string;
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  description?: string;
  examples?: any[];
}

export interface TemplateMetadata {
  category: CredentialCategory;
  tags: string[];
  issuerName: string;
  logoUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  zkEnabled: boolean;
  complianceStandards: ComplianceStandard[];
}

export type CredentialCategory = 
  | 'education'
  | 'employment'
  | 'finance'
  | 'healthcare'
  | 'government'
  | 'identity'
  | 'membership'
  | 'certification'
  | 'other';

export type ComplianceStandard = 
  | 'w3c-vc'
  | 'openid4vci'
  | 'eudi-arf'
  | 'gdpr'
  | 'ccpa'
  | 'ferpa'
  | 'hipaa';

// Issuance Operations
export interface IssuanceRequest {
  subjectDID: string;
  credentialType: string | string[];
  claims: Record<string, any>;
  templateId?: string;
  expirationDate?: string;
  validFrom?: string;
  context?: string[];
  proofOptions?: ProofOptions;
  metadata?: IssuanceMetadata;
  notificationOptions?: NotificationOptions;
}

export interface IssuanceMetadata {
  batchId?: string;
  correlationId?: string;
  source?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
}

export interface NotificationOptions {
  enabled?: boolean;
  channels?: NotificationChannel[];
  recipients?: string[];
  template?: string;
  customData?: Record<string, any>;
}

export interface IssuanceResult {
  credential: VerifiableCredential;
  credentialId: string;
  transactionHash?: string;
  registryEntry?: RegistryEntry;
  issuedAt: string;
  status: IssuanceStatus;
  metadata: IssuanceResultMetadata;
}

export interface IssuanceResultMetadata {
  processingTime: number;
  batchId?: string;
  correlationId?: string;
  notifications: NotificationResult[];
}

export interface NotificationResult {
  channel: NotificationChannel;
  status: 'sent' | 'failed' | 'pending';
  recipient?: string;
  sentAt?: string;
  error?: string;
}

export type IssuanceStatus = 
  | 'pending'
  | 'issued'
  | 'failed'
  | 'revoked'
  | 'suspended'
  | 'expired';

// Batch Operations
export interface BatchIssuanceOptions {
  concurrency?: number;
  failureMode?: 'stop' | 'continue' | 'rollback';
  progressCallback?: (progress: BatchProgress) => void;
  metadata?: Record<string, any>;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface BatchIssuanceResult {
  batchId: string;
  results: IssuanceResult[];
  summary: BatchSummary;
  startedAt: string;
  completedAt: string;
}

export interface BatchSummary {
  total: number;
  successful: number;
  failed: number;
  errors: BatchError[];
  totalProcessingTime: number;
  averageProcessingTime: number;
}

export interface BatchError {
  index: number;
  request: IssuanceRequest;
  error: string;
  code?: string;
}

// Registry and Status Management
export interface RegistryEntry {
  credentialId: string;
  issuerDID: string;
  subjectDID: string;
  credentialType: string[];
  status: CredentialStatus;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  suspendedAt?: string;
  statusReason?: string;
  transactionHash: string;
  blockNumber?: number;
  metadata: RegistryMetadata;
}

export interface RegistryMetadata {
  templateId?: string;
  batchId?: string;
  version: string;
  schema: string;
  proofType: string;
}

export type CredentialStatus = 
  | 'active'
  | 'revoked'
  | 'suspended'
  | 'expired';

export interface StatusUpdateRequest {
  credentialId: string;
  status: CredentialStatus;
  reason?: string;
  effectiveDate?: string;
  metadata?: Record<string, any>;
}

export interface StatusUpdateResult {
  credentialId: string;
  previousStatus: CredentialStatus;
  newStatus: CredentialStatus;
  transactionHash: string;
  updatedAt: string;
}

// Metrics and Analytics
export interface IssuerMetrics {
  overview: MetricsOverview;
  issuance: IssuanceMetrics;
  credentials: CredentialMetrics;
  performance: PerformanceMetrics;
  compliance: ComplianceMetrics;
  timeRange: TimeRange;
  generatedAt: string;
}

export interface MetricsOverview {
  totalCredentialsIssued: number;
  totalActiveCredentials: number;
  totalRevokedCredentials: number;
  totalSuspendedCredentials: number;
  issuanceRate: number; // per day
  successRate: number; // percentage
}

export interface IssuanceMetrics {
  totalRequests: number;
  successfulIssuances: number;
  failedIssuances: number;
  averageProcessingTime: number;
  batchOperations: number;
  templateUsage: TemplateUsageMetric[];
}

export interface TemplateUsageMetric {
  templateId: string;
  templateName: string;
  usageCount: number;
  percentage: number;
}

export interface CredentialMetrics {
  byType: CredentialTypeMetric[];
  byStatus: StatusMetric[];
  byCategory: CategoryMetric[];
  expirationSummary: ExpirationSummary;
}

export interface CredentialTypeMetric {
  type: string;
  count: number;
  percentage: number;
}

export interface StatusMetric {
  status: CredentialStatus;
  count: number;
  percentage: number;
}

export interface CategoryMetric {
  category: CredentialCategory;
  count: number;
  percentage: number;
}

export interface ExpirationSummary {
  expiringSoon: number; // within 30 days
  expired: number;
  neverExpires: number;
}

export interface PerformanceMetrics {
  averageIssuanceTime: number;
  p95IssuanceTime: number;
  p99IssuanceTime: number;
  throughput: number; // credentials per second
  errorRate: number; // percentage
  apiResponseTimes: ApiResponseMetrics;
}

export interface ApiResponseMetrics {
  average: number;
  p95: number;
  p99: number;
  slowestEndpoints: EndpointMetric[];
}

export interface EndpointMetric {
  endpoint: string;
  averageTime: number;
  requestCount: number;
}

export interface ComplianceMetrics {
  standardsCompliance: StandardComplianceMetric[];
  auditTrail: AuditMetric;
  privacyCompliance: PrivacyMetric;
}

export interface StandardComplianceMetric {
  standard: ComplianceStandard;
  compliantCredentials: number;
  totalCredentials: number;
  complianceRate: number;
}

export interface AuditMetric {
  totalAuditEvents: number;
  auditEventsLastWeek: number;
  completenessScore: number;
}

export interface PrivacyMetric {
  gdprCompliantCredentials: number;
  dataRetentionCompliance: number;
  consentTracking: number;
}

export interface TimeRange {
  start: string;
  end: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
}

// Compliance and Reporting
export interface ComplianceReport {
  reportId: string;
  issuerDID: string;
  reportType: 'full' | 'summary' | 'audit';
  timeRange: TimeRange;
  standards: ComplianceStandardReport[];
  violations: ComplianceViolation[];
  recommendations: ComplianceRecommendation[];
  score: number; // 0-100
  generatedAt: string;
  expiresAt: string;
}

export interface ComplianceStandardReport {
  standard: ComplianceStandard;
  requirements: RequirementCheck[];
  overallStatus: 'compliant' | 'non-compliant' | 'partially-compliant';
  score: number;
}

export interface RequirementCheck {
  requirementId: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  evidence?: string;
  remediation?: string;
}

export interface ComplianceViolation {
  violationId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  standard: ComplianceStandard;
  requirement: string;
  description: string;
  affectedCredentials: string[];
  detectedAt: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface ComplianceRecommendation {
  recommendationId: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  description: string;
  implementation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

// Events
export interface IssuerEvent {
  eventId: string;
  eventType: IssuerEventType;
  timestamp: string;
  issuerDID: string;
  data: Record<string, any>;
}

export type IssuerEventType =
  | 'credential.issued'
  | 'credential.revoked'
  | 'credential.suspended'
  | 'credential.expired'
  | 'batch.started'
  | 'batch.completed'
  | 'batch.failed'
  | 'template.created'
  | 'template.updated'
  | 'template.deleted'
  | 'compliance.violation'
  | 'metrics.generated';

// Error Types
export class IssuanceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'IssuanceError';
  }
}

export class TemplateError extends Error {
  constructor(
    message: string,
    public templateId?: string,
    public validationErrors?: string[]
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class ComplianceError extends Error {
  constructor(
    message: string,
    public standard: ComplianceStandard,
    public violations?: ComplianceViolation[]
  ) {
    super(message);
    this.name = 'ComplianceError';
  }
}

export class BatchError extends Error {
  constructor(
    message: string,
    public batchId: string,
    public failedRequests?: BatchError[]
  ) {
    super(message);
    this.name = 'BatchError';
  }
}