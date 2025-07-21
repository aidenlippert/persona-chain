/**
 * PersonaPass DID Registry Contract Tests
 * Comprehensive test suite for DID and credential management
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DIDRegistry", function () {
  // Test fixtures
  async function deployDIDRegistryFixture() {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    const didRegistry = await DIDRegistry.deploy();
    await didRegistry.deployed();
    
    return { didRegistry, owner, addr1, addr2, addr3 };
  }
  
  // Test data
  const testDID1 = "did:key:z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8r";
  const testDID2 = "did:key:z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8s";
  const testDID3 = "did:key:z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8t";
  
  const testDocument1 = JSON.stringify({
    "@context": ["https://www.w3.org/ns/did/v1"],
    "id": testDID1,
    "verificationMethod": [{
      "id": `${testDID1}#key-1`,
      "type": "Ed25519VerificationKey2020",
      "controller": testDID1,
      "publicKeyMultibase": "z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8r"
    }]
  });
  
  const testDocument2 = JSON.stringify({
    "@context": ["https://www.w3.org/ns/did/v1"],
    "id": testDID2,
    "verificationMethod": [{
      "id": `${testDID2}#key-1`,
      "type": "Ed25519VerificationKey2020",
      "controller": testDID2,
      "publicKeyMultibase": "z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8s"
    }]
  });
  
  const testCredentialId1 = "urn:uuid:test-credential-123";
  const testCredentialId2 = "urn:uuid:test-credential-456";
  
  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { didRegistry, owner } = await loadFixture(deployDIDRegistryFixture);
      
      expect(await didRegistry.owner()).to.equal(owner.address);
      expect(await didRegistry.version()).to.equal("1.0.0");
      expect(await didRegistry.paused()).to.be.false;
    });
  });
  
  describe("DID Registration", function () {
    it("Should register a new DID successfully", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await expect(didRegistry.connect(addr1).registerDID(testDID1, testDocument1))
        .to.emit(didRegistry, "DIDRegistered")
        .withArgs(testDID1, addr1.address, anyValue, anyValue);
      
      // Verify DID was registered
      const [document, created, updated, isActive, nonce] = await didRegistry.getDIDDocument(testDID1);
      expect(document).to.equal(testDocument1);
      expect(isActive).to.be.true;
      expect(nonce).to.equal(0);
      expect(created).to.be.gt(0);
      expect(updated).to.equal(created);
    });
    
    it("Should not allow duplicate DID registration", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      await expect(didRegistry.connect(addr1).registerDID(testDID1, testDocument1))
        .to.be.revertedWith("DIDRegistry: DID already exists");
    });
    
    it("Should not allow empty DID", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await expect(didRegistry.connect(addr1).registerDID("", testDocument1))
        .to.be.revertedWith("DIDRegistry: Invalid DID");
    });
    
    it("Should not allow empty document", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await expect(didRegistry.connect(addr1).registerDID(testDID1, ""))
        .to.be.revertedWith("DIDRegistry: Invalid document");
    });
    
    it("Should track controller correctly", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      expect(await didRegistry.didControllers(testDID1)).to.equal(addr1.address);
      
      const controllerDIDs = await didRegistry.getControllerDIDs(addr1.address);
      expect(controllerDIDs).to.have.lengthOf(1);
      expect(controllerDIDs[0]).to.equal(testDID1);
    });
  });
  
  describe("DID Updates", function () {
    it("Should update DID document successfully", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const updatedDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        "id": testDID1,
        "verificationMethod": [{
          "id": `${testDID1}#key-1`,
          "type": "Ed25519VerificationKey2020",
          "controller": testDID1,
          "publicKeyMultibase": "z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8r"
        }],
        "service": [{
          "id": `${testDID1}#service-1`,
          "type": "PersonaPassService",
          "serviceEndpoint": "https://personapass.xyz"
        }]
      });
      
      await expect(didRegistry.connect(addr1).updateDID(testDID1, updatedDocument, 1))
        .to.emit(didRegistry, "DIDUpdated")
        .withArgs(testDID1, addr1.address, anyValue, anyValue, 1);
      
      const [document, created, updated, isActive, nonce] = await didRegistry.getDIDDocument(testDID1);
      expect(document).to.equal(updatedDocument);
      expect(isActive).to.be.true;
      expect(nonce).to.equal(1);
      expect(updated).to.be.gt(created);
    });
    
    it("Should not allow unauthorized DID updates", async function () {
      const { didRegistry, addr1, addr2 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      await expect(didRegistry.connect(addr2).updateDID(testDID1, testDocument1, 1))
        .to.be.revertedWith("DIDRegistry: Not authorized controller");
    });
    
    it("Should not allow updates with invalid nonce", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      await expect(didRegistry.connect(addr1).updateDID(testDID1, testDocument1, 2))
        .to.be.revertedWith("DIDRegistry: Invalid nonce");
    });
    
    it("Should not allow updates to non-existent DID", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await expect(didRegistry.connect(addr1).updateDID(testDID1, testDocument1, 1))
        .to.be.revertedWith("DIDRegistry: DID does not exist");
    });
  });
  
  describe("DID Revocation", function () {
    it("Should revoke DID successfully", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      await expect(didRegistry.connect(addr1).revokeDID(testDID1))
        .to.emit(didRegistry, "DIDRevoked")
        .withArgs(testDID1, addr1.address, anyValue, anyValue);
      
      const [document, created, updated, isActive, nonce] = await didRegistry.getDIDDocument(testDID1);
      expect(isActive).to.be.false;
      expect(updated).to.be.gt(created);
    });
    
    it("Should not allow unauthorized DID revocation", async function () {
      const { didRegistry, addr1, addr2 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      await expect(didRegistry.connect(addr2).revokeDID(testDID1))
        .to.be.revertedWith("DIDRegistry: Not authorized controller");
    });
    
    it("Should not allow revocation of non-existent DID", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await expect(didRegistry.connect(addr1).revokeDID(testDID1))
        .to.be.revertedWith("DIDRegistry: DID does not exist");
    });
    
    it("Should not allow operations on revoked DID", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      await didRegistry.connect(addr1).revokeDID(testDID1);
      
      await expect(didRegistry.connect(addr1).updateDID(testDID1, testDocument1, 1))
        .to.be.revertedWith("DIDRegistry: DID is not active");
    });
  });
  
  describe("DID Resolution", function () {
    it("Should resolve DID document correctly", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const [document, created, updated, isActive, nonce] = await didRegistry.getDIDDocument(testDID1);
      expect(document).to.equal(testDocument1);
      expect(isActive).to.be.true;
      expect(nonce).to.equal(0);
      expect(created).to.be.gt(0);
      expect(updated).to.equal(created);
    });
    
    it("Should check DID active status correctly", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      expect(await didRegistry.isDIDActive(testDID1)).to.be.false;
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      expect(await didRegistry.isDIDActive(testDID1)).to.be.true;
      
      await didRegistry.connect(addr1).revokeDID(testDID1);
      expect(await didRegistry.isDIDActive(testDID1)).to.be.false;
    });
    
    it("Should not resolve non-existent DID", async function () {
      const { didRegistry } = await loadFixture(deployDIDRegistryFixture);
      
      await expect(didRegistry.getDIDDocument(testDID1))
        .to.be.revertedWith("DIDRegistry: DID does not exist");
    });
  });
  
  describe("Credential Registration", function () {
    it("Should register credential successfully", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      
      await expect(didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      ))
        .to.emit(didRegistry, "CredentialRegistered")
        .withArgs(testCredentialId1, testDID1, testDID2, schemaHash, commitmentHash, anyValue, anyValue);
      
      const [issuer, subject, returnedSchemaHash, returnedCommitmentHash, created, expiresAt] = 
        await didRegistry.getCredentialDetails(testCredentialId1);
      
      expect(issuer).to.equal(testDID1);
      expect(subject).to.equal(testDID2);
      expect(returnedSchemaHash).to.equal(schemaHash);
      expect(returnedCommitmentHash).to.equal(commitmentHash);
      expect(created).to.be.gt(0);
      expect(expiresAt).to.equal(0);
    });
    
    it("Should not allow duplicate credential registration", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      
      await didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      );
      
      await expect(didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      ))
        .to.be.revertedWith("DIDRegistry: Credential already exists");
    });
    
    it("Should not allow unauthorized credential registration", async function () {
      const { didRegistry, addr1, addr2 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      
      await expect(didRegistry.connect(addr2).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      ))
        .to.be.revertedWith("DIDRegistry: Not authorized controller");
    });
    
    it("Should handle credential expiration", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      await didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        expiresAt
      );
      
      const [exists, isRevoked, revocationReason, isExpired] = 
        await didRegistry.getCredentialStatus(testCredentialId1);
      
      expect(exists).to.be.true;
      expect(isRevoked).to.be.false;
      expect(isExpired).to.be.false;
      expect(revocationReason).to.equal("");
    });
  });
  
  describe("Credential Revocation", function () {
    it("Should revoke credential successfully", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      
      await didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      );
      
      const revocationReason = "Credential compromised";
      
      await expect(didRegistry.connect(addr1).revokeCredential(testCredentialId1, revocationReason))
        .to.emit(didRegistry, "CredentialRevoked")
        .withArgs(testCredentialId1, testDID1, revocationReason, anyValue, anyValue);
      
      const [exists, isRevoked, returnedReason, isExpired] = 
        await didRegistry.getCredentialStatus(testCredentialId1);
      
      expect(exists).to.be.true;
      expect(isRevoked).to.be.true;
      expect(returnedReason).to.equal(revocationReason);
      expect(isExpired).to.be.false;
    });
    
    it("Should not allow unauthorized credential revocation", async function () {
      const { didRegistry, addr1, addr2 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      
      await didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      );
      
      await expect(didRegistry.connect(addr2).revokeCredential(testCredentialId1, "test"))
        .to.be.revertedWith("DIDRegistry: Not authorized to revoke");
    });
    
    it("Should not allow revocation of non-existent credential", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await expect(didRegistry.connect(addr1).revokeCredential(testCredentialId1, "test"))
        .to.be.revertedWith("DIDRegistry: Credential does not exist");
    });
    
    it("Should not allow double revocation", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      
      await didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      );
      
      await didRegistry.connect(addr1).revokeCredential(testCredentialId1, "test");
      
      await expect(didRegistry.connect(addr1).revokeCredential(testCredentialId1, "test"))
        .to.be.revertedWith("DIDRegistry: Credential already revoked");
    });
  });
  
  describe("Credential Status", function () {
    it("Should return correct status for valid credential", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      
      await didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      );
      
      const [exists, isRevoked, revocationReason, isExpired] = 
        await didRegistry.getCredentialStatus(testCredentialId1);
      
      expect(exists).to.be.true;
      expect(isRevoked).to.be.false;
      expect(revocationReason).to.equal("");
      expect(isExpired).to.be.false;
    });
    
    it("Should return correct status for non-existent credential", async function () {
      const { didRegistry } = await loadFixture(deployDIDRegistryFixture);
      
      const [exists, isRevoked, revocationReason, isExpired] = 
        await didRegistry.getCredentialStatus(testCredentialId1);
      
      expect(exists).to.be.false;
      expect(isRevoked).to.be.false;
      expect(revocationReason).to.equal("");
      expect(isExpired).to.be.false;
    });
  });
  
  describe("Access Control", function () {
    it("Should allow only owner to pause/unpause", async function () {
      const { didRegistry, owner, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await expect(didRegistry.connect(addr1).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      await didRegistry.connect(owner).pause();
      expect(await didRegistry.paused()).to.be.true;
      
      await didRegistry.connect(owner).unpause();
      expect(await didRegistry.paused()).to.be.false;
    });
    
    it("Should prevent operations when paused", async function () {
      const { didRegistry, owner, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(owner).pause();
      
      await expect(didRegistry.connect(addr1).registerDID(testDID1, testDocument1))
        .to.be.revertedWith("Pausable: paused");
    });
  });
  
  describe("Gas Optimization", function () {
    it("Should use reasonable gas for DID registration", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      const tx = await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.lt(200000); // Should use less than 200k gas
    });
    
    it("Should use reasonable gas for credential registration", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
      const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      
      const tx = await didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash,
        commitmentHash,
        0
      );
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.lt(150000); // Should use less than 150k gas
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle very long DID documents", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      const longDocument = JSON.stringify({
        "@context": ["https://www.w3.org/ns/did/v1"],
        "id": testDID1,
        "verificationMethod": Array.from({length: 10}, (_, i) => ({
          "id": `${testDID1}#key-${i}`,
          "type": "Ed25519VerificationKey2020",
          "controller": testDID1,
          "publicKeyMultibase": `z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8${i}`
        }))
      });
      
      await expect(didRegistry.connect(addr1).registerDID(testDID1, longDocument))
        .to.not.be.reverted;
      
      const [document] = await didRegistry.getDIDDocument(testDID1);
      expect(document).to.equal(longDocument);
    });
    
    it("Should handle multiple credentials per DID", async function () {
      const { didRegistry, addr1 } = await loadFixture(deployDIDRegistryFixture);
      
      await didRegistry.connect(addr1).registerDID(testDID1, testDocument1);
      
      const schemaHash1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential1"));
      const commitmentHash1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment-1"));
      
      const schemaHash2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential2"));
      const commitmentHash2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment-2"));
      
      await didRegistry.connect(addr1).registerCredential(
        testCredentialId1,
        testDID1,
        testDID2,
        schemaHash1,
        commitmentHash1,
        0
      );
      
      await didRegistry.connect(addr1).registerCredential(
        testCredentialId2,
        testDID1,
        testDID2,
        schemaHash2,
        commitmentHash2,
        0
      );
      
      const [exists1] = await didRegistry.getCredentialStatus(testCredentialId1);
      const [exists2] = await didRegistry.getCredentialStatus(testCredentialId2);
      
      expect(exists1).to.be.true;
      expect(exists2).to.be.true;
    });
  });
});

// Helper function for testing event arguments
function anyValue() {
  return {
    asymmetricMatch: () => true,
    toString: () => "any value"
  };
}