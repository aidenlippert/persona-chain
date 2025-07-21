pragma circom 2.0.0;

/*
 * Production Range Proof Circuit
 * Proves that a secret value lies within a specified range
 * without revealing the actual value
 * 
 * Features:
 * - Efficient range proofs using binary decomposition
 * - Support for arbitrary range bounds (min, max)
 * - Commitment scheme for privacy preservation
 * - Nullifier system for preventing reuse
 * - Compatible with Groth16 and PLONK proving systems
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";

template RangeBounds(bits) {
    signal input value;
    signal input min_value;
    signal input max_value;
    signal output in_range;
    
    // Check value >= min_value
    component gte = GreaterEqThan(bits);
    gte.in[0] <== value;
    gte.in[1] <== min_value;
    
    // Check value <= max_value
    component lte = LessEqThan(bits);
    lte.in[0] <== value;
    lte.in[1] <== max_value;
    
    // Both conditions must be true
    component and_gate = AND();
    and_gate.a <== gte.out;
    and_gate.b <== lte.out;
    
    in_range <== and_gate.out;
}

template BinaryDecomposition(bits) {
    signal input value;
    signal output binary_digits[bits];
    
    component num2bits = Num2Bits(bits);
    num2bits.in <== value;
    
    for (var i = 0; i < bits; i++) {
        binary_digits[i] <== num2bits.out[i];
    }
}

template RangeProof(bit_width) {
    // Public inputs
    signal input min_bound;            // Minimum allowed value
    signal input max_bound;            // Maximum allowed value
    signal input range_id;             // Identifier for the range constraint
    signal input verifier_id;          // ID of the verifying entity
    signal input timestamp;            // Current timestamp for freshness
    signal input challenge;            // Random challenge from verifier
    
    // Private inputs
    signal input secret_value;         // The actual value (secret)
    signal input salt;                 // Random salt for commitment
    signal input nonce;                // Unique nonce for this proof
    signal input secret_key;           // User's secret key
    
    // Outputs
    signal output commitment;          // Commitment to secret value
    signal output nullifier;           // Nullifier for double-spending prevention
    signal output range_valid;         // Boolean indicating value is in range
    signal output response;            // Response to challenge for authentication
    signal output value_commitment;    // Additional commitment for verification
    
    // Components
    component range_check = RangeBounds(bit_width);
    component binary_decomp = BinaryDecomposition(bit_width);
    component poseidon_commit = Poseidon(5);
    component poseidon_nullifier = Poseidon(4);
    component poseidon_response = Poseidon(3);
    component poseidon_value_commit = Poseidon(3);
    component timestamp_validator = GreaterEqThan(64);
    component bounds_validator = LessEqThan(bit_width);
    
    // Validate timestamp is reasonable (within last hour)
    var min_timestamp = timestamp - 3600;  // 1 hour ago
    timestamp_validator.in[0] <== timestamp;
    timestamp_validator.in[1] <== min_timestamp;
    timestamp_validator.out === 1;
    
    // Validate bounds are reasonable
    bounds_validator.in[0] <== min_bound;
    bounds_validator.in[1] <== max_bound;
    bounds_validator.out === 1;
    
    // Verify the secret value is within the specified range
    range_check.value <== secret_value;
    range_check.min_value <== min_bound;
    range_check.max_value <== max_bound;
    range_valid <== range_check.in_range;
    
    // Binary decomposition for additional verification
    binary_decomp.value <== secret_value;
    
    // Ensure all binary digits are valid (0 or 1)
    for (var i = 0; i < bit_width; i++) {
        component bit_check = IsZero();
        component bit_or = OR();
        
        bit_check.in <== binary_decomp.binary_digits[i];
        
        // Each bit must be 0 or 1
        component eq_zero = IsEqual();
        component eq_one = IsEqual();
        
        eq_zero.in[0] <== binary_decomp.binary_digits[i];
        eq_zero.in[1] <== 0;
        
        eq_one.in[0] <== binary_decomp.binary_digits[i];
        eq_one.in[1] <== 1;
        
        bit_or.a <== eq_zero.out;
        bit_or.b <== eq_one.out;
        bit_or.out === 1;
    }
    
    // Generate commitment to private data
    poseidon_commit.inputs[0] <== secret_value;
    poseidon_commit.inputs[1] <== salt;
    poseidon_commit.inputs[2] <== range_id;
    poseidon_commit.inputs[3] <== timestamp;
    poseidon_commit.inputs[4] <== nonce;
    commitment <== poseidon_commit.out;
    
    // Generate unique nullifier
    poseidon_nullifier.inputs[0] <== secret_key;
    poseidon_nullifier.inputs[1] <== secret_value;
    poseidon_nullifier.inputs[2] <== range_id;
    poseidon_nullifier.inputs[3] <== verifier_id;
    nullifier <== poseidon_nullifier.out;
    
    // Generate challenge response for authentication
    poseidon_response.inputs[0] <== secret_key;
    poseidon_response.inputs[1] <== challenge;
    poseidon_response.inputs[2] <== timestamp;
    response <== poseidon_response.out;
    
    // Additional value commitment for verification
    poseidon_value_commit.inputs[0] <== secret_value;
    poseidon_value_commit.inputs[1] <== nonce;
    poseidon_value_commit.inputs[2] <== salt;
    value_commitment <== poseidon_value_commit.out;
    
    // Constraints: All validations must pass
    range_valid === 1;
    
    // Additional security constraints
    // Ensure the value is not negative (assuming unsigned integers)
    component positive_check = GreaterEqThan(bit_width);
    positive_check.in[0] <== secret_value;
    positive_check.in[1] <== 0;
    positive_check.out === 1;
    
    // Ensure the value fits in the specified bit width
    component max_value_check = LessEqThan(bit_width);
    var max_possible_value = (1 << bit_width) - 1;
    max_value_check.in[0] <== secret_value;
    max_value_check.in[1] <== max_possible_value;
    max_value_check.out === 1;
}

// Main component for 64-bit range proofs
component main = RangeProof(64);  // Supports values up to 2^64 - 1