/**
 * PersonaPass Hardhat Configuration
 * Smart contract compilation and deployment setup
 */

require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const OPTIMISM_API_KEY = process.env.OPTIMISM_API_KEY;
const ARBITRUM_API_KEY = process.env.ARBITRUM_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  
  networks: {
    // Local development
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10,000 ETH
      },
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      timeout: 1800000,
    },
    
    // Ethereum networks
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 1,
      gasPrice: 20000000000, // 20 gwei
      gas: 6000000,
    },
    
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 5,
      gasPrice: 20000000000, // 20 gwei
      gas: 6000000,
    },
    
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
      gas: 6000000,
    },
    
    // Polygon networks
    polygon: {
      url: `https://polygon-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 137,
      gasPrice: 30000000000, // 30 gwei
      gas: 6000000,
    },
    
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
      gasPrice: 30000000000, // 30 gwei
      gas: 6000000,
    },
    
    // Optimism networks
    optimism: {
      url: `https://optimism-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 10,
      gasPrice: 1000000000, // 1 gwei
      gas: 6000000,
    },
    
    optimismGoerli: {
      url: `https://optimism-goerli.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 420,
      gasPrice: 1000000000, // 1 gwei
      gas: 6000000,
    },
    
    // Arbitrum networks
    arbitrum: {
      url: `https://arbitrum-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 42161,
      gasPrice: 1000000000, // 1 gwei
      gas: 6000000,
    },
    
    arbitrumGoerli: {
      url: `https://arbitrum-goerli.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [PRIVATE_KEY],
      chainId: 421613,
      gasPrice: 1000000000, // 1 gwei
      gas: 6000000,
    },
  },
  
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
      optimisticEthereum: OPTIMISM_API_KEY,
      optimisticGoerli: OPTIMISM_API_KEY,
      arbitrumOne: ARBITRUM_API_KEY,
      arbitrumGoerli: ARBITRUM_API_KEY,
    },
    customChains: [
      {
        network: "optimismGoerli",
        chainId: 420,
        urls: {
          apiURL: "https://api-goerli-optimism.etherscan.io/api",
          browserURL: "https://goerli-optimism.etherscan.io"
        }
      },
      {
        network: "arbitrumGoerli",
        chainId: 421613,
        urls: {
          apiURL: "https://api-goerli.arbiscan.io/api",
          browserURL: "https://goerli.arbiscan.io"
        }
      }
    ]
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: "gas-report.txt",
    noColors: true,
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  
  mocha: {
    timeout: 180000, // 3 minutes
    slow: 30000,     // 30 seconds
    reporter: "spec"
  },
  
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  
  typechain: {
    outDir: "types",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["node_modules/@openzeppelin/contracts/build/contracts/*.json"],
  },
  
  // Custom tasks
  tasks: {
    "deploy-did-registry": {
      description: "Deploy DID Registry contract",
      action: async (taskArgs, hre) => {
        const { ethers } = hre;
        const [deployer] = await ethers.getSigners();
        
        console.log("Deploying DID Registry with account:", deployer.address);
        
        const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
        const didRegistry = await DIDRegistry.deploy();
        await didRegistry.deployed();
        
        console.log("DID Registry deployed to:", didRegistry.address);
        return didRegistry.address;
      }
    },
    
    "verify-did-registry": {
      description: "Verify DID Registry contract on Etherscan",
      action: async (taskArgs, hre) => {
        const { run } = hre;
        const contractAddress = taskArgs.address;
        
        console.log("Verifying DID Registry at:", contractAddress);
        
        await run("verify:verify", {
          address: contractAddress,
          constructorArguments: []
        });
        
        console.log("DID Registry verified!");
      }
    }
  }
};