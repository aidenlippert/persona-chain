use cosmwasm_schema::cw_serde;
use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct Config {
    pub admin: Addr,
    pub total_circuits: u64,
    pub total_proofs: u64,
    pub governance_enabled: bool,
    pub dao_address: Option<Addr>,
    pub multisig_config: Option<MultisigConfig>,
    pub timelock_enabled: bool,
    pub min_timelock_delay: u64, // seconds
}

#[cw_serde]
pub struct MultisigConfig {
    pub signers: Vec<Addr>,
    pub threshold: u64,
    pub enabled: bool,
}

#[cw_serde]
pub struct TimelockTransaction {
    pub id: u64,
    pub proposer: Addr,
    pub target_function: String,
    pub params: String, // JSON encoded parameters
    pub scheduled_time: u64,
    pub executed: bool,
    pub cancelled: bool,
    pub approvals: Vec<Addr>,
    pub created_at: u64,
}

#[cw_serde]
pub struct AccessControlRole {
    pub role_name: String,
    pub members: Vec<Addr>,
    pub admin_role: Option<String>, // Role that can manage this role
}

#[cw_serde]
pub struct Issuer {
    pub address: Addr,
    pub authorized_circuits: Vec<String>, // Circuit types this issuer can register
    pub active: bool,
    pub added_by: Addr,
    pub added_at: u64,
}

#[cw_serde]
pub struct Circuit {
    pub circuit_id: String,
    pub verification_key: String,
    pub circuit_type: String,
    pub creator: Addr,
    pub active: bool,
    pub created_at: u64,
}

#[cw_serde]
pub struct Proof {
    pub proof_id: String,
    pub circuit_id: String,
    pub submitter: Addr,
    pub public_inputs: Vec<String>,
    pub proof: String,
    pub verified: bool,
    pub submitted_at: u64,
    pub verified_at: Option<u64>,
}

// Storage items
pub const CONFIG: Item<Config> = Item::new("config");
pub const CIRCUITS: Map<&str, Circuit> = Map::new("circuits");
pub const PROOFS: Map<&str, Proof> = Map::new("proofs");
pub const CIRCUIT_PROOFS: Map<(&str, &str), bool> = Map::new("circuit_proofs"); // (circuit_id, proof_id) -> exists
pub const ISSUERS: Map<&str, Issuer> = Map::new("issuers"); // address -> issuer info
pub const GOVERNANCE_PROPOSALS: Map<u64, GovernanceProposal> = Map::new("governance_proposals");
pub const TIMELOCK_TRANSACTIONS: Map<u64, TimelockTransaction> = Map::new("timelock_transactions");
pub const ACCESS_CONTROL_ROLES: Map<&str, AccessControlRole> = Map::new("access_control_roles");
pub const ROLE_MEMBERS: Map<(&str, &str), bool> = Map::new("role_members"); // (role, address) -> bool
pub const VOTERS: Map<(u64, &str), bool> = Map::new("voters"); // (proposal_id, voter_address) -> has_voted

#[cw_serde]
pub struct GovernanceProposal {
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
pub enum ProposalType {
    AddIssuer {
        issuer_address: String,
        authorized_circuits: Vec<String>,
    },
    RemoveIssuer {
        issuer_address: String,
    },
    UpdateDAOAddress {
        new_dao_address: String,
    },
    DeactivateCircuit {
        circuit_id: String,
    },
}