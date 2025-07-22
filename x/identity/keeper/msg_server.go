package keeper

import (
	"context"
	"fmt"
	"time"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/persona-chain/persona-chain/x/identity/types"
)

// msgServer implements the identity MsgServer interface
type msgServer struct {
	Keeper
}

// NewMsgServerImpl creates a new identity message server
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

var _ types.MsgServer = msgServer{}

// ==================== UNIVERSAL IDENTITY MESSAGES ====================

// CreateIdentity creates a new universal identity
func (ms msgServer) CreateIdentity(goCtx context.Context, msg *types.MsgCreateIdentity) (*types.MsgCreateIdentityResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Parse initial protocols
	initialProtocols := make(map[types.ProtocolType]*types.ProtocolIdentity)
	for _, protocolData := range msg.InitialProtocols {
		protocol := types.ProtocolType(protocolData.Protocol)
		protocolIdentity := &types.ProtocolIdentity{
			Protocol:    protocol,
			Identifier:  protocolData.Identifier,
			Claims:      protocolData.Claims,
			Metadata:    protocolData.Metadata,
			IsVerified:  protocolData.IsVerified,
		}
		initialProtocols[protocol] = protocolIdentity
	}

	// Create universal identity
	identity, err := ms.Keeper.CreateUniversalIdentity(
		ctx,
		msg.Creator,
		initialProtocols,
		types.SecurityLevel(msg.SecurityLevel),
	)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	return &types.MsgCreateIdentityResponse{
		IdentityId: identity.ID,
		Did:        identity.DID,
		CreatedAt:  identity.CreatedAt.Unix(),
	}, nil
}

// UpdateIdentity updates an existing universal identity
func (ms msgServer) UpdateIdentity(goCtx context.Context, msg *types.MsgUpdateIdentity) (*types.MsgUpdateIdentityResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Update identity
	identity, err := ms.Keeper.UpdateUniversalIdentity(
		ctx,
		msg.IdentityId,
		msg.Updater,
		msg.Updates,
	)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	return &types.MsgUpdateIdentityResponse{
		IdentityId: identity.ID,
		UpdatedAt:  identity.UpdatedAt.Unix(),
	}, nil
}

// AddProtocolIdentity adds a new protocol identity to an existing universal identity
func (ms msgServer) AddProtocolIdentity(goCtx context.Context, msg *types.MsgAddProtocolIdentity) (*types.MsgAddProtocolIdentityResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Create protocol identity
	protocolIdentity := &types.ProtocolIdentity{
		Protocol:    types.ProtocolType(msg.Protocol),
		Identifier:  msg.Identifier,
		Claims:      msg.Claims,
		Metadata:    msg.Metadata,
		IsVerified:  msg.IsVerified,
	}

	// Add to identity
	err := ms.Keeper.AddProtocolIdentity(
		ctx,
		msg.IdentityId,
		types.ProtocolType(msg.Protocol),
		protocolIdentity,
		msg.Requestor,
	)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	return &types.MsgAddProtocolIdentityResponse{
		IdentityId: msg.IdentityId,
		Protocol:   msg.Protocol,
		Success:    true,
	}, nil
}

// ==================== VERIFIABLE CREDENTIAL MESSAGES ====================

// IssueCredential issues a new verifiable credential
func (ms msgServer) IssueCredential(goCtx context.Context, msg *types.MsgIssueCredential) (*types.MsgIssueCredentialResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Parse expiration date
	var expirationDate *time.Time
	if msg.ExpirationDate > 0 {
		expDate := time.Unix(msg.ExpirationDate, 0)
		expirationDate = &expDate
	}

	// Issue credential
	credential, err := ms.Keeper.IssueVerifiableCredential(
		ctx,
		msg.Issuer,
		msg.SubjectDid,
		msg.CredentialType,
		msg.CredentialSubject,
		expirationDate,
	)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	return &types.MsgIssueCredentialResponse{
		CredentialId:   credential.ID,
		CredentialType: credential.Type,
		IssuedAt:       credential.IssuanceDate.Unix(),
		ExpiresAt:      func() int64 {
			if credential.ExpirationDate != nil {
				return credential.ExpirationDate.Unix()
			}
			return 0
		}(),
	}, nil
}

