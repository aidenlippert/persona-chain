/**
 * Verifiable Credential Manager Service
 * Orchestrates VC creation from multiple API sources with DID integration
 */

import { DIDService } from "./didService";
import { githubVCService } from "./githubVCService";
import { linkedinVCService } from "./linkedinVCService";
import { plaidVCService } from "./plaidVCService";
import { ZKProofService } from "./zkProofService";
import { storageService } from "./storageService";
import type {
  VerifiableCredential,
  WalletCredential,
  DID,
  DIDKeyPair,
  ZKCredential,
} from "../types/wallet";

export interface VCCreationRequest {
  type: "github" | "linkedin" | "plaid" | "custom";
  subtype?: string; // e.g., 'developer', 'professional', 'identity', 'income', 'assets'
  userDID?: DID;
  accessToken: string;
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
    expirationDays?: number;
  };
  zkProofEnabled?: boolean;
}

export interface VCCreationResponse {
  success: boolean;
  credential?: WalletCredential;
  zkCredential?: ZKCredential;
  error?: string;
  verificationData?: {
    proofGenerated: boolean;
    zkCommitment?: string;
    verificationMethod: string;
  };
}

export interface DIDWithVCCapability extends DIDKeyPair {
  vcMetadata: {
    credentialsIssued: number;
    credentialsReceived: number;
    totalVCs: number;
    zkProofsGenerated: number;
    createdAt: string;
    lastUsed: string;
  };
}

export class VCManagerService {
  private userDID: DIDWithVCCapability | null = null;

