/**
 * Smart Contract Service for PersonaPass
 * Handles interaction with deployed Polygon contracts
 */

import { ethers } from 'ethers';
import { errorService } from "@/services/errorService";

// Contract addresses (will be updated after deployment)
export const CONTRACT_ADDRESSES = {
  PERSONA_TOKEN: process.env.VITE_PERSONA_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000001',
  PERS_TOKEN: process.env.VITE_PERS_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000002',
  PERS_STAKING: process.env.VITE_PERS_STAKING_ADDRESS || '0x0000000000000000000000000000000000000003',
  PERS_REWARDS: process.env.VITE_PERS_REWARDS_ADDRESS || '0x0000000000000000000000000000000000000004'
};

// Network configuration
export const POLYGON_NETWORK = {
  chainId: 137,
  name: 'Polygon Mainnet',
  rpcUrl: process.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com',
  blockExplorer: 'https://polygonscan.com',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  }
};

// Contract ABIs (simplified for key functions)
export const CONTRACT_ABIS = {
  PERSONA_TOKEN: [
    'function purchaseWithETH() external payable',
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function getCurrentPrice() view returns (uint256)',
    'function getPurchaseLimits() view returns (uint256 min, uint256 max)'
  ],
  PERS_TOKEN: [
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function getClaimableTeamTokens() view returns (uint256)',
    'function totalSupply() view returns (uint256)'
  ],
  PERS_STAKING: [
    'function stake(uint256 amount) external',
    'function unstake(uint256 amount) external',
    'function claimRewards() external',
    'function getStakedAmount(address user) view returns (uint256)',
    'function getPendingRewards(address user) view returns (uint256)'
  ],
  PERS_REWARDS: [
    'function claimReward(address user) external',
    'function getRewardBalance(address user) view returns (uint256)',
    'function getTotalRewardsDistributed() view returns (uint256)'
  ]
};

export interface TokenBalance {
  formatted: string;
  raw: ethers.BigNumber;
  symbol: string;
}

export interface StakingInfo {
  stakedAmount: TokenBalance;
  pendingRewards: TokenBalance;
  apy: number;
}

export interface ContractError {
  code: string;
  message: string;
  transaction?: string;
}

export class ContractService {
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contracts: Record<string, ethers.Contract> = {};

