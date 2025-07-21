use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Addr;
use crate::state::ProposalType;

#[cw_serde]
pub struct InstantiateMsg {
    pub admin: Option<String>,
    pub governance_enabled: Option<bool>,
    pub dao_address: Option<String>,
    pub multisig_config: Option<MultisigConfig>,
    pub timelock_enabled: Option<bool>,
    pub min_timelock_delay: Option<u64>,
}

use crate::state::MultisigConfig;

#[cw_serde]
pub enum ExecuteMsg {
    /// Register a new ZK circuit
    RegisterCircuit {
        circuit_id: String,
        verification_key: String,
        circuit_type: String,
    },
    /// Deactivate an existing circuit
    DeactivateCircuit {
        circuit_id: String,
    },
    /// Submit a proof for verification
    SubmitProof {
        circuit_id: String,
        public_inputs: Vec<String>,
        proof: String,
    },
    /// Update contract admin
    UpdateAdmin {
        new_admin: String,
    },
    /// Add an issuer (admin only or governance)
    AddIssuer {
        issuer_address: String,
        authorized_circuits: Vec<String>,
    },
    /// Remove an issuer (admin only or governance)
    RemoveIssuer {
        issuer_address: String,
    },
    /// Submit a governance proposal
    SubmitGovernanceProposal {
        title: String,
        description: String,
        proposal_type: ProposalType,
    },
    /// Vote on a governance proposal
    VoteOnProposal {
        proposal_id: u64,
        vote: bool, // true for yes, false for no
    },
    /// Execute a passed governance proposal
    ExecuteProposal {
        proposal_id: u64,
    },
    /// Grant role to an account
    GrantRole {
        role: String,
        account: String,
    },
    /// Revoke role from an account
    RevokeRole {
        role: String,
        account: String,
    },
    /// Schedule a timelock transaction
    ScheduleTimelockTransaction {
        target_function: String,
        params: String,
        delay: u64,
    },
    /// Execute a timelock transaction
    ExecuteTimelockTransaction {
        transaction_id: u64,
    },
    /// Approve a timelock transaction (for multisig)
    ApproveTimelockTransaction {
        transaction_id: u64,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get circuit information
    #[returns(CircuitResponse)]
    Circuit { circuit_id: String },
    
    /// List all circuits
    #[returns(CircuitsResponse)]
    Circuits {
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get proof verification result
    #[returns(ProofResponse)]
    Proof { proof_id: String },
    
    /// List proofs for a circuit
    #[returns(ProofsResponse)]
    ProofsByCircuit {
        circuit_id: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get contract info
    #[returns(ContractInfoResponse)]
    ContractInfo {},
    
    /// List all issuers
    #[returns(IssuersResponse)]
    Issuers {
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get issuer information
    #[returns(IssuerResponse)]
    Issuer { address: String },
    
    /// List governance proposals
    #[returns(ProposalsResponse)]
    Proposals {
        start_after: Option<u64>,
        limit: Option<u32>,
    },
    
    /// Get specific governance proposal
    #[returns(ProposalResponse)]
    Proposal { proposal_id: u64 },
    
    /// Check if account has role
    #[returns(bool)]
    HasRole { role: String, account: String },
    
    /// Get role members
    #[returns(RoleMembersResponse)]
    RoleMembers { role: String },
    
    /// Get timelock transaction
    #[returns(TimelockTransactionResponse)]
    TimelockTransaction { transaction_id: u64 },
}

#[cw_serde]
pub struct CircuitResponse {
    pub circuit_id: String,
    pub verification_key: String,
    pub circuit_type: String,
    pub creator: Addr,
    pub active: bool,
    pub created_at: u64,
}

#[cw_serde]
pub struct CircuitsResponse {
    pub circuits: Vec<CircuitResponse>,
}

#[cw_serde]
pub struct ProofResponse {
    pub proof_id: String,
    pub circuit_id: String,
    pub submitter: Addr,
    pub public_inputs: Vec<String>,
    pub proof: String,
    pub verified: bool,
    pub submitted_at: u64,
    pub verified_at: Option<u64>,
}

#[cw_serde]
pub struct ProofsResponse {
    pub proofs: Vec<ProofResponse>,
}

#[cw_serde]
pub struct ContractInfoResponse {
    pub admin: Addr,
    pub total_circuits: u64,
    pub total_proofs: u64,
    pub version: String,
    pub governance_enabled: bool,
    pub dao_address: Option<Addr>,
    pub total_issuers: u64,
}

#[cw_serde]
pub struct IssuerResponse {
    pub address: Addr,
    pub authorized_circuits: Vec<String>,
    pub active: bool,
    pub added_by: Addr,
    pub added_at: u64,
}

#[cw_serde]
pub struct IssuersResponse {
    pub issuers: Vec<IssuerResponse>,
}

#[cw_serde]
pub struct ProposalResponse {
    pub proposal_id: u64,
    pub title: String,
    pub description: String,
    pub proposal_type: ProposalType,
    pub proposer: Addr,
    pub created_at: u64,
    pub voting_end: u64,
    pub executed: bool,
    pub votes_for: u64,
    pub votes_against: u64,
}

#[cw_serde]
pub struct ProposalsResponse {
    pub proposals: Vec<ProposalResponse>,
}

#[cw_serde]
pub struct RoleMembersResponse {
    pub role: String,
    pub members: Vec<Addr>,
}

#[cw_serde]
pub struct TimelockTransactionResponse {
    pub id: u64,
    pub proposer: Addr,
    pub target_function: String,
    pub params: String,
    pub scheduled_time: u64,
    pub executed: bool,
    pub cancelled: bool,
    pub approvals: Vec<Addr>,
    pub created_at: u64,
}