pragma circom 2.1.6;

include "../lib/comparators.circom";
include "../lib/simple_merkle.circom";
include "../lib/poseidon.circom";

/*
 * Age Verification Circuit
 * 
 * Proves that a user's age is above a certain threshold without revealing the actual age.
 * Verifies the age comes from a valid government-issued document via Merkle proof.
 */

template AgeVerification(levels) {
    // Private inputs
    signal input age;
    signal input age_salt;
    signal input merkle_proof[levels];
    signal input merkle_proof_indices[levels];
    
    // Public inputs
    signal input minimum_age;
    signal input merkle_root;
    signal input document_type; // 1=passport, 2=license, 3=id_card
    signal input issuer_id;
    
    // Output
    signal output valid;
    
    // Verify age is above minimum
    component gte = GreaterEqThan(8); // 8 bits for ages 0-255
    gte.in[0] <== age;
    gte.in[1] <== minimum_age;
    
    // Create commitment hash for the age
    component commitment_hasher = Poseidon4();
    commitment_hasher.inputs[0] <== age;
    commitment_hasher.inputs[1] <== age_salt;
    commitment_hasher.inputs[2] <== document_type;
    commitment_hasher.inputs[3] <== issuer_id;
    
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
    
    // Constraint: Age must be reasonable (0 <= age <= 150)
    component age_range = LessThan(8);
    age_range.in[0] <== age;
    age_range.in[1] <== 151;
    
    age_range.out === 1;
}

// Main component with 16 levels for Merkle tree (smaller for government docs)
component main = AgeVerification(16);