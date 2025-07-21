/**
 * PersonaPass Smart Contract Deployment Script
 * Deploys DID Registry and related contracts
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting PersonaPass smart contract deployment...");
  
  // Get deployment configuration
  const network = await ethers.getDefaultProvider().getNetwork();
  const [deployer] = await ethers.getSigners();
  
  console.log("📊 Deployment Configuration:");
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  // Deploy DID Registry
  console.log("\n📜 Deploying DID Registry...");
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy();
  await didRegistry.deployed();
  
  console.log(`✅ DID Registry deployed at: ${didRegistry.address}`);
  console.log(`📊 Transaction hash: ${didRegistry.deployTransaction.hash}`);
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const version = await didRegistry.version();
  const owner = await didRegistry.owner();
  
  console.log(`Contract version: ${version}`);
  console.log(`Contract owner: ${owner}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    contracts: {
      DIDRegistry: {
        address: didRegistry.address,
        txHash: didRegistry.deployTransaction.hash,
        deployedAt: new Date().toISOString()
      }
    },
    gasUsed: {
      DIDRegistry: didRegistry.deployTransaction.gasLimit?.toString() || "0"
    }
  };
  
  // Write deployment info to file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${network.name}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
  
  // Generate TypeScript types
  console.log("\n📝 Generating TypeScript types...");
  await generateTypes(didRegistry);
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  await testBasicFunctionality(didRegistry);
  
  console.log("\n✅ Deployment completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Update blockchain configuration in PersonaPass wallet");
  console.log("2. Initialize blockchain persistence service");
  console.log("3. Test DID registration and credential management");
  console.log("4. Deploy to mainnet when ready");
}

async function generateTypes(didRegistry) {
  const typeDefinitions = `
// Auto-generated TypeScript types for PersonaPass smart contracts
// Generated at: ${new Date().toISOString()}

export interface DIDRegistryContract {
  address: string;
  abi: any[];
  chainId: number;
  network: string;
}

export interface DeploymentInfo {
  network: string;
  chainId: number;
  deployer: string;
  contracts: {
    DIDRegistry: {
      address: string;
      txHash: string;
      deployedAt: string;
    };
  };
  gasUsed: {
    DIDRegistry: string;
  };
}

export const DID_REGISTRY_ADDRESS = "${didRegistry.address}";
export const DID_REGISTRY_ABI = ${JSON.stringify(didRegistry.interface.fragments.map(f => f.format()), null, 2)};
`;
  
  const typesDir = path.join(__dirname, "..", "types");
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(typesDir, "contracts.ts"),
    typeDefinitions
  );
  
  console.log("✅ TypeScript types generated");
}

async function testBasicFunctionality(didRegistry) {
  try {
    // Test DID registration
    const testDID = "did:key:z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8r";
    const testDocument = JSON.stringify({
      "@context": ["https://www.w3.org/ns/did/v1"],
      "id": testDID,
      "verificationMethod": [{
        "id": `${testDID}#key-1`,
        "type": "Ed25519VerificationKey2020",
        "controller": testDID,
        "publicKeyMultibase": "z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8r"
      }]
    });
    
    console.log("🧪 Testing DID registration...");
    const registerTx = await didRegistry.registerDID(testDID, testDocument);
    await registerTx.wait();
    
    console.log("✅ DID registration test passed");
    
    // Test DID resolution
    console.log("🧪 Testing DID resolution...");
    const [document, created, updated, isActive] = await didRegistry.getDIDDocument(testDID);
    
    console.log(`📄 Retrieved document length: ${document.length}`);
    console.log(`📅 Created: ${new Date(created * 1000).toISOString()}`);
    console.log(`🔄 Updated: ${new Date(updated * 1000).toISOString()}`);
    console.log(`✅ Active: ${isActive}`);
    
    // Test credential registration
    console.log("🧪 Testing credential registration...");
    const credentialId = "urn:uuid:test-credential-123";
    const issuerDID = testDID;
    const subjectDID = "did:key:z6MkjjCpsoQrwnEmqHzLdxWowXk5gjbwor4urC1RPDmGeV8s";
    const schemaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TestCredential"));
    const commitmentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
    
    const registerCredTx = await didRegistry.registerCredential(
      credentialId,
      issuerDID,
      subjectDID,
      schemaHash,
      commitmentHash,
      0 // No expiration
    );
    await registerCredTx.wait();
    
    console.log("✅ Credential registration test passed");
    
    // Test credential status
    console.log("🧪 Testing credential status...");
    const [exists, isRevoked, revocationReason, isExpired] = await didRegistry.getCredentialStatus(credentialId);
    
    console.log(`📄 Exists: ${exists}`);
    console.log(`❌ Revoked: ${isRevoked}`);
    console.log(`⏰ Expired: ${isExpired}`);
    
    console.log("✅ All tests passed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });