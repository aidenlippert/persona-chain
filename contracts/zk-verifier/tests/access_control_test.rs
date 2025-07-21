use cosmwasm_std::{
    testing::{mock_dependencies, mock_env, mock_info},
    coins, from_json, Addr, StdError,
};
use cw_multi_test::{App, AppBuilder, Contract, ContractWrapper, Executor};
use zk_verifier::{
    contract::{execute, instantiate, query},
    error::ContractError,
    msg::{ExecuteMsg, InstantiateMsg, QueryMsg, ContractInfoResponse, IssuerResponse},
    state::ProposalType,
};

fn contract_template() -> Box<dyn Contract<cosmwasm_std::Empty>> {
    let contract = ContractWrapper::new(execute, instantiate, query);
    Box::new(contract)
}

const ADMIN: &str = "admin";
const USER: &str = "user123";
const ISSUER: &str = "issuer456";
const UNAUTHORIZED_USER: &str = "unauthorized789";

#[test]
fn test_unauthorized_circuit_registration_rejection() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Try to register circuit as unauthorized user - should fail
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "test_vk_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(UNAUTHORIZED_USER),
            contract_addr.clone(),
            &register_msg,
            &[],
        )
        .unwrap_err();

    // Verify unauthorized error
    assert!(err.to_string().contains("Unauthorized"));
}

#[test]
fn test_authorized_admin_circuit_registration() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Register circuit as admin - should succeed
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "admin_circuit".to_string(),
        verification_key: "test_vk_admin_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let res = app
        .execute_contract(
            Addr::unchecked(ADMIN),
            contract_addr.clone(),
            &register_msg,
            &[],
        )
        .unwrap();

    // Verify success
    assert_eq!(res.events[1].attributes[1].value, "register_circuit");
    
    // Verify circuit was registered
    let contract_info: ContractInfoResponse = app
        .wrap()
        .query_wasm_smart(contract_addr, &QueryMsg::ContractInfo {})
        .unwrap();
    
    assert_eq!(contract_info.total_circuits, 1);
}

#[test]
fn test_issuer_based_access_control() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Add issuer with specific circuit authorization
    let add_issuer_msg = ExecuteMsg::AddIssuer {
        issuer_address: ISSUER.to_string(),
        authorized_circuits: vec!["groth16".to_string()],
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &add_issuer_msg,
        &[],
    )
    .unwrap();

    // Issuer should be able to register authorized circuit type
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "issuer_circuit".to_string(),
        verification_key: "test_vk_issuer_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let res = app
        .execute_contract(
            Addr::unchecked(ISSUER),
            contract_addr.clone(),
            &register_msg,
            &[],
        )
        .unwrap();

    assert_eq!(res.events[1].attributes[1].value, "register_circuit");

    // Issuer should NOT be able to register unauthorized circuit type
    let unauthorized_register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "unauthorized_circuit".to_string(),
        verification_key: "test_vk_unauthorized_12345".to_string(),
        circuit_type: "plonk".to_string(), // Not authorized
    };

    let err = app
        .execute_contract(
            Addr::unchecked(ISSUER),
            contract_addr.clone(),
            &unauthorized_register_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("UnauthorizedCircuitType"));
}

#[test]
fn test_deactivated_issuer_rejection() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Add issuer
    let add_issuer_msg = ExecuteMsg::AddIssuer {
        issuer_address: ISSUER.to_string(),
        authorized_circuits: vec!["groth16".to_string()],
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &add_issuer_msg,
        &[],
    )
    .unwrap();

    // Remove issuer
    let remove_issuer_msg = ExecuteMsg::RemoveIssuer {
        issuer_address: ISSUER.to_string(),
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &remove_issuer_msg,
        &[],
    )
    .unwrap();

    // Former issuer should not be able to register circuits
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "deactivated_circuit".to_string(),
        verification_key: "test_vk_deactivated_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(ISSUER),
            contract_addr.clone(),
            &register_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("Unauthorized"));
}

