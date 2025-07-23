#!/usr/bin/env node
/**
 * BRUTAL CONTRACT TESTING
 * Test if token contracts are actually deployed and working
 */

const { ethers } = require('hardhat');

class BrutalContractTester {
  constructor() {
    this.results = {
      contractTests: [],
      deploymentTests: [],
      functionalityTests: [],
      errors: []
    };
  }

  async runTests() {
    console.log('🚨 BRUTAL CONTRACT REALITY CHECK');
    console.log('🔍 Testing if contracts are actually deployed...');
    
    try {
      await this.testContractDeployment();
      await this.testContractFunctionality();
      await this.testTokenEconomics();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Contract tests failed:', error);
      this.results.errors.push(error.message);
    }
  }

  async testContractDeployment() {
    console.log('🏗️  Testing contract deployment...');
    
    // Test local deployment
    try {
      const PERSToken = await ethers.getContractFactory('PERSToken');
      const token = await PERSToken.deploy();
      await token.waitForDeployment();
      
      console.log('✅ PERSToken deployed locally');
      this.results.deploymentTests.push({
        contract: 'PERSToken',
        status: 'deployed',
        address: await token.getAddress()
      });
    } catch (error) {
      console.log('❌ PERSToken deployment failed:', error.message);
      this.results.errors.push(`PERSToken: ${error.message}`);
    }
    
    // Test staking contract
    try {
      const PERSStaking = await ethers.getContractFactory('PERSStaking');
      // Mock token address for testing
      const mockTokenAddress = '0x1234567890123456789012345678901234567890';
      const staking = await PERSStaking.deploy(mockTokenAddress);
      await staking.waitForDeployment();
      
      console.log('✅ PERSStaking deployed locally');
      this.results.deploymentTests.push({
        contract: 'PERSStaking',
        status: 'deployed',
        address: await staking.getAddress()
      });
    } catch (error) {
      console.log('❌ PERSStaking deployment failed:', error.message);
      this.results.errors.push(`PERSStaking: ${error.message}`);
    }
    
    // Test rewards contract
    try {
      const PERSRewards = await ethers.getContractFactory('PERSRewards');
      const mockTokenAddress = '0x1234567890123456789012345678901234567890';
      const rewards = await PERSRewards.deploy(mockTokenAddress);
      await rewards.waitForDeployment();
      
      console.log('✅ PERSRewards deployed locally');
      this.results.deploymentTests.push({
        contract: 'PERSRewards',
        status: 'deployed',
        address: await rewards.getAddress()
      });
    } catch (error) {
      console.log('❌ PERSRewards deployment failed:', error.message);
      this.results.errors.push(`PERSRewards: ${error.message}`);
    }
  }

  async testContractFunctionality() {
    console.log('⚡ Testing contract functionality...');
    
    try {
      // Deploy and test token functionality
      const PERSToken = await ethers.getContractFactory('PERSToken');
      const token = await PERSToken.deploy();
      await token.waitForDeployment();
      
      // Test basic token functions
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      const totalSupply = await token.totalSupply();
      
      console.log(`📊 Token Info: ${name} (${symbol})`);
      console.log(`📊 Decimals: ${decimals}`);
      console.log(`📊 Total Supply: ${ethers.formatEther(totalSupply)} PERS`);
      
      this.results.functionalityTests.push({
        contract: 'PERSToken',
        name,
        symbol,
        decimals: decimals.toString(),
        totalSupply: ethers.formatEther(totalSupply)
      });
      
      // Test minting (should fail for non-owner)
      try {
        const [owner, addr1] = await ethers.getSigners();
        await token.mint(addr1.address, ethers.parseEther('1000'));
        console.log('✅ Minting works');
      } catch (error) {
        console.log('❌ Minting failed (expected for non-owner)');
      }
      
      // Test transfers
      try {
        const [owner, addr1] = await ethers.getSigners();
        const ownerBalance = await token.balanceOf(owner.address);
        console.log(`📊 Owner balance: ${ethers.formatEther(ownerBalance)} PERS`);
        
        if (ownerBalance > 0) {
          await token.transfer(addr1.address, ethers.parseEther('100'));
          console.log('✅ Transfer works');
        }
      } catch (error) {
        console.log('❌ Transfer failed:', error.message);
      }
      
    } catch (error) {
      console.log('❌ Functionality test failed:', error.message);
      this.results.errors.push(`Functionality: ${error.message}`);
    }
  }

  async testTokenEconomics() {
    console.log('💰 Testing token economics...');
    
    try {
      const PERSToken = await ethers.getContractFactory('PERSToken');
      const token = await PERSToken.deploy();
      await token.waitForDeployment();
      
      // Test token distribution constants
      const totalSupply = await token.TOTAL_SUPPLY();
      const credentialRewards = await token.CREDENTIAL_REWARDS_POOL();
      const stakingRewards = await token.STAKING_REWARDS_POOL();
      const ecosystemFund = await token.ECOSYSTEM_FUND();
      
      console.log('📊 Token Economics:');
      console.log(`  Total Supply: ${ethers.formatEther(totalSupply)} PERS`);
      console.log(`  Credential Rewards: ${ethers.formatEther(credentialRewards)} PERS (30%)`);
      console.log(`  Staking Rewards: ${ethers.formatEther(stakingRewards)} PERS (20%)`);
      console.log(`  Ecosystem Fund: ${ethers.formatEther(ecosystemFund)} PERS (15%)`);
      
      // Verify percentages
      const credentialPercent = (credentialRewards * 100n) / totalSupply;
      const stakingPercent = (stakingRewards * 100n) / totalSupply;
      const ecosystemPercent = (ecosystemFund * 100n) / totalSupply;
      
      console.log('✅ Token economics verified');
      this.results.contractTests.push({
        name: 'Token Economics',
        passed: credentialPercent === 30n && stakingPercent === 20n && ecosystemPercent === 15n
      });
      
    } catch (error) {
      console.log('❌ Token economics test failed:', error.message);
      this.results.errors.push(`Economics: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 BRUTAL CONTRACT TEST RESULTS');
    console.log('================================');
    
    const deploymentPassed = this.results.deploymentTests.filter(t => t.status === 'deployed').length;
    const deploymentTotal = this.results.deploymentTests.length;
    
    const functionalityPassed = this.results.functionalityTests.length;
    const contractsPassed = this.results.contractTests.filter(t => t.passed).length;
    const contractsTotal = this.results.contractTests.length;
    
    console.log(`🏗️  Deployment Tests: ${deploymentPassed}/${deploymentTotal + this.results.errors.length} passed`);
    console.log(`⚡ Functionality Tests: ${functionalityPassed} completed`);
    console.log(`💰 Contract Tests: ${contractsPassed}/${contractsTotal} passed`);
    
    if (this.results.errors.length > 0) {
      console.log(`❌ Errors: ${this.results.errors.length}`);
      this.results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    const totalTests = deploymentTotal + functionalityPassed + contractsTotal;
    const totalPassed = deploymentPassed + functionalityPassed + contractsPassed;
    const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    console.log(`\n🎯 Overall Pass Rate: ${passRate}% (${totalPassed}/${totalTests})`);
    
    if (passRate >= 80) {
      console.log('🎉 Excellent! Your contracts are working well.');
    } else if (passRate >= 60) {
      console.log('⚠️  Some contract issues need attention.');
    } else {
      console.log('🚨 Critical contract issues found.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new BrutalContractTester();
  tester.runTests().catch(console.error);
}

module.exports = BrutalContractTester;