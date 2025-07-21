use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use ark_bn254::{Bn254, Fr};
use ark_groth16::{Groth16, Proof};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};
use ark_r1cs_std::fields::fp::FpVar;
use ark_r1cs_std::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[derive(Serialize, Deserialize)]
pub struct AgeVerificationInputs {
    pub birth_year: u32,
    pub current_year: u32,
    pub min_age: u32,
}

#[derive(Serialize, Deserialize)]
pub struct ProofResult {
    pub proof: String,
    pub public_inputs: Vec<String>,
}

// Age verification circuit
pub struct AgeVerificationCircuit {
    pub birth_year: Option<F>,
    pub current_year: Option<F>,
    pub min_age: Option<F>,
}

impl ConstraintSynthesizer<F> for AgeVerificationCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        // Allocate private inputs
        let birth_year = FpVar::new_witness(cs.clone(), || {
            self.birth_year.ok_or(SynthesisError::AssignmentMissing)
        })?;
        
        let current_year = FpVar::new_input(cs.clone(), || {
            self.current_year.ok_or(SynthesisError::AssignmentMissing)
        })?;
        
        let min_age = FpVar::new_input(cs.clone(), || {
            self.min_age.ok_or(SynthesisError::AssignmentMissing)
        })?;
        
        // Calculate age: current_year - birth_year
        let age = &current_year - &birth_year;
        
        // Constraint: age >= min_age
        // This is implemented as age - min_age >= 0
        let age_diff = &age - &min_age;
        
        // For simplicity, we'll use a range check here
        // In a real implementation, you'd want more sophisticated range proofs
        let zero = FpVar::constant(Fr::zero());
        age_diff.enforce_cmp(&zero, std::cmp::Ordering::Greater, true)?;
        
        Ok(())
    }
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn generate_age_proof(inputs_json: &str) -> Result<String, JsValue> {
    let inputs: AgeVerificationInputs = serde_json::from_str(inputs_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid input JSON: {}", e)))?;
    
    // Convert inputs to field elements
    let birth_year = F::from(inputs.birth_year as u64);
    let current_year = F::from(inputs.current_year as u64);
    let min_age = F::from(inputs.min_age as u64);
    
    // Create circuit
    let circuit = AgeVerificationCircuit {
        birth_year: Some(birth_year),
        current_year: Some(current_year),
        min_age: Some(min_age),
    };
    
    let mut rng = OsRng;
    
    // Generate proving key (in practice, this would be done offline)
    let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(circuit, &mut rng)
        .map_err(|e| JsValue::from_str(&format!("Setup failed: {:?}", e)))?;
    
    // Create circuit for proof generation
    let proof_circuit = AgeVerificationCircuit {
        birth_year: Some(birth_year),
        current_year: Some(current_year),
        min_age: Some(min_age),
    };
    
    // Generate proof
    let proof = Groth16::<Bn254>::prove(&pk, proof_circuit, &mut rng)
        .map_err(|e| JsValue::from_str(&format!("Proof generation failed: {:?}", e)))?;
    
    // Serialize proof and public inputs
    let proof_bytes = proof.serialize_compressed()
        .map_err(|e| JsValue::from_str(&format!("Proof serialization failed: {:?}", e)))?;
    
    let result = ProofResult {
        proof: base64::encode(proof_bytes),
        public_inputs: vec![
            current_year.to_string(),
            min_age.to_string(),
        ],
    };
    
    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Result serialization failed: {}", e)))
}

#[wasm_bindgen]
pub fn verify_age_proof(proof_json: &str, public_inputs_json: &str) -> Result<bool, JsValue> {
    let proof_result: ProofResult = serde_json::from_str(proof_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid proof JSON: {}", e)))?;
    
    let public_inputs: Vec<String> = serde_json::from_str(public_inputs_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid public inputs JSON: {}", e)))?;
    
    // Deserialize proof
    let proof_bytes = base64::decode(&proof_result.proof)
        .map_err(|e| JsValue::from_str(&format!("Invalid proof encoding: {}", e)))?;
    
    let proof = Proof::<Bn254>::deserialize_compressed(&proof_bytes[..])
        .map_err(|e| JsValue::from_str(&format!("Proof deserialization failed: {:?}", e)))?;
    
    // Convert public inputs to field elements
    let current_year = F::from_str(&public_inputs[0])
        .map_err(|e| JsValue::from_str(&format!("Invalid current_year: {:?}", e)))?;
    let min_age = F::from_str(&public_inputs[1])
        .map_err(|e| JsValue::from_str(&format!("Invalid min_age: {:?}", e)))?;
    
    let public_inputs_f = vec![current_year, min_age];
    
    // Create verification key (in practice, this would be stored/retrieved)
    let empty_circuit = AgeVerificationCircuit {
        birth_year: None,
        current_year: None,
        min_age: None,
    };
    
    let mut rng = OsRng;
    let (_, vk) = Groth16::<Bn254>::circuit_specific_setup(empty_circuit, &mut rng)
        .map_err(|e| JsValue::from_str(&format!("Setup failed: {:?}", e)))?;
    
    // Verify proof
    let result = Groth16::<Bn254>::verify(&vk, &public_inputs_f, &proof)
        .map_err(|e| JsValue::from_str(&format!("Verification failed: {:?}", e)))?;
    
    Ok(result)
}