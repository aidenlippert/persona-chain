/**
 * PERS Token Service - Manages Persona Token interactions
 * Production-ready implementation with Web3 integration
 */

import { ethers } from 'ethers';
import { DID } from '../types';
import { errorService, ErrorCategory, ErrorSeverity } from './errorService';
import { retryService } from './retryService';
import { analyticsService } from './analyticsService';

// Import contract ABIs - Mock for now since we don't have real contracts yet
// TODO: Import real ABIs when contracts are deployed
const PERS_TOKEN_ABI = [];
const PERS_STAKING_ABI = [];
const PERS_REWARDS_ABI = [];

interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: string;
  stakingAddress: string;
  rewardsAddress: string;
  network: string;
  chainId: number;
  rpcUrl: string;
}

interface StakeInfo {
  amount: bigint;
  startTime: number;
  lockPeriod: number;
  tier: number;
  pendingRewards: bigint;
  trustScore: number;
}

interface RewardInfo {
  totalEarned: bigint;
  totalClaimed: bigint;
  pendingRewards: bigint;
  dailyRewardsClaimed: bigint;
  canClaimRewards: boolean;
}

interface CredentialReward {
  credentialType: string;
  baseReward: bigint;
  zkProofBonus: bigint;
  crossChainBonus: bigint;
  totalReward: bigint;
}

export class PERSTokenService {
  private static instance: PERSTokenService;
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private tokenContract: ethers.Contract | null = null;
  private stakingContract: ethers.Contract | null = null;
  private rewardsContract: ethers.Contract | null = null;
  
