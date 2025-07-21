pragma circom 2.1.6;

include "../lib/comparators.circom";
include "../lib/merkle_proof.circom";
include "../lib/poseidon.circom";

/*
 * Universal Aggregate Proof Circuit
 * 
 * Combines multiple domain-specific proofs into a single aggregate proof.
 * This allows users to prove complex conditions across multiple credential
 * domains without revealing which specific credentials they possess.
 * 
 * For example: "I have GPA > 3.5 AND income > $80k AND vaccination status current"
 * 
 * Private Inputs:
 * - domain_proofs: Array of domain-specific proof results
 * - domain_commitments: Commitments from each domain
 * - aggregate_salt: Salt for the aggregate commitment
 * - merkle_proofs: Merkle proofs for each domain commitment
 * - merkle_proof_indices: Path indices for Merkle proofs
 * 
 * Public Inputs:
 * - required_domains: Bitmask of required domains for verification
 * - aggregate_merkle_root: Root of the aggregate Merkle tree
 * - verification_policy: Policy defining minimum requirements
 * - expiration_time: When this aggregate proof expires
 */

template AggregateProof(levels, max_domains) {
    // Private inputs
    signal private input domain_proofs[max_domains];
    signal private input domain_commitments[max_domains];
    signal private input aggregate_salt;
    signal private input merkle_proofs[max_domains][levels];
    signal private input merkle_proof_indices[max_domains][levels];
    
    // Public inputs
    signal input required_domains;
    signal input aggregate_merkle_root;
    signal input verification_policy;
    signal input current_time;
    signal input expiration_time;
    
    // Output
    signal output valid;
    
    // 1. Verify proof hasn't expired
    component time_check = LessThan(32);
    time_check.in[0] <== current_time;
    time_check.in[1] <== expiration_time;
    
    // 2. Verify each required domain proof
    component domain_validators[max_domains];
    signal domain_valid[max_domains];
    
    for (var i = 0; i < max_domains; i++) {
        domain_validators[i] = DomainValidator(levels);
        domain_validators[i].domain_id <== i;
        domain_validators[i].proof_result <== domain_proofs[i];
        domain_validators[i].commitment <== domain_commitments[i];
        domain_validators[i].required_domains <== required_domains;
        domain_validators[i].merkle_root <== aggregate_merkle_root;
        
        for (var j = 0; j < levels; j++) {
            domain_validators[i].merkle_proof[j] <== merkle_proofs[i][j];
            domain_validators[i].merkle_proof_indices[j] <== merkle_proof_indices[i][j];
        }
        
        domain_valid[i] <== domain_validators[i].valid;
    }
    
    // 3. Check verification policy compliance
    component policy_checker = PolicyChecker(max_domains);
    policy_checker.policy <== verification_policy;
    for (var i = 0; i < max_domains; i++) {
        policy_checker.domain_results[i] <== domain_proofs[i];
        policy_checker.domain_valid[i] <== domain_valid[i];
    }
    
    // 4. Create aggregate commitment
    component aggregate_hasher = AggregateCommitmentHasher(max_domains);
    for (var i = 0; i < max_domains; i++) {
        aggregate_hasher.domain_commitments[i] <== domain_commitments[i];
    }
    aggregate_hasher.salt <== aggregate_salt;
    aggregate_hasher.policy <== verification_policy;
    aggregate_hasher.expiration <== expiration_time;
    
    // 5. Verify aggregate commitment is in Merkle tree
    component aggregate_merkle = MerkleProof(levels);
    aggregate_merkle.leaf <== aggregate_hasher.commitment;
    aggregate_merkle.root <== aggregate_merkle_root;
    
    // Use first domain's Merkle proof for aggregate (simplified)
    for (var i = 0; i < levels; i++) {
        aggregate_merkle.pathElements[i] <== merkle_proofs[0][i];
        aggregate_merkle.pathIndices[i] <== merkle_proof_indices[0][i];
    }
    
    // All conditions must be satisfied
    valid <== time_check.out * policy_checker.satisfied * aggregate_merkle.valid;
}

/*
 * Domain Validator
 * 
 * Validates that a specific domain meets requirements
 */
template DomainValidator(levels) {
    signal input domain_id;
    signal input proof_result;
    signal input commitment;
    signal input required_domains;
    signal input merkle_root;
    signal input merkle_proof[levels];
    signal input merkle_proof_indices[levels];
    signal output valid;
    
    // Check if this domain is required
    component bit_extractor = BitExtractor();
    bit_extractor.value <== required_domains;
    bit_extractor.bit_position <== domain_id;
    
    // If domain is required, verify the proof and Merkle inclusion
    component merkle_verifier = MerkleProof(levels);
    merkle_verifier.leaf <== commitment;
    merkle_verifier.root <== merkle_root;
    
    for (var i = 0; i < levels; i++) {
        merkle_verifier.pathElements[i] <== merkle_proof[i];
        merkle_verifier.pathIndices[i] <== merkle_proof_indices[i];
    }
    
    // Domain is valid if: not required OR (required AND proof valid AND in Merkle tree)
    signal required_and_valid;
    required_and_valid <== bit_extractor.bit_set * proof_result * merkle_verifier.valid;
    
    valid <== (1 - bit_extractor.bit_set) + required_and_valid;
}

/*
 * Policy Checker
 * 
 * Checks that the verification policy is satisfied
 * Policy encoding: bits 0-7: minimum domains, bits 8-15: required score
 */