  /**
   * Initialize contract service with provider
   */
  async initialize(provider?: ethers.providers.Provider): Promise<void> {
    try {
      if (provider) {
        this.provider = provider;
      } else if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
      } else {
        // Fallback to read-only provider
        this.provider = new ethers.providers.JsonRpcProvider(POLYGON_NETWORK.rpcUrl);
      }

      // Initialize contracts
      this.initializeContracts();
      
      console.log('✅ Contract service initialized');
    } catch (error) {
      errorService.logError('❌ Failed to initialize contract service:', error);
      throw new ContractError('INIT_FAILED', 'Failed to initialize contract service');
    }
  }

  /**
   * Initialize contract instances
   */
  private initializeContracts(): void {
    if (!this.provider) throw new Error('Provider not initialized');

    this.contracts = {
      personaToken: new ethers.Contract(
        CONTRACT_ADDRESSES.PERSONA_TOKEN,
        CONTRACT_ABIS.PERSONA_TOKEN,
        this.signer || this.provider
      ),
      persToken: new ethers.Contract(
        CONTRACT_ADDRESSES.PERS_TOKEN,
        CONTRACT_ABIS.PERS_TOKEN,
        this.signer || this.provider
      ),
      persStaking: new ethers.Contract(
        CONTRACT_ADDRESSES.PERS_STAKING,
        CONTRACT_ABIS.PERS_STAKING,
        this.signer || this.provider
      ),
      persRewards: new ethers.Contract(
        CONTRACT_ADDRESSES.PERS_REWARDS,
        CONTRACT_ABIS.PERS_REWARDS,
        this.signer || this.provider
      )
    };
  }

  /**
   * Get token balance for address
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<TokenBalance> {
    try {
      const contract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'],
        this.provider!
      );

      const balance = await contract.balanceOf(userAddress);
      const symbol = await contract.symbol().catch(() => 'TOKEN');

      return {
        formatted: ethers.utils.formatEther(balance),
        raw: balance,
        symbol
      };
    } catch (error) {
      errorService.logError('Failed to get token balance:', error);
      throw new ContractError('BALANCE_FAILED', 'Failed to get token balance');
    }
  }

  /**
   * Purchase PersonaPass tokens with MATIC
   */
  async purchasePersonaTokens(maticAmount: string): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for transactions');

      const contract = this.contracts.personaToken.connect(this.signer);
      const value = ethers.utils.parseEther(maticAmount);
      
      const tx = await contract.purchaseWithETH({ value, gasLimit: 200000 });
      await tx.wait();
      
      console.log('✅ PSA tokens purchased successfully');
      return tx.hash;
    } catch (error) {
      errorService.logError('Failed to purchase tokens:', error);
      throw new ContractError('PURCHASE_FAILED', 'Failed to purchase tokens');
    }
  }

  /**
   * Stake PERS tokens
   */
  async stakePERSTokens(amount: string): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for transactions');

      const stakingContract = this.contracts.persStaking.connect(this.signer);
      const persContract = this.contracts.persToken.connect(this.signer);
      
      // First approve the staking contract
      const approveAmount = ethers.utils.parseEther(amount);
      const approveTx = await persContract.approve(CONTRACT_ADDRESSES.PERS_STAKING, approveAmount);
      await approveTx.wait();
      
      // Then stake the tokens
      const stakeTx = await stakingContract.stake(approveAmount, { gasLimit: 150000 });
      await stakeTx.wait();
      
      console.log('✅ PERS tokens staked successfully');
      return stakeTx.hash;
    } catch (error) {
      errorService.logError('Failed to stake tokens:', error);
      throw new ContractError('STAKE_FAILED', 'Failed to stake tokens');
    }
  }

  /**
   * Get staking information for user
   */
  async getStakingInfo(userAddress: string): Promise<StakingInfo> {
    try {
      const stakingContract = this.contracts.persStaking;
      
      const [stakedAmount, pendingRewards] = await Promise.all([
        stakingContract.getStakedAmount(userAddress),
        stakingContract.getPendingRewards(userAddress)
      ]);

      return {
        stakedAmount: {
          formatted: ethers.utils.formatEther(stakedAmount),
          raw: stakedAmount,
          symbol: 'PERS'
        },
        pendingRewards: {
          formatted: ethers.utils.formatEther(pendingRewards),
          raw: pendingRewards,
          symbol: 'PERS'
        },
        apy: 12.5 // Mock APY - would be calculated from contract data
      };
    } catch (error) {
      errorService.logError('Failed to get staking info:', error);
      throw new ContractError('STAKING_INFO_FAILED', 'Failed to get staking information');
    }
  }

  /**
   * Claim staking rewards
   */
  async claimRewards(): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for transactions');

      const stakingContract = this.contracts.persStaking.connect(this.signer);
      const tx = await stakingContract.claimRewards({ gasLimit: 100000 });
      await tx.wait();
      
      console.log('✅ Rewards claimed successfully');
      return tx.hash;
    } catch (error) {
      errorService.logError('Failed to claim rewards:', error);
      throw new ContractError('CLAIM_FAILED', 'Failed to claim rewards');
    }
  }

  /**
   * Get current token price
   */
  async getPersonaTokenPrice(): Promise<string> {
    try {
      const contract = this.contracts.personaToken;
      const price = await contract.getCurrentPrice();
      return ethers.utils.formatEther(price);
    } catch (error) {
      errorService.logError('Failed to get token price:', error);
      return '0.001'; // Fallback price
    }
  }

  /**
   * Switch to Polygon network
   */
  async switchToPolygon(): Promise<void> {
    try {
      if (!window.ethereum) throw new Error('MetaMask not detected');

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }] // Polygon mainnet
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        await this.addPolygonNetwork();
      } else {
        throw new ContractError('NETWORK_SWITCH_FAILED', 'Failed to switch to Polygon network');
      }
    }
  }

  /**
   * Add Polygon network to MetaMask
   */
  private async addPolygonNetwork(): Promise<void> {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x89',
          chainName: 'Polygon Mainnet',
          nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
          },
          rpcUrls: ['https://polygon-rpc.com'],
          blockExplorerUrls: ['https://polygonscan.com']
        }]
      });
    } catch (error) {
      throw new ContractError('ADD_NETWORK_FAILED', 'Failed to add Polygon network');
    }
  }

  /**
   * Get contract addresses for frontend
   */
  getContractAddresses(): typeof CONTRACT_ADDRESSES {
    return CONTRACT_ADDRESSES;
  }

  /**
   * Check if contracts are deployed (not mock addresses)
   */
  isDeployed(): boolean {
    return !Object.values(CONTRACT_ADDRESSES).some(addr => 
      addr.startsWith('0x0000000000000000000000000000000000000')
    );
  }
}

// Create singleton instance
export const contractService = new ContractService();

// Helper function to handle contract errors
export function handleContractError(error: unknown): ContractError {
  if (error instanceof ContractError) {
    return error;
  }
  
  const message = error instanceof Error ? error.message : 'Unknown contract error';
  return new ContractError('CONTRACT_ERROR', message);
}

export default contractService;