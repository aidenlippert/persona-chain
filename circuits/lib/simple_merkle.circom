pragma circom 2.1.6;

include "./poseidon.circom";

/*
 * Simplified Merkle Proof Verification Circuit
 */

template SimpleMerkleProof(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output valid;

    component hashers[levels];
    signal computedHash[levels + 1];
    signal left[levels];
    signal right[levels];
    
    computedHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon2();
        
        // Simple left/right selection based on path index
        left[i] <== computedHash[i] + pathIndices[i] * (pathElements[i] - computedHash[i]);
        right[i] <== pathElements[i] - pathIndices[i] * (pathElements[i] - computedHash[i]);
        
        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        computedHash[i + 1] <== hashers[i].out;
    }

    // Check if computed root equals expected root
    component isZero = IsZero();
    isZero.in <== computedHash[levels] - root;
    valid <== isZero.out;
}

template IsZero() {
    signal input in;
    signal output out;

    signal inv;
    inv <-- in != 0 ? 1/in : 0;
    out <== 1 - in * inv;
    in * out === 0;
}