package types

import (
	"encoding/json"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/codec"
)

// Multi-Protocol Identity Architecture for PersonaChain
// Supports OAuth 2.0, OIDC, SAML, W3C DIDs/VCs for universal compatibility

// ProtocolType defines supported identity protocols
type ProtocolType string

const (
	ProtocolOAuth2   ProtocolType = "oauth2"
	ProtocolOIDC     ProtocolType = "oidc"
	ProtocolSAML     ProtocolType = "saml"
	ProtocolDID      ProtocolType = "did"
	ProtocolVC       ProtocolType = "vc"
	ProtocolVP       ProtocolType = "vp"
	ProtocolWebAuthn ProtocolType = "webauthn"
	ProtocolZKProof  ProtocolType = "zkproof"
)

// UniversalIdentity represents a unified identity across all protocols
type UniversalIdentity struct {
	// Core Identity
	ID          string    `json:"id" yaml:"id"`
	DID         string    `json:"did" yaml:"did"`
	CreatedAt   time.Time `json:"created_at" yaml:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" yaml:"updated_at"`
	IsActive    bool      `json:"is_active" yaml:"is_active"`
	
	// Multi-Protocol Support
	Protocols   map[ProtocolType]*ProtocolIdentity `json:"protocols" yaml:"protocols"`
	
	// Enterprise Features
	TenantID    string                 `json:"tenant_id" yaml:"tenant_id"`
	Metadata    map[string]interface{} `json:"metadata" yaml:"metadata"`
	Permissions []Permission           `json:"permissions" yaml:"permissions"`
	
	// Security & Compliance
	SecurityLevel  SecurityLevel     `json:"security_level" yaml:"security_level"`
	ComplianceData *ComplianceData   `json:"compliance_data,omitempty" yaml:"compliance_data,omitempty"`
	AuditTrail     []AuditEntry      `json:"audit_trail" yaml:"audit_trail"`
	
	// Privacy & ZK Features
	ZKCredentials  []ZKCredential    `json:"zk_credentials" yaml:"zk_credentials"`
	PrivacyPolicy  *PrivacyPolicy    `json:"privacy_policy,omitempty" yaml:"privacy_policy,omitempty"`
}

// ProtocolIdentity contains protocol-specific identity data
type ProtocolIdentity struct {
	Protocol    ProtocolType           `json:"protocol" yaml:"protocol"`
	Identifier  string                 `json:"identifier" yaml:"identifier"`
	Claims      map[string]interface{} `json:"claims" yaml:"claims"`
	Tokens      *TokenSet              `json:"tokens,omitempty" yaml:"tokens,omitempty"`
	Metadata    map[string]interface{} `json:"metadata" yaml:"metadata"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty" yaml:"expires_at,omitempty"`
	IsVerified  bool                   `json:"is_verified" yaml:"is_verified"`
}

// OAuth2 & OIDC Token Management
type TokenSet struct {
	AccessToken      string     `json:"access_token,omitempty" yaml:"access_token,omitempty"`
	RefreshToken     string     `json:"refresh_token,omitempty" yaml:"refresh_token,omitempty"`
	IDToken          string     `json:"id_token,omitempty" yaml:"id_token,omitempty"`
	TokenType        string     `json:"token_type,omitempty" yaml:"token_type,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty" yaml:"expires_at,omitempty"`
	Scope            []string   `json:"scope,omitempty" yaml:"scope,omitempty"`
	RefreshExpiresAt *time.Time `json:"refresh_expires_at,omitempty" yaml:"refresh_expires_at,omitempty"`
}

// SAML Assertion Data
type SAMLAssertion struct {
	AssertionID   string                 `json:"assertion_id" yaml:"assertion_id"`
	Issuer        string                 `json:"issuer" yaml:"issuer"`
	Subject       string                 `json:"subject" yaml:"subject"`
	Attributes    map[string]interface{} `json:"attributes" yaml:"attributes"`
	Conditions    *SAMLConditions        `json:"conditions,omitempty" yaml:"conditions,omitempty"`
	IssuedAt      time.Time              `json:"issued_at" yaml:"issued_at"`
	ExpiresAt     time.Time              `json:"expires_at" yaml:"expires_at"`
	SessionIndex  string                 `json:"session_index,omitempty" yaml:"session_index,omitempty"`
}