// VerifyCredential verifies a verifiable credential
func (ms msgServer) VerifyCredential(goCtx context.Context, msg *types.MsgVerifyCredential) (*types.MsgVerifyCredentialResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Get credential
	credential, err := ms.Keeper.GetVerifiableCredential(ctx, msg.CredentialId)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrNotFound, "credential not found")
	}

	// Verify credential (implement verification logic)
	isValid, reason := ms.verifyCredentialIntegrity(ctx, credential)
	
	// Record verification attempt in audit trail
	ms.Keeper.recordAuditEntry(ctx, msg.CredentialId, "VERIFY_CREDENTIAL", msg.Verifier, 
		func() string {
			if isValid {
				return "success"
			}
			return "failed"
		}(), map[string]interface{}{
		"verifier": msg.Verifier,
		"reason": reason,
	})

	return &types.MsgVerifyCredentialResponse{
		CredentialId: msg.CredentialId,
		IsValid:      isValid,
		VerifiedAt:   time.Now().Unix(),
		Reason:       reason,
	}, nil
}

// RevokeCredential revokes a verifiable credential
func (ms msgServer) RevokeCredential(goCtx context.Context, msg *types.MsgRevokeCredential) (*types.MsgRevokeCredentialResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Get credential
	credential, err := ms.Keeper.GetVerifiableCredential(ctx, msg.CredentialId)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrNotFound, "credential not found")
	}

	// Check if issuer is authorized to revoke
	if credential.Issuer != msg.Revoker {
		return nil, errorsmod.Wrap(sdkerrors.ErrUnauthorized, "only issuer can revoke credential")
	}

	// Revoke credential
	err = ms.Keeper.RevokeVerifiableCredential(ctx, msg.CredentialId, msg.Reason)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Record revocation in audit trail
	ms.Keeper.recordAuditEntry(ctx, msg.CredentialId, "REVOKE_CREDENTIAL", msg.Revoker, "success", map[string]interface{}{
		"reason": msg.Reason,
	})

	return &types.MsgRevokeCredentialResponse{
		CredentialId: msg.CredentialId,
		RevokedAt:    time.Now().Unix(),
		Reason:       msg.Reason,
	}, nil
}

// ==================== ZERO-KNOWLEDGE CREDENTIAL MESSAGES ====================

// IssueZKCredential issues a zero-knowledge verifiable credential
func (ms msgServer) IssueZKCredential(goCtx context.Context, msg *types.MsgIssueZKCredential) (*types.MsgIssueZKCredentialResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Create ZK proof
	zkProof := &types.ZKProof{
		Protocol:      msg.ZkProof.Protocol,
		ProofData:     msg.ZkProof.ProofData,
		PublicSignals: msg.ZkProof.PublicSignals,
		Metadata:      msg.ZkProof.Metadata,
	}

	// Create privacy parameters
	privacyParams := &types.PrivacyParameters{
		NullifierSeed:    msg.PrivacyParameters.NullifierSeed,
		CommitmentScheme: msg.PrivacyParameters.CommitmentScheme,
		AnonymitySet:     msg.PrivacyParameters.AnonymitySet,
		PrivacyLevel:     msg.PrivacyParameters.PrivacyLevel,
	}

	// Issue ZK credential
	zkCredential, err := ms.Keeper.IssueZKCredential(
		ctx,
		msg.Holder,
		msg.CircuitId,
		msg.PublicInputs,
		zkProof,
		privacyParams,
	)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	return &types.MsgIssueZKCredentialResponse{
		ZkCredentialId: zkCredential.ID,
		CircuitId:      zkCredential.CircuitID,
		IssuedAt:       zkCredential.CreatedAt.Unix(),
		PrivacyLevel:   zkCredential.PrivacyParameters.PrivacyLevel,
	}, nil
}

