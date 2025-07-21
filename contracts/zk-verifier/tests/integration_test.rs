use cosmwasm_std::{coins, Addr};
use cw_multi_test::{App, ContractWrapper, Executor};

use zk_verifier::contract::{execute, instantiate, query};
use zk_verifier::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, CircuitResponse, ProofResponse};
use zk_verifier::error::ContractError;

const USER: &str = "user";
const ADMIN: &str = "admin";
const NATIVE_DENOM: &str = "uprsn";

fn mock_app() -> App {
    App::default()
}

fn proper_instantiate() -> (App, Addr) {
    let mut app = mock_app();
    let cw_template_id = app.store_code(contract_template());

    let msg = InstantiateMsg {
        admin: Some(ADMIN.to_string()),
        governance_enabled: None,
        dao_address: None,
        multisig_config: None,
        timelock_enabled: None,
        min_timelock_delay: None,
    };
    let contract_addr = app
        .instantiate_contract(
            cw_template_id,
            Addr::unchecked(ADMIN),
            &msg,
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    (app, contract_addr)
}

fn contract_template() -> Box<dyn cw_multi_test::Contract<cosmwasm_std::Empty>> {
    let contract = ContractWrapper::new(execute, instantiate, query);
    Box::new(contract)
}

#[test]
fn test_age_verification_circuit() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register age verification circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "age_verification".to_string(),
        verification_key: "vk_age_verification_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Query circuit
    let query_msg = QueryMsg::Circuit {
        circuit_id: "age_verification".to_string(),
    };
    let res: CircuitResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();

    assert_eq!(res.circuit_id, "age_verification");
    assert_eq!(res.circuit_type, "groth16");
    assert!(res.active);

    // Submit valid age proof
    let proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "age_verification".to_string(),
        public_inputs: vec!["2025".to_string(), "18".to_string()], // current_year, min_age
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &proof_msg,
        &[],
    );
    assert!(res.is_ok());

    // Submit invalid age proof (should fail verification)
    let invalid_proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "age_verification".to_string(),
        public_inputs: vec!["999999".to_string()], // This triggers failure
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &invalid_proof_msg,
        &[],
    );
    // Should succeed in submission but fail verification
    assert!(res.is_ok());
}

#[test]
fn test_employment_verification_circuit() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register employment verification circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "employment_verification".to_string(),
        verification_key: "vk_employment_verification_67890".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Submit valid employment proof
    let proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "employment_verification".to_string(),
        public_inputs: vec!["12".to_string(), "1".to_string()], // months_employed, employment_status
        proof: r#"{"pi_a": ["0xabc"], "pi_b": [["0xdef"]], "pi_c": ["0x123"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &proof_msg,
        &[],
    );
    assert!(res.is_ok());
}

#[test]
fn test_education_verification_circuit() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register education verification circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "education_verification".to_string(),
        verification_key: "vk_education_verification_abcde".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Submit valid education proof
    let proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "education_verification".to_string(),
        public_inputs: vec!["4".to_string(), "2023".to_string()], // degree_level, graduation_year
        proof: r#"{"pi_a": ["0x111"], "pi_b": [["0x222"]], "pi_c": ["0x333"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &proof_msg,
        &[],
    );
    assert!(res.is_ok());
}

#[test]
fn test_financial_verification_circuit() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register financial verification circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "financial_verification".to_string(),
        verification_key: "vk_financial_verification_54321".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Submit valid financial proof
    let proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "financial_verification".to_string(),
        public_inputs: vec!["50000".to_string(), "750".to_string()], // income, credit_score
        proof: r#"{"pi_a": ["0x444"], "pi_b": [["0x555"]], "pi_c": ["0x666"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &proof_msg,
        &[],
    );
    assert!(res.is_ok());
}

#[test]
fn test_health_verification_circuit() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register health verification circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "health_verification".to_string(),
        verification_key: "vk_health_verification_98765".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Submit valid health proof
    let proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "health_verification".to_string(),
        public_inputs: vec!["1".to_string(), "7".to_string()], // vaccination_status, test_age_days
        proof: r#"{"pi_a": ["0x777"], "pi_b": [["0x888"]], "pi_c": ["0x999"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &proof_msg,
        &[],
    );
    assert!(res.is_ok());
}

#[test]
fn test_location_verification_circuit() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register location verification circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "location_verification".to_string(),
        verification_key: "vk_location_verification_fghij".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Submit valid location proof
    let proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "location_verification".to_string(),
        public_inputs: vec!["100".to_string(), "2".to_string()], // distance_meters, time_hours
        proof: r#"{"pi_a": ["0xaaa"], "pi_b": [["0xbbb"]], "pi_c": ["0xccc"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &proof_msg,
        &[],
    );
    assert!(res.is_ok());
}

#[test]
fn test_circuit_deactivation() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Deactivate circuit as admin
    let deactivate_msg = ExecuteMsg::DeactivateCircuit {
        circuit_id: "test_circuit".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &deactivate_msg,
        &[],
    )
    .unwrap();

    // Try to submit proof to deactivated circuit (should fail)
    let proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "test_circuit".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &proof_msg,
        &[],
    );
    
    match res {
        Err(cw_multi_test::error::Error::ExecuteError { .. }) => {
            // Expected error
        }
        _ => panic!("Expected contract execution to fail for deactivated circuit"),
    }
}

#[test]
fn test_proof_events() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "event_test".to_string(),
        verification_key: "vk_event_test_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Submit proof and check events
    let proof_msg = ExecuteMsg::SubmitProof {
        circuit_id: "event_test".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &proof_msg,
        &[],
    );
    
    assert!(res.is_ok());
    let response = res.unwrap();
    
    // Check that events were emitted
    assert!(!response.events.is_empty());
    
    // Look for proof submission event
    let proof_events: Vec<_> = response
        .events
        .iter()
        .filter(|e| e.ty == "wasm" && e.attributes.iter().any(|a| a.key == "method" && a.value == "submit_proof"))
        .collect();
    
    assert!(!proof_events.is_empty());
}

#[test]
fn test_unauthorized_circuit_deactivation() {
    let (mut app, contract_addr) = proper_instantiate();

    // Register circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Try to deactivate circuit as non-admin (should fail)
    let deactivate_msg = ExecuteMsg::DeactivateCircuit {
        circuit_id: "test_circuit".to_string(),
    };

    let res = app.execute_contract(
        Addr::unchecked(USER), // Not admin
        contract_addr.clone(),
        &deactivate_msg,
        &[],
    );
    
    match res {
        Err(cw_multi_test::error::Error::ExecuteError { .. }) => {
            // Expected error - unauthorized
        }
        _ => panic!("Expected unauthorized error"),
    }
}