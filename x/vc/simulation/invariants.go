package simulation

import (
	"fmt"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/simulation"

	"github.com/persona-chain/persona-chain/x/vc/keeper"
	"github.com/persona-chain/persona-chain/x/vc/types"
)

const (
	// VC module invariants
	VcIssuanceConsistency     = "vc-issuance-consistency"
	VcRevocationValidation    = "vc-revocation-validation"
	VcDidReferenceValidation  = "vc-did-reference-validation"
	VcExpirationValidation    = "vc-expiration-validation"
	VcIndexingConsistency     = "vc-indexing-consistency"
)

// RegisterInvariants registers all VC module invariants
func RegisterInvariants(ir sdk.InvariantRegistry, k keeper.Keeper, didKeeper types.DidKeeper) {
	ir.RegisterRoute(types.ModuleName, VcIssuanceConsistency,
		VcIssuanceConsistencyInvariant(k))
	ir.RegisterRoute(types.ModuleName, VcRevocationValidation,
		VcRevocationValidationInvariant(k))
	ir.RegisterRoute(types.ModuleName, VcDidReferenceValidation,
		VcDidReferenceValidationInvariant(k, didKeeper))
	ir.RegisterRoute(types.ModuleName, VcExpirationValidation,
		VcExpirationValidationInvariant(k))
	ir.RegisterRoute(types.ModuleName, VcIndexingConsistency,
		VcIndexingConsistencyInvariant(k))
}

// VcIssuanceConsistencyInvariant checks that all VCs have consistent issuance data
func VcIssuanceConsistencyInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allVcs := k.GetAllVcRecord(ctx)
		
		for _, vc := range allVcs {
			// Check required fields are not empty
			if vc.Id == "" {
				broken = true
				msg += fmt.Sprintf("VC has empty ID\n")
				continue
			}

			if vc.IssuerDid == "" {
				broken = true
				msg += fmt.Sprintf("VC %s has empty issuer DID\n", vc.Id)
			}

			if vc.SubjectDid == "" {
				broken = true
				msg += fmt.Sprintf("VC %s has empty subject DID\n", vc.Id)
			}

			if vc.CredentialSchema == "" {
				broken = true
				msg += fmt.Sprintf("VC %s has empty credential schema\n", vc.Id)
			}

			if vc.CredentialData == "" {
				broken = true
				msg += fmt.Sprintf("VC %s has empty credential data\n", vc.Id)
			}

			if vc.Proof == "" {
				broken = true
				msg += fmt.Sprintf("VC %s has empty proof\n", vc.Id)
			}

			// Check timestamps
			if vc.IssuedAt <= 0 {
				broken = true
				msg += fmt.Sprintf("VC %s has invalid issued timestamp: %d\n", vc.Id, vc.IssuedAt)
			}

			if vc.ExpiresAt <= 0 {
				broken = true
				msg += fmt.Sprintf("VC %s has invalid expiration timestamp: %d\n", vc.Id, vc.ExpiresAt)
			}

			if vc.ExpiresAt <= vc.IssuedAt {
				broken = true
				msg += fmt.Sprintf("VC %s expires before or at issuance (issued: %d, expires: %d)\n", 
					vc.Id, vc.IssuedAt, vc.ExpiresAt)
			}

			// Verify VC can be retrieved by ID
			retrievedVc, found := k.GetVcRecord(ctx, vc.Id)
			if !found {
				broken = true
				msg += fmt.Sprintf("VC %s exists in store but cannot be retrieved\n", vc.Id)
			} else if retrievedVc.Id != vc.Id {
				broken = true
				msg += fmt.Sprintf("VC %s retrieved with different ID: %s\n", vc.Id, retrievedVc.Id)
			}

			// Verify existence check consistency
			exists := k.VcRecordExists(ctx, vc.Id)
			if !exists {
				broken = true
				msg += fmt.Sprintf("VC %s exists but VcRecordExists returns false\n", vc.Id)
			}
		}

		return simulation.FormatInvariant(types.ModuleName, VcIssuanceConsistency,
			fmt.Sprintf("VC issuance consistency invariant\n%s", msg)), broken
	}
}

