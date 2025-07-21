// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

/**
 * @title DIDRegistryEnterprise
 * @dev Enterprise-grade Decentralized Identity Registry with advanced features
 * @author PersonaPass Security Team
 */
contract DIDRegistryEnterprise is 
    Initializable, 
    UUPSUpgradeable, 
    AccessControl, 
    ReentrancyGuard, 
    Pausable, 
    ERC2771Context,
    Multicall
{
    using MerkleProof for bytes32[];

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Version for upgrades
    uint256 public constant VERSION = 2;

    // DID Record Structure with enhanced features
    struct DIDRecord {
        string document;           // JSON DID document
        address controller;        // Controller address
        uint256 created;          // Creation timestamp
        uint256 updated;          // Last update timestamp
        bool isActive;            // Active status
        uint256 nonce;            // Update nonce for replay protection
        bytes32 merkleRoot;       // Merkle root for efficient batch operations
        uint256 expiresAt;        // Expiration timestamp (0 for no expiration)
        bytes32 metadataHash;     // IPFS hash for additional metadata
        mapping(bytes32 => bool) delegates; // Delegate permissions
    }

    // Enhanced Credential Record
    struct CredentialRecord {
        string issuer;            // Issuer DID
        string subject;           // Subject DID
        bytes32 schemaHash;       // Schema hash
        bytes32 commitmentHash;   // ZK commitment hash
        uint256 created;          // Creation timestamp
        bool isRevoked;           // Revocation status
        string revocationReason;  // Revocation reason
        uint256 expiresAt;        // Expiration timestamp
        bytes32 proofHash;        // ZK proof hash
        uint256 renewalCount;     // Number of renewals
        bytes32 parentCredential; // Parent credential for hierarchical credentials
    }

    // Governance Proposal Structure
    struct GovernanceProposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        uint256 votesFor;
        uint256 votesAgainst;
        bytes32 proposalHash;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteWeight;
    }

    // Batch Operation Structure
    struct BatchOperation {
        string[] dids;
        bytes32[] proofs;
        uint256 timestamp;
        address operator;
        bool processed;
    }

    // Storage
    mapping(string => DIDRecord) public didRecords;
    mapping(string => CredentialRecord) public credentialRecords;
    mapping(string => address) public didControllers;
    mapping(address => string[]) public controllerDIDs;
    mapping(string => bool) public revokedCredentials;
    mapping(uint256 => GovernanceProposal) public proposals;
    mapping(bytes32 => BatchOperation) public batchOperations;
    mapping(address => uint256) public nonces; // For meta-transactions
    mapping(bytes32 => bool) public usedSignatures; // Prevent replay attacks

    // Merkle tree for efficient batch operations
    mapping(bytes32 => bool) public merkleRoots;
    mapping(bytes32 => uint256) public merkleTreeSizes;

    // Enterprise features
    uint256 public proposalCount;
    uint256 public votingPeriod = 7 days;
    uint256 public executionDelay = 2 days;
    uint256 public minVotingPower = 100; // Minimum tokens for voting
    uint256 public quorumThreshold = 51; // 51% quorum
    bool public emergencyMode = false;
    
    // Gas optimization
    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public constant MAX_DELEGATES = 10;

    // Events
    event DIDRegistered(
        string indexed did,
        address indexed controller,
        uint256 blockNumber,
        uint256 timestamp,
        bytes32 merkleRoot
    );

    event DIDUpdated(
        string indexed did,
        address indexed controller,
        uint256 blockNumber,
        uint256 timestamp,
        uint256 nonce,
        bytes32 newMerkleRoot
    );

    event DIDRevoked(
        string indexed did,
        address indexed controller,
        uint256 blockNumber,
        uint256 timestamp,
        string reason
    );

    event CredentialRegistered(
        string indexed credentialId,
        string indexed issuer,
        string indexed subject,
        bytes32 schemaHash,
        bytes32 commitmentHash,
        uint256 blockNumber,
        uint256 timestamp
    );

    event CredentialRevoked(
        string indexed credentialId,
        string indexed issuer,
        string reason,
        uint256 blockNumber,
        uint256 timestamp
    );

    event CredentialRenewed(
        string indexed credentialId,
        string indexed issuer,
        uint256 newExpirationTime,
        uint256 renewalCount
    );

    event BatchOperationProcessed(
        bytes32 indexed batchId,
        address indexed operator,
        uint256 processedCount,
        uint256 timestamp
    );

    event GovernanceProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        bytes32 proposalHash
    );

    event GovernanceProposalVoted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    event GovernanceProposalExecuted(
        uint256 indexed proposalId,
        bool success
    );

    event EmergencyModeActivated(address indexed activator);
    event EmergencyModeDeactivated(address indexed deactivator);

    event DelegateAdded(
        string indexed did,
        address indexed delegate,
        bytes32 indexed permission
    );

    event DelegateRemoved(
        string indexed did,
        address indexed delegate,
        bytes32 indexed permission
    );

    // Modifiers
    modifier onlyDIDController(string memory did) {
        require(
            didControllers[did] == _msgSender() || 
            didRecords[did].delegates[keccak256(abi.encodePacked("CONTROLLER"))],
            "DIDRegistry: Not authorized controller"
        );
        _;
    }

    modifier didExists(string memory did) {
        require(
            didControllers[did] != address(0),
            "DIDRegistry: DID does not exist"
        );
        _;
    }

    modifier didActive(string memory did) {
        require(
            didRecords[did].isActive,
            "DIDRegistry: DID is not active"
        );
        _;
    }

    modifier validDID(string memory did) {
        require(
            bytes(did).length > 0,
            "DIDRegistry: Invalid DID"
        );
        _;
    }

    modifier onlyInEmergency() {
        require(emergencyMode, "DIDRegistry: Not in emergency mode");
        _;
    }

    modifier notInEmergency() {
        require(!emergencyMode, "DIDRegistry: In emergency mode");
        _;
    }

    modifier validBatchSize(uint256 size) {
        require(size > 0 && size <= MAX_BATCH_SIZE, "DIDRegistry: Invalid batch size");
        _;
    }

    /**
     * @dev Initialize the contract (replaces constructor for upgradeable contracts)
     */
    function initialize(
        address _admin,
        address _trustedForwarder,
        uint256 _votingPeriod,
        uint256 _quorumThreshold
    ) public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __ERC2771Context_init(_trustedForwarder);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);

        votingPeriod = _votingPeriod;
        quorumThreshold = _quorumThreshold;
    }

    /**
     * @dev Register a new DID with enhanced features
     */
    function registerDID(
        string memory did,
        string memory document,
        uint256 expiresAt,
        bytes32 metadataHash,
        bytes32 merkleRoot
    ) external nonReentrant whenNotPaused notInEmergency validDID(did) {
        require(
            didControllers[did] == address(0),
            "DIDRegistry: DID already exists"
        );
        require(
            bytes(document).length > 0,
            "DIDRegistry: Invalid document"
        );
        require(
            expiresAt == 0 || expiresAt > block.timestamp,
            "DIDRegistry: Invalid expiration time"
        );

        // Create DID record
        DIDRecord storage record = didRecords[did];
        record.document = document;
        record.controller = _msgSender();
        record.created = block.timestamp;
        record.updated = block.timestamp;
        record.isActive = true;
        record.nonce = 0;
        record.merkleRoot = merkleRoot;
        record.expiresAt = expiresAt;
        record.metadataHash = metadataHash;

        // Set controller mapping
        didControllers[did] = _msgSender();
        controllerDIDs[_msgSender()].push(did);

        // Store merkle root if provided
        if (merkleRoot != bytes32(0)) {
            merkleRoots[merkleRoot] = true;
        }

        emit DIDRegistered(
            did,
            _msgSender(),
            block.number,
            block.timestamp,
            merkleRoot
        );
    }

    /**
     * @dev Update DID document with enhanced security
     */
    function updateDID(
        string memory did,
        string memory document,
        uint256 nonce,
        bytes32 newMerkleRoot,
        bytes32 newMetadataHash
    ) external nonReentrant whenNotPaused notInEmergency 
      didExists(did) didActive(did) onlyDIDController(did) {
        require(
            bytes(document).length > 0,
            "DIDRegistry: Invalid document"
        );
        require(
            nonce == didRecords[did].nonce + 1,
            "DIDRegistry: Invalid nonce"
        );

        // Update DID record
        DIDRecord storage record = didRecords[did];
        record.document = document;
        record.updated = block.timestamp;
        record.nonce = nonce;
        record.merkleRoot = newMerkleRoot;
        record.metadataHash = newMetadataHash;

        // Update merkle root if provided
        if (newMerkleRoot != bytes32(0)) {
            merkleRoots[newMerkleRoot] = true;
        }

        emit DIDUpdated(
            did,
            _msgSender(),
            block.number,
            block.timestamp,
            nonce,
            newMerkleRoot
        );
    }

    /**
     * @dev Batch register multiple DIDs efficiently
     */
    function batchRegisterDIDs(
        string[] memory dids,
        string[] memory documents,
        uint256[] memory expirationTimes,
        bytes32[] memory metadataHashes,
        bytes32 merkleRoot
    ) external nonReentrant whenNotPaused notInEmergency 
      validBatchSize(dids.length) onlyRole(ISSUER_ROLE) {
        require(
            dids.length == documents.length &&
            dids.length == expirationTimes.length &&
            dids.length == metadataHashes.length,
            "DIDRegistry: Array length mismatch"
        );

        bytes32 batchId = keccak256(abi.encodePacked(
            block.timestamp,
            _msgSender(),
            dids.length
        ));

        for (uint256 i = 0; i < dids.length; i++) {
            require(
                didControllers[dids[i]] == address(0),
                "DIDRegistry: DID already exists"
            );
            require(
                bytes(documents[i]).length > 0,
                "DIDRegistry: Invalid document"
            );

            // Create DID record
            DIDRecord storage record = didRecords[dids[i]];
            record.document = documents[i];
            record.controller = _msgSender();
            record.created = block.timestamp;
            record.updated = block.timestamp;
            record.isActive = true;
            record.nonce = 0;
            record.merkleRoot = merkleRoot;
            record.expiresAt = expirationTimes[i];
            record.metadataHash = metadataHashes[i];

            // Set controller mapping
            didControllers[dids[i]] = _msgSender();
            controllerDIDs[_msgSender()].push(dids[i]);

            emit DIDRegistered(
                dids[i],
                _msgSender(),
                block.number,
                block.timestamp,
                merkleRoot
            );
        }

        // Store batch operation
        batchOperations[batchId] = BatchOperation({
            dids: dids,
            proofs: new bytes32[](0),
            timestamp: block.timestamp,
            operator: _msgSender(),
            processed: true
        });

        if (merkleRoot != bytes32(0)) {
            merkleRoots[merkleRoot] = true;
            merkleTreeSizes[merkleRoot] = dids.length;
        }

        emit BatchOperationProcessed(
            batchId,
            _msgSender(),
            dids.length,
            block.timestamp
        );
    }

    /**
     * @dev Register credential with enhanced features
     */
    function registerCredential(
        string memory credentialId,
        string memory issuer,
        string memory subject,
        bytes32 schemaHash,
        bytes32 commitmentHash,
        uint256 expiresAt,
        bytes32 proofHash,
        bytes32 parentCredential
    ) external nonReentrant whenNotPaused notInEmergency 
      didExists(issuer) didActive(issuer) onlyDIDController(issuer) {
        require(
            bytes(credentialRecords[credentialId].issuer).length == 0,
            "DIDRegistry: Credential already exists"
        );
        require(
            bytes(subject).length > 0,
            "DIDRegistry: Invalid subject"
        );
        require(
            schemaHash != bytes32(0),
            "DIDRegistry: Invalid schema hash"
        );
        require(
            commitmentHash != bytes32(0),
            "DIDRegistry: Invalid commitment hash"
        );
        require(
            expiresAt == 0 || expiresAt > block.timestamp,
            "DIDRegistry: Invalid expiration time"
        );

        // Create credential record
        credentialRecords[credentialId] = CredentialRecord({
            issuer: issuer,
            subject: subject,
            schemaHash: schemaHash,
            commitmentHash: commitmentHash,
            created: block.timestamp,
            isRevoked: false,
            revocationReason: "",
            expiresAt: expiresAt,
            proofHash: proofHash,
            renewalCount: 0,
            parentCredential: parentCredential
        });

        emit CredentialRegistered(
            credentialId,
            issuer,
            subject,
            schemaHash,
            commitmentHash,
            block.number,
            block.timestamp
        );
    }

    /**
     * @dev Renew credential with new expiration
     */
    function renewCredential(
        string memory credentialId,
        uint256 newExpiresAt
    ) external nonReentrant whenNotPaused notInEmergency {
        CredentialRecord storage record = credentialRecords[credentialId];
        
        require(
            bytes(record.issuer).length > 0,
            "DIDRegistry: Credential does not exist"
        );
        require(
            !record.isRevoked,
            "DIDRegistry: Credential is revoked"
        );
        require(
            didControllers[record.issuer] == _msgSender(),
            "DIDRegistry: Not authorized to renew"
        );
        require(
            newExpiresAt > block.timestamp,
            "DIDRegistry: Invalid new expiration time"
        );

        record.expiresAt = newExpiresAt;
        record.renewalCount += 1;

        emit CredentialRenewed(
            credentialId,
            record.issuer,
            newExpiresAt,
            record.renewalCount
        );
    }

    /**
     * @dev Add delegate with specific permissions
     */
    function addDelegate(
        string memory did,
        address delegate,
        bytes32 permission
    ) external nonReentrant whenNotPaused notInEmergency 
      didExists(did) didActive(did) onlyDIDController(did) {
        require(delegate != address(0), "DIDRegistry: Invalid delegate");
        require(
            controllerDIDs[delegate].length < MAX_DELEGATES,
            "DIDRegistry: Too many delegations"
        );

        didRecords[did].delegates[permission] = true;
        
        emit DelegateAdded(did, delegate, permission);
    }

    /**
     * @dev Remove delegate permission
     */
    function removeDelegate(
        string memory did,
        address delegate,
        bytes32 permission
    ) external nonReentrant whenNotPaused notInEmergency 
      didExists(did) didActive(did) onlyDIDController(did) {
        didRecords[did].delegates[permission] = false;
        
        emit DelegateRemoved(did, delegate, permission);
    }

    /**
     * @dev Create governance proposal
     */
    function createProposal(
        string memory title,
        string memory description,
        bytes32 proposalHash
    ) external nonReentrant whenNotPaused notInEmergency 
      onlyRole(GOVERNANCE_ROLE) returns (uint256) {
        require(bytes(title).length > 0, "DIDRegistry: Invalid title");
        require(bytes(description).length > 0, "DIDRegistry: Invalid description");
        require(proposalHash != bytes32(0), "DIDRegistry: Invalid proposal hash");

        uint256 proposalId = ++proposalCount;
        
        GovernanceProposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.title = title;
        proposal.description = description;
        proposal.proposer = _msgSender();
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.executed = false;
        proposal.votesFor = 0;
        proposal.votesAgainst = 0;
        proposal.proposalHash = proposalHash;

        emit GovernanceProposalCreated(
            proposalId,
            _msgSender(),
            title,
            proposalHash
        );

        return proposalId;
    }

    /**
     * @dev Vote on governance proposal
     */
    function vote(
        uint256 proposalId,
        bool support,
        uint256 weight
    ) external nonReentrant whenNotPaused notInEmergency 
      onlyRole(GOVERNANCE_ROLE) {
        GovernanceProposal storage proposal = proposals[proposalId];
        
        require(proposal.id != 0, "DIDRegistry: Proposal does not exist");
        require(
            block.timestamp >= proposal.startTime &&
            block.timestamp <= proposal.endTime,
            "DIDRegistry: Voting period not active"
        );
        require(
            !proposal.hasVoted[_msgSender()],
            "DIDRegistry: Already voted"
        );
        require(weight >= minVotingPower, "DIDRegistry: Insufficient voting power");

        proposal.hasVoted[_msgSender()] = true;
        proposal.voteWeight[_msgSender()] = weight;

        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }

        emit GovernanceProposalVoted(
            proposalId,
            _msgSender(),
            support,
            weight
        );
    }

    /**
     * @dev Execute governance proposal
     */
    function executeProposal(uint256 proposalId) external nonReentrant whenNotPaused {
        GovernanceProposal storage proposal = proposals[proposalId];
        
        require(proposal.id != 0, "DIDRegistry: Proposal does not exist");
        require(!proposal.executed, "DIDRegistry: Proposal already executed");
        require(
            block.timestamp > proposal.endTime + executionDelay,
            "DIDRegistry: Execution delay not met"
        );

        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 totalSupply = 1000000; // This should be fetched from governance token
        
        require(
            totalVotes * 100 >= totalSupply * quorumThreshold,
            "DIDRegistry: Quorum not reached"
        );
        require(
            proposal.votesFor > proposal.votesAgainst,
            "DIDRegistry: Proposal failed"
        );

        proposal.executed = true;

        // Execute proposal logic here based on proposalHash
        // This would implement the actual governance actions

        emit GovernanceProposalExecuted(proposalId, true);
    }

    /**
     * @dev Emergency pause (emergency role only)
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        emergencyMode = true;
        _pause();
        emit EmergencyModeActivated(_msgSender());
    }

    /**
     * @dev Emergency unpause (emergency role only)
     */
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        emergencyMode = false;
        _unpause();
        emit EmergencyModeDeactivated(_msgSender());
    }

    /**
     * @dev Verify merkle proof for batch operations
     */
    function verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) public pure returns (bool) {
        return MerkleProof.verify(proof, root, leaf);
    }

    /**
     * @dev Get DID document with enhanced metadata
     */
    function getDIDDocument(string memory did)
        external
        view
        didExists(did)
        returns (
            string memory document,
            uint256 created,
            uint256 updated,
            bool isActive,
            uint256 nonce,
            bytes32 merkleRoot,
            uint256 expiresAt,
            bytes32 metadataHash
        )
    {
        DIDRecord storage record = didRecords[did];
        return (
            record.document,
            record.created,
            record.updated,
            record.isActive,
            record.nonce,
            record.merkleRoot,
            record.expiresAt,
            record.metadataHash
        );
    }

    /**
     * @dev Get credential details with enhanced information
     */
    function getCredentialDetails(string memory credentialId)
        external
        view
        returns (
            string memory issuer,
            string memory subject,
            bytes32 schemaHash,
            bytes32 commitmentHash,
            uint256 created,
            uint256 expiresAt,
            bytes32 proofHash,
            uint256 renewalCount,
            bytes32 parentCredential
        )
    {
        CredentialRecord storage record = credentialRecords[credentialId];
        return (
            record.issuer,
            record.subject,
            record.schemaHash,
            record.commitmentHash,
            record.created,
            record.expiresAt,
            record.proofHash,
            record.renewalCount,
            record.parentCredential
        );
    }

    /**
     * @dev Check if address has delegate permission
     */
    function hasDelegate(
        string memory did,
        address delegate,
        bytes32 permission
    ) external view returns (bool) {
        return didRecords[did].delegates[permission];
    }

    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId)
        external
        view
        returns (
            uint256 id,
            string memory title,
            string memory description,
            address proposer,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            uint256 votesFor,
            uint256 votesAgainst,
            bytes32 proposalHash
        )
    {
        GovernanceProposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.proposalHash
        );
    }

    /**
     * @dev Check if DID is expired
     */
    function isDIDExpired(string memory did) external view returns (bool) {
        uint256 expiresAt = didRecords[did].expiresAt;
        return expiresAt > 0 && block.timestamp > expiresAt;
    }

    /**
     * @dev Get batch operation details
     */
    function getBatchOperation(bytes32 batchId)
        external
        view
        returns (
            string[] memory dids,
            uint256 timestamp,
            address operator,
            bool processed
        )
    {
        BatchOperation storage operation = batchOperations[batchId];
        return (
            operation.dids,
            operation.timestamp,
            operation.operator,
            operation.processed
        );
    }

    /**
     * @dev Override _msgSender to support meta-transactions
     */
    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address sender)
    {
        return ERC2771Context._msgSender();
    }

    /**
     * @dev Override _msgData to support meta-transactions
     */
    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    /**
     * @dev Authorize upgrade (only admin)
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    /**
     * @dev Get contract version
     */
    function getVersion() external pure returns (uint256) {
        return VERSION;
    }
}