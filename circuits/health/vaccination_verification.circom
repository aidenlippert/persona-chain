pragma circom 2.1.6;

include "../lib/comparators.circom";
include "../lib/merkle_proof.circom";
include "../lib/poseidon.circom";

/*
 * Vaccination Verification Circuit
 * 
 * Proves vaccination status for specific vaccines without revealing
 * personal health information or exact vaccination dates.
 * HIPAA-compliant design that protects sensitive health data.
 * 
 * Private Inputs:
 * - vaccine_codes: Array of vaccine type codes (CVX codes)
 * - vaccination_dates: Array of vaccination dates (YYYYMMDD format)
 * - vaccine_salt: Salt used in the vaccination commitment
 * - lot_numbers: Array of vaccine lot numbers (for authenticity)
 * - provider_ids: Array of healthcare provider IDs
 * - merkle_proof: Array of hashes for Merkle proof
 * - merkle_proof_indices: Path indices for Merkle proof
 * 
 * Public Inputs:
 * - required_vaccines: Bitmask of required vaccine types
 * - minimum_date: Minimum date for valid vaccinations (YYYYMMDD)
 * - merkle_root: Root of the health credentials Merkle tree
 * - current_date: Current date for recency checks (YYYYMMDD)
 */

template VaccinationVerification(levels, max_vaccines) {
    // Private inputs
    signal private input vaccine_codes[max_vaccines];
    signal private input vaccination_dates[max_vaccines];
    signal private input vaccine_salt;
    signal private input lot_numbers[max_vaccines];
    signal private input provider_ids[max_vaccines];
    signal private input merkle_proof[levels];
    signal private input merkle_proof_indices[levels];
    
    // Public inputs
    signal input required_vaccines; // Bitmask of required vaccine CVX codes
    signal input minimum_date;
    signal input merkle_root;
    signal input current_date;
    
    // Output
    signal output valid;
    
    // Track which required vaccines are satisfied
    signal vaccine_satisfied[32]; // Support up to 32 different vaccine types
    
    // Initialize all vaccines as not satisfied
    for (var i = 0; i < 32; i++) {
        vaccine_satisfied[i] <== 0;
    }
    
    // Process each vaccination record
    component date_validators[max_vaccines];
    component vaccine_validators[max_vaccines];
    signal updated_satisfied[max_vaccines][32];
    
    // Initialize first row
    for (var i = 0; i < 32; i++) {
        updated_satisfied[0][i] <== vaccine_satisfied[i];
    }
    
    for (var vax = 0; vax < max_vaccines; vax++) {
        // Validate vaccination date is after minimum required date
        date_validators[vax] = GreaterEqThan(32);
        date_validators[vax].in[0] <== vaccination_dates[vax];
        date_validators[vax].in[1] <== minimum_date;
        
        // Validate vaccination date is not in the future
        component future_check = LessEqThan(32);
        future_check.in[0] <== vaccination_dates[vax];
        future_check.in[1] <== current_date;
        
        // Check if this vaccination is valid (date in range and not zero)
        component non_zero = IsZero();
        non_zero.in <== vaccination_dates[vax];
        signal is_valid_vax;
        is_valid_vax <== date_validators[vax].out * future_check.out * (1 - non_zero.out);
        
        // For each possible vaccine type, check if this vaccination satisfies it
        for (var req_vax = 0; req_vax < 32; req_vax++) {
            // Check if this vaccine code matches the required vaccine
            component code_match = IsEqual();
            code_match.in[0] <== vaccine_codes[vax];
            code_match.in[1] <== req_vax + 1; // CVX codes start from 1
            
            // Check if this required vaccine is needed (bit set in bitmask)
            component bit_check = BitExtractor();
            bit_check.value <== required_vaccines;
            bit_check.bit_position <== req_vax;
            
            // Update satisfaction status
            signal new_satisfaction;
            new_satisfaction <== code_match.out * is_valid_vax * bit_check.bit_set;
            
            if (vax == 0) {
                updated_satisfied[vax][req_vax] <== vaccine_satisfied[req_vax] + new_satisfaction;
            } else {
                updated_satisfied[vax][req_vax] <== updated_satisfied[vax-1][req_vax] + new_satisfaction;
            }
        }
    }
    
    // Check that all required vaccines are satisfied
    component requirement_checker = RequirementChecker(32);
    requirement_checker.required_mask <== required_vaccines;
    for (var i = 0; i < 32; i++) {
        requirement_checker.satisfied[i] <== updated_satisfied[max_vaccines-1][i];
    }
    
    // Create commitment hash for the vaccination record
    component commitment_hasher = Poseidon(5);
    
    // Hash all vaccine data together
    signal vaccine_hash;
    component vaccine_data_hasher = VaccineDataHasher(max_vaccines);
    for (var i = 0; i < max_vaccines; i++) {
        vaccine_data_hasher.vaccine_codes[i] <== vaccine_codes[i];
        vaccine_data_hasher.vaccination_dates[i] <== vaccination_dates[i];
        vaccine_data_hasher.lot_numbers[i] <== lot_numbers[i];
        vaccine_data_hasher.provider_ids[i] <== provider_ids[i];
    }
    vaccine_hash <== vaccine_data_hasher.hash;
    
    commitment_hasher.inputs[0] <== vaccine_hash;
    commitment_hasher.inputs[1] <== vaccine_salt;
    commitment_hasher.inputs[2] <== minimum_date;
    commitment_hasher.inputs[3] <== current_date;
    commitment_hasher.inputs[4] <== required_vaccines;
    
    // Verify Merkle proof
    component merkle_verifier = MerkleProof(levels);
    merkle_verifier.leaf <== commitment_hasher.out;
    merkle_verifier.root <== merkle_root;
    
    for (var i = 0; i < levels; i++) {
        merkle_verifier.pathElements[i] <== merkle_proof[i];
        merkle_verifier.pathIndices[i] <== merkle_proof_indices[i];
    }
    
    // All conditions must be true
    valid <== requirement_checker.all_satisfied * merkle_verifier.valid;
}

