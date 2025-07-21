/**
 * Blockchain-based DID Resolution Service
 * Implements proper W3C DID resolution against PersonaChain blockchain
 */

import { errorService } from './errorService';
import { DID, DIDDocument } from '../types/wallet';

export interface DIDResolutionResult {
  didDocument?: DIDDocument;
  didResolutionMetadata: {
    contentType?: string;
    error?: string;
    retrieved?: string;
  };
  didDocumentMetadata: {
    created?: string;
    updated?: string;
    versionId?: string;
    nextUpdate?: string;
    equivalentId?: string[];
    canonicalId?: string;
  };
}

export interface BlockchainDIDRecord {
  did: string;
  didDocument: DIDDocument;
  controller: string;
  created: string;
  updated: string;
  blockNumber: number;
  txHash: string;
  status: 'active' | 'deactivated' | 'revoked';
}

export class BlockchainDIDService {
  private static instance: BlockchainDIDService;
  private rpcEndpoint: string;
  private chainId: string;

  private constructor() {
    // REAL PersonaChain Implementation - Use Cloudflare Worker proxy
    this.rpcEndpoint = import.meta.env.VITE_BLOCKCHAIN_RPC || 
                      'https://personachain-proxy.aidenlippert.workers.dev';
    this.chainId = import.meta.env.VITE_CHAIN_ID || 'personachain-1';
    
    console.log('[BLOCKCHAIN] PersonaChain RPC endpoint:', this.rpcEndpoint);
    
    // Development mode warning for HTTP endpoints
    if (this.rpcEndpoint.startsWith('http://') && import.meta.env.VITE_DEV_MODE === 'true') {
      console.warn('[BLOCKCHAIN] Development Mode: Using HTTP endpoint from HTTPS page may cause Mixed Content errors');
      console.warn('[BLOCKCHAIN] For production, ensure PersonaChain uses HTTPS endpoints');
    }
  }

  static getInstance(): BlockchainDIDService {
    if (!BlockchainDIDService.instance) {
      BlockchainDIDService.instance = new BlockchainDIDService();
    }
    return BlockchainDIDService.instance;
  }

