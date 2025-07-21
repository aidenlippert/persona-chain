package types

import (
	"cosmossdk.io/errors"
)

// DID module error codes
const (
	ErrInvalidDIDCodespace = "did"
)

var (
	// Core DID errors
	ErrInvalidDID                = errors.Register(ErrInvalidDIDCodespace, 1001, "invalid DID format")
	ErrDIDNotFound               = errors.Register(ErrInvalidDIDCodespace, 1002, "DID document not found")
	ErrDIDAlreadyExists          = errors.Register(ErrInvalidDIDCodespace, 1003, "DID document already exists")
	ErrUnauthorized              = errors.Register(ErrInvalidDIDCodespace, 1004, "unauthorized operation")
	ErrInvalidController         = errors.Register(ErrInvalidDIDCodespace, 1005, "invalid controller")
	ErrInvalidCreator            = errors.Register(ErrInvalidDIDCodespace, 1006, "invalid creator address")
	
	// Verification method errors
	ErrInvalidVerificationMethod = errors.Register(ErrInvalidDIDCodespace, 1101, "invalid verification method")
	ErrVerificationMethodNotFound = errors.Register(ErrInvalidDIDCodespace, 1102, "verification method not found")
	ErrDuplicateVerificationMethod = errors.Register(ErrInvalidDIDCodespace, 1103, "duplicate verification method")
	ErrInvalidKeyType            = errors.Register(ErrInvalidDIDCodespace, 1104, "invalid key type")
	ErrKeyRevoked                = errors.Register(ErrInvalidDIDCodespace, 1105, "key has been revoked")
	ErrKeyExpired                = errors.Register(ErrInvalidDIDCodespace, 1106, "key has expired")
	
	// Service errors
	ErrInvalidService            = errors.Register(ErrInvalidDIDCodespace, 1201, "invalid service")
	ErrServiceNotFound           = errors.Register(ErrInvalidDIDCodespace, 1202, "service not found")
	ErrDuplicateService          = errors.Register(ErrInvalidDIDCodespace, 1203, "duplicate service")
	ErrInvalidServiceEndpoint    = errors.Register(ErrInvalidDIDCodespace, 1204, "invalid service endpoint")
	
	// Document state errors
	ErrDIDDeactivated            = errors.Register(ErrInvalidDIDCodespace, 1301, "DID document is deactivated")
	ErrDIDRevoked                = errors.Register(ErrInvalidDIDCodespace, 1302, "DID document is revoked")
	ErrDIDSuspended              = errors.Register(ErrInvalidDIDCodespace, 1303, "DID document is suspended")
	ErrInvalidDIDState           = errors.Register(ErrInvalidDIDCodespace, 1304, "invalid DID state transition")
	
	// Version control errors
	ErrInvalidVersion            = errors.Register(ErrInvalidDIDCodespace, 1401, "invalid document version")
	ErrVersionConflict           = errors.Register(ErrInvalidDIDCodespace, 1402, "version conflict detected")
	ErrVersionNotFound           = errors.Register(ErrInvalidDIDCodespace, 1403, "document version not found")
	
	// Guardian and recovery errors
	ErrInvalidGuardian           = errors.Register(ErrInvalidDIDCodespace, 1501, "invalid guardian configuration")
	ErrGuardianNotFound          = errors.Register(ErrInvalidDIDCodespace, 1502, "guardian not found")
	ErrInsufficientGuardians     = errors.Register(ErrInvalidDIDCodespace, 1503, "insufficient guardian approvals")
	ErrRecoveryNotEnabled        = errors.Register(ErrInvalidDIDCodespace, 1504, "recovery is not enabled")
	ErrInvalidRecoveryMethod     = errors.Register(ErrInvalidDIDCodespace, 1505, "invalid recovery method")
	ErrRecoveryThresholdNotMet   = errors.Register(ErrInvalidDIDCodespace, 1506, "recovery threshold not met")
	
	// Cross-chain errors
	ErrCrossChainNotSupported    = errors.Register(ErrInvalidDIDCodespace, 1601, "cross-chain operation not supported")
	ErrInvalidChainID            = errors.Register(ErrInvalidDIDCodespace, 1602, "invalid chain ID")
	ErrCrossChainVerificationFailed = errors.Register(ErrInvalidDIDCodespace, 1603, "cross-chain verification failed")
	
	// Compliance errors
	ErrComplianceViolation       = errors.Register(ErrInvalidDIDCodespace, 1701, "compliance violation detected")
	ErrInvalidRetentionPolicy    = errors.Register(ErrInvalidDIDCodespace, 1702, "invalid retention policy")
	ErrDataResidencyViolation    = errors.Register(ErrInvalidDIDCodespace, 1703, "data residency violation")
	ErrEncryptionRequired        = errors.Register(ErrInvalidDIDCodespace, 1704, "encryption is required")
	ErrAuditRequirementNotMet    = errors.Register(ErrInvalidDIDCodespace, 1705, "audit requirement not met")
	
	// Security errors
	ErrSecurityPolicyViolation   = errors.Register(ErrInvalidDIDCodespace, 1801, "security policy violation")
	ErrInvalidSecurityLevel      = errors.Register(ErrInvalidDIDCodespace, 1802, "invalid security level")
	ErrAccessDenied              = errors.Register(ErrInvalidDIDCodespace, 1803, "access denied")
	ErrRateLimitExceeded         = errors.Register(ErrInvalidDIDCodespace, 1804, "rate limit exceeded")
	ErrInvalidTimeRestriction    = errors.Register(ErrInvalidDIDCodespace, 1805, "time restriction violation")
	ErrGeoRestrictionViolation   = errors.Register(ErrInvalidDIDCodespace, 1806, "geo restriction violation")
	
	// HSM and key management errors
	ErrHSMNotAvailable           = errors.Register(ErrInvalidDIDCodespace, 1901, "HSM is not available")
	ErrHSMKeyGenerationFailed    = errors.Register(ErrInvalidDIDCodespace, 1902, "HSM key generation failed")
	ErrHSMSigningFailed          = errors.Register(ErrInvalidDIDCodespace, 1903, "HSM signing failed")
	ErrKeyBackupFailed           = errors.Register(ErrInvalidDIDCodespace, 1904, "key backup failed")
	ErrKeyRotationRequired       = errors.Register(ErrInvalidDIDCodespace, 1905, "key rotation is required")
	
	// Monitoring and health errors
	ErrHealthCheckFailed         = errors.Register(ErrInvalidDIDCodespace, 2001, "health check failed")
	ErrDependencyUnavailable     = errors.Register(ErrInvalidDIDCodespace, 2002, "dependency is unavailable")
	ErrMonitoringDisabled        = errors.Register(ErrInvalidDIDCodespace, 2003, "monitoring is disabled")
	ErrMetricsCollectionFailed   = errors.Register(ErrInvalidDIDCodespace, 2004, "metrics collection failed")
	
	// IBC and interoperability errors
	ErrIBCChannelNotFound        = errors.Register(ErrInvalidDIDCodespace, 2101, "IBC channel not found")
	ErrIBCPacketTimeout          = errors.Register(ErrInvalidDIDCodespace, 2102, "IBC packet timeout")
	ErrIBCVerificationFailed     = errors.Register(ErrInvalidDIDCodespace, 2103, "IBC verification failed")
	ErrUnsupportedIBCVersion     = errors.Register(ErrInvalidDIDCodespace, 2104, "unsupported IBC version")
	ErrInvalidPacketType         = errors.Register(ErrInvalidDIDCodespace, 2105, "invalid packet type")
	ErrEmptyPacketData           = errors.Register(ErrInvalidDIDCodespace, 2106, "empty packet data")
	ErrPacketDataTooLarge        = errors.Register(ErrInvalidDIDCodespace, 2107, "packet data too large")
	ErrChannelNotFound           = errors.Register(ErrInvalidDIDCodespace, 2108, "channel not found")
	ErrInvalidPort               = errors.Register(ErrInvalidDIDCodespace, 2109, "invalid port")
	ErrInvalidChannelOrder       = errors.Register(ErrInvalidDIDCodespace, 2110, "invalid channel order")
	ErrInvalidConnectionHops     = errors.Register(ErrInvalidDIDCodespace, 2111, "invalid connection hops")
	ErrUnsupportedVersion        = errors.Register(ErrInvalidDIDCodespace, 2112, "unsupported version")
	
	// Batch operation errors
	ErrBatchOperationFailed      = errors.Register(ErrInvalidDIDCodespace, 2201, "batch operation failed")
	ErrPartialBatchSuccess       = errors.Register(ErrInvalidDIDCodespace, 2202, "partial batch success")
	ErrBatchSizeExceeded         = errors.Register(ErrInvalidDIDCodespace, 2203, "batch size exceeded")
	
	// Configuration errors
	ErrInvalidConfiguration      = errors.Register(ErrInvalidDIDCodespace, 2301, "invalid configuration")
	ErrConfigurationNotFound     = errors.Register(ErrInvalidDIDCodespace, 2302, "configuration not found")
	ErrConfigurationLocked       = errors.Register(ErrInvalidDIDCodespace, 2303, "configuration is locked")
	
	// Enterprise feature errors
	ErrFeatureNotEnabled         = errors.Register(ErrInvalidDIDCodespace, 2401, "feature is not enabled")
	ErrLicenseExpired            = errors.Register(ErrInvalidDIDCodespace, 2402, "license has expired")
	ErrQuotaExceeded             = errors.Register(ErrInvalidDIDCodespace, 2403, "quota exceeded")
	ErrInvalidLicense            = errors.Register(ErrInvalidDIDCodespace, 2404, "invalid license")
	
	// Integration errors
	ErrExternalServiceUnavailable = errors.Register(ErrInvalidDIDCodespace, 2501, "external service unavailable")
	ErrAPICallFailed             = errors.Register(ErrInvalidDIDCodespace, 2502, "API call failed")
	ErrInvalidAPIResponse        = errors.Register(ErrInvalidDIDCodespace, 2503, "invalid API response")
	ErrAuthenticationFailed      = errors.Register(ErrInvalidDIDCodespace, 2504, "authentication failed")
	ErrAuthorizationFailed       = errors.Register(ErrInvalidDIDCodespace, 2505, "authorization failed")
)

