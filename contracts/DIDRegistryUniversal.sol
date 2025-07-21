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
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title DIDRegistryUniversal
 * @dev Universal DID Registry supporting multiple DID methods
 * @author PersonaPass Security Team
 * 
 * Supported DID Methods:
 * - did:persona (PersonaPass native)
 * - did:key (W3C standard)
 * - did:web (Web-based DIDs)
 * - did:ethr (Ethereum DIDs)
 * - Custom methods via plugins
 */
contract DIDRegistryUniversal is 
    Initializable, 
    UUPSUpgradeable, 
    AccessControl, 
    ReentrancyGuard, 
    Pausable, 
    ERC2771Context,
    EIP712,
    Multicall
{
    using MerkleProof for bytes32[];
    using ECDSA for bytes32;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");
    bytes32 public constant METHOD_REGISTRAR_ROLE = keccak256("METHOD_REGISTRAR_ROLE");

    // Version for upgrades
    uint256 public constant VERSION = 4;

    // DID Method Registry
    struct DIDMethod {
        string name;              // Method name (e.g., "persona", "key", "web")
        string schema;            // JSON schema for validation
        address resolver;         // Resolver contract address
        bool isActive;           // Method status
        uint256 registrationFee; // Fee in wei
        bytes32 configHash;      // Configuration hash
    }

    // Universal DID Record with method support
    struct UniversalDIDRecord {
        string method;           // DID method (persona, key, web, ethr)
        string identifier;       // Method-specific identifier
        bytes document;          // Serialized DID document
        address controller;      // Primary controller
        uint128 created;         // Creation timestamp
        uint128 updated;         // Last update timestamp
        uint64 nonce;           // Update nonce
        uint64 version;         // Document version
        bool isActive;          // Active status
        bool isRevoked;         // Revocation status
        bytes32 documentHash;   // Hash of current document
        bytes32 metadataHash;   // Additional metadata hash
        mapping(address => bool) delegates; // Delegated controllers
        mapping(bytes32 => bool) capabilities; // Method-specific capabilities
    }

    // Enhanced credential with method-specific features
    struct UniversalCredentialRecord {
        string credentialType;   // Type of credential
        string issuerDID;       // Full issuer DID
        string subjectDID;      // Full subject DID
        string issuerMethod;    // Issuer DID method
        string subjectMethod;   // Subject DID method
        bytes32 schemaHash;     // Schema hash
        bytes32 commitmentHash; // ZK commitment
        bytes32 proofHash;      // Cryptographic proof
        uint128 created;        // Creation timestamp
        uint128 expiresAt;      // Expiration timestamp
        uint32 renewalCount;    // Renewal counter
        bool isRevoked;         // Revocation status
        bytes32 parentCredential; // Parent credential for chains
        mapping(string => bytes32) methodSpecificData; // Method-specific extensions
    }

    // Method-specific configuration
    struct MethodConfig {
        uint256 minKeyLength;    // Minimum key length
        uint256 maxKeyLength;    // Maximum key length
        string[] supportedCurves; // Supported curves
        bool requiresProof;      // Requires cryptographic proof
        bool allowsDelegation;   // Allows delegation
        uint256 maxDelegates;    // Maximum number of delegates
    }

    // Storage mappings
    mapping(string => DIDMethod) public didMethods;                    // method name => config
    mapping(bytes32 => UniversalDIDRecord) public universalDIDRecords; // didHash => record
    mapping(bytes32 => UniversalCredentialRecord) public universalCredentials; // credHash => record
    mapping(bytes32 => address) public didControllers;                // didHash => controller
    mapping(address => bytes32[]) public controllerDIDs;             // controller => didHashes
    mapping(string => MethodConfig) public methodConfigs;            // method => config
    mapping(address => uint256) public nonces;                       // meta-transaction nonces
    mapping(bytes32 => bool) public revokedCredentials;              // credential revocation registry

    // Resolver mappings
    mapping(string => address) public methodResolvers;               // method => resolver contract
    mapping(bytes32 => mapping(string => bytes)) public methodExtensions; // didHash => method => data

    // Cross-method resolution
    mapping(bytes32 => mapping(string => bytes32)) public methodAliases; // didHash => method => alias

    // Events
    event DIDMethodRegistered(
        string indexed method,
        address indexed resolver,
        uint256 registrationFee
    );

    event UniversalDIDRegistered(
        bytes32 indexed didHash,
        string indexed method,
        string identifier,
        address indexed controller
    );

    event DIDMethodChanged(
        bytes32 indexed didHash,
        string oldMethod,
        string newMethod
    );

    event MethodSpecificDataUpdated(
        bytes32 indexed didHash,
        string indexed method,
        bytes32 dataHash
    );

    event CrossMethodAliasCreated(
        bytes32 indexed primaryDID,
        string indexed aliasMethod,
        bytes32 aliasDID
    );

    event UniversalCredentialIssued(
        bytes32 indexed credentialHash,
        string indexed issuerMethod,
        string indexed subjectMethod,
        string credentialType
    );

    // EIP-712 type hashes for multi-method support
    bytes32 private constant UNIVERSAL_DID_REGISTRATION_TYPEHASH = keccak256(
        "UniversalDIDRegistration(string method,string identifier,bytes32 documentHash,uint256 nonce)"
    );

    bytes32 private constant METHOD_TRANSITION_TYPEHASH = keccak256(
        "MethodTransition(bytes32 didHash,string fromMethod,string toMethod,bytes32 proof,uint256 nonce)"
    );

    /**
     * @dev Initialize the contract with universal DID support
     */
    function initialize(
        address _admin,
        address _trustedForwarder
    ) public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __ERC2771Context_init(_trustedForwarder);
        __EIP712_init("PersonaPassUniversalDIDRegistry", "1.0");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(METHOD_REGISTRAR_ROLE, _admin);

        // Register default DID methods
        _registerDefaultMethods();
    }

    /**
     * @dev Register a new DID method
     */
    function registerDIDMethod(
        string memory method,
        string memory schema,
        address resolver,
        uint256 registrationFee,
        MethodConfig memory config
    ) external onlyRole(METHOD_REGISTRAR_ROLE) {
        require(bytes(method).length > 0, "Invalid method name");
        require(resolver != address(0), "Invalid resolver");
        require(!didMethods[method].isActive, "Method already exists");

        didMethods[method] = DIDMethod({
            name: method,
            schema: schema,
            resolver: resolver,
            isActive: true,
            registrationFee: registrationFee,
            configHash: keccak256(abi.encode(config))
        });

        methodConfigs[method] = config;
        methodResolvers[method] = resolver;

        emit DIDMethodRegistered(method, resolver, registrationFee);
    }

    /**
     * @dev Register universal DID with method-specific validation
     */
    function registerUniversalDID(
        string memory method,
        string memory identifier,
        bytes memory document,
        bytes32 metadataHash,
        bytes memory methodSpecificData,
        bytes memory signature
    ) external payable nonReentrant whenNotPaused {
        require(didMethods[method].isActive, "Method not supported");
        require(bytes(identifier).length > 0, "Invalid identifier");
        require(document.length > 0, "Invalid document");
        require(msg.value >= didMethods[method].registrationFee, "Insufficient fee");

        // Construct full DID
        string memory fullDID = string(abi.encodePacked("did:", method, ":", identifier));
        bytes32 didHash = keccak256(bytes(fullDID));
        
        require(didControllers[didHash] == address(0), "DID already exists");

        // Verify signature for registration
        bytes32 documentHash = keccak256(document);
        bytes32 structHash = keccak256(abi.encode(
            UNIVERSAL_DID_REGISTRATION_TYPEHASH,
            keccak256(bytes(method)),
            keccak256(bytes(identifier)),
            documentHash,
            nonces[_msgSender()]
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        require(signer == _msgSender(), "Invalid signature");

        // Method-specific validation
        require(_validateMethodSpecificData(method, methodSpecificData), "Invalid method data");

        // Create universal DID record
        UniversalDIDRecord storage record = universalDIDRecords[didHash];
        record.method = method;
        record.identifier = identifier;
        record.document = document;
        record.controller = _msgSender();
        record.created = uint128(block.timestamp);
        record.updated = uint128(block.timestamp);
        record.nonce = 0;
        record.version = 1;
        record.isActive = true;
        record.isRevoked = false;
        record.documentHash = documentHash;
        record.metadataHash = metadataHash;

        // Set controller mappings
        didControllers[didHash] = _msgSender();
        controllerDIDs[_msgSender()].push(didHash);

        // Store method-specific data
        if (methodSpecificData.length > 0) {
            methodExtensions[didHash][method] = methodSpecificData;
        }

        nonces[_msgSender()]++;

        emit UniversalDIDRegistered(didHash, method, identifier, _msgSender());
    }

    /**
     * @dev Create cross-method alias for DID interoperability
     */
    function createMethodAlias(
        bytes32 primaryDIDHash,
        string memory aliasMethod,
        string memory aliasIdentifier,
        bytes memory proof
    ) external nonReentrant whenNotPaused {
        require(didControllers[primaryDIDHash] == _msgSender(), "Not authorized");
        require(didMethods[aliasMethod].isActive, "Alias method not supported");
        require(universalDIDRecords[primaryDIDHash].isActive, "Primary DID inactive");

        string memory aliasFullDID = string(abi.encodePacked("did:", aliasMethod, ":", aliasIdentifier));
        bytes32 aliasDIDHash = keccak256(bytes(aliasFullDID));
        
        require(didControllers[aliasDIDHash] == address(0), "Alias DID already exists");
        require(_verifyMethodTransition(primaryDIDHash, aliasMethod, proof), "Invalid transition proof");

        // Create alias mapping
        methodAliases[primaryDIDHash][aliasMethod] = aliasDIDHash;
        didControllers[aliasDIDHash] = _msgSender();

        emit CrossMethodAliasCreated(primaryDIDHash, aliasMethod, aliasDIDHash);
    }

    /**
     * @dev Issue universal credential with multi-method support
     */
    function issueUniversalCredential(
        string memory credentialId,
        string memory credentialType,
        string memory issuerDID,
        string memory subjectDID,
        bytes32 schemaHash,
        bytes32 commitmentHash,
        bytes32 proofHash,
        uint256 expiresAt,
        bytes memory issuerMethodData,
        bytes memory subjectMethodData
    ) external nonReentrant whenNotPaused {
        bytes32 credentialHash = keccak256(bytes(credentialId));
        require(universalCredentials[credentialHash].created == 0, "Credential exists");

        // Parse DID methods
        (string memory issuerMethod, ) = _parseDID(issuerDID);
        (string memory subjectMethod, ) = _parseDID(subjectDID);
        
        bytes32 issuerDIDHash = keccak256(bytes(issuerDID));
        require(didControllers[issuerDIDHash] == _msgSender(), "Not authorized issuer");
        require(universalDIDRecords[issuerDIDHash].isActive, "Issuer DID inactive");

        // Create universal credential
        UniversalCredentialRecord storage credential = universalCredentials[credentialHash];
        credential.credentialType = credentialType;
        credential.issuerDID = issuerDID;
        credential.subjectDID = subjectDID;
        credential.issuerMethod = issuerMethod;
        credential.subjectMethod = subjectMethod;
        credential.schemaHash = schemaHash;
        credential.commitmentHash = commitmentHash;
        credential.proofHash = proofHash;
        credential.created = uint128(block.timestamp);
        credential.expiresAt = uint128(expiresAt);
        credential.renewalCount = 0;
        credential.isRevoked = false;

        // Store method-specific credential data
        if (issuerMethodData.length > 0) {
            credential.methodSpecificData[string(abi.encodePacked("issuer:", issuerMethod))] = keccak256(issuerMethodData);
        }
        if (subjectMethodData.length > 0) {
            credential.methodSpecificData[string(abi.encodePacked("subject:", subjectMethod))] = keccak256(subjectMethodData);
        }

        emit UniversalCredentialIssued(credentialHash, issuerMethod, subjectMethod, credentialType);
    }

    /**
     * @dev Resolve DID using method-specific resolver
     */
    function resolveDID(string memory did) external view returns (
        bytes memory document,
        address controller,
        uint256 created,
        uint256 updated,
        bool isActive
    ) {
        (string memory method, string memory identifier) = _parseDID(did);
        require(didMethods[method].isActive, "Method not supported");

        bytes32 didHash = keccak256(bytes(did));
        UniversalDIDRecord storage record = universalDIDRecords[didHash];
        
        return (
            record.document,
            record.controller,
            record.created,
            record.updated,
            record.isActive && !record.isRevoked
        );
    }

    /**
     * @dev Get method-specific data for DID
     */
    function getMethodSpecificData(
        bytes32 didHash,
        string memory method
    ) external view returns (bytes memory) {
        return methodExtensions[didHash][method];
    }

    /**
     * @dev Get cross-method aliases for DID
     */
    function getMethodAliases(
        bytes32 didHash,
        string memory method
    ) external view returns (bytes32) {
        return methodAliases[didHash][method];
    }

    /**
     * @dev Check if method is supported
     */
    function isMethodSupported(string memory method) external view returns (bool) {
        return didMethods[method].isActive;
    }

    /**
     * @dev Get supported methods list
     */
    function getSupportedMethods() external view returns (string[] memory) {
        // This would need to be implemented with an array tracking
        // For brevity, returning empty array - would need enhancement
        string[] memory methods = new string[](0);
        return methods;
    }

    // Private helper functions

    /**
     * @dev Register default DID methods
     */
    function _registerDefaultMethods() private {
        // Register persona method
        methodConfigs["persona"] = MethodConfig({
            minKeyLength: 32,
            maxKeyLength: 64,
            supportedCurves: new string[](2),
            requiresProof: true,
            allowsDelegation: true,
            maxDelegates: 5
        });
        methodConfigs["persona"].supportedCurves[0] = "Ed25519";
        methodConfigs["persona"].supportedCurves[1] = "secp256k1";

        didMethods["persona"] = DIDMethod({
            name: "persona",
            schema: "{}",
            resolver: address(this),
            isActive: true,
            registrationFee: 0,
            configHash: keccak256(abi.encode(methodConfigs["persona"]))
        });

        // Register key method
        methodConfigs["key"] = MethodConfig({
            minKeyLength: 32,
            maxKeyLength: 133,
            supportedCurves: new string[](3),
            requiresProof: false,
            allowsDelegation: false,
            maxDelegates: 0
        });
        methodConfigs["key"].supportedCurves[0] = "Ed25519";
        methodConfigs["key"].supportedCurves[1] = "secp256k1";
        methodConfigs["key"].supportedCurves[2] = "P-256";

        didMethods["key"] = DIDMethod({
            name: "key",
            schema: "{}",
            resolver: address(this),
            isActive: true,
            registrationFee: 0,
            configHash: keccak256(abi.encode(methodConfigs["key"]))
        });
    }

    /**
     * @dev Validate method-specific data
     */
    function _validateMethodSpecificData(
        string memory method,
        bytes memory data
    ) private view returns (bool) {
        if (data.length == 0) return true;
        
        MethodConfig memory config = methodConfigs[method];
        
        // Basic validation - would be expanded for each method
        if (data.length < config.minKeyLength || data.length > config.maxKeyLength) {
            return false;
        }
        
        return true;
    }

    /**
     * @dev Verify method transition proof
     */
    function _verifyMethodTransition(
        bytes32 didHash,
        string memory newMethod,
        bytes memory proof
    ) private view returns (bool) {
        // Implement method-specific transition validation
        // This would verify cryptographic proofs for method changes
        return proof.length > 0; // Placeholder
    }

    /**
     * @dev Parse DID string into method and identifier
     */
    function _parseDID(string memory did) private pure returns (string memory method, string memory identifier) {
        bytes memory didBytes = bytes(did);
        require(didBytes.length > 4, "Invalid DID format");
        
        // Find first colon after "did:"
        uint256 firstColon = 4; // Start after "did:"
        uint256 secondColon = 0;
        
        for (uint256 i = firstColon; i < didBytes.length; i++) {
            if (didBytes[i] == ':') {
                secondColon = i;
                break;
            }
        }
        
        require(secondColon > firstColon, "Invalid DID format");
        
        // Extract method
        bytes memory methodBytes = new bytes(secondColon - firstColon);
        for (uint256 i = 0; i < methodBytes.length; i++) {
            methodBytes[i] = didBytes[firstColon + i];
        }
        method = string(methodBytes);
        
        // Extract identifier
        bytes memory identifierBytes = new bytes(didBytes.length - secondColon - 1);
        for (uint256 i = 0; i < identifierBytes.length; i++) {
            identifierBytes[i] = didBytes[secondColon + 1 + i];
        }
        identifier = string(identifierBytes);
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