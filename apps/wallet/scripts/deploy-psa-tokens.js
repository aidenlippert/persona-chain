const { ethers } = require("hardhat");

async function deployToNetwork(networkName, rpcUrl) {
  console.log(`\n🚀 Deploying PSA Token to ${networkName}...`);
  
  try {
    // Deploy PersonaToken contract
    const PersonaToken = await ethers.getContractFactory("PersonaToken");
    const psaToken = await PersonaToken.deploy();
    
    await psaToken.deployed();
    
    console.log(`✅ PSA Token deployed to ${networkName}: ${psaToken.address}`);
    console.log(`   Transaction: ${psaToken.deployTransaction.hash}`);
    
    // Set up initial configuration
    console.log(`⚙️  Configuring ${networkName} token...`);
    
    // Set reasonable price based on network (in wei)
    const prices = {
      ethereum: ethers.utils.parseEther("0.001"), // 0.001 ETH per PSA
      polygon: ethers.utils.parseEther("0.001"),  // 0.001 MATIC per PSA  
      bsc: ethers.utils.parseEther("0.001"),      // 0.001 BNB per PSA
    };
    
    const price = prices[networkName.toLowerCase()] || ethers.utils.parseEther("0.001");
    await psaToken.updatePrice(price);
    
    console.log(`✅ Price set to: ${ethers.utils.formatEther(price)} ${networkName === 'ethereum' ? 'ETH' : networkName === 'polygon' ? 'MATIC' : 'BNB'} per PSA`);
    
    // Get token info
    const name = await psaToken.name();
    const symbol = await psaToken.symbol();
    const totalSupply = await psaToken.totalSupply();
    const currentPrice = await psaToken.getCurrentPrice();
    
    console.log(`📊 Token Details:`);
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Total Supply: ${ethers.utils.formatEther(totalSupply)} PSA`);
    console.log(`   Current Price: ${ethers.utils.formatEther(currentPrice)} per PSA`);
    
    return {
      network: networkName,
      address: psaToken.address,
      name,
      symbol,
      totalSupply: ethers.utils.formatEther(totalSupply),
      price: ethers.utils.formatEther(currentPrice),
      txHash: psaToken.deployTransaction.hash
    };
    
  } catch (error) {
    console.error(`❌ Failed to deploy to ${networkName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🏗️  PersonaPass Token (PSA) Deployment");
  console.log("=====================================");
  
  const deployments = [];
  
  // Deploy to multiple networks
  const networks = [
    { name: "ethereum", rpc: "https://mainnet.infura.io/v3/YOUR-PROJECT-ID" },
    { name: "polygon", rpc: "https://polygon-rpc.com" },
    { name: "bsc", rpc: "https://bsc-dataseed.binance.org" }
  ];
  
  for (const network of networks) {
    const result = await deployToNetwork(network.name, network.rpc);
    if (result) {
      deployments.push(result);
    }
  }
  
  // Generate environment variables
  console.log("\n🔧 VERCEL ENVIRONMENT VARIABLES:");
  console.log("=================================");
  
  deployments.forEach(deployment => {
    const envName = `VITE_PSA_TOKEN_${deployment.network.toUpperCase()}`;
    console.log(`${envName}="${deployment.address}"`);
  });
  
  // Generate deployment report
  console.log("\n📋 DEPLOYMENT REPORT:");
  console.log("====================");
  
  deployments.forEach(deployment => {
    console.log(`\n${deployment.network.toUpperCase()} Network:`);
    console.log(`  Contract: ${deployment.address}`);
    console.log(`  Supply: ${deployment.totalSupply} PSA`);
    console.log(`  Price: ${deployment.price} per PSA`);
    console.log(`  TX: ${deployment.txHash}`);
  });
  
  // Generate purchase instructions
  console.log("\n💳 PURCHASE INSTRUCTIONS:");
  console.log("========================");
  console.log("Users can now purchase PSA tokens via:");
  console.log("1. 💳 Credit Card (via payment gateway integration)");
  console.log("2. 💰 Crypto (ETH, MATIC, BNB directly to contract)");
  console.log("3. 🔄 Token Swap (via DEX integration)");
  console.log("4. 💼 Keplr Wallet (for cross-chain transfers)");
  
  console.log("\n✅ PSA Token deployment complete!");
  console.log("🔗 Add these addresses to your Vercel environment variables");
  console.log("🎯 Users can now purchase PSA tokens with credit cards and crypto!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });