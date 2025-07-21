use cosmwasm_std::{
    testing::{mock_dependencies, mock_env, mock_info},
    coins, Addr, StdError,
};
use cw_multi_test::{App, AppBuilder, Contract, ContractWrapper, Executor};
use zk_verifier::{
    contract::{execute, instantiate, query},
    error::ContractError,
    msg::{ExecuteMsg, InstantiateMsg, QueryMsg},
    access_control::{ADMIN_ROLE, CIRCUIT_MANAGER_ROLE, ISSUER_MANAGER_ROLE},
};

fn contract_template() -> Box<dyn Contract<cosmwasm_std::Empty>> {
    let contract = ContractWrapper::new(execute, instantiate, query);
    Box::new(contract)
}

const ADMIN: &str = "admin";
const USER1: &str = "user1";
const USER2: &str = "user2";
const UNAUTHORIZED: &str = "unauthorized";

#[test]
fn test_role_based_access_control() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Instantiate contract with security features
    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(true),
                dao_address: None,
                multisig_config: None,
                timelock_enabled: Some(true),
                min_timelock_delay: Some(3600), // 1 hour
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Test: Admin should have ADMIN_ROLE by default
    let has_admin_role: bool = app
        .wrap()
        .query_wasm_smart(
            contract_addr.clone(),
            &QueryMsg::HasRole {
                role: ADMIN_ROLE.to_string(),
                account: ADMIN.to_string(),
            },
        )
        .unwrap();
    assert!(has_admin_role);

    // Test: Grant CIRCUIT_MANAGER_ROLE to USER1
    let grant_msg = ExecuteMsg::GrantRole {
        role: CIRCUIT_MANAGER_ROLE.to_string(),
        account: USER1.to_string(),
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &grant_msg,
        &[],
    )
    .unwrap();

    // Verify USER1 has CIRCUIT_MANAGER_ROLE
    let has_circuit_role: bool = app
        .wrap()
        .query_wasm_smart(
            contract_addr.clone(),
            &QueryMsg::HasRole {
                role: CIRCUIT_MANAGER_ROLE.to_string(),
                account: USER1.to_string(),
            },
        )
        .unwrap();
    assert!(has_circuit_role);

    // Test: USER1 should be able to register circuits with role
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "test_circuit".to_string(),
        verification_key: "test_vk".to_string(),
        circuit_type: "groth16".to_string(),
    };

    app.execute_contract(
        Addr::unchecked(USER1),
        contract_addr.clone(),
        &register_msg,
        &[],
    )
    .unwrap();

    // Test: USER2 without role should NOT be able to register circuits
    let register_msg2 = ExecuteMsg::RegisterCircuit {
        circuit_id: "unauthorized_circuit".to_string(),
        verification_key: "test_vk".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(USER2),
            contract_addr.clone(),
            &register_msg2,
            &[],
        )
        .unwrap_err();
    
    assert!(err.to_string().contains("MissingRole"));
}

#[test]
fn test_unauthorized_role_grant_rejection() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(true),
                dao_address: None,
                multisig_config: None,
                timelock_enabled: Some(false),
                min_timelock_delay: Some(0),
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Test: Unauthorized user cannot grant roles
    let grant_msg = ExecuteMsg::GrantRole {
        role: CIRCUIT_MANAGER_ROLE.to_string(),
        account: USER1.to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(UNAUTHORIZED),
            contract_addr.clone(),
            &grant_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("MissingRole"));
    assert!(err.to_string().contains("ADMIN"));
}

