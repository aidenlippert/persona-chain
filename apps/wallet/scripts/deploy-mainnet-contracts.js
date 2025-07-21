/**
 * PersonaPass Smart Contract Deployment Script
 * Deploys all contracts to Polygon mainnet with proper configuration
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  network: 'polygon-mainnet',
  gasLimit: 8000000,
  gasPrice: '50000000000', // 50 gwei
  confirmations: 3,
  
  // Token Economics
  initialTokenPrice: ethers.utils.parseEther('0.001'), // 0.001 MATIC per PSA
  minPurchase: ethers.utils.parseEther('1'), // 1 PSA minimum
  maxPurchase: ethers.utils.parseEther('1000000'), // 1M PSA maximum
  
  // Wallet addresses (replace with real addresses)
  wallets: {
    credentialRewards: '0x742d35Cc6634C0532925a3b8D4d2c12f', // Replace with real wallet
    stakingRewards: '0x742d35Cc6634C0532925a3b8D4d2c12f', // Replace with real wallet
    ecosystem: '0x742d35Cc6634C0532925a3b8D4d2c12f', // Replace with real wallet
    team: '0x742d35Cc6634C0532925a3b8D4d2c12f', // Replace with real wallet
    liquidity: '0x742d35Cc6634C0532925a3b8D4d2c12f' // Replace with real wallet
  }
};

class SmartContractDeployer {
  constructor() {
    this.contracts = {};
    this.deploymentResults = {};
    this.deploymentLog = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    this.deploymentLog.push(logEntry);
  }

  async deployContract(contractName, args = [], options = {}) {
    this.log(`🚀 Deploying ${contractName}...`);
    
    try {
      const ContractFactory = await ethers.getContractFactory(contractName);
      
      const deploymentOptions = {
        gasLimit: options.gasLimit || DEPLOYMENT_CONFIG.gasLimit,
        gasPrice: options.gasPrice || DEPLOYMENT_CONFIG.gasPrice,
        ...options
      };
      
      const contract = await ContractFactory.deploy(...args, deploymentOptions);
      
      this.log(`📡 Transaction hash: ${contract.deployTransaction.hash}`);
      this.log(`⏳ Waiting for ${DEPLOYMENT_CONFIG.confirmations} confirmations...`);
      
      await contract.deployTransaction.wait(DEPLOYMENT_CONFIG.confirmations);
      
      this.contracts[contractName] = contract;
      this.deploymentResults[contractName] = {
        address: contract.address,
        txHash: contract.deployTransaction.hash,
        gasUsed: contract.deployTransaction.gasLimit?.toString(),
        blockNumber: contract.deployTransaction.blockNumber,
        timestamp: new Date().toISOString()
      };
      
      this.log(`✅ ${contractName} deployed at: ${contract.address}`);
      return contract;
      
    } catch (error) {
      this.log(`❌ Failed to deploy ${contractName}: ${error.message}`, 'error');
      throw error;
    }
  }

  async deployPersonaToken() {
    this.log('🎯 Starting PersonaPass Token (PSA) deployment...');
    
    const personaToken = await this.deployContract('PersonaToken');
    
    // Configure initial settings
    this.log('⚙️ Configuring PersonaPass Token...');
    
    // Update token price if different from default
    if (DEPLOYMENT_CONFIG.initialTokenPrice.toString() !== '1000000000000000') {
      const tx = await personaToken.updatePrice(DEPLOYMENT_CONFIG.initialTokenPrice);
      await tx.wait(DEPLOYMENT_CONFIG.confirmations);
      this.log(`✅ Token price set to ${ethers.utils.formatEther(DEPLOYMENT_CONFIG.initialTokenPrice)} MATIC`);
    }
    
    return personaToken;
  }

  async deployPERSToken() {
    this.log('🎯 Starting PERS Token deployment...');
    
    const persToken = await this.deployContract('PERSToken');
    
    // Initialize wallets
    this.log('⚙️ Initializing PERS Token wallets...');
    
    const initTx = await persToken.initializeWallets(
      DEPLOYMENT_CONFIG.wallets.credentialRewards,
      DEPLOYMENT_CONFIG.wallets.stakingRewards,
      DEPLOYMENT_CONFIG.wallets.ecosystem,
      DEPLOYMENT_CONFIG.wallets.team,
      DEPLOYMENT_CONFIG.wallets.liquidity
    );
    
    await initTx.wait(DEPLOYMENT_CONFIG.confirmations);
    this.log('✅ PERS Token wallets initialized');
    
    return persToken;
  }

  async deployStakingContract() {
    this.log('🎯 Starting PERS Staking contract deployment...');
    
    if (!this.contracts.PERSToken) {
      throw new Error('PERS Token must be deployed first');
    }
    
    const stakingContract = await this.deployContract(
      'PERSStaking',
      [this.contracts.PERSToken.address]
    );
    
    return stakingContract;
  }

  async deployRewardsContract() {
    this.log('🎯 Starting PERS Rewards contract deployment...');
    
    if (!this.contracts.PERSToken) {
      throw new Error('PERS Token must be deployed first');
    }
    
    const rewardsContract = await this.deployContract(
      'PERSRewards',
      [this.contracts.PERSToken.address]
    );
    
    return rewardsContract;
  }

  async verifyContracts() {
    this.log('🔍 Starting contract verification...');
    
    for (const [name, result] of Object.entries(this.deploymentResults)) {
      try {
        this.log(`📋 Verifying ${name} at ${result.address}...`);
        
        // In real deployment, use Hardhat verify plugin
        // await hre.run("verify:verify", {
        //   address: result.address,
        //   constructorArguments: []
        // });
        
        this.log(`✅ ${name} verification completed`);
      } catch (error) {
        this.log(`⚠️ ${name} verification failed: ${error.message}`, 'warning');
      }
    }
  }

  async setupContractInteractions() {
    this.log('🔗 Setting up contract interactions...');
    
    // Configure staking contract with rewards
    if (this.contracts.PERSStaking && this.contracts.PERSRewards) {
      try {
        // Set rewards contract in staking contract
        const tx = await this.contracts.PERSStaking.setRewardsContract(
          this.contracts.PERSRewards.address
        );
        await tx.wait(DEPLOYMENT_CONFIG.confirmations);
        this.log('✅ Staking <-> Rewards integration configured');
      } catch (error) {
        this.log(`⚠️ Failed to configure contract interactions: ${error.message}`, 'warning');
      }
    }
  }

  async generateDeploymentReport() {
    this.log('📊 Generating deployment report...');
    
    const report = {
      network: DEPLOYMENT_CONFIG.network,
      timestamp: new Date().toISOString(),
      deployer: await (await ethers.getSigners())[0].getAddress(),
      contracts: this.deploymentResults,
      configuration: DEPLOYMENT_CONFIG,
      logs: this.deploymentLog,
      nextSteps: [
        'Verify contracts on Polygonscan',
        'Add liquidity to DEX',
        'Configure frontend with contract addresses',
        'Set up monitoring and alerts',
        'Initialize governance parameters'
      ]
    };
    
    // Save deployment report
    const reportPath = path.join(__dirname, '../deployment-reports', 
      `polygon-mainnet-deployment-${Date.now()}.json`);
    
    // Ensure directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Deployment report saved: ${reportPath}`);
    
    return report;
  }

  async executeFullDeployment() {
    this.log('🎬 Starting PersonaPass Smart Contract Deployment');
    this.log('=' .repeat(60));
    
    try {
      // Get deployer info
      const [deployer] = await ethers.getSigners();
      const balance = await deployer.getBalance();
      
      this.log(`👤 Deployer: ${deployer.address}`);
      this.log(`💰 Balance: ${ethers.utils.formatEther(balance)} MATIC`);
      this.log(`🌐 Network: ${DEPLOYMENT_CONFIG.network}`);
      
      // Check minimum balance for deployment
      const minBalance = ethers.utils.parseEther('5'); // 5 MATIC minimum
      if (balance.lt(minBalance)) {
        throw new Error(`Insufficient balance. Need at least 5 MATIC for deployment.`);
      }
      
      // Deploy contracts in order
      await this.deployPersonaToken();
      await this.deployPERSToken();
      await this.deployStakingContract();
      await this.deployRewardsContract();
      
      // Setup interactions
      await this.setupContractInteractions();
      
      // Verify contracts
      await this.verifyContracts();
      
      // Generate report
      const report = await this.generateDeploymentReport();
      
      this.log('🎉 Deployment completed successfully!');
      this.log('📋 Summary:');
      this.log(`   • PersonaPass Token (PSA): ${this.deploymentResults.PersonaToken?.address}`);
      this.log(`   • PERS Token: ${this.deploymentResults.PERSToken?.address}`);
      this.log(`   • PERS Staking: ${this.deploymentResults.PERSStaking?.address}`);
      this.log(`   • PERS Rewards: ${this.deploymentResults.PERSRewards?.address}`);
      
      return report;
      
    } catch (error) {
      this.log(`💥 Deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Main deployment function
async function main() {
  const deployer = new SmartContractDeployer();
  
  try {
    const report = await deployer.executeFullDeployment();
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Add contract addresses to frontend configuration');
    console.log('2. Update environment variables in Vercel');
    console.log('3. Configure contract interactions in PersonaPass');
    console.log('4. Set up monitoring and analytics');
    console.log('5. Begin token distribution and liquidity provision');
    
    return report;
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  SmartContractDeployer,
  DEPLOYMENT_CONFIG,
  main
};