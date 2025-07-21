package simulation

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/simulation"

	"github.com/persona-chain/persona-chain/x/did/keeper"
	"github.com/persona-chain/persona-chain/x/did/types"
)

const (
	// DID module invariants
	DidDocumentConsistency = "did-document-consistency"
	ActiveDidValidation    = "active-did-validation"
	CreatorValidation      = "creator-validation"
)

// RegisterInvariants registers all DID module invariants
func RegisterInvariants(ir sdk.InvariantRegistry, k keeper.Keeper) {
	ir.RegisterRoute(types.ModuleName, DidDocumentConsistency,
		DidDocumentConsistencyInvariant(k))
	ir.RegisterRoute(types.ModuleName, ActiveDidValidation,
		ActiveDidValidationInvariant(k))
	ir.RegisterRoute(types.ModuleName, CreatorValidation,
		CreatorValidationInvariant(k))
}

// DidDocumentConsistencyInvariant checks that all DID documents are properly formatted and consistent
func DidDocumentConsistencyInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allDids := k.GetAllDidDocument(ctx)
		
		for _, didDoc := range allDids {
			// Check that DID ID is not empty
			if didDoc.Id == "" {
				broken = true
				msg += fmt.Sprintf("DID document has empty ID\n")
				continue
			}

			// Check that DID document content is not empty
			if didDoc.DidDocument == "" {
				broken = true
				msg += fmt.Sprintf("DID %s has empty document content\n", didDoc.Id)
			}

			// Check that creator is not empty
			if didDoc.Creator == "" {
				broken = true
				msg += fmt.Sprintf("DID %s has empty creator\n", didDoc.Id)
			}

			// Check that created timestamp is valid
			if didDoc.CreatedAt <= 0 {
				broken = true
				msg += fmt.Sprintf("DID %s has invalid created timestamp: %d\n", didDoc.Id, didDoc.CreatedAt)
			}

			// Check that updated timestamp is valid and >= created timestamp
			if didDoc.UpdatedAt <= 0 || didDoc.UpdatedAt < didDoc.CreatedAt {
				broken = true
				msg += fmt.Sprintf("DID %s has invalid updated timestamp: %d (created: %d)\n", 
					didDoc.Id, didDoc.UpdatedAt, didDoc.CreatedAt)
			}

			// Verify that the DID can be retrieved by its ID
			retrievedDid, found := k.GetDidDocument(ctx, didDoc.Id)
			if !found {
				broken = true
				msg += fmt.Sprintf("DID %s exists in store but cannot be retrieved\n", didDoc.Id)
			} else if retrievedDid.Id != didDoc.Id {
				broken = true
				msg += fmt.Sprintf("DID %s retrieved with different ID: %s\n", didDoc.Id, retrievedDid.Id)
			}

			// Verify DID existence check consistency
			exists := k.DidDocumentExists(ctx, didDoc.Id)
			if !exists {
				broken = true
				msg += fmt.Sprintf("DID %s exists but DidDocumentExists returns false\n", didDoc.Id)
			}
		}

		return simulation.FormatInvariant(types.ModuleName, DidDocumentConsistency,
			fmt.Sprintf("DID document consistency invariant\n%s", msg)), broken
	}
}

// ActiveDidValidationInvariant checks that active DIDs meet all requirements
func ActiveDidValidationInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allDids := k.GetAllDidDocument(ctx)
		activeDidsCount := 0
		
		for _, didDoc := range allDids {
			if didDoc.Active {
				activeDidsCount++

				// Active DIDs must have valid creator addresses
				_, err := sdk.AccAddressFromBech32(didDoc.Creator)
				if err != nil {
					broken = true
					msg += fmt.Sprintf("Active DID %s has invalid creator address: %s\n", didDoc.Id, didDoc.Creator)
				}

				// Active DIDs must have non-empty document content
				if didDoc.DidDocument == "" {
					broken = true
					msg += fmt.Sprintf("Active DID %s has empty document content\n", didDoc.Id)
				}

				// Active DIDs should have reasonable timestamps
				if didDoc.CreatedAt <= 0 || didDoc.UpdatedAt <= 0 {
					broken = true
					msg += fmt.Sprintf("Active DID %s has invalid timestamps (created: %d, updated: %d)\n", 
						didDoc.Id, didDoc.CreatedAt, didDoc.UpdatedAt)
				}
			}
		}

		// Verify that we have a reasonable number of active DIDs (not all deactivated)
		if len(allDids) > 0 && activeDidsCount == 0 {
			broken = true
			msg += "All DIDs are deactivated - this may indicate a system issue\n"
		}

		return simulation.FormatInvariant(types.ModuleName, ActiveDidValidation,
			fmt.Sprintf("Active DID validation invariant\n%s", msg)), broken
	}
}

// CreatorValidationInvariant checks that DID creators are valid and consistent
func CreatorValidationInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allDids := k.GetAllDidDocument(ctx)
		creatorDidCount := make(map[string]int)
		
		for _, didDoc := range allDids {
			// Validate creator address format
			creatorAddr, err := sdk.AccAddressFromBech32(didDoc.Creator)
			if err != nil {
				broken = true
				msg += fmt.Sprintf("DID %s has invalid creator address format: %s\n", didDoc.Id, didDoc.Creator)
				continue
			}

			// Count DIDs per creator
			creatorDidCount[creatorAddr.String()]++

			// Check for reasonable limits (no single creator should have too many DIDs in simulation)
			if creatorDidCount[creatorAddr.String()] > 100 {
				broken = true
				msg += fmt.Sprintf("Creator %s has excessive number of DIDs: %d\n", 
					creatorAddr.String(), creatorDidCount[creatorAddr.String()])
			}
		}

		// Verify that creators are distributed reasonably
		if len(creatorDidCount) == 1 && len(allDids) > 10 {
			broken = true
			msg += fmt.Sprintf("All %d DIDs belong to single creator - lacks diversity\n", len(allDids))
		}

		return simulation.FormatInvariant(types.ModuleName, CreatorValidation,
			fmt.Sprintf("Creator validation invariant\n%s", msg)), broken
	}
}