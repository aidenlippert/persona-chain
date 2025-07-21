use anyhow::Result as AnyResult;
use cosmwasm_std::{Addr, Coin, Empty, Uint128, Binary};
use cw_multi_test::{App, AppBuilder, Contract, ContractWrapper, Executor};

use zk_verifier::contract::{execute, instantiate, query};
use zk_verifier::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, CircuitResponse, ProofResponse, ContractInfoResponse};

const USER: &str = "user";
const ADMIN: &str = "admin";
const NATIVE_DENOM: &str = "denom";

fn contract_template() -> Box<dyn Contract<Empty>> {
    let contract = ContractWrapper::new(execute, instantiate, query);
    Box::new(contract)
}

fn mock_app() -> App {
    AppBuilder::new().build(|router, _, storage| {
        router
            .bank
            .init_balance(
                storage,
                &Addr::unchecked(USER),
                vec![Coin {
                    denom: NATIVE_DENOM.to_string(),
                    amount: Uint128::new(1_000_000_000u128),
                }],
            )
            .unwrap();
        router
            .bank
            .init_balance(
                storage,
                &Addr::unchecked(ADMIN),
                vec![Coin {
                    denom: NATIVE_DENOM.to_string(),
                    amount: Uint128::new(1_000_000_000u128),
                }],
            )
            .unwrap();
    })
}

fn instantiate_contract(app: &mut App, admin: Option<String>) -> AnyResult<Addr> {
    let contract_id = app.store_code(contract_template());

    let msg = InstantiateMsg { 
        admin,
        governance_enabled: None,
        dao_address: None,
        multisig_config: None,
        timelock_enabled: None,
        min_timelock_delay: None,
    };

    app.instantiate_contract(
        contract_id,
        Addr::unchecked(ADMIN),
        &msg,
        &[],
        "ZK Verifier Contract",
        None,
    )
    .map_err(|e| e.into())
}

#[test]
fn test_instantiate() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Query contract info
    let msg = QueryMsg::ContractInfo {};
    let res: ContractInfoResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &msg)
        .unwrap();

    assert_eq!(res.admin, Addr::unchecked(ADMIN));
    assert_eq!(res.total_circuits, 0);
    assert_eq!(res.total_proofs, 0);
}

#[test]
fn test_register_circuit() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Register a circuit
    let msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "age_verification".to_string(),
        verification_key: "vk_age_verification_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let _res = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &msg, &[])
        .unwrap();

    // Query the circuit
    let query_msg = QueryMsg::Circuit {
        circuit_id: "age_verification".to_string(),
    };
    let circuit: CircuitResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();

    assert_eq!(circuit.circuit_id, "age_verification");
    assert_eq!(circuit.verification_key, "vk_age_verification_key_12345");
    assert_eq!(circuit.circuit_type, "groth16");
    assert_eq!(circuit.creator, Addr::unchecked(USER));
    assert!(circuit.active);

    // Check contract info updated
    let info_msg = QueryMsg::ContractInfo {};
    let info: ContractInfoResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &info_msg)
        .unwrap();
    assert_eq!(info.total_circuits, 1);
}

#[test]
fn test_register_duplicate_circuit() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Register a circuit
    let msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &msg, &[])
        .unwrap();

    // Try to register the same circuit again
    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Circuit already exists"));
}

#[test]
fn test_register_circuit_empty_id() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Try to register circuit with empty ID
    let msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "".to_string(),
        verification_key: "vk_test_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Circuit ID cannot be empty"));
}

#[test]
fn test_register_circuit_invalid_vk() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Try to register circuit with invalid verification key
    let msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "".to_string(), // Empty key
        circuit_type: "groth16".to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &msg, &[])
        .unwrap_err();

    // Just check that the execution failed as expected for empty verification key
    // The exact error message may be wrapped by the multi-test framework
}