type SAMLConditions struct {
	NotBefore    *time.Time `json:"not_before,omitempty" yaml:"not_before,omitempty"`
	NotOnOrAfter *time.Time `json:"not_on_or_after,omitempty" yaml:"not_on_or_after,omitempty"`
	Audience     []string   `json:"audience,omitempty" yaml:"audience,omitempty"`
}

// W3C Verifiable Credentials
type VerifiableCredential struct {
	Context           []string               `json:"@context" yaml:"context"`
	Type              []string               `json:"type" yaml:"type"`
	ID                string                 `json:"id" yaml:"id"`
	Issuer            interface{}            `json:"issuer" yaml:"issuer"`
	IssuanceDate      time.Time              `json:"issuanceDate" yaml:"issuance_date"`
	ExpirationDate    *time.Time             `json:"expirationDate,omitempty" yaml:"expiration_date,omitempty"`
	CredentialSubject map[string]interface{} `json:"credentialSubject" yaml:"credential_subject"`
	Proof             *Proof                 `json:"proof,omitempty" yaml:"proof,omitempty"`
	Status            *CredentialStatus      `json:"credentialStatus,omitempty" yaml:"credential_status,omitempty"`
	Evidence          []interface{}          `json:"evidence,omitempty" yaml:"evidence,omitempty"`
	RefreshService    *RefreshService        `json:"refreshService,omitempty" yaml:"refresh_service,omitempty"`
}

// W3C Verifiable Presentation
type VerifiablePresentation struct {
	Context              []string                `json:"@context" yaml:"context"`
	Type                 []string                `json:"type" yaml:"type"`
	ID                   string                  `json:"id" yaml:"id"`
	Holder               string                  `json:"holder" yaml:"holder"`
	VerifiableCredential []VerifiableCredential `json:"verifiableCredential" yaml:"verifiable_credential"`
	Proof                *Proof                  `json:"proof,omitempty" yaml:"proof,omitempty"`
}

// Cryptographic Proof
type Proof struct {
	Type               string    `json:"type" yaml:"type"`
	Created            time.Time `json:"created" yaml:"created"`
	ProofPurpose       string    `json:"proofPurpose" yaml:"proof_purpose"`
	VerificationMethod string    `json:"verificationMethod" yaml:"verification_method"`
	ProofValue         string    `json:"proofValue,omitempty" yaml:"proof_value,omitempty"`
	Jws                string    `json:"jws,omitempty" yaml:"jws,omitempty"`
	Challenge          string    `json:"challenge,omitempty" yaml:"challenge,omitempty"`
	Domain             string    `json:"domain,omitempty" yaml:"domain,omitempty"`
}

// Credential Status for Revocation
type CredentialStatus struct {
	ID   string `json:"id" yaml:"id"`
	Type string `json:"type" yaml:"type"`
}

// Refresh Service for Dynamic Credentials
type RefreshService struct {
	ID   string `json:"id" yaml:"id"`
	Type string `json:"type" yaml:"type"`
}

// Zero-Knowledge Credential
type ZKCredential struct {
	ID                 string                 `json:"id" yaml:"id"`
	Type               string                 `json:"type" yaml:"type"`
	Holder             string                 `json:"holder" yaml:"holder"`
	CircuitID          string                 `json:"circuit_id" yaml:"circuit_id"`
	PublicInputs       map[string]interface{} `json:"public_inputs" yaml:"public_inputs"`
	Proof              *ZKProof               `json:"proof" yaml:"proof"`
	VerificationKey    string                 `json:"verification_key" yaml:"verification_key"`
	CredentialSchema   string                 `json:"credential_schema" yaml:"credential_schema"`
	PrivacyParameters  *PrivacyParameters     `json:"privacy_parameters,omitempty" yaml:"privacy_parameters,omitempty"`
	SelectiveDisclosure bool                  `json:"selective_disclosure" yaml:"selective_disclosure"`
	CreatedAt          time.Time              `json:"created_at" yaml:"created_at"`
	ExpiresAt          *time.Time             `json:"expires_at,omitempty" yaml:"expires_at,omitempty"`
}

