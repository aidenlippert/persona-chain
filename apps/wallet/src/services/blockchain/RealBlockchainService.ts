/**
 * Real Blockchain Service - PRODUCTION READY
 * Uses ethers.js for actual blockchain interactions
 * NO MOCKS - REAL BLOCKCHAIN CALLS!
 */

import { ethers } from 'ethers';
import { retryService } from '../retryService';
import { errorService, ErrorCategory, ErrorSeverity } from '../errorService';
import { analyticsService } from '../analyticsService';
import type { 
  BlockchainTransaction, 
  BlockchainEvent, 
  TransactionConfig,
  GasEstimate,
  BlockchainConfig,
  NetworkConfig
} from '../blockchainService';

export class RealBlockchainService {
  private static instance: RealBlockchainService;
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private currentNetwork: NetworkConfig;
  private config: BlockchainConfig;
  
  // Network configurations
  private readonly networks: Record<string, NetworkConfig> = {
    ethereum: {
      name: 'Ethereum Mainnet',
      id: 'ethereum',
      chainId: 1,
      rpcUrl: import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      gasEstimation: { slow: 20, standard: 30, fast: 50 },
      contracts: {},
      isTestnet: false
    },
    polygon: {
      name: 'Polygon Mainnet',
      id: 'polygon',
      chainId: 137,
      rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      gasEstimation: { slow: 30, standard: 50, fast: 100 },
      contracts: {},
      isTestnet: false
    },
    mumbai: {
      name: 'Polygon Mumbai',
      id: 'mumbai',
      chainId: 80001,
      rpcUrl: import.meta.env.VITE_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
      explorerUrl: 'https://mumbai.polygonscan.com',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      gasEstimation: { slow: 30, standard: 50, fast: 100 },
      contracts: {},
      isTestnet: true
    }
  };

  private constructor() {
    this.currentNetwork = this.networks.polygon;
    this.config = {
      defaultNetwork: 'polygon',
      contractAddresses: {}
    };
  }

  static getInstance(): RealBlockchainService {
    if (!RealBlockchainService.instance) {
      RealBlockchainService.instance = new RealBlockchainService();
    }
    return RealBlockchainService.instance;
  }

  /**
   * Initialize blockchain connection
   */
  async initialize(config?: BlockchainConfig): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Set default network
      if (this.config.defaultNetwork) {
        this.currentNetwork = this.networks[this.config.defaultNetwork] || this.networks.polygon;
      }

