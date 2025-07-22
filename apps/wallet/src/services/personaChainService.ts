/**
 * PersonaChain Service - Real Blockchain Integration
 * Connects to running PersonaChain with Cosmos SDK standards
 */

import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { coins, GasPrice } from "@cosmjs/stargate";

import { configService } from '../config';
import { errorService } from "@/services/errorService";
import { blockchainDIDService } from "./blockchainDIDService";

export interface PersonaChainConfig {
  chainId: string;
  rpcEndpoint: string;
  restEndpoint: string;
  gasPrice: string;
  bech32Prefix: string;
}

export interface DIDDocument {
  id: string;
  controller: string;
  verificationMethod: VerificationMethod[];
  created: string;
  updated?: string;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyBase58?: string;
  publicKeyJwk?: any;
}

export interface PersonaWallet {
  address: string;
  did: string;
  publicKey: string;
  mnemonic?: string;
}

export class PersonaChainService {
  private config: PersonaChainConfig;
  private client?: SigningCosmWasmClient;

  constructor() {
    try {
      const personaChainConfig = configService.getPersonaChainConfig();
      this.config = {
        chainId: personaChainConfig.chainId,
        rpcEndpoint: personaChainConfig.rpcUrl,
        restEndpoint: personaChainConfig.restUrl,
        gasPrice: personaChainConfig.gasPrice,
        bech32Prefix: personaChainConfig.bech32Prefix,
      };
    } catch (error) {
      console.warn('Configuration service not available, using fallback values:', error);
      this.config = {
        chainId: "personachain-1",
        rpcEndpoint: "https://personachain-prod.uc.r.appspot.com",
        restEndpoint: "https://personachain-prod.uc.r.appspot.com/api",
        gasPrice: "0.025persona",
        bech32Prefix: "persona",
      };
    }
  }

  /**
   * Check if Keplr wallet is already connected and approved
   */
  async isWalletConnected(): Promise<{ connected: boolean; wallet?: PersonaWallet }> {
    try {
      if (!window.keplr) {
        return { connected: false };
      }

      // Check if chain is already enabled
      const chainId = this.config.chainId;
      const key = await window.keplr.getKey(chainId);
      
      if (key) {
        // Wallet is connected, return wallet info
        const wallet: PersonaWallet = {
          address: key.bech32Address,
          did: `did:personachain:testnet:${key.bech32Address}`,
          publicKey: btoa(String.fromCharCode(...key.pubKey)),
        };
        
        return { connected: true, wallet };
      }
      
      return { connected: false };
    } catch (error) {
      // If getKey throws, wallet is not connected/approved
      console.log('Wallet not connected or approved:', error);
      return { connected: false };
    }
  }

  // Production-only service - no demo mode

  /**
   * Check if a wallet address already has a DID associated with it
   */
  async checkExistingDID(address: string): Promise<string | null> {
    try {
      console.log("[BLOCKCHAIN] Checking for existing DID for address:", address);
      
      // Use the new blockchain DID service for real blockchain lookup
      const blockchainDID = await blockchainDIDService.findDIDByWalletAddress(address);
      
      if (blockchainDID) {
        console.log(`[BLOCKCHAIN] Found DID on blockchain: ${blockchainDID}`);
        return blockchainDID;
      }

      console.log(`[BLOCKCHAIN] No DID found on blockchain for address: ${address}`);
      return null;
    } catch (error) {
      errorService.logError("Failed to check existing DID:", error);
      return null;
    }
  }

  /**
   * Connect to PersonaChain using Keplr wallet
   */
  async connectKeplr(): Promise<PersonaWallet | null> {
    try {
      if (!window.keplr) {
        throw new Error(
          "Keplr wallet not found. Please install Keplr extension.",
        );
      }

      // Register PersonaChain with Keplr if not already added
      await this.suggestChainToKeplr();

      // Request connection
      await window.keplr.enable(this.config.chainId);

      // Get signing client
      const offlineSigner = window.keplr.getOfflineSigner(this.config.chainId);
      const accounts = await offlineSigner.getAccounts();

      if (accounts.length === 0) {
        throw new Error("No accounts found in Keplr wallet");
      }

      const account = accounts[0];

      this.client = await SigningCosmWasmClient.connectWithSigner(
        this.config.rpcEndpoint,
        offlineSigner,
        {
          gasPrice: GasPrice.fromString(this.config.gasPrice),
        },
      );

      // Generate DID from public key
      const did = await this.generateDIDFromPublicKey(account.pubkey);

      return {
        address: account.address,
        did,
        publicKey: btoa(String.fromCharCode(...account.pubkey)),
      };
    } catch (error) {
      errorService.logError("Failed to connect to Keplr:", error);
      return null;
    }
  }

