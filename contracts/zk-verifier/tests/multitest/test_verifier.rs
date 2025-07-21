use cosmwasm_std::{
    coins, to_json_binary, Addr, Binary, Empty, Uint128,
};
use cw_multi_test::{App, ContractWrapper, Executor};

use zk_verifier::contract::{execute, instantiate, query};
use zk_verifier::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};
use zk_verifier::state::{Circuit, Proof, CIRCUITS, PROOFS};
use zk_verifier::error::ContractError;

const ADMIN: &str = "admin";
const USER: &str = "user1";

fn proper_instantiate() -> (App, Addr) {
    let mut app = App::default();
    
    // Create contract wrapper
    let contract = ContractWrapper::new(execute, instantiate, query);
    let code_id = app.store_code(Box::new(contract));
    
    // Instantiate contract
    let msg = InstantiateMsg {
        admin: Some(ADMIN.to_string()),
    };
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &msg,
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();
    
    (app, contract_addr)
}

fn register_test_circuit(app: &mut App, contract_addr: &Addr) -> String {
    let circuit_id = "test_circuit_001".to_string();
    let msg = ExecuteMsg::RegisterCircuit {
        circuit_id: circuit_id.clone(),
        name: "Test Age Verification Circuit".to_string(),
        description: "Test circuit for verifying age >= 18".to_string(),
        verifying_key: "test_vk_data".to_string(),
    };
    
    app.execute_contract(Addr::unchecked(ADMIN), contract_addr.clone(), &msg, &[])
        .unwrap();
    
    circuit_id
}

#[test]
fn test_valid_proof_verification() {
    let (mut app, contract_addr) = proper_instantiate();
    let circuit_id = register_test_circuit(&mut app, &contract_addr);
    
    // Submit a valid proof
    let msg = ExecuteMsg::SubmitProof {
        circuit_id: circuit_id.clone(),
        proof: "valid_proof_data".to_string(),
        public_inputs: vec!["25".to_string(), "18".to_string()], // age 25, min_age 18
    };
    
    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &msg,
        &[]
    ).unwrap();
    
    // Check for ProofVerified event
    let events = &res.events;
    let proof_verified_event = events.iter().find(|e| {
        e.type_str == "wasm" && 
        e.attributes.iter().any(|attr| attr.key == "action" && attr.value == "proof_verified")
    });
    
    assert!(proof_verified_event.is_some(), "ProofVerified event not found");
    
    // Verify proof was stored
    let query_msg = QueryMsg::GetProof {
        proof_id: "proof_1".to_string(), // First proof gets ID "proof_1"
    };
    
    let proof_response: Option<Proof> = app
        .wrap()
        .query_wasm_smart(&contract_addr, &query_msg)
        .unwrap();
    
    assert!(proof_response.is_some());
    let proof = proof_response.unwrap();
    assert_eq!(proof.circuit_id, circuit_id);
    assert_eq!(proof.prover, USER);
    assert_eq!(proof.proof_data, "valid_proof_data");
    assert!(proof.is_verified);
}

#[test]
fn test_invalid_proof_rejection() {
    let (mut app, contract_addr) = proper_instantiate();
    let circuit_id = register_test_circuit(&mut app, &contract_addr);
    
    // Submit an invalid proof (age < min_age)
    let msg = ExecuteMsg::SubmitProof {
        circuit_id: circuit_id.clone(),
        proof: "invalid_proof_data".to_string(),
        public_inputs: vec!["16".to_string(), "18".to_string()], // age 16, min_age 18
    };
    
    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &msg,
        &[]
    );
    
    // Should fail with verification error
    assert!(res.is_err());
    let err = res.unwrap_err();
    
    // Check that it's a contract error related to proof verification
    match err.downcast_ref::<ContractError>() {
        Some(ContractError::InvalidProof { .. }) => {},
        _ => panic!("Expected InvalidProof error, got: {:?}", err),
    }
}

#[test]
fn test_deactivated_circuit_rejection() {
    let (mut app, contract_addr) = proper_instantiate();
    let circuit_id = register_test_circuit(&mut app, &contract_addr);
    
    // Deactivate the circuit
    let deactivate_msg = ExecuteMsg::DeactivateCircuit {
        circuit_id: circuit_id.clone(),
    };
    
    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &deactivate_msg,
        &[]
    ).unwrap();
    
    // Try to submit proof to deactivated circuit
    let msg = ExecuteMsg::SubmitProof {
        circuit_id: circuit_id.clone(),
        proof: "valid_proof_data".to_string(),
        public_inputs: vec!["25".to_string(), "18".to_string()],
    };
    
    let res = app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &msg,
        &[]
    );
    
    // Should fail because circuit is deactivated
    assert!(res.is_err());
    let err = res.unwrap_err();
    
    match err.downcast_ref::<ContractError>() {
        Some(ContractError::CircuitNotActive { .. }) => {},
        _ => panic!("Expected CircuitNotActive error, got: {:?}", err),
    }
}

