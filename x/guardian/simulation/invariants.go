package simulation

import (
	"fmt"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/simulation"

	"github.com/persona-chain/persona-chain/x/guardian/keeper"
	"github.com/persona-chain/persona-chain/x/guardian/types"
)

const (
	// Guardian module invariants
	GuardianConsistency      = "guardian-consistency"
	RecoveryProposalLogic    = "recovery-proposal-logic"
	ThresholdValidation      = "threshold-validation"
	GuardianDidRelationship  = "guardian-did-relationship"
	ProposalStatusConsistency = "proposal-status-consistency"
)

// RegisterInvariants registers all Guardian module invariants
func RegisterInvariants(ir sdk.InvariantRegistry, k keeper.Keeper, didKeeper types.DidKeeper) {
	ir.RegisterRoute(types.ModuleName, GuardianConsistency,
		GuardianConsistencyInvariant(k))
	ir.RegisterRoute(types.ModuleName, RecoveryProposalLogic,
		RecoveryProposalLogicInvariant(k))
	ir.RegisterRoute(types.ModuleName, ThresholdValidation,
		ThresholdValidationInvariant(k))
	ir.RegisterRoute(types.ModuleName, GuardianDidRelationship,
		GuardianDidRelationshipInvariant(k, didKeeper))
	ir.RegisterRoute(types.ModuleName, ProposalStatusConsistency,
		ProposalStatusConsistencyInvariant(k))
}

// GuardianConsistencyInvariant checks that all guardians have consistent data
func GuardianConsistencyInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allGuardians := k.GetAllGuardian(ctx)
		
		for _, guardian := range allGuardians {
			// Check required fields
			if guardian.DidId == "" {
				broken = true
				msg += fmt.Sprintf("Guardian has empty DID ID\n")
				continue
			}

			if guardian.GuardianAddress == "" {
				broken = true
				msg += fmt.Sprintf("Guardian for DID %s has empty guardian address\n", guardian.DidId)
			}

			if guardian.PublicKey == "" {
				broken = true
				msg += fmt.Sprintf("Guardian %s for DID %s has empty public key\n", guardian.GuardianAddress, guardian.DidId)
			}

			// Validate guardian address format
			_, err := sdk.AccAddressFromBech32(guardian.GuardianAddress)
			if err != nil {
				broken = true
				msg += fmt.Sprintf("Guardian for DID %s has invalid address: %s\n", guardian.DidId, guardian.GuardianAddress)
			}

			// Check timestamps
			if guardian.AddedAt <= 0 {
				broken = true
				msg += fmt.Sprintf("Guardian %s for DID %s has invalid added timestamp: %d\n", 
					guardian.GuardianAddress, guardian.DidId, guardian.AddedAt)
			}

			// Verify guardian can be retrieved
			retrievedGuardian, found := k.GetGuardian(ctx, guardian.DidId, guardian.GuardianAddress)
			if !found {
				broken = true
				msg += fmt.Sprintf("Guardian %s for DID %s exists in store but cannot be retrieved\n", 
					guardian.GuardianAddress, guardian.DidId)
			} else if retrievedGuardian.GuardianAddress != guardian.GuardianAddress {
				broken = true
				msg += fmt.Sprintf("Guardian retrieved with different address: expected %s, got %s\n", 
					guardian.GuardianAddress, retrievedGuardian.GuardianAddress)
			}

			// Verify IsGuardian check consistency
			isGuardian := k.IsGuardian(ctx, guardian.DidId, guardian.GuardianAddress)
			if guardian.Active && !isGuardian {
				broken = true
				msg += fmt.Sprintf("Active guardian %s for DID %s not recognized by IsGuardian\n", 
					guardian.GuardianAddress, guardian.DidId)
			} else if !guardian.Active && isGuardian {
				broken = true
				msg += fmt.Sprintf("Inactive guardian %s for DID %s still recognized by IsGuardian\n", 
					guardian.GuardianAddress, guardian.DidId)
			}
		}

		return simulation.FormatInvariant(types.ModuleName, GuardianConsistency,
			fmt.Sprintf("Guardian consistency invariant\n%s", msg)), broken
	}
}

