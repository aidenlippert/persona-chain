package types

import (
	"fmt"
	"time"
	
	"cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// W3C DID Document structure with enterprise extensions
type DIDDocument struct {
	Context              []string              `json:"@context" yaml:"@context"`
	ID                   string                `json:"id" yaml:"id"`
	Controller           []string              `json:"controller,omitempty" yaml:"controller,omitempty"`
	VerificationMethod   []VerificationMethod  `json:"verificationMethod,omitempty" yaml:"verificationMethod,omitempty"`
	Authentication       []string              `json:"authentication,omitempty" yaml:"authentication,omitempty"`
	AssertionMethod      []string              `json:"assertionMethod,omitempty" yaml:"assertionMethod,omitempty"`
	KeyAgreement         []string              `json:"keyAgreement,omitempty" yaml:"keyAgreement,omitempty"`
	CapabilityInvocation []string              `json:"capabilityInvocation,omitempty" yaml:"capabilityInvocation,omitempty"`
	CapabilityDelegation []string              `json:"capabilityDelegation,omitempty" yaml:"capabilityDelegation,omitempty"`
	Service              []Service             `json:"service,omitempty" yaml:"service,omitempty"`
	
	// Enterprise extensions
	Metadata      DIDMetadata    `json:"metadata" yaml:"metadata"`
	Status        DIDStatus      `json:"status" yaml:"status"`
	Compliance    Compliance     `json:"compliance" yaml:"compliance"`
	Recovery      RecoveryConfig `json:"recovery" yaml:"recovery"`
	Guardian      GuardianConfig `json:"guardian,omitempty" yaml:"guardian,omitempty"`
	
	// Blockchain metadata
	Creator       string    `json:"creator" yaml:"creator"`
	CreatedAt     time.Time `json:"createdAt" yaml:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt" yaml:"updatedAt"`
	Version       uint64    `json:"version" yaml:"version"`
	ChainID       string    `json:"chainId" yaml:"chainId"`
	BlockHeight   int64     `json:"blockHeight" yaml:"blockHeight"`
	TxHash        string    `json:"txHash" yaml:"txHash"`
}

// VerificationMethod represents a cryptographic verification method
type VerificationMethod struct {
	ID                 string            `json:"id" yaml:"id"`
	Type               string            `json:"type" yaml:"type"`
	Controller         string            `json:"controller" yaml:"controller"`
	PublicKeyMultibase string            `json:"publicKeyMultibase,omitempty" yaml:"publicKeyMultibase,omitempty"`
	PublicKeyJwk       map[string]string `json:"publicKeyJwk,omitempty" yaml:"publicKeyJwk,omitempty"`
	
	// Enterprise features
	Capabilities       []string          `json:"capabilities,omitempty" yaml:"capabilities,omitempty"`
	SecurityLevel      SecurityLevel     `json:"securityLevel" yaml:"securityLevel"`
	HSMBacked          bool              `json:"hsmBacked" yaml:"hsmBacked"`
	CreatedAt          time.Time         `json:"createdAt" yaml:"createdAt"`
	ExpiresAt          *time.Time        `json:"expiresAt,omitempty" yaml:"expiresAt,omitempty"`
	Revoked            bool              `json:"revoked" yaml:"revoked"`
	RevokedAt          *time.Time        `json:"revokedAt,omitempty" yaml:"revokedAt,omitempty"`
}

// Service represents a service endpoint
type Service struct {
	ID              string            `json:"id" yaml:"id"`
	Type            string            `json:"type" yaml:"type"`
	ServiceEndpoint string            `json:"serviceEndpoint" yaml:"serviceEndpoint"`
	Description     string            `json:"description,omitempty" yaml:"description,omitempty"`
	
	// Enterprise features
	SecurityPolicy  SecurityPolicy    `json:"securityPolicy" yaml:"securityPolicy"`
	AccessControl   AccessControl     `json:"accessControl" yaml:"accessControl"`
	Monitoring      MonitoringConfig  `json:"monitoring" yaml:"monitoring"`
	Compliance      ServiceCompliance `json:"compliance" yaml:"compliance"`
}

// DIDMetadata contains document metadata
type DIDMetadata struct {
	Created           time.Time         `json:"created" yaml:"created"`
	Updated           time.Time         `json:"updated" yaml:"updated"`
	VersionID         string            `json:"versionId" yaml:"versionId"`
	NextUpdate        *time.Time        `json:"nextUpdate,omitempty" yaml:"nextUpdate,omitempty"`
	Deactivated       bool              `json:"deactivated" yaml:"deactivated"`
	DeactivatedAt     *time.Time        `json:"deactivatedAt,omitempty" yaml:"deactivatedAt,omitempty"`
	
	// Enterprise metadata
	Tags              []string          `json:"tags,omitempty" yaml:"tags,omitempty"`
	Category          string            `json:"category,omitempty" yaml:"category,omitempty"`
	OrganizationID    string            `json:"organizationId,omitempty" yaml:"organizationId,omitempty"`
	BusinessUnit      string            `json:"businessUnit,omitempty" yaml:"businessUnit,omitempty"`
	Environment       string            `json:"environment" yaml:"environment"` // dev, staging, prod
	CriticalityLevel  CriticalityLevel  `json:"criticalityLevel" yaml:"criticalityLevel"`
}

// DIDStatus represents the current status of a DID
type DIDStatus struct {
	State         DIDState  `json:"state" yaml:"state"`
	Reason        string    `json:"reason,omitempty" yaml:"reason,omitempty"`
	UpdatedAt     time.Time `json:"updatedAt" yaml:"updatedAt"`
	UpdatedBy     string    `json:"updatedBy" yaml:"updatedBy"`
	HealthCheck   HealthCheck `json:"healthCheck" yaml:"healthCheck"`
}

// Compliance information for regulatory requirements
type Compliance struct {
	Framework         []string          `json:"framework" yaml:"framework"` // GDPR, SOX, HIPAA, etc.
	Classifications   []string          `json:"classifications" yaml:"classifications"`
	RetentionPolicy   RetentionPolicy   `json:"retentionPolicy" yaml:"retentionPolicy"`
	AuditRequirements AuditRequirements `json:"auditRequirements" yaml:"auditRequirements"`
	DataResidency     DataResidency     `json:"dataResidency" yaml:"dataResidency"`
	EncryptionPolicy  EncryptionPolicy  `json:"encryptionPolicy" yaml:"encryptionPolicy"`
}

// RecoveryConfig defines disaster recovery settings
type RecoveryConfig struct {
	Enabled           bool              `json:"enabled" yaml:"enabled"`
	Threshold         uint32            `json:"threshold" yaml:"threshold"`
	RecoveryMethods   []RecoveryMethod  `json:"recoveryMethods" yaml:"recoveryMethods"`
	BackupStrategy    BackupStrategy    `json:"backupStrategy" yaml:"backupStrategy"`
	TestSchedule      TestSchedule      `json:"testSchedule" yaml:"testSchedule"`
}

// GuardianConfig for multi-party control
type GuardianConfig struct {
	Enabled           bool              `json:"enabled" yaml:"enabled"`
	Guardians         []Guardian        `json:"guardians" yaml:"guardians"`
	Threshold         uint32            `json:"threshold" yaml:"threshold"`
	ApprovalPolicy    ApprovalPolicy    `json:"approvalPolicy" yaml:"approvalPolicy"`
	EmergencyContacts []EmergencyContact `json:"emergencyContacts" yaml:"emergencyContacts"`
}

// Enums and supporting types
type SecurityLevel string
const (
	SecurityLevelBasic    SecurityLevel = "basic"
	SecurityLevelStandard SecurityLevel = "standard"
	SecurityLevelHigh     SecurityLevel = "high"
	SecurityLevelCritical SecurityLevel = "critical"
)

type DIDState string
const (
	DIDStateActive      DIDState = "active"
	DIDStateInactive    DIDState = "inactive"
	DIDStateSuspended   DIDState = "suspended"
	DIDStateRevoked     DIDState = "revoked"
	DIDStateRecovering  DIDState = "recovering"
	DIDStateMigrating   DIDState = "migrating"
)

type CriticalityLevel string
const (
	CriticalityLow      CriticalityLevel = "low"
	CriticalityMedium   CriticalityLevel = "medium"
	CriticalityHigh     CriticalityLevel = "high"
	CriticalityCritical CriticalityLevel = "critical"
)

// Supporting structures
type SecurityPolicy struct {
	EncryptionRequired bool              `json:"encryptionRequired" yaml:"encryptionRequired"`
	MinTLSVersion      string            `json:"minTlsVersion" yaml:"minTlsVersion"`
	AllowedCiphers     []string          `json:"allowedCiphers" yaml:"allowedCiphers"`
	RequiredHeaders    map[string]string `json:"requiredHeaders" yaml:"requiredHeaders"`
	RateLimits         RateLimits        `json:"rateLimits" yaml:"rateLimits"`
}

type AccessControl struct {
	RequiredRoles      []string          `json:"requiredRoles" yaml:"requiredRoles"`
	AllowedOrigins     []string          `json:"allowedOrigins" yaml:"allowedOrigins"`
	IPWhitelist        []string          `json:"ipWhitelist" yaml:"ipWhitelist"`
	GeoRestrictions    []string          `json:"geoRestrictions" yaml:"geoRestrictions"`
	TimeRestrictions   TimeRestrictions  `json:"timeRestrictions" yaml:"timeRestrictions"`
}

type MonitoringConfig struct {
	Enabled            bool              `json:"enabled" yaml:"enabled"`
	MetricsEndpoint    string            `json:"metricsEndpoint" yaml:"metricsEndpoint"`
	HealthEndpoint     string            `json:"healthEndpoint" yaml:"healthEndpoint"`
	AlertingRules      []AlertRule       `json:"alertingRules" yaml:"alertingRules"`
	LoggingLevel       string            `json:"loggingLevel" yaml:"loggingLevel"`
}

type ServiceCompliance struct {
	DataProcessing     DataProcessing    `json:"dataProcessing" yaml:"dataProcessing"`
	Certifications     []string          `json:"certifications" yaml:"certifications"`
	ComplianceChecks   []ComplianceCheck `json:"complianceChecks" yaml:"complianceChecks"`
}

type HealthCheck struct {
	Status             string            `json:"status" yaml:"status"`
	LastChecked        time.Time         `json:"lastChecked" yaml:"lastChecked"`
	ResponseTime       int64             `json:"responseTime" yaml:"responseTime"` // milliseconds
	Errors             []string          `json:"errors,omitempty" yaml:"errors,omitempty"`
	Dependencies       []DependencyCheck `json:"dependencies" yaml:"dependencies"`
}

type RetentionPolicy struct {
	RetentionPeriod    int               `json:"retentionPeriod" yaml:"retentionPeriod"` // days
	AutoDelete         bool              `json:"autoDelete" yaml:"autoDelete"`
	ArchiveStrategy    string            `json:"archiveStrategy" yaml:"archiveStrategy"`
}

type AuditRequirements struct {
	LogAllAccess       bool              `json:"logAllAccess" yaml:"logAllAccess"`
	RetainLogs         int               `json:"retainLogs" yaml:"retainLogs"` // days
	ComplianceReports  []string          `json:"complianceReports" yaml:"complianceReports"`
}

type DataResidency struct {
	AllowedRegions     []string          `json:"allowedRegions" yaml:"allowedRegions"`
	ProhibitedRegions  []string          `json:"prohibitedRegions" yaml:"prohibitedRegions"`
	CrossBorderRules   CrossBorderRules  `json:"crossBorderRules" yaml:"crossBorderRules"`
}

type EncryptionPolicy struct {
	Required           bool              `json:"required" yaml:"required"`
	Algorithm          string            `json:"algorithm" yaml:"algorithm"`
	KeyLength          int               `json:"keyLength" yaml:"keyLength"`
	RotationPeriod     int               `json:"rotationPeriod" yaml:"rotationPeriod"` // days
}

type RecoveryMethod struct {
	Type               string            `json:"type" yaml:"type"`
	Identifier         string            `json:"identifier" yaml:"identifier"`
	Priority           int               `json:"priority" yaml:"priority"`
	RequiredApprovals  int               `json:"requiredApprovals" yaml:"requiredApprovals"`
}

type BackupStrategy struct {
	Frequency          string            `json:"frequency" yaml:"frequency"`
	Retention          int               `json:"retention" yaml:"retention"` // days
	Encryption         bool              `json:"encryption" yaml:"encryption"`
	OffSiteBackup      bool              `json:"offSiteBackup" yaml:"offSiteBackup"`
}

type TestSchedule struct {
	Frequency          string            `json:"frequency" yaml:"frequency"`
	LastTest           time.Time         `json:"lastTest" yaml:"lastTest"`
	NextTest           time.Time         `json:"nextTest" yaml:"nextTest"`
	TestResults        []TestResult      `json:"testResults" yaml:"testResults"`
}

type Guardian struct {
	ID                 string            `json:"id" yaml:"id"`
	Name               string            `json:"name" yaml:"name"`
	PublicKey          string            `json:"publicKey" yaml:"publicKey"`
	ContactInfo        ContactInfo       `json:"contactInfo" yaml:"contactInfo"`
	Role               string            `json:"role" yaml:"role"`
	Priority           int               `json:"priority" yaml:"priority"`
}

type ApprovalPolicy struct {
	RequiredApprovals  int               `json:"requiredApprovals" yaml:"requiredApprovals"`
	TimeoutPeriod      int               `json:"timeoutPeriod" yaml:"timeoutPeriod"` // hours
	AutoApprovalRules  []AutoApprovalRule `json:"autoApprovalRules" yaml:"autoApprovalRules"`
}

type EmergencyContact struct {
	Name               string            `json:"name" yaml:"name"`
	Role               string            `json:"role" yaml:"role"`
	Contact            ContactInfo       `json:"contact" yaml:"contact"`
	Availability       Availability      `json:"availability" yaml:"availability"`
}

// Additional supporting types
type RateLimits struct {
	RequestsPerMinute  int               `json:"requestsPerMinute" yaml:"requestsPerMinute"`
	RequestsPerHour    int               `json:"requestsPerHour" yaml:"requestsPerHour"`
	RequestsPerDay     int               `json:"requestsPerDay" yaml:"requestsPerDay"`
	BurstLimit         int               `json:"burstLimit" yaml:"burstLimit"`
}

type TimeRestrictions struct {
	AllowedHours       []int             `json:"allowedHours" yaml:"allowedHours"`
	AllowedDays        []string          `json:"allowedDays" yaml:"allowedDays"`
	Timezone           string            `json:"timezone" yaml:"timezone"`
}

type AlertRule struct {
	Name               string            `json:"name" yaml:"name"`
	Condition          string            `json:"condition" yaml:"condition"`
	Threshold          float64           `json:"threshold" yaml:"threshold"`
	Action             string            `json:"action" yaml:"action"`
}

type DataProcessing struct {
	Purpose            []string          `json:"purpose" yaml:"purpose"`
	LegalBasis         string            `json:"legalBasis" yaml:"legalBasis"`
	DataSubjects       []string          `json:"dataSubjects" yaml:"dataSubjects"`
	ProcessingLocations []string         `json:"processingLocations" yaml:"processingLocations"`
}

type ComplianceCheck struct {
	Name               string            `json:"name" yaml:"name"`
	Framework          string            `json:"framework" yaml:"framework"`
	Status             string            `json:"status" yaml:"status"`
	LastChecked        time.Time         `json:"lastChecked" yaml:"lastChecked"`
}

type DependencyCheck struct {
	Name               string            `json:"name" yaml:"name"`
	Status             string            `json:"status" yaml:"status"`
	ResponseTime       int64             `json:"responseTime" yaml:"responseTime"`
	LastChecked        time.Time         `json:"lastChecked" yaml:"lastChecked"`
}

type CrossBorderRules struct {
	Allowed            bool              `json:"allowed" yaml:"allowed"`
	RequiredApprovals  []string          `json:"requiredApprovals" yaml:"requiredApprovals"`
	Notifications      []string          `json:"notifications" yaml:"notifications"`
}

type TestResult struct {
	Date               time.Time         `json:"date" yaml:"date"`
	Status             string            `json:"status" yaml:"status"`
	Duration           int64             `json:"duration" yaml:"duration"` // milliseconds
	Issues             []string          `json:"issues" yaml:"issues"`
}

type ContactInfo struct {
	Email              string            `json:"email" yaml:"email"`
	Phone              string            `json:"phone" yaml:"phone"`
	Alternative        string            `json:"alternative" yaml:"alternative"`
}

type Availability struct {
	Hours              []int             `json:"hours" yaml:"hours"`
	Days               []string          `json:"days" yaml:"days"`
	Timezone           string            `json:"timezone" yaml:"timezone"`
	EmergencyOnly      bool              `json:"emergencyOnly" yaml:"emergencyOnly"`
}

type AutoApprovalRule struct {
	Condition          string            `json:"condition" yaml:"condition"`
	MaxAmount          float64           `json:"maxAmount" yaml:"maxAmount"`
	RequiredRole       string            `json:"requiredRole" yaml:"requiredRole"`
}

// Validation methods
func (d *DIDDocument) Validate() error {
	if d.ID == "" {
		return errors.Wrap(ErrInvalidDID, "DID ID cannot be empty")
	}
	
	if len(d.Context) == 0 {
		return errors.Wrap(ErrInvalidDID, "DID context is required")
	}
	
	// Validate W3C DID format
	if !IsValidDIDFormat(d.ID) {
		return errors.Wrap(ErrInvalidDID, "invalid DID format")
	}
	
	// Validate verification methods
	for _, vm := range d.VerificationMethod {
		if err := vm.Validate(); err != nil {
			return errors.Wrapf(ErrInvalidVerificationMethod, "invalid verification method %s: %v", vm.ID, err)
		}
	}
	
	// Validate services
	for _, svc := range d.Service {
		if err := svc.Validate(); err != nil {
			return errors.Wrapf(ErrInvalidService, "invalid service %s: %v", svc.ID, err)
		}
	}
	
	return nil
}

func (vm *VerificationMethod) Validate() error {
	if vm.ID == "" {
		return fmt.Errorf("verification method ID is required")
	}
	
	if vm.Type == "" {
		return fmt.Errorf("verification method type is required")
	}
	
	if vm.Controller == "" {
		return fmt.Errorf("verification method controller is required")
	}
	
	if vm.PublicKeyMultibase == "" && len(vm.PublicKeyJwk) == 0 {
		return fmt.Errorf("verification method must have either publicKeyMultibase or publicKeyJwk")
	}
	
	return nil
}

func (s *Service) Validate() error {
	if s.ID == "" {
		return fmt.Errorf("service ID is required")
	}
	
	if s.Type == "" {
		return fmt.Errorf("service type is required")
	}
	
	if s.ServiceEndpoint == "" {
		return fmt.Errorf("service endpoint is required")
	}
	
	return nil
}

// Helper functions
func IsValidDIDFormat(did string) bool {
	// Basic DID format validation: did:method:specific-identifier
	// More comprehensive validation should be implemented based on W3C DID spec
	return len(did) > 7 && did[:4] == "did:"
}

func NewDIDDocument(id string, creator sdk.AccAddress) *DIDDocument {
	now := time.Now()
	return &DIDDocument{
		Context:   []string{"https://www.w3.org/ns/did/v1"},
		ID:        id,
		Creator:   creator.String(),
		CreatedAt: now,
		UpdatedAt: now,
		Version:   1,
		Status: DIDStatus{
			State:     DIDStateActive,
			UpdatedAt: now,
			UpdatedBy: creator.String(),
			HealthCheck: HealthCheck{
				Status:      "healthy",
				LastChecked: now,
			},
		},
		Metadata: DIDMetadata{
			Created:          now,
			Updated:          now,
			VersionID:        "1",
			Environment:      "prod",
			CriticalityLevel: CriticalityMedium,
		},
		Compliance: Compliance{
			Framework:       []string{},
			Classifications: []string{},
			RetentionPolicy: RetentionPolicy{
				RetentionPeriod: 365, // 1 year default
				AutoDelete:      false,
			},
			AuditRequirements: AuditRequirements{
				LogAllAccess: true,
				RetainLogs:   90, // 90 days default
			},
			DataResidency: DataResidency{
				AllowedRegions: []string{"global"},
			},
			EncryptionPolicy: EncryptionPolicy{
				Required:       true,
				Algorithm:      "AES-256-GCM",
				KeyLength:      256,
				RotationPeriod: 90,
			},
		},
		Recovery: RecoveryConfig{
			Enabled:   false,
			Threshold: 1,
			BackupStrategy: BackupStrategy{
				Frequency:     "daily",
				Retention:     30,
				Encryption:    true,
				OffSiteBackup: true,
			},
		},
	}
}