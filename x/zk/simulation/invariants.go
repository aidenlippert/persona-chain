package simulation

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/simulation"

	"github.com/persona-chain/persona-chain/x/zk/keeper"
	"github.com/persona-chain/persona-chain/x/zk/types"
)

const (
	// ZK module invariants
	CircuitConsistency       = "circuit-consistency"
	ProofVerificationLogic   = "proof-verification-logic"
	CircuitProofRelationship = "circuit-proof-relationship"
	ActiveCircuitValidation  = "active-circuit-validation"
)

// RegisterInvariants registers all ZK module invariants
func RegisterInvariants(ir sdk.InvariantRegistry, k keeper.Keeper) {
	ir.RegisterRoute(types.ModuleName, CircuitConsistency,
		CircuitConsistencyInvariant(k))
	ir.RegisterRoute(types.ModuleName, ProofVerificationLogic,
		ProofVerificationLogicInvariant(k))
	ir.RegisterRoute(types.ModuleName, CircuitProofRelationship,
		CircuitProofRelationshipInvariant(k))
	ir.RegisterRoute(types.ModuleName, ActiveCircuitValidation,
		ActiveCircuitValidationInvariant(k))
}

// CircuitConsistencyInvariant checks that all circuits have consistent and valid data
func CircuitConsistencyInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allCircuits := k.GetAllCircuit(ctx)
		
		for _, circuit := range allCircuits {
			// Check required fields are not empty
			if circuit.Id == "" {
				broken = true
				msg += fmt.Sprintf("Circuit has empty ID\n")
				continue
			}

			if circuit.Name == "" {
				broken = true
				msg += fmt.Sprintf("Circuit %s has empty name\n", circuit.Id)
			}

			if circuit.WasmCodeHash == "" {
				broken = true
				msg += fmt.Sprintf("Circuit %s has empty WASM code hash\n", circuit.Id)
			}

			if circuit.VerificationKey == "" {
				broken = true
				msg += fmt.Sprintf("Circuit %s has empty verification key\n", circuit.Id)
			}

			if circuit.Creator == "" {
				broken = true
				msg += fmt.Sprintf("Circuit %s has empty creator\n", circuit.Id)
			}

			// Validate creator address format
			_, err := sdk.AccAddressFromBech32(circuit.Creator)
			if err != nil {
				broken = true
				msg += fmt.Sprintf("Circuit %s has invalid creator address: %s\n", circuit.Id, circuit.Creator)
			}

			// Check timestamps
			if circuit.CreatedAt <= 0 {
				broken = true
				msg += fmt.Sprintf("Circuit %s has invalid creation timestamp: %d\n", circuit.Id, circuit.CreatedAt)
			}

			// Verify circuit can be retrieved by ID
			retrievedCircuit, found := k.GetCircuit(ctx, circuit.Id)
			if !found {
				broken = true
				msg += fmt.Sprintf("Circuit %s exists in store but cannot be retrieved\n", circuit.Id)
			} else if retrievedCircuit.Id != circuit.Id {
				broken = true
				msg += fmt.Sprintf("Circuit %s retrieved with different ID: %s\n", circuit.Id, retrievedCircuit.Id)
			}

			// Verify existence check consistency
			exists := k.CircuitExists(ctx, circuit.Id)
			if !exists {
				broken = true
				msg += fmt.Sprintf("Circuit %s exists but CircuitExists returns false\n", circuit.Id)
			}
		}

		return simulation.FormatInvariant(types.ModuleName, CircuitConsistency,
			fmt.Sprintf("Circuit consistency invariant\n%s", msg)), broken
	}
}

// ProofVerificationLogicInvariant ensures proof verification follows correct logic
func ProofVerificationLogicInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allProofs := k.GetAllZkProof(ctx)
		
		for _, proof := range allProofs {
			// Check required fields
			if proof.Id == "" {
				broken = true
				msg += fmt.Sprintf("Proof has empty ID\n")
				continue
			}

			if proof.CircuitId == "" {
				broken = true
				msg += fmt.Sprintf("Proof %s has empty circuit ID\n", proof.Id)
			}

			if proof.Submitter == "" {
				broken = true
				msg += fmt.Sprintf("Proof %s has empty submitter\n", proof.Id)
			}

			if proof.PublicInputs == "" {
				broken = true
				msg += fmt.Sprintf("Proof %s has empty public inputs\n", proof.Id)
			}

			if proof.ProofData == "" {
				broken = true
				msg += fmt.Sprintf("Proof %s has empty proof data\n", proof.Id)
			}

			// Validate submitter address
			_, err := sdk.AccAddressFromBech32(proof.Submitter)
			if err != nil {
				broken = true
				msg += fmt.Sprintf("Proof %s has invalid submitter address: %s\n", proof.Id, proof.Submitter)
			}

			// Check timestamps
			if proof.SubmittedAt <= 0 {
				broken = true
				msg += fmt.Sprintf("Proof %s has invalid submission timestamp: %d\n", proof.Id, proof.SubmittedAt)
			}

			// If proof is verified, it must have verification timestamp
			if proof.Verified && proof.VerifiedAt <= 0 {
				broken = true
				msg += fmt.Sprintf("Verified proof %s has invalid verification timestamp: %d\n", proof.Id, proof.VerifiedAt)
			}

			// Verification timestamp must be after submission
			if proof.Verified && proof.VerifiedAt < proof.SubmittedAt {
				broken = true
				msg += fmt.Sprintf("Proof %s verified before submission (submitted: %d, verified: %d)\n", 
					proof.Id, proof.SubmittedAt, proof.VerifiedAt)
			}

			// Non-verified proofs should not have verification timestamp
			if !proof.Verified && proof.VerifiedAt != 0 {
				broken = true
				msg += fmt.Sprintf("Non-verified proof %s has verification timestamp: %d\n", proof.Id, proof.VerifiedAt)
			}

			// Verify proof can be retrieved by ID
			retrievedProof, found := k.GetZkProof(ctx, proof.Id)
			if !found {
				broken = true
				msg += fmt.Sprintf("Proof %s exists in store but cannot be retrieved\n", proof.Id)
			} else if retrievedProof.Id != proof.Id {
				broken = true
				msg += fmt.Sprintf("Proof %s retrieved with different ID: %s\n", proof.Id, retrievedProof.Id)
			}
		}

		return simulation.FormatInvariant(types.ModuleName, ProofVerificationLogic,
			fmt.Sprintf("Proof verification logic invariant\n%s", msg)), broken
	}
}