#[test]
fn test_unauthorized_proof_submission() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Try to submit proof for non-existent circuit - should fail
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "nonexistent_circuit".to_string(),
        public_inputs: vec!["123".to_string()],
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(USER),
            contract_addr.clone(),
            &submit_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("CircuitNotFound"));
}

#[test]
fn test_governance_proposal_workflow() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract with governance enabled
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(true),
                dao_address: None,
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Submit governance proposal to add issuer
    let proposal_msg = ExecuteMsg::SubmitGovernanceProposal {
        title: "Add new issuer".to_string(),
        description: "Proposal to add a new authorized issuer".to_string(),
        proposal_type: ProposalType::AddIssuer {
            issuer_address: ISSUER.to_string(),
            authorized_circuits: vec!["groth16".to_string()],
        },
    };

    let res = app
        .execute_contract(
            Addr::unchecked(USER),
            contract_addr.clone(),
            &proposal_msg,
            &[],
        )
        .unwrap();

    // Extract proposal ID from events
    let proposal_id = res.events[1].attributes
        .iter()
        .find(|attr| attr.key == "proposal_id")
        .unwrap()
        .value
        .parse::<u64>()
        .unwrap();

    // Vote on proposal
    let vote_msg = ExecuteMsg::VoteOnProposal {
        proposal_id,
        vote: true,
    };

    app.execute_contract(
        Addr::unchecked(USER),
        contract_addr.clone(),
        &vote_msg,
        &[],
    )
    .unwrap();

    // Fast-forward time (simulate voting period end)
    let mut env = mock_env();
    env.block.time = env.block.time.plus_seconds(7 * 24 * 60 * 60 + 1); // 7 days + 1 second

    // Execute proposal
    let execute_proposal_msg = ExecuteMsg::ExecuteProposal { proposal_id };

    let res = app
        .execute_contract(
            Addr::unchecked(ADMIN),
            contract_addr.clone(),
            &execute_proposal_msg,
            &[],
        )
        .unwrap();

    // Verify issuer was added
    let issuer_response: IssuerResponse = app
        .wrap()
        .query_wasm_smart(
            contract_addr,
            &QueryMsg::Issuer {
                address: ISSUER.to_string(),
            },
        )
        .unwrap();

    assert_eq!(issuer_response.address, ISSUER);
    assert_eq!(issuer_response.authorized_circuits, vec!["groth16"]);
    assert!(issuer_response.active);
}

#[test]
fn test_invalid_proof_rejection() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Register circuit first
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "test_vk_12345".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Submit invalid proof - should be marked as unverified
    let submit_msg = ExecuteMsg::SubmitProof {
        circuit_id: "test_circuit".to_string(),
        public_inputs: vec!["999999".to_string()], // This triggers failure in mock verifier
        proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
    };

    let res = app
        .execute_contract(
            Addr::unchecked(USER),
            contract_addr.clone(),
            &submit_msg,
            &[],
        )
        .unwrap();

    // Check that proof was marked as unverified
    let verified_attr = res.events[1].attributes
        .iter()
        .find(|attr| attr.key == "verified")
        .unwrap();
    
    assert_eq!(verified_attr.value, "false");
}

#[test]
fn test_admin_only_operations() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Non-admin trying to add issuer should fail
    let add_issuer_msg = ExecuteMsg::AddIssuer {
        issuer_address: ISSUER.to_string(),
        authorized_circuits: vec!["groth16".to_string()],
    };

    let err = app
        .execute_contract(
            Addr::unchecked(USER),
            contract_addr.clone(),
            &add_issuer_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("Unauthorized"));

    // Non-admin trying to update admin should fail
    let update_admin_msg = ExecuteMsg::UpdateAdmin {
        new_admin: USER.to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(USER),
            contract_addr.clone(),
            &update_admin_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("Unauthorized"));

    // Admin operations should succeed
    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &add_issuer_msg,
        &[],
    )
    .unwrap();

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &update_admin_msg,
        &[],
    )
    .unwrap();
}