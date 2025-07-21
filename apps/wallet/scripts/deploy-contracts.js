#!/usr/bin/env node

/**
 * Contract Deployment Script
 * Deploys PERS token contracts to specified network
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Contract ABIs and bytecodes
const PERSTokenABI = require('../src/contracts/abi/PERSToken.json');
const PERSStakingABI = require('../src/contracts/abi/PERSStaking.json');
const PERSRewardsABI = require('../src/contracts/abi/PERSRewards.json');

const PERSTokenBytecode = require('../src/contracts/abi/PERSToken.bytecode.json');
const PERSStakingBytecode = require('../src/contracts/abi/PERSStaking.bytecode.json');
const PERSRewardsBytecode = require('../src/contracts/abi/PERSRewards.bytecode.json');

// Deployment configuration
const config = {
  network: process.env.VITE_DEFAULT_NETWORK || 'polygon',
  rpcUrl: process.env.VITE_RPC_URL || 'https://polygon-rpc.com',
  privateKey: process.env.DEPLOYER_PRIVATE_KEY,
  gasPrice: process.env.GAS_PRICE || '30000000000', // 30 gwei
  gasLimit: process.env.GAS_LIMIT || '8000000',
};

// Wallet addresses for token distribution
const walletAddresses = {
  credentialRewards: process.env.CREDENTIAL_REWARDS_WALLET,
  stakingRewards: process.env.STAKING_REWARDS_WALLET,
  ecosystem: process.env.ECOSYSTEM_WALLET,
  team: process.env.TEAM_WALLET,
  liquidity: process.env.LIQUIDITY_WALLET,
};

async function deployContracts() {
  try {
    console.log('🚀 Starting contract deployment...');
    console.log(`Network: ${config.network}`);
    console.log(`RPC URL: ${config.rpcUrl}`);
    
    // Validate configuration
    if (!config.privateKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY not set in environment');
    }
    
    for (const [name, address] of Object.entries(walletAddresses)) {
      if (!address) {
        throw new Error(`${name} wallet address not set in environment`);
      }
    }
    
    // Connect to network
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    
    console.log(`Deployer address: ${wallet.address}`);
    
    // Check deployer balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      throw new Error('Deployer has no balance');
    }
    
    // Deploy PERSToken
    console.log('\n📄 Deploying PERSToken...');
    const PERSTokenFactory = new ethers.ContractFactory(
      PERSTokenABI,
      PERSTokenBytecode.bytecode,
      wallet
    );
    
    const persToken = await PERSTokenFactory.deploy({
      gasPrice: config.gasPrice,
      gasLimit: config.gasLimit,
    });
    
    await persToken.waitForDeployment();
    const persTokenAddress = await persToken.getAddress();
    console.log(`✅ PERSToken deployed at: ${persTokenAddress}`);
    
    // Initialize wallets
    console.log('\n🏦 Initializing token distribution wallets...');
    const initTx = await persToken.initializeWallets(
      walletAddresses.credentialRewards,
      walletAddresses.stakingRewards,
      walletAddresses.ecosystem,
      walletAddresses.team,
      walletAddresses.liquidity,
      {
        gasPrice: config.gasPrice,
        gasLimit: '1000000',
      }
    );
    
    await initTx.wait();
    console.log('✅ Token distribution completed');
    
    // Deploy PERSStaking
    console.log('\n📄 Deploying PERSStaking...');
    const PERSStakingFactory = new ethers.ContractFactory(
      PERSStakingABI,
      PERSStakingBytecode.bytecode,
      wallet
    );
    
    const persStaking = await PERSStakingFactory.deploy(
      persTokenAddress,
      walletAddresses.stakingRewards,
      {
        gasPrice: config.gasPrice,
        gasLimit: config.gasLimit,
      }
    );
    
    await persStaking.waitForDeployment();
    const persStakingAddress = await persStaking.getAddress();
    console.log(`✅ PERSStaking deployed at: ${persStakingAddress}`);
    
    // Deploy PERSRewards
    console.log('\n📄 Deploying PERSRewards...');
    const PERSRewardsFactory = new ethers.ContractFactory(
      PERSRewardsABI,
      PERSRewardsBytecode.bytecode,
      wallet
    );
    
    const persRewards = await PERSRewardsFactory.deploy(
      persTokenAddress,
      walletAddresses.credentialRewards,
      {
        gasPrice: config.gasPrice,
        gasLimit: config.gasLimit,
      }
    );
    
    await persRewards.waitForDeployment();
    const persRewardsAddress = await persRewards.getAddress();
    console.log(`✅ PERSRewards deployed at: ${persRewardsAddress}`);
    
    // Save deployment addresses
    const deployment = {
      network: config.network,
      deployedAt: new Date().toISOString(),
      contracts: {
        PERSToken: persTokenAddress,
        PERSStaking: persStakingAddress,
        PERSRewards: persRewardsAddress,
      },
      wallets: walletAddresses,
      deployer: wallet.address,
    };
    
    const deploymentPath = path.join(__dirname, '..', 'deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);
    
    // Output environment variables
    console.log('\n🔧 Add these to your .env.local file:');
    console.log(`VITE_PERS_TOKEN_ADDRESS=${persTokenAddress}`);
    console.log(`VITE_PERS_STAKING_ADDRESS=${persStakingAddress}`);
    console.log(`VITE_PERS_REWARDS_ADDRESS=${persRewardsAddress}`);
    
    console.log('\n✅ Deployment completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
deployContracts();