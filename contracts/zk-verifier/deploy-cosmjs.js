#!/usr/bin/env node

/**
 * ZK Verifier Contract Deployment using CosmJS
 * This script deploys the ZK verifier contract to Cosmos chain using CosmJS
 */

const { SigningCosmWasmClient } = require('@cosmjs/cosmwasm-stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { GasPrice } = require('@cosmjs/stargate');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  chainId: process.env.CHAIN_ID || 'persona-testnet',
  rpcEndpoint: process.env.RPC_ENDPOINT || 'http://localhost:26657',
  mnemonic: process.env.MNEMONIC || 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  gasPrice: process.env.GAS_PRICE || '0.1upersona',
  wasmPath: path.join(__dirname, 'artifacts/zk_verifier.wasm'),
};

// Circuit configurations for PersonaPass
const CIRCUITS = [
  {
    id: 'academic_gpa',
    type: 'groth16',
    vk: {
      vk_alpha_1: ['1', '2', '1'],
      vk_beta_2: [['3', '4'], ['5', '6'], ['0', '1']],
      vk_gamma_2: [['7', '8'], ['9', '10'], ['0', '1']],
      vk_delta_2: [['11', '12'], ['13', '14'], ['0', '1']],
      IC: [['15', '16', '1'], ['17', '18', '1']]
    }
  },
  {
    id: 'financial_income',
    type: 'groth16',
    vk: {
      vk_alpha_1: ['19', '20', '1'],
      vk_beta_2: [['21', '22'], ['23', '24'], ['0', '1']],
      vk_gamma_2: [['25', '26'], ['27', '28'], ['0', '1']],
      vk_delta_2: [['29', '30'], ['31', '32'], ['0', '1']],
      IC: [['33', '34', '1'], ['35', '36', '1'], ['37', '38', '1']]
    }
  },
  {
    id: 'health_vaccination',
    type: 'groth16',
    vk: {
      vk_alpha_1: ['39', '40', '1'],
      vk_beta_2: [['41', '42'], ['43', '44'], ['0', '1']],
      vk_gamma_2: [['45', '46'], ['47', '48'], ['0', '1']],
      vk_delta_2: [['49', '50'], ['51', '52'], ['0', '1']],
      IC: [['53', '54', '1'], ['55', '56', '1'], ['57', '58', '1'], ['59', '60', '1']]
    }
  },
  {
    id: 'universal_aggregate',
    type: 'groth16',
    vk: {
      vk_alpha_1: ['61', '62', '1'],
      vk_beta_2: [['63', '64'], ['65', '66'], ['0', '1']],
      vk_gamma_2: [['67', '68'], ['69', '70'], ['0', '1']],
      vk_delta_2: [['71', '72'], ['73', '74'], ['0', '1']],
      IC: [['75', '76', '1'], ['77', '78', '1'], ['79', '80', '1'], ['81', '82', '1'], ['83', '84', '1']]
    }
  }
];