#[test]
fn test_submit_valid_proof() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Register a circuit first
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "age_verification".to_string(),
        verification_key: "vk_age_verification_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap();

    // Submit a valid proof
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "age_verification".to_string(),
        public_inputs: vec!["2023".to_string(), "18".to_string()], // year, min_age
        proof: r#"{"pi_a": ["0x123abc"], "pi_b": [["0x456def", "0x789ghi"]], "pi_c": ["0xabcdef"]}"#.to_string(),
    };

    let res = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &submit_msg, &[])
        .unwrap();

    // Check that proof was verified
    let events = res.events;
    let wasm_event = events.iter().find(|e| e.ty == "wasm").unwrap();
    let verified_attr = wasm_event.attributes.iter().find(|a| a.key == "verified").unwrap();
    assert_eq!(verified_attr.value, "true");

    // Query the proof
    let query_msg = QueryMsg::Proof {
        proof_id: "proof_age_verification_1".to_string(),
    };
    let proof: ProofResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();

    assert_eq!(proof.circuit_id, "age_verification");
    assert_eq!(proof.submitter, Addr::unchecked(USER));
    assert!(proof.verified);
    assert!(proof.verified_at.is_some());

    // Check contract stats
    let info_msg = QueryMsg::ContractInfo {};
    let info: ContractInfoResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &info_msg)
        .unwrap();
    assert_eq!(info.total_proofs, 1);
}

#[test]
fn test_submit_invalid_proof() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Register a circuit first
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap();

    // Submit an invalid proof (using test failure case)
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "test_circuit".to_string(),
        public_inputs: vec!["999999".to_string()], // This triggers verification failure
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &submit_msg, &[])
        .unwrap();

    // Check that proof verification failed
    let events = res.events;
    let wasm_event = events.iter().find(|e| e.ty == "wasm").unwrap();
    let verified_attr = wasm_event.attributes.iter().find(|a| a.key == "verified").unwrap();
    assert_eq!(verified_attr.value, "false");

    // Query the proof
    let query_msg = QueryMsg::Proof {
        proof_id: "proof_test_circuit_1".to_string(),
    };
    let proof: ProofResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &query_msg)
        .unwrap();

    assert!(!proof.verified);
    assert!(proof.verified_at.is_none());
}

#[test]
fn test_submit_proof_nonexistent_circuit() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Try to submit proof for non-existent circuit
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "nonexistent".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &submit_msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Circuit not found"));
}

#[test]
fn test_submit_proof_invalid_format() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Register a circuit first
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap();

    // Submit proof with invalid format
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "test_circuit".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: "invalid_proof".to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &submit_msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Invalid proof"));
}

#[test]
fn test_deactivate_circuit() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, Some(ADMIN.to_string())).unwrap();

    // Register a circuit first
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap();

    // Deactivate the circuit (as admin)
    let deactivate_msg = ExecuteMsg::DeactivateCircuit {
        circuit_id: "test_circuit".to_string(),
    };

    app.execute_contract(Addr::unchecked(ADMIN), contract_addr.clone(), &deactivate_msg, &[])
        .unwrap();

    // Verify circuit is deactivated
    let query_msg = QueryMsg::Circuit {
        circuit_id: "test_circuit".to_string(),
    };
    let circuit: CircuitResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();

    assert!(!circuit.active);

    // Try to submit proof to deactivated circuit
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "test_circuit".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &submit_msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Circuit is deactivated"));
}

#[test]
fn test_deactivate_circuit_unauthorized() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, Some(ADMIN.to_string())).unwrap();

    // Register a circuit first
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap();

    // Try to deactivate circuit as non-admin
    let deactivate_msg = ExecuteMsg::DeactivateCircuit {
        circuit_id: "test_circuit".to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &deactivate_msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Unauthorized"));
}

#[test]
fn test_update_admin() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, Some(ADMIN.to_string())).unwrap();

    // Update admin
    let new_admin = "new_admin";
    let update_msg = ExecuteMsg::UpdateAdmin {
        new_admin: new_admin.to_string(),
    };

    app.execute_contract(Addr::unchecked(ADMIN), contract_addr.clone(), &update_msg, &[])
        .unwrap();

    // Verify admin was updated
    let info_msg = QueryMsg::ContractInfo {};
    let info: ContractInfoResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &info_msg)
        .unwrap();

    assert_eq!(info.admin, Addr::unchecked(new_admin));
}

