use cosmwasm_std::{DepsMut, Deps, Env, MessageInfo, Response, Addr, StdResult};
use crate::error::ContractError;
use crate::state::{
    Config, MultisigConfig, TimelockTransaction, AccessControlRole,
    CONFIG, TIMELOCK_TRANSACTIONS, ACCESS_CONTROL_ROLES, ROLE_MEMBERS
};

// Role-based access control constants
pub const ADMIN_ROLE: &str = "ADMIN";
pub const CIRCUIT_MANAGER_ROLE: &str = "CIRCUIT_MANAGER";
pub const ISSUER_MANAGER_ROLE: &str = "ISSUER_MANAGER";
pub const GOVERNANCE_ROLE: &str = "GOVERNANCE";

/// Check if an address has a specific role
pub fn has_role(deps: Deps, role: &str, account: &Addr) -> StdResult<bool> {
    ROLE_MEMBERS.may_load(deps.storage, (role, account.as_str()))
        .map(|result| result.unwrap_or(false))
}

/// Check if sender has required role, returns error if not
pub fn require_role(deps: Deps, role: &str, sender: &Addr) -> Result<(), ContractError> {
    if !has_role(deps, role, sender)? {
        return Err(ContractError::MissingRole { 
            role: role.to_string(),
            account: sender.to_string()
        });
    }
    Ok(())
}

/// Grant role to an account (only role admin can do this)
pub fn grant_role(
    deps: DepsMut,
    info: MessageInfo,
    role: &str,
    account: &Addr,
) -> Result<Response, ContractError> {
    // Check if sender can manage this role
    let role_info = ACCESS_CONTROL_ROLES.may_load(deps.storage, role)?;
    
    match role_info {
        Some(role_data) => {
            if let Some(admin_role) = &role_data.admin_role {
                require_role(deps.as_ref(), admin_role, &info.sender)?;
            } else {
                // Only default admin can manage roles without admin_role
                require_role(deps.as_ref(), ADMIN_ROLE, &info.sender)?;
            }
        }
        None => {
            // Only default admin can create new roles
            require_role(deps.as_ref(), ADMIN_ROLE, &info.sender)?;
            
            // Create new role
            let new_role = AccessControlRole {
                role_name: role.to_string(),
                members: vec![],
                admin_role: Some(ADMIN_ROLE.to_string()),
            };
            ACCESS_CONTROL_ROLES.save(deps.storage, role, &new_role)?;
        }
    }

    // Grant the role
    ROLE_MEMBERS.save(deps.storage, (role, account.as_str()), &true)?;

    // Update role members list
    let mut role_data = ACCESS_CONTROL_ROLES.load(deps.storage, role)?;
    if !role_data.members.contains(account) {
        role_data.members.push(account.clone());
        ACCESS_CONTROL_ROLES.save(deps.storage, role, &role_data)?;
    }

    Ok(Response::new()
        .add_attribute("action", "grant_role")
        .add_attribute("role", role)
        .add_attribute("account", account)
        .add_attribute("granted_by", info.sender))
}

/// Revoke role from an account
pub fn revoke_role(
    deps: DepsMut,
    info: MessageInfo,
    role: &str,
    account: &Addr,
) -> Result<Response, ContractError> {
    let role_info = ACCESS_CONTROL_ROLES.load(deps.storage, role)?;
    
    if let Some(admin_role) = &role_info.admin_role {
        require_role(deps.as_ref(), admin_role, &info.sender)?;
    } else {
        require_role(deps.as_ref(), ADMIN_ROLE, &info.sender)?;
    }

    // Revoke the role
    ROLE_MEMBERS.remove(deps.storage, (role, account.as_str()));

    // Update role members list
    let mut role_data = role_info;
    role_data.members.retain(|addr| addr != account);
    ACCESS_CONTROL_ROLES.save(deps.storage, role, &role_data)?;

    Ok(Response::new()
        .add_attribute("action", "revoke_role")
        .add_attribute("role", role)
        .add_attribute("account", account)
        .add_attribute("revoked_by", info.sender))
}

/// Schedule a timelock transaction
pub fn schedule_timelock_transaction(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    target_function: String,
    params: String,
    delay: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    if !config.timelock_enabled {
        return Err(ContractError::TimelockNotEnabled {});
    }

    if delay < config.min_timelock_delay {
        return Err(ContractError::TimelockDelayTooShort {
            provided: delay,
            minimum: config.min_timelock_delay,
        });
    }

    // Only admin or authorized roles can schedule timelock transactions
    require_role(deps.as_ref(), ADMIN_ROLE, &info.sender)?;

    let transaction_id = get_next_timelock_id(deps.storage)?;
    let scheduled_time = env.block.time.seconds() + delay;

    let timelock_tx = TimelockTransaction {
        id: transaction_id,
        proposer: info.sender,
        target_function,
        params,
        scheduled_time,
        executed: false,
        cancelled: false,
        approvals: vec![],
        created_at: env.block.time.seconds(),
    };

    TIMELOCK_TRANSACTIONS.save(deps.storage, transaction_id, &timelock_tx)?;

    Ok(Response::new()
        .add_attribute("action", "schedule_timelock")
        .add_attribute("transaction_id", transaction_id.to_string())
        .add_attribute("scheduled_time", scheduled_time.to_string()))
}

