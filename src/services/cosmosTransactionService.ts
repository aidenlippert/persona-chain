import { SigningStargateClient, StargateClient, GasPrice } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { errorService } from './errorService';

/**
 * Cosmos Transaction Service
 * Handles proper transaction submission to PersonaChain using cosmjs
 */
export class CosmosTransactionService {
  private static instance: CosmosTransactionService;
  private rpcEndpoint: string;
  private chainId: string;
  private gasPrice: GasPrice;

  private constructor() {
    this.rpcEndpoint = import.meta.env.VITE_BLOCKCHAIN_RPC || 'https://personachain-prod.uc.r.appspot.com';
    this.chainId = import.meta.env.VITE_CHAIN_ID || 'persona-1';
    this.gasPrice = GasPrice.fromString('0.025upersona');
  }

  public static getInstance(): CosmosTransactionService {
    if (!CosmosTransactionService.instance) {
      CosmosTransactionService.instance = new CosmosTransactionService();
    }
    return CosmosTransactionService.instance;
  }

  /**
   * Submit a DID creation transaction using Keplr
   */
  async submitCreateDIDTransaction(
    didId: string,
    didDocument: any,
    creator: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log(`[COSMOS-TX] Submitting DID creation transaction for: ${didId}`);

      // Check if Keplr is available
      if (typeof window === 'undefined' || !window.keplr) {
        throw new Error('Keplr wallet not available');
      }

      // Enable the chain
      await window.keplr.enable(this.chainId);

      // Get the offline signer
      const offlineSigner = window.keplr.getOfflineSigner(this.chainId);
      const accounts = await offlineSigner.getAccounts();

      if (accounts.length === 0) {
        throw new Error('No accounts found in Keplr');
      }

      const signerAddress = accounts[0].address;
      console.log(`[COSMOS-TX] Signing with address: ${signerAddress}`);

      // Create the signing client
      const client = await SigningStargateClient.connectWithSigner(
        this.rpcEndpoint,
        offlineSigner,
        {
          gasPrice: this.gasPrice,
        }
      );

      // Define the message
      const msgCreateDid = {
        typeUrl: '/persona_chain.did.v1.MsgCreateDid',
        value: {
          creator: signerAddress,
          id: didId,
          didDocument: JSON.stringify(didDocument),
        },
      };

      // Estimate gas
      const gasEstimation = await client.simulate(signerAddress, [msgCreateDid], '');
      const gasLimit = Math.round(gasEstimation * 1.3); // Add 30% buffer

      console.log(`[COSMOS-TX] Estimated gas: ${gasEstimation}, using: ${gasLimit}`);

      // Submit the transaction
      const result = await client.signAndBroadcast(
        signerAddress,
        [msgCreateDid],
        {
          amount: [{ denom: 'upersona', amount: '5000' }],
          gas: gasLimit.toString(),
        },
        `Creating DID: ${didId}`
      );

      console.log(`[COSMOS-TX] Transaction result:`, result);

      if (result.code === 0) {
        console.log(`[COSMOS-TX] DID created successfully with tx hash: ${result.transactionHash}`);
        return {
          success: true,
          txHash: result.transactionHash,
        };
      } else {
        console.error(`[COSMOS-TX] Transaction failed with code ${result.code}: ${result.rawLog}`);
        return {
          success: false,
          error: `Transaction failed: ${result.rawLog}`,
        };
      }
    } catch (error) {
      console.error('[COSMOS-TX] Failed to submit DID creation transaction:', error);
      errorService.logError('Failed to submit DID creation transaction:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit a DID update transaction
   */
  async submitUpdateDIDTransaction(
    didId: string,
    didDocument: any,
    creator: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log(`[COSMOS-TX] Submitting DID update transaction for: ${didId}`);

      if (typeof window === 'undefined' || !window.keplr) {
        throw new Error('Keplr wallet not available');
      }

      await window.keplr.enable(this.chainId);
      const offlineSigner = window.keplr.getOfflineSigner(this.chainId);
      const accounts = await offlineSigner.getAccounts();

      if (accounts.length === 0) {
        throw new Error('No accounts found in Keplr');
      }

      const signerAddress = accounts[0].address;
      const client = await SigningStargateClient.connectWithSigner(
        this.rpcEndpoint,
        offlineSigner,
        { gasPrice: this.gasPrice }
      );

      const msgUpdateDid = {
        typeUrl: '/persona_chain.did.v1.MsgUpdateDid',
        value: {
          creator: signerAddress,
          id: didId,
          didDocument: JSON.stringify(didDocument),
        },
      };

      const gasEstimation = await client.simulate(signerAddress, [msgUpdateDid], '');
      const gasLimit = Math.round(gasEstimation * 1.3);

      const result = await client.signAndBroadcast(
        signerAddress,
        [msgUpdateDid],
        {
          amount: [{ denom: 'upersona', amount: '3000' }],
          gas: gasLimit.toString(),
        },
        `Updating DID: ${didId}`
      );

      if (result.code === 0) {
        console.log(`[COSMOS-TX] DID updated successfully with tx hash: ${result.transactionHash}`);
        return {
          success: true,
          txHash: result.transactionHash,
        };
      } else {
        return {
          success: false,
          error: `Transaction failed: ${result.rawLog}`,
        };
      }
    } catch (error) {
      console.error('[COSMOS-TX] Failed to submit DID update transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit a DID deactivation transaction
   */
  async submitDeactivateDIDTransaction(
    didId: string,
    creator: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log(`[COSMOS-TX] Submitting DID deactivation transaction for: ${didId}`);

      if (typeof window === 'undefined' || !window.keplr) {
        throw new Error('Keplr wallet not available');
      }

      await window.keplr.enable(this.chainId);
      const offlineSigner = window.keplr.getOfflineSigner(this.chainId);
      const accounts = await offlineSigner.getAccounts();

      if (accounts.length === 0) {
        throw new Error('No accounts found in Keplr');
      }

      const signerAddress = accounts[0].address;
      const client = await SigningStargateClient.connectWithSigner(
        this.rpcEndpoint,
        offlineSigner,
        { gasPrice: this.gasPrice }
      );

      const msgDeactivateDid = {
        typeUrl: '/persona_chain.did.v1.MsgDeactivateDid',
        value: {
          creator: signerAddress,
          id: didId,
        },
      };

      const gasEstimation = await client.simulate(signerAddress, [msgDeactivateDid], '');
      const gasLimit = Math.round(gasEstimation * 1.3);

      const result = await client.signAndBroadcast(
        signerAddress,
        [msgDeactivateDid],
        {
          amount: [{ denom: 'upersona', amount: '2000' }],
          gas: gasLimit.toString(),
        },
        `Deactivating DID: ${didId}`
      );

      if (result.code === 0) {
        console.log(`[COSMOS-TX] DID deactivated successfully with tx hash: ${result.transactionHash}`);
        return {
          success: true,
          txHash: result.transactionHash,
        };
      } else {
        return {
          success: false,
          error: `Transaction failed: ${result.rawLog}`,
        };
      }
    } catch (error) {
      console.error('[COSMOS-TX] Failed to submit DID deactivation transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query the chain for connection health
   */
  async checkChainHealth(): Promise<{ isHealthy: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      
      const client = await StargateClient.connect(this.rpcEndpoint);
      const chainInfo = await client.getChainId();
      
      const latency = Date.now() - startTime;
      
      console.log(`[COSMOS-TX] Chain health check successful. Chain ID: ${chainInfo}, Latency: ${latency}ms`);
      
      return {
        isHealthy: true,
        latency,
      };
    } catch (error) {
      console.error('[COSMOS-TX] Chain health check failed:', error);
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(address: string): Promise<{ balance: string; error?: string }> {
    try {
      const client = await StargateClient.connect(this.rpcEndpoint);
      const balance = await client.getBalance(address, 'upersona');
      
      console.log(`[COSMOS-TX] Account balance for ${address}: ${balance.amount} ${balance.denom}`);
      
      return {
        balance: balance.amount,
      };
    } catch (error) {
      console.error('[COSMOS-TX] Failed to get account balance:', error);
      return {
        balance: '0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const cosmosTransactionService = CosmosTransactionService.getInstance();

// Export types for external use
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface ChainHealth {
  isHealthy: boolean;
  latency?: number;
  error?: string;
}

declare global {
  interface Window {
    keplr?: any;
  }
}