/**
 * PersonaPass Database Schema & Architecture
 * 
 * Scalable PostgreSQL schema with privacy-first design
 * Supports real-time analytics, GDPR compliance, and high availability
 */

export interface DatabaseSchema {
  // Core Identity Tables
  users: UserRecord;
  did_documents: DIDDocumentRecord;
  credential_records: CredentialRecord;
  zk_proof_records: ZKProofRecord;
  
  // Analytics & Events
  analytics_events: AnalyticsEventRecord;
  user_sessions: UserSessionRecord;
  performance_metrics: PerformanceMetricRecord;
  
  // Privacy & Compliance
  data_processing_logs: DataProcessingLogRecord;
  consent_records: ConsentRecord;
  anonymization_mappings: AnonymizationMappingRecord;
  
  // Business Intelligence
  aggregated_metrics: AggregatedMetricRecord;
  business_insights: BusinessInsightRecord;
  revenue_tracking: RevenueTrackingRecord;
  
  // System Health
  system_health: SystemHealthRecord;
  audit_logs: AuditLogRecord;
  backup_metadata: BackupMetadataRecord;
}

/**
 * User Record - Core user data with privacy controls
 */
export interface UserRecord {
  id: string; // UUID primary key
  did: string; // DID identifier (indexed, unique)
  created_at: Date;
  updated_at: Date;
  last_active: Date;
  
  // Privacy-controlled profile data (encrypted)
  encrypted_profile: string; // AES-256-GCM encrypted JSON
  profile_encryption_key_id: string;
  
  // Analytics opt-in preferences
  analytics_consent: boolean;
  data_retention_preference: 'minimal' | 'standard' | 'extended';
  
  // Geographic data (anonymized to country level)
  country_code: string; // ISO 3166-1 alpha-2
  timezone: string;
  
  // Account status
  status: 'active' | 'suspended' | 'deleted';
  verification_level: 'unverified' | 'basic' | 'advanced' | 'premium';
  
  // Indexes
  // - PRIMARY KEY (id)
  // - UNIQUE INDEX ON did
  // - INDEX ON (status, last_active)
  // - INDEX ON (country_code, created_at)
}

/**
 * DID Document Record - Blockchain identity documents
 */
export interface DIDDocumentRecord {
  id: string;
  user_id: string; // Foreign key to users.id
  did: string;
  document_version: number;
  
  // Encrypted DID document
  encrypted_document: string;
  document_hash: string; // SHA-256 for integrity
  
  // Blockchain integration
  blockchain_network: string;
  transaction_hash?: string;
  block_number?: number;
  
  // Status tracking
  status: 'pending' | 'active' | 'revoked' | 'expired';
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - FOREIGN KEY (user_id) REFERENCES users(id)
  // - INDEX ON (did, document_version)
  // - INDEX ON (status, expires_at)
}

/**
 * Credential Record - Verifiable credentials with privacy protection
 */
export interface CredentialRecord {
  id: string;
  user_id: string;
  credential_id: string; // W3C VC ID
  credential_type: string;
  
  // Encrypted credential data
  encrypted_credential: string;
  credential_hash: string;
  encryption_method: 'AES-256-GCM' | 'AES-256-CBC';
  
  // Issuer information
  issuer_did: string;
  issuer_name: string;
  issuance_date: Date;
  expiration_date?: Date;
  
  // Verification tracking
  verification_count: number;
  last_verified_at?: Date;
  verification_score: number; // 0.0 to 1.0
  
  // Privacy controls
  sharing_permissions: string[]; // JSON array of allowed sharing contexts
  anonymized_attributes: string[]; // Which attributes can be anonymized
  
  // Status and metadata
  status: 'active' | 'revoked' | 'expired' | 'suspended';
  created_at: Date;
  updated_at: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - FOREIGN KEY (user_id) REFERENCES users(id)
  // - INDEX ON (credential_type, status)
  // - INDEX ON (issuer_did, issuance_date)
  // - INDEX ON (expiration_date) WHERE expiration_date IS NOT NULL
}