  /**
   * Initialize or load existing DID for VC operations
   */
  async initializeDID(seedPhrase?: string): Promise<DIDWithVCCapability> {
    try {
      // Ensure storage service is initialized
      if (!storageService) {
        throw new Error('Storage service not available');
      }
      let didKeyPair: DIDKeyPair;

      if (seedPhrase) {
        // Generate deterministic DID from seed
        const didCreationResult = await DIDService.generateDIDFromSeed(seedPhrase);
        if (!didCreationResult.success || !didCreationResult.did) {
          throw new Error('Failed to generate DID from seed: ' + didCreationResult.error);
        }
        didKeyPair = {
          did: didCreationResult.did,
          privateKey: didCreationResult.privateKey!,
          publicKey: didCreationResult.publicKey!,
          document: didCreationResult.document,
        };
      } else {
        // Check if DID exists in storage
        const existingDIDs = await storageService.getAllDIDs();
        if (existingDIDs.length > 0) {
          // Use first available DID with comprehensive safety checks
          const storedDID = existingDIDs[0];
          
          // Safe private key handling
          let privateKeyArray: Uint8Array;
          try {
            if (storedDID?.privateKey instanceof Uint8Array) {
              privateKeyArray = storedDID.privateKey;
            } else if (storedDID?.privateKey && typeof storedDID.privateKey === 'object' && storedDID.privateKey !== null) {
              try {
                // Handle case where privateKey might be a plain object or have unexpected structure
                const keyObj = storedDID.privateKey;
                
                // Check if it's already an array-like object
                if (Array.isArray(keyObj)) {
                  const values = keyObj.filter(v => v != null && typeof v === 'number');
                  privateKeyArray = values.length > 0 ? new Uint8Array(values) : new Uint8Array(32);
                } else if (typeof keyObj === 'object' && keyObj !== null) {
                  // Try to extract values, handling potential undefined properties
                  const values = [];
                  try {
                    const objValues = Object.values(keyObj);
                    for (const val of objValues) {
                      if (val != null && typeof val === 'number') {
                        values.push(val);
                      }
                    }
                  } catch (objError) {
                    console.warn('Error extracting object values from private key:', objError);
                  }
                  privateKeyArray = values.length > 0 ? new Uint8Array(values) : new Uint8Array(32);
                } else {
                  privateKeyArray = new Uint8Array(32);
                }
              } catch (objectError) {
                console.warn('Error processing private key object:', objectError);
                privateKeyArray = new Uint8Array(32);
              }
            } else {
              privateKeyArray = new Uint8Array(32); // Default 32-byte key
            }
          } catch (error) {
            console.warn('Error processing stored private key:', error);
            privateKeyArray = new Uint8Array(32);
          }

          // Safe public key handling
          let publicKeyArray: Uint8Array;
          try {
            if (storedDID?.publicKey instanceof Uint8Array) {
              publicKeyArray = storedDID.publicKey;
            } else if (storedDID?.publicKey && typeof storedDID.publicKey === 'object' && storedDID.publicKey !== null) {
              try {
                // Handle case where publicKey might be a plain object or have unexpected structure
                const keyObj = storedDID.publicKey;
                
                // Check if it's already an array-like object
                if (Array.isArray(keyObj)) {
                  const values = keyObj.filter(v => v != null && typeof v === 'number');
                  publicKeyArray = values.length > 0 ? new Uint8Array(values) : new Uint8Array(32);
                } else if (typeof keyObj === 'object' && keyObj !== null) {
                  // Try to extract values, handling potential undefined properties
                  const values = [];
                  try {
                    const objValues = Object.values(keyObj);
                    for (const val of objValues) {
                      if (val != null && typeof val === 'number') {
                        values.push(val);
                      }
                    }
                  } catch (objError) {
                    console.warn('Error extracting object values from public key:', objError);
                  }
                  publicKeyArray = values.length > 0 ? new Uint8Array(values) : new Uint8Array(32);
                } else {
                  publicKeyArray = new Uint8Array(32);
                }
              } catch (objectError) {
                console.warn('Error processing public key object:', objectError);
                publicKeyArray = new Uint8Array(32);
              }
            } else {
              publicKeyArray = new Uint8Array(32); // Default 32-byte key
            }
          } catch (error) {
            console.warn('Error processing stored public key:', error);
            publicKeyArray = new Uint8Array(32);
          }

          didKeyPair = {
            did: storedDID?.id || `did:key:${Date.now()}`,
            privateKey: privateKeyArray,
            publicKey: publicKeyArray,
            document: storedDID?.document || null,
          };
        } else {
          // Generate new DID
          const didCreationResult = await DIDService.generateDID();
          if (!didCreationResult.success || !didCreationResult.did) {
            throw new Error('Failed to generate DID: ' + didCreationResult.error);
          }
          didKeyPair = {
            did: didCreationResult.did,
            privateKey: didCreationResult.privateKey!,
            publicKey: didCreationResult.publicKey!,
            document: didCreationResult.document,
          };

          // Store the new DID with all required fields
          await storageService.storeDID({
            id: didKeyPair.did,
            method: "key" as const,
            identifier: didKeyPair.did.split(':').pop()!,
            controller: didKeyPair.did,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            publicKeys: [{
              id: `${didKeyPair.did}#key-1`,
              type: "Ed25519VerificationKey2020",
              controller: didKeyPair.did,
              publicKeyBase58: btoa(String.fromCharCode(...Array.from(didKeyPair.publicKey))),
            }],
            authentication: [`${didKeyPair.did}#key-1`],
            keyAgreement: [`${didKeyPair.did}#key-1`],
            capabilityInvocation: [`${didKeyPair.did}#key-1`],
            privateKey: didKeyPair.privateKey,
            publicKey: didKeyPair.publicKey,
            document: didKeyPair.document,
            keyType: "Ed25519",
            purposes: ["authentication", "keyAgreement", "capabilityInvocation"],
          });
        }
      }

      // Create enhanced DID with VC metadata
      let totalVCs = 0;
      let zkProofsGenerated = 0;
      
      try {
        totalVCs = await this.getTotalVCCount();
      } catch (error) {
        console.warn('Failed to get total VC count during DID initialization:', error);
      }
      
      try {
        zkProofsGenerated = await this.getTotalZKProofCount();
      } catch (error) {
        console.warn('Failed to get total ZK proof count during DID initialization:', error);
      }

      this.userDID = {
        ...didKeyPair,
        vcMetadata: {
          credentialsIssued: 0,
          credentialsReceived: 0,
          totalVCs,
          zkProofsGenerated,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      };

      console.log("[SUCCESS] DID initialized for VC operations:", this.userDID.did);
      return this.userDID;
    } catch (error) {
      console.error("[ERROR] Failed to initialize DID for VC operations:", error);
      
      // Provide a fallback DID if initialization fails completely
      if (!this.userDID) {
        console.warn("Creating fallback DID due to initialization failure");
        try {
          const fallbackDID: DIDWithVCCapability = {
            did: `did:key:fallback-${Date.now()}`,
            privateKey: new Uint8Array(32),
            publicKey: new Uint8Array(32),
            document: null,
            vcMetadata: {
              credentialsIssued: 0,
              credentialsReceived: 0,
              totalVCs: 0,
              zkProofsGenerated: 0,
              createdAt: new Date().toISOString(),
              lastUsed: new Date().toISOString(),
            },
          };
          this.userDID = fallbackDID;
          return fallbackDID;
        } catch (fallbackError) {
          console.error("Even fallback DID creation failed:", fallbackError);
          throw new Error(
            `Complete DID initialization failure: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
      
      throw new Error(
        `Failed to initialize DID: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create verifiable credential (generic method)
   */
  async createCredential(credentialData: any): Promise<WalletCredential> {
    if (!this.userDID) {
      await this.initializeDID();
    }

    if (!this.userDID) {
      throw new Error("Failed to initialize DID");
    }

    // Generate credential with DID
    const credential: VerifiableCredential = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: Array.isArray(credentialData.type) ? credentialData.type : [credentialData.type],
      id: `urn:uuid:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      issuer: credentialData.issuer || this.userDID.did,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: credentialData.subject || this.userDID.did,
        ...credentialData
      },
      proof: await this.createCredentialProof(credentialData)
    };

    const walletCredential: WalletCredential = {
      id: credential.id!,
      credential,
      metadata: {
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        source: credentialData.issuer || "local",
        tags: [],
        revoked: false
      }
    };

    // Store credential
    await storageService.storeCredential(walletCredential);
    
    // Update DID metadata
    await this.updateDIDMetadata("credential_created");

    return walletCredential;
  }

  /**
   * Create verifiable credential (alias for createCredential)
   */
  async createVC(credentialData: any): Promise<WalletCredential> {
    return this.createCredential(credentialData);
  }

  /**
   * Store verifiable credential
   */
  async storeCredential(credential: VerifiableCredential | WalletCredential): Promise<void> {
    let walletCredential: WalletCredential;

    if ('credential' in credential) {
      // Already a WalletCredential
      walletCredential = credential as WalletCredential;
    } else {
      // Convert VC to WalletCredential
      const vc = credential as VerifiableCredential;
      walletCredential = {
        id: vc.id || `urn:uuid:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        credential: vc,
        metadata: {
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          source: "external",
          tags: [],
          revoked: false
        }
      };
    }

    await storageService.storeCredential(walletCredential);
    await this.updateDIDMetadata("credential_created");
  }

  /**
   * Create verifiable credential from API source
   */
  async createCredentialFromAPI(
    request: VCCreationRequest,
  ): Promise<VCCreationResponse> {
    try {
      if (!this.userDID) {
        await this.initializeDID();
      }

      if (!this.userDID) {
        throw new Error("Failed to initialize DID");
      }

      let credential: WalletCredential;
      let zkCredential: ZKCredential | undefined;

      // Route to appropriate service based on type
      switch (request.type) {
        case "github":
          credential = await this.createGitHubCredential(request);
          break;
        case "linkedin":
          credential = await this.createLinkedInCredential(request);
          break;
        case "plaid":
          credential = await this.createPlaidCredential(request);
          break;
        default:
          throw new Error(`Unsupported credential type: ${request.type}`);
      }

      // Generate ZK proof if requested
      if (request.zkProofEnabled) {
        try {
          zkCredential = await zkProofService.createZKCredential(
            credential.credential as VerifiableCredential,
            this.userDID.did,
            this.userDID.privateKey,
          );

          // Update credential with ZK commitment
          credential.metadata.zkCommitment = zkCredential.commitment;
        } catch (zkError) {
          console.warn("ZK proof generation failed:", zkError);
          // Continue without ZK proof
        }
      }

      // Update DID metadata
      await this.updateDIDMetadata("credential_created");

      return {
        success: true,
        credential,
        zkCredential,
        verificationData: {
          proofGenerated: !!zkCredential,
          zkCommitment: zkCredential?.commitment,
          verificationMethod: `${this.userDID.did}#key-1`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create GitHub credential
   */
  private async createGitHubCredential(
    request: VCCreationRequest,
  ): Promise<WalletCredential> {
    if (!request.accessToken) {
      throw new Error("GitHub access token is required");
    }
    githubVCService.setAccessToken(request.accessToken);

    switch (request.subtype) {
      case "contributor":
        if (!request.metadata?.repositoryUrl) {
          throw new Error("Repository URL required for contributor credential");
        }
        return githubVCService.createContributorCredential(
          this.userDID!,
          this.userDID!.privateKey,
          request.metadata.repositoryUrl,
        );
      default:
        return githubVCService.createDeveloperCredential(
          this.userDID!,
          this.userDID!.privateKey,
        );
    }
  }

  /**
   * Create LinkedIn credential
   */
  private async createLinkedInCredential(
    request: VCCreationRequest,
  ): Promise<WalletCredential> {
    if (!request.accessToken) {
      throw new Error("LinkedIn access token is required");
    }
    linkedinVCService.setAccessToken(request.accessToken);

    switch (request.subtype) {
      case "employment":
        if (!request.metadata?.positionId) {
          throw new Error("Position ID required for employment credential");
        }
        return linkedinVCService.createEmploymentCredential(
          this.userDID!,
          this.userDID!.privateKey,
          request.metadata.positionId,
        );
      default:
        return linkedinVCService.createProfessionalCredential(
          this.userDID!,
          this.userDID!.privateKey,
        );
    }
  }

  /**
   * Create Plaid credential
   */
  private async createPlaidCredential(
    request: VCCreationRequest,
  ): Promise<WalletCredential> {
    if (!request.accessToken) {
      throw new Error("Plaid access token is required");
    }
    plaidVCService.setAccessToken(request.accessToken);

    switch (request.subtype) {
      case "income":
        return plaidVCService.createIncomeCredential(
          this.userDID!,
          this.userDID!.privateKey,
        );
      case "assets":
        return plaidVCService.createAssetCredential(
          this.userDID!,
          this.userDID!.privateKey,
        );
      default:
        return plaidVCService.createIdentityCredential(
          this.userDID!,
          this.userDID!.privateKey,
        );
    }
  }

  /**
   * Batch create multiple credentials
   */
  async createMultipleCredentials(
    requests: VCCreationRequest[],
  ): Promise<VCCreationResponse[]> {
    const results: VCCreationResponse[] = [];

    for (const request of requests) {
      try {
        const result = await this.createCredentialFromAPI(request);
        results.push(result);

        // Add delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Create verifiable presentation from stored credentials
   */
  async createPresentation(
    credentialIds: string[],
    challenge: string,
    domain: string,
    useZKProofs: boolean = false,
  ): Promise<any> {
    if (!this.userDID) {
      throw new Error("DID not initialized");
    }

    try {
      const credentials: WalletCredential[] = [];

      for (const id of credentialIds) {
        const credential = await storageService.getCredential(id);
        if (credential) {
          credentials.push(credential);
        }
      }

      if (credentials.length === 0) {
        throw new Error("No valid credentials found");
      }

      if (useZKProofs) {
        // Generate ZK presentation
        return this.createZKPresentation(credentials, challenge, domain);
      } else {
        // Generate standard presentation
        return this.createStandardPresentation(credentials, challenge, domain);
      }
    } catch (error) {
      throw new Error(
        `Failed to create presentation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create standard verifiable presentation
   */
  private async createStandardPresentation(
    credentials: WalletCredential[],
    challenge: string,
    domain: string,
  ): Promise<any> {
    const presentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      id: `urn:uuid:presentation-${Date.now()}`,
      holder: this.userDID!.did,
      verifiableCredential: credentials.map((cred) => cred.credential),
      proof: await this.createPresentationProof(credentials, challenge, domain),
    };

    await this.updateDIDMetadata("presentation_created");
    return presentation;
  }

  /**
   * Create ZK verifiable presentation
   */
  private async createZKPresentation(
    credentials: WalletCredential[],
    challenge: string,
    domain: string,
  ): Promise<any> {
    const zkProofs = [];

    for (const credential of credentials) {
      if (credential.metadata.zkCommitment) {
        // Use existing ZK credential
        const zkCredential = await storageService.getZKCredential(
          credential.id,
        );
        if (zkCredential) {
          const proof = await zkProofService.generateProof(
            zkCredential,
            "selective_disclosure",
            [challenge, domain],
          );
          zkProofs.push(proof);
        }
      } else {
        // Generate new ZK proof
        const zkCredential = await zkProofService.createZKCredential(
          credential.credential as VerifiableCredential,
          this.userDID!.did,
          this.userDID!.privateKey,
        );

        const proof = await zkProofService.generateProof(
          zkCredential,
          "selective_disclosure",
          [challenge, domain],
        );
        zkProofs.push(proof);
      }
    }

    const presentation = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://personapass.xyz/contexts/zk-presentation/v1",
      ],
      type: ["VerifiablePresentation", "ZKPresentation"],
      id: `urn:uuid:zk-presentation-${Date.now()}`,
      holder: this.userDID!.did,
      zkProofs,
      proof: await this.createPresentationProof(credentials, challenge, domain),
    };

    await this.updateDIDMetadata("zk_presentation_created");
    return presentation;
  }

  /**
   * Create credential proof
   */
  private async createCredentialProof(credentialData: any): Promise<any> {
    const proofData = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${this.userDID!.did}#key-1`,
      proofPurpose: "assertionMethod"
    };

    const dataToSign = JSON.stringify({
      ...proofData,
      ...credentialData
    });

    const signature = await DIDService.signWithDID(
      new TextEncoder().encode(dataToSign),
      this.userDID!.privateKey,
    );

    return {
      ...proofData,
      proofValue: Array.from(signature)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  }

  /**
   * Create presentation proof
   */
  private async createPresentationProof(
    credentials: WalletCredential[],
    challenge: string,
    domain: string,
  ): Promise<any> {
    const proofData = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${this.userDID!.did}#key-1`,
      proofPurpose: "authentication",
      challenge,
      domain,
    };

    const dataToSign = JSON.stringify({
      ...proofData,
      credentialIds: credentials.map((cred) => cred.id),
    });

    const signature = await DIDService.signWithDID(
      new TextEncoder().encode(dataToSign),
      this.userDID!.privateKey,
    );

    return {
      ...proofData,
      proofValue: Array.from(signature)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  }

  /**
   * Revoke credential
   */
  async revokeCredential(
    credentialId: string,
    reason: string = "user_request",
  ): Promise<void> {
    try {
      const credential = await storageService.getCredential(credentialId);
      if (!credential) {
        throw new Error("Credential not found");
      }

      // Mark as revoked before deletion
      await storageService.updateCredential(credentialId, {
        metadata: {
          ...credential.metadata,
          revoked: true,
          revokedAt: new Date().toISOString(),
          revocationReason: reason,
        },
      });

      // Route to appropriate service for revocation
      switch (credential.metadata.source) {
        case "github":
          await githubVCService.revokeCredential(credentialId);
          break;
        case "linkedin":
          await linkedinVCService.revokeCredential(credentialId);
          break;
        case "plaid":
          await plaidVCService.revokeCredential(credentialId);
          break;
        default:
          await storageService.deleteCredential(credentialId);
      }

      await this.updateDIDMetadata("credential_revoked");
    } catch (error) {
      throw new Error(
        `Failed to revoke credential: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get current DID
   */
  getCurrentDID(): DIDWithVCCapability | null {
    return this.userDID;
  }

  /**
   * Get DID metadata
   */
  async getDIDMetadata(): Promise<any> {
    if (!this.userDID) {
      return null;
    }

    let totalVCs = this.userDID.vcMetadata?.totalVCs || 0;
    let zkProofsGenerated = this.userDID.vcMetadata?.zkProofsGenerated || 0;

    try {
      totalVCs = await this.getTotalVCCount();
    } catch (error) {
      console.warn('Failed to get total VC count for metadata:', error);
    }

    try {
      zkProofsGenerated = await this.getTotalZKProofCount();
    } catch (error) {
      console.warn('Failed to get total ZK proof count for metadata:', error);
    }

    return {
      ...this.userDID.vcMetadata,
      totalVCs,
      zkProofsGenerated,
    };
  }

  /**
   * Update DID metadata
   */
  private async updateDIDMetadata(action: string): Promise<void> {
    if (!this.userDID) return;

    switch (action) {
      case "credential_created":
        this.userDID.vcMetadata.credentialsReceived++;
        this.userDID.vcMetadata.totalVCs++;
        break;
      case "presentation_created":
        this.userDID.vcMetadata.credentialsIssued++;
        break;
      case "zk_presentation_created":
        this.userDID.vcMetadata.zkProofsGenerated++;
        break;
      case "credential_revoked":
        this.userDID.vcMetadata.totalVCs = Math.max(
          0,
          this.userDID.vcMetadata.totalVCs - 1,
        );
        break;
    }

    this.userDID.vcMetadata.lastUsed = new Date().toISOString();
  }

  /**
   * Get total VC count
   */
  private async getTotalVCCount(): Promise<number> {
    try {
      const credentials = await storageService.getCredentials();
      if (!credentials || !Array.isArray(credentials)) {
        console.warn('getTotalVCCount: credentials is not a valid array:', typeof credentials);
        return 0;
      }
      return credentials.filter((cred) => {
        try {
          return cred && 
                 cred.metadata && 
                 typeof cred.metadata === 'object' &&
                 !cred.metadata.revoked;
        } catch (filterError) {
          console.warn('Error filtering credential:', cred, filterError);
          return false;
        }
      }).length;
    } catch (error) {
      console.error('Error getting total VC count:', error);
      return 0;
    }
  }

  /**
   * Get total ZK proof count
   */
  private async getTotalZKProofCount(): Promise<number> {
    try {
      const zkCredentials = await storageService.getZKCredentials();
      if (!zkCredentials || !Array.isArray(zkCredentials)) {
        console.warn('getTotalZKProofCount: zkCredentials is not a valid array:', typeof zkCredentials);
        return 0;
      }
      return zkCredentials.length;
    } catch (error) {
      console.error('Error getting total ZK proof count:', error);
      return 0;
    }
  }

  /**
   * Export DID and credentials for backup
   */
  async exportWalletData(password: string): Promise<string> {
    if (!this.userDID) {
      throw new Error("DID not initialized");
    }

    try {
      const credentials = await storageService.getCredentials();
      const zkCredentials = await storageService.getZKCredentials();

      const walletData = {
        did: this.userDID,
        credentials,
        zkCredentials,
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };

      // Encrypt with password (simplified)
      const encryptedData = btoa(JSON.stringify(walletData)); // Base64 encoding for now

      return encryptedData;
    } catch (error) {
      throw new Error(
        `Failed to export wallet data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Import DID and credentials from backup
   */
  async importWalletData(
    encryptedData: string,
    password: string,
  ): Promise<void> {
    try {
      // Decrypt with password (simplified)
      const walletData = JSON.parse(atob(encryptedData)); // Base64 decoding for now

      // Restore DID
      this.userDID = walletData.did;

      // Restore credentials
      for (const credential of walletData.credentials) {
        await storageService.storeCredential(credential);
      }

      // Restore ZK credentials
      for (const zkCredential of walletData.zkCredentials) {
        await storageService.storeZKCredential(zkCredential);
      }
    } catch (error) {
      throw new Error(
        `Failed to import wallet data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

export const vcManagerService = new VCManagerService();
