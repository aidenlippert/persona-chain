package types

import (
	"context"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

// BankKeeper defines the expected interface for the Bank module
type BankKeeper interface {
	SpendableCoins(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins
	SendCoins(ctx sdk.Context, fromAddr sdk.AccAddress, toAddr sdk.AccAddress, amt sdk.Coins) error
	GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin
	GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins
	SendCoinsFromModuleToAccount(ctx sdk.Context, senderModule string, recipientAddr sdk.AccAddress, amt sdk.Coins) error
	SendCoinsFromAccountToModule(ctx sdk.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins) error
	BurnCoins(ctx sdk.Context, moduleName string, amt sdk.Coins) error
	MintCoins(ctx sdk.Context, moduleName string, amt sdk.Coins) error
}

// AccountKeeper defines the expected interface for the Account module
type AccountKeeper interface {
	GetAccount(ctx sdk.Context, addr sdk.AccAddress) authtypes.AccountI
	SetAccount(ctx sdk.Context, acc authtypes.AccountI)
	NewAccountWithAddress(ctx sdk.Context, addr sdk.AccAddress) authtypes.AccountI
	GetModuleAddress(moduleName string) sdk.AccAddress
	GetModuleAccount(ctx sdk.Context, moduleName string) authtypes.ModuleAccountI
}

// DIDKeeper defines the expected interface for the DID module
type DIDKeeper interface {
	CreateDID(ctx sdk.Context, did string, controller string, document interface{}) error
	GetDID(ctx sdk.Context, did string) (interface{}, error)
	UpdateDID(ctx sdk.Context, did string, document interface{}) error
	DeactivateDID(ctx sdk.Context, did string) error
	ResolveDID(ctx sdk.Context, did string) (interface{}, error)
	ValidateDID(did string) error
}

// ParamSubspace defines the expected Subspace interface for parameters
type ParamSubspace interface {
	Get(ctx sdk.Context, key []byte, ptr interface{})
	Set(ctx sdk.Context, key []byte, value interface{})
	WithKeyTable(table paramtypes.KeyTable) paramtypes.Subspace
	HasKeyTable() bool
}

// IdentityKeeper defines the expected interface for identity operations
type IdentityKeeper interface {
	// Universal Identity Management
	CreateUniversalIdentity(
		ctx sdk.Context,
		creator string,
		initialProtocols map[ProtocolType]*ProtocolIdentity,
		securityLevel SecurityLevel,
	) (*UniversalIdentity, error)
	
	GetUniversalIdentity(ctx sdk.Context, identityID string) (*UniversalIdentity, error)
	GetUniversalIdentityByDID(ctx sdk.Context, did string) (*UniversalIdentity, error)
	UpdateUniversalIdentity(
		ctx sdk.Context,
		identityID string,
		updater string,
		updates map[string]interface{},
	) (*UniversalIdentity, error)
	
	// Protocol Identity Management
	AddProtocolIdentity(
		ctx sdk.Context,
		identityID string,
		protocol ProtocolType,
		protocolIdentity *ProtocolIdentity,
		requestor string,
	) error
	
	// Credential Management
	IssueVerifiableCredential(
		ctx sdk.Context,
		issuer string,
		subjectDID string,
		credentialType []string,
		credentialSubject map[string]interface{},
		expirationDate *time.Time,
	) (*VerifiableCredential, error)
	
	GetVerifiableCredential(ctx sdk.Context, credentialID string) (*VerifiableCredential, error)
	RevokeVerifiableCredential(ctx sdk.Context, credentialID string, reason string) error
	IsCredentialRevoked(ctx sdk.Context, credentialID string) (bool, error)
	
	// Zero-Knowledge Credential Management
	IssueZKCredential(
		ctx sdk.Context,
		holder string,
		circuitID string,
		publicInputs map[string]interface{},
		zkProof *ZKProof,
		privacyParams *PrivacyParameters,
	) (*ZKCredential, error)
	
	GetZKCredential(ctx sdk.Context, zkCredentialID string) (*ZKCredential, error)
	VerifyZKProof(ctx sdk.Context, zkCredential *ZKCredential) bool
	
	// Compliance Management
	UpdateComplianceData(
		ctx sdk.Context,
		identityID string,
		complianceType string,
		data interface{},
		auditor string,
	) error
	
	// Permission Management
	GrantPermission(
		ctx sdk.Context,
		identityID string,
		resource string,
		action string,
		grantee string,
		grantor string,
		expiresAt *time.Time,
	) error
	
	RevokePermission(
		ctx sdk.Context,
		identityID string,
		permissionID string,
		revoker string,
	) error
	
	HasPermission(ctx sdk.Context, actor string, identityID string, action string) bool
}

// MsgServer defines the expected interface for the identity message server
type MsgServer interface {
	// Universal Identity Messages
	CreateIdentity(goCtx context.Context, msg *MsgCreateIdentity) (*MsgCreateIdentityResponse, error)
	UpdateIdentity(goCtx context.Context, msg *MsgUpdateIdentity) (*MsgUpdateIdentityResponse, error)
	AddProtocolIdentity(goCtx context.Context, msg *MsgAddProtocolIdentity) (*MsgAddProtocolIdentityResponse, error)
	
	// Verifiable Credential Messages
	IssueCredential(goCtx context.Context, msg *MsgIssueCredential) (*MsgIssueCredentialResponse, error)
	VerifyCredential(goCtx context.Context, msg *MsgVerifyCredential) (*MsgVerifyCredentialResponse, error)
	RevokeCredential(goCtx context.Context, msg *MsgRevokeCredential) (*MsgRevokeCredentialResponse, error)
	
	// Zero-Knowledge Credential Messages
	IssueZKCredential(goCtx context.Context, msg *MsgIssueZKCredential) (*MsgIssueZKCredentialResponse, error)
	VerifyZKProof(goCtx context.Context, msg *MsgVerifyZKProof) (*MsgVerifyZKProofResponse, error)
	
	// Compliance Messages
	UpdateCompliance(goCtx context.Context, msg *MsgUpdateCompliance) (*MsgUpdateComplianceResponse, error)
	PerformAudit(goCtx context.Context, msg *MsgPerformAudit) (*MsgPerformAuditResponse, error)
	
	// Permission Messages
	GrantPermission(goCtx context.Context, msg *MsgGrantPermission) (*MsgGrantPermissionResponse, error)
	RevokePermission(goCtx context.Context, msg *MsgRevokePermission) (*MsgRevokePermissionResponse, error)
}

// QueryServer defines the expected interface for the identity query server
type QueryServer interface {
	// Identity Queries
	Identity(goCtx context.Context, req *QueryIdentityRequest) (*QueryIdentityResponse, error)
	IdentityByDID(goCtx context.Context, req *QueryIdentityByDIDRequest) (*QueryIdentityByDIDResponse, error)
	Identities(goCtx context.Context, req *QueryIdentitiesRequest) (*QueryIdentitiesResponse, error)
	
	// Credential Queries
	Credential(goCtx context.Context, req *QueryCredentialRequest) (*QueryCredentialResponse, error)
	Credentials(goCtx context.Context, req *QueryCredentialsRequest) (*QueryCredentialsResponse, error)
	CredentialStatus(goCtx context.Context, req *QueryCredentialStatusRequest) (*QueryCredentialStatusResponse, error)
	
	// Zero-Knowledge Queries
	ZKCredential(goCtx context.Context, req *QueryZKCredentialRequest) (*QueryZKCredentialResponse, error)
	ZKCredentials(goCtx context.Context, req *QueryZKCredentialsRequest) (*QueryZKCredentialsResponse, error)
	Circuit(goCtx context.Context, req *QueryCircuitRequest) (*QueryCircuitResponse, error)
	Circuits(goCtx context.Context, req *QueryCircuitsRequest) (*QueryCircuitsResponse, error)
	
	// Compliance Queries
	Compliance(goCtx context.Context, req *QueryComplianceRequest) (*QueryComplianceResponse, error)
	AuditTrail(goCtx context.Context, req *QueryAuditTrailRequest) (*QueryAuditTrailResponse, error)
	
	// Permission Queries
	Permissions(goCtx context.Context, req *QueryPermissionsRequest) (*QueryPermissionsResponse, error)
	
	// Module Queries
	Params(goCtx context.Context, req *QueryParamsRequest) (*QueryParamsResponse, error)
	Health(goCtx context.Context, req *QueryHealthRequest) (*QueryHealthResponse, error)
	Metrics(goCtx context.Context, req *QueryMetricsRequest) (*QueryMetricsResponse, error)
}

// ProtocolBridge defines the interface for cross-protocol operations
type ProtocolBridge interface {
	// Protocol Translation
	TranslateIdentity(from ProtocolType, to ProtocolType, identity interface{}) (interface{}, error)
	TranslateCredential(from ProtocolType, to ProtocolType, credential interface{}) (interface{}, error)
	
	// Protocol Validation
	ValidateProtocolData(protocol ProtocolType, data interface{}) error
	
	// Protocol Conversion
	ConvertToUniversalFormat(protocol ProtocolType, data interface{}) (*ProtocolIdentity, error)
	ConvertFromUniversalFormat(protocol ProtocolType, identity *ProtocolIdentity) (interface{}, error)
}

// ComplianceEngine defines the interface for compliance operations
type ComplianceEngine interface {
	// Compliance Validation
	ValidateGDPR(identity *UniversalIdentity) (*GDPRCompliance, error)
	ValidateCCPA(identity *UniversalIdentity) (*CCPACompliance, error)
	ValidateHIPAA(identity *UniversalIdentity) (*HIPAACompliance, error)
	ValidateSOX(identity *UniversalIdentity) (*SOXCompliance, error)
	
	// Audit Operations
	PerformAudit(identity *UniversalIdentity, auditType string) (*AuditResult, error)
	
	// Privacy Operations
	EnforcePrivacyPolicy(identity *UniversalIdentity, policy *PrivacyPolicy) error
	ValidateConsent(identity *UniversalIdentity, purpose string) error
	
	// Data Operations
	AnonymizeData(data interface{}, level string) (interface{}, error)
	PseudonymizeData(data interface{}, key string) (interface{}, error)
	DeletePersonalData(identity *UniversalIdentity) error
}

// ZKProofEngine defines the interface for zero-knowledge proof operations
type ZKProofEngine interface {
	// Circuit Management
	RegisterCircuit(circuitID string, circuitData []byte, verificationKey []byte) error
	GetCircuit(circuitID string) ([]byte, error)
	GetVerificationKey(circuitID string) ([]byte, error)
	
	// Proof Generation
	GenerateProof(circuitID string, inputs map[string]interface{}, witness []byte) (*ZKProof, error)
	
	// Proof Verification
	VerifyProof(circuitID string, proof *ZKProof, publicInputs []string) (bool, error)
	
	// Privacy Operations
	GenerateNullifier(seed string, commitment string) (string, error)
	ValidateNullifier(nullifier string) (bool, error)
	
	// Selective Disclosure
	CreateSelectiveDisclosureProof(credential *VerifiableCredential, disclosureMap map[string]bool) (*ZKProof, error)
	VerifySelectiveDisclosureProof(proof *ZKProof, schema string) (map[string]interface{}, error)
}

// SecurityMonitor defines the interface for security monitoring
type SecurityMonitor interface {
	// Threat Detection
	DetectThreats(ctx sdk.Context, operation string, metadata map[string]interface{}) ([]SecurityThreat, error)
	
	// Risk Assessment
	AssessRisk(ctx sdk.Context, identity *UniversalIdentity, operation string) (int, error)
	
	// Security Events
	RecordSecurityEvent(ctx sdk.Context, event *SecurityEvent) error
	GetSecurityEvents(ctx sdk.Context, filters map[string]interface{}) ([]SecurityEvent, error)
	
	// Anomaly Detection
	DetectAnomalies(ctx sdk.Context, identity *UniversalIdentity, behavior map[string]interface{}) ([]Anomaly, error)
	
	// Access Control
	ValidateAccess(ctx sdk.Context, actor string, resource string, action string) (bool, string, error)
}

// CryptoService defines the interface for cryptographic operations
type CryptoService interface {
	// Encryption/Decryption
	Encrypt(data []byte, key []byte) ([]byte, error)
	Decrypt(encryptedData []byte, key []byte) ([]byte, error)
	
	// Digital Signatures
	Sign(data []byte, privateKey []byte) ([]byte, error)
	Verify(data []byte, signature []byte, publicKey []byte) (bool, error)
	
	// Key Management
	GenerateKeyPair() ([]byte, []byte, error) // privateKey, publicKey, error
	DeriveKey(masterKey []byte, purpose string) ([]byte, error)
	
	// Hash Functions
	Hash(data []byte, algorithm string) ([]byte, error)
	
	// Random Generation
	GenerateRandomBytes(length int) ([]byte, error)
	GenerateNonce() (string, error)
}

// InteroperabilityService defines the interface for cross-chain and cross-protocol operations
type InteroperabilityService interface {
	// Cross-Chain Operations
	TransferIdentityToCrossChain(identity *UniversalIdentity, targetChain string) error
	ReceiveIdentityFromCrossChain(identityData []byte, sourceChain string) (*UniversalIdentity, error)
	
	// Protocol Bridging
	BridgeToProtocol(identity *UniversalIdentity, targetProtocol ProtocolType) (interface{}, error)
	BridgeFromProtocol(protocolData interface{}, sourceProtocol ProtocolType) (*UniversalIdentity, error)
	
	// Data Format Conversion
	ConvertDataFormat(data interface{}, fromFormat string, toFormat string) (interface{}, error)
	
	// Standard Compliance
	ValidateW3CCompliance(credential *VerifiableCredential) error
	ValidateOpenIDCompliance(identity *ProtocolIdentity) error
	ValidateSAMLCompliance(identity *ProtocolIdentity) error
}

// EnterpriseService defines the interface for enterprise features
type EnterpriseService interface {
	// Multi-Tenancy
	CreateTenant(tenantID string, config map[string]interface{}) error
	GetTenant(tenantID string) (interface{}, error)
	ValidateTenantIsolation(tenantID string, operation string) error
	
	// Subscription Management
	CreateSubscription(tenantID string, plan string, features []string) error
	ValidateSubscription(tenantID string, feature string) (bool, error)
	
	// Quota Management
	CheckQuota(tenantID string, resource string) (bool, int, error)
	UpdateQuotaUsage(tenantID string, resource string, usage int) error
	
	// Feature Flags
	IsFeatureEnabled(tenantID string, feature string) bool
	EnableFeature(tenantID string, feature string) error
	DisableFeature(tenantID string, feature string) error
	
	// SLA Management
	ValidateSLA(tenantID string, operation string, duration time.Duration) error
	RecordSLAViolation(tenantID string, violation string) error
}

// Supporting types for interfaces
type SecurityThreat struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Severity    string                 `json:"severity"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata"`
	DetectedAt  time.Time              `json:"detected_at"`
}

type SecurityEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Actor     string                 `json:"actor"`
	Resource  string                 `json:"resource"`
	Action    string                 `json:"action"`
	Timestamp time.Time              `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata"`
	RiskScore int                    `json:"risk_score"`
}

type Anomaly struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	Confidence  float64                `json:"confidence"`
	Metadata    map[string]interface{} `json:"metadata"`
	DetectedAt  time.Time              `json:"detected_at"`
}