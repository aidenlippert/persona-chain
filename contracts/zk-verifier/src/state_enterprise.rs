use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_std::{Addr, Binary, Timestamp};
use cw_storage_plus::{Item, Map, MultiIndex, IndexList, IndexedMap};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    pub admin: Addr,
    pub total_circuits: u64,
    pub total_proofs: u64,
    pub governance_enabled: bool,
    pub dao_address: Option<Addr>,
    pub multisig_config: Option<MultisigConfig>,
    pub timelock_enabled: bool,
    pub min_timelock_delay: u64,
    // Enterprise features
    pub compliance_enabled: bool,
    pub audit_enabled: bool,
    pub cross_chain_enabled: bool,
    pub performance_monitoring: bool,
    pub rate_limiting_enabled: bool,
    pub emergency_pause_enabled: bool,
    pub max_batch_size: u32,
    pub supported_chains: Vec<String>,
    pub ibc_enabled: bool,
    pub layer2_enabled: bool,
    pub state_channel_enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MultisigConfig {
    pub threshold: u32,
    pub members: Vec<Addr>,
    pub timeout: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Circuit {
    pub circuit_id: String,
    pub verification_key: String,
    pub circuit_type: String,
    pub creator: Addr,
    pub active: bool,
    pub created_at: u64,
    // Enhanced fields
    pub version: u32,
    pub metadata_hash: Vec<u8>,
    pub gas_estimate: u64,
    pub security_level: u32,
    pub supported_features: Vec<String>,
    pub max_public_inputs: u32,
    pub performance_metrics: HashMap<String, u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Proof {
    pub proof_id: String,
    pub circuit_id: String,
    pub submitter: Addr,
    pub public_inputs: Vec<String>,
    pub proof: String,
    pub verified: bool,
    pub submitted_at: u64,
    pub verified_at: Option<u64>,
    // Enhanced fields
    pub gas_used: u64,
    pub verification_time: u64,
    pub proof_size: u32,
    pub public_input_hash: Vec<u8>,
    pub nullifier_hash: Option<Vec<u8>>,
    pub metadata: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Issuer {
    pub address: Addr,
    pub authorized_circuits: Vec<String>,
    pub active: bool,
    pub added_by: Addr,
    pub added_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
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

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum ProposalType {
    AddIssuer { issuer_address: String, authorized_circuits: Vec<String> },
    RemoveIssuer { issuer_address: String },
    UpdateDAOAddress { new_dao_address: String },
    DeactivateCircuit { circuit_id: String },
    UpdateConfig { config_changes: HashMap<String, String> },
    EmergencyPause {},
    AddSupportedChain { chain_id: String },
    RemoveSupportedChain { chain_id: String },
}

// Enterprise-specific structures
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct BatchOperation {
    pub id: u64,
    pub operation_type: String,
    pub items: Vec<String>,
    pub executor: Addr,
    pub timestamp: u64,
    pub status: String,
    pub gas_used: u64,
    pub result_hash: Vec<u8>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct AuditLogEntry {
    pub id: u64,
    pub event_type: String,
    pub actor: String,
    pub target: String,
    pub timestamp: u64,
    pub details: String,
    pub block_height: u64,
    pub tx_hash: String,
    pub risk_score: u32,
    pub compliance_flags: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ComplianceReport {
    pub id: u64,
    pub report_type: String,
    pub start_time: u64,
    pub end_time: u64,
    pub generated_at: u64,
    pub generated_by: Addr,
    pub total_transactions: u64,
    pub flagged_transactions: u64,
    pub risk_score: u32,
    pub compliance_status: String,
    pub details: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MerkleTree {
    pub id: String,
    pub root: Vec<u8>,
    pub leaves: Vec<Vec<u8>>,
    pub depth: u32,
    pub created_at: u64,
    pub creator: Addr,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct CrossChainTransaction {
    pub id: u64,
    pub source_chain: String,
    pub target_chain: String,
    pub target_contract: String,
    pub payload: Vec<u8>,
    pub sender: Addr,
    pub status: String,
    pub submitted_at: u64,
    pub processed_at: Option<u64>,
    pub response: Option<Vec<u8>>,
    pub gas_estimate: u64,
    pub confirmation_hash: Option<Vec<u8>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Delegation {
    pub circuit_id: String,
    pub delegator: Addr,
    pub delegate: Addr,
    pub permissions: Vec<String>,
    pub created_at: u64,
    pub expires_at: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct EmergencyContact {
    pub contact_type: String,
    pub contact_address: Addr,
    pub permissions: Vec<String>,
    pub active: bool,
    pub added_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct PerformanceMetrics {
    pub metric_type: String,
    pub value: u64,
    pub timestamp: u64,
    pub metadata: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Layer2State {
    pub channel_id: String,
    pub participants: Vec<Addr>,
    pub state_root: Vec<u8>,
    pub nonce: u64,
    pub timeout: u64,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IBCPacket {
    pub packet_id: u64,
    pub source_channel: String,
    pub dest_channel: String,
    pub data: Vec<u8>,
    pub timeout_height: u64,
    pub timeout_timestamp: u64,
    pub status: String,
}

// Storage definitions
pub const CONFIG: Item<Config> = Item::new("config");
pub const CIRCUITS: Map<&str, Circuit> = Map::new("circuits");
pub const PROOFS: Map<&str, Proof> = Map::new("proofs");
pub const CIRCUIT_PROOFS: Map<(&str, &str), bool> = Map::new("circuit_proofs");
pub const ISSUERS: Map<&str, Issuer> = Map::new("issuers");
pub const GOVERNANCE_PROPOSALS: Map<u64, GovernanceProposal> = Map::new("governance_proposals");
pub const VOTERS: Map<(u64, &str), bool> = Map::new("voters");

// Enterprise storage
pub const BATCH_OPERATIONS: Map<u64, BatchOperation> = Map::new("batch_operations");
pub const AUDIT_LOG: Map<u64, AuditLogEntry> = Map::new("audit_log");
pub const COMPLIANCE_REPORTS: Map<u64, ComplianceReport> = Map::new("compliance_reports");
pub const MERKLE_TREES: Map<&str, MerkleTree> = Map::new("merkle_trees");
pub const CROSS_CHAIN_TXS: Map<u64, CrossChainTransaction> = Map::new("cross_chain_txs");
pub const DELEGATIONS: Map<(&str, &str), Delegation> = Map::new("delegations");
pub const EMERGENCY_CONTACTS: Map<&str, EmergencyContact> = Map::new("emergency_contacts");
pub const RATE_LIMITS: Map<&str, u64> = Map::new("rate_limits");
pub const PERFORMANCE_METRICS: Map<(&str, u64), PerformanceMetrics> = Map::new("performance_metrics");
pub const LAYER2_STATES: Map<&str, Layer2State> = Map::new("layer2_states");
pub const IBC_PACKETS: Map<u64, IBCPacket> = Map::new("ibc_packets");

// Additional enterprise mappings
pub const CIRCUIT_DELEGATIONS: Map<(&str, &str), bool> = Map::new("circuit_delegations");
pub const TIMELOCK_TRANSACTIONS: Map<u64, TimelockTransaction> = Map::new("timelock_transactions");
pub const MULTISIG_TRANSACTIONS: Map<u64, MultisigTransaction> = Map::new("multisig_transactions");
pub const COMPLIANCE_RULES: Map<&str, ComplianceRule> = Map::new("compliance_rules");
pub const SECURITY_POLICIES: Map<&str, SecurityPolicy> = Map::new("security_policies");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct TimelockTransaction {
    pub id: u64,
    pub target_function: String,
    pub params: Binary,
    pub scheduled_at: u64,
    pub execution_time: u64,
    pub executed: bool,
    pub approved_by: Vec<Addr>,
    pub required_approvals: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MultisigTransaction {
    pub id: u64,
    pub transaction_data: Binary,
    pub signatures: Vec<Binary>,
    pub threshold: u32,
    pub executed: bool,
    pub created_at: u64,
    pub expires_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ComplianceRule {
    pub rule_id: String,
    pub rule_type: String,
    pub parameters: HashMap<String, String>,
    pub active: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct SecurityPolicy {
    pub policy_id: String,
    pub policy_type: String,
    pub rules: Vec<String>,
    pub enforcement_level: String,
    pub active: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

// Indexed maps for efficient queries
pub struct CircuitIndexes<'a> {
    pub creator: MultiIndex<'a, Addr, Circuit, &'a str>,
    pub circuit_type: MultiIndex<'a, String, Circuit, &'a str>,
    pub active: MultiIndex<'a, bool, Circuit, &'a str>,
}

impl<'a> IndexList<Circuit> for CircuitIndexes<'a> {
    fn get_indexes(&'_ self) -> Box<dyn Iterator<Item = &'_ dyn cosmwasm_std::Index<Circuit>> + '_> {
        let v: Vec<&dyn cosmwasm_std::Index<Circuit>> = vec![&self.creator, &self.circuit_type, &self.active];
        Box::new(v.into_iter())
    }
}

pub fn circuits<'a>() -> IndexedMap<'a, &'a str, Circuit, CircuitIndexes<'a>> {
    let indexes = CircuitIndexes {
        creator: MultiIndex::new(|_pk, d| d.creator.clone(), "circuits", "circuits__creator"),
        circuit_type: MultiIndex::new(|_pk, d| d.circuit_type.clone(), "circuits", "circuits__type"),
        active: MultiIndex::new(|_pk, d| d.active, "circuits", "circuits__active"),
    };
    IndexedMap::new("circuits", indexes)
}

pub struct ProofIndexes<'a> {
    pub submitter: MultiIndex<'a, Addr, Proof, &'a str>,
    pub circuit_id: MultiIndex<'a, String, Proof, &'a str>,
    pub verified: MultiIndex<'a, bool, Proof, &'a str>,
}

impl<'a> IndexList<Proof> for ProofIndexes<'a> {
    fn get_indexes(&'_ self) -> Box<dyn Iterator<Item = &'_ dyn cosmwasm_std::Index<Proof>> + '_> {
        let v: Vec<&dyn cosmwasm_std::Index<Proof>> = vec![&self.submitter, &self.circuit_id, &self.verified];
        Box::new(v.into_iter())
    }
}

pub fn proofs<'a>() -> IndexedMap<'a, &'a str, Proof, ProofIndexes<'a>> {
    let indexes = ProofIndexes {
        submitter: MultiIndex::new(|_pk, d| d.submitter.clone(), "proofs", "proofs__submitter"),
        circuit_id: MultiIndex::new(|_pk, d| d.circuit_id.clone(), "proofs", "proofs__circuit_id"),
        verified: MultiIndex::new(|_pk, d| d.verified, "proofs", "proofs__verified"),
    };
    IndexedMap::new("proofs", indexes)
}

pub struct AuditLogIndexes<'a> {
    pub actor: MultiIndex<'a, String, AuditLogEntry, u64>,
    pub event_type: MultiIndex<'a, String, AuditLogEntry, u64>,
    pub risk_score: MultiIndex<'a, u32, AuditLogEntry, u64>,
}

impl<'a> IndexList<AuditLogEntry> for AuditLogIndexes<'a> {
    fn get_indexes(&'_ self) -> Box<dyn Iterator<Item = &'_ dyn cosmwasm_std::Index<AuditLogEntry>> + '_> {
        let v: Vec<&dyn cosmwasm_std::Index<AuditLogEntry>> = vec![&self.actor, &self.event_type, &self.risk_score];
        Box::new(v.into_iter())
    }
}

pub fn audit_log<'a>() -> IndexedMap<'a, u64, AuditLogEntry, AuditLogIndexes<'a>> {
    let indexes = AuditLogIndexes {
        actor: MultiIndex::new(|_pk, d| d.actor.clone(), "audit_log", "audit_log__actor"),
        event_type: MultiIndex::new(|_pk, d| d.event_type.clone(), "audit_log", "audit_log__event_type"),
        risk_score: MultiIndex::new(|_pk, d| d.risk_score, "audit_log", "audit_log__risk_score"),
    };
    IndexedMap::new("audit_log", indexes)
}

// Enterprise feature flags
pub const FEATURE_FLAGS: Map<&str, bool> = Map::new("feature_flags");

// Gas price oracle for dynamic pricing
pub const GAS_PRICES: Map<&str, u64> = Map::new("gas_prices");

// Circuit usage statistics
pub const CIRCUIT_STATS: Map<&str, HashMap<String, u64>> = Map::new("circuit_stats");

// Global performance counters
pub const PERFORMANCE_COUNTERS: Map<&str, u64> = Map::new("performance_counters");

// Security incident tracking
pub const SECURITY_INCIDENTS: Map<u64, SecurityIncident> = Map::new("security_incidents");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct SecurityIncident {
    pub id: u64,
    pub incident_type: String,
    pub severity: String,
    pub description: String,
    pub affected_circuits: Vec<String>,
    pub reported_by: Addr,
    pub reported_at: u64,
    pub resolved_at: Option<u64>,
    pub resolution_notes: Option<String>,
    pub status: String,
}

// Circuit dependency tracking
pub const CIRCUIT_DEPENDENCIES: Map<&str, Vec<String>> = Map::new("circuit_dependencies");

// Automated response configurations
pub const AUTOMATED_RESPONSES: Map<&str, AutomatedResponse> = Map::new("automated_responses");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct AutomatedResponse {
    pub trigger_event: String,
    pub conditions: Vec<String>,
    pub actions: Vec<String>,
    pub cooldown_period: u64,
    pub last_triggered: Option<u64>,
    pub active: bool,
}

// Cross-chain bridge configurations
pub const BRIDGE_CONFIGS: Map<&str, BridgeConfig> = Map::new("bridge_configs");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct BridgeConfig {
    pub chain_id: String,
    pub bridge_contract: String,
    pub supported_assets: Vec<String>,
    pub fee_structure: HashMap<String, u64>,
    pub security_threshold: u32,
    pub active: bool,
}