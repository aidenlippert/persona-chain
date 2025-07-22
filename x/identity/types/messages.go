package types

import (
	"fmt"
	"time"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// Message type URLs for the identity module
const (
	TypeMsgCreateIdentity       = "create_identity"
	TypeMsgUpdateIdentity       = "update_identity"
	TypeMsgAddProtocolIdentity  = "add_protocol_identity"
	TypeMsgIssueCredential      = "issue_credential"
	TypeMsgVerifyCredential     = "verify_credential"
	TypeMsgRevokeCredential     = "revoke_credential"
	TypeMsgIssueZKCredential    = "issue_zk_credential"
	TypeMsgVerifyZKProof        = "verify_zk_proof"
	TypeMsgUpdateCompliance     = "update_compliance"
	TypeMsgPerformAudit         = "perform_audit"
	TypeMsgGrantPermission      = "grant_permission"
	TypeMsgRevokePermission     = "revoke_permission"
)

// Interface assertions
var (
	_ sdk.Msg = &MsgCreateIdentity{}
	_ sdk.Msg = &MsgUpdateIdentity{}
	_ sdk.Msg = &MsgAddProtocolIdentity{}
	_ sdk.Msg = &MsgIssueCredential{}
	_ sdk.Msg = &MsgVerifyCredential{}
	_ sdk.Msg = &MsgRevokeCredential{}
	_ sdk.Msg = &MsgIssueZKCredential{}
	_ sdk.Msg = &MsgVerifyZKProof{}
	_ sdk.Msg = &MsgUpdateCompliance{}
	_ sdk.Msg = &MsgPerformAudit{}
	_ sdk.Msg = &MsgGrantPermission{}
	_ sdk.Msg = &MsgRevokePermission{}
)

// ==================== UNIVERSAL IDENTITY MESSAGES ====================

// MsgCreateIdentity defines the message for creating a universal identity
type MsgCreateIdentity struct {
	Creator           string                         `json:"creator" yaml:"creator"`
	InitialProtocols  []*MsgProtocolIdentityData     `json:"initial_protocols" yaml:"initial_protocols"`
	SecurityLevel     string                         `json:"security_level" yaml:"security_level"`
	Metadata          map[string]interface{}         `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// MsgProtocolIdentityData defines protocol-specific identity data for messages
type MsgProtocolIdentityData struct {
	Protocol   string                 `json:"protocol" yaml:"protocol"`
	Identifier string                 `json:"identifier" yaml:"identifier"`
	Claims     map[string]interface{} `json:"claims" yaml:"claims"`
	Metadata   map[string]interface{} `json:"metadata" yaml:"metadata"`
	IsVerified bool                   `json:"is_verified" yaml:"is_verified"`
}

// NewMsgCreateIdentity creates a new MsgCreateIdentity instance
func NewMsgCreateIdentity(
	creator string,
	initialProtocols []*MsgProtocolIdentityData,
	securityLevel string,
	metadata map[string]interface{},
) *MsgCreateIdentity {
	return &MsgCreateIdentity{
		Creator:          creator,
		InitialProtocols: initialProtocols,
		SecurityLevel:    securityLevel,
		Metadata:         metadata,
	}
}

// Route returns the message route
func (msg *MsgCreateIdentity) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgCreateIdentity) Type() string {
	return TypeMsgCreateIdentity
}

// GetSigners returns the signers of the message
func (msg *MsgCreateIdentity) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgCreateIdentity) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgCreateIdentity) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}

	if len(msg.InitialProtocols) == 0 {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "at least one initial protocol must be provided")
	}

	// Validate security level
	switch SecurityLevel(msg.SecurityLevel) {
	case SecurityBasic, SecurityEnhanced, SecurityHigh, SecurityCritical, SecurityQuantumSafe:
		// Valid
	default:
		return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "invalid security level: %s", msg.SecurityLevel)
	}

	// Validate initial protocols
	for i, protocol := range msg.InitialProtocols {
		if err := validateProtocolIdentityData(protocol); err != nil {
			return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "invalid protocol %d: %s", i, err.Error())
		}
	}

	return nil
}

// MsgCreateIdentityResponse defines the response for MsgCreateIdentity
type MsgCreateIdentityResponse struct {
	IdentityId string `json:"identity_id" yaml:"identity_id"`
	Did        string `json:"did" yaml:"did"`
	CreatedAt  int64  `json:"created_at" yaml:"created_at"`
}

// MsgUpdateIdentity defines the message for updating a universal identity
type MsgUpdateIdentity struct {
	Updater    string                 `json:"updater" yaml:"updater"`
	IdentityId string                 `json:"identity_id" yaml:"identity_id"`
	Updates    map[string]interface{} `json:"updates" yaml:"updates"`
}

// NewMsgUpdateIdentity creates a new MsgUpdateIdentity instance
func NewMsgUpdateIdentity(updater, identityId string, updates map[string]interface{}) *MsgUpdateIdentity {
	return &MsgUpdateIdentity{
		Updater:    updater,
		IdentityId: identityId,
		Updates:    updates,
	}
}

// Route returns the message route
func (msg *MsgUpdateIdentity) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgUpdateIdentity) Type() string {
	return TypeMsgUpdateIdentity
}

// GetSigners returns the signers of the message
func (msg *MsgUpdateIdentity) GetSigners() []sdk.AccAddress {
	updater, err := sdk.AccAddressFromBech32(msg.Updater)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{updater}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgUpdateIdentity) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgUpdateIdentity) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Updater)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid updater address (%s)", err)
	}

	if msg.IdentityId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "identity ID cannot be empty")
	}

	if len(msg.Updates) == 0 {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "at least one update must be provided")
	}

	return nil
}

// MsgUpdateIdentityResponse defines the response for MsgUpdateIdentity
type MsgUpdateIdentityResponse struct {
	IdentityId string `json:"identity_id" yaml:"identity_id"`
	UpdatedAt  int64  `json:"updated_at" yaml:"updated_at"`
}

// MsgAddProtocolIdentity defines the message for adding a protocol identity
type MsgAddProtocolIdentity struct {
	Requestor  string                 `json:"requestor" yaml:"requestor"`
	IdentityId string                 `json:"identity_id" yaml:"identity_id"`
	Protocol   string                 `json:"protocol" yaml:"protocol"`
	Identifier string                 `json:"identifier" yaml:"identifier"`
	Claims     map[string]interface{} `json:"claims" yaml:"claims"`
	Metadata   map[string]interface{} `json:"metadata" yaml:"metadata"`
	IsVerified bool                   `json:"is_verified" yaml:"is_verified"`
}

// NewMsgAddProtocolIdentity creates a new MsgAddProtocolIdentity instance
func NewMsgAddProtocolIdentity(
	requestor, identityId, protocol, identifier string,
	claims, metadata map[string]interface{},
	isVerified bool,
) *MsgAddProtocolIdentity {
	return &MsgAddProtocolIdentity{
		Requestor:  requestor,
		IdentityId: identityId,
		Protocol:   protocol,
		Identifier: identifier,
		Claims:     claims,
		Metadata:   metadata,
		IsVerified: isVerified,
	}
}

// Route returns the message route
func (msg *MsgAddProtocolIdentity) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgAddProtocolIdentity) Type() string {
	return TypeMsgAddProtocolIdentity
}

// GetSigners returns the signers of the message
func (msg *MsgAddProtocolIdentity) GetSigners() []sdk.AccAddress {
	requestor, err := sdk.AccAddressFromBech32(msg.Requestor)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{requestor}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgAddProtocolIdentity) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgAddProtocolIdentity) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Requestor)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid requestor address (%s)", err)
	}

	if msg.IdentityId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "identity ID cannot be empty")
	}

	if msg.Protocol == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "protocol cannot be empty")
	}

	if msg.Identifier == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "identifier cannot be empty")
	}

	// Validate protocol type
	switch ProtocolType(msg.Protocol) {
	case ProtocolOAuth2, ProtocolOIDC, ProtocolSAML, ProtocolDID, ProtocolVC, ProtocolVP, ProtocolWebAuthn, ProtocolZKProof:
		// Valid
	default:
		return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "unsupported protocol: %s", msg.Protocol)
	}

	return nil
}

// MsgAddProtocolIdentityResponse defines the response for MsgAddProtocolIdentity
type MsgAddProtocolIdentityResponse struct {
	IdentityId string `json:"identity_id" yaml:"identity_id"`
	Protocol   string `json:"protocol" yaml:"protocol"`
	Success    bool   `json:"success" yaml:"success"`
}

// ==================== VERIFIABLE CREDENTIAL MESSAGES ====================

// MsgIssueCredential defines the message for issuing a verifiable credential
type MsgIssueCredential struct {
	Issuer            string                 `json:"issuer" yaml:"issuer"`
	SubjectDid        string                 `json:"subject_did" yaml:"subject_did"`
	CredentialType    []string               `json:"credential_type" yaml:"credential_type"`
	CredentialSubject map[string]interface{} `json:"credential_subject" yaml:"credential_subject"`
	ExpirationDate    int64                  `json:"expiration_date,omitempty" yaml:"expiration_date,omitempty"`
}

// NewMsgIssueCredential creates a new MsgIssueCredential instance
func NewMsgIssueCredential(
	issuer, subjectDid string,
	credentialType []string,
	credentialSubject map[string]interface{},
	expirationDate int64,
) *MsgIssueCredential {
	return &MsgIssueCredential{
		Issuer:            issuer,
		SubjectDid:        subjectDid,
		CredentialType:    credentialType,
		CredentialSubject: credentialSubject,
		ExpirationDate:    expirationDate,
	}
}

// Route returns the message route
func (msg *MsgIssueCredential) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgIssueCredential) Type() string {
	return TypeMsgIssueCredential
}

// GetSigners returns the signers of the message
func (msg *MsgIssueCredential) GetSigners() []sdk.AccAddress {
	issuer, err := sdk.AccAddressFromBech32(msg.Issuer)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{issuer}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgIssueCredential) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgIssueCredential) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Issuer)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid issuer address (%s)", err)
	}

	if msg.SubjectDid == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "subject DID cannot be empty")
	}

	if len(msg.CredentialType) == 0 {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "credential type cannot be empty")
	}

	if len(msg.CredentialSubject) == 0 {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "credential subject cannot be empty")
	}

	// Validate expiration date if provided
	if msg.ExpirationDate > 0 {
		expTime := time.Unix(msg.ExpirationDate, 0)
		if expTime.Before(time.Now()) {
			return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "expiration date cannot be in the past")
		}
	}

	return nil
}

// MsgIssueCredentialResponse defines the response for MsgIssueCredential
type MsgIssueCredentialResponse struct {
	CredentialId   string   `json:"credential_id" yaml:"credential_id"`
	CredentialType []string `json:"credential_type" yaml:"credential_type"`
	IssuedAt       int64    `json:"issued_at" yaml:"issued_at"`
	ExpiresAt      int64    `json:"expires_at,omitempty" yaml:"expires_at,omitempty"`
}

// MsgVerifyCredential defines the message for verifying a verifiable credential
type MsgVerifyCredential struct {
	Verifier     string `json:"verifier" yaml:"verifier"`
	CredentialId string `json:"credential_id" yaml:"credential_id"`
}

// NewMsgVerifyCredential creates a new MsgVerifyCredential instance
func NewMsgVerifyCredential(verifier, credentialId string) *MsgVerifyCredential {
	return &MsgVerifyCredential{
		Verifier:     verifier,
		CredentialId: credentialId,
	}
}

// Route returns the message route
func (msg *MsgVerifyCredential) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgVerifyCredential) Type() string {
	return TypeMsgVerifyCredential
}

// GetSigners returns the signers of the message
func (msg *MsgVerifyCredential) GetSigners() []sdk.AccAddress {
	verifier, err := sdk.AccAddressFromBech32(msg.Verifier)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{verifier}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgVerifyCredential) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgVerifyCredential) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Verifier)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid verifier address (%s)", err)
	}

	if msg.CredentialId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "credential ID cannot be empty")
	}

	return nil
}

// MsgVerifyCredentialResponse defines the response for MsgVerifyCredential
type MsgVerifyCredentialResponse struct {
	CredentialId string `json:"credential_id" yaml:"credential_id"`
	IsValid      bool   `json:"is_valid" yaml:"is_valid"`
	VerifiedAt   int64  `json:"verified_at" yaml:"verified_at"`
	Reason       string `json:"reason,omitempty" yaml:"reason,omitempty"`
}

// MsgRevokeCredential defines the message for revoking a verifiable credential
type MsgRevokeCredential struct {
	Revoker      string `json:"revoker" yaml:"revoker"`
	CredentialId string `json:"credential_id" yaml:"credential_id"`
	Reason       string `json:"reason" yaml:"reason"`
}

// NewMsgRevokeCredential creates a new MsgRevokeCredential instance
func NewMsgRevokeCredential(revoker, credentialId, reason string) *MsgRevokeCredential {
	return &MsgRevokeCredential{
		Revoker:      revoker,
		CredentialId: credentialId,
		Reason:       reason,
	}
}

// Route returns the message route
func (msg *MsgRevokeCredential) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgRevokeCredential) Type() string {
	return TypeMsgRevokeCredential
}

// GetSigners returns the signers of the message
func (msg *MsgRevokeCredential) GetSigners() []sdk.AccAddress {
	revoker, err := sdk.AccAddressFromBech32(msg.Revoker)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{revoker}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgRevokeCredential) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgRevokeCredential) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Revoker)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid revoker address (%s)", err)
	}

	if msg.CredentialId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "credential ID cannot be empty")
	}

	if msg.Reason == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "reason cannot be empty")
	}

	return nil
}

// MsgRevokeCredentialResponse defines the response for MsgRevokeCredential
type MsgRevokeCredentialResponse struct {
	CredentialId string `json:"credential_id" yaml:"credential_id"`
	RevokedAt    int64  `json:"revoked_at" yaml:"revoked_at"`
	Reason       string `json:"reason" yaml:"reason"`
}

// ==================== ZERO-KNOWLEDGE CREDENTIAL MESSAGES ====================

// MsgZKProofData defines ZK proof data for messages
type MsgZKProofData struct {
	Protocol      string                 `json:"protocol" yaml:"protocol"`
	ProofData     string                 `json:"proof_data" yaml:"proof_data"`
	PublicSignals []string               `json:"public_signals" yaml:"public_signals"`
	Metadata      map[string]interface{} `json:"metadata,omitempty" yaml:"metadata,omitempty"`
}

// MsgPrivacyParameters defines privacy parameters for messages
type MsgPrivacyParameters struct {
	NullifierSeed    string   `json:"nullifier_seed,omitempty" yaml:"nullifier_seed,omitempty"`
	CommitmentScheme string   `json:"commitment_scheme" yaml:"commitment_scheme"`
	AnonymitySet     []string `json:"anonymity_set,omitempty" yaml:"anonymity_set,omitempty"`
	PrivacyLevel     string   `json:"privacy_level" yaml:"privacy_level"`
}

// MsgIssueZKCredential defines the message for issuing a zero-knowledge credential
type MsgIssueZKCredential struct {
	Holder            string                    `json:"holder" yaml:"holder"`
	CircuitId         string                    `json:"circuit_id" yaml:"circuit_id"`
	PublicInputs      map[string]interface{}    `json:"public_inputs" yaml:"public_inputs"`
	ZkProof           *MsgZKProofData           `json:"zk_proof" yaml:"zk_proof"`
	PrivacyParameters *MsgPrivacyParameters     `json:"privacy_parameters" yaml:"privacy_parameters"`
}

// NewMsgIssueZKCredential creates a new MsgIssueZKCredential instance
func NewMsgIssueZKCredential(
	holder, circuitId string,
	publicInputs map[string]interface{},
	zkProof *MsgZKProofData,
	privacyParams *MsgPrivacyParameters,
) *MsgIssueZKCredential {
	return &MsgIssueZKCredential{
		Holder:            holder,
		CircuitId:         circuitId,
		PublicInputs:      publicInputs,
		ZkProof:           zkProof,
		PrivacyParameters: privacyParams,
	}
}

// Route returns the message route
func (msg *MsgIssueZKCredential) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgIssueZKCredential) Type() string {
	return TypeMsgIssueZKCredential
}

// GetSigners returns the signers of the message
func (msg *MsgIssueZKCredential) GetSigners() []sdk.AccAddress {
	holder, err := sdk.AccAddressFromBech32(msg.Holder)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{holder}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgIssueZKCredential) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgIssueZKCredential) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Holder)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid holder address (%s)", err)
	}

	if msg.CircuitId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "circuit ID cannot be empty")
	}

	if msg.ZkProof == nil {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "ZK proof cannot be nil")
	}

	if msg.ZkProof.Protocol == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "ZK proof protocol cannot be empty")
	}

	if msg.ZkProof.ProofData == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "ZK proof data cannot be empty")
	}

	if msg.PrivacyParameters == nil {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "privacy parameters cannot be nil")
	}

	if msg.PrivacyParameters.PrivacyLevel == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "privacy level cannot be empty")
	}

	return nil
}

// MsgIssueZKCredentialResponse defines the response for MsgIssueZKCredential
type MsgIssueZKCredentialResponse struct {
	ZkCredentialId string `json:"zk_credential_id" yaml:"zk_credential_id"`
	CircuitId      string `json:"circuit_id" yaml:"circuit_id"`
	IssuedAt       int64  `json:"issued_at" yaml:"issued_at"`
	PrivacyLevel   string `json:"privacy_level" yaml:"privacy_level"`
}

// MsgVerifyZKProof defines the message for verifying a zero-knowledge proof
type MsgVerifyZKProof struct {
	Verifier       string `json:"verifier" yaml:"verifier"`
	ZkCredentialId string `json:"zk_credential_id" yaml:"zk_credential_id"`
}

// NewMsgVerifyZKProof creates a new MsgVerifyZKProof instance
func NewMsgVerifyZKProof(verifier, zkCredentialId string) *MsgVerifyZKProof {
	return &MsgVerifyZKProof{
		Verifier:       verifier,
		ZkCredentialId: zkCredentialId,
	}
}

// Route returns the message route
func (msg *MsgVerifyZKProof) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgVerifyZKProof) Type() string {
	return TypeMsgVerifyZKProof
}

// GetSigners returns the signers of the message
func (msg *MsgVerifyZKProof) GetSigners() []sdk.AccAddress {
	verifier, err := sdk.AccAddressFromBech32(msg.Verifier)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{verifier}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgVerifyZKProof) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgVerifyZKProof) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Verifier)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid verifier address (%s)", err)
	}

	if msg.ZkCredentialId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "ZK credential ID cannot be empty")
	}

	return nil
}

// MsgVerifyZKProofResponse defines the response for MsgVerifyZKProof
type MsgVerifyZKProofResponse struct {
	ZkCredentialId string `json:"zk_credential_id" yaml:"zk_credential_id"`
	IsValid        bool   `json:"is_valid" yaml:"is_valid"`
	VerifiedAt     int64  `json:"verified_at" yaml:"verified_at"`
	CircuitId      string `json:"circuit_id" yaml:"circuit_id"`
}

// ==================== COMPLIANCE MESSAGES ====================

// MsgUpdateCompliance defines the message for updating compliance data
type MsgUpdateCompliance struct {
	Auditor        string      `json:"auditor" yaml:"auditor"`
	IdentityId     string      `json:"identity_id" yaml:"identity_id"`
	ComplianceType string      `json:"compliance_type" yaml:"compliance_type"`
	ComplianceData interface{} `json:"compliance_data" yaml:"compliance_data"`
}

// NewMsgUpdateCompliance creates a new MsgUpdateCompliance instance
func NewMsgUpdateCompliance(auditor, identityId, complianceType string, complianceData interface{}) *MsgUpdateCompliance {
	return &MsgUpdateCompliance{
		Auditor:        auditor,
		IdentityId:     identityId,
		ComplianceType: complianceType,
		ComplianceData: complianceData,
	}
}

// Route returns the message route
func (msg *MsgUpdateCompliance) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgUpdateCompliance) Type() string {
	return TypeMsgUpdateCompliance
}

// GetSigners returns the signers of the message
func (msg *MsgUpdateCompliance) GetSigners() []sdk.AccAddress {
	auditor, err := sdk.AccAddressFromBech32(msg.Auditor)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{auditor}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgUpdateCompliance) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgUpdateCompliance) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Auditor)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid auditor address (%s)", err)
	}

	if msg.IdentityId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "identity ID cannot be empty")
	}

	if msg.ComplianceType == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "compliance type cannot be empty")
	}

	// Validate compliance type
	switch msg.ComplianceType {
	case "gdpr", "ccpa", "hipaa", "sox":
		// Valid
	default:
		return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "unsupported compliance type: %s", msg.ComplianceType)
	}

	if msg.ComplianceData == nil {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "compliance data cannot be nil")
	}

	return nil
}

// MsgUpdateComplianceResponse defines the response for MsgUpdateCompliance
type MsgUpdateComplianceResponse struct {
	IdentityId     string `json:"identity_id" yaml:"identity_id"`
	ComplianceType string `json:"compliance_type" yaml:"compliance_type"`
	UpdatedAt      int64  `json:"updated_at" yaml:"updated_at"`
	Success        bool   `json:"success" yaml:"success"`
}

// MsgPerformAudit defines the message for performing a compliance audit
type MsgPerformAudit struct {
	Auditor    string `json:"auditor" yaml:"auditor"`
	IdentityId string `json:"identity_id" yaml:"identity_id"`
	AuditType  string `json:"audit_type" yaml:"audit_type"`
}

// NewMsgPerformAudit creates a new MsgPerformAudit instance
func NewMsgPerformAudit(auditor, identityId, auditType string) *MsgPerformAudit {
	return &MsgPerformAudit{
		Auditor:    auditor,
		IdentityId: identityId,
		AuditType:  auditType,
	}
}

// Route returns the message route
func (msg *MsgPerformAudit) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgPerformAudit) Type() string {
	return TypeMsgPerformAudit
}

// GetSigners returns the signers of the message
func (msg *MsgPerformAudit) GetSigners() []sdk.AccAddress {
	auditor, err := sdk.AccAddressFromBech32(msg.Auditor)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{auditor}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgPerformAudit) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgPerformAudit) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Auditor)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid auditor address (%s)", err)
	}

	if msg.IdentityId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "identity ID cannot be empty")
	}

	if msg.AuditType == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "audit type cannot be empty")
	}

	// Validate audit type
	switch msg.AuditType {
	case "gdpr", "ccpa", "hipaa", "sox", "comprehensive":
		// Valid
	default:
		return errorsmod.Wrapf(sdkerrors.ErrInvalidRequest, "unsupported audit type: %s", msg.AuditType)
	}

	return nil
}

// MsgPerformAuditResponse defines the response for MsgPerformAudit
type MsgPerformAuditResponse struct {
	IdentityId   string   `json:"identity_id" yaml:"identity_id"`
	AuditId      string   `json:"audit_id" yaml:"audit_id"`
	AuditType    string   `json:"audit_type" yaml:"audit_type"`
	Score        int32    `json:"score" yaml:"score"`
	Status       string   `json:"status" yaml:"status"`
	Findings     []string `json:"findings" yaml:"findings"`
	Remediation  []string `json:"remediation" yaml:"remediation"`
	PerformedAt  int64    `json:"performed_at" yaml:"performed_at"`
	NextAuditDue int64    `json:"next_audit_due" yaml:"next_audit_due"`
}

// ==================== PERMISSION MESSAGES ====================

// MsgGrantPermission defines the message for granting a permission
type MsgGrantPermission struct {
	Grantor    string `json:"grantor" yaml:"grantor"`
	IdentityId string `json:"identity_id" yaml:"identity_id"`
	Resource   string `json:"resource" yaml:"resource"`
	Action     string `json:"action" yaml:"action"`
	Grantee    string `json:"grantee" yaml:"grantee"`
	ExpiresAt  int64  `json:"expires_at,omitempty" yaml:"expires_at,omitempty"`
}

// NewMsgGrantPermission creates a new MsgGrantPermission instance
func NewMsgGrantPermission(grantor, identityId, resource, action, grantee string, expiresAt int64) *MsgGrantPermission {
	return &MsgGrantPermission{
		Grantor:    grantor,
		IdentityId: identityId,
		Resource:   resource,
		Action:     action,
		Grantee:    grantee,
		ExpiresAt:  expiresAt,
	}
}

// Route returns the message route
func (msg *MsgGrantPermission) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgGrantPermission) Type() string {
	return TypeMsgGrantPermission
}

// GetSigners returns the signers of the message
func (msg *MsgGrantPermission) GetSigners() []sdk.AccAddress {
	grantor, err := sdk.AccAddressFromBech32(msg.Grantor)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{grantor}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgGrantPermission) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgGrantPermission) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Grantor)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid grantor address (%s)", err)
	}

	if msg.IdentityId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "identity ID cannot be empty")
	}

	if msg.Resource == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "resource cannot be empty")
	}

	if msg.Action == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "action cannot be empty")
	}

	if msg.Grantee == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "grantee cannot be empty")
	}

	// Validate expiration date if provided
	if msg.ExpiresAt > 0 {
		expTime := time.Unix(msg.ExpiresAt, 0)
		if expTime.Before(time.Now()) {
			return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "expiration date cannot be in the past")
		}
	}

	return nil
}

// MsgGrantPermissionResponse defines the response for MsgGrantPermission
type MsgGrantPermissionResponse struct {
	IdentityId string `json:"identity_id" yaml:"identity_id"`
	Resource   string `json:"resource" yaml:"resource"`
	Action     string `json:"action" yaml:"action"`
	Grantee    string `json:"grantee" yaml:"grantee"`
	GrantedAt  int64  `json:"granted_at" yaml:"granted_at"`
	ExpiresAt  int64  `json:"expires_at,omitempty" yaml:"expires_at,omitempty"`
}

// MsgRevokePermission defines the message for revoking a permission
type MsgRevokePermission struct {
	Revoker      string `json:"revoker" yaml:"revoker"`
	IdentityId   string `json:"identity_id" yaml:"identity_id"`
	PermissionId string `json:"permission_id" yaml:"permission_id"`
}

// NewMsgRevokePermission creates a new MsgRevokePermission instance
func NewMsgRevokePermission(revoker, identityId, permissionId string) *MsgRevokePermission {
	return &MsgRevokePermission{
		Revoker:      revoker,
		IdentityId:   identityId,
		PermissionId: permissionId,
	}
}

// Route returns the message route
func (msg *MsgRevokePermission) Route() string {
	return RouterKey
}

// Type returns the message type
func (msg *MsgRevokePermission) Type() string {
	return TypeMsgRevokePermission
}

// GetSigners returns the signers of the message
func (msg *MsgRevokePermission) GetSigners() []sdk.AccAddress {
	revoker, err := sdk.AccAddressFromBech32(msg.Revoker)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{revoker}
}

// GetSignBytes returns the bytes for signing
func (msg *MsgRevokePermission) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic performs basic validation of the message
func (msg *MsgRevokePermission) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Revoker)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid revoker address (%s)", err)
	}

	if msg.IdentityId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "identity ID cannot be empty")
	}

	if msg.PermissionId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "permission ID cannot be empty")
	}

	return nil
}

// MsgRevokePermissionResponse defines the response for MsgRevokePermission
type MsgRevokePermissionResponse struct {
	IdentityId   string `json:"identity_id" yaml:"identity_id"`
	PermissionId string `json:"permission_id" yaml:"permission_id"`
	RevokedAt    int64  `json:"revoked_at" yaml:"revoked_at"`
	Success      bool   `json:"success" yaml:"success"`
}

// ==================== HELPER FUNCTIONS ====================

// validateProtocolIdentityData validates protocol identity data
func validateProtocolIdentityData(data *MsgProtocolIdentityData) error {
	if data == nil {
		return fmt.Errorf("protocol identity data cannot be nil")
	}

	if data.Protocol == "" {
		return fmt.Errorf("protocol cannot be empty")
	}

	if data.Identifier == "" {
		return fmt.Errorf("identifier cannot be empty")
	}

	// Validate protocol type
	switch ProtocolType(data.Protocol) {
	case ProtocolOAuth2, ProtocolOIDC, ProtocolSAML, ProtocolDID, ProtocolVC, ProtocolVP, ProtocolWebAuthn, ProtocolZKProof:
		// Valid
	default:
		return fmt.Errorf("unsupported protocol: %s", data.Protocol)
	}

	return nil
}