/**
 * ZK Proof Record - Zero-knowledge proof data
 */
export interface ZKProofRecord {
  id: string;
  user_id: string;
  proof_type: string;
  circuit_id: string;
  
  // Encrypted proof data
  encrypted_proof_data: string;
  public_signals_hash: string;
  
  // Performance metrics
  generation_time_ms: number;
  verification_time_ms: number;
  proof_size_bytes: number;
  
  // Usage tracking
  verification_count: number;
  last_used_at?: Date;
  
  // Privacy settings
  is_shareable: boolean;
  anonymity_level: 'none' | 'pseudonymous' | 'anonymous';
  
  created_at: Date;
  expires_at?: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - FOREIGN KEY (user_id) REFERENCES users(id)
  // - INDEX ON (proof_type, circuit_id)
  // - INDEX ON (created_at, expires_at)
}

/**
 * Analytics Event Record - Privacy-preserving event tracking
 */
export interface AnalyticsEventRecord {
  id: string;
  event_type: 'user_action' | 'system_event' | 'transaction' | 'performance' | 'error' | 'security';
  event_category: string;
  event_action: string;
  
  // Anonymized user tracking
  anonymized_user_id?: string; // Hashed/anonymized user identifier
  session_id: string;
  
  // Event properties (anonymized)
  anonymized_properties: string; // JSON with PII removed
  
  // Context data
  user_agent_hash: string; // Hashed user agent
  ip_country: string; // Country only, no IP stored
  platform: string;
  
  // Performance data
  duration_ms?: number;
  network_latency_ms?: number;
  
  // Privacy metadata
  data_anonymized: boolean;
  retention_category: 'essential' | 'functional' | 'analytics';
  
  timestamp: Date;
  
  // Partitioned table by timestamp for performance
  // Indexes
  // - PRIMARY KEY (id, timestamp)
  // - INDEX ON (event_type, event_category, timestamp)
  // - INDEX ON (anonymized_user_id, timestamp)
  // - PARTITION BY RANGE (timestamp)
}

/**
 * User Session Record - Session analytics with privacy
 */
export interface UserSessionRecord {
  id: string;
  anonymized_user_id?: string;
  session_start: Date;
  session_end?: Date;
  duration_seconds?: number;
  
  // Activity metrics
  page_views: number;
  actions_performed: number;
  credentials_accessed: number;
  
  // Device context (anonymized)
  device_type: 'mobile' | 'desktop' | 'tablet';
  browser_family: string;
  os_family: string;
  
  // Geographic (country level only)
  country_code: string;
  
  // Session quality
  bounce_session: boolean;
  error_count: number;
  
  created_at: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - INDEX ON (session_start, country_code)
  // - INDEX ON (anonymized_user_id, session_start)
}

/**
 * Performance Metric Record - System performance tracking
 */
export interface PerformanceMetricRecord {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  
  // Aggregation data
  aggregation_type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
  time_window: '1m' | '5m' | '15m' | '1h' | '24h';
  
  // Context
  service_name: string;
  environment: 'production' | 'staging' | 'development';
  
  // Tags for filtering
  tags: Record<string, string>;
  
  timestamp: Date;
  
  // Partitioned table for time-series data
  // Indexes
  // - PRIMARY KEY (id, timestamp)
  // - INDEX ON (metric_name, service_name, timestamp)
  // - PARTITION BY RANGE (timestamp)
}

/**
 * Data Processing Log - GDPR compliance tracking
 */
export interface DataProcessingLogRecord {
  id: string;
  user_id?: string;
  processing_activity: string;
  lawful_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  
  // Data categories processed
  data_categories: string[]; // JSON array
  
  // Processing details
  processor: string; // Service/component that processed data
  purpose: string;
  retention_period_days: number;
  
  // Automated decision making
  automated_decision: boolean;
  profiling_involved: boolean;
  