/*
 * Hash all vaccine data into a single hash
 */
template VaccineDataHasher(max_vaccines) {
    signal input vaccine_codes[max_vaccines];
    signal input vaccination_dates[max_vaccines];
    signal input lot_numbers[max_vaccines];
    signal input provider_ids[max_vaccines];
    signal output hash;
    
    component hashers[max_vaccines];
    signal intermediate_hashes[max_vaccines + 1];
    
    intermediate_hashes[0] <== 0; // Initial value
    
    for (var i = 0; i < max_vaccines; i++) {
        hashers[i] = Poseidon(5);
        hashers[i].inputs[0] <== intermediate_hashes[i];
        hashers[i].inputs[1] <== vaccine_codes[i];
        hashers[i].inputs[2] <== vaccination_dates[i];
        hashers[i].inputs[3] <== lot_numbers[i];
        hashers[i].inputs[4] <== provider_ids[i];
        
        intermediate_hashes[i + 1] <== hashers[i].out;
    }
    
    hash <== intermediate_hashes[max_vaccines];
}

/*
 * Check that all required vaccines are satisfied
 */
template RequirementChecker(num_vaccines) {
    signal input required_mask;
    signal input satisfied[num_vaccines];
    signal output all_satisfied;
    
    signal requirements_met[num_vaccines];
    
    for (var i = 0; i < num_vaccines; i++) {
        // Extract if this vaccine is required
        component bit_check = BitExtractor();
        bit_check.value <== required_mask;
        bit_check.bit_position <== i;
        
        // If required, check if satisfied; if not required, automatically met
        component is_satisfied = GreaterThan(8);
        is_satisfied.in[0] <== satisfied[i];
        is_satisfied.in[1] <== 0;
        
        // Requirement is met if: not required OR satisfied
        requirements_met[i] <== (1 - bit_check.bit_set) + bit_check.bit_set * is_satisfied.out;
    }
    
    // All requirements must be met
    component and_gate = AndGate(num_vaccines);
    for (var i = 0; i < num_vaccines; i++) {
        and_gate.inputs[i] <== requirements_met[i];
    }
    
    all_satisfied <== and_gate.out;
}

/*
 * Multi-input AND gate
 */
template AndGate(n) {
    signal input inputs[n];
    signal output out;
    
    if (n == 1) {
        out <== inputs[0];
    } else if (n == 2) {
        out <== inputs[0] * inputs[1];
    } else {
        component left = AndGate(n \ 2);
        component right = AndGate(n - n \ 2);
        
        for (var i = 0; i < n \ 2; i++) {
            left.inputs[i] <== inputs[i];
        }
        for (var i = 0; i < n - n \ 2; i++) {
            right.inputs[i] <== inputs[n \ 2 + i];
        }
        
        out <== left.out * right.out;
    }
}

/*
 * Bit Extractor for checking bitmasks
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
    
    partial[0] <== 0;
    
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

// Main component: support up to 10 vaccinations, 20 Merkle levels
component main = VaccinationVerification(20, 10);