// VerifyZKProof verifies a zero-knowledge proof
func (ms msgServer) VerifyZKProof(goCtx context.Context, msg *types.MsgVerifyZKProof) (*types.MsgVerifyZKProofResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Get ZK credential
	zkCredential, err := ms.Keeper.GetZKCredential(ctx, msg.ZkCredentialId)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrNotFound, "ZK credential not found")
	}

	// Verify ZK proof
	isValid := ms.Keeper.verifyZKProof(ctx, zkCredential)

	// Record verification attempt
	ms.Keeper.recordAuditEntry(ctx, msg.ZkCredentialId, "VERIFY_ZK_PROOF", msg.Verifier, 
		func() string {
			if isValid {
				return "success"
			}
			return "failed"
		}(), map[string]interface{}{
		"verifier": msg.Verifier,
		"circuit_id": zkCredential.CircuitID,
	})

	return &types.MsgVerifyZKProofResponse{
		ZkCredentialId: msg.ZkCredentialId,
		IsValid:        isValid,
		VerifiedAt:     time.Now().Unix(),
		CircuitId:      zkCredential.CircuitID,
	}, nil
}

// ==================== COMPLIANCE MESSAGES ====================

// UpdateCompliance updates compliance data for an identity
func (ms msgServer) UpdateCompliance(goCtx context.Context, msg *types.MsgUpdateCompliance) (*types.MsgUpdateComplianceResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Update compliance data
	err := ms.Keeper.UpdateComplianceData(
		ctx,
		msg.IdentityId,
		msg.ComplianceType,
		msg.ComplianceData,
		msg.Auditor,
	)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	return &types.MsgUpdateComplianceResponse{
		IdentityId:      msg.IdentityId,
		ComplianceType:  msg.ComplianceType,
		UpdatedAt:       time.Now().Unix(),
		Success:         true,
	}, nil
}

// PerformAudit performs a compliance audit on an identity
func (ms msgServer) PerformAudit(goCtx context.Context, msg *types.MsgPerformAudit) (*types.MsgPerformAuditResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Get identity
	identity, err := ms.Keeper.GetUniversalIdentity(ctx, msg.IdentityId)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrNotFound, "identity not found")
	}

	// Perform audit
	auditResult := ms.performComplianceAudit(ctx, identity, msg.AuditType)

	// Store audit result
	identity.ComplianceData.AuditResults = append(identity.ComplianceData.AuditResults, *auditResult)
	now := time.Now()
	identity.ComplianceData.LastAudit = &now
	
	// Set next audit date (90 days from now)
	nextAudit := now.AddDate(0, 0, 90)
	identity.ComplianceData.NextAudit = &nextAudit
	
	identity.UpdatedAt = time.Now()

	if err := ms.Keeper.setUniversalIdentity(ctx, identity); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "failed to store audit result")
	}

	// Record audit completion
	ms.Keeper.recordAuditEntry(ctx, msg.IdentityId, "PERFORM_AUDIT", msg.Auditor, "success", map[string]interface{}{
		"audit_type": msg.AuditType,
		"audit_score": auditResult.Score,
		"findings_count": len(auditResult.Findings),
	})

	return &types.MsgPerformAuditResponse{
		IdentityId:      msg.IdentityId,
		AuditId:         auditResult.AuditID,
		AuditType:       msg.AuditType,
		Score:           int32(auditResult.Score),
		Status:          auditResult.Status,
		Findings:        auditResult.Findings,
		Remediation:     auditResult.Remediation,
		PerformedAt:     auditResult.AuditDate.Unix(),
		NextAuditDue:    nextAudit.Unix(),
	}, nil
}

// ==================== PERMISSION MESSAGES ====================

// GrantPermission grants a permission to an identity
func (ms msgServer) GrantPermission(goCtx context.Context, msg *types.MsgGrantPermission) (*types.MsgGrantPermissionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Parse expiration date
	var expiresAt *time.Time
	if msg.ExpiresAt > 0 {
		expDate := time.Unix(msg.ExpiresAt, 0)
		expiresAt = &expDate
	}

	// Grant permission
	err := ms.Keeper.GrantPermission(
		ctx,
		msg.IdentityId,
		msg.Resource,
		msg.Action,
		msg.Grantee,
		msg.Grantor,
		expiresAt,
	)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	return &types.MsgGrantPermissionResponse{
		IdentityId: msg.IdentityId,
		Resource:   msg.Resource,
		Action:     msg.Action,
		Grantee:    msg.Grantee,
		GrantedAt:  time.Now().Unix(),
		ExpiresAt:  func() int64 {
			if expiresAt != nil {
				return expiresAt.Unix()
			}
			return 0
		}(),
	}, nil
}