// Zero-Knowledge Proof
type ZKProof struct {
	Protocol     string                 `json:"protocol" yaml:"protocol"` // groth16, plonk, stark
	ProofData    string                 `json:"proof_data" yaml:"proof_data"`
	PublicSignals []string              `json:"public_signals" yaml:"public_signals"`
	Metadata     map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// Privacy Parameters for ZK Proofs
type PrivacyParameters struct {
	NullifierSeed    string   `json:"nullifier_seed,omitempty" yaml:"nullifier_seed,omitempty"`
	CommitmentScheme string   `json:"commitment_scheme" yaml:"commitment_scheme"`
	AnonymitySet     []string `json:"anonymity_set,omitempty" yaml:"anonymity_set,omitempty"`
	PrivacyLevel     string   `json:"privacy_level" yaml:"privacy_level"` // basic, enhanced, maximum
}

// Security Levels
type SecurityLevel string

const (
	SecurityBasic      SecurityLevel = "basic"
	SecurityEnhanced   SecurityLevel = "enhanced"
	SecurityHigh       SecurityLevel = "high"
	SecurityCritical   SecurityLevel = "critical"
	SecurityQuantumSafe SecurityLevel = "quantum_safe"
)

// Compliance Data
type ComplianceData struct {
	GDPR         *GDPRCompliance    `json:"gdpr,omitempty" yaml:"gdpr,omitempty"`
	CCPA         *CCPACompliance    `json:"ccpa,omitempty" yaml:"ccpa,omitempty"`
	HIPAA        *HIPAACompliance   `json:"hipaa,omitempty" yaml:"hipaa,omitempty"`
	SOX          *SOXCompliance     `json:"sox,omitempty" yaml:"sox,omitempty"`
	Custom       map[string]interface{} `json:"custom,omitempty" yaml:"custom,omitempty"`
	LastAudit    *time.Time         `json:"last_audit,omitempty" yaml:"last_audit,omitempty"`
	NextAudit    *time.Time         `json:"next_audit,omitempty" yaml:"next_audit,omitempty"`
	AuditResults []AuditResult      `json:"audit_results,omitempty" yaml:"audit_results,omitempty"`
}

// GDPR Compliance
type GDPRCompliance struct {
	LawfulBasis         string    `json:"lawful_basis" yaml:"lawful_basis"`
	ConsentGiven        bool      `json:"consent_given" yaml:"consent_given"`
	ConsentWithdrawn    bool      `json:"consent_withdrawn" yaml:"consent_withdrawn"`
	DataProcessingPurpose string  `json:"data_processing_purpose" yaml:"data_processing_purpose"`
	RetentionPeriod     *time.Duration `json:"retention_period,omitempty" yaml:"retention_period,omitempty"`
	RightToErasure      bool      `json:"right_to_erasure" yaml:"right_to_erasure"`
	RightToPortability  bool      `json:"right_to_portability" yaml:"right_to_portability"`
	ConsentDate         *time.Time `json:"consent_date,omitempty" yaml:"consent_date,omitempty"`
}

// CCPA Compliance
type CCPACompliance struct {
	OptOut              bool       `json:"opt_out" yaml:"opt_out"`
	DataSaleProhibited  bool       `json:"data_sale_prohibited" yaml:"data_sale_prohibited"`
	RightToDelete       bool       `json:"right_to_delete" yaml:"right_to_delete"`
	RightToKnow         bool       `json:"right_to_know" yaml:"right_to_know"`
	OptOutDate          *time.Time `json:"opt_out_date,omitempty" yaml:"opt_out_date,omitempty"`
}

// HIPAA Compliance
type HIPAACompliance struct {
	CoveredEntity       bool       `json:"covered_entity" yaml:"covered_entity"`
	BusinessAssociate   bool       `json:"business_associate" yaml:"business_associate"`
	PHIProcessed        bool       `json:"phi_processed" yaml:"phi_processed"`
	SecurityRule        bool       `json:"security_rule" yaml:"security_rule"`
	PrivacyRule         bool       `json:"privacy_rule" yaml:"privacy_rule"`
	BreachNotification bool       `json:"breach_notification" yaml:"breach_notification"`
	AuthorizationDate   *time.Time `json:"authorization_date,omitempty" yaml:"authorization_date,omitempty"`
}

// SOX Compliance
type SOXCompliance struct {
	PublicCompany       bool       `json:"public_company" yaml:"public_company"`
	FinancialReporting  bool       `json:"financial_reporting" yaml:"financial_reporting"`
	InternalControls    bool       `json:"internal_controls" yaml:"internal_controls"`
	AuditorIndependence bool       `json:"auditor_independence" yaml:"auditor_independence"`
	CertificationDate   *time.Time `json:"certification_date,omitempty" yaml:"certification_date,omitempty"`
}

// Audit Result
type AuditResult struct {
	AuditID      string                 `json:"audit_id" yaml:"audit_id"`
	AuditType    string                 `json:"audit_type" yaml:"audit_type"`
	Status       string                 `json:"status" yaml:"status"`
	Score        int                    `json:"score" yaml:"score"`
	Findings     []string               `json:"findings" yaml:"findings"`
	Remediation  []string               `json:"remediation" yaml:"remediation"`
	AuditDate    time.Time              `json:"audit_date" yaml:"audit_date"`
	AuditorInfo  map[string]interface{} `json:"auditor_info" yaml:"auditor_info"`
	NextAuditDue *time.Time             `json:"next_audit_due,omitempty" yaml:"next_audit_due,omitempty"`
}

// Permission Management
type Permission struct {
	ID          string                 `json:"id" yaml:"id"`
	Resource    string                 `json:"resource" yaml:"resource"`
	Action      string                 `json:"action" yaml:"action"`
	Effect      PermissionEffect       `json:"effect" yaml:"effect"`
	Conditions  map[string]interface{} `json:"conditions,omitempty" yaml:"conditions,omitempty"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty" yaml:"expires_at,omitempty"`
	GrantedBy   string                 `json:"granted_by" yaml:"granted_by"`
	GrantedAt   time.Time              `json:"granted_at" yaml:"granted_at"`
}

type PermissionEffect string

const (
	PermissionAllow PermissionEffect = "allow"
	PermissionDeny  PermissionEffect = "deny"
)

// Privacy Policy
type PrivacyPolicy struct {
	Version          string                 `json:"version" yaml:"version"`
	DataCollection   *DataCollectionPolicy  `json:"data_collection" yaml:"data_collection"`
	DataUsage        *DataUsagePolicy       `json:"data_usage" yaml:"data_usage"`
	DataSharing      *DataSharingPolicy     `json:"data_sharing" yaml:"data_sharing"`
	DataRetention    *DataRetentionPolicy   `json:"data_retention" yaml:"data_retention"`
	UserRights       *UserRightsPolicy      `json:"user_rights" yaml:"user_rights"`
	SecurityMeasures []string               `json:"security_measures" yaml:"security_measures"`
	ContactInfo      map[string]interface{} `json:"contact_info" yaml:"contact_info"`
	LastUpdated      time.Time              `json:"last_updated" yaml:"last_updated"`
	EffectiveDate    time.Time              `json:"effective_date" yaml:"effective_date"`
}

type DataCollectionPolicy struct {
	PurposeLimitation bool     `json:"purpose_limitation" yaml:"purpose_limitation"`
	MinimumNecessary  bool     `json:"minimum_necessary" yaml:"minimum_necessary"`
	ConsentRequired   bool     `json:"consent_required" yaml:"consent_required"`
	DataTypes         []string `json:"data_types" yaml:"data_types"`
	CollectionMethods []string `json:"collection_methods" yaml:"collection_methods"`
}

type DataUsagePolicy struct {
	PrimaryPurposes    []string `json:"primary_purposes" yaml:"primary_purposes"`
	SecondaryUseAllowed bool    `json:"secondary_use_allowed" yaml:"secondary_use_allowed"`
	ConsentForSecondary bool    `json:"consent_for_secondary" yaml:"consent_for_secondary"`
	AutomatedDecisions  bool    `json:"automated_decisions" yaml:"automated_decisions"`
	Profiling          bool    `json:"profiling" yaml:"profiling"`
}

type DataSharingPolicy struct {
	ThirdPartySharing bool     `json:"third_party_sharing" yaml:"third_party_sharing"`
	ConsentRequired   bool     `json:"consent_required" yaml:"consent_required"`
	ShareWithPartners bool     `json:"share_with_partners" yaml:"share_with_partners"`
	ShareForCompliance bool    `json:"share_for_compliance" yaml:"share_for_compliance"`
	DataTransferRegions []string `json:"data_transfer_regions" yaml:"data_transfer_regions"`
}

type DataRetentionPolicy struct {
	RetentionPeriod    time.Duration `json:"retention_period" yaml:"retention_period"`
	AutomaticDeletion  bool          `json:"automatic_deletion" yaml:"automatic_deletion"`
	ArchivalPolicy     string        `json:"archival_policy" yaml:"archival_policy"`
	DeletionMethods    []string      `json:"deletion_methods" yaml:"deletion_methods"`
}

type UserRightsPolicy struct {
	RightToAccess      bool `json:"right_to_access" yaml:"right_to_access"`
	RightToRectification bool `json:"right_to_rectification" yaml:"right_to_rectification"`
	RightToErasure     bool `json:"right_to_erasure" yaml:"right_to_erasure"`
	RightToPortability bool `json:"right_to_portability" yaml:"right_to_portability"`
	RightToObject      bool `json:"right_to_object" yaml:"right_to_object"`
	RightToWithdraw    bool `json:"right_to_withdraw" yaml:"right_to_withdraw"`
}

// Audit Trail Entry
type AuditEntry struct {
	ID          string                 `json:"id" yaml:"id"`
	Timestamp   time.Time              `json:"timestamp" yaml:"timestamp"`
	Action      string                 `json:"action" yaml:"action"`
	Actor       string                 `json:"actor" yaml:"actor"`
	Resource    string                 `json:"resource" yaml:"resource"`
	Result      string                 `json:"result" yaml:"result"`
	IPAddress   string                 `json:"ip_address,omitempty" yaml:"ip_address,omitempty"`
	UserAgent   string                 `json:"user_agent,omitempty" yaml:"user_agent,omitempty"`
	SessionID   string                 `json:"session_id,omitempty" yaml:"session_id,omitempty"`
	Changes     map[string]interface{} `json:"changes,omitempty" yaml:"changes,omitempty"`
	RiskScore   int                    `json:"risk_score,omitempty" yaml:"risk_score,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// Validation methods
func (ui *UniversalIdentity) Validate() error {
	if ui.ID == "" {
		return ErrInvalidIdentityID
	}
	if ui.DID == "" {
		return ErrInvalidDID
	}
	if ui.Protocols == nil || len(ui.Protocols) == 0 {
		return ErrNoProtocolsConfigured
	}
	return nil
}

func (pi *ProtocolIdentity) Validate() error {
	if pi.Protocol == "" {
		return ErrInvalidProtocol
	}
	if pi.Identifier == "" {
		return ErrInvalidIdentifier
	}
	return nil
}

func (vc *VerifiableCredential) Validate() error {
	if len(vc.Context) == 0 {
		return ErrInvalidVCContext
	}
	if len(vc.Type) == 0 {
		return ErrInvalidVCType
	}
	if vc.ID == "" {
		return ErrInvalidVCID
	}
	if vc.Issuer == nil {
		return ErrInvalidVCIssuer
	}
	return nil
}

// JSON marshaling for Cosmos SDK compatibility
func (ui UniversalIdentity) MarshalJSON() ([]byte, error) {
	type Alias UniversalIdentity
	return json.Marshal(&struct {
		Alias
	}{
		Alias: (Alias)(ui),
	})
}

func (ui *UniversalIdentity) UnmarshalJSON(data []byte) error {
	type Alias UniversalIdentity
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(ui),
	}
	return json.Unmarshal(data, &aux)
}

// Codec registration for Cosmos SDK
func RegisterCodec(cdc *codec.LegacyAmino) {
	cdc.RegisterConcrete(&UniversalIdentity{}, "identity/UniversalIdentity", nil)
	cdc.RegisterConcrete(&ProtocolIdentity{}, "identity/ProtocolIdentity", nil)
	cdc.RegisterConcrete(&VerifiableCredential{}, "identity/VerifiableCredential", nil)
	cdc.RegisterConcrete(&VerifiablePresentation{}, "identity/VerifiablePresentation", nil)
	cdc.RegisterConcrete(&ZKCredential{}, "identity/ZKCredential", nil)
}