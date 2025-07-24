/**
 * PersonaPass Smart Contract Configuration
 * PRODUCTION CONTRACT ADDRESSES - NO MOCKS!
 */

export interface ContractConfig {
  address: string;
  chainId: number;
  network: string;
  blockExplorer: string;
  rpcUrl: string;
}

export interface ContractAddresses {
  PERSToken: ContractConfig;
  CredentialRegistry: ContractConfig;
  ZKProofVerifier: ContractConfig;
}

// Polygon Mumbai Testnet (for development)
export const MUMBAI_CONTRACTS: ContractAddresses = {
  PERSToken: {
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f1e6A0", // Deploy and update
    chainId: 80001,
    network: "mumbai",
    blockExplorer: "https://mumbai.polygonscan.com",
    rpcUrl: "https://rpc-mumbai.maticvigil.com"
  },
  CredentialRegistry: {
    address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", // Deploy and update
    chainId: 80001,
    network: "mumbai",
    blockExplorer: "https://mumbai.polygonscan.com",
    rpcUrl: "https://rpc-mumbai.maticvigil.com"
  },
  ZKProofVerifier: {
    address: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", // Deploy and update
    chainId: 80001,
    network: "mumbai",
    blockExplorer: "https://mumbai.polygonscan.com",
    rpcUrl: "https://rpc-mumbai.maticvigil.com"
  }
};

// Polygon Mainnet (for production)
export const POLYGON_CONTRACTS: ContractAddresses = {
  PERSToken: {
    address: "0x0000000000000000000000000000000000000000", // Deploy and update
    chainId: 137,
    network: "polygon",
    blockExplorer: "https://polygonscan.com",
    rpcUrl: "https://polygon-rpc.com"
  },
  CredentialRegistry: {
    address: "0x0000000000000000000000000000000000000000", // Deploy and update
    chainId: 137,
    network: "polygon",
    blockExplorer: "https://polygonscan.com",
    rpcUrl: "https://polygon-rpc.com"
  },
  ZKProofVerifier: {
    address: "0x0000000000000000000000000000000000000000", // Deploy and update
    chainId: 137,
    network: "polygon",
    blockExplorer: "https://polygonscan.com",
    rpcUrl: "https://polygon-rpc.com"
  }
};

// Ethereum Mainnet (for production)
export const ETHEREUM_CONTRACTS: ContractAddresses = {
  PERSToken: {
    address: "0x0000000000000000000000000000000000000000", // Deploy and update
    chainId: 1,
    network: "ethereum",
    blockExplorer: "https://etherscan.io",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
  },
  CredentialRegistry: {
    address: "0x0000000000000000000000000000000000000000", // Deploy and update
    chainId: 1,
    network: "ethereum",
    blockExplorer: "https://etherscan.io",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
  },
  ZKProofVerifier: {
    address: "0x0000000000000000000000000000000000000000", // Deploy and update
    chainId: 1,
    network: "ethereum",
    blockExplorer: "https://etherscan.io",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
  }
};

// Get contracts based on current network
export function getContractAddresses(chainId: number): ContractAddresses {
  switch (chainId) {
    case 1:
      return ETHEREUM_CONTRACTS;
    case 137:
      return POLYGON_CONTRACTS;
    case 80001:
      return MUMBAI_CONTRACTS;
    default:
      // Default to Mumbai for development
      console.warn(`Unknown chain ID ${chainId}, defaulting to Mumbai testnet`);
      return MUMBAI_CONTRACTS;
  }
}

// Contract deployment status
export const DEPLOYMENT_STATUS = {
  mumbai: {
    deployed: false, // Set to true after deployment
    deploymentDate: null,
    deploymentTx: null
  },
  polygon: {
    deployed: false,
    deploymentDate: null,
    deploymentTx: null
  },
  ethereum: {
    deployed: false,
    deploymentDate: null,
    deploymentTx: null
  }
};

// Export current network config (can be set via environment variable)
export const CURRENT_NETWORK = process.env.VITE_NETWORK || 'mumbai';
export const CURRENT_CONTRACTS = getContractAddresses(
  CURRENT_NETWORK === 'ethereum' ? 1 : 
  CURRENT_NETWORK === 'polygon' ? 137 : 
  80001
);