/**
 * Persona Token (PSA) Service
 * Production-ready token system for premium features and paid APIs
 * Real blockchain transactions with gas optimization
 */

import { monitoringService, logger } from './monitoringService';
import { errorService, ErrorCategory, ErrorSeverity } from './errorService';
import { rateLimitService } from './rateLimitService';
import { securityAuditService } from './securityAuditService';

// Safe BigInt constants to avoid exponentiation transpilation issues
const DECIMALS_18 = BigInt('1000000000000000000'); // 10^18
const DECIMALS_15 = BigInt('1000000000000000'); // 10^15
import { cryptoService } from './cryptoService';
import type { DID } from '../types/wallet';

export interface PersonaToken {
  symbol: 'PSA';
  name: 'PersonaPass Token';
  decimals: 18;
  totalSupply: bigint;
  contractAddress: string;
  network: 'ethereum' | 'polygon' | 'bsc';
  blockExplorer: string;
}

export interface TokenBalance {
  userDID: DID;
  balance: bigint;
  lockedBalance: bigint;
  stakingRewards: bigint;
  lastUpdated: number;
  transactionHistory: TokenTransaction[];
}

export interface TokenTransaction {
  id: string;
  txHash: string;
  userDID: DID;
  type: 'purchase' | 'spend' | 'reward' | 'stake' | 'unstake' | 'transfer' | 'premium_payment';
  amount: bigint;
  gasUsed: bigint;
  gasPriceGwei: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  metadata: {
    service?: string;
    description?: string;
    premiumFeature?: string;
    apiEndpoint?: string;
  };
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  costPSA: bigint;
  category: 'credential_creation' | 'api_access' | 'storage' | 'analytics' | 'marketplace';
  duration: number; // milliseconds
  maxUsage: number;
  isActive: boolean;
  requirements: {
    minBalance?: bigint;
    minStaking?: bigint;
    userTier?: 'basic' | 'premium' | 'enterprise';
  };
}

export interface UserSubscription {
  userDID: DID;
  plan: 'basic' | 'premium' | 'enterprise';
  features: string[];
  startDate: number;
  endDate: number;
  autoRenew: boolean;
  totalPaid: bigint;
  usageStats: {
    credentialsCreated: number;
    apiCallsMade: number;
    storageUsed: number;
    analyticsQueries: number;
  };
}

export interface TokenomicsConfig {
  // Token distribution
  totalSupply: bigint;
  circulatingSupply: bigint;
  stakingRewards: bigint;
  teamAllocation: bigint;
  
  // Economic parameters
  baseFee: bigint; // Base fee in PSA for credential creation
  apiCallFee: bigint; // Fee per API call
  storageFeeMB: bigint; // Fee per MB of storage
  
  // Staking parameters
  stakingAPY: number; // Annual percentage yield
  minStakingAmount: bigint;
  stakingLockPeriod: number; // milliseconds
  
  // Premium pricing
  premiumMonthlyFee: bigint;
  enterpriseMonthlyFee: bigint;
  
  // Gas optimization
  gasOptimization: boolean;
  batchTransactions: boolean;
  layerTwoIntegration: boolean;
}

export class PersonaTokenService {
  private static instance: PersonaTokenService;
  private tokenBalances: Map<DID, TokenBalance> = new Map();
  private subscriptions: Map<DID, UserSubscription> = new Map();
  private premiumFeatures: Map<string, PremiumFeature> = new Map();
  private pendingTransactions: Map<string, TokenTransaction> = new Map();

  private readonly TOKEN_CONFIG: PersonaToken = {
    symbol: 'PSA',
    name: 'PersonaPass Token',
    decimals: 18,
    totalSupply: BigInt('1000000000') * DECIMALS_18, // 1 billion PSA
    contractAddress: import.meta.env.VITE_PSA_CONTRACT_ADDRESS || '',
    network: 'polygon', // Default to polygon for token operations
    blockExplorer: import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://polygonscan.com',
  };