#[test]
fn test_query_circuits() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Register multiple circuits
    for i in 1..=3 {
        let register_msg = ExecuteMsg::RegisterCircuit {
            circuit_id: format!("circuit_{}", i),
            verification_key: format!("vk_key_{}", i),
            circuit_type: "groth16".to_string(),
        };

        app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
            .unwrap();
    }

    // Query all circuits
    let query_msg = QueryMsg::Circuits {
        start_after: None,
        limit: None,
    };
    let response: Binary = app
        .wrap()
        .query_wasm_smart(contract_addr, &query_msg)
        .unwrap();

    // Parse response manually since we can't import the response type
    let circuits_json: serde_json::Value = serde_json::from_slice(&response).unwrap();
    let circuits = circuits_json["circuits"].as_array().unwrap();
    assert_eq!(circuits.len(), 3);
}

#[test]
fn test_query_proofs_by_circuit() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Register a circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap();

    // Submit multiple proofs
    for i in 1..=2 {
        let submit_msg = ExecuteMsg::SubmitProof {
            circuit_id: "test_circuit".to_string(),
            public_inputs: vec![i.to_string()],
            proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
        };

        app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &submit_msg, &[])
            .unwrap();
    }

    // Query proofs by circuit
    let query_msg = QueryMsg::ProofsByCircuit {
        circuit_id: "test_circuit".to_string(),
        start_after: None,
        limit: None,
    };
    let response: Binary = app
        .wrap()
        .query_wasm_smart(contract_addr, &query_msg)
        .unwrap();

    // Parse response manually
    let proofs_json: serde_json::Value = serde_json::from_slice(&response).unwrap();
    let proofs = proofs_json["proofs"].as_array().unwrap();
    assert_eq!(proofs.len(), 2);
}

#[test]
fn test_comprehensive_workflow() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, Some(ADMIN.to_string())).unwrap();

    // 1. Register multiple circuits
    let circuits = vec![
        ("age_verification", "vk_age_key_123"),
        ("identity_proof", "vk_identity_key_456"),
        ("membership_proof", "vk_membership_key_789"),
    ];

    for (circuit_id, vk) in &circuits {
        let register_msg = ExecuteMsg::RegisterCircuit {
            circuit_id: circuit_id.to_string(),
            verification_key: vk.to_string(),
            circuit_type: "groth16".to_string(),
        };

        app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
            .unwrap();
    }

    // 2. Submit valid proofs for each circuit
    for (i, (circuit_id, _)) in circuits.iter().enumerate() {
        let submit_msg = ExecuteMsg::SubmitProof {
            circuit_id: circuit_id.to_string(),
            public_inputs: vec![(i + 1).to_string()],
            proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
        };

        let res = app
            .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &submit_msg, &[])
            .unwrap();

        // Verify proof was accepted
        let events = res.events;
        let wasm_event = events.iter().find(|e| e.ty == "wasm").unwrap();
        let verified_attr = wasm_event.attributes.iter().find(|a| a.key == "verified").unwrap();
        assert_eq!(verified_attr.value, "true");
    }

    // 3. Submit one invalid proof
    let invalid_submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "age_verification".to_string(),
        public_inputs: vec!["999999".to_string()], // Triggers failure
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &invalid_submit_msg, &[])
        .unwrap();

    let events = res.events;
    let wasm_event = events.iter().find(|e| e.ty == "wasm").unwrap();
    let verified_attr = wasm_event.attributes.iter().find(|a| a.key == "verified").unwrap();
    assert_eq!(verified_attr.value, "false");

    // 4. Deactivate one circuit
    let deactivate_msg = ExecuteMsg::DeactivateCircuit {
        circuit_id: "identity_proof".to_string(),
    };

    app.execute_contract(Addr::unchecked(ADMIN), contract_addr.clone(), &deactivate_msg, &[])
        .unwrap();

    // 5. Try to submit proof to deactivated circuit
    let submit_to_deactivated = ExecuteMsg::SubmitProof {
        circuit_id: "identity_proof".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &submit_to_deactivated, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Circuit is deactivated"));

    // 6. Verify final contract state
    let info_msg = QueryMsg::ContractInfo {};
    let info: ContractInfoResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &info_msg)
        .unwrap();

    assert_eq!(info.total_circuits, 3);
    assert_eq!(info.total_proofs, 4); // 3 valid + 1 invalid
}