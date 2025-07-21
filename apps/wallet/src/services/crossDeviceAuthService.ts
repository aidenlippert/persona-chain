/**
 * Cross-Device Authentication Service
 * Enables users to sign in from any device using their Keplr wallet
 * without dependency on localStorage
 */

import { blockchainDIDService } from './blockchainDIDService';
import { personaChainService } from './personaChainService';
import { storageService } from './storageService';
import { errorService } from './errorService';
import { keplrService } from './keplrService';
import { DID, DIDDocument } from '../types/wallet';

export interface AuthenticationResult {
  success: boolean;
  profile?: UserProfile;
  did?: string;
  isNewUser: boolean;
  error?: string;
}

export interface UserProfile {
  did: string;
  keplrAddress: string;
  name?: string;
  email?: string;
  profilePicture?: string;
  created: string;
  lastLogin: string;
  deviceCount: number;
  credentialCount: number;
}

export interface SignatureChallenge {
  challenge: string;
  timestamp: number;
  purpose: 'authentication' | 'did_verification' | 'profile_access';
}

export class CrossDeviceAuthService {
  private static instance: CrossDeviceAuthService;

  private constructor() {}

  static getInstance(): CrossDeviceAuthService {
    if (!CrossDeviceAuthService.instance) {
      CrossDeviceAuthService.instance = new CrossDeviceAuthService();
    }
    return CrossDeviceAuthService.instance;
  }

  /**
   * Authenticate user with Keplr wallet across any device
   * This is the main entry point for cross-device login
   */
  async authenticateWithKeplr(): Promise<AuthenticationResult> {
    try {
      console.log('[CROSS-DEVICE] Starting cross-device authentication...');

      // Step 1: Connect to Keplr
      const keplrWallet = await personaChainService.connectKeplr();
      if (!keplrWallet) {
        return {
          success: false,
          error: 'Failed to connect to Keplr wallet',
          isNewUser: false
        };
      }

      console.log(`[CROSS-DEVICE] Connected to Keplr: ${keplrWallet.address}`);

      // Step 2: Query blockchain for existing DID
      const existingDID = await blockchainDIDService.findDIDByWalletAddress(keplrWallet.address);
      
      if (existingDID) {
        console.log(`[CROSS-DEVICE] Found existing DID: ${existingDID}`);
        
        // Step 3: Verify ownership with signature challenge
        const verified = await this.verifyWalletOwnership(keplrWallet.address, existingDID);
        
        if (verified) {
          // Step 4: Load profile from DID
          const profile = await this.loadProfileFromDID(existingDID, keplrWallet.address);
          
          // Step 5: Update last login
          await this.updateLastLogin(profile);
          
          console.log(`[CROSS-DEVICE] Successfully authenticated user: ${profile.did}`);
          return {
            success: true,
            profile,
            did: existingDID,
            isNewUser: false
          };
        } else {
          console.warn('[CROSS-DEVICE] Ownership verification failed');
          return {
            success: false,
            error: 'Could not verify wallet ownership',
            isNewUser: false
          };
        }
      }

      // Step 6: Create new user if no existing DID
      console.log('[CROSS-DEVICE] No existing DID found, creating new user...');
      return await this.createNewUser(keplrWallet);

    } catch (error) {
      errorService.logError('Cross-device authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authentication error',
        isNewUser: false
      };
    }
  }

  /**
   * Verify wallet ownership through signature challenge
   */
  private async verifyWalletOwnership(walletAddress: string, did: string): Promise<boolean> {
    try {
      console.log(`[VERIFY] Verifying ownership of DID ${did} by wallet ${walletAddress}`);

      // Generate challenge
      const challenge = this.generateChallenge();
      
      // Request signature from Keplr
      const signature = await this.requestKeplrSignature(challenge);
      
      if (!signature) {
        console.warn('[VERIFY] Failed to get signature from Keplr');
        return false;
      }

      // Verify signature against DID
      const isValid = await blockchainDIDService.verifyDIDOwnership(did, signature, challenge.challenge);
      
      console.log(`[VERIFY] Ownership verification result: ${isValid}`);
      return isValid;

    } catch (error) {
      console.warn('[VERIFY] Ownership verification error:', error);
      return false;
    }
  }

