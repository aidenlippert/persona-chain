pragma circom 2.0.0;

/*
 * Simple Age Verification Circuit for PersonaPass
 * Proves that a person is above 18 years old
 * without revealing their exact age or date of birth
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template SimpleAgeProof() {
    // Public inputs
    signal input minimum_age;          // Minimum age required (e.g., 18)
    signal input current_timestamp;    // Current timestamp for verification
    
    // Private inputs
    signal input birth_timestamp;      // Birth date as timestamp
    signal input salt;                 // Random salt for commitment
    
    // Outputs
    signal output commitment;          // Commitment to the private data
    signal output valid;               // Boolean indicating if age requirement is met
    
    // Calculate age in seconds
    signal age_in_seconds <== current_timestamp - birth_timestamp;
    
    // Convert minimum age from years to seconds (18 years = 567,993,600 seconds)
    signal min_age_seconds <== minimum_age * 31557600; // seconds per year
    
    // Check if age meets minimum requirement
    component age_check = GreaterEqThan(64);
    age_check.in[0] <== age_in_seconds;
    age_check.in[1] <== min_age_seconds;
    
    valid <== age_check.out;
    
    // Create commitment using Poseidon hash
    component poseidon_commit = Poseidon(3);
    poseidon_commit.inputs[0] <== birth_timestamp;
    poseidon_commit.inputs[1] <== salt;
    poseidon_commit.inputs[2] <== current_timestamp;
    commitment <== poseidon_commit.out;
    
    // Ensure age check passes
    valid === 1;
}

component main = SimpleAgeProof();