#[test]
fn test_timelock_functionality() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(true),
                dao_address: None,
                multisig_config: None,
                timelock_enabled: Some(true),
                min_timelock_delay: Some(3600), // 1 hour
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Test: Schedule timelock transaction
    let schedule_msg = ExecuteMsg::ScheduleTimelockTransaction {
        target_function: "update_admin".to_string(),
        params: r#"{"new_admin": "new_admin_address"}"#.to_string(),
        delay: 7200, // 2 hours
    };

    let res = app
        .execute_contract(
            Addr::unchecked(ADMIN),
            contract_addr.clone(),
            &schedule_msg,
            &[],
        )
        .unwrap();

    // Extract transaction ID from events
    let transaction_id = res.events[1].attributes
        .iter()
        .find(|attr| attr.key == "transaction_id")
        .unwrap()
        .value
        .parse::<u64>()
        .unwrap();

    // Test: Cannot execute before timelock expires
    let execute_msg = ExecuteMsg::ExecuteTimelockTransaction { 
        transaction_id 
    };

    let err = app
        .execute_contract(
            Addr::unchecked(ADMIN),
            contract_addr.clone(),
            &execute_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("TimelockNotReady"));

    // Test: Can execute after timelock expires (simulated by updating block time)
    // Note: In real tests, we would advance block time appropriately
}

#[test]
fn test_multisig_requirements() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    // Setup multisig configuration
    let multisig_config = MultisigConfig {
        signers: vec![
            Addr::unchecked("signer1"),
            Addr::unchecked("signer2"), 
            Addr::unchecked("signer3"),
        ],
        threshold: 2,
        enabled: true,
    };

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(true),
                dao_address: None,
                multisig_config: Some(multisig_config),
                timelock_enabled: Some(true),
                min_timelock_delay: Some(3600),
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Schedule a timelock transaction
    let schedule_msg = ExecuteMsg::ScheduleTimelockTransaction {
        target_function: "critical_function".to_string(),
        params: "{}".to_string(),
        delay: 3600,
    };

    let res = app
        .execute_contract(
            Addr::unchecked(ADMIN),
            contract_addr.clone(),
            &schedule_msg,
            &[],
        )
        .unwrap();

    let transaction_id = res.events[1].attributes
        .iter()
        .find(|attr| attr.key == "transaction_id")
        .unwrap()
        .value
        .parse::<u64>()
        .unwrap();

    // Test: First approval
    let approve_msg = ExecuteMsg::ApproveTimelockTransaction { 
        transaction_id 
    };

    app.execute_contract(
        Addr::unchecked("signer1"),
        contract_addr.clone(),
        &approve_msg,
        &[],
    )
    .unwrap();

    // Test: Second approval
    app.execute_contract(
        Addr::unchecked("signer2"),
        contract_addr.clone(),
        &approve_msg,
        &[],
    )
    .unwrap();

    // Test: Cannot approve twice
    let err = app
        .execute_contract(
            Addr::unchecked("signer1"),
            contract_addr.clone(),
            &approve_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("AlreadyApproved"));

    // Test: Invalid signer cannot approve
    let err = app
        .execute_contract(
            Addr::unchecked("invalid_signer"),
            contract_addr.clone(),
            &approve_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("InvalidMultisigSigner"));
}

#[test]
fn test_access_control_circuit_registration() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
                multisig_config: None,
                timelock_enabled: Some(false),
                min_timelock_delay: Some(0),
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Grant CIRCUIT_MANAGER_ROLE to USER1
    let grant_msg = ExecuteMsg::GrantRole {
        role: CIRCUIT_MANAGER_ROLE.to_string(),
        account: USER1.to_string(),
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &grant_msg,
        &[],
    )
    .unwrap();

    // Test: USER1 with role can register circuit
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "authorized_circuit".to_string(),
        verification_key: "test_vk".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let res = app
        .execute_contract(
            Addr::unchecked(USER1),
            contract_addr.clone(),
            &register_msg,
            &[],
        )
        .unwrap();

    assert_eq!(res.events[1].attributes[1].value, "register_circuit");

    // Test: USER2 without role cannot register circuit
    let register_msg2 = ExecuteMsg::RegisterCircuit {
        circuit_id: "unauthorized_circuit".to_string(),
        verification_key: "test_vk".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(USER2),
            contract_addr.clone(),
            &register_msg2,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("MissingRole"));
    assert!(err.to_string().contains("CIRCUIT_MANAGER"));
}

