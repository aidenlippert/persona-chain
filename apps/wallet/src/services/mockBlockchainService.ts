/**
 * Mock Blockchain Service for Development
 * Provides working blockchain functionality without SSL issues
 */

interface DIDDocument {
  id: string;
  controller: string;
  verificationMethod: any[];
  authentication: any[];
  service: any[];
  created: string;
  updated: string;
}

export class MockBlockchainService {
  private static instance: MockBlockchainService;
  private didCache = new Map<string, DIDDocument>();

  static getInstance(): MockBlockchainService {
    if (!MockBlockchainService.instance) {
      MockBlockchainService.instance = new MockBlockchainService();
    }
    return MockBlockchainService.instance;
  }

  async queryDID(did: string): Promise<DIDDocument | null> {
    console.log('🔍 Querying DID from mock blockchain:', did);
    
    // Check cache first
    if (this.didCache.has(did)) {
      console.log('✅ DID found in cache');
      return this.didCache.get(did)!;
    }

    // Simulate blockchain query delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create mock DID document
    const didDoc: DIDDocument = {
      id: did,
      controller: did,
      verificationMethod: [
        {
          id: `${did}#key-1`,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase: "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
        }
      ],
      authentication: [`${did}#key-1`],
      service: [
        {
          id: `${did}#PersonaPassService`,
          type: "PersonaPassService",
          serviceEndpoint: "https://personapass.xyz/services/did"
        }
      ],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    // Cache the DID document
    this.didCache.set(did, didDoc);
    
    console.log('✅ Mock DID document created and cached');
    return didDoc;
  }

  async registerDID(did: string, document: DIDDocument): Promise<{ success: boolean; txHash: string }> {
    console.log('📝 Registering DID on mock blockchain:', did);
    
    // Simulate blockchain registration delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Cache the DID document
    this.didCache.set(did, document);
    
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    console.log('✅ DID registered successfully. Tx Hash:', txHash);
    
    return {
      success: true,
      txHash
    };
  }

  async verifyCredential(did: string, txHash: string): Promise<boolean> {
    console.log('🔍 Verifying credential on mock blockchain:', { did, txHash });
    
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if DID exists in cache
    const exists = this.didCache.has(did);
    console.log(exists ? '✅ Credential verified' : '❌ Credential not found');
    
    return exists;
  }

  async getNetworkInfo(): Promise<{ network: string; chainId: string; status: string }> {
    return {
      network: "PersonaChain Mock Network",
      chainId: "persona-mock-1",
      status: "healthy"
    };
  }
}

export const mockBlockchainService = MockBlockchainService.getInstance();