// RecoveryProposalLogicInvariant ensures recovery proposals follow correct logic
func RecoveryProposalLogicInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allProposals := k.GetAllRecoveryProposal(ctx)
		currentTime := time.Now().Unix()
		
		for _, proposal := range allProposals {
			// Check required fields
			if proposal.Id == "" {
				broken = true
				msg += fmt.Sprintf("Recovery proposal has empty ID\n")
				continue
			}

			if proposal.DidId == "" {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s has empty DID ID\n", proposal.Id)
			}

			if proposal.Proposer == "" {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s has empty proposer\n", proposal.Id)
			}

			if proposal.NewController == "" {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s has empty new controller\n", proposal.Id)
			}

			// Validate addresses
			_, err := sdk.AccAddressFromBech32(proposal.Proposer)
			if err != nil {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s has invalid proposer address: %s\n", proposal.Id, proposal.Proposer)
			}

			_, err = sdk.AccAddressFromBech32(proposal.NewController)
			if err != nil {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s has invalid new controller address: %s\n", proposal.Id, proposal.NewController)
			}

			// Check timestamps
			if proposal.CreatedAt <= 0 {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s has invalid creation timestamp: %d\n", proposal.Id, proposal.CreatedAt)
			}

			if proposal.ExpiresAt <= proposal.CreatedAt {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s expires before or at creation (created: %d, expires: %d)\n", 
					proposal.Id, proposal.CreatedAt, proposal.ExpiresAt)
			}

			// Check execution logic
			if proposal.ExecutedAt > 0 {
				// Executed proposals must be approved
				if proposal.Status != "approved" && proposal.Status != "executed" {
					broken = true
					msg += fmt.Sprintf("Executed proposal %s has incorrect status: %s\n", proposal.Id, proposal.Status)
				}

				// Execution timestamp must be after creation
				if proposal.ExecutedAt <= proposal.CreatedAt {
					broken = true
					msg += fmt.Sprintf("Recovery proposal %s executed before creation (created: %d, executed: %d)\n", 
						proposal.Id, proposal.CreatedAt, proposal.ExecutedAt)
				}

				// Cannot execute after expiration
				if proposal.ExecutedAt > proposal.ExpiresAt {
					broken = true
					msg += fmt.Sprintf("Recovery proposal %s executed after expiration (expires: %d, executed: %d)\n", 
						proposal.Id, proposal.ExpiresAt, proposal.ExecutedAt)
				}
			}

			// Check approval/rejection logic
			if len(proposal.Approvals) > 0 {
				for _, approval := range proposal.Approvals {
					_, err := sdk.AccAddressFromBech32(approval)
					if err != nil {
						broken = true
						msg += fmt.Sprintf("Recovery proposal %s has invalid approval address: %s\n", proposal.Id, approval)
					}
				}
			}

			if len(proposal.Rejections) > 0 {
				for _, rejection := range proposal.Rejections {
					_, err := sdk.AccAddressFromBech32(rejection)
					if err != nil {
						broken = true
						msg += fmt.Sprintf("Recovery proposal %s has invalid rejection address: %s\n", proposal.Id, rejection)
					}
				}
			}

			// Check for duplicate votes
			approvalMap := make(map[string]bool)
			for _, approval := range proposal.Approvals {
				if approvalMap[approval] {
					broken = true
					msg += fmt.Sprintf("Recovery proposal %s has duplicate approval from: %s\n", proposal.Id, approval)
				}
				approvalMap[approval] = true
			}

			rejectionMap := make(map[string]bool)
			for _, rejection := range proposal.Rejections {
				if rejectionMap[rejection] {
					broken = true
					msg += fmt.Sprintf("Recovery proposal %s has duplicate rejection from: %s\n", proposal.Id, rejection)
				}
				rejectionMap[rejection] = true

				// Cannot both approve and reject
				if approvalMap[rejection] {
					broken = true
					msg += fmt.Sprintf("Recovery proposal %s has conflicting votes from: %s\n", proposal.Id, rejection)
				}
			}

			// Check status transitions
			switch proposal.Status {
			case "pending":
				if proposal.ExecutedAt > 0 {
					broken = true
					msg += fmt.Sprintf("Pending proposal %s has execution timestamp\n", proposal.Id)
				}
			case "approved":
				// Approved proposals should have sufficient approvals (we'll check in threshold invariant)
			case "rejected":
				if proposal.ExecutedAt > 0 {
					broken = true
					msg += fmt.Sprintf("Rejected proposal %s has execution timestamp\n", proposal.Id)
				}
			case "expired":
				if proposal.ExpiresAt > currentTime {
					broken = true
					msg += fmt.Sprintf("Proposal %s marked expired but not yet expired (expires: %d, current: %d)\n", 
						proposal.Id, proposal.ExpiresAt, currentTime)
				}
			case "executed":
				if proposal.ExecutedAt <= 0 {
					broken = true
					msg += fmt.Sprintf("Executed proposal %s has no execution timestamp\n", proposal.Id)
				}
			default:
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s has invalid status: %s\n", proposal.Id, proposal.Status)
			}

			// Verify proposal can be retrieved
			retrievedProposal, found := k.GetRecoveryProposal(ctx, proposal.Id)
			if !found {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s exists in store but cannot be retrieved\n", proposal.Id)
			} else if retrievedProposal.Id != proposal.Id {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s retrieved with different ID: %s\n", proposal.Id, retrievedProposal.Id)
			}
		}

		return simulation.FormatInvariant(types.ModuleName, RecoveryProposalLogic,
			fmt.Sprintf("Recovery proposal logic invariant\n%s", msg)), broken
	}
}