  /**
   * Generate signature challenge
   */
  private generateChallenge(): SignatureChallenge {
    const challenge = `PersonaPass Authentication Challenge\n` +
                     `Timestamp: ${Date.now()}\n` +
                     `Random: ${Math.random().toString(36).substring(2, 15)}\n` +
                     `Purpose: Cross-device identity verification`;

    return {
      challenge,
      timestamp: Date.now(),
      purpose: 'authentication'
    };
  }

  /**
   * Request signature from Keplr wallet
   */
  private async requestKeplrSignature(challenge: SignatureChallenge): Promise<string | null> {
    try {
      if (!window.keplr) {
        throw new Error('Keplr not available');
      }

      // Initialize Keplr service to ensure chain is properly registered
      await keplrService.initialize();
      
      // Connect to ensure account is available
      await keplrService.connect();
      
      // Use Keplr's signArbitrary method through the service
      const signature = await keplrService.signMessage(challenge.challenge);

      return signature.signature;

    } catch (error) {
      console.warn('Failed to get Keplr signature:', error);
      return null;
    }
  }

  /**
   * Load user profile from DID
   */
  private async loadProfileFromDID(did: string, walletAddress: string): Promise<UserProfile> {
    try {
      console.log(`[PROFILE] Loading profile for DID: ${did}`);

      // Try to load profile from DID document or linked storage
      const resolution = await blockchainDIDService.resolveDID(did);
      
      if (resolution.didDocument) {
        // Extract profile information from DID document
        const profile: UserProfile = {
          did,
          keplrAddress: walletAddress,
          name: this.extractNameFromDID(resolution.didDocument),
          created: resolution.didDocumentMetadata.created || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          deviceCount: await this.getDeviceCount(did),
          credentialCount: await this.getCredentialCount(did)
        };

        // Store profile locally for this session
        await this.cacheProfileLocally(profile);

        return profile;
      }

      // Fallback: create minimal profile
      return {
        did,
        keplrAddress: walletAddress,
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        deviceCount: 1,
        credentialCount: 0
      };

    } catch (error) {
      console.warn('Failed to load profile from DID:', error);
      
      // Return minimal profile as fallback
      return {
        did,
        keplrAddress: walletAddress,
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        deviceCount: 1,
        credentialCount: 0
      };
    }
  }