// Error categories for better error handling
type ErrorCategory string

const (
	ErrorCategoryValidation    ErrorCategory = "validation"
	ErrorCategoryAuthorization ErrorCategory = "authorization"
	ErrorCategoryNotFound      ErrorCategory = "not_found"
	ErrorCategoryConflict      ErrorCategory = "conflict"
	ErrorCategoryInternal      ErrorCategory = "internal"
	ErrorCategorySecurity      ErrorCategory = "security"
	ErrorCategoryCompliance    ErrorCategory = "compliance"
	ErrorCategoryNetwork       ErrorCategory = "network"
	ErrorCategoryConfiguration ErrorCategory = "configuration"
	ErrorCategoryLicense       ErrorCategory = "license"
)

// GetErrorCategory returns the category of an error for better handling
func GetErrorCategory(err error) ErrorCategory {
	switch {
	case errors.IsOf(err, ErrInvalidDID, ErrInvalidVerificationMethod, ErrInvalidService, ErrInvalidVersion):
		return ErrorCategoryValidation
	case errors.IsOf(err, ErrUnauthorized, ErrAccessDenied, ErrAuthenticationFailed, ErrAuthorizationFailed):
		return ErrorCategoryAuthorization
	case errors.IsOf(err, ErrDIDNotFound, ErrVerificationMethodNotFound, ErrServiceNotFound):
		return ErrorCategoryNotFound
	case errors.IsOf(err, ErrDIDAlreadyExists, ErrDuplicateVerificationMethod, ErrVersionConflict):
		return ErrorCategoryConflict
	case errors.IsOf(err, ErrSecurityPolicyViolation, ErrRateLimitExceeded, ErrInvalidSecurityLevel):
		return ErrorCategorySecurity
	case errors.IsOf(err, ErrComplianceViolation, ErrDataResidencyViolation, ErrAuditRequirementNotMet):
		return ErrorCategoryCompliance
	case errors.IsOf(err, ErrIBCChannelNotFound, ErrIBCPacketTimeout, ErrExternalServiceUnavailable):
		return ErrorCategoryNetwork
	case errors.IsOf(err, ErrInvalidConfiguration, ErrConfigurationNotFound, ErrFeatureNotEnabled):
		return ErrorCategoryConfiguration
	case errors.IsOf(err, ErrLicenseExpired, ErrInvalidLicense, ErrQuotaExceeded):
		return ErrorCategoryLicense
	default:
		return ErrorCategoryInternal
	}
}

// IsRecoverableError determines if an error is recoverable
func IsRecoverableError(err error) bool {
	category := GetErrorCategory(err)
	switch category {
	case ErrorCategoryNetwork, ErrorCategoryInternal:
		return true
	case ErrorCategoryValidation, ErrorCategoryAuthorization, ErrorCategoryNotFound, ErrorCategoryConflict:
		return false
	default:
		return false
	}
}

// GetErrorSeverity returns the severity level of an error
func GetErrorSeverity(err error) string {
	switch GetErrorCategory(err) {
	case ErrorCategorySecurity, ErrorCategoryCompliance:
		return "critical"
	case ErrorCategoryAuthorization, ErrorCategoryLicense:
		return "high"
	case ErrorCategoryValidation, ErrorCategoryConflict:
		return "medium"
	case ErrorCategoryNotFound, ErrorCategoryConfiguration:
		return "low"
	default:
		return "medium"
	}
}