  // Recipients
  data_shared_with: string[]; // External recipients
  
  processed_at: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - INDEX ON (user_id, processed_at)
  // - INDEX ON (processing_activity, processed_at)
}

/**
 * Consent Record - User consent management
 */
export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: 'analytics' | 'marketing' | 'functional' | 'personalization';
  
  // Consent details
  granted: boolean;
  consent_method: 'explicit' | 'implicit' | 'granular';
  consent_version: string;
  
  // Legal basis
  lawful_basis: string;
  
  // Lifecycle
  granted_at?: Date;
  withdrawn_at?: Date;
  expires_at?: Date;
  
  // Audit trail
  ip_country: string; // Country only
  user_agent_hash: string;
  
  created_at: Date;
  updated_at: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - FOREIGN KEY (user_id) REFERENCES users(id)
  // - INDEX ON (user_id, consent_type, granted)
}

/**
 * Anonymization Mapping - Privacy-preserving ID mapping
 */
export interface AnonymizationMappingRecord {
  id: string;
  original_id_hash: string; // SHA-256 hash of original ID
  anonymized_id: string; // Random anonymized identifier
  
  // Mapping metadata
  anonymization_method: 'hash' | 'pseudonym' | 'k_anonymity' | 'differential_privacy';
  salt_used: string;
  created_at: Date;
  
  // Retention and lifecycle
  purpose: string;
  retention_until: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - UNIQUE INDEX ON (original_id_hash)
  // - INDEX ON (anonymized_id)
  // - INDEX ON (retention_until)
}

/**
 * Aggregated Metric - Pre-computed analytics
 */
export interface AggregatedMetricRecord {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: 'count' | 'sum' | 'average' | 'median' | 'percentile_95' | 'percentile_99';
  
  // Time aggregation
  time_bucket: Date; // Start of time bucket
  time_bucket_size: '5m' | '15m' | '1h' | '6h' | '24h' | '7d' | '30d';
  
  // Dimensions
  dimensions: Record<string, string>; // JSON object for grouping
  
  // Data quality
  sample_size: number;
  confidence_interval?: number;
  
  computed_at: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - INDEX ON (metric_name, time_bucket)
  // - INDEX ON (time_bucket, time_bucket_size)
}

/**
 * Business Insight - AI-generated insights
 */
export interface BusinessInsightRecord {
  id: string;
  insight_type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  
  // Insight data
  metric_affected: string;
  confidence_score: number; // 0.0 to 1.0
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  
  // Supporting data
  supporting_metrics: Record<string, number>;
  time_period: {
    start: Date;
    end: Date;
  };
  
  // Actionability
  actionable: boolean;
  recommended_actions: string[];
  
  // Lifecycle
  status: 'new' | 'reviewed' | 'implemented' | 'dismissed';
  created_at: Date;
  reviewed_at?: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - INDEX ON (insight_type, impact_level, created_at)
  // - INDEX ON (status, created_at)
}

/**
 * Revenue Tracking - Financial metrics
 */
export interface RevenueTrackingRecord {
  id: string;
  revenue_type: 'subscription' | 'transaction_fee' | 'api_usage' | 'premium_feature';
  
  // Amount in smallest currency unit (e.g., cents, wei)
  amount: string; // BigInt as string
  currency: string;
  
  // Source
  user_id?: string;
  enterprise_client_id?: string;
  
  // Context
  transaction_id?: string;
  description: string;
  
  // Financial period
  recorded_at: Date;
  recognized_at: Date; // Revenue recognition date
  
  // Indexes
  // - PRIMARY KEY (id)
  // - INDEX ON (revenue_type, recognized_at)
  // - INDEX ON (user_id, recorded_at) WHERE user_id IS NOT NULL
}

/**
 * System Health Record - Infrastructure monitoring
 */
export interface SystemHealthRecord {
  id: string;
  service_name: string;
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  
  // Health metrics
  response_time_ms: number;
  error_rate: number; // 0.0 to 1.0
  cpu_usage: number; // 0.0 to 1.0
  memory_usage: number; // 0.0 to 1.0
  