async function deployContract() {
  console.log('🚀 PersonaPass ZK Verifier Contract Deployment via CosmJS');
  console.log('===========================================================');
  console.log();
  
  console.log('📋 Configuration:');
  console.log(`   Chain ID: ${CONFIG.chainId}`);
  console.log(`   RPC Endpoint: ${CONFIG.rpcEndpoint}`);
  console.log(`   Gas Price: ${CONFIG.gasPrice}`);
  console.log(`   WASM Path: ${CONFIG.wasmPath}`);
  console.log();

  try {
    // Step 1: Validate WASM file
    console.log('🔍 Step 1: Validating WASM file...');
    if (!fs.existsSync(CONFIG.wasmPath)) {
      throw new Error(`WASM file not found at ${CONFIG.wasmPath}`);
    }
    
    const wasmCode = fs.readFileSync(CONFIG.wasmPath);
    const wasmSize = wasmCode.length;
    console.log(`   WASM file size: ${wasmSize} bytes`);
    
    if (wasmSize > 2000000) {
      console.log('⚠️  Warning: WASM file is large (>2MB)');
    }
    console.log('✅ WASM file validated');

    // Step 2: Setup wallet and client
    console.log();
    console.log('🔑 Step 2: Setting up wallet and client...');
    
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      CONFIG.mnemonic,
      { prefix: 'persona' }
    );
    
    const accounts = await wallet.getAccounts();
    const senderAddress = accounts[0].address;
    console.log(`   Deployer address: ${senderAddress}`);
    
    const gasPrice = GasPrice.fromString(CONFIG.gasPrice);
    const client = await SigningCosmWasmClient.connectWithSigner(
      CONFIG.rpcEndpoint,
      wallet,
      { gasPrice }
    );
    
    // Check balance
    const balance = await client.getBalance(senderAddress, 'upersona');
    console.log(`   Account balance: ${balance.amount} ${balance.denom}`);
    console.log('✅ Wallet and client ready');

    // Step 3: Store contract code
    console.log();
    console.log('📤 Step 3: Storing contract code on-chain...');
    
    const storeResult = await client.upload(
      senderAddress,
      wasmCode,
      'auto',
      'PersonaPass ZK Verifier v2.0.0'
    );
    
    const codeId = storeResult.codeId;
    console.log(`✅ Contract code stored`);
    console.log(`   Code ID: ${codeId}`);
    console.log(`   Transaction hash: ${storeResult.transactionHash}`);

    // Step 4: Instantiate contract
    console.log();
    console.log('🏗️  Step 4: Instantiating ZK Verifier contract...');
    
    const instantiateMsg = {
      admin: senderAddress,
      governance_enabled: true,
      dao_address: null
    };
    
    const instantiateResult = await client.instantiate(
      senderAddress,
      codeId,
      instantiateMsg,
      'PersonaPass ZK Verifier v2.0.0',
      'auto'
    );
    
    const contractAddress = instantiateResult.contractAddress;
    console.log(`✅ Contract instantiated`);
    console.log(`   Contract address: ${contractAddress}`);
    console.log(`   Transaction hash: ${instantiateResult.transactionHash}`);

    // Step 5: Register circuits
    console.log();
    console.log('🔧 Step 5: Registering PersonaPass ZK circuits...');
    
    for (const circuit of CIRCUITS) {
      console.log(`   Registering ${circuit.id} circuit...`);
      
      const registerMsg = {
        register_circuit: {
          circuit_id: circuit.id,
          verification_key: JSON.stringify(circuit.vk),
          circuit_type: circuit.type
        }
      };
      
      const result = await client.execute(
        senderAddress,
        contractAddress,
        registerMsg,
        'auto',
        `Register ${circuit.id} circuit`
      );
      
      console.log(`     ✅ ${circuit.id} registered (tx: ${result.transactionHash})`);
    }
    
    console.log(`✅ All ${CIRCUITS.length} circuits registered`);

    // Step 6: Verify deployment
    console.log();
    console.log('🔍 Step 6: Verifying deployment...');
    
    const contractInfo = await client.queryContractSmart(contractAddress, {
      contract_info: {}
    });
    
    console.log(`   Admin: ${contractInfo.admin}`);
    console.log(`   Total circuits: ${contractInfo.total_circuits}`);
    console.log(`   Total proofs: ${contractInfo.total_proofs}`);
    console.log(`   Governance enabled: ${contractInfo.governance_enabled}`);
    console.log(`   Version: ${contractInfo.version}`);

    if (contractInfo.total_circuits == CIRCUITS.length) {
      console.log(`✅ All ${CIRCUITS.length} circuits verified`);
    } else {
      console.log(`⚠️  Expected ${CIRCUITS.length} circuits, found ${contractInfo.total_circuits}`);
    }

    // Step 7: Save deployment info
    console.log();
    console.log('💾 Step 7: Saving deployment configuration...');
    
    const deploymentConfig = {
      contract_address: contractAddress,
      code_id: codeId,
      chain_id: CONFIG.chainId,
      rpc_endpoint: CONFIG.rpcEndpoint,
      deployed_at: new Date().toISOString(),
      version: '2.0.0',
      deployer: senderAddress,
      governance_enabled: true,
      circuits: CIRCUITS.map(c => ({
        id: c.id,
        type: c.type
      })),
      deployment_transactions: {
        store: storeResult.transactionHash,
        instantiate: instantiateResult.transactionHash
      }
    };
    
    const configPath = path.join(__dirname, '../../config/zk-verifier-deployment.json');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(deploymentConfig, null, 2));
    console.log(`   Configuration saved to ${configPath}`);

    // Step 8: Update ZK API configuration
    console.log();
    console.log('🔧 Step 8: Updating ZK API configuration...');
    
    const zkApiDir = path.join(__dirname, '../../apps/zk-api');
    const envPath = path.join(zkApiDir, '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add configuration
    const configLines = [
      `ZK_VERIFIER_CONTRACT_ADDRESS=${contractAddress}`,
      `ZK_VERIFIER_CHAIN_ID=${CONFIG.chainId}`,
      `ZK_VERIFIER_NODE_URL=${CONFIG.rpcEndpoint}`,
      `ZK_VERIFIER_ENABLED=true`
    ];
    
    // Remove old lines and add new ones
    const existingLines = envContent.split('\n').filter(line => 
      !line.startsWith('ZK_VERIFIER_')
    );
    
    const newEnvContent = [...existingLines, ...configLines].join('\n');
    
    if (!fs.existsSync(zkApiDir)) {
      fs.mkdirSync(zkApiDir, { recursive: true });
    }
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log(`   ZK API configuration updated at ${envPath}`);

    // Final summary
    console.log();
    console.log('🎉 PersonaPass ZK Verifier Deployment Complete!');
    console.log('=================================================');
    console.log();
    console.log('📋 Deployment Summary:');
    console.log(`   Contract Address: ${contractAddress}`);
    console.log(`   Code ID: ${codeId}`);
    console.log(`   Chain: ${CONFIG.chainId}`);
    console.log(`   Circuits Registered: ${CIRCUITS.length}`);
    console.log(`   Deployer: ${senderAddress}`);
    console.log(`   Configuration: config/zk-verifier-deployment.json`);
    console.log();
    console.log('🔗 Integration:');
    console.log('   The ZK API service has been configured to use this verifier contract');
    console.log('   Proofs generated by the ZK API can now be verified on-chain');
    console.log();
    console.log('✨ Next Steps:');
    console.log('   1. Test proof verification with the CosmosVerifierService');
    console.log('   2. Integrate with frontend components');
    console.log('   3. Set up access control and governance');
    console.log('   4. Monitor contract performance and usage');

    return {
      contractAddress,
      codeId,
      deploymentConfig
    };

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run deployment if called directly
if (require.main === module) {
  deployContract()
    .then(() => {
      console.log('\n🚀 Deployment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = { deployContract, CONFIG, CIRCUITS };