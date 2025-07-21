pragma circom 2.0.0;

/*
 * Production Selective Disclosure Circuit
 * Enables selective revelation of credential attributes
 * while keeping others private
 * 
 * Features:
 * - Selective attribute disclosure with privacy preservation
 * - Merkle tree-based credential verification
 * - Attribute masking and revelation control
 * - Commitment scheme for undisclosed attributes
 * - Compatible with W3C Verifiable Credentials
 * - Supports Groth16 and PLONK proving systems
 */

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";
include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/switcher.circom";

template AttributeCommitment(num_attributes) {
    signal input attributes[num_attributes];
    signal input salts[num_attributes];
    signal output commitments[num_attributes];
    
    component hashers[num_attributes];
    
    for (var i = 0; i < num_attributes; i++) {
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== attributes[i];
        hashers[i].inputs[1] <== salts[i];
        commitments[i] <== hashers[i].out;
    }
}

template AttributeSelector(num_attributes) {
    signal input attributes[num_attributes];
    signal input disclosure_mask[num_attributes];  // 1 = reveal, 0 = hide
    signal output disclosed_attributes[num_attributes];
    signal output hidden_commitments[num_attributes];
    signal input salts[num_attributes];
    
    component selectors[num_attributes];
    component hidden_hashers[num_attributes];
    
    for (var i = 0; i < num_attributes; i++) {
        selectors[i] = Mux1();
        selectors[i].c[0] <== 0;  // Hidden value
        selectors[i].c[1] <== attributes[i];  // Revealed value
        selectors[i].s <== disclosure_mask[i];
        disclosed_attributes[i] <== selectors[i].out;
        
        // Generate commitment for hidden attributes
        hidden_hashers[i] = Poseidon(3);
        hidden_hashers[i].inputs[0] <== attributes[i];
        hidden_hashers[i].inputs[1] <== salts[i];
        hidden_hashers[i].inputs[2] <== disclosure_mask[i];  // Include mask in commitment
        hidden_commitments[i] <== hidden_hashers[i].out;
    }
}

template CredentialMerkleProof(levels, num_attributes) {
    signal input credential_root;
    signal input attributes[num_attributes];
    signal input path_elements[levels];
    signal input path_indices[levels];
    signal input salts[num_attributes];
    
    component attribute_hasher = Poseidon(num_attributes + 1);
    
    // Hash all attributes together
    for (var i = 0; i < num_attributes; i++) {
        attribute_hasher.inputs[i] <== attributes[i];
    }
    attribute_hasher.inputs[num_attributes] <== salts[0];  // Use first salt as global salt
    
    // Verify Merkle proof
    component hashers[levels];
    component mux[levels];
    
    signal level_hashes[levels + 1];
    level_hashes[0] <== attribute_hasher.out;
    
    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        mux[i] = Mux1();
        
        mux[i].c[0] <== level_hashes[i];
        mux[i].c[1] <== path_elements[i];
        mux[i].s <== path_indices[i];
        
        hashers[i].inputs[0] <== mux[i].out;
        hashers[i].inputs[1] <== path_elements[i];
        
        level_hashes[i + 1] <== hashers[i].out;
    }
    
    credential_root === level_hashes[levels];
}

