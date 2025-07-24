/**
 * PersonaPass Smart Contract Deployment Script
 * Deploys PERS Token, Credential Registry, and ZK Verifier to Ethereum/Polygon
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting PersonaPass contract deployment...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy PERS Token
  console.log("\n1️⃣ Deploying PERS Token...");
  const PERSToken = await ethers.getContractFactory("PERSToken");
  const persToken = await PERSToken.deploy();
  await persToken.deployed();
  console.log("✅ PERS Token deployed to:", persToken.address);

  // Deploy Credential Registry
  console.log("\n2️⃣ Deploying Credential Registry...");
  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy();
  await credentialRegistry.deployed();
  console.log("✅ Credential Registry deployed to:", credentialRegistry.address);

  // Deploy ZK Proof Verifier
  console.log("\n3️⃣ Deploying ZK Proof Verifier...");
  const ZKProofVerifier = await ethers.getContractFactory("ZKProofVerifier");
  const zkVerifier = await ZKProofVerifier.deploy();
  await zkVerifier.deployed();
  console.log("✅ ZK Proof Verifier deployed to:", zkVerifier.address);

  // Save deployment addresses
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deploymentTimestamp: new Date().toISOString(),
    contracts: {
      PERSToken: {
        address: persToken.address,
        deployer: deployer.address
      },
      CredentialRegistry: {
        address: credentialRegistry.address,
        deployer: deployer.address
      },
      ZKProofVerifier: {
        address: zkVerifier.address,
        deployer: deployer.address
      }
    }
  };

  // Save deployment info
  const deploymentPath = path.join(__dirname, "../deployments", `${network.name}-deployment.json`);
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));

  // Export ABIs for frontend
  await exportABIs();

  console.log("\n🎉 Deployment complete!");
  console.log("📄 Deployment data saved to:", deploymentPath);

  // Verify contracts on Etherscan/Polygonscan if not local
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔍 Verifying contracts on block explorer...");
    await verifyContracts(persToken.address, credentialRegistry.address, zkVerifier.address);
  }
}

async function exportABIs() {
  console.log("\n📤 Exporting ABIs for frontend...");

  const contracts = ["PERSToken", "CredentialRegistry", "ZKProofVerifier"];
  const abiDir = path.join(__dirname, "../../apps/wallet/src/contracts/abi");

  // Create directory if it doesn't exist
  fs.mkdirSync(abiDir, { recursive: true });

  for (const contractName of contracts) {
    const artifact = await artifacts.readArtifact(contractName);
    const abiPath = path.join(abiDir, `${contractName}.json`);
    
    // Save just the ABI (not the entire artifact)
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`✅ Exported ${contractName} ABI to ${abiPath}`);
  }
}

async function verifyContracts(tokenAddress, registryAddress, verifierAddress) {
  try {
    // Verify PERS Token
    await run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [],
    });

    // Verify Credential Registry
    await run("verify:verify", {
      address: registryAddress,
      constructorArguments: [],
    });

    // Verify ZK Verifier
    await run("verify:verify", {
      address: verifierAddress,
      constructorArguments: [],
    });

    console.log("✅ All contracts verified successfully!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });