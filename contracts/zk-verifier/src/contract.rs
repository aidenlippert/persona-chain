use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    Order,
};
use cw_storage_plus::Bound;
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, CircuitResponse, CircuitsResponse, 
    ProofResponse, ProofsResponse, ContractInfoResponse, IssuerResponse, IssuersResponse,
    ProposalResponse, ProposalsResponse};
use crate::state::{Config, Circuit, Proof, Issuer, GovernanceProposal, ProposalType,
    CONFIG, CIRCUITS, PROOFS, CIRCUIT_PROOFS, ISSUERS, GOVERNANCE_PROPOSALS, VOTERS};
use crate::verifier::{verify_proof, validate_verification_key, validate_proof};

// version info for migration
const CONTRACT_NAME: &str = "crates.io:zk-verifier";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

const DEFAULT_LIMIT: u32 = 10;
const MAX_LIMIT: u32 = 100;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let admin = msg.admin
        .map(|a| deps.api.addr_validate(&a))
        .transpose()?
        .unwrap_or(info.sender);

    let config = Config {
        admin: admin.clone(),
        total_circuits: 0,
        total_proofs: 0,
        governance_enabled: msg.governance_enabled.unwrap_or(false),
        dao_address: msg.dao_address
            .map(|a| deps.api.addr_validate(&a))
            .transpose()?,
        multisig_config: msg.multisig_config,
        timelock_enabled: msg.timelock_enabled.unwrap_or(false),
        min_timelock_delay: msg.min_timelock_delay.unwrap_or(3600), // Default 1 hour
    };
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("admin", config.admin)
        .add_attribute("contract_version", CONTRACT_VERSION))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::RegisterCircuit {
            circuit_id,
            verification_key,
            circuit_type,
        } => execute_register_circuit(deps, env, info, circuit_id, verification_key, circuit_type),
        ExecuteMsg::DeactivateCircuit { circuit_id } => {
            execute_deactivate_circuit(deps, env, info, circuit_id)
        }
        ExecuteMsg::SubmitProof {
            circuit_id,
            public_inputs,
            proof,
        } => execute_submit_proof(deps, env, info, circuit_id, public_inputs, proof),
        ExecuteMsg::UpdateAdmin { new_admin } => {
            execute_update_admin(deps, env, info, new_admin)
        }
        ExecuteMsg::AddIssuer { issuer_address, authorized_circuits } => {
            execute_add_issuer(deps, env, info, issuer_address, authorized_circuits)
        }
        ExecuteMsg::RemoveIssuer { issuer_address } => {
            execute_remove_issuer(deps, env, info, issuer_address)
        }
        ExecuteMsg::SubmitGovernanceProposal { title, description, proposal_type } => {
            execute_submit_governance_proposal(deps, env, info, title, description, proposal_type)
        }
        ExecuteMsg::VoteOnProposal { proposal_id, vote } => {
            execute_vote_on_proposal(deps, env, info, proposal_id, vote)
        }
        ExecuteMsg::ExecuteProposal { proposal_id } => {
            execute_governance_proposal(deps, env, info, proposal_id)
        }
        ExecuteMsg::GrantRole { role, account } => {
            let validated_account = deps.api.addr_validate(&account)?;
            crate::access_control::grant_role(deps, info, &role, &validated_account)
        }
        ExecuteMsg::RevokeRole { role, account } => {
            let validated_account = deps.api.addr_validate(&account)?;
            crate::access_control::revoke_role(deps, info, &role, &validated_account)
        }
        ExecuteMsg::ScheduleTimelockTransaction { target_function, params, delay } => {
            crate::access_control::schedule_timelock_transaction(deps, env, info, target_function, params, delay)
        }
        ExecuteMsg::ExecuteTimelockTransaction { transaction_id } => {
            crate::access_control::execute_timelock_transaction(deps, env, info, transaction_id)
        }
        ExecuteMsg::ApproveTimelockTransaction { transaction_id } => {
            crate::access_control::approve_timelock_transaction(deps, info, transaction_id)
        }
    }
}

pub fn execute_register_circuit(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    circuit_id: String,
    verification_key: String,
    circuit_type: String,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    // Check authorization - admin or authorized issuer
    let sender_str = info.sender.as_str();
    if info.sender != config.admin {
        let issuer = ISSUERS.may_load(deps.storage, sender_str)?;
        match issuer {
            Some(issuer_info) => {
                if !issuer_info.active {
                    return Err(ContractError::IssuerDeactivated { address: info.sender.to_string() });
                }
                if !issuer_info.authorized_circuits.contains(&circuit_type) {
                    return Err(ContractError::UnauthorizedCircuitType { 
                        circuit_type: circuit_type.clone(),
                        authorized: issuer_info.authorized_circuits 
                    });
                }
            }
            None => return Err(ContractError::Unauthorized {}),
        }
    }

    // Validate inputs
    if circuit_id.is_empty() {
        return Err(ContractError::EmptyCircuitId {});
    }

    validate_verification_key(&verification_key)
        .map_err(|e| ContractError::Std(e))?;

    // Check if circuit already exists
    if CIRCUITS.has(deps.storage, &circuit_id) {
        return Err(ContractError::CircuitAlreadyExists { circuit_id });
    }

    let circuit = Circuit {
        circuit_id: circuit_id.clone(),
        verification_key,
        circuit_type,
        creator: info.sender,
        active: true,
        created_at: env.block.time.seconds(),
    };

    CIRCUITS.save(deps.storage, &circuit_id, &circuit)?;
    
    config.total_circuits += 1;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "register_circuit")
        .add_attribute("circuit_id", circuit_id)
        .add_attribute("creator", circuit.creator))
}

pub fn execute_deactivate_circuit(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    circuit_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Only admin can deactivate circuits
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    let mut circuit = CIRCUITS.load(deps.storage, &circuit_id)
        .map_err(|_| ContractError::CircuitNotFound { circuit_id: circuit_id.clone() })?;

    circuit.active = false;
    CIRCUITS.save(deps.storage, &circuit_id, &circuit)?;

    Ok(Response::new()
        .add_attribute("method", "deactivate_circuit")
        .add_attribute("circuit_id", circuit_id))
}

pub fn execute_submit_proof(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    circuit_id: String,
    public_inputs: Vec<String>,
    proof: String,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    // Validate proof format
    validate_proof(&proof)
        .map_err(|e| ContractError::Std(e))?;

    // Check if circuit exists and is active
    let circuit = CIRCUITS.load(deps.storage, &circuit_id)
        .map_err(|_| ContractError::CircuitNotFound { circuit_id: circuit_id.clone() })?;

    if !circuit.active {
        return Err(ContractError::CircuitDeactivated { circuit_id });
    }

    // Generate proof ID
    let proof_id = format!("proof_{}_{}", circuit_id, config.total_proofs + 1);

    // Verify the proof
    let verification_result = verify_proof(&circuit.verification_key, &public_inputs, &proof)?;

    let proof_record = Proof {
        proof_id: proof_id.clone(),
        circuit_id: circuit_id.clone(),
        submitter: info.sender,
        public_inputs,
        proof,
        verified: verification_result,
        submitted_at: env.block.time.seconds(),
        verified_at: if verification_result { Some(env.block.time.seconds()) } else { None },
    };

    PROOFS.save(deps.storage, &proof_id, &proof_record)?;
    CIRCUIT_PROOFS.save(deps.storage, (&circuit_id, &proof_id), &true)?;
    
    config.total_proofs += 1;
    CONFIG.save(deps.storage, &config)?;

    let mut response = Response::new()
        .add_attribute("method", "submit_proof")
        .add_attribute("proof_id", proof_id)
        .add_attribute("circuit_id", circuit_id)
        .add_attribute("verified", verification_result.to_string());

    if verification_result {
        response = response.add_attribute("status", "verified");
    } else {
        response = response.add_attribute("status", "verification_failed");
    }

    Ok(response)
}

pub fn execute_update_admin(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    new_admin: String,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;
    
    // Only current admin can update admin
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    let new_admin = deps.api.addr_validate(&new_admin)?;
    config.admin = new_admin.clone();
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "update_admin")
        .add_attribute("new_admin", new_admin))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Circuit { circuit_id } => to_json_binary(&query_circuit(deps, circuit_id)?),
        QueryMsg::Circuits { start_after, limit } => {
            to_json_binary(&query_circuits(deps, start_after, limit)?)
        }
        QueryMsg::Proof { proof_id } => to_json_binary(&query_proof(deps, proof_id)?),
        QueryMsg::ProofsByCircuit {
            circuit_id,
            start_after,
            limit,
        } => to_json_binary(&query_proofs_by_circuit(deps, circuit_id, start_after, limit)?),
        QueryMsg::ContractInfo {} => to_json_binary(&query_contract_info(deps)?),
        QueryMsg::Issuers { start_after, limit } => {
            to_json_binary(&query_issuers(deps, start_after, limit)?)
        }
        QueryMsg::Issuer { address } => to_json_binary(&query_issuer(deps, address)?),
        QueryMsg::Proposals { start_after, limit } => {
            to_json_binary(&query_proposals(deps, start_after, limit)?)
        }
        QueryMsg::Proposal { proposal_id } => to_json_binary(&query_proposal(deps, proposal_id)?),
        QueryMsg::HasRole { role, account } => {
            let validated_account = deps.api.addr_validate(&account)?;
            to_json_binary(&crate::access_control::has_role(deps, &role, &validated_account)?)
        }
        QueryMsg::RoleMembers { role } => {
            to_json_binary(&crate::access_control::query_role_members(deps, &role)?)
        }
        QueryMsg::TimelockTransaction { transaction_id } => {
            match crate::access_control::query_timelock_transaction(deps, transaction_id) {
                Ok(tx) => to_json_binary(&tx),
                Err(_) => Err(cosmwasm_std::StdError::not_found("timelock transaction"))
            }
        }
    }
}

fn query_circuit(deps: Deps, circuit_id: String) -> StdResult<CircuitResponse> {
    let circuit = CIRCUITS.load(deps.storage, &circuit_id)?;
    Ok(CircuitResponse {
        circuit_id: circuit.circuit_id,
        verification_key: circuit.verification_key,
        circuit_type: circuit.circuit_type,
        creator: circuit.creator,
        active: circuit.active,
        created_at: circuit.created_at,
    })
}

fn query_circuits(
    deps: Deps,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<CircuitsResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = start_after.as_deref().map(Bound::exclusive);

    let circuits: StdResult<Vec<_>> = CIRCUITS
        .range(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (_, circuit) = item?;
            Ok(CircuitResponse {
                circuit_id: circuit.circuit_id,
                verification_key: circuit.verification_key,
                circuit_type: circuit.circuit_type,
                creator: circuit.creator,
                active: circuit.active,
                created_at: circuit.created_at,
            })
        })
        .collect();

    Ok(CircuitsResponse {
        circuits: circuits?,
    })
}

fn query_proof(deps: Deps, proof_id: String) -> StdResult<ProofResponse> {
    let proof = PROOFS.load(deps.storage, &proof_id)?;
    Ok(ProofResponse {
        proof_id: proof.proof_id,
        circuit_id: proof.circuit_id,
        submitter: proof.submitter,
        public_inputs: proof.public_inputs,
        proof: proof.proof,
        verified: proof.verified,
        submitted_at: proof.submitted_at,
        verified_at: proof.verified_at,
    })
}

fn query_proofs_by_circuit(
    deps: Deps,
    circuit_id: String,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<ProofsResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    
    // First, check if circuit exists
    CIRCUITS.load(deps.storage, &circuit_id)?;
    
    let start = start_after.as_deref().map(|s| Bound::exclusive((&circuit_id[..], s)));
    let end = Some(Bound::exclusive((&circuit_id[..], "")));

    let proof_ids: StdResult<Vec<_>> = CIRCUIT_PROOFS
        .range(deps.storage, start, end, Order::Ascending)
        .take(limit)
        .map(|item| {
            let ((_, proof_id), _) = item?;
            Ok(proof_id)
        })
        .collect();

    let proofs: StdResult<Vec<_>> = proof_ids?
        .iter()
        .map(|proof_id| {
            let proof = PROOFS.load(deps.storage, proof_id)?;
            Ok(ProofResponse {
                proof_id: proof.proof_id,
                circuit_id: proof.circuit_id,
                submitter: proof.submitter,
                public_inputs: proof.public_inputs,
                proof: proof.proof,
                verified: proof.verified,
                submitted_at: proof.submitted_at,
                verified_at: proof.verified_at,
            })
        })
        .collect();

    Ok(ProofsResponse {
        proofs: proofs?,
    })
}

fn query_contract_info(deps: Deps) -> StdResult<ContractInfoResponse> {
    let config = CONFIG.load(deps.storage)?;
    
    // Count total issuers
    let issuers: StdResult<Vec<_>> = ISSUERS
        .range(deps.storage, None, None, Order::Ascending)
        .collect();
    let total_issuers = issuers?.len() as u64;
    
    Ok(ContractInfoResponse {
        admin: config.admin,
        total_circuits: config.total_circuits,
        total_proofs: config.total_proofs,
        version: CONTRACT_VERSION.to_string(),
        governance_enabled: config.governance_enabled,
        dao_address: config.dao_address,
        total_issuers,
    })
}

// New query functions

fn query_issuers(
    deps: Deps,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<IssuersResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = start_after.as_deref().map(Bound::exclusive);

    let issuers: StdResult<Vec<_>> = ISSUERS
        .range(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (_, issuer) = item?;
            Ok(IssuerResponse {
                address: issuer.address,
                authorized_circuits: issuer.authorized_circuits,
                active: issuer.active,
                added_by: issuer.added_by,
                added_at: issuer.added_at,
            })
        })
        .collect();

    Ok(IssuersResponse {
        issuers: issuers?,
    })
}

fn query_issuer(deps: Deps, address: String) -> StdResult<IssuerResponse> {
    let issuer = ISSUERS.load(deps.storage, &address)?;
    Ok(IssuerResponse {
        address: issuer.address,
        authorized_circuits: issuer.authorized_circuits,
        active: issuer.active,
        added_by: issuer.added_by,
        added_at: issuer.added_at,
    })
}

fn query_proposals(
    deps: Deps,
    start_after: Option<u64>,
    limit: Option<u32>,
) -> StdResult<ProposalsResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let start = start_after.map(Bound::exclusive);

    let proposals: StdResult<Vec<_>> = GOVERNANCE_PROPOSALS
        .range(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (_, proposal) = item?;
            Ok(ProposalResponse {
                proposal_id: proposal.proposal_id,
                title: proposal.title,
                description: proposal.description,
                proposal_type: proposal.proposal_type,
                proposer: proposal.proposer,
                created_at: proposal.created_at,
                voting_end: proposal.voting_end,
                executed: proposal.executed,
                votes_for: proposal.votes_for,
                votes_against: proposal.votes_against,
            })
        })
        .collect();

    Ok(ProposalsResponse {
        proposals: proposals?,
    })
}

fn query_proposal(deps: Deps, proposal_id: u64) -> StdResult<ProposalResponse> {
    let proposal = GOVERNANCE_PROPOSALS.load(deps.storage, proposal_id)?;
    Ok(ProposalResponse {
        proposal_id: proposal.proposal_id,
        title: proposal.title,
        description: proposal.description,
        proposal_type: proposal.proposal_type,
        proposer: proposal.proposer,
        created_at: proposal.created_at,
        voting_end: proposal.voting_end,
        executed: proposal.executed,
        votes_for: proposal.votes_for,
        votes_against: proposal.votes_against,
    })
}

// New execute functions for access control and governance

pub fn execute_add_issuer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    issuer_address: String,
    authorized_circuits: Vec<String>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Only admin can add issuers directly
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    let issuer_addr = deps.api.addr_validate(&issuer_address)?;
    
    // Check if issuer already exists
    if ISSUERS.has(deps.storage, issuer_addr.as_str()) {
        return Err(ContractError::IssuerAlreadyExists { address: issuer_address });
    }

    let issuer = Issuer {
        address: issuer_addr.clone(),
        authorized_circuits,
        active: true,
        added_by: info.sender,
        added_at: env.block.time.seconds(),
    };

    ISSUERS.save(deps.storage, issuer_addr.as_str(), &issuer)?;

    Ok(Response::new()
        .add_attribute("method", "add_issuer")
        .add_attribute("issuer_address", issuer_addr)
        .add_attribute("authorized_circuits", format!("{:?}", issuer.authorized_circuits)))
}

pub fn execute_remove_issuer(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    issuer_address: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    // Only admin can remove issuers directly
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    let issuer_addr = deps.api.addr_validate(&issuer_address)?;
    
    // Check if issuer exists
    if !ISSUERS.has(deps.storage, issuer_addr.as_str()) {
        return Err(ContractError::IssuerNotFound { address: issuer_address });
    }

    ISSUERS.remove(deps.storage, issuer_addr.as_str());

    Ok(Response::new()
        .add_attribute("method", "remove_issuer")
        .add_attribute("issuer_address", issuer_addr))
}

pub fn execute_submit_governance_proposal(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    title: String,
    description: String,
    proposal_type: ProposalType,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    if !config.governance_enabled {
        return Err(ContractError::GovernanceNotEnabled {});
    }

    // Get next proposal ID
    let proposal_id = get_next_proposal_id(deps.storage)?;
    
    // Voting period of 7 days
    let voting_end = env.block.time.seconds() + 7 * 24 * 60 * 60;

    let proposal = GovernanceProposal {
        proposal_id,
        title,
        description,
        proposal_type,
        proposer: info.sender,
        created_at: env.block.time.seconds(),
        voting_end,
        executed: false,
        votes_for: 0,
        votes_against: 0,
    };

    GOVERNANCE_PROPOSALS.save(deps.storage, proposal_id, &proposal)?;

    Ok(Response::new()
        .add_attribute("method", "submit_governance_proposal")
        .add_attribute("proposal_id", proposal_id.to_string())
        .add_attribute("proposer", proposal.proposer))
}

pub fn execute_vote_on_proposal(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    proposal_id: u64,
    vote: bool,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    if !config.governance_enabled {
        return Err(ContractError::GovernanceNotEnabled {});
    }

    // Validate DAO membership - only GOVERNANCE_ROLE members can vote
    crate::access_control::require_role(deps.as_ref(), crate::access_control::GOVERNANCE_ROLE, &info.sender)?;

    let mut proposal = GOVERNANCE_PROPOSALS.load(deps.storage, proposal_id)
        .map_err(|_| ContractError::ProposalNotFound { proposal_id })?;

    // Check if voting period is still active
    if env.block.time.seconds() > proposal.voting_end {
        return Err(ContractError::VotingPeriodEnded { proposal_id });
    }

    // Check if already voted to prevent double voting
    if VOTERS.has(deps.storage, (proposal_id, info.sender.as_str())) {
        return Err(ContractError::AlreadyVoted { 
            proposal_id,
            voter: info.sender.to_string()
        });
    }

    // Record vote to prevent future double voting
    VOTERS.save(deps.storage, (proposal_id, info.sender.as_str()), &true)?;

    // Count the vote
    if vote {
        proposal.votes_for += 1;
    } else {
        proposal.votes_against += 1;
    }

    GOVERNANCE_PROPOSALS.save(deps.storage, proposal_id, &proposal)?;

    Ok(Response::new()
        .add_attribute("method", "vote_on_proposal")
        .add_attribute("proposal_id", proposal_id.to_string())
        .add_attribute("voter", info.sender)
        .add_attribute("vote", vote.to_string()))
}

pub fn execute_governance_proposal(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    proposal_id: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    
    if !config.governance_enabled {
        return Err(ContractError::GovernanceNotEnabled {});
    }

    let mut proposal = GOVERNANCE_PROPOSALS.load(deps.storage, proposal_id)
        .map_err(|_| ContractError::ProposalNotFound { proposal_id })?;

    // Check if proposal is already executed
    if proposal.executed {
        return Err(ContractError::ProposalAlreadyExecuted { proposal_id });
    }

    // Check if voting period has ended
    if env.block.time.seconds() <= proposal.voting_end {
        return Err(ContractError::VotingPeriodNotEnded { proposal_id });
    }

    // Check if proposal passed (simple majority)
    if proposal.votes_for <= proposal.votes_against {
        return Err(ContractError::ProposalFailed {});
    }

    // Execute the proposal
    let mut response = Response::new()
        .add_attribute("method", "execute_governance_proposal")
        .add_attribute("proposal_id", proposal_id.to_string());

    match &proposal.proposal_type {
        ProposalType::AddIssuer { issuer_address, authorized_circuits } => {
            let issuer_addr = deps.api.addr_validate(issuer_address)?;
            let issuer = Issuer {
                address: issuer_addr.clone(),
                authorized_circuits: authorized_circuits.clone(),
                active: true,
                added_by: info.sender, // Executed by governance
                added_at: env.block.time.seconds(),
            };
            ISSUERS.save(deps.storage, issuer_addr.as_str(), &issuer)?;
            response = response.add_attribute("action", "add_issuer")
                .add_attribute("issuer_address", issuer_addr);
        }
        ProposalType::RemoveIssuer { issuer_address } => {
            let issuer_addr = deps.api.addr_validate(issuer_address)?;
            ISSUERS.remove(deps.storage, issuer_addr.as_str());
            response = response.add_attribute("action", "remove_issuer")
                .add_attribute("issuer_address", issuer_addr);
        }
        ProposalType::UpdateDAOAddress { new_dao_address } => {
            let mut config = CONFIG.load(deps.storage)?;
            config.dao_address = Some(deps.api.addr_validate(new_dao_address)?);
            CONFIG.save(deps.storage, &config)?;
            response = response.add_attribute("action", "update_dao_address")
                .add_attribute("new_dao_address", new_dao_address);
        }
        ProposalType::DeactivateCircuit { circuit_id } => {
            let mut circuit = CIRCUITS.load(deps.storage, circuit_id)
                .map_err(|_| ContractError::CircuitNotFound { circuit_id: circuit_id.clone() })?;
            circuit.active = false;
            CIRCUITS.save(deps.storage, circuit_id, &circuit)?;
            response = response.add_attribute("action", "deactivate_circuit")
                .add_attribute("circuit_id", circuit_id);
        }
    }

    // Mark proposal as executed
    proposal.executed = true;
    GOVERNANCE_PROPOSALS.save(deps.storage, proposal_id, &proposal)?;

    Ok(response)
}

