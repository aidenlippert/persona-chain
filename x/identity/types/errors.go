package types

import (
	errorsmod "cosmossdk.io/errors"
)

// Identity module errors
var (
	// Universal Identity Errors
	ErrInvalidIdentityID     = errorsmod.Register(ModuleName, 1001, "invalid identity ID")
	ErrInvalidDID            = errorsmod.Register(ModuleName, 1002, "invalid DID")
	ErrIdentityNotFound      = errorsmod.Register(ModuleName, 1003, "identity not found")
	ErrIdentityAlreadyExists = errorsmod.Register(ModuleName, 1004, "identity already exists")
	ErrIdentityInactive      = errorsmod.Register(ModuleName, 1005, "identity is inactive")
	
	// Protocol Identity Errors
	ErrInvalidProtocol         = errorsmod.Register(ModuleName, 1101, "invalid protocol type")
	ErrInvalidIdentifier       = errorsmod.Register(ModuleName, 1102, "invalid protocol identifier")
	ErrNoProtocolsConfigured   = errorsmod.Register(ModuleName, 1103, "no protocols configured for identity")
	ErrProtocolAlreadyExists   = errorsmod.Register(ModuleName, 1104, "protocol identity already exists")
	ErrProtocolNotFound        = errorsmod.Register(ModuleName, 1105, "protocol identity not found")
	ErrProtocolNotSupported    = errorsmod.Register(ModuleName, 1106, "protocol not supported")
	
	// Verifiable Credential Errors
	ErrInvalidVCContext        = errorsmod.Register(ModuleName, 1201, "invalid verifiable credential context")
	ErrInvalidVCType           = errorsmod.Register(ModuleName, 1202, "invalid verifiable credential type")
	ErrInvalidVCID             = errorsmod.Register(ModuleName, 1203, "invalid verifiable credential ID")
	ErrInvalidVCIssuer         = errorsmod.Register(ModuleName, 1204, "invalid verifiable credential issuer")
	ErrCredentialNotFound      = errorsmod.Register(ModuleName, 1205, "verifiable credential not found")
	ErrCredentialExpired       = errorsmod.Register(ModuleName, 1206, "verifiable credential has expired")
	ErrCredentialRevoked       = errorsmod.Register(ModuleName, 1207, "verifiable credential has been revoked")
	ErrCredentialNotVerified   = errorsmod.Register(ModuleName, 1208, "verifiable credential verification failed")
	ErrInvalidCredentialProof  = errorsmod.Register(ModuleName, 1209, "invalid credential proof")
	ErrUnauthorizedIssuer      = errorsmod.Register(ModuleName, 1210, "unauthorized credential issuer")
	
	// Zero-Knowledge Proof Errors
	ErrInvalidZKProof          = errorsmod.Register(ModuleName, 1301, "invalid zero-knowledge proof")
	ErrZKProofVerificationFailed = errorsmod.Register(ModuleName, 1302, "zero-knowledge proof verification failed")
	ErrInvalidCircuitID        = errorsmod.Register(ModuleName, 1303, "invalid circuit ID")
	ErrCircuitNotFound         = errorsmod.Register(ModuleName, 1304, "circuit not found")
	ErrInvalidPublicInputs     = errorsmod.Register(ModuleName, 1305, "invalid public inputs")
	ErrInvalidPrivacyParams    = errorsmod.Register(ModuleName, 1306, "invalid privacy parameters")
	ErrZKCredentialNotFound    = errorsmod.Register(ModuleName, 1307, "zero-knowledge credential not found")
	ErrInvalidNullifier        = errorsmod.Register(ModuleName, 1308, "invalid nullifier")
	ErrNullifierAlreadyUsed    = errorsmod.Register(ModuleName, 1309, "nullifier already used")
	
	// Compliance Errors
	ErrInvalidComplianceType   = errorsmod.Register(ModuleName, 1401, "invalid compliance type")
	ErrComplianceDataNotFound  = errorsmod.Register(ModuleName, 1402, "compliance data not found")
	ErrGDPRComplianceViolation = errorsmod.Register(ModuleName, 1403, "GDPR compliance violation")
	ErrCCPAComplianceViolation = errorsmod.Register(ModuleName, 1404, "CCPA compliance violation")
	ErrHIPAAComplianceViolation = errorsmod.Register(ModuleName, 1405, "HIPAA compliance violation")
	ErrSOXComplianceViolation  = errorsmod.Register(ModuleName, 1406, "SOX compliance violation")
	ErrAuditFailed             = errorsmod.Register(ModuleName, 1407, "compliance audit failed")
	ErrInsufficientConsent     = errorsmod.Register(ModuleName, 1408, "insufficient user consent")
	ErrDataRetentionViolation  = errorsmod.Register(ModuleName, 1409, "data retention policy violation")
	
	// Permission Errors
	ErrInvalidPermission       = errorsmod.Register(ModuleName, 1501, "invalid permission")
	ErrPermissionNotFound      = errorsmod.Register(ModuleName, 1502, "permission not found")
	ErrPermissionDenied        = errorsmod.Register(ModuleName, 1503, "permission denied")
	ErrInsufficientPermissions = errorsmod.Register(ModuleName, 1504, "insufficient permissions")
	ErrPermissionExpired       = errorsmod.Register(ModuleName, 1505, "permission has expired")
	ErrCircularPermission      = errorsmod.Register(ModuleName, 1506, "circular permission dependency")
	ErrInvalidPermissionScope  = errorsmod.Register(ModuleName, 1507, "invalid permission scope")
	
	// Security Errors
	ErrInsufficientSecurityLevel = errorsmod.Register(ModuleName, 1601, "insufficient security level")
	ErrEncryptionFailed          = errorsmod.Register(ModuleName, 1602, "encryption failed")
	ErrDecryptionFailed          = errorsmod.Register(ModuleName, 1603, "decryption failed")
	ErrInvalidSignature          = errorsmod.Register(ModuleName, 1604, "invalid signature")
	ErrKeyNotFound               = errorsmod.Register(ModuleName, 1605, "cryptographic key not found")
	ErrInvalidKeyFormat          = errorsmod.Register(ModuleName, 1606, "invalid key format")
	ErrSecurityPolicyViolation   = errorsmod.Register(ModuleName, 1607, "security policy violation")
	ErrThreatDetected            = errorsmod.Register(ModuleName, 1608, "security threat detected")
	
	// Audit & Monitoring Errors
	ErrAuditLogFailed          = errorsmod.Register(ModuleName, 1701, "audit log failed")
	ErrInvalidAuditEntry       = errorsmod.Register(ModuleName, 1702, "invalid audit entry")
	ErrAuditTrailCorrupted     = errorsmod.Register(ModuleName, 1703, "audit trail corrupted")
	ErrMonitoringFailed        = errorsmod.Register(ModuleName, 1704, "monitoring failed")
	ErrRiskThresholdExceeded   = errorsmod.Register(ModuleName, 1705, "risk threshold exceeded")
	
	// Interoperability Errors
	ErrProtocolMismatch        = errorsmod.Register(ModuleName, 1801, "protocol mismatch")
	ErrInvalidDataFormat       = errorsmod.Register(ModuleName, 1802, "invalid data format")
	ErrTranslationFailed       = errorsmod.Register(ModuleName, 1803, "protocol translation failed")
	ErrBridgeNotAvailable      = errorsmod.Register(ModuleName, 1804, "interoperability bridge not available")
	ErrCrossChainFailed        = errorsmod.Register(ModuleName, 1805, "cross-chain operation failed")
	
	// Enterprise Feature Errors
	ErrTenantNotFound          = errorsmod.Register(ModuleName, 1901, "tenant not found")
	ErrTenantIsolationViolation = errorsmod.Register(ModuleName, 1902, "tenant isolation violation")
	ErrFeatureNotAvailable     = errorsmod.Register(ModuleName, 1903, "enterprise feature not available")
	ErrLicenseExpired          = errorsmod.Register(ModuleName, 1904, "enterprise license expired")
	ErrQuotaExceeded           = errorsmod.Register(ModuleName, 1905, "usage quota exceeded")
	ErrSLAViolation            = errorsmod.Register(ModuleName, 1906, "SLA violation detected")
	
	// Privacy Errors
	ErrPrivacyPolicyViolation  = errorsmod.Register(ModuleName, 2001, "privacy policy violation")
	ErrDataMinimizationFailed  = errorsmod.Register(ModuleName, 2002, "data minimization failed")
	ErrPurposeLimitationViolation = errorsmod.Register(ModuleName, 2003, "purpose limitation violation")
	ErrConsentWithdrawn        = errorsmod.Register(ModuleName, 2004, "user consent withdrawn")
	ErrAnonymizationFailed     = errorsmod.Register(ModuleName, 2005, "data anonymization failed")
	ErrSelectiveDisclosureFailed = errorsmod.Register(ModuleName, 2006, "selective disclosure failed")
	
	// Integration Errors
	ErrExternalAPIFailed       = errorsmod.Register(ModuleName, 2101, "external API call failed")
	ErrRateLimitExceeded       = errorsmod.Register(ModuleName, 2102, "rate limit exceeded")
	ErrTimeoutError            = errorsmod.Register(ModuleName, 2103, "operation timeout")
	ErrCircuitBreakerOpen      = errorsmod.Register(ModuleName, 2104, "circuit breaker open")
	ErrServiceUnavailable      = errorsmod.Register(ModuleName, 2105, "service unavailable")
	
	// Configuration Errors
	ErrInvalidConfiguration    = errorsmod.Register(ModuleName, 2201, "invalid configuration")
	ErrMissingConfiguration    = errorsmod.Register(ModuleName, 2202, "missing required configuration")
	ErrConfigurationMismatch   = errorsmod.Register(ModuleName, 2203, "configuration mismatch")
	
	// Generic Errors
	ErrInternalError           = errorsmod.Register(ModuleName, 9999, "internal error")
)