// ThresholdValidationInvariant ensures threshold logic is correctly applied
func ThresholdValidationInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allProposals := k.GetAllRecoveryProposal(ctx)
		
		for _, proposal := range allProposals {
			// Get guardians for this DID
			guardians := k.GetGuardiansByDid(ctx, proposal.DidId)
			activeGuardians := make([]types.Guardian, 0)
			for _, guardian := range guardians {
				if guardian.Active {
					activeGuardians = append(activeGuardians, guardian)
				}
			}

			if len(activeGuardians) == 0 {
				broken = true
				msg += fmt.Sprintf("Recovery proposal %s references DID %s with no active guardians\n", 
					proposal.Id, proposal.DidId)
				continue
			}

			// Calculate threshold (majority)
			threshold := len(activeGuardians)/2 + 1

			// Check if proposal status matches vote counts
			approvalCount := len(proposal.Approvals)
			rejectionCount := len(proposal.Rejections)

			switch proposal.Status {
			case "approved":
				if approvalCount < threshold {
					broken = true
					msg += fmt.Sprintf("Approved proposal %s has insufficient approvals: %d < %d (threshold)\n", 
						proposal.Id, approvalCount, threshold)
				}
			case "rejected":
				// A proposal can be rejected if enough guardians reject OR if it's impossible to reach threshold
				remainingGuardians := len(activeGuardians) - approvalCount - rejectionCount
				maxPossibleApprovals := approvalCount + remainingGuardians
				
				if rejectionCount >= threshold {
					// Explicitly rejected by majority
				} else if maxPossibleApprovals < threshold {
					// Impossible to reach threshold
				} else {
					broken = true
					msg += fmt.Sprintf("Rejected proposal %s could still reach threshold (approvals: %d, rejections: %d, remaining: %d, threshold: %d)\n", 
						proposal.Id, approvalCount, rejectionCount, remainingGuardians, threshold)
				}
			case "pending":
				// Pending proposals should not have reached approval threshold yet
				if approvalCount >= threshold {
					broken = true
					msg += fmt.Sprintf("Pending proposal %s has reached approval threshold: %d >= %d\n", 
						proposal.Id, approvalCount, threshold)
				}
			}

			// Verify that all approvers and rejectors are actual guardians
			guardianAddresses := make(map[string]bool)
			for _, guardian := range activeGuardians {
				guardianAddresses[guardian.GuardianAddress] = true
			}

			for _, approver := range proposal.Approvals {
				if !guardianAddresses[approver] {
					broken = true
					msg += fmt.Sprintf("Recovery proposal %s has approval from non-guardian: %s\n", proposal.Id, approver)
				}
			}

			for _, rejecter := range proposal.Rejections {
				if !guardianAddresses[rejecter] {
					broken = true
					msg += fmt.Sprintf("Recovery proposal %s has rejection from non-guardian: %s\n", proposal.Id, rejecter)
				}
			}

			// Verify voting helper functions
			for _, guardian := range activeGuardians {
				hasApproved := k.HasApproved(proposal, guardian.GuardianAddress)
				hasRejected := k.HasRejected(proposal, guardian.GuardianAddress)

				// Check approval consistency
				foundInApprovals := false
				for _, approver := range proposal.Approvals {
					if approver == guardian.GuardianAddress {
						foundInApprovals = true
						break
					}
				}
				if hasApproved != foundInApprovals {
					broken = true
					msg += fmt.Sprintf("HasApproved inconsistency for guardian %s in proposal %s\n", 
						guardian.GuardianAddress, proposal.Id)
				}

				// Check rejection consistency
				foundInRejections := false
				for _, rejecter := range proposal.Rejections {
					if rejecter == guardian.GuardianAddress {
						foundInRejections = true
						break
					}
				}
				if hasRejected != foundInRejections {
					broken = true
					msg += fmt.Sprintf("HasRejected inconsistency for guardian %s in proposal %s\n", 
						guardian.GuardianAddress, proposal.Id)
				}
			}
		}

		return simulation.FormatInvariant(types.ModuleName, ThresholdValidation,
			fmt.Sprintf("Threshold validation invariant\n%s", msg)), broken
	}
}

