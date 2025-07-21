pragma circom 2.1.6;

include "../lib/comparators.circom";
include "../lib/simple_merkle.circom";
include "../lib/poseidon.circom";

/*
 * Income Verification Circuit
 * 
 * Proves that a user's income is above a certain threshold without revealing the actual income.
 * Verifies the income comes from a valid financial institution via Merkle proof.
 */

template IncomeVerification(levels) {
    // Private inputs
    signal input annual_income;
    signal input income_salt;
    signal input merkle_proof[levels];
    signal input merkle_proof_indices[levels];
    
    // Public inputs
    signal input minimum_income;
    signal input merkle_root;
    signal input bank_id;
    signal input verification_year;
    
    // Output
    signal output valid;
    
    // Verify income is above minimum (using 20 bits for income up to ~$1M)
    component gte = GreaterEqThan(20);
    gte.in[0] <== annual_income;
    gte.in[1] <== minimum_income;
    
    // Create commitment hash for the income
    component commitment_hasher = Poseidon4();
    commitment_hasher.inputs[0] <== annual_income;
    commitment_hasher.inputs[1] <== income_salt;
    commitment_hasher.inputs[2] <== bank_id;
    commitment_hasher.inputs[3] <== verification_year;
    
    // Verify Merkle proof
    component merkle_verifier = SimpleMerkleProof(levels);
    merkle_verifier.leaf <== commitment_hasher.out;
    merkle_verifier.root <== merkle_root;
    
    for (var i = 0; i < levels; i++) {
        merkle_verifier.pathElements[i] <== merkle_proof[i];
        merkle_verifier.pathIndices[i] <== merkle_proof_indices[i];
    }
    
    // Both conditions must be true
    valid <== gte.out * merkle_verifier.valid;
    
    // Constraint: Income must be reasonable (0 <= income <= $10M)
    component income_range = LessThan(24);
    income_range.in[0] <== annual_income;
    income_range.in[1] <== 10000001; // $10M + 1
    
    income_range.out === 1;
}

// Main component with 18 levels for Merkle tree
component main = IncomeVerification(18);