// Error severity levels for monitoring and alerting
type ErrorSeverity string

const (
	ErrorSeverityLow      ErrorSeverity = "low"
	ErrorSeverityMedium   ErrorSeverity = "medium"
	ErrorSeverityHigh     ErrorSeverity = "high"
	ErrorSeverityCritical ErrorSeverity = "critical"
)

// Error categories for classification and handling
type ErrorCategory string

const (
	ErrorCategoryValidation     ErrorCategory = "validation"
	ErrorCategorySecurity       ErrorCategory = "security"
	ErrorCategoryCompliance     ErrorCategory = "compliance"
	ErrorCategoryPermission     ErrorCategory = "permission"
	ErrorCategoryInterop        ErrorCategory = "interoperability"
	ErrorCategoryIntegration    ErrorCategory = "integration"
	ErrorCategoryConfiguration  ErrorCategory = "configuration"
	ErrorCategoryInternal       ErrorCategory = "internal"
)

// EnhancedError provides additional context for error handling
type EnhancedError struct {
	Code        uint32        `json:"code"`
	Message     string        `json:"message"`
	Severity    ErrorSeverity `json:"severity"`
	Category    ErrorCategory `json:"category"`
	Component   string        `json:"component,omitempty"`
	Operation   string        `json:"operation,omitempty"`
	UserID      string        `json:"user_id,omitempty"`
	IdentityID  string        `json:"identity_id,omitempty"`
	Timestamp   int64         `json:"timestamp"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	Remediation string        `json:"remediation,omitempty"`
}

// NewEnhancedError creates a new enhanced error with context
func NewEnhancedError(
	err error,
	severity ErrorSeverity,
	category ErrorCategory,
	component, operation string,
	metadata map[string]interface{},
) *EnhancedError {
	return &EnhancedError{
		Code:      0, // Will be extracted from err if it's a cosmos error
		Message:   err.Error(),
		Severity:  severity,
		Category:  category,
		Component: component,
		Operation: operation,
		Timestamp: time.Now().Unix(),
		Metadata:  metadata,
	}
}

// Error implements the error interface
func (e *EnhancedError) Error() string {
	return e.Message
}

// IsRetryable determines if an error is retryable
func (e *EnhancedError) IsRetryable() bool {
	switch e.Category {
	case ErrorCategoryIntegration, ErrorCategoryInternal:
		return true
	case ErrorCategoryValidation, ErrorCategoryPermission:
		return false
	default:
		return e.Severity == ErrorSeverityLow || e.Severity == ErrorSeverityMedium
	}
}

// GetRemediation provides suggested remediation steps
func (e *EnhancedError) GetRemediation() string {
	if e.Remediation != "" {
		return e.Remediation
	}

	// Provide default remediation based on category
	switch e.Category {
	case ErrorCategoryValidation:
		return "Check input parameters and retry with valid data"
	case ErrorCategorySecurity:
		return "Review security configuration and authentication"
	case ErrorCategoryCompliance:
		return "Ensure compliance requirements are met"
	case ErrorCategoryPermission:
		return "Verify user permissions and access rights"
	case ErrorCategoryInterop:
		return "Check protocol compatibility and configuration"
	case ErrorCategoryIntegration:
		return "Verify external service availability and retry"
	case ErrorCategoryConfiguration:
		return "Review system configuration and update if necessary"
	default:
		return "Contact system administrator for assistance"
	}
}

// Error mapping for common error patterns
var ErrorMap = map[string]*EnhancedError{
	"identity_not_found": {
		Code:        1003,
		Message:     "Identity not found",
		Severity:    ErrorSeverityMedium,
		Category:    ErrorCategoryValidation,
		Remediation: "Verify the identity ID exists and is accessible",
	},
	"insufficient_permissions": {
		Code:        1504,
		Message:     "Insufficient permissions for this operation",
		Severity:    ErrorSeverityHigh,
		Category:    ErrorCategoryPermission,
		Remediation: "Request appropriate permissions from identity owner",
	},
	"credential_expired": {
		Code:        1206,
		Message:     "Verifiable credential has expired",
		Severity:    ErrorSeverityMedium,
		Category:    ErrorCategoryValidation,
		Remediation: "Request a new credential from the issuer",
	},
	"zk_proof_failed": {
		Code:        1302,
		Message:     "Zero-knowledge proof verification failed",
		Severity:    ErrorSeverityHigh,
		Category:    ErrorCategorySecurity,
		Remediation: "Regenerate proof with correct parameters",
	},
	"compliance_violation": {
		Code:        1403,
		Message:     "Compliance policy violation detected",
		Severity:    ErrorSeverityCritical,
		Category:    ErrorCategoryCompliance,
		Remediation: "Review compliance requirements and update data handling",
	},
}