  /**
   * Create a new wallet with seed phrase (for onboarding)
   */
  async createWallet(mnemonic?: string): Promise<PersonaWallet> {
    try {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
        mnemonic || DirectSecp256k1HdWallet.generate(),
        {
          prefix: this.config.bech32Prefix,
        },
      );

      const accounts = await wallet.getAccounts();
      const account = accounts[0];

      // Generate DID from public key
      const did = await this.generateDIDFromPublicKey(account.pubkey);

      return {
        address: account.address,
        did,
        publicKey: Buffer.from(account.pubkey).toString("base64"),
        mnemonic: mnemonic,
      };
    } catch (error) {
      errorService.logError("Failed to create wallet:", error);
      throw error;
    }
  }

  /**
   * Create DID on PersonaChain blockchain
   */
  async createDIDOnChain(wallet: PersonaWallet): Promise<string> {
    try {
      // Production blockchain DID creation
      const txHash = await this.createRealBlockchainDID(wallet);
      return txHash;
    } catch (error) {
      errorService.logError("Failed to create DID on chain:", error);
      throw error;
    }
  }

  /**
   * Create DID on PersonaChain blockchain using Cosmos SDK
   */
  private async createRealBlockchainDID(wallet: PersonaWallet): Promise<string> {
    try {
      if (!this.client) {
        throw new Error("Cosmos client not initialized. Connect wallet first.");
      }

      // Create DID document
      const didDocument = {
        id: wallet.did,
        controller: wallet.address,
        verificationMethod: [{
          id: `${wallet.did}#key-1`,
          type: "Ed25519VerificationKey2020",
          controller: wallet.did,
          publicKeyBase58: wallet.publicKey,
        }],
        created: new Date().toISOString(),
      };

      // Create transaction to store DID on PersonaChain
      const msg = {
        typeUrl: "/personachain.did.MsgCreateDIDDocument",
        value: {
          creator: wallet.address,
          didDocument: didDocument,
          metadata: {
            ipAddress: "",
            userAgent: "PersonaPass/1.0.0",
          },
        },
      };

      const fee = {
        amount: coins(100000, "persona"),
        gas: "200000",
      };

      const result = await this.client.signAndBroadcast(
        wallet.address,
        [msg],
        fee,
        "Create DID Document on PersonaChain",
      );

      if (result.code !== 0) {
        throw new Error(`Transaction failed: ${result.rawLog}`);
      }

      console.log('✅ DID created on PersonaChain:', result.transactionHash);
      
      // Store record locally for quick access (not as simulation but as cache)
      const didRecord = {
        did: wallet.did,
        controller: wallet.address,
        document: JSON.stringify(didDocument),
        created: Date.now(),
        txHash: result.transactionHash,
        network: 'PersonaChain',
        blockHeight: result.height,
      };

      // Cache in localStorage for performance
      const existingDIDs = JSON.parse(localStorage.getItem('blockchain_dids') || '[]');
      existingDIDs.push(didRecord);
      localStorage.setItem('blockchain_dids', JSON.stringify(existingDIDs));
      localStorage.setItem(`did_record_${wallet.did}`, JSON.stringify(didRecord));

      return result.transactionHash;
      
    } catch (error) {
      errorService.logError('Failed to create DID on PersonaChain blockchain:', error);
      throw new Error(`Blockchain DID creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query DID from PersonaChain blockchain
   */
  async queryDID(didId: string): Promise<DIDDocument | null> {
    try {
      // First check local cache for performance
      const localDIDRecord = localStorage.getItem(`did_record_${didId}`);
      if (localDIDRecord) {
        const record = JSON.parse(localDIDRecord);
        console.log('✅ Found DID in local cache:', record.txHash);
        return JSON.parse(record.document);
      }

      // Query PersonaChain blockchain using multiple endpoints
      const queryEndpoints = [
        `${this.config.restEndpoint}/persona_chain/did/v1/did_document/${encodeURIComponent(didId)}`,
        `${this.config.rpcEndpoint}/abci_query?path="/personachain.did.Query/Did"&data="${encodeURIComponent(didId)}"`,
      ];

      for (const endpoint of queryEndpoints) {
        try {
          console.log(`🔍 Querying DID from: ${endpoint}`);
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Handle different response formats from PersonaChain
            if (data.did && data.did.didDocument) {
              const didDocument = typeof data.did.didDocument === 'string' 
                ? JSON.parse(data.did.didDocument) 
                : data.did.didDocument;
              
              console.log('✅ Found DID on PersonaChain blockchain');
              return didDocument;
            } else if (data.result && data.result.response && data.result.response.value) {
              // Handle RPC response format
              const decoded = atob(data.result.response.value);
              const didDocument = JSON.parse(decoded);
              
              console.log('✅ Found DID via RPC query');
              return didDocument;
            } else if (data.didDocument) {
              // Direct DID document response
              const didDocument = typeof data.didDocument === 'string' 
                ? JSON.parse(data.didDocument) 
                : data.didDocument;
              
              console.log('✅ Found DID document directly');
              return didDocument;
            }
          } else {
            console.warn(`❌ Query failed at ${endpoint}: ${response.status} ${response.statusText}`);
          }
        } catch (endpointError) {
          console.warn(`❌ Failed to query from ${endpoint}:`, endpointError);
          continue;
        }
      }

      console.log(`❌ DID not found on PersonaChain: ${didId}`);
      return null;
    } catch (error) {
      errorService.logError("Failed to query DID from PersonaChain:", error);
      return null;
    }
  }

  /**
   * Generate W3C-compliant DID from public key
   */
  private async generateDIDFromPublicKey(
    publicKey: Uint8Array,
  ): Promise<string> {
    // Use first 16 bytes of public key hash as identifier
    const encoder = new TextEncoder();
    const data = encoder.encode(Buffer.from(publicKey).toString("base64"));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Convert to base64url manually since Node.js Buffer doesn't support it directly
    const identifier = Buffer.from(hashArray.slice(0, 16))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return `did:personachain:mainnet:${identifier}`;
  }

  /**
   * Suggest PersonaChain to Keplr wallet
   */
  private async suggestChainToKeplr(): Promise<void> {
    const chainInfo = {
      chainId: this.config.chainId,
      chainName: "PersonaChain",
      rpc: this.config.rpcEndpoint,
      rest: this.config.restEndpoint,
      bip44: {
        coinType: 7564153, // Unique coin type for PersonaChain
      },
      bech32Config: {
        bech32PrefixAccAddr: this.config.bech32Prefix,
        bech32PrefixAccPub: `${this.config.bech32Prefix}pub`,
        bech32PrefixValAddr: `${this.config.bech32Prefix}valoper`,
        bech32PrefixValPub: `${this.config.bech32Prefix}valoperpub`,
        bech32PrefixConsAddr: `${this.config.bech32Prefix}valcons`,
        bech32PrefixConsPub: `${this.config.bech32Prefix}valconspub`,
      },
      currencies: [
        {
          coinDenom: "PERSONA",
          coinMinimalDenom: "persona",
          coinDecimals: 6,
        },
      ],
      feeCurrencies: [
        {
          coinDenom: "PERSONA",
          coinMinimalDenom: "persona",
          coinDecimals: 6,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      stakeCurrency: {
        coinDenom: "PERSONA",
        coinMinimalDenom: "persona",
        coinDecimals: 6,
      },
    };

    await window.keplr.experimentalSuggestChain(chainInfo);
  }

  /**
   * Check if PersonaChain is running and accessible
   */
  async checkBlockchainHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.rpcEndpoint}/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const isHealthy = data?.result?.sync_info?.catching_up === false;
      
      console.log('✅ PersonaChain Health Check:', {
        healthy: isHealthy,
        blockHeight: data?.result?.sync_info?.latest_block_height,
        network: data?.result?.node_info?.network
      });
      
      return isHealthy;
    } catch (error) {
      errorService.logError("❌ Blockchain health check failed:", error);
      return false;
    }
  }

  /**
   * Get current block height
   */
  async getCurrentBlockHeight(): Promise<number> {
    try {
      const response = await fetch(`${this.config.rpcEndpoint}/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const height = parseInt(data?.result?.sync_info?.latest_block_height || "0");
      
      console.log('📊 Current Block Height:', height);
      return height;
    } catch (error) {
      errorService.logError("❌ Failed to get block height:", error);
      return 0;
    }
  }
}

// Extend Window interface for Keplr
declare global {
  interface Window {
    keplr: any;
  }
}

export const personaChainService = new PersonaChainService();
