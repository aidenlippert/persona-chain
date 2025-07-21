pragma circom 2.0.0;

/*
 * Simple Income Verification Circuit for PersonaPass
 * Proves that a person's income meets a minimum threshold
 * without revealing their exact income amount
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template SimpleIncomeProof() {
    // Public inputs
    signal input minimum_income;       // Minimum income required (e.g., 50000)
    signal input verification_timestamp; // Current timestamp
    
    // Private inputs
    signal input actual_income;        // Actual income amount
    signal input salt;                 // Random salt for commitment
    
    // Outputs
    signal output commitment;          // Commitment to the private data
    signal output valid;               // Boolean indicating if income requirement is met
    
    // Check if income meets minimum requirement
    component income_check = GreaterEqThan(32);
    income_check.in[0] <== actual_income;
    income_check.in[1] <== minimum_income;
    
    valid <== income_check.out;
    
    // Create commitment using Poseidon hash
    component poseidon_commit = Poseidon(3);
    poseidon_commit.inputs[0] <== actual_income;
    poseidon_commit.inputs[1] <== salt;
    poseidon_commit.inputs[2] <== verification_timestamp;
    commitment <== poseidon_commit.out;
    
    // Ensure income check passes
    valid === 1;
}

component main = SimpleIncomeProof();