pragma circom 2.1.6;

include "./poseidon.circom";

/*
 * Merkle Proof Verification Circuit
 * 
 * Verifies that a leaf is included in a Merkle tree with a given root
 * without revealing the position of the leaf in the tree.
 */

template MerkleProof(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output valid;

    component hashers[levels];
    component selectors[levels];

    signal computedHash[levels + 1];
    computedHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // Select whether to put current hash on left or right
        selectors[i] = Selector();
        selectors[i].input[0] <== computedHash[i];
        selectors[i].input[1] <== pathElements[i];
        selectors[i].sel <== pathIndices[i];

        // Hash the pair
        hashers[i] = Poseidon2();
        hashers[i].inputs[0] <== selectors[i].left;
        hashers[i].inputs[1] <== selectors[i].right;

        computedHash[i + 1] <== hashers[i].out;
    }

    // Verify computed root matches expected root
    // For now, just check if they're equal (simplified)
    signal diff;
    diff <== computedHash[levels] - root;
    valid <== 1 - diff * diff; // This should be 1 if diff is 0
}

// Helper template to select left/right position based on path index
template Selector() {
    signal input input[2];
    signal input sel;
    signal output left;
    signal output right;

    // sel = 0: left = input[0], right = input[1]
    // sel = 1: left = input[1], right = input[0]
    left <== input[0] + sel * (input[1] - input[0]);
    right <== input[1] - sel * (input[1] - input[0]);
}

/*
 * Batch Merkle Proof Verification
 * 
 * Verifies multiple leaves are included in the same Merkle tree
 */
template BatchMerkleProof(levels, numLeaves) {
    signal input leaves[numLeaves];
    signal input root;
    signal input pathElements[numLeaves][levels];
    signal input pathIndices[numLeaves][levels];
    signal output valid;

    component proofs[numLeaves];
    signal validProofs[numLeaves];

    for (var i = 0; i < numLeaves; i++) {
        proofs[i] = MerkleProof(levels);
        proofs[i].leaf <== leaves[i];
        proofs[i].root <== root;
        
        for (var j = 0; j < levels; j++) {
            proofs[i].pathElements[j] <== pathElements[i][j];
            proofs[i].pathIndices[j] <== pathIndices[i][j];
        }
        
        validProofs[i] <== proofs[i].valid;
    }

    // All proofs must be valid
    component and_gate = AndGate(numLeaves);
    for (var i = 0; i < numLeaves; i++) {
        and_gate.inputs[i] <== validProofs[i];
    }
    valid <== and_gate.out;
}

// Multi-input AND gate
template AndGate(n) {
    signal input inputs[n];
    signal output out;

    if (n == 1) {
        out <== inputs[0];
    } else if (n == 2) {
        out <== inputs[0] * inputs[1];
    } else {
        component left = AndGate(n >> 1);
        component right = AndGate(n - (n >> 1));
        
        for (var i = 0; i < (n >> 1); i++) {
            left.inputs[i] <== inputs[i];
        }
        for (var i = 0; i < n - (n >> 1); i++) {
            right.inputs[i] <== inputs[(n >> 1) + i];
        }
        
        out <== left.out * right.out;
    }
}