fn get_next_proposal_id(storage: &dyn cosmwasm_std::Storage) -> Result<u64, ContractError> {
    let mut max_id = 0u64;
    
    // Find the highest existing proposal ID
    for result in GOVERNANCE_PROPOSALS.range(storage, None, None, Order::Ascending) {
        let (id, _) = result?;
        if id > max_id {
            max_id = id;
        }
    }
    
    Ok(max_id + 1)
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, from_json};

    #[test]
    fn proper_instantiation() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("creator", &coins(1000, "earth"));

        let msg = InstantiateMsg { 
            admin: None, 
            governance_enabled: None, 
            dao_address: None,
            multisig_config: None,
            timelock_enabled: None,
            min_timelock_delay: None
        };
        let res = instantiate(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes.len(), 3);
    }

    #[test]
    fn register_circuit() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("creator", &coins(1000, "earth"));

        let msg = InstantiateMsg { 
            admin: None, 
            governance_enabled: None, 
            dao_address: None,
            multisig_config: None,
            timelock_enabled: None,
            min_timelock_delay: None
        };
        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        let msg = ExecuteMsg::RegisterCircuit {
            circuit_id: "test_circuit".to_string(),
            verification_key: "vk_test_key_12345".to_string(),
            circuit_type: "groth16".to_string(),
        };
        let res = execute(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "register_circuit");
    }

    #[test]
    fn submit_valid_proof() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("creator", &coins(1000, "earth"));

        let msg = InstantiateMsg { 
            admin: None, 
            governance_enabled: None, 
            dao_address: None,
            multisig_config: None,
            timelock_enabled: None,
            min_timelock_delay: None
        };
        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Register circuit first
        let msg = ExecuteMsg::RegisterCircuit {
            circuit_id: "test_circuit".to_string(),
            verification_key: "vk_test_key_12345".to_string(),
            circuit_type: "groth16".to_string(),
        };
        execute(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Submit proof
        let msg = ExecuteMsg::SubmitProof {
            circuit_id: "test_circuit".to_string(),
            public_inputs: vec!["123".to_string(), "456".to_string()],
            proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
        };
        let res = execute(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "submit_proof");
        assert_eq!(res.attributes[3].value, "true"); // verified
    }

    #[test]
    fn submit_invalid_proof() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("creator", &coins(1000, "earth"));

        let msg = InstantiateMsg { 
            admin: None, 
            governance_enabled: None, 
            dao_address: None,
            multisig_config: None,
            timelock_enabled: None,
            min_timelock_delay: None
        };
        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Register circuit first
        let msg = ExecuteMsg::RegisterCircuit {
            circuit_id: "test_circuit".to_string(),
            verification_key: "vk_test_key_12345".to_string(),
            circuit_type: "groth16".to_string(),
        };
        execute(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Submit invalid proof (test failure case)
        let msg = ExecuteMsg::SubmitProof {
            circuit_id: "test_circuit".to_string(),
            public_inputs: vec!["999999".to_string()], // This triggers failure
            proof: r#"{"pi_a": ["0x123"], "pi_b": [["0x456"]], "pi_c": ["0x789"]}"#.to_string(),
        };
        let res = execute(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes[3].value, "false"); // not verified
    }

    #[test]
    fn deactivate_circuit() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("admin", &coins(1000, "earth"));

        let msg = InstantiateMsg {
            admin: Some("admin".to_string()),
            governance_enabled: None,
            dao_address: None,
            multisig_config: None,
            timelock_enabled: None,
            min_timelock_delay: None,
        };
        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Register circuit first
        let msg = ExecuteMsg::RegisterCircuit {
            circuit_id: "test_circuit".to_string(),
            verification_key: "vk_test_key_12345".to_string(),
            circuit_type: "groth16".to_string(),
        };
        execute(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Deactivate circuit
        let msg = ExecuteMsg::DeactivateCircuit {
            circuit_id: "test_circuit".to_string(),
        };
        let res = execute(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes[0].value, "deactivate_circuit");
    }

    #[test]
    fn query_circuit() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("creator", &coins(1000, "earth"));

        let msg = InstantiateMsg { 
            admin: None, 
            governance_enabled: None, 
            dao_address: None,
            multisig_config: None,
            timelock_enabled: None,
            min_timelock_delay: None
        };
        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Register circuit first
        let msg = ExecuteMsg::RegisterCircuit {
            circuit_id: "test_circuit".to_string(),
            verification_key: "vk_test_key_12345".to_string(),
            circuit_type: "groth16".to_string(),
        };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Query circuit
        let msg = QueryMsg::Circuit {
            circuit_id: "test_circuit".to_string(),
        };
        let res = query(deps.as_ref(), env, msg).unwrap();
        let circuit_response: CircuitResponse = from_json(res).unwrap();
        assert_eq!(circuit_response.circuit_id, "test_circuit");
        assert!(circuit_response.active);
    }
}