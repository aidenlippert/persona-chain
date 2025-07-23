/**
 * Hardhat Configuration for PersonaPass Smart Contract Deployment
 */

require('@nomicfoundation/hardhat-toolbox');
require('@nomiclabs/hardhat-etherscan');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('dotenv').config();

// Network configurations
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const POLYGON_MUMBAI_RPC_URL = process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0x' + '0'.repeat(64);
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || 'your-api-key';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: false,
        interval: 1000
      }
    },
    
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337
    },
    
    'polygon-mumbai': {
      url: POLYGON_MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
      gasPrice: 20000000000,
      gas: 6000000,
      confirmations: 2,
      timeout: 300000
    },
    
    'polygon-mainnet': {
      url: POLYGON_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 137,
      gasPrice: 50000000000, // 50 gwei
      gas: 8000000,
      confirmations: 3,
      timeout: 300000
    }
  },
  
  etherscan: {
    apiKey: {
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY
    }
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
    gasPrice: 50,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
  
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  
  mocha: {
    timeout: 40000
  }
};