      // Initialize provider
      if (typeof window !== 'undefined' && window.ethereum) {
        // Use MetaMask provider
        this.provider = new ethers.BrowserProvider(window.ethereum);
        await this.provider.send('eth_requestAccounts', []);
        this.signer = await this.provider.getSigner();
        
        // Check and switch network if needed
        const network = await this.provider.getNetwork();
        if (network.chainId !== BigInt(this.currentNetwork.chainId)) {
          await this.switchNetwork(this.currentNetwork.id);
        }
      } else {
        // Use JSON-RPC provider
        this.provider = new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);
      }

      console.log('✅ Real blockchain service initialized:', {
        network: this.currentNetwork.name,
        chainId: this.currentNetwork.chainId
      });
    } catch (error) {
      errorService.logError('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Switch blockchain network
   */
  async switchNetwork(networkId: string): Promise<void> {
    try {
      const network = this.networks[networkId];
      if (!network) {
        throw new Error(`Unknown network: ${networkId}`);
      }

      if (window.ethereum) {
        try {
          // Try to switch network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${network.chainId.toString(16)}` }],
          });
        } catch (switchError: any) {
          // Network not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.name,
                nativeCurrency: network.nativeCurrency,
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.explorerUrl]
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      this.currentNetwork = network;
      await this.initialize();
    } catch (error) {
      errorService.logError('Failed to switch network:', error);
      throw error;
    }
  }

  /**
   * Get current account address
   */
  async getAccount(): Promise<string | null> {
    try {
      if (!this.signer) return null;
      return await this.signer.getAddress();
    } catch (error) {
      errorService.logError('Failed to get account:', error);
      return null;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address?: string): Promise<bigint> {
    try {
      if (!this.provider) throw new Error('Provider not initialized');
      
      const targetAddress = address || await this.getAccount();
      if (!targetAddress) return BigInt(0);
      
      const balance = await this.provider.getBalance(targetAddress);
      return balance;
    } catch (error) {
      errorService.logError('Failed to get balance:', error);
      return BigInt(0);
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(config: TransactionConfig): Promise<BlockchainTransaction> {
    try {
      if (!this.signer) throw new Error('Signer not initialized');

      // Prepare transaction
      const tx: ethers.TransactionRequest = {
        to: config.to,
        value: config.value ? BigInt(config.value) : undefined,
        data: config.data,
        gasLimit: config.gasLimit,
      };

      // Estimate gas if not provided
      if (!tx.gasLimit) {
        const gasEstimate = await this.signer.estimateGas(tx);
        tx.gasLimit = gasEstimate * BigInt(120) / BigInt(100); // Add 20% buffer
      }

      // Send transaction
      const response = await this.signer.sendTransaction(tx);
      
      // Track analytics
      analyticsService.trackEvent(
        'blockchain_event',
        'transaction',
        'sent',
        await this.signer.getAddress(),
        {
          hash: response.hash,
          network: this.currentNetwork.id,
          to: config.to,
          value: config.value
        }
      );

      // Create transaction record
      const transaction: BlockchainTransaction = {
        id: response.hash,
        hash: response.hash,
        from: await this.signer.getAddress(),
        to: config.to || '',
        value: config.value || '0',
        gasLimit: tx.gasLimit,
        gasPrice: BigInt(0), // Will be updated from receipt
        nonce: response.nonce,
        data: config.data || '',
        status: 'pending',
        network: this.currentNetwork.id,
        confirmations: 0,
        timestamp: Date.now(),
        metadata: config.metadata || {}
      };

      // Wait for confirmation
      const receipt = await response.wait();
      
      transaction.status = receipt ? 'confirmed' : 'failed';
      transaction.blockNumber = receipt?.blockNumber;
      transaction.blockHash = receipt?.blockHash;
      transaction.gasUsed = receipt?.gasUsed;
      transaction.effectiveGasPrice = receipt?.gasPrice;
      transaction.confirmations = 1;

      return transaction;
    } catch (error) {
      errorService.logError('Failed to send transaction:', error);
      throw error;
    }
  }

  /**
   * Call contract method (read-only)
   */
  async callContract(config: {
    address: string;
    abi: any[];
    method: string;
    params?: any[];
  }): Promise<any> {
    try {
      if (!this.provider) throw new Error('Provider not initialized');

      const contract = new ethers.Contract(
        config.address,
        config.abi,
        this.provider
      );

      const result = await contract[config.method](...(config.params || []));
      return result;
    } catch (error) {
      errorService.logError('Failed to call contract:', error);
      throw error;
    }
  }

  /**
   * Execute contract transaction
   */
  async executeContract(config: {
    address: string;
    abi: any[];
    method: string;
    params?: any[];
    value?: string;
  }): Promise<BlockchainTransaction> {
    try {
      if (!this.signer) throw new Error('Signer not initialized');

      const contract = new ethers.Contract(
        config.address,
        config.abi,
        this.signer
      );

      const tx = await contract[config.method](...(config.params || []), {
        value: config.value ? BigInt(config.value) : undefined
      });

      const receipt = await tx.wait();

      return {
        id: receipt.hash,
        hash: receipt.hash,
        from: await this.signer.getAddress(),
        to: config.address,
        value: config.value || '0',
        gasLimit: receipt.gasLimit,
        gasPrice: receipt.gasPrice,
        nonce: tx.nonce,
        data: tx.data,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        network: this.currentNetwork.id,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.gasPrice,
        confirmations: 1,
        timestamp: Date.now(),
        metadata: {
          method: config.method,
          params: config.params
        }
      };
    } catch (error) {
      errorService.logError('Failed to execute contract:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    config: TransactionConfig,
    priority: 'slow' | 'standard' | 'fast' = 'standard'
  ): Promise<GasEstimate> {
    try {
      if (!this.provider) throw new Error('Provider not initialized');

      // Prepare transaction for estimation
      const tx: ethers.TransactionRequest = {
        to: config.to,
        value: config.value ? BigInt(config.value) : undefined,
        data: config.data,
        from: await this.getAccount() || undefined
      };

      // Estimate gas limit
      const gasLimit = await this.provider.estimateGas(tx);
      
      // Get current gas prices
      const feeData = await this.provider.getFeeData();
      
      // Calculate gas price based on priority
      let maxFeePerGas = feeData.maxFeePerGas || BigInt(0);
      let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(0);
      
      if (priority === 'slow') {
        maxFeePerGas = maxFeePerGas * BigInt(80) / BigInt(100); // 80% of standard
        maxPriorityFeePerGas = maxPriorityFeePerGas * BigInt(80) / BigInt(100);
      } else if (priority === 'fast') {
        maxFeePerGas = maxFeePerGas * BigInt(150) / BigInt(100); // 150% of standard
        maxPriorityFeePerGas = maxPriorityFeePerGas * BigInt(150) / BigInt(100);
      }

      const estimatedCost = gasLimit * maxFeePerGas;
      const estimatedTime = priority === 'slow' ? 300 : priority === 'standard' ? 60 : 15;

      return {
        gasLimit,
        gasPrice: feeData.gasPrice || BigInt(0),
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost,
        estimatedTime
      };
    } catch (error) {
      errorService.logError('Failed to estimate gas:', error);
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      if (!this.provider) throw new Error('Provider not initialized');
      return await this.provider.getTransactionReceipt(hash);
    } catch (error) {
      errorService.logError('Failed to get transaction receipt:', error);
      return null;
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    try {
      if (!this.provider) throw new Error('Provider not initialized');
      return await this.provider.getBlockNumber();
    } catch (error) {
      errorService.logError('Failed to get block number:', error);
      return 0;
    }
  }

  /**
   * Subscribe to events
   */
  async subscribeToEvents(config: {
    address: string;
    abi: any[];
    eventName: string;
    filter?: any;
    callback: (event: BlockchainEvent) => void;
  }): Promise<() => void> {
    try {
      if (!this.provider) throw new Error('Provider not initialized');

      const contract = new ethers.Contract(
        config.address,
        config.abi,
        this.provider
      );

      const listener = (...args: any[]) => {
        const event = args[args.length - 1]; // Last argument is the event
        
        const blockchainEvent: BlockchainEvent = {
          id: `${event.log.transactionHash}-${event.log.logIndex}`,
          blockNumber: event.log.blockNumber,
          transactionHash: event.log.transactionHash,
          address: event.log.address,
          event: config.eventName,
          args: args.slice(0, -1), // All args except the event object
          timestamp: Date.now(),
          network: this.currentNetwork.id
        };

        config.callback(blockchainEvent);
      };

      contract.on(config.eventName, listener);

      // Return unsubscribe function
      return () => {
        contract.off(config.eventName, listener);
      };
    } catch (error) {
      errorService.logError('Failed to subscribe to events:', error);
      throw error;
    }
  }

  /**
   * Get current network
   */
  getCurrentNetwork(): NetworkConfig {
    return this.currentNetwork;
  }

  /**
   * Get available networks
   */
  getAvailableNetworks(): NetworkConfig[] {
    return Object.values(this.networks);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return !!this.provider;
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    console.log('🔌 Blockchain service disconnected');
  }
}

// Export singleton instance
export const realBlockchainService = RealBlockchainService.getInstance();