#[test]
fn test_role_revocation() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
                multisig_config: None,
                timelock_enabled: Some(false),
                min_timelock_delay: Some(0),
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Grant role to USER1
    let grant_msg = ExecuteMsg::GrantRole {
        role: CIRCUIT_MANAGER_ROLE.to_string(),
        account: USER1.to_string(),
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &grant_msg,
        &[],
    )
    .unwrap();

    // Verify USER1 has the role
    let has_role: bool = app
        .wrap()
        .query_wasm_smart(
            contract_addr.clone(),
            &QueryMsg::HasRole {
                role: CIRCUIT_MANAGER_ROLE.to_string(),
                account: USER1.to_string(),
            },
        )
        .unwrap();
    assert!(has_role);

    // Revoke role from USER1
    let revoke_msg = ExecuteMsg::RevokeRole {
        role: CIRCUIT_MANAGER_ROLE.to_string(),
        account: USER1.to_string(),
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &revoke_msg,
        &[],
    )
    .unwrap();

    // Verify USER1 no longer has the role
    let has_role_after: bool = app
        .wrap()
        .query_wasm_smart(
            contract_addr.clone(),
            &QueryMsg::HasRole {
                role: CIRCUIT_MANAGER_ROLE.to_string(),
                account: USER1.to_string(),
            },
        )
        .unwrap();
    assert!(!has_role_after);

    // Test: USER1 can no longer register circuits
    let register_msg = ExecuteMsg::RegisterCircuit {
        circuit_id: "revoked_user_circuit".to_string(),
        verification_key: "test_vk".to_string(),
        circuit_type: "groth16".to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(USER1),
            contract_addr.clone(),
            &register_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("MissingRole"));
}

#[test]
fn test_least_privilege_principle() {
    let mut app = App::default();
    let code_id = app.store_code(contract_template());

    let contract_addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(ADMIN),
            &InstantiateMsg {
                admin: Some(ADMIN.to_string()),
                governance_enabled: Some(false),
                dao_address: None,
                multisig_config: None,
                timelock_enabled: Some(false),
                min_timelock_delay: Some(0),
            },
            &[],
            "ZK Verifier",
            None,
        )
        .unwrap();

    // Grant only CIRCUIT_MANAGER_ROLE to USER1
    let grant_msg = ExecuteMsg::GrantRole {
        role: CIRCUIT_MANAGER_ROLE.to_string(),
        account: USER1.to_string(),
    };

    app.execute_contract(
        Addr::unchecked(ADMIN),
        contract_addr.clone(),
        &grant_msg,
        &[],
    )
    .unwrap();

    // Test: USER1 with CIRCUIT_MANAGER_ROLE cannot manage issuers
    let add_issuer_msg = ExecuteMsg::AddIssuer {
        issuer_address: "some_issuer".to_string(),
        authorized_circuits: vec!["groth16".to_string()],
    };

    let err = app
        .execute_contract(
            Addr::unchecked(USER1),
            contract_addr.clone(),
            &add_issuer_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("MissingRole"));

    // Test: USER1 with CIRCUIT_MANAGER_ROLE cannot grant roles
    let grant_other_role_msg = ExecuteMsg::GrantRole {
        role: ISSUER_MANAGER_ROLE.to_string(),
        account: USER2.to_string(),
    };

    let err = app
        .execute_contract(
            Addr::unchecked(USER1),
            contract_addr.clone(),
            &grant_other_role_msg,
            &[],
        )
        .unwrap_err();

    assert!(err.to_string().contains("MissingRole"));
    assert!(err.to_string().contains("ADMIN"));
}

// Mock imports for test compilation
use zk_verifier::state::MultisigConfig;