template PolicyChecker(max_domains) {
    signal input policy;
    signal input domain_results[max_domains];
    signal input domain_valid[max_domains];
    signal output satisfied;
    
    // Extract policy parameters
    component policy_decoder = PolicyDecoder();
    policy_decoder.policy <== policy;
    
    // Count valid domains
    component domain_counter = DomainCounter(max_domains);
    for (var i = 0; i < max_domains; i++) {
        domain_counter.domain_valid[i] <== domain_valid[i];
    }
    
    // Calculate aggregate score
    component score_calculator = ScoreCalculator(max_domains);
    for (var i = 0; i < max_domains; i++) {
        score_calculator.domain_results[i] <== domain_results[i];
        score_calculator.domain_valid[i] <== domain_valid[i];
    }
    
    // Check if policy requirements are met
    component min_domains_check = GreaterEqThan(8);
    min_domains_check.in[0] <== domain_counter.count;
    min_domains_check.in[1] <== policy_decoder.min_domains;
    
    component min_score_check = GreaterEqThan(16);
    min_score_check.in[0] <== score_calculator.score;
    min_score_check.in[1] <== policy_decoder.min_score;
    
    satisfied <== min_domains_check.out * min_score_check.out;
}

/*
 * Policy Decoder
 */
template PolicyDecoder() {
    signal input policy;
    signal output min_domains;
    signal output min_score;
    
    // Extract bits 0-7 for minimum domains
    component min_domains_extractor = BitRangeExtractor(8, 0);
    min_domains_extractor.value <== policy;
    min_domains <== min_domains_extractor.extracted;
    
    // Extract bits 8-15 for minimum score
    component min_score_extractor = BitRangeExtractor(8, 8);
    min_score_extractor.value <== policy;
    min_score <== min_score_extractor.extracted;
}

/*
 * Extract a range of bits from a number
 */
template BitRangeExtractor(width, offset) {
    signal input value;
    signal output extracted;
    
    // Shift right by offset bits
    signal shifted;
    shifted <== value \ (1 << offset);
    
    // Mask to keep only 'width' bits
    signal mask;
    mask <== (1 << width) - 1;
    
    extracted <== shifted & mask;
}

/*
 * Count valid domains
 */
template DomainCounter(max_domains) {
    signal input domain_valid[max_domains];
    signal output count;
    
    signal partial_count[max_domains + 1];
    partial_count[0] <== 0;
    
    for (var i = 0; i < max_domains; i++) {
        partial_count[i + 1] <== partial_count[i] + domain_valid[i];
    }
    
    count <== partial_count[max_domains];
}

/*
 * Calculate aggregate score from domain results
 */
template ScoreCalculator(max_domains) {
    signal input domain_results[max_domains];
    signal input domain_valid[max_domains];
    signal output score;
    
    signal weighted_scores[max_domains + 1];
    weighted_scores[0] <== 0;
    
    // Domain weights (can be customized based on importance)
    var weights[6] = [100, 150, 200, 120, 180, 80]; // Academic, Financial, Health, Social, Government, IoT
    
    for (var i = 0; i < max_domains; i++) {
        signal domain_score;
        if (i < 6) {
            domain_score <== domain_results[i] * domain_valid[i] * weights[i];
        } else {
            domain_score <== domain_results[i] * domain_valid[i] * 100; // Default weight
        }
        
        weighted_scores[i + 1] <== weighted_scores[i] + domain_score;
    }
    
    score <== weighted_scores[max_domains];
}

/*
 * Aggregate Commitment Hasher
 */
template AggregateCommitmentHasher(max_domains) {
    signal input domain_commitments[max_domains];
    signal input salt;
    signal input policy;
    signal input expiration;
    signal output commitment;
    
    // Hash all domain commitments together
    component domain_hasher = Poseidon(max_domains);
    for (var i = 0; i < max_domains; i++) {
        domain_hasher.inputs[i] <== domain_commitments[i];
    }
    
    // Create final aggregate commitment
    component final_hasher = Poseidon(4);
    final_hasher.inputs[0] <== domain_hasher.out;
    final_hasher.inputs[1] <== salt;
    final_hasher.inputs[2] <== policy;
    final_hasher.inputs[3] <== expiration;
    
    commitment <== final_hasher.out;
}

/*
 * Bit extractor helper
 */
template BitExtractor() {
    signal input value;
    signal input bit_position;
    signal output bit_set;
    
    component bits = Num2Bits(32);
    bits.in <== value;
    
    component selector = Multiplexer(32);
    selector.sel <== bit_position;
    for (var i = 0; i < 32; i++) {
        selector.inp[i] <== bits.out[i];
    }
    
    bit_set <== selector.out;
}

/*
 * Multiplexer for bit selection
 */
template Multiplexer(n) {
    signal input inp[n];
    signal input sel;
    signal output out;
    
    component eq[n];
    signal partial[n];
    
    for (var i = 0; i < n; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== sel;
        eq[i].in[1] <== i;
        
        if (i == 0) {
            partial[0] <== eq[0].out * inp[0];
        } else {
            partial[i] <== partial[i-1] + eq[i].out * inp[i];
        }
    }
    
    out <== partial[n-1];
}

// Main component: support up to 8 domains, 20 Merkle levels
component main = AggregateProof(20, 8);