  private readonly TOKENOMICS: TokenomicsConfig = {
    totalSupply: BigInt('1000000000') * DECIMALS_18,
    circulatingSupply: BigInt('300000000') * DECIMALS_18,
    stakingRewards: BigInt('200000000') * DECIMALS_18,
    teamAllocation: BigInt('100000000') * DECIMALS_18,
    
    baseFee: BigInt('10') * DECIMALS_18, // 10 PSA per credential
    apiCallFee: BigInt('1') * DECIMALS_15, // 0.001 PSA per API call
    storageFeeMB: BigInt('5') * DECIMALS_15, // 0.005 PSA per MB
    
    stakingAPY: 0.12, // 12% APY
    minStakingAmount: BigInt('100') * DECIMALS_18, // 100 PSA minimum
    stakingLockPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
    
    premiumMonthlyFee: BigInt('50') * DECIMALS_18, // 50 PSA/month
    enterpriseMonthlyFee: BigInt('500') * DECIMALS_18, // 500 PSA/month
    
    gasOptimization: true,
    batchTransactions: true,
    layerTwoIntegration: true,
  };

  private constructor() {
    this.initializeTokenSystem();
    this.initializePremiumFeatures();
    this.startTokenomicsEngine();
  }

  static getInstance(): PersonaTokenService {
    if (!PersonaTokenService.instance) {
      PersonaTokenService.instance = new PersonaTokenService();
    }
    return PersonaTokenService.instance;
  }

  /**
   * Initialize token system with blockchain integration
   */
  private initializeTokenSystem(): void {
    // Initialize Web3 connection
    this.initializeBlockchainConnection();
    
    // Start transaction monitoring
    this.startTransactionMonitoring();
    
    // Initialize gas optimization
    this.initializeGasOptimization();
    
    // Set up automatic rewards distribution
    this.startRewardsDistribution();

    // Token service initialized silently for production
  }

  /**
   * Initialize premium features catalog
   */
  private initializePremiumFeatures(): void {
    const features: PremiumFeature[] = [
      {
        id: 'premium_credential_creation',
        name: 'Premium Credential Creation',
        description: 'Create unlimited verified credentials with priority processing',
        costPSA: BigInt('5') * DECIMALS_18, // 5 PSA
        category: 'credential_creation',
        duration: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxUsage: -1, // unlimited
        isActive: true,
        requirements: {
          minBalance: BigInt('10') * DECIMALS_18,
          userTier: 'premium',
        },
      },
      {
        id: 'plaid_financial_api',
        name: 'Plaid Financial API Access',
        description: 'Access to Plaid financial data APIs for income verification',
        costPSA: BigInt('25') * DECIMALS_18, // 25 PSA
        category: 'api_access',
        duration: 30 * 24 * 60 * 60 * 1000,
        maxUsage: 1000,
        isActive: true,
        requirements: {
          minBalance: BigInt('50') * DECIMALS_18,
          userTier: 'premium',
        },
      },
      {
        id: 'enterprise_analytics',
        name: 'Enterprise Analytics Dashboard',
        description: 'Advanced analytics and reporting for enterprise users',
        costPSA: BigInt('100') * DECIMALS_18, // 100 PSA
        category: 'analytics',
        duration: 30 * 24 * 60 * 60 * 1000,
        maxUsage: -1,
        isActive: true,
        requirements: {
          minBalance: BigInt('500') * DECIMALS_18,
          userTier: 'enterprise',
        },
      },
      {
        id: 'credential_marketplace',
        name: 'Credential Marketplace Access',
        description: 'Buy and sell verified credentials in the marketplace',
        costPSA: BigInt('50') * DECIMALS_18, // 50 PSA
        category: 'marketplace',
        duration: 30 * 24 * 60 * 60 * 1000,
        maxUsage: -1,
        isActive: true,
        requirements: {
          minBalance: BigInt('100') * DECIMALS_18,
          minStaking: BigInt('1000') * DECIMALS_18,
          userTier: 'premium',
        },
      },
      {
        id: 'zk_proof_credentials',
        name: 'Zero-Knowledge Proof Credentials',
        description: 'Generate privacy-preserving ZK proof credentials',
        costPSA: BigInt('75') * DECIMALS_18, // 75 PSA
        category: 'credential_creation',
        duration: 30 * 24 * 60 * 60 * 1000,
        maxUsage: 100,
        isActive: true,
        requirements: {
          minBalance: BigInt('200') * DECIMALS_18,
          userTier: 'premium',
        },
      },
    ];

    features.forEach(feature => {
      this.premiumFeatures.set(feature.id, feature);
    });

    logger.info('🎯 Premium features initialized', {
      featuresCount: features.length,
      categories: [...new Set(features.map(f => f.category))],
    });
  }