  // Availability
  uptime_percentage: number;
  
  // Dependencies
  dependency_statuses: Record<string, string>; // JSON object
  
  // Alerts
  active_alerts: number;
  alert_details?: string[];
  
  checked_at: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - INDEX ON (service_name, checked_at)
  // - INDEX ON (health_status, checked_at)
}

/**
 * Audit Log Record - Security and compliance auditing
 */
export interface AuditLogRecord {
  id: string;
  event_type: 'data_access' | 'data_modification' | 'user_action' | 'system_event' | 'security_event';
  
  // Actor information
  actor_type: 'user' | 'system' | 'admin' | 'service';
  actor_id: string;
  
  // Target resource
  resource_type: string;
  resource_id: string;
  
  // Action details
  action: string;
  result: 'success' | 'failure' | 'partial';
  
  // Context
  ip_country?: string; // Country only for privacy
  user_agent_hash?: string;
  session_id?: string;
  
  // Metadata
  details: Record<string, any>; // JSON object
  
  // Risk assessment
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  
  timestamp: Date;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - INDEX ON (event_type, timestamp)
  // - INDEX ON (actor_id, timestamp)
  // - INDEX ON (risk_level, timestamp)
}

/**
 * Backup Metadata Record - Disaster recovery tracking
 */
export interface BackupMetadataRecord {
  id: string;
  backup_type: 'full' | 'incremental' | 'logical' | 'snapshot';
  
  // Backup details
  database_name: string;
  backup_size_bytes: number;
  compression_ratio: number;
  
  // Storage location
  storage_provider: string;
  storage_location: string;
  encryption_key_id: string;
  
  // Integrity
  checksum: string;
  verification_status: 'pending' | 'verified' | 'failed';
  
  // Lifecycle
  created_at: Date;
  expires_at: Date;
  restored_at?: Date;
  
  // Recovery metadata
  recovery_time_objective_hours: number;
  recovery_point_objective_hours: number;
  
  // Indexes
  // - PRIMARY KEY (id)
  // - INDEX ON (backup_type, created_at)
  // - INDEX ON (verification_status, created_at)
  // - INDEX ON (expires_at)
}

/**
 * Database Connection Configuration
 */
export interface DatabaseConfig {
  // Primary PostgreSQL connection
  postgres: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    
    // Connection pooling
    maxConnections: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    
    // Read replicas
    readReplicas?: Array<{
      host: string;
      port: number;
      weight: number;
    }>;
  };
  
  // Redis cache layer
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    
    // Cache configuration
    ttl: {
      short: number; // 5 minutes
      medium: number; // 1 hour
      long: number; // 24 hours
    };
    
    // Redis Cluster
    cluster?: Array<{
      host: string;
      port: number;
    }>;
  };
  
  // TimescaleDB for time-series data
  timescale?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    
    // Retention policies
    retentionPolicies: {
      analytics_events: string; // e.g., "90 days"
      performance_metrics: string; // e.g., "1 year"
      audit_logs: string; // e.g., "7 years"
    };
  };
  
  // Encryption configuration
  encryption: {
    keyManagementService: 'aws-kms' | 'azure-key-vault' | 'gcp-kms' | 'hashicorp-vault';
    primaryKeyId: string;
    rotationSchedule: string; // Cron expression
  };
}

/**
 * Database Performance Monitoring
 */
export interface DatabaseMetrics {
  // Connection metrics
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  
  // Query performance
  averageQueryTime: number;
  slowQueries: number;
  queryThroughput: number;
  
  // Cache performance
  cacheHitRatio: number;
  cacheMemoryUsage: number;
  
  // Storage metrics
  databaseSize: number;
  indexSize: number;
  tableScansPerSecond: number;
  indexScansPerSecond: number;
  
  // Replication lag
  replicationLag?: number;
  
  // Health status
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
}