// VcRevocationValidationInvariant ensures revocation rules are enforced
func VcRevocationValidationInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allVcs := k.GetAllVcRecord(ctx)
		
		for _, vc := range allVcs {
			if vc.Revoked {
				// Revoked VCs must have revocation timestamp
				if vc.RevokedAt <= 0 {
					broken = true
					msg += fmt.Sprintf("Revoked VC %s has invalid revocation timestamp: %d\n", vc.Id, vc.RevokedAt)
				}

				// Revocation timestamp must be after issuance
				if vc.RevokedAt <= vc.IssuedAt {
					broken = true
					msg += fmt.Sprintf("VC %s revoked before or at issuance (issued: %d, revoked: %d)\n", 
						vc.Id, vc.IssuedAt, vc.RevokedAt)
				}

				// Revocation timestamp cannot be in the future
				currentTime := time.Now().Unix()
				if vc.RevokedAt > currentTime {
					broken = true
					msg += fmt.Sprintf("VC %s has future revocation timestamp: %d (current: %d)\n", 
						vc.Id, vc.RevokedAt, currentTime)
				}
			} else {
				// Non-revoked VCs should not have revocation timestamp
				if vc.RevokedAt != 0 {
					broken = true
					msg += fmt.Sprintf("Non-revoked VC %s has revocation timestamp: %d\n", vc.Id, vc.RevokedAt)
				}
			}
		}

		return simulation.FormatInvariant(types.ModuleName, VcRevocationValidation,
			fmt.Sprintf("VC revocation validation invariant\n%s", msg)), broken
	}
}

// VcDidReferenceValidationInvariant ensures VC issuance only allowed by active DID controllers
func VcDidReferenceValidationInvariant(k keeper.Keeper, didKeeper types.DidKeeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allVcs := k.GetAllVcRecord(ctx)
		
		for _, vc := range allVcs {
			// Check that issuer DID exists and is active
			issuerDid, found := didKeeper.GetDidDocument(ctx, vc.IssuerDid)
			if !found {
				broken = true
				msg += fmt.Sprintf("VC %s references non-existent issuer DID: %s\n", vc.Id, vc.IssuerDid)
			} else if !issuerDid.Active {
				broken = true
				msg += fmt.Sprintf("VC %s issued by deactivated DID: %s\n", vc.Id, vc.IssuerDid)
			}

			// Check that subject DID exists (can be deactivated for issued VCs)
			subjectDid, found := didKeeper.GetDidDocument(ctx, vc.SubjectDid)
			if !found {
				broken = true
				msg += fmt.Sprintf("VC %s references non-existent subject DID: %s\n", vc.Id, vc.SubjectDid)
			}

			// For non-revoked VCs, ensure issuer DID was active at issuance
			if !vc.Revoked && found {
				// In a real system, we'd check historical state, but for simulation we just check current state
				if !issuerDid.Active {
					broken = true
					msg += fmt.Sprintf("Non-revoked VC %s has inactive issuer DID: %s\n", vc.Id, vc.IssuerDid)
				}
			}

			// Verify VC creator matches issuer DID controller (for new VCs)
			if found && vc.Creator != "" {
				creatorAddr, err := sdk.AccAddressFromBech32(vc.Creator)
				if err != nil {
					broken = true
					msg += fmt.Sprintf("VC %s has invalid creator address: %s\n", vc.Id, vc.Creator)
				} else {
					issuerCreatorAddr, err := sdk.AccAddressFromBech32(issuerDid.Creator)
					if err == nil && !creatorAddr.Equals(issuerCreatorAddr) {
						broken = true
						msg += fmt.Sprintf("VC %s creator (%s) does not match issuer DID controller (%s)\n", 
							vc.Id, vc.Creator, issuerDid.Creator)
					}
				}
			}
		}

		return simulation.FormatInvariant(types.ModuleName, VcDidReferenceValidation,
			fmt.Sprintf("VC DID reference validation invariant\n%s", msg)), broken
	}
}