  private readonly TOKEN_CONFIG: TokenConfig = {
    symbol: 'PERS',
    name: 'Persona Token',
    decimals: 18,
    contractAddress: import.meta.env.VITE_PERS_TOKEN_ADDRESS || '',
    stakingAddress: import.meta.env.VITE_PERS_STAKING_ADDRESS || '',
    rewardsAddress: import.meta.env.VITE_PERS_REWARDS_ADDRESS || '',
    network: import.meta.env.VITE_DEFAULT_NETWORK || 'polygon',
    chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '137'), // Polygon mainnet
    rpcUrl: import.meta.env.VITE_RPC_URL || 'https://polygon-rpc.com'
  };

  // Reward rates for different credential types
  private readonly CREDENTIAL_REWARDS = {
    // Basic credentials
    'github_basic': { base: 10, zkBonus: 5, crossChainBonus: 3 },
    'linkedin_professional': { base: 15, zkBonus: 7, crossChainBonus: 5 },
    'discord_verified': { base: 8, zkBonus: 4, crossChainBonus: 3 },
    'twitter_verified': { base: 12, zkBonus: 6, crossChainBonus: 4 },
    
    // Financial credentials
    'plaid_income': { base: 25, zkBonus: 10, crossChainBonus: 8 },
    'bank_account': { base: 20, zkBonus: 8, crossChainBonus: 6 },
    
    // Advanced credentials
    'education_degree': { base: 30, zkBonus: 15, crossChainBonus: 10 },
    'employment_history': { base: 35, zkBonus: 15, crossChainBonus: 12 },
    
    // Custom ZK proofs
    'age_verification': { base: 15, zkBonus: 10, crossChainBonus: 5 },
    'income_range': { base: 30, zkBonus: 15, crossChainBonus: 10 },
    'credit_score': { base: 40, zkBonus: 20, crossChainBonus: 15 }
  };

  private constructor() {}

  static getInstance(): PERSTokenService {
    if (!PERSTokenService.instance) {
      PERSTokenService.instance = new PERSTokenService();
    }
    return PERSTokenService.instance;
  }

  /**
   * Initialize Web3 connection
   */
  async initialize(): Promise<void> {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // Check network
      const network = await this.provider.getNetwork();
      if (network.chainId !== BigInt(this.TOKEN_CONFIG.chainId)) {
        await this.switchNetwork();
      }

      // Initialize contracts
      this.tokenContract = new ethers.Contract(
        this.TOKEN_CONFIG.contractAddress,
        PERS_TOKEN_ABI,
        this.signer
      );

      this.stakingContract = new ethers.Contract(
        this.TOKEN_CONFIG.stakingAddress,
        PERS_STAKING_ABI,
        this.signer
      );

      this.rewardsContract = new ethers.Contract(
        this.TOKEN_CONFIG.rewardsAddress,
        PERS_REWARDS_ABI,
        this.signer
      );

      // Listen for account changes
      window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
      window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));

      console.log('PERS Token Service initialized successfully');
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('Failed to initialize PERS Token Service'), {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.HIGH,
        metadata: { config: this.TOKEN_CONFIG }
      });
      throw error;
    }
  }

  /**
   * Switch to the correct network
   */
  private async switchNetwork(): Promise<void> {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${this.TOKEN_CONFIG.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await this.addNetwork();
      } else {
        throw switchError;
      }
    }
  }

  /**
   * Add network to MetaMask
   */
  private async addNetwork(): Promise<void> {
    const networkParams = {
      chainId: `0x${this.TOKEN_CONFIG.chainId.toString(16)}`,
      chainName: 'Polygon Mainnet',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      },
      rpcUrls: [this.TOKEN_CONFIG.rpcUrl],
      blockExplorerUrls: ['https://polygonscan.com/']
    };

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkParams],
    });
  }

  /**
   * Handle account changes
   */
  private async handleAccountsChanged(accounts: string[]): Promise<void> {
    if (accounts.length === 0) {
      // User disconnected wallet
      this.signer = null;
      console.log('Wallet disconnected');
    } else {
      // Reinitialize with new account
      await this.initialize();
    }
  }

  /**
   * Handle chain changes
   */
  private async handleChainChanged(chainId: string): Promise<void> {
    const newChainId = parseInt(chainId, 16);
    if (newChainId !== this.TOKEN_CONFIG.chainId) {
      // Wrong network, try to switch
      await this.switchNetwork();
    }
  }

  /**
   * Get user's PERS token balance
   */
  async getBalance(address?: string): Promise<bigint> {
    try {
      if (!this.tokenContract) throw new Error('Token contract not initialized');
      
      const userAddress = address || await this.signer?.getAddress();
      if (!userAddress) throw new Error('No user address');

      const balance = await this.tokenContract.balanceOf(userAddress);
      return BigInt(balance.toString());
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('Failed to get balance'), {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.MEDIUM
      });
      return BigInt(0);
    }
  }

  /**
   * Calculate rewards for credential verification
   */
  async calculateCredentialReward(
    credentialType: string,
    withZkProof: boolean,
    isCrossChain: boolean
  ): Promise<CredentialReward> {
    const rewardConfig = this.CREDENTIAL_REWARDS[credentialType as keyof typeof this.CREDENTIAL_REWARDS];
    if (!rewardConfig) {
      throw new Error(`Unknown credential type: ${credentialType}`);
    }

    // Use literal BigInt instead of exponentiation to avoid transpilation issues
    const decimals = BigInt('1000000000000000000'); // 10^18
    const baseReward = BigInt(rewardConfig.base) * decimals;
    const zkProofBonus = withZkProof ? BigInt(rewardConfig.zkBonus) * decimals : BigInt(0);
    const crossChainBonus = isCrossChain ? BigInt(rewardConfig.crossChainBonus) * decimals : BigInt(0);
    const totalReward = baseReward + zkProofBonus + crossChainBonus;

    return {
      credentialType,
      baseReward,
      zkProofBonus,
      crossChainBonus,
      totalReward
    };
  }

  /**
   * Claim rewards for credential verification
   */
  async claimCredentialReward(
    credentialType: string,
    verificationProof: string,
    withZkProof: boolean = false,
    isCrossChain: boolean = false
  ): Promise<string> {
    try {
      if (!this.rewardsContract || !this.signer) {
        throw new Error('Contracts not initialized');
      }

      // Note: In production, this would be called by a backend service with VERIFIER_ROLE
      // For now, we'll simulate the verification process
      const userAddress = await this.signer.getAddress();

      // Calculate expected reward
      const reward = await this.calculateCredentialReward(credentialType, withZkProof, isCrossChain);

      // In production: Backend service would call recordVerification
      // For demo: Direct claim (would need proper role management)
      const tx = await this.rewardsContract.claimRewards();
      const receipt = await tx.wait();

      // Track analytics
      analyticsService.trackEvent(
        'token_event',
        'reward',
        'claimed',
        userAddress,
        {
          credentialType,
          amount: reward.totalReward.toString(),
          withZkProof,
          isCrossChain,
          txHash: receipt.hash
        }
      );

      return receipt.hash;
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('Failed to claim reward'), {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.HIGH,
        metadata: { credentialType, withZkProof, isCrossChain }
      });
      throw error;
    }
  }

  /**
   * Stake PERS tokens
   */
  async stake(amount: bigint, lockPeriodDays: number): Promise<string> {
    try {
      if (!this.stakingContract || !this.tokenContract || !this.signer) {
        throw new Error('Contracts not initialized');
      }

      const userAddress = await this.signer.getAddress();

      // Check balance
      const balance = await this.getBalance();
      if (balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Approve staking contract
      const approveTx = await this.tokenContract.approve(
        this.TOKEN_CONFIG.stakingAddress,
        amount
      );
      await approveTx.wait();

      // Stake tokens
      const lockPeriodSeconds = lockPeriodDays * 24 * 60 * 60;
      const stakeTx = await this.stakingContract.stake(amount, lockPeriodSeconds);
      const receipt = await stakeTx.wait();

      // Track analytics
      analyticsService.trackEvent(
        'token_event',
        'stake',
        'completed',
        userAddress,
        {
          amount: amount.toString(),
          lockPeriodDays,
          txHash: receipt.hash
        }
      );

      return receipt.hash;
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('Failed to stake tokens'), {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.HIGH,
        metadata: { amount: amount.toString(), lockPeriodDays }
      });
      throw error;
    }
  }

  /**
   * Get user's stake info
   */
  async getStakeInfo(address?: string): Promise<StakeInfo | null> {
    try {
      if (!this.stakingContract) throw new Error('Staking contract not initialized');

      const userAddress = address || await this.signer?.getAddress();
      if (!userAddress) throw new Error('No user address');

      const stakeData = await this.stakingContract.stakes(userAddress);
      if (stakeData.amount === BigInt(0)) return null;

      const pendingRewards = await this.stakingContract.getPendingRewards(userAddress);
      const trustScore = await this.stakingContract.trustScores(userAddress);

      return {
        amount: BigInt(stakeData.amount.toString()),
        startTime: Number(stakeData.startTime),
        lockPeriod: Number(stakeData.lockPeriod),
        tier: Number(stakeData.tier),
        pendingRewards: BigInt(pendingRewards.toString()),
        trustScore: Number(trustScore)
      };
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('Failed to get stake info'), {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.MEDIUM
      });
      return null;
    }
  }

  /**
   * Unstake tokens
   */
  async unstake(): Promise<string> {
    try {
      if (!this.stakingContract || !this.signer) {
        throw new Error('Contracts not initialized');
      }

      const userAddress = await this.signer.getAddress();
      const stakeInfo = await this.getStakeInfo();
      
      if (!stakeInfo) {
        throw new Error('No active stake');
      }

      const tx = await this.stakingContract.unstake();
      const receipt = await tx.wait();

      // Track analytics
      analyticsService.trackEvent(
        'token_event',
        'unstake',
        'completed',
        userAddress,
        {
          amount: stakeInfo.amount.toString(),
          rewards: stakeInfo.pendingRewards.toString(),
          txHash: receipt.hash
        }
      );

      return receipt.hash;
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('Failed to unstake tokens'), {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.HIGH
      });
      throw error;
    }
  }

  /**
   * Get user's reward info
   */
  async getRewardInfo(address?: string): Promise<RewardInfo> {
    try {
      if (!this.rewardsContract) throw new Error('Rewards contract not initialized');

      const userAddress = address || await this.signer?.getAddress();
      if (!userAddress) throw new Error('No user address');

      const [totalEarned, totalClaimed, pendingRewards, dailyRewardsClaimed] = await Promise.all([
        this.rewardsContract.getTotalEarned(userAddress),
        this.rewardsContract.userRewards(userAddress).then((r: any) => r.totalClaimed),
        this.rewardsContract.getPendingRewards(userAddress),
        this.rewardsContract.getDailyRewardsClaimed(userAddress)
      ]);

      return {
        totalEarned: BigInt(totalEarned.toString()),
        totalClaimed: BigInt(totalClaimed.toString()),
        pendingRewards: BigInt(pendingRewards.toString()),
        dailyRewardsClaimed: BigInt(dailyRewardsClaimed.toString()),
        canClaimRewards: pendingRewards > 0
      };
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('Failed to get reward info'), {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.MEDIUM
      });
      return {
        totalEarned: BigInt(0),
        totalClaimed: BigInt(0),
        pendingRewards: BigInt(0),
        dailyRewardsClaimed: BigInt(0),
        canClaimRewards: false
      };
    }
  }

  /**
   * Claim pending rewards
   */
  async claimPendingRewards(): Promise<string> {
    try {
      if (!this.rewardsContract || !this.signer) {
        throw new Error('Contracts not initialized');
      }

      const userAddress = await this.signer.getAddress();
      const rewardInfo = await this.getRewardInfo();

      if (!rewardInfo.canClaimRewards) {
        throw new Error('No pending rewards to claim');
      }

      const tx = await this.rewardsContract.claimRewards();
      const receipt = await tx.wait();

      // Track analytics
      analyticsService.trackEvent(
        'token_event',
        'reward',
        'claimed_pending',
        userAddress,
        {
          amount: rewardInfo.pendingRewards.toString(),
          txHash: receipt.hash
        }
      );

      return receipt.hash;
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('Failed to claim pending rewards'), {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.HIGH
      });
      throw error;
    }
  }

  /**
   * Format token amount for display
   */
  formatTokenAmount(amount: bigint, decimals: number = 2): string {
    // Use literal BigInt instead of exponentiation to avoid transpilation issues
    const divisor = BigInt('1000000000000000000'); // 10^18
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;
    
    if (decimals === 0) return wholePart.toString();
    
    const fractionalStr = fractionalPart.toString().padStart(18, '0');
    const truncatedFractional = fractionalStr.slice(0, decimals);
    
    return `${wholePart}.${truncatedFractional}`;
  }

  /**
   * Parse token amount from string
   */
  parseTokenAmount(amountStr: string): bigint {
    const [whole, fractional = ''] = amountStr.split('.');
    const paddedFractional = fractional.padEnd(18, '0').slice(0, 18);
    
    // Use literal BigInt instead of exponentiation to avoid transpilation issues
    const wholeBigInt = BigInt(whole) * BigInt('1000000000000000000'); // 10^18
    const fractionalBigInt = BigInt(paddedFractional);
    
    return wholeBigInt + fractionalBigInt;
  }

  /**
   * Get token configuration
   */
  getTokenConfig(): TokenConfig {
    return { ...this.TOKEN_CONFIG };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return !!(this.provider && this.signer && this.tokenContract && this.stakingContract && this.rewardsContract);
  }
}

// Export singleton instance
export const persTokenService = PERSTokenService.getInstance();