  /**
   * Create new user with DID registration
   */
  private async createNewUser(keplrWallet: any): Promise<AuthenticationResult> {
    try {
      console.log(`[NEW-USER] Creating new user for wallet: ${keplrWallet.address}`);

      // Generate new DID
      const didCreationResult = await import('./didService').then(m => m.DIDService.generateDID());
      
      if (!didCreationResult.success || !didCreationResult.did) {
        throw new Error('Failed to generate DID: ' + didCreationResult.error);
      }

      // Create DID document
      const didDocument: DIDDocument = {
        id: didCreationResult.did,
        controller: keplrWallet.address,
        verificationMethod: [{
          id: `${didCreationResult.did}#key-1`,
          type: "Ed25519VerificationKey2020",
          controller: didCreationResult.did,
          publicKeyBase58: btoa(String.fromCharCode(...Array.from(didCreationResult.publicKey!))),
        }],
        authentication: [`${didCreationResult.did}#key-1`],
        keyAgreement: [`${didCreationResult.did}#key-1`],
        capabilityInvocation: [`${didCreationResult.did}#key-1`],
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      // Register DID on blockchain
      const signature = await this.requestKeplrSignature({
        challenge: `Register DID: ${didCreationResult.did}`,
        timestamp: Date.now(),
        purpose: 'did_verification'
      });

      if (!signature) {
        throw new Error('Failed to get signature for DID registration');
      }

      const txHash = await blockchainDIDService.registerDID(didDocument, signature);
      
      if (!txHash) {
        throw new Error('Failed to register DID on blockchain');
      }

      // Create proper DID object for storage
      const didForStorage: DID = {
        id: didCreationResult.did,
        method: "key" as const,
        identifier: didCreationResult.did.split(':').pop()!,
        controller: keplrWallet.address,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        publicKeys: [{
          id: `${didCreationResult.did}#key-1`,
          type: "Ed25519VerificationKey2020",
          controller: didCreationResult.did,
          publicKeyBase58: btoa(String.fromCharCode(...Array.from(didCreationResult.publicKey!))),
        }],
        authentication: [`${didCreationResult.did}#key-1`],
        keyAgreement: [`${didCreationResult.did}#key-1`],
        capabilityInvocation: [`${didCreationResult.did}#key-1`],
        privateKey: didCreationResult.privateKey!,
        publicKey: didCreationResult.publicKey!,
        document: didDocument,
        keyType: "Ed25519",
        purposes: ["authentication", "keyAgreement", "capabilityInvocation"],
      };

      // Store DID locally
      await storageService.storeDID(didForStorage);
      await storageService.setCurrentDID(didCreationResult.did);

      // Create user profile
      const profile: UserProfile = {
        did: didCreationResult.did,
        keplrAddress: keplrWallet.address,
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        deviceCount: 1,
        credentialCount: 0
      };

      await this.cacheProfileLocally(profile);

      console.log(`[NEW-USER] Successfully created user with DID: ${didCreationResult.did}`);

      return {
        success: true,
        profile,
        did: didCreationResult.did,
        isNewUser: true
      };

    } catch (error) {
      errorService.logError('Failed to create new user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create new user',
        isNewUser: true
      };
    }
  }

  /**
   * Cache profile locally for this session
   */
  private async cacheProfileLocally(profile: UserProfile): Promise<void> {
    try {
      await storageService.setItem('current_user_profile', JSON.stringify(profile));
      await storageService.setItem('last_authenticated', Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache profile locally:', error);
    }
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(profile: UserProfile): Promise<void> {
    try {
      profile.lastLogin = new Date().toISOString();
      await this.cacheProfileLocally(profile);
    } catch (error) {
      console.warn('Failed to update last login:', error);
    }
  }

  /**
   * Extract name from DID document
   */
  private extractNameFromDID(didDocument: DIDDocument): string | undefined {
    // Check if DID document has a name in service endpoints or other fields
    if (didDocument.service) {
      for (const service of didDocument.service) {
        if (service.type === 'Profile' && service.serviceEndpoint) {
          // Could contain profile information
          return undefined; // For now, return undefined
        }
      }
    }
    return undefined;
  }

  /**
   * Get device count for user
   */
  private async getDeviceCount(did: string): Promise<number> {
    // This would query blockchain for device registrations
    // For now, return a default
    return 1;
  }

  /**
   * Get credential count for user
   */
  private async getCredentialCount(did: string): Promise<number> {
    try {
      const credentials = await storageService.getAllCredentials();
      return credentials.filter(cred => cred.metadata.source === did).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Sign out and clear local session data
   */
  async signOut(): Promise<void> {
    try {
      await storageService.removeItem('current_user_profile');
      await storageService.removeItem('last_authenticated');
      console.log('[CROSS-DEVICE] User signed out successfully');
    } catch (error) {
      console.warn('Failed to clear session data during sign out:', error);
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const profile = await storageService.getItem('current_user_profile');
      const lastAuth = await storageService.getItem('last_authenticated');
      
      if (!profile || !lastAuth) {
        return false;
      }

      // Check if authentication is not too old (24 hours)
      const authTime = parseInt(lastAuth);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      return (now - authTime) < twentyFourHours;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentProfile(): Promise<UserProfile | null> {
    try {
      const profileData = await storageService.getItem('current_user_profile');
      return profileData ? JSON.parse(profileData) : null;
    } catch (error) {
      return null;
    }
  }
}

export const crossDeviceAuthService = CrossDeviceAuthService.getInstance();