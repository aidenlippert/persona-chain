use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Circuit not found: {circuit_id}")]
    CircuitNotFound { circuit_id: String },

    #[error("Circuit already exists: {circuit_id}")]
    CircuitAlreadyExists { circuit_id: String },

    #[error("Circuit is deactivated: {circuit_id}")]
    CircuitDeactivated { circuit_id: String },

    #[error("Proof not found: {proof_id}")]
    ProofNotFound { proof_id: String },

    #[error("Invalid verification key format")]
    InvalidVerificationKey {},

    #[error("Invalid proof format")]
    InvalidProof {},

    #[error("Proof verification failed")]
    ProofVerificationFailed {},

    #[error("Invalid public inputs")]
    InvalidPublicInputs {},

    #[error("Circuit ID cannot be empty")]
    EmptyCircuitId {},

    #[error("Verification key cannot be empty")]
    EmptyVerificationKey {},

    #[error("Proof cannot be empty")]
    EmptyProof {},

    #[error("Issuer not found: {address}")]
    IssuerNotFound { address: String },

    #[error("Issuer already exists: {address}")]
    IssuerAlreadyExists { address: String },

    #[error("Issuer is deactivated: {address}")]
    IssuerDeactivated { address: String },

    #[error("Unauthorized circuit type: {circuit_type}, authorized: {authorized:?}")]
    UnauthorizedCircuitType { circuit_type: String, authorized: Vec<String> },

    #[error("Proposal not found: {proposal_id}")]
    ProposalNotFound { proposal_id: u64 },

    #[error("Proposal already executed: {proposal_id}")]
    ProposalAlreadyExecuted { proposal_id: u64 },

    #[error("Voting period ended: {proposal_id}")]
    VotingPeriodEnded { proposal_id: u64 },

    #[error("Proposal voting period not ended: {proposal_id}")]
    VotingPeriodNotEnded { proposal_id: u64 },

    #[error("Voter {voter} has already voted on proposal {proposal_id}")]
    AlreadyVoted { proposal_id: u64, voter: String },

    #[error("Proposal failed to pass")]
    ProposalFailed {},

    #[error("Governance not enabled")]
    GovernanceNotEnabled {},

    // Access Control Errors
    #[error("Missing role: {role} for account: {account}")]
    MissingRole { role: String, account: String },

    #[error("Role does not exist: {role}")]
    RoleNotFound { role: String },

    // Timelock Errors
    #[error("Timelock not enabled")]
    TimelockNotEnabled {},

    #[error("Timelock delay too short: provided {provided}, minimum {minimum}")]
    TimelockDelayTooShort { provided: u64, minimum: u64 },

    #[error("Timelock transaction {id} already executed")]
    TimelockAlreadyExecuted { id: u64 },

    #[error("Timelock transaction {id} cancelled")]
    TimelockCancelled { id: u64 },

    #[error("Timelock transaction {id} not ready until {ready_at}")]
    TimelockNotReady { id: u64, ready_at: u64 },

    #[error("Timelock transaction not found: {id}")]
    TimelockNotFound { id: u64 },

    // Multisig Errors
    #[error("Multisig not enabled")]
    MultisigNotEnabled {},

    #[error("Insufficient multisig approvals: required {required}, provided {provided}")]
    InsufficientMultisigApprovals { required: u64, provided: u64 },

    #[error("Invalid multisig signer: {signer}")]
    InvalidMultisigSigner { signer: String },

    #[error("Already approved by signer: {signer}")]
    AlreadyApproved { signer: String },

    // Determinism and Safety Errors
    #[error("Non-deterministic operation not allowed: {operation}")]
    NonDeterministicOperation { operation: String },

    #[error("Integer overflow in {operation}: {operands}")]
    IntegerOverflow { operation: String, operands: String },

    #[error("Integer underflow in {operation}: {operands}")]
    IntegerUnderflow { operation: String, operands: String },

    #[error("Division by zero")]
    DivisionByZero {},

    // Encryption Errors
    #[error("Encryption failed")]
    EncryptionError {},

    #[error("Decryption failed")]
    DecryptionError {},

    #[error("Data integrity check failed")]
    IntegrityError {},
}