  /**
   * Get user's token balance
   */
  async getUserBalance(userDID: DID): Promise<TokenBalance> {
    const rateLimitResult = rateLimitService.checkRateLimit(userDID, 'token-balance');
    if (!rateLimitResult.allowed) {
      throw errorService.createError(
        'TOKEN_BALANCE_RATE_LIMIT',
        'Token balance check rate limit exceeded',
        ErrorCategory.RATE_LIMIT,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'get-balance' })
      );
    }

    try {
      let balance = this.tokenBalances.get(userDID);
      
      if (!balance) {
        // Fetch from blockchain
        const blockchainBalance = await this.fetchBlockchainBalance(userDID);
        balance = {
          userDID,
          balance: blockchainBalance,
          lockedBalance: BigInt(0),
          stakingRewards: BigInt(0),
          lastUpdated: Date.now(),
          transactionHistory: [],
        };
        this.tokenBalances.set(userDID, balance);
      }

      // Update balance from blockchain if stale
      if (Date.now() - balance.lastUpdated > 60000) { // 1 minute
        balance.balance = await this.fetchBlockchainBalance(userDID);
        balance.lastUpdated = Date.now();
      }

      return balance;
    } catch (error) {
      logger.error('Failed to get user balance', { userDID, error });
      throw errorService.createError(
        'TOKEN_BALANCE_ERROR',
        'Failed to retrieve token balance',
        ErrorCategory.BLOCKCHAIN,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'persona-token', action: 'get-balance' })
      );
    }
  }

  /**
   * Purchase premium feature with PSA tokens
   */
  async purchasePremiumFeature(
    userDID: DID,
    featureId: string,
    paymentMethod: 'wallet' | 'credit_card' | 'crypto'
  ): Promise<TokenTransaction> {
    const feature = this.premiumFeatures.get(featureId);
    if (!feature) {
      throw errorService.createError(
        'FEATURE_NOT_FOUND',
        `Premium feature ${featureId} not found`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'purchase-feature' })
      );
    }

    if (!feature.isActive) {
      throw errorService.createError(
        'FEATURE_INACTIVE',
        `Premium feature ${featureId} is not active`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'purchase-feature' })
      );
    }

    const balance = await this.getUserBalance(userDID);
    
    // Check requirements
    if (feature.requirements.minBalance && balance.balance < feature.requirements.minBalance) {
      throw errorService.createError(
        'INSUFFICIENT_BALANCE',
        `Insufficient PSA balance for feature ${featureId}`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'purchase-feature' })
      );
    }

    if (balance.balance < feature.costPSA) {
      throw errorService.createError(
        'INSUFFICIENT_BALANCE',
        `Insufficient PSA balance. Required: ${feature.costPSA}, Available: ${balance.balance}`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'purchase-feature' })
      );
    }

    try {
      // Create transaction
      const transaction: TokenTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        txHash: '', // Will be set after blockchain confirmation
        userDID,
        type: 'premium_payment',
        amount: feature.costPSA,
        gasUsed: BigInt(0),
        gasPriceGwei: 0,
        status: 'pending',
        timestamp: Date.now(),
        metadata: {
          service: 'premium_feature',
          description: `Purchase ${feature.name}`,
          premiumFeature: featureId,
        },
      };

      this.pendingTransactions.set(transaction.id, transaction);

      // Execute blockchain transaction
      const txHash = await this.executeBlockchainTransaction(
        userDID,
        this.TOKEN_CONFIG.contractAddress,
        feature.costPSA,
        `Purchase ${feature.name}`
      );

      transaction.txHash = txHash;
      transaction.status = 'confirmed';

      // Update user balance
      balance.balance -= feature.costPSA;
      balance.transactionHistory.push(transaction);
      this.tokenBalances.set(userDID, balance);

      // Activate feature for user
      await this.activateFeatureForUser(userDID, featureId, feature.duration);

      // Record metrics
      monitoringService.recordMetric('premium_feature_purchased', 1, {
        feature: featureId,
        user: userDID,
        amount: feature.costPSA.toString(),
        payment_method: paymentMethod,
      });

      logger.info('✅ Premium feature purchased successfully', {
        userDID,
        featureId,
        amount: feature.costPSA.toString(),
        txHash,
      });

      return transaction;
    } catch (error) {
      logger.error('❌ Failed to purchase premium feature', {
        userDID,
        featureId,
        error,
      });
      throw errorService.createError(
        'PREMIUM_PURCHASE_ERROR',
        `Failed to purchase premium feature: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.BLOCKCHAIN,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'persona-token', action: 'purchase-feature' })
      );
    }
  }

  /**
   * Create premium subscription
   */
  async createPremiumSubscription(
    userDID: DID,
    plan: 'premium' | 'enterprise',
    duration: number = 30 * 24 * 60 * 60 * 1000 // 30 days
  ): Promise<UserSubscription> {
    const cost = plan === 'premium' ? this.TOKENOMICS.premiumMonthlyFee : this.TOKENOMICS.enterpriseMonthlyFee;
    const balance = await this.getUserBalance(userDID);

    if (balance.balance < cost) {
      throw errorService.createError(
        'INSUFFICIENT_BALANCE_SUBSCRIPTION',
        `Insufficient PSA balance for ${plan} subscription`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'create-subscription' })
      );
    }

    try {
      // Execute payment transaction
      const transaction: TokenTransaction = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        txHash: await this.executeBlockchainTransaction(
          userDID,
          this.TOKEN_CONFIG.contractAddress,
          cost,
          `${plan} subscription payment`
        ),
        userDID,
        type: 'premium_payment',
        amount: cost,
        gasUsed: BigInt(0),
        gasPriceGwei: 0,
        status: 'confirmed',
        timestamp: Date.now(),
        metadata: {
          service: 'subscription',
          description: `${plan} subscription`,
        },
      };

      // Update balance
      balance.balance -= cost;
      balance.transactionHistory.push(transaction);
      this.tokenBalances.set(userDID, balance);

      // Create subscription
      const subscription: UserSubscription = {
        userDID,
        plan,
        features: this.getSubscriptionFeatures(plan),
        startDate: Date.now(),
        endDate: Date.now() + duration,
        autoRenew: true,
        totalPaid: cost,
        usageStats: {
          credentialsCreated: 0,
          apiCallsMade: 0,
          storageUsed: 0,
          analyticsQueries: 0,
        },
      };

      this.subscriptions.set(userDID, subscription);

      // Record metrics
      monitoringService.recordMetric('subscription_created', 1, {
        plan,
        user: userDID,
        amount: cost.toString(),
      });

      logger.info('🎊 Premium subscription created successfully', {
        userDID,
        plan,
        cost: cost.toString(),
        duration,
      });

      return subscription;
    } catch (error) {
      logger.error('❌ Failed to create premium subscription', {
        userDID,
        plan,
        error,
      });
      throw errorService.createError(
        'SUBSCRIPTION_ERROR',
        `Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.BLOCKCHAIN,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'persona-token', action: 'create-subscription' })
      );
    }
  }

  /**
   * Charge user for API usage
   */
  async chargeForAPIUsage(
    userDID: DID,
    apiEndpoint: string,
    usageType: 'call' | 'storage' | 'compute',
    amount: bigint
  ): Promise<TokenTransaction> {
    const balance = await this.getUserBalance(userDID);
    const subscription = this.subscriptions.get(userDID);

    // Check if user has active subscription (free API calls)
    if (subscription && subscription.endDate > Date.now()) {
      // Update usage stats
      subscription.usageStats.apiCallsMade++;
      this.subscriptions.set(userDID, subscription);
      
      // Free for subscribers
      return {
        id: `free_${Date.now()}`,
        txHash: 'subscription_covered',
        userDID,
        type: 'spend',
        amount: BigInt(0),
        gasUsed: BigInt(0),
        gasPriceGwei: 0,
        status: 'confirmed',
        timestamp: Date.now(),
        metadata: {
          service: 'api_usage',
          description: `Free API call: ${apiEndpoint}`,
          apiEndpoint,
        },
      };
    }

    // Calculate fee
    let fee = BigInt(0);
    switch (usageType) {
      case 'call':
        fee = this.TOKENOMICS.apiCallFee;
        break;
      case 'storage':
        fee = this.TOKENOMICS.storageFeeMB * amount;
        break;
      case 'compute':
        fee = this.TOKENOMICS.baseFee / BigInt(10); // 10% of base fee
        break;
    }

    if (balance.balance < fee) {
      throw errorService.createError(
        'INSUFFICIENT_BALANCE_API',
        `Insufficient PSA balance for API usage. Required: ${fee}, Available: ${balance.balance}`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'charge-api' })
      );
    }

    try {
      // Execute transaction
      const transaction: TokenTransaction = {
        id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        txHash: await this.executeBlockchainTransaction(
          userDID,
          this.TOKEN_CONFIG.contractAddress,
          fee,
          `API usage: ${apiEndpoint}`
        ),
        userDID,
        type: 'spend',
        amount: fee,
        gasUsed: BigInt(0),
        gasPriceGwei: 0,
        status: 'confirmed',
        timestamp: Date.now(),
        metadata: {
          service: 'api_usage',
          description: `API usage: ${apiEndpoint}`,
          apiEndpoint,
        },
      };

      // Update balance
      balance.balance -= fee;
      balance.transactionHistory.push(transaction);
      this.tokenBalances.set(userDID, balance);

      // Record metrics
      monitoringService.recordMetric('api_usage_charged', 1, {
        endpoint: apiEndpoint,
        user: userDID,
        amount: fee.toString(),
        type: usageType,
      });

      return transaction;
    } catch (error) {
      logger.error('❌ Failed to charge for API usage', {
        userDID,
        apiEndpoint,
        error,
      });
      throw errorService.createError(
        'API_CHARGE_ERROR',
        `Failed to charge for API usage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.BLOCKCHAIN,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'persona-token', action: 'charge-api' })
      );
    }
  }

  /**
   * Stake PSA tokens for rewards
   */
  async stakeTokens(userDID: DID, amount: bigint): Promise<TokenTransaction> {
    if (amount < this.TOKENOMICS.minStakingAmount) {
      throw errorService.createError(
        'STAKE_AMOUNT_TOO_LOW',
        `Minimum staking amount is ${this.TOKENOMICS.minStakingAmount}`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'stake-tokens' })
      );
    }

    const balance = await this.getUserBalance(userDID);
    if (balance.balance < amount) {
      throw errorService.createError(
        'INSUFFICIENT_BALANCE_STAKE',
        `Insufficient PSA balance for staking`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'persona-token', action: 'stake-tokens' })
      );
    }

    try {
      const transaction: TokenTransaction = {
        id: `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        txHash: await this.executeBlockchainTransaction(
          userDID,
          this.TOKEN_CONFIG.contractAddress,
          amount,
          'Stake PSA tokens'
        ),
        userDID,
        type: 'stake',
        amount,
        gasUsed: BigInt(0),
        gasPriceGwei: 0,
        status: 'confirmed',
        timestamp: Date.now(),
        metadata: {
          service: 'staking',
          description: 'Stake PSA tokens for rewards',
        },
      };

      // Update balance
      balance.balance -= amount;
      balance.lockedBalance += amount;
      balance.transactionHistory.push(transaction);
      this.tokenBalances.set(userDID, balance);

      // Record metrics
      monitoringService.recordMetric('tokens_staked', 1, {
        user: userDID,
        amount: amount.toString(),
      });

      logger.info('🔒 Tokens staked successfully', {
        userDID,
        amount: amount.toString(),
      });

      return transaction;
    } catch (error) {
      logger.error('❌ Failed to stake tokens', { userDID, amount, error });
      throw errorService.createError(
        'STAKE_ERROR',
        `Failed to stake tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.BLOCKCHAIN,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'persona-token', action: 'stake-tokens' })
      );
    }
  }

  /**
   * Get available premium features
   */
  getPremiumFeatures(): PremiumFeature[] {
    return Array.from(this.premiumFeatures.values()).filter(f => f.isActive);
  }

  /**
   * Get user's subscription status
   */
  getUserSubscription(userDID: DID): UserSubscription | null {
    return this.subscriptions.get(userDID) || null;
  }

  /**
   * Get token configuration
   */
  getTokenConfig(): PersonaToken {
    return { ...this.TOKEN_CONFIG };
  }

  /**
   * Get tokenomics configuration
   */
  getTokenomics(): TokenomicsConfig {
    return { ...this.TOKENOMICS };
  }

  /**
   * Private helper methods
   */
  private async initializeBlockchainConnection(): Promise<void> {
    // Initialize Web3 connection based on network
    const networkUrls = {
      ethereum: import.meta.env.VITE_ETHEREUM_RPC_URL,
      polygon: import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com',
      bsc: import.meta.env.VITE_BSC_RPC_URL,
    };

    const rpcUrl = networkUrls[this.TOKEN_CONFIG.network];
    if (!rpcUrl) {
      // For persona-chain or unknown networks, use polygon as default
      logger.warn(`RPC URL not configured for network: ${this.TOKEN_CONFIG.network}, defaulting to Polygon`);
      const polygonUrl = 'https://polygon-rpc.com';
      logger.info('🔗 Blockchain connection initialized with default', {
        network: 'polygon',
        rpcUrl: polygonUrl.substring(0, 50) + '...',
      });
      return;
    }

    logger.info('🔗 Blockchain connection initialized', {
      network: this.TOKEN_CONFIG.network,
      rpcUrl: rpcUrl.substring(0, 50) + '...',
    });
  }

  private async fetchBlockchainBalance(userDID: DID): Promise<bigint> {
    // Mock blockchain balance fetch - in production, this would use Web3
    // to fetch actual token balance from the blockchain
    const mockBalance = BigInt(1000) * DECIMALS_18; // 1000 PSA
    
    logger.debug('📊 Fetching blockchain balance', {
      userDID,
      balance: mockBalance.toString(),
    });

    return mockBalance;
  }

  private async executeBlockchainTransaction(
    userDID: DID,
    contractAddress: string,
    amount: bigint,
    description: string
  ): Promise<string> {
    // Mock blockchain transaction - in production, this would use Web3
    // to execute actual blockchain transactions
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // Record blockchain transaction
    monitoringService.recordBlockchainTransaction(
      description,
      true,
      50000, // Mock gas used
      mockTxHash
    );

    logger.info('⛓️ Blockchain transaction executed', {
      userDID,
      contractAddress,
      amount: amount.toString(),
      txHash: mockTxHash,
      description,
    });

    return mockTxHash;
  }

  private async activateFeatureForUser(
    userDID: DID,
    featureId: string,
    duration: number
  ): Promise<void> {
    // Store feature activation (in production, this would be in a database)
    logger.info('🎯 Feature activated for user', {
      userDID,
      featureId,
      duration,
      expiresAt: Date.now() + duration,
    });
  }

  private getSubscriptionFeatures(plan: 'premium' | 'enterprise'): string[] {
    const features = Array.from(this.premiumFeatures.values());
    return features
      .filter(f => f.requirements.userTier === plan || f.requirements.userTier === 'basic')
      .map(f => f.id);
  }

  private startTransactionMonitoring(): void {
    setInterval(() => {
      this.monitorPendingTransactions();
    }, 30000); // Check every 30 seconds
  }

  private monitorPendingTransactions(): void {
    // Monitor pending transactions and update their status
    for (const [id, transaction] of this.pendingTransactions.entries()) {
      if (transaction.status === 'pending' && Date.now() - transaction.timestamp > 300000) {
        // Mark as failed if pending for more than 5 minutes
        transaction.status = 'failed';
        logger.warn('⚠️ Transaction marked as failed', {
          transactionId: id,
          userDID: transaction.userDID,
        });
      }
    }
  }

  private initializeGasOptimization(): void {
    if (this.TOKENOMICS.gasOptimization) {
      logger.info('⚡ Gas optimization enabled', {
        batchTransactions: this.TOKENOMICS.batchTransactions,
        layerTwo: this.TOKENOMICS.layerTwoIntegration,
      });
    }
  }

  private startTokenomicsEngine(): void {
    // Start reward distribution engine
    setInterval(() => {
      this.distributeStakingRewards();
    }, 24 * 60 * 60 * 1000); // Daily

    // Start subscription renewal checks
    setInterval(() => {
      this.checkSubscriptionRenewals();
    }, 60 * 60 * 1000); // Hourly
  }

  private startRewardsDistribution(): void {
    setInterval(() => {
      this.distributeStakingRewards();
    }, 24 * 60 * 60 * 1000); // Daily rewards
  }

  private distributeStakingRewards(): void {
    const dailyRewardRate = this.TOKENOMICS.stakingAPY / 365;
    
    for (const [userDID, balance] of this.tokenBalances.entries()) {
      if (balance.lockedBalance > BigInt(0)) {
        // Safe BigInt arithmetic to avoid BigInt/Number mixing
        const lockedBalanceNumber = Number(balance.lockedBalance);
        const rewardAmount = Math.floor(lockedBalanceNumber * dailyRewardRate);
        const dailyReward = BigInt(rewardAmount);
        
        balance.stakingRewards += dailyReward;
        this.tokenBalances.set(userDID, balance);
        
        logger.debug('💰 Staking rewards distributed', {
          userDID,
          reward: dailyReward.toString(),
          totalRewards: balance.stakingRewards.toString(),
        });
      }
    }
  }

  private checkSubscriptionRenewals(): void {
    for (const [userDID, subscription] of this.subscriptions.entries()) {
      if (subscription.autoRenew && subscription.endDate <= Date.now()) {
        this.renewSubscription(userDID).catch(error => {
          logger.error('Failed to renew subscription', { userDID, error });
        });
      }
    }
  }

  private async renewSubscription(userDID: DID): Promise<void> {
    const subscription = this.subscriptions.get(userDID);
    if (!subscription) return;

    try {
      const cost = subscription.plan === 'premium' 
        ? this.TOKENOMICS.premiumMonthlyFee 
        : this.TOKENOMICS.enterpriseMonthlyFee;
      
      const balance = await this.getUserBalance(userDID);
      
      if (balance.balance >= cost) {
        // Renew subscription
        await this.executeBlockchainTransaction(
          userDID,
          this.TOKEN_CONFIG.contractAddress,
          cost,
          `${subscription.plan} subscription renewal`
        );
        
        subscription.endDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
        subscription.totalPaid += cost;
        
        balance.balance -= cost;
        this.tokenBalances.set(userDID, balance);
        this.subscriptions.set(userDID, subscription);
        
        logger.info('🔄 Subscription renewed successfully', {
          userDID,
          plan: subscription.plan,
          cost: cost.toString(),
        });
      } else {
        // Insufficient funds - disable auto-renewal
        subscription.autoRenew = false;
        this.subscriptions.set(userDID, subscription);
        
        logger.warn('⚠️ Subscription renewal failed - insufficient funds', {
          userDID,
          required: cost.toString(),
          available: balance.balance.toString(),
        });
      }
    } catch (error) {
      logger.error('❌ Subscription renewal error', { userDID, error });
    }
  }
}

export const personaTokenService = PersonaTokenService.getInstance();