// GuardianDidRelationshipInvariant ensures guardians reference valid DIDs
func GuardianDidRelationshipInvariant(k keeper.Keeper, didKeeper types.DidKeeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allGuardians := k.GetAllGuardian(ctx)
		
		for _, guardian := range allGuardians {
			// Check that referenced DID exists
			didDoc, found := didKeeper.GetDidDocument(ctx, guardian.DidId)
			if !found {
				broken = true
				msg += fmt.Sprintf("Guardian %s references non-existent DID: %s\n", 
					guardian.GuardianAddress, guardian.DidId)
				continue
			}

			// For active guardians, DID should generally be active too
			// (though we might allow guardians to remain for recovery of deactivated DIDs)
			if guardian.Active && !didDoc.Active {
				// This is a warning, not necessarily broken
				// Guardian recovery is specifically for deactivated/compromised DIDs
			}

			// Verify guardian indexing by DID
			guardiansForDid := k.GetGuardiansByDid(ctx, guardian.DidId)
			foundInIndex := false
			for _, indexedGuardian := range guardiansForDid {
				if indexedGuardian.GuardianAddress == guardian.GuardianAddress {
					foundInIndex = true
					break
				}
			}
			if !foundInIndex {
				broken = true
				msg += fmt.Sprintf("Guardian %s for DID %s not found in DID index\n", 
					guardian.GuardianAddress, guardian.DidId)
			}
		}

		// Verify reverse indexing consistency
		allDids := didKeeper.GetAllDidDocument(ctx)
		for _, didDoc := range allDids {
			guardiansForDid := k.GetGuardiansByDid(ctx, didDoc.Id)
			
			// Each indexed guardian should exist in the main guardian store
			for _, indexedGuardian := range guardiansForDid {
				retrievedGuardian, found := k.GetGuardian(ctx, didDoc.Id, indexedGuardian.GuardianAddress)
				if !found {
					broken = true
					msg += fmt.Sprintf("DID %s index contains non-existent guardian: %s\n", 
						didDoc.Id, indexedGuardian.GuardianAddress)
				} else if retrievedGuardian.GuardianAddress != indexedGuardian.GuardianAddress {
					broken = true
					msg += fmt.Sprintf("Guardian address mismatch in DID %s index\n", didDoc.Id)
				}
			}
		}

		return simulation.FormatInvariant(types.ModuleName, GuardianDidRelationship,
			fmt.Sprintf("Guardian-DID relationship invariant\n%s", msg)), broken
	}
}

// ProposalStatusConsistencyInvariant ensures proposal status changes are consistent
func ProposalStatusConsistencyInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allProposals := k.GetAllRecoveryProposal(ctx)
		currentTime := time.Now().Unix()
		
		statusCounts := make(map[string]int)
		for _, proposal := range allProposals {
			statusCounts[proposal.Status]++

			// Check time-based status consistency
			if proposal.ExpiresAt <= currentTime && proposal.Status == "pending" {
				broken = true
				msg += fmt.Sprintf("Proposal %s is expired but still marked as pending\n", proposal.Id)
			}

			// Executed proposals should maintain their executed status
			if proposal.ExecutedAt > 0 && proposal.Status != "executed" && proposal.Status != "approved" {
				broken = true
				msg += fmt.Sprintf("Executed proposal %s has inconsistent status: %s\n", proposal.Id, proposal.Status)
			}

			// Proposals cannot change after execution
			if proposal.ExecutedAt > 0 && proposal.ExecutedAt < currentTime-3600 { // More than 1 hour old
				// In a real system, we'd check that no modifications happened after execution
				// For simulation, we just verify the status is appropriate
				if proposal.Status != "executed" {
					broken = true
					msg += fmt.Sprintf("Old executed proposal %s has wrong status: %s\n", proposal.Id, proposal.Status)
				}
			}

			// Check for reasonable proposal distribution
			if len(allProposals) > 20 {
				pendingRatio := float64(statusCounts["pending"]) / float64(len(allProposals))
				if pendingRatio > 0.8 {
					broken = true
					msg += fmt.Sprintf("Too many pending proposals (%d/%d = %.2f%%) - may indicate processing issues\n", 
						statusCounts["pending"], len(allProposals), pendingRatio*100)
				}
			}
		}

		return simulation.FormatInvariant(types.ModuleName, ProposalStatusConsistency,
			fmt.Sprintf("Proposal status consistency invariant\n%s", msg)), broken
	}
}