#[test]
fn test_circuit_lifecycle() {
    let (mut app, contract_addr) = proper_instantiate();
    
    // Register circuit
    let circuit_id = "lifecycle_test".to_string();
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: circuit_id.clone(),
        name: "Lifecycle Test Circuit".to_string(),
        description: "Testing circuit lifecycle".to_string(),
        verifying_key: "lifecycle_vk".to_string(),
    };
    
    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &register_msg,
        &[]
    ).unwrap();
    
    // Verify circuit is active
    let query_msg = QueryMsg::GetCircuit {
        circuit_id: circuit_id.clone(),
    };
    
    let circuit_response: Option<Circuit> = app
        .wrap()
        .query_wasm_smart(&contract_addr, &query_msg)
        .unwrap();
    
    assert!(circuit_response.is_some());
    let circuit = circuit_response.unwrap();
    assert!(circuit.is_active);
    assert_eq!(circuit.name, "Lifecycle Test Circuit");
    
    // Deactivate circuit
    let deactivate_msg = ExecuteMsg::DeactivateCircuit {
        circuit_id: circuit_id.clone(),
    };
    
    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &deactivate_msg,
        &[]
    ).unwrap();
    
    // Verify circuit is now inactive
    let circuit_response: Option<Circuit> = app
        .wrap()
        .query_wasm_smart(&contract_addr, &query_msg)
        .unwrap();
    
    assert!(circuit_response.is_some());
    let circuit = circuit_response.unwrap();
    assert!(!circuit.is_active);
}

#[test]
fn test_unauthorized_admin_operations() {
    let (mut app, contract_addr) = proper_instantiate();
    
    // Try to register circuit as non-admin user
    let msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "unauthorized_test".to_string(),
        name: "Unauthorized Circuit".to_string(),
        description: "Should fail".to_string(),
        verifying_key: "test_vk".to_string(),
    };
    
    let res = app.execute_contract(
        Addr::unchecked(USER), // Not admin
        contract_addr.clone(),
        &msg,
        &[]
    );
    
    // Should fail with unauthorized error
    assert!(res.is_err());
    let err = res.unwrap_err();
    
    match err.downcast_ref::<ContractError>() {
        Some(ContractError::Unauthorized {}) => {},
        _ => panic!("Expected Unauthorized error, got: {:?}", err),
    }
}

#[test]
fn test_query_all_circuits() {
    let (mut app, contract_addr) = proper_instantiate();
    
    // Register multiple circuits
    for i in 1..=3 {
        let circuit_id = format!("circuit_{}", i);
        let msg = ExecuteMsg::RegisterCircuit {
            circuit_id: circuit_id.clone(),
            name: format!("Test Circuit {}", i),
            description: format!("Description for circuit {}", i),
            verifying_key: format!("vk_{}", i),
        };
        
        app.execute_contract(
            Addr::unchecked(ADMIN),
            contract_addr.clone(),
            &msg,
            &[]
        ).unwrap();
    }
    
    // Query all circuits
    let query_msg = QueryMsg::ListCircuits {
        start_after: None,
        limit: None,
    };
    
    let circuits_response: Vec<Circuit> = app
        .wrap()
        .query_wasm_smart(&contract_addr, &query_msg)
        .unwrap();
    
    assert_eq!(circuits_response.len(), 3);
    
    // Verify circuit order and data
    for (i, circuit) in circuits_response.iter().enumerate() {
        let expected_id = format!("circuit_{}", i + 1);
        assert_eq!(circuit.circuit_id, expected_id);
        assert!(circuit.is_active);
    }
}

#[test]
fn test_proof_queries() {
    let (mut app, contract_addr) = proper_instantiate();
    let circuit_id = register_test_circuit(&mut app, &contract_addr);
    
    // Submit multiple proofs
    for i in 1..=3 {
        let msg = ExecuteMsg::SubmitProof {
            circuit_id: circuit_id.clone(),
            proof: format!("proof_data_{}", i),
            public_inputs: vec!["25".to_string(), "18".to_string()],
        };
        
        app.execute_contract(
            Addr::unchecked(format!("user{}", i)),
            contract_addr.clone(),
            &msg,
            &[]
        ).unwrap();
    }
    
    // Query all proofs
    let query_msg = QueryMsg::ListProofs {
        start_after: None,
        limit: None,
    };
    
    let proofs_response: Vec<Proof> = app
        .wrap()
        .query_wasm_smart(&contract_addr, &query_msg)
        .unwrap();
    
    assert_eq!(proofs_response.len(), 3);
    
    // Query proofs by circuit
    let query_msg = QueryMsg::ListProofsByCircuit {
        circuit_id: circuit_id.clone(),
        start_after: None,
        limit: None,
    };
    
    let circuit_proofs: Vec<Proof> = app
        .wrap()
        .query_wasm_smart(&contract_addr, &query_msg)
        .unwrap();
    
    assert_eq!(circuit_proofs.len(), 3);
    for proof in circuit_proofs {
        assert_eq!(proof.circuit_id, circuit_id);
        assert!(proof.is_verified);
    }
}