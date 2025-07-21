pragma circom 2.0.0;

/*
 * Income Threshold Circuit
 * Proves that a person's income meets a minimum threshold
 * without revealing their exact income amount
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/mimc.circom";

template IncomeThreshold() {
    // Public inputs
    signal input minimum_income;           // Minimum income required
    signal input verification_timestamp;   // Timestamp of verification
    
    // Private inputs
    signal input actual_income;           // Actual income amount
    signal input income_proof_hash;       // Hash of income proof documents
    signal input salt;                    // Random salt for commitment
    
    // Outputs
    signal output commitment;             // Commitment to the private data
    signal output nullifier;              // Nullifier for double-spending prevention
    signal output valid;                  // Boolean indicating if income requirement is met
    
    // Components
    component poseidon_commit = Poseidon(4);
    component poseidon_nullifier = Poseidon(3);
    component income_check = GreaterEqThan(64);
    component range_check_min = GreaterEqThan(32);
    component range_check_max = LessThan(32);
    
    // Verify actual income is in reasonable range
    // Min: $0, Max: $10,000,000 (to prevent overflow attacks)
    range_check_min.in[0] <== actual_income;
    range_check_min.in[1] <== 0;
    range_check_min.out === 1;
    
    range_check_max.in[0] <== actual_income;
    range_check_max.in[1] <== 10000000;
    range_check_max.out === 1;
    
    // Check if actual income meets minimum requirement
    income_check.in[0] <== actual_income;
    income_check.in[1] <== minimum_income;
    valid <== income_check.out;
    
    // Generate commitment to private data
    poseidon_commit.inputs[0] <== actual_income;
    poseidon_commit.inputs[1] <== income_proof_hash;
    poseidon_commit.inputs[2] <== salt;
    poseidon_commit.inputs[3] <== verification_timestamp;
    commitment <== poseidon_commit.out;
    
    // Generate nullifier for uniqueness
    poseidon_nullifier.inputs[0] <== actual_income;
    poseidon_nullifier.inputs[1] <== income_proof_hash;
    poseidon_nullifier.inputs[2] <== salt;
    nullifier <== poseidon_nullifier.out;
    
    // Constraint: income verification must be valid
    valid === 1;
}

component main = IncomeThreshold();