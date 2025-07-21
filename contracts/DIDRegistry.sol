// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title DIDRegistry
 * @dev Decentralized Identity Registry for PersonaPass
 * @author PersonaPass Security Team
 */
contract DIDRegistry is Ownable, ReentrancyGuard, Pausable {
    
    // DID Record Structure
    struct DIDRecord {
        string document;           // JSON DID document
        address controller;        // Controller address
        uint256 created;          // Creation timestamp
        uint256 updated;          // Last update timestamp
        bool isActive;            // Active status
        uint256 nonce;            // Update nonce for replay protection
    }
    
    // Credential Record Structure
    struct CredentialRecord {
        string issuer;            // Issuer DID
        string subject;           // Subject DID
        bytes32 schemaHash;       // Schema hash
        bytes32 commitmentHash;   // ZK commitment hash
        uint256 created;          // Creation timestamp
        bool isRevoked;           // Revocation status
        string revocationReason;  // Revocation reason
        uint256 expiresAt;        // Expiration timestamp
    }
    
    // Storage
    mapping(string => DIDRecord) public didRecords;
    mapping(string => CredentialRecord) public credentialRecords;
    mapping(string => address) public didControllers;
    mapping(address => string[]) public controllerDIDs;
    mapping(string => bool) public revokedCredentials;
    
    // Events
    event DIDRegistered(
        string indexed did,
        address indexed controller,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event DIDUpdated(
        string indexed did,
        address indexed controller,
        uint256 blockNumber,
        uint256 timestamp,
        uint256 nonce
    );
    
    event DIDRevoked(
        string indexed did,
        address indexed controller,
        uint256 blockNumber,
        uint256 timestamp
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
    
    event CredentialExpired(
        string indexed credentialId,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyDIDController(string memory did) {
        require(
            didControllers[did] == msg.sender,
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
    
    modifier validCredentialId(string memory credentialId) {
        require(
            bytes(credentialId).length > 0,
            "DIDRegistry: Invalid credential ID"
        );
        _;
    }
    
    /**
     * @dev Constructor
     */
    constructor() {
        // Initialize with deployer as initial owner
    }
    
    /**
     * @dev Register a new DID
     * @param did The DID identifier
     * @param document The DID document JSON
     */
    function registerDID(
        string memory did,
        string memory document
    ) external nonReentrant whenNotPaused validDID(did) {
        require(
            didControllers[did] == address(0),
            "DIDRegistry: DID already exists"
        );
        require(
            bytes(document).length > 0,
            "DIDRegistry: Invalid document"
        );
        
        // Create DID record
        didRecords[did] = DIDRecord({
            document: document,
            controller: msg.sender,
            created: block.timestamp,
            updated: block.timestamp,
            isActive: true,
            nonce: 0
        });
        
        // Set controller mapping
        didControllers[did] = msg.sender;
        controllerDIDs[msg.sender].push(did);
        
        emit DIDRegistered(
            did,
            msg.sender,
            block.number,
            block.timestamp
        );
    }
    
    /**
     * @dev Update an existing DID document
     * @param did The DID identifier
     * @param document The updated DID document JSON
     * @param nonce The update nonce for replay protection
     */
    function updateDID(
        string memory did,
        string memory document,
        uint256 nonce
    ) external nonReentrant whenNotPaused didExists(did) didActive(did) onlyDIDController(did) {
        require(
            bytes(document).length > 0,
            "DIDRegistry: Invalid document"
        );
        require(
            nonce == didRecords[did].nonce + 1,
            "DIDRegistry: Invalid nonce"
        );
        
        // Update DID record
        didRecords[did].document = document;
        didRecords[did].updated = block.timestamp;
        didRecords[did].nonce = nonce;
        
        emit DIDUpdated(
            did,
            msg.sender,
            block.number,
            block.timestamp,
            nonce
        );
    }
    
    /**
     * @dev Revoke a DID (mark as inactive)
     * @param did The DID identifier
     */
    function revokeDID(
        string memory did
    ) external nonReentrant whenNotPaused didExists(did) didActive(did) onlyDIDController(did) {
        
        // Mark as inactive
        didRecords[did].isActive = false;
        didRecords[did].updated = block.timestamp;
        
        emit DIDRevoked(
            did,
            msg.sender,
            block.number,
            block.timestamp
        );
    }
    
    /**
     * @dev Get DID document and metadata
     * @param did The DID identifier
     * @return document The DID document JSON
     * @return created Creation timestamp
     * @return updated Last update timestamp
     * @return isActive Active status
     * @return nonce Current nonce
     */
    function getDIDDocument(
        string memory did
    ) external view didExists(did) returns (
        string memory document,
        uint256 created,
        uint256 updated,
        bool isActive,
        uint256 nonce
    ) {
        DIDRecord storage record = didRecords[did];
        return (
            record.document,
            record.created,
            record.updated,
            record.isActive,
            record.nonce
        );
    }
    
    /**
     * @dev Check if DID is active
     * @param did The DID identifier
     * @return isActive Active status
     */
    function isDIDActive(
        string memory did
    ) external view returns (bool) {
        return didControllers[did] != address(0) && didRecords[did].isActive;
    }
    
    /**
     * @dev Register a verifiable credential
     * @param credentialId The credential identifier
     * @param issuer The issuer DID
     * @param subject The subject DID
     * @param schemaHash The schema hash
     * @param commitmentHash The ZK commitment hash
     * @param expiresAt The expiration timestamp (0 for no expiration)
     */
    function registerCredential(
        string memory credentialId,
        string memory issuer,
        string memory subject,
        bytes32 schemaHash,
        bytes32 commitmentHash,
        uint256 expiresAt
    ) external nonReentrant whenNotPaused validCredentialId(credentialId) didExists(issuer) didActive(issuer) onlyDIDController(issuer) {
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
            expiresAt: expiresAt
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
     * @dev Revoke a credential
     * @param credentialId The credential identifier
     * @param reason The revocation reason
     */
    function revokeCredential(
        string memory credentialId,
        string memory reason
    ) external nonReentrant whenNotPaused validCredentialId(credentialId) {
        CredentialRecord storage record = credentialRecords[credentialId];
        
        require(
            bytes(record.issuer).length > 0,
            "DIDRegistry: Credential does not exist"
        );
        require(
            !record.isRevoked,
            "DIDRegistry: Credential already revoked"
        );
        require(
            didControllers[record.issuer] == msg.sender,
            "DIDRegistry: Not authorized to revoke"
        );
        require(
            bytes(reason).length > 0,
            "DIDRegistry: Invalid revocation reason"
        );
        
        // Mark as revoked
        record.isRevoked = true;
        record.revocationReason = reason;
        revokedCredentials[credentialId] = true;
        
        emit CredentialRevoked(
            credentialId,
            record.issuer,
            reason,
            block.number,
            block.timestamp
        );
    }
    
    /**
     * @dev Get credential status
     * @param credentialId The credential identifier
     * @return exists Whether credential exists
     * @return isRevoked Whether credential is revoked
     * @return revocationReason Revocation reason (if revoked)
     * @return isExpired Whether credential is expired
     */
    function getCredentialStatus(
        string memory credentialId
    ) external view returns (
        bool exists,
        bool isRevoked,
        string memory revocationReason,
        bool isExpired
    ) {
        CredentialRecord storage record = credentialRecords[credentialId];
        
        exists = bytes(record.issuer).length > 0;
        isRevoked = record.isRevoked;
        revocationReason = record.revocationReason;
        isExpired = record.expiresAt > 0 && block.timestamp > record.expiresAt;
        
        return (exists, isRevoked, revocationReason, isExpired);
    }
    
    /**
     * @dev Check if credential is revoked
     * @param credentialId The credential identifier
     * @return isRevoked Revocation status
     */
    function isCredentialRevoked(
        string memory credentialId
    ) external view returns (bool) {
        return credentialRecords[credentialId].isRevoked;
    }
    
    /**
     * @dev Get credential details
     * @param credentialId The credential identifier
     * @return issuer The issuer DID
     * @return subject The subject DID
     * @return schemaHash The schema hash
     * @return commitmentHash The ZK commitment hash
     * @return created Creation timestamp
     * @return expiresAt Expiration timestamp
     */
    function getCredentialDetails(
        string memory credentialId
    ) external view returns (
        string memory issuer,
        string memory subject,
        bytes32 schemaHash,
        bytes32 commitmentHash,
        uint256 created,
        uint256 expiresAt
    ) {
        CredentialRecord storage record = credentialRecords[credentialId];
        return (
            record.issuer,
            record.subject,
            record.schemaHash,
            record.commitmentHash,
            record.created,
            record.expiresAt
        );
    }
    
    /**
     * @dev Get all DIDs controlled by an address
     * @param controller The controller address
     * @return dids Array of DIDs controlled by the address
     */
    function getControllerDIDs(
        address controller
    ) external view returns (string[] memory) {
        return controllerDIDs[controller];
    }
    
    /**
     * @dev Check if credential is expired
     * @param credentialId The credential identifier
     * @return isExpired Expiration status
     */
    function isCredentialExpired(
        string memory credentialId
    ) external view returns (bool) {
        CredentialRecord storage record = credentialRecords[credentialId];
        return record.expiresAt > 0 && block.timestamp > record.expiresAt;
    }
    
    /**
     * @dev Emergency pause function (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Batch cleanup expired credentials (only owner)
     * @param credentialIds Array of credential IDs to check and mark as expired
     */
    function batchCleanupExpiredCredentials(
        string[] memory credentialIds
    ) external onlyOwner {
        for (uint256 i = 0; i < credentialIds.length; i++) {
            CredentialRecord storage record = credentialRecords[credentialIds[i]];
            if (record.expiresAt > 0 && block.timestamp > record.expiresAt && !record.isRevoked) {
                emit CredentialExpired(
                    credentialIds[i],
                    block.number,
                    block.timestamp
                );
            }
        }
    }
    
    /**
     * @dev Get contract version
     * @return version The contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}