// RevokePermission revokes a permission from an identity
func (ms msgServer) RevokePermission(goCtx context.Context, msg *types.MsgRevokePermission) (*types.MsgRevokePermissionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate message
	if err := msg.ValidateBasic(); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Revoke permission
	err := ms.Keeper.RevokePermission(
		ctx,
		msg.IdentityId,
		msg.PermissionId,
		msg.Revoker,
	)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	return &types.MsgRevokePermissionResponse{
		IdentityId:   msg.IdentityId,
		PermissionId: msg.PermissionId,
		RevokedAt:    time.Now().Unix(),
		Success:      true,
	}, nil
}

// ==================== HELPER METHODS ====================

// verifyCredentialIntegrity verifies the integrity of a verifiable credential
func (ms msgServer) verifyCredentialIntegrity(ctx sdk.Context, credential *types.VerifiableCredential) (bool, string) {
	// Check expiration
	if credential.ExpirationDate != nil && credential.ExpirationDate.Before(time.Now()) {
		return false, "credential has expired"
	}

	// Check revocation status
	if credential.Status != nil {
		isRevoked, err := ms.Keeper.IsCredentialRevoked(ctx, credential.ID)
		if err != nil {
			return false, "failed to check revocation status"
		}
		if isRevoked {
			return false, "credential has been revoked"
		}
	}

	// Verify cryptographic proof
	if credential.Proof != nil {
		if !ms.verifyCryptographicProof(ctx, credential) {
			return false, "cryptographic proof verification failed"
		}
	}

	// Verify issuer
	if !ms.verifyIssuer(ctx, credential.Issuer) {
		return false, "issuer verification failed"
	}

	return true, "credential is valid"
}

// verifyCryptographicProof verifies the cryptographic proof of a credential
func (ms msgServer) verifyCryptographicProof(ctx sdk.Context, credential *types.VerifiableCredential) bool {
	// In production, implement actual cryptographic verification
	// This would verify the proof against the verification method
	return true // Placeholder
}

// verifyIssuer verifies that the issuer is authorized to issue credentials
func (ms msgServer) verifyIssuer(ctx sdk.Context, issuer interface{}) bool {
	// In production, implement issuer verification logic
	// This would check against a registry of authorized issuers
	return true // Placeholder
}

// performComplianceAudit performs a compliance audit on an identity
func (ms msgServer) performComplianceAudit(ctx sdk.Context, identity *types.UniversalIdentity, auditType string) *types.AuditResult {
	auditResult := &types.AuditResult{
		AuditID:      fmt.Sprintf("audit_%d_%s", ctx.BlockHeight(), identity.ID),
		AuditType:    auditType,
		Status:       "completed",
		Score:        0,
		Findings:     make([]string, 0),
		Remediation:  make([]string, 0),
		AuditDate:    time.Now(),
		AuditorInfo:  make(map[string]interface{}),
	}

	// Perform specific audit checks based on type
	switch auditType {
	case "gdpr":
		auditResult.Score += ms.auditGDPRCompliance(identity, auditResult)
	case "ccpa":
		auditResult.Score += ms.auditCCPACompliance(identity, auditResult)
	case "hipaa":
		auditResult.Score += ms.auditHIPAACompliance(identity, auditResult)
	case "sox":
		auditResult.Score += ms.auditSOXCompliance(identity, auditResult)
	case "comprehensive":
		auditResult.Score += ms.auditGDPRCompliance(identity, auditResult)
		auditResult.Score += ms.auditCCPACompliance(identity, auditResult)
		auditResult.Score += ms.auditHIPAACompliance(identity, auditResult)
		auditResult.Score += ms.auditSOXCompliance(identity, auditResult)
		auditResult.Score /= 4 // Average score
	default:
		auditResult.Score = 85 // Default passing score
	}

	// Determine overall audit status
	if auditResult.Score >= 90 {
		auditResult.Status = "excellent"
	} else if auditResult.Score >= 75 {
		auditResult.Status = "good"
	} else if auditResult.Score >= 60 {
		auditResult.Status = "acceptable"
	} else {
		auditResult.Status = "requires_attention"
	}

	return auditResult
}

