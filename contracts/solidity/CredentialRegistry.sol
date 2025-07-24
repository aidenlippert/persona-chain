// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Credential Registry - On-chain Verifiable Credential Management
 * @notice Production-ready registry for PersonaPass credentials
 * @dev Manages credential issuance, revocation, and verification on-chain
 */
contract CredentialRegistry is AccessControl, ReentrancyGuard {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant REVOCATION_ROLE = keccak256("REVOCATION_ROLE");

    // Credential structure
    struct Credential {
        uint256 id;
        string did;  // Decentralized Identifier of subject
        address issuer;
        string credentialType;
        bytes32 credentialHash;  // Hash of credential data
        uint256 issuanceDate;
        uint256 expirationDate;
        bool isRevoked;
        string revocationReason;
        uint256 revocationDate;
        string metadataURI;  // IPFS URI for additional metadata
    }

    // State variables
    Counters.Counter private _credentialIdCounter;
    mapping(uint256 => Credential) public credentials;
    mapping(string => uint256[]) public didToCredentials;  // DID to credential IDs
    mapping(address => uint256[]) public issuerToCredentials;
    mapping(bytes32 => uint256) public hashToCredentialId;
    
    // Credential types registry
    mapping(string => bool) public validCredentialTypes;
    string[] public credentialTypes;

    // Events
    event CredentialIssued(
        uint256 indexed credentialId,
        string indexed did,
        address indexed issuer,
        string credentialType,
        bytes32 credentialHash
    );
    
    event CredentialRevoked(
        uint256 indexed credentialId,
        address indexed revokedBy,
        string reason
    );
    
    event CredentialTypeAdded(string credentialType);
    event CredentialTypeRemoved(string credentialType);
    
    event CredentialVerified(
        uint256 indexed credentialId,
        address indexed verifier,
        bool isValid
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(REVOCATION_ROLE, msg.sender);

        // Initialize default credential types
        _addCredentialType("GitHubDeveloperCredential");
        _addCredentialType("LinkedInProfessionalCredential");
        _addCredentialType("PlaidFinancialCredential");
        _addCredentialType("StripeIdentityCredential");
        _addCredentialType("EducationCredential");
        _addCredentialType("EmploymentCredential");
        _addCredentialType("AgeVerificationCredential");
    }

    /**
     * @notice Issue a new credential
     * @param did Subject's decentralized identifier
     * @param credentialType Type of credential being issued
     * @param credentialHash Hash of the credential data
     * @param expirationDate Expiration timestamp (0 for no expiration)
     * @param metadataURI IPFS URI for additional metadata
     * @return credentialId The ID of the newly issued credential
     */
    function issueCredential(
        string memory did,
        string memory credentialType,
        bytes32 credentialHash,
        uint256 expirationDate,
        string memory metadataURI
    ) external onlyRole(ISSUER_ROLE) nonReentrant returns (uint256) {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(validCredentialTypes[credentialType], "Invalid credential type");
        require(credentialHash != bytes32(0), "Invalid credential hash");
        require(hashToCredentialId[credentialHash] == 0, "Credential already exists");
        
        if (expirationDate > 0) {
            require(expirationDate > block.timestamp, "Expiration date must be in future");
        }

        uint256 credentialId = _credentialIdCounter.current();
        _credentialIdCounter.increment();

        Credential storage newCredential = credentials[credentialId];
        newCredential.id = credentialId;
        newCredential.did = did;
        newCredential.issuer = msg.sender;
        newCredential.credentialType = credentialType;
        newCredential.credentialHash = credentialHash;
        newCredential.issuanceDate = block.timestamp;
        newCredential.expirationDate = expirationDate;
        newCredential.isRevoked = false;
        newCredential.metadataURI = metadataURI;

        didToCredentials[did].push(credentialId);
        issuerToCredentials[msg.sender].push(credentialId);
        hashToCredentialId[credentialHash] = credentialId;

        emit CredentialIssued(
            credentialId,
            did,
            msg.sender,
            credentialType,
            credentialHash
        );

        return credentialId;
    }

    /**
     * @notice Revoke a credential
     * @param credentialId ID of the credential to revoke
     * @param reason Reason for revocation
     */
    function revokeCredential(
        uint256 credentialId,
        string memory reason
    ) external nonReentrant {
        require(credentialId < _credentialIdCounter.current(), "Credential does not exist");
        
        Credential storage credential = credentials[credentialId];
        require(!credential.isRevoked, "Credential already revoked");
        
        // Only issuer or revocation role can revoke
        require(
            credential.issuer == msg.sender || hasRole(REVOCATION_ROLE, msg.sender),
            "Not authorized to revoke"
        );

        credential.isRevoked = true;
        credential.revocationReason = reason;
        credential.revocationDate = block.timestamp;

        emit CredentialRevoked(credentialId, msg.sender, reason);
    }

    /**
     * @notice Verify a credential
     * @param credentialId ID of the credential to verify
     * @return isValid Whether the credential is valid
     * @return credential The credential data
     */
    function verifyCredential(uint256 credentialId) 
        external 
        view 
        returns (bool isValid, Credential memory credential) 
    {
        require(credentialId < _credentialIdCounter.current(), "Credential does not exist");
        
        credential = credentials[credentialId];
        
        isValid = !credential.isRevoked;
        
        if (credential.expirationDate > 0) {
            isValid = isValid && block.timestamp <= credential.expirationDate;
        }

        return (isValid, credential);
    }

    /**
     * @notice Verify a credential and emit event (for verifiers)
     * @param credentialId ID of the credential to verify
     * @return isValid Whether the credential is valid
     */
    function verifyCredentialWithEvent(uint256 credentialId) 
        external 
        onlyRole(VERIFIER_ROLE)
        returns (bool isValid) 
    {
        (isValid, ) = this.verifyCredential(credentialId);
        emit CredentialVerified(credentialId, msg.sender, isValid);
        return isValid;
    }

    /**
     * @notice Get all credentials for a DID
     * @param did The decentralized identifier
     * @return Array of credential IDs
     */
    function getCredentialsByDID(string memory did) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return didToCredentials[did];
    }

    /**
     * @notice Get all credentials issued by an address
     * @param issuer The issuer address
     * @return Array of credential IDs
     */
    function getCredentialsByIssuer(address issuer) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return issuerToCredentials[issuer];
    }

    /**
     * @notice Get credential by hash
     * @param credentialHash The credential hash
     * @return credentialId The credential ID
     */
    function getCredentialByHash(bytes32 credentialHash) 
        external 
        view 
        returns (uint256) 
    {
        return hashToCredentialId[credentialHash];
    }

    /**
     * @notice Add a new credential type (admin only)
     * @param credentialType The credential type to add
     */
    function addCredentialType(string memory credentialType) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _addCredentialType(credentialType);
    }

    /**
     * @notice Remove a credential type (admin only)
     * @param credentialType The credential type to remove
     */
    function removeCredentialType(string memory credentialType) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(validCredentialTypes[credentialType], "Credential type does not exist");
        
        validCredentialTypes[credentialType] = false;
        
        // Remove from array
        for (uint256 i = 0; i < credentialTypes.length; i++) {
            if (keccak256(bytes(credentialTypes[i])) == keccak256(bytes(credentialType))) {
                credentialTypes[i] = credentialTypes[credentialTypes.length - 1];
                credentialTypes.pop();
                break;
            }
        }
        
        emit CredentialTypeRemoved(credentialType);
    }

    /**
     * @notice Get all valid credential types
     * @return Array of credential types
     */
    function getCredentialTypes() external view returns (string[] memory) {
        return credentialTypes;
    }

    /**
     * @notice Internal function to add credential type
     * @param credentialType The credential type to add
     */
    function _addCredentialType(string memory credentialType) private {
        require(!validCredentialTypes[credentialType], "Credential type already exists");
        
        validCredentialTypes[credentialType] = true;
        credentialTypes.push(credentialType);
        
        emit CredentialTypeAdded(credentialType);
    }

    /**
     * @notice Get total number of credentials issued
     * @return Total count
     */
    function getTotalCredentials() external view returns (uint256) {
        return _credentialIdCounter.current();
    }
}