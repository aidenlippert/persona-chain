pragma circom 2.1.6;

include "../lib/comparators.circom";
include "../lib/simple_merkle.circom";
include "../lib/poseidon.circom";

/*
 * GPA Verification Circuit
 * 
 * Proves that a user's GPA is above a certain threshold without revealing the actual GPA.
 * Also verifies the GPA comes from a valid commitment via Merkle proof.
 * 
 * Private Inputs:
 * - gpa: The actual GPA value (scaled by 100, e.g., 3.75 = 375)
 * - gpa_salt: Salt used in the GPA commitment
 * - merkle_proof: Array of hashes for Merkle proof
 * - merkle_proof_indices: Path indices for Merkle proof
 * 
 * Public Inputs:
 * - threshold: Minimum GPA threshold (scaled by 100)
 * - merkle_root: Root of the academic credentials Merkle tree
 * - institution_id: ID of the educational institution
 * - graduation_year: Year of graduation
 */

template GPAVerification(levels) {
    // Private inputs
    signal input gpa;
    signal input gpa_salt;
    signal input merkle_proof[levels];
    signal input merkle_proof_indices[levels];
    
    // Public inputs
    signal input threshold;
    signal input merkle_root;
    signal input institution_id;
    signal input graduation_year;
    
    // Output
    signal output valid;
    
    // Verify GPA is above threshold
    component gte = GreaterEqThan(16); // 16 bits for GPA values
    gte.in[0] <== gpa;
    gte.in[1] <== threshold;
    
    // Create commitment hash for the GPA
    component commitment_hasher = Poseidon4();
    commitment_hasher.inputs[0] <== gpa;
    commitment_hasher.inputs[1] <== gpa_salt;
    commitment_hasher.inputs[2] <== institution_id;
    commitment_hasher.inputs[3] <== graduation_year;
    
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
    
    // Constraint: GPA must be valid (0 <= GPA <= 400 for 4.0 scale)
    component gpa_range = LessThan(16);
    gpa_range.in[0] <== gpa;
    gpa_range.in[1] <== 401; // 4.01 * 100
    
    gpa_range.out === 1;
}

// Main component with 20 levels for Merkle tree
component main = GPAVerification(20);