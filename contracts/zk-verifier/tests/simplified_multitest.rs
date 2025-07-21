use anyhow::Result as AnyResult;
use cosmwasm_std::{Addr, Coin, Empty, Uint128};
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
        governance_enabled: Some(false),
        dao_address: None,
        multisig_config: None,
        timelock_enabled: Some(false),
        min_timelock_delay: Some(3600),
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
fn test_complete_workflow() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // 1. Register a circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "age_verification".to_string(),
        verification_key: "vk_age_verification_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let _res = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap();

    // 2. Query the circuit
    let query_msg = QueryMsg::Circuit {
        circuit_id: "age_verification".to_string(),
    };
    let circuit: CircuitResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();

    assert_eq!(circuit.circuit_id, "age_verification");
    assert!(circuit.active);

    // 3. Submit a valid proof
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "age_verification".to_string(),
        public_inputs: vec!["2023".to_string(), "18".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &submit_msg, &[])
        .unwrap();

    // Check that proof was verified
    let events = res.events;
    let wasm_event = events.iter().find(|e| e.ty == "wasm").unwrap();
    let verified_attr = wasm_event.attributes.iter().find(|a| a.key == "verified").unwrap();
    assert_eq!(verified_attr.value, "true");

    // 4. Query the proof
    let query_msg = QueryMsg::Proof {
        proof_id: "proof_age_verification_1".to_string(),
    };
    let proof: ProofResponse = app
        .wrap()
        .query_wasm_smart(contract_addr.clone(), &query_msg)
        .unwrap();

    assert_eq!(proof.circuit_id, "age_verification");
    assert!(proof.verified);

    // 5. Submit an invalid proof (should fail verification)
    let invalid_submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "age_verification".to_string(),
        public_inputs: vec!["999999".to_string()], // This triggers verification failure
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &invalid_submit_msg, &[])
        .unwrap();

    // Check that proof verification failed
    let events = res.events;
    let wasm_event = events.iter().find(|e| e.ty == "wasm").unwrap();
    let verified_attr = wasm_event.attributes.iter().find(|a| a.key == "verified").unwrap();
    assert_eq!(verified_attr.value, "false");

    // 6. Check final contract state
    let info_msg = QueryMsg::ContractInfo {};
    let info: ContractInfoResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &info_msg)
        .unwrap();

    assert_eq!(info.total_circuits, 1);
    assert_eq!(info.total_proofs, 2); // 1 valid + 1 invalid
}

#[test]
fn test_circuit_deactivation() {
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

    // Try to submit proof to deactivated circuit (should fail)
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "test_circuit".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &submit_msg, &[])
        .unwrap_err();

    // Verify that submission to deactivated circuit fails
    assert!(err.to_string().contains("Error executing WasmMsg"));
}

#[test]
fn test_error_conditions() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // 1. Try to register circuit with duplicate ID
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "vk_test_key_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap();

    // Try to register the same circuit again (should fail)
    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &register_msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Error executing WasmMsg"));

    // 2. Try to submit proof for non-existent circuit (should fail)
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "nonexistent".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr.clone(), &submit_msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Error executing WasmMsg"));

    // 3. Try to submit invalid proof format (should fail)
    let invalid_submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "test_circuit".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: "invalid_proof".to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &invalid_submit_msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Error executing WasmMsg"));
}

#[test]
fn test_admin_functions() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, Some(ADMIN.to_string())).unwrap();

    // 1. Update admin (as current admin)
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
        .query_wasm_smart(contract_addr.clone(), &info_msg)
        .unwrap();

    assert_eq!(info.admin, Addr::unchecked(new_admin));

    // 2. Try to update admin as non-admin (should fail)
    let update_msg = ExecuteMsg::UpdateAdmin {
        new_admin: "another_admin".to_string(),
    };

    let err = app
        .execute_contract(Addr::unchecked(USER), contract_addr, &update_msg, &[])
        .unwrap_err();

    assert!(err.to_string().contains("Error executing WasmMsg"));
}

#[test]
fn test_multiple_circuits_and_proofs() {
    let mut app = mock_app();
    let contract_addr = instantiate_contract(&mut app, None).unwrap();

    // Register multiple circuits
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

    // Submit proofs for each circuit
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

    // Check final state
    let info_msg = QueryMsg::ContractInfo {};
    let info: ContractInfoResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &info_msg)
        .unwrap();

    assert_eq!(info.total_circuits, 3);
    assert_eq!(info.total_proofs, 3);
}