// auditGDPRCompliance performs GDPR compliance audit
func (ms msgServer) auditGDPRCompliance(identity *types.UniversalIdentity, result *types.AuditResult) int {
	score := 100

	if identity.ComplianceData.GDPR == nil {
		result.Findings = append(result.Findings, "GDPR compliance data not initialized")
		result.Remediation = append(result.Remediation, "Initialize GDPR compliance data")
		score -= 20
	} else {
		gdpr := identity.ComplianceData.GDPR
		
		if !gdpr.ConsentGiven {
			result.Findings = append(result.Findings, "User consent not properly documented")
			result.Remediation = append(result.Remediation, "Obtain and document proper user consent")
			score -= 15
		}

		if gdpr.LawfulBasis == "" {
			result.Findings = append(result.Findings, "Lawful basis for processing not specified")
			result.Remediation = append(result.Remediation, "Document lawful basis for data processing")
			score -= 10
		}

		if !gdpr.RightToErasure {
			result.Findings = append(result.Findings, "Right to erasure not implemented")
			result.Remediation = append(result.Remediation, "Implement right to erasure functionality")
			score -= 10
		}
	}

	return score
}

// auditCCPACompliance performs CCPA compliance audit
func (ms msgServer) auditCCPACompliance(identity *types.UniversalIdentity, result *types.AuditResult) int {
	score := 100

	if identity.ComplianceData.CCPA == nil {
		result.Findings = append(result.Findings, "CCPA compliance data not initialized")
		result.Remediation = append(result.Remediation, "Initialize CCPA compliance data")
		score -= 20
	} else {
		ccpa := identity.ComplianceData.CCPA
		
		if !ccpa.RightToDelete {
			result.Findings = append(result.Findings, "Right to delete not implemented")
			result.Remediation = append(result.Remediation, "Implement right to delete functionality")
			score -= 15
		}

		if !ccpa.RightToKnow {
			result.Findings = append(result.Findings, "Right to know not implemented")
			result.Remediation = append(result.Remediation, "Implement right to know functionality")
			score -= 10
		}
	}

	return score
}

// auditHIPAACompliance performs HIPAA compliance audit
func (ms msgServer) auditHIPAACompliance(identity *types.UniversalIdentity, result *types.AuditResult) int {
	score := 100

	if identity.ComplianceData.HIPAA == nil {
		result.Findings = append(result.Findings, "HIPAA compliance data not initialized")
		result.Remediation = append(result.Remediation, "Initialize HIPAA compliance data if handling PHI")
		score -= 10 // Less critical if not handling health data
	} else {
		hipaa := identity.ComplianceData.HIPAA
		
		if hipaa.PHIProcessed && !hipaa.SecurityRule {
			result.Findings = append(result.Findings, "HIPAA Security Rule not implemented while processing PHI")
			result.Remediation = append(result.Remediation, "Implement HIPAA Security Rule compliance")
			score -= 25
		}

		if hipaa.PHIProcessed && !hipaa.PrivacyRule {
			result.Findings = append(result.Findings, "HIPAA Privacy Rule not implemented while processing PHI")
			result.Remediation = append(result.Remediation, "Implement HIPAA Privacy Rule compliance")
			score -= 25
		}
	}

	return score
}

// auditSOXCompliance performs SOX compliance audit
func (ms msgServer) auditSOXCompliance(identity *types.UniversalIdentity, result *types.AuditResult) int {
	score := 100

	if identity.ComplianceData.SOX == nil {
		result.Findings = append(result.Findings, "SOX compliance data not initialized")
		result.Remediation = append(result.Remediation, "Initialize SOX compliance data if applicable")
		score -= 5 // Less critical for most applications
	} else {
		sox := identity.ComplianceData.SOX
		
		if sox.PublicCompany && !sox.InternalControls {
			result.Findings = append(result.Findings, "Internal controls not implemented for public company")
			result.Remediation = append(result.Remediation, "Implement SOX internal controls")
			score -= 20
		}

		if sox.FinancialReporting && !sox.AuditorIndependence {
			result.Findings = append(result.Findings, "Auditor independence not maintained")
			result.Remediation = append(result.Remediation, "Ensure auditor independence compliance")
			score -= 15
		}
	}

	return score
}