// CircuitProofRelationshipInvariant ensures proofs reference valid circuits
func CircuitProofRelationshipInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allProofs := k.GetAllZkProof(ctx)
		allCircuits := k.GetAllCircuit(ctx)
		
		// Build circuit map for efficient lookup
		circuitMap := make(map[string]types.Circuit)
		for _, circuit := range allCircuits {
			circuitMap[circuit.Id] = circuit
		}

		// Check each proof's circuit reference
		for _, proof := range allProofs {
			circuit, exists := circuitMap[proof.CircuitId]
			if !exists {
				broken = true
				msg += fmt.Sprintf("Proof %s references non-existent circuit: %s\n", proof.Id, proof.CircuitId)
				continue
			}

			// Verified proofs must reference active circuits at verification time
			if proof.Verified && !circuit.Active {
				broken = true
				msg += fmt.Sprintf("Verified proof %s references inactive circuit: %s\n", proof.Id, proof.CircuitId)
			}

			// Verification key consistency
			if proof.VerificationKey != "" && proof.VerificationKey != circuit.VerificationKey {
				broken = true
				msg += fmt.Sprintf("Proof %s has mismatched verification key with circuit %s\n", proof.Id, proof.CircuitId)
			}

			// Verifier contract consistency
			if proof.VerifierContract != "" && proof.VerifierContract != circuit.WasmCodeHash {
				broken = true
				msg += fmt.Sprintf("Proof %s has mismatched verifier contract with circuit %s\n", proof.Id, proof.CircuitId)
			}
		}

		// Verify circuit-proof indexing consistency
		for _, circuit := range allCircuits {
			circuitProofs := k.GetZkProofsByCircuit(ctx, circuit.Id)
			
			// Count expected proofs for this circuit
			expectedCount := 0
			for _, proof := range allProofs {
				if proof.CircuitId == circuit.Id {
					expectedCount++
				}
			}

			if len(circuitProofs) != expectedCount {
				broken = true
				msg += fmt.Sprintf("Circuit %s proof index mismatch: expected %d proofs, got %d\n", 
					circuit.Id, expectedCount, len(circuitProofs))
			}

			// Verify all indexed proofs actually reference this circuit
			for _, proof := range circuitProofs {
				if proof.CircuitId != circuit.Id {
					broken = true
					msg += fmt.Sprintf("Circuit %s index contains proof %s referencing different circuit: %s\n", 
						circuit.Id, proof.Id, proof.CircuitId)
				}
			}
		}

		return simulation.FormatInvariant(types.ModuleName, CircuitProofRelationship,
			fmt.Sprintf("Circuit-proof relationship invariant\n%s", msg)), broken
	}
}

// ActiveCircuitValidationInvariant ensures active circuits meet all requirements
func ActiveCircuitValidationInvariant(k keeper.Keeper) sdk.Invariant {
	return func(ctx sdk.Context) (string, bool) {
		var (
			broken bool
			msg    string
		)

		allCircuits := k.GetAllCircuit(ctx)
		activeCircuitsCount := 0
		
		for _, circuit := range allCircuits {
			if circuit.Active {
				activeCircuitsCount++

				// Active circuits must have all required fields
				if circuit.Name == "" || circuit.WasmCodeHash == "" || circuit.VerificationKey == "" {
					broken = true
					msg += fmt.Sprintf("Active circuit %s has missing required fields\n", circuit.Id)
				}

				// Active circuits must have valid creator
				_, err := sdk.AccAddressFromBech32(circuit.Creator)
				if err != nil {
					broken = true
					msg += fmt.Sprintf("Active circuit %s has invalid creator address: %s\n", circuit.Id, circuit.Creator)
				}

				// Active circuits should be usable for proof verification
				// In a real system, we might validate the WASM code and verification key format
			}
		}

		// Check for reasonable number of active circuits
		if len(allCircuits) > 0 && activeCircuitsCount == 0 {
			broken = true
			msg += "All circuits are inactive - this may indicate a system issue\n"
		}

		// Check for circuit diversity (not all circuits by same creator)
		if activeCircuitsCount > 5 {
			creatorCount := make(map[string]int)
			for _, circuit := range allCircuits {
				if circuit.Active {
					creatorCount[circuit.Creator]++
				}
			}

			if len(creatorCount) == 1 {
				broken = true
				msg += fmt.Sprintf("All %d active circuits belong to single creator - lacks diversity\n", activeCircuitsCount)
			}
		}

		return simulation.FormatInvariant(types.ModuleName, ActiveCircuitValidation,
			fmt.Sprintf("Active circuit validation invariant\n%s", msg)), broken
	}
}