/// Execute a timelock transaction
pub fn execute_timelock_transaction(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    transaction_id: u64,
) -> Result<Response, ContractError> {
    let mut timelock_tx = TIMELOCK_TRANSACTIONS.load(deps.storage, transaction_id)?;
    
    if timelock_tx.executed {
        return Err(ContractError::TimelockAlreadyExecuted { id: transaction_id });
    }

    if timelock_tx.cancelled {
        return Err(ContractError::TimelockCancelled { id: transaction_id });
    }

    if env.block.time.seconds() < timelock_tx.scheduled_time {
        return Err(ContractError::TimelockNotReady {
            id: transaction_id,
            ready_at: timelock_tx.scheduled_time,
        });
    }

    let config = CONFIG.load(deps.storage)?;

    // Check multisig requirements if enabled
    if let Some(multisig) = &config.multisig_config {
        if multisig.enabled {
            // Verify sufficient approvals
            if timelock_tx.approvals.len() < multisig.threshold as usize {
                return Err(ContractError::InsufficientMultisigApprovals {
                    required: multisig.threshold,
                    provided: timelock_tx.approvals.len() as u64,
                });
            }

            // Verify all approvals are from valid signers
            for approval in &timelock_tx.approvals {
                if !multisig.signers.contains(approval) {
                    return Err(ContractError::InvalidMultisigSigner {
                        signer: approval.to_string(),
                    });
                }
            }
        }
    }

    // Mark as executed
    timelock_tx.executed = true;
    TIMELOCK_TRANSACTIONS.save(deps.storage, transaction_id, &timelock_tx)?;

    Ok(Response::new()
        .add_attribute("action", "execute_timelock")
        .add_attribute("transaction_id", transaction_id.to_string())
        .add_attribute("executor", info.sender))
}

/// Approve a timelock transaction (for multisig)
pub fn approve_timelock_transaction(
    deps: DepsMut,
    info: MessageInfo,
    transaction_id: u64,
) -> Result<Response, ContractError> {
    let mut timelock_tx = TIMELOCK_TRANSACTIONS.load(deps.storage, transaction_id)?;
    let config = CONFIG.load(deps.storage)?;

    if timelock_tx.executed {
        return Err(ContractError::TimelockAlreadyExecuted { id: transaction_id });
    }

    if timelock_tx.cancelled {
        return Err(ContractError::TimelockCancelled { id: transaction_id });
    }

    // Check if multisig is enabled
    let multisig = config.multisig_config
        .ok_or(ContractError::MultisigNotEnabled {})?;

    if !multisig.enabled {
        return Err(ContractError::MultisigNotEnabled {});
    }

    // Check if sender is a valid signer
    if !multisig.signers.contains(&info.sender) {
        return Err(ContractError::InvalidMultisigSigner {
            signer: info.sender.to_string(),
        });
    }

    // Check if already approved
    if timelock_tx.approvals.contains(&info.sender) {
        return Err(ContractError::AlreadyApproved {
            signer: info.sender.to_string(),
        });
    }

    // Add approval
    timelock_tx.approvals.push(info.sender.clone());
    TIMELOCK_TRANSACTIONS.save(deps.storage, transaction_id, &timelock_tx)?;

    Ok(Response::new()
        .add_attribute("action", "approve_timelock")
        .add_attribute("transaction_id", transaction_id.to_string())
        .add_attribute("approver", info.sender)
        .add_attribute("total_approvals", timelock_tx.approvals.len().to_string()))
}

/// Initialize default roles
pub fn initialize_roles(deps: DepsMut, admin: &Addr) -> StdResult<()> {
    // Create admin role
    let admin_role = AccessControlRole {
        role_name: ADMIN_ROLE.to_string(),
        members: vec![admin.clone()],
        admin_role: None, // Admin role manages itself
    };
    ACCESS_CONTROL_ROLES.save(deps.storage, ADMIN_ROLE, &admin_role)?;
    ROLE_MEMBERS.save(deps.storage, (ADMIN_ROLE, admin.as_str()), &true)?;

    // Create circuit manager role
    let circuit_manager_role = AccessControlRole {
        role_name: CIRCUIT_MANAGER_ROLE.to_string(),
        members: vec![],
        admin_role: Some(ADMIN_ROLE.to_string()),
    };
    ACCESS_CONTROL_ROLES.save(deps.storage, CIRCUIT_MANAGER_ROLE, &circuit_manager_role)?;

    // Create issuer manager role
    let issuer_manager_role = AccessControlRole {
        role_name: ISSUER_MANAGER_ROLE.to_string(),
        members: vec![],
        admin_role: Some(ADMIN_ROLE.to_string()),
    };
    ACCESS_CONTROL_ROLES.save(deps.storage, ISSUER_MANAGER_ROLE, &issuer_manager_role)?;

    // Create governance role
    let governance_role = AccessControlRole {
        role_name: GOVERNANCE_ROLE.to_string(),
        members: vec![],
        admin_role: Some(ADMIN_ROLE.to_string()),
    };
    ACCESS_CONTROL_ROLES.save(deps.storage, GOVERNANCE_ROLE, &governance_role)?;

    Ok(())
}

fn get_next_timelock_id(storage: &dyn cosmwasm_std::Storage) -> StdResult<u64> {
    let mut max_id = 0u64;
    
    for result in TIMELOCK_TRANSACTIONS.range(storage, None, None, cosmwasm_std::Order::Ascending) {
        let (id, _) = result?;
        if id > max_id {
            max_id = id;
        }
    }
    
    Ok(max_id + 1)
}

/// Query role members
pub fn query_role_members(deps: Deps, role: &str) -> StdResult<Vec<Addr>> {
    let members: Result<Vec<_>, _> = ROLE_MEMBERS
        .prefix(role)
        .range(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .map(|item| {
            let (addr_str, _) = item?;
            Ok(Addr::unchecked(addr_str))
        })
        .collect();
    
    members
}

/// Query timelock transaction
pub fn query_timelock_transaction(deps: Deps, transaction_id: u64) -> Result<TimelockTransaction, ContractError> {
    TIMELOCK_TRANSACTIONS.load(deps.storage, transaction_id)
        .map_err(|_| ContractError::TimelockNotFound { id: transaction_id })
}