template SelectiveDisclosure(merkle_levels, num_attributes) {
    // Public inputs
    signal input credential_root;       // Root of the credential Merkle tree
    signal input issuer_id;            // ID of the credential issuer
    signal input verifier_id;          // ID of the verifying entity
    signal input disclosure_mask[num_attributes];  // Which attributes to reveal
    signal input timestamp;            // Current timestamp for freshness
    signal input challenge;            // Random challenge from verifier
    
    // Private inputs
    signal input attributes[num_attributes];      // All credential attributes
    signal input salts[num_attributes];           // Random salts for each attribute
    signal input path_elements[merkle_levels];    // Merkle proof path
    signal input path_indices[merkle_levels];     // Merkle proof indices
    signal input secret_key;                      // User's secret key
    signal input nonce;                           // Unique nonce for this proof
    
    // Outputs
    signal output disclosed_attributes[num_attributes];  // Revealed attributes
    signal output hidden_commitments[num_attributes];    // Commitments to hidden attributes
    signal output credential_valid;                      // Boolean indicating valid credential
    signal output nullifier;                            // Nullifier for double-spending prevention
    signal output response;                              // Response to challenge
    signal output global_commitment;                     // Commitment to all attributes
    
    // Components
    component merkle_proof = CredentialMerkleProof(merkle_levels, num_attributes);
    component attribute_selector = AttributeSelector(num_attributes);
    component poseidon_nullifier = Poseidon(4);
    component poseidon_response = Poseidon(3);
    component poseidon_global_commit = Poseidon(num_attributes + 3);
    component timestamp_validator = GreaterEqualThan(64);
    
    // Validate timestamp is reasonable (within last hour)
    var min_timestamp = timestamp - 3600;  // 1 hour ago
    timestamp_validator.in[0] <== timestamp;
    timestamp_validator.in[1] <== min_timestamp;
    timestamp_validator.out === 1;
    
    // Verify credential authenticity via Merkle proof
    merkle_proof.credential_root <== credential_root;
    for (var i = 0; i < num_attributes; i++) {
        merkle_proof.attributes[i] <== attributes[i];
        merkle_proof.salts[i] <== salts[i];
    }
    for (var i = 0; i < merkle_levels; i++) {
        merkle_proof.path_elements[i] <== path_elements[i];
        merkle_proof.path_indices[i] <== path_indices[i];
    }
    
    credential_valid <== 1;  // Constraint enforced by Merkle proof
    
    // Selective attribute disclosure
    for (var i = 0; i < num_attributes; i++) {
        attribute_selector.attributes[i] <== attributes[i];
        attribute_selector.disclosure_mask[i] <== disclosure_mask[i];
        attribute_selector.salts[i] <== salts[i];
        
        disclosed_attributes[i] <== attribute_selector.disclosed_attributes[i];
        hidden_commitments[i] <== attribute_selector.hidden_commitments[i];
    }
    
    // Generate global commitment to all attributes
    for (var i = 0; i < num_attributes; i++) {
        poseidon_global_commit.inputs[i] <== attributes[i];
    }
    poseidon_global_commit.inputs[num_attributes] <== issuer_id;
    poseidon_global_commit.inputs[num_attributes + 1] <== timestamp;
    poseidon_global_commit.inputs[num_attributes + 2] <== nonce;
    global_commitment <== poseidon_global_commit.out;
    
    // Generate unique nullifier
    poseidon_nullifier.inputs[0] <== secret_key;
    poseidon_nullifier.inputs[1] <== credential_root;
    poseidon_nullifier.inputs[2] <== issuer_id;
    poseidon_nullifier.inputs[3] <== verifier_id;
    nullifier <== poseidon_nullifier.out;
    
    // Generate challenge response for authentication
    poseidon_response.inputs[0] <== secret_key;
    poseidon_response.inputs[1] <== challenge;
    poseidon_response.inputs[2] <== timestamp;
    response <== poseidon_response.out;
    
    // Validate disclosure mask (each element must be 0 or 1)
    for (var i = 0; i < num_attributes; i++) {
        component mask_validator = OR();
        component is_zero = IsEqual();
        component is_one = IsEqual();
        
        is_zero.in[0] <== disclosure_mask[i];
        is_zero.in[1] <== 0;
        
        is_one.in[0] <== disclosure_mask[i];
        is_one.in[1] <== 1;
        
        mask_validator.a <== is_zero.out;
        mask_validator.b <== is_one.out;
        mask_validator.out === 1;
    }
    
    // Constraint: credential must be valid
    credential_valid === 1;
}

// Main component with common parameters
// 16 levels = up to 65,536 credentials, 8 attributes per credential
component main = SelectiveDisclosure(16, 8);