// VcExpirationValidationInvariant checks VC expiration logic
func VcExpirationValidationInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allVcs := k.GetAllVcRecord(ctx)
		currentTime := time.Now().Unix()
		expiredCount := 0
		activeCount := 0
		
		for _, vc := range allVcs {
			// Check for reasonable expiration times (not too far in past/future)
			if vc.ExpiresAt < vc.IssuedAt {
				broken = true
				msg += fmt.Sprintf("VC %s expires before issuance (issued: %d, expires: %d)\n", 
					vc.Id, vc.IssuedAt, vc.ExpiresAt)
			}

			// Check for unreasonably long validity periods (more than 100 years)
			maxValidityPeriod := int64(100 * 365 * 24 * 60 * 60) // 100 years in seconds
			if vc.ExpiresAt-vc.IssuedAt > maxValidityPeriod {
				broken = true
				msg += fmt.Sprintf("VC %s has unreasonably long validity period: %d seconds\n", 
					vc.Id, vc.ExpiresAt-vc.IssuedAt)
			}

			// Count expired vs active VCs
			if vc.ExpiresAt <= currentTime {
				expiredCount++
			} else {
				activeCount++
			}

			// Expired VCs should not be revocable anymore (business rule)
			if !vc.Revoked && vc.ExpiresAt <= currentTime {
				// This is just a warning, not necessarily broken
				// In a real system, expired VCs might still be revocable for audit trails
			}
		}

		// Check for reasonable distribution of expired vs active VCs
		if len(allVcs) > 20 && expiredCount == len(allVcs) {
			broken = true
			msg += "All VCs are expired - this may indicate timestamp issues\n"
		}

		return simulation.FormatInvariant(types.ModuleName, VcExpirationValidation,
			fmt.Sprintf("VC expiration validation invariant\n%s", msg)), broken
	}
}

// VcIndexingConsistencyInvariant verifies secondary indexing consistency
func VcIndexingConsistencyInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allVcs := k.GetAllVcRecord(ctx)
		issuerIndex := make(map[string][]types.VcRecord)
		subjectIndex := make(map[string][]types.VcRecord)
		
		// Build expected indices
		for _, vc := range allVcs {
			issuerIndex[vc.IssuerDid] = append(issuerIndex[vc.IssuerDid], vc)
			subjectIndex[vc.SubjectDid] = append(subjectIndex[vc.SubjectDid], vc)
		}

		// Verify issuer index consistency
		for issuerDid, expectedVcs := range issuerIndex {
			actualVcs := k.GetVcRecordsByIssuer(ctx, issuerDid)
			
			if len(actualVcs) != len(expectedVcs) {
				broken = true
				msg += fmt.Sprintf("Issuer %s index mismatch: expected %d VCs, got %d\n", 
					issuerDid, len(expectedVcs), len(actualVcs))
			}

			// Verify all expected VCs are in the index
			expectedMap := make(map[string]bool)
			for _, vc := range expectedVcs {
				expectedMap[vc.Id] = true
			}

			for _, vc := range actualVcs {
				if !expectedMap[vc.Id] {
					broken = true
					msg += fmt.Sprintf("Issuer %s index contains unexpected VC: %s\n", issuerDid, vc.Id)
				}
				delete(expectedMap, vc.Id)
			}

			for vcId := range expectedMap {
				broken = true
				msg += fmt.Sprintf("Issuer %s index missing expected VC: %s\n", issuerDid, vcId)
			}
		}

		// Verify subject index consistency
		for subjectDid, expectedVcs := range subjectIndex {
			actualVcs := k.GetVcRecordsBySubject(ctx, subjectDid)
			
			if len(actualVcs) != len(expectedVcs) {
				broken = true
				msg += fmt.Sprintf("Subject %s index mismatch: expected %d VCs, got %d\n", 
					subjectDid, len(expectedVcs), len(actualVcs))
			}

			// Verify all expected VCs are in the index
			expectedMap := make(map[string]bool)
			for _, vc := range expectedVcs {
				expectedMap[vc.Id] = true
			}

			for _, vc := range actualVcs {
				if !expectedMap[vc.Id] {
					broken = true
					msg += fmt.Sprintf("Subject %s index contains unexpected VC: %s\n", subjectDid, vc.Id)
				}
				delete(expectedMap, vc.Id)
			}

			for vcId := range expectedMap {
				broken = true
				msg += fmt.Sprintf("Subject %s index missing expected VC: %s\n", subjectDid, vcId)
			}
		}

		return simulation.FormatInvariant(types.ModuleName, VcIndexingConsistency,
			fmt.Sprintf("VC indexing consistency invariant\n%s", msg)), broken
	}
}