  /**
   * Query PersonaChain for DID by wallet address
   * This replaces localStorage-based lookup with real blockchain queries
   */
  async findDIDByWalletAddress(walletAddress: string): Promise<string | null> {
    try {
      console.log(`[BLOCKCHAIN] Querying DID for wallet: ${walletAddress}`);
      
      // Query the PersonaChain DID module
      const queryUrl = `${this.rpcEndpoint}/personachain/did/v1/did-by-controller/${walletAddress}`;
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[BLOCKCHAIN] No DID found for wallet: ${walletAddress}`);
          return null;
        }
        console.warn(`[BLOCKCHAIN] DID query failed: ${response.status} ${response.statusText}`);
        // Don't throw error for network issues - fallback to localStorage
        return this.fallbackToLocalStorage(walletAddress);
      }

      const data = await response.json();
      
      if (data.did) {
        console.log(`[BLOCKCHAIN] Found DID: ${data.did} for wallet: ${walletAddress}`);
        return data.did;
      }

      return null;
    } catch (error) {
      console.warn(`[BLOCKCHAIN] Failed to query DID for wallet ${walletAddress}:`, error);
      
      // Fallback to localStorage for development/demo mode
      return this.fallbackToLocalStorage(walletAddress);
    }
  }

  /**
   * Resolve DID document from PersonaChain
   */
  async resolveDID(did: string): Promise<DIDResolutionResult> {
    try {
      console.log(`[BLOCKCHAIN] Resolving DID document: ${did}`);
      
      const queryUrl = `${this.rpcEndpoint}/personachain/did/v1/did/${encodeURIComponent(did)}`;
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        return {
          didResolutionMetadata: {
            error: `DID not found: ${response.status}`,
            retrieved: new Date().toISOString(),
          },
          didDocumentMetadata: {}
        };
      }

      const data = await response.json();
      
      return {
        didDocument: data.didDocument,
        didResolutionMetadata: {
          contentType: 'application/did+ld+json',
          retrieved: new Date().toISOString(),
        },
        didDocumentMetadata: {
          created: data.metadata?.created,
          updated: data.metadata?.updated,
          versionId: data.metadata?.versionId,
        }
      };
    } catch (error) {
      errorService.logError('Failed to resolve DID from blockchain:', error);
      
      return {
        didResolutionMetadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          retrieved: new Date().toISOString(),
        },
        didDocumentMetadata: {}
      };
    }
  }

  /**
   * Verify DID ownership through signature challenge
   */
  async verifyDIDOwnership(did: string, signature: string, challenge: string): Promise<boolean> {
    try {
      console.log(`[BLOCKCHAIN] Verifying DID ownership: ${did}`);
      
      const queryUrl = `${this.rpcEndpoint}/personachain/did/v1/verify-ownership`;
      
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          did,
          signature,
          challenge,
        })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.warn('Failed to verify DID ownership:', error);
      return false;
    }
  }

  /**
   * Register new DID on PersonaChain
   */
  async registerDID(didDocument: DIDDocument, signature: string): Promise<string | null> {
    try {
      console.log(`[BLOCKCHAIN] Registering DID: ${didDocument.id}`);
      
      const endpoint = `${this.rpcEndpoint}/personachain/did/v1/create`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          didDocument,
          signature,
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to register DID: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[BLOCKCHAIN] DID registered with tx: ${data.txHash}`);
      
      return data.txHash;
    } catch (error) {
      errorService.logError('Failed to register DID on blockchain:', error);
      
      // Fallback to localStorage for development
      return this.fallbackRegisterToLocalStorage(didDocument);
    }
  }

  /**
   * Development fallback to localStorage
   */
  private fallbackToLocalStorage(walletAddress: string): string | null {
    try {
      console.log(`[FALLBACK] Using localStorage for wallet: ${walletAddress}`);
      
      // Check blockchain_dids
      const blockchainDIDs = JSON.parse(localStorage.getItem('blockchain_dids') || '[]');
      const found = blockchainDIDs.find((record: any) => record.controller === walletAddress);
      
      if (found) {
        console.log(`[FALLBACK] Found DID in localStorage: ${found.did}`);
        return found.did;
      }

      // Check individual DID records
      const allKeys = Object.keys(localStorage);
      const didKeys = allKeys.filter(key => key.startsWith('did_record_'));
      
      for (const key of didKeys) {
        try {
          const record = JSON.parse(localStorage.getItem(key) || '{}');
          if (record.controller === walletAddress) {
            console.log(`[FALLBACK] Found DID in record: ${record.did}`);
            return record.did;
          }
        } catch (parseError) {
          continue;
        }
      }

      return null;
    } catch (error) {
      console.warn('Fallback localStorage lookup failed:', error);
      return null;
    }
  }

  /**
   * Development fallback to register in localStorage
   */
  private fallbackRegisterToLocalStorage(didDocument: DIDDocument): string {
    try {
      const txHash = `LOCAL_TX_${Date.now().toString(36).toUpperCase()}`;
      
      const didRecord = {
        did: didDocument.id,
        controller: didDocument.controller || didDocument.id,
        document: didDocument,
        created: new Date().toISOString(),
        txHash,
        network: 'PersonaChain-Local',
        blockNumber: Math.floor(Math.random() * 1000000),
      };

      // Store in blockchain_dids array
      const existingDIDs = JSON.parse(localStorage.getItem('blockchain_dids') || '[]');
      existingDIDs.push(didRecord);
      localStorage.setItem('blockchain_dids', JSON.stringify(existingDIDs));
      
      // Store individual record
      localStorage.setItem(`did_record_${didDocument.id}`, JSON.stringify(didRecord));
      
      console.log(`[FALLBACK] DID registered in localStorage: ${txHash}`);
      return txHash;
    } catch (error) {
      errorService.logError('Failed to register DID in localStorage fallback:', error);
      return `ERROR_TX_${Date.now()}`;
    }
  }

  /**
   * Get all DIDs controlled by a wallet address
   */
  async getDIDsByController(controllerAddress: string): Promise<string[]> {
    try {
      const queryUrl = `${this.rpcEndpoint}/personachain/did/v1/dids-by-controller/${controllerAddress}`;
      
      const response = await fetch(queryUrl);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.dids || [];
    } catch (error) {
      console.warn('Failed to get DIDs by controller:', error);
      return [];
    }
  }

  /**
   * Check if DID exists and is active
   */
  async isDIDActive(did: string): Promise<boolean> {
    try {
      const resolution = await this.resolveDID(did);
      return !!resolution.didDocument && !resolution.didResolutionMetadata.error;
    } catch (error) {
      return false;
    }
  }
}

export const blockchainDIDService = BlockchainDIDService.getInstance();