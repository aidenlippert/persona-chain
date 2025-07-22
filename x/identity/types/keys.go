package types

import "time"

const (
	// ModuleName defines the module name
	ModuleName = "identity"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_identity"

	// Version defines the current version of the module
	Version = "1.0.0"

	// DefaultIndex is the default global index
	DefaultIndex uint64 = 1

	// DefaultGenesis time
	DefaultGenesisTime = "2024-01-01T00:00:00Z"
)

// KVStore prefixes for different data types
var (
	// Universal Identity Storage
	UniversalIdentityKey = []byte("universal_identity/") // prefix for universal identities
	DIDToIdentityKey     = []byte("did_to_identity/")    // DID -> identity ID mapping
	IdentityIndexKey     = []byte("identity_index/")     // identity indexing
	
	// Protocol Identity Storage
	ProtocolIdentityKey      = []byte("protocol_identity/")      // protocol-specific identities
	ProtocolIndexKey         = []byte("protocol_index/")         // protocol indexing
	ProtocolMappingKey       = []byte("protocol_mapping/")       // cross-protocol mappings
	
	// Verifiable Credential Storage
	VerifiableCredentialKey  = []byte("verifiable_credential/")  // verifiable credentials
	CredentialIndexKey       = []byte("credential_index/")       // credential indexing
	CredentialStatusKey      = []byte("credential_status/")      // credential status (revocation)
	CredentialSchemaKey      = []byte("credential_schema/")      // credential schemas
	IssuerRegistryKey        = []byte("issuer_registry/")        // authorized issuers
	
	// Zero-Knowledge Proof Storage
	ZKCredentialKey          = []byte("zk_credential/")          // ZK credentials
	ZKProofKey               = []byte("zk_proof/")               // ZK proofs
	CircuitKey               = []byte("circuit/")                // ZK circuits
	VerificationKeyKey       = []byte("verification_key/")      // verification keys
	NullifierKey             = []byte("nullifier/")             // nullifier tracking
	
	// Compliance & Audit Storage
	ComplianceDataKey        = []byte("compliance_data/")       // compliance information
	AuditEntryKey            = []byte("audit_entry/")           // audit trail entries
	AuditResultKey           = []byte("audit_result/")          // audit results
	PolicyKey                = []byte("policy/")                // privacy policies
	ConsentKey               = []byte("consent/")               // user consent records
	
	// Permission & Access Control Storage
	PermissionKey            = []byte("permission/")            // permissions
	RoleKey                  = []byte("role/")                  // roles
	AccessControlKey         = []byte("access_control/")       // access control lists
	DelegationKey            = []byte("delegation/")           // permission delegations
	
	// Enterprise Features Storage
	TenantKey                = []byte("tenant/")                // multi-tenancy
	SubscriptionKey          = []byte("subscription/")         // enterprise subscriptions
	QuotaKey                 = []byte("quota/")                // usage quotas
	FeatureFlagKey           = []byte("feature_flag/")         // feature toggles
	
	// Interoperability Storage
	ProtocolBridgeKey        = []byte("protocol_bridge/")      // protocol bridges
	TranslationRuleKey       = []byte("translation_rule/")     // protocol translation rules
	CrossChainMappingKey     = []byte("cross_chain_mapping/")  // cross-chain mappings
	
	// Security & Monitoring Storage
	SecurityEventKey         = []byte("security_event/")       // security events
	ThreatIntelKey           = []byte("threat_intel/")         // threat intelligence
	RiskAssessmentKey        = []byte("risk_assessment/")      // risk assessments
	AlertKey                 = []byte("alert/")                // security alerts
	
	// Configuration Storage
	ModuleConfigKey          = []byte("module_config/")        // module configuration
	ParameterKey             = []byte("parameter/")            // module parameters
	FeatureConfigKey         = []byte("feature_config/")       // feature configuration
	
	// Metrics & Analytics Storage
	MetricKey                = []byte("metric/")               // performance metrics
	AnalyticsKey             = []byte("analytics/")           // usage analytics
	ReportKey                = []byte("report/")              // generated reports
	
	// Cache & Optimization Storage
	CacheKey                 = []byte("cache/")               // cached data
	IndexCacheKey            = []byte("index_cache/")         // index cache
	QueryCacheKey            = []byte("query_cache/")         // query cache
)

// Composite key builders for complex queries
func GetUniversalIdentityKey(identityID string) []byte {
	return append(UniversalIdentityKey, []byte(identityID)...)
}

func GetDIDToIdentityKey(did string) []byte {
	return append(DIDToIdentityKey, []byte(did)...)
}

func GetProtocolIdentityKey(identityID string, protocol ProtocolType) []byte {
	key := append(ProtocolIdentityKey, []byte(identityID)...)
	key = append(key, []byte("/")...)
	return append(key, []byte(protocol)...)
}

func GetVerifiableCredentialKey(credentialID string) []byte {
	return append(VerifiableCredentialKey, []byte(credentialID)...)
}

func GetCredentialStatusKey(credentialID string) []byte {
	return append(CredentialStatusKey, []byte(credentialID)...)
}

func GetZKCredentialKey(zkCredentialID string) []byte {
	return append(ZKCredentialKey, []byte(zkCredentialID)...)
}

func GetCircuitKey(circuitID string) []byte {
	return append(CircuitKey, []byte(circuitID)...)
}

func GetNullifierKey(nullifier string) []byte {
	return append(NullifierKey, []byte(nullifier)...)
}

func GetComplianceDataKey(identityID string, complianceType string) []byte {
	key := append(ComplianceDataKey, []byte(identityID)...)
	key = append(key, []byte("/")...)
	return append(key, []byte(complianceType)...)
}

func GetAuditEntryKey(auditID string) []byte {
	return append(AuditEntryKey, []byte(auditID)...)
}

func GetPermissionKey(identityID string, permissionID string) []byte {
	key := append(PermissionKey, []byte(identityID)...)
	key = append(key, []byte("/")...)
	return append(key, []byte(permissionID)...)
}

func GetTenantKey(tenantID string) []byte {
	return append(TenantKey, []byte(tenantID)...)
}

func GetSecurityEventKey(eventID string) []byte {
	return append(SecurityEventKey, []byte(eventID)...)
}

// Time-based keys for efficient querying
func GetTimeBasedKey(prefix []byte, timestamp time.Time, suffix string) []byte {
	timeBytes := []byte(timestamp.Format(time.RFC3339))
	key := append(prefix, timeBytes...)
	key = append(key, []byte("/")...)
	return append(key, []byte(suffix)...)
}

// Index keys for efficient lookups
func GetIdentityByCreatorKey(creator string) []byte {
	return append(IdentityIndexKey, []byte("creator/"+creator)...)
}

func GetCredentialByIssuerKey(issuer string) []byte {
	return append(CredentialIndexKey, []byte("issuer/"+issuer)...)
}

func GetCredentialBySubjectKey(subject string) []byte {
	return append(CredentialIndexKey, []byte("subject/"+subject)...)
}

func GetCredentialByTypeKey(credType string) []byte {
	return append(CredentialIndexKey, []byte("type/"+credType)...)
}

func GetZKCredentialByHolderKey(holder string) []byte {
	return append(ZKCredentialKey, []byte("holder/"+holder)...)
}

func GetZKCredentialByCircuitKey(circuitID string) []byte {
	return append(ZKCredentialKey, []byte("circuit/"+circuitID)...)
}

func GetAuditByIdentityKey(identityID string) []byte {
	return append(AuditEntryKey, []byte("identity/"+identityID)...)
}

func GetAuditByActorKey(actor string) []byte {
	return append(AuditEntryKey, []byte("actor/"+actor)...)
}

func GetAuditByActionKey(action string) []byte {
	return append(AuditEntryKey, []byte("action/"+action)...)
}

// Range query helpers
func GetIdentityPrefix() []byte {
	return UniversalIdentityKey
}

func GetCredentialPrefix() []byte {
	return VerifiableCredentialKey
}

func GetZKCredentialPrefix() []byte {
	return ZKCredentialKey
}

func GetAuditPrefix() []byte {
	return AuditEntryKey
}

// Module configuration keys
const (
	// Parameter keys
	ParamKeyMaxIdentitiesPerUser     = "max_identities_per_user"
	ParamKeyMaxCredentialsPerIdentity = "max_credentials_per_identity"
	ParamKeyMaxZKCredentialsPerIdentity = "max_zk_credentials_per_identity"
	ParamKeyCredentialExpirationPeriod = "credential_expiration_period"
	ParamKeyAuditRetentionPeriod     = "audit_retention_period"
	ParamKeyMaxPermissionsPerIdentity = "max_permissions_per_identity"
	
	// Feature flags
	FeatureFlagEnableZKProofs        = "enable_zk_proofs"
	FeatureFlagEnableAuditTrail      = "enable_audit_trail"
	FeatureFlagEnableCompliance      = "enable_compliance"
	FeatureFlagEnableInterop         = "enable_interoperability"
	FeatureFlagEnableEnterprise      = "enable_enterprise_features"
	FeatureFlagEnableEncryption      = "enable_encryption"
	
	// Security settings
	SecurityConfigMinSecurityLevel   = "min_security_level"
	SecurityConfigRequire2FA         = "require_2fa"
	SecurityConfigSessionTimeout     = "session_timeout"
	SecurityConfigMaxLoginAttempts   = "max_login_attempts"
	SecurityConfigPasswordPolicy     = "password_policy"
	
	// Compliance settings
	ComplianceConfigGDPREnabled      = "gdpr_enabled"
	ComplianceConfigCCPAEnabled      = "ccpa_enabled"
	ComplianceConfigHIPAAEnabled     = "hipaa_enabled"
	ComplianceConfigSOXEnabled       = "sox_enabled"
	ComplianceConfigAuditLevel       = "audit_level"
	ComplianceConfigRetentionPeriod  = "retention_period"
	
	// Performance settings
	PerformanceConfigCacheEnabled    = "cache_enabled"
	PerformanceConfigCacheTTL        = "cache_ttl"
	PerformanceConfigMaxQueryResults = "max_query_results"
	PerformanceConfigRateLimit       = "rate_limit"
	PerformanceConfigBatchSize       = "batch_size"
)

// Default parameter values
var DefaultParams = map[string]interface{}{
	ParamKeyMaxIdentitiesPerUser:        10,
	ParamKeyMaxCredentialsPerIdentity:   100,
	ParamKeyMaxZKCredentialsPerIdentity: 50,
	ParamKeyCredentialExpirationPeriod:  365 * 24 * time.Hour, // 1 year
	ParamKeyAuditRetentionPeriod:        7 * 365 * 24 * time.Hour, // 7 years
	ParamKeyMaxPermissionsPerIdentity:   200,
}

// Event attribute keys
const (
	AttributeKeyIdentityID     = "identity_id"
	AttributeKeyDID            = "did"
	AttributeKeyCreator        = "creator"
	AttributeKeyProtocol       = "protocol"
	AttributeKeyCredentialID   = "credential_id"
	AttributeKeyIssuer         = "issuer"
	AttributeKeySubject        = "subject"
	AttributeKeyCredentialType = "credential_type"
	AttributeKeyZKCredentialID = "zk_credential_id"
	AttributeKeyCircuitID      = "circuit_id"
	AttributeKeyPrivacyLevel   = "privacy_level"
	AttributeKeyAuditID        = "audit_id"
	AttributeKeyAuditor        = "auditor"
	AttributeKeyPermissionID   = "permission_id"
	AttributeKeyResource       = "resource"
	AttributeKeyAction         = "action"
	AttributeKeyGrantee        = "grantee"
	AttributeKeyRevoker        = "revoker"
	AttributeKeyReason         = "reason"
	AttributeKeyTimestamp      = "timestamp"
	AttributeKeyRiskScore      = "risk_score"
	AttributeKeyComplianceType = "compliance_type"
	AttributeKeySecurityLevel  = "security_level"
)

// Event types
const (
	EventTypeIdentityCreated      = "identity_created"
	EventTypeIdentityUpdated      = "identity_updated"
	EventTypeProtocolAdded        = "protocol_added"
	EventTypeCredentialIssued     = "credential_issued"
	EventTypeCredentialVerified   = "credential_verified"
	EventTypeCredentialRevoked    = "credential_revoked"
	EventTypeZKCredentialIssued   = "zk_credential_issued"
	EventTypeZKProofVerified      = "zk_proof_verified"
	EventTypeComplianceUpdated    = "compliance_updated"
	EventTypeAuditPerformed       = "audit_performed"
	EventTypePermissionGranted    = "permission_granted"
	EventTypePermissionRevoked    = "permission_revoked"
	EventTypeSecurityAlert        = "security_alert"
	EventTypeThreatDetected       = "threat_detected"
	EventTypeRiskAssessed         = "risk_assessed"
)

// Query paths for REST endpoints
const (
	QueryIdentity          = "identity"
	QueryIdentityByDID     = "identity-by-did"
	QueryCredential        = "credential"
	QueryCredentialStatus  = "credential-status"
	QueryZKCredential      = "zk-credential"
	QueryCircuit           = "circuit"
	QueryCompliance        = "compliance"
	QueryAudit             = "audit"
	QueryPermissions       = "permissions"
	QuerySecurityEvents    = "security-events"
	QueryMetrics           = "metrics"
	QueryHealth            = "health"
)

// API version for client compatibility
const (
	APIVersion = "v1"
	APIPath    = "/persona/identity/" + APIVersion
)