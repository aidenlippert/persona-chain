/**
 * User Authentication Service
 * Handles user authentication with Keplr wallet and DID management
 */

import { keplrService, KeplrAccount } from "./keplrService";
import { DIDService, DIDKeyPair } from "./didService";
import { StorageService } from "./storageService";
import { blockchainPersistenceService } from "./blockchainPersistenceService";
import { githubVCService } from "./githubVCService";
import { plaidVCService } from "./plaidVCService";
import { linkedinVCService } from "./linkedinVCService";
import type { RecoveryPhrase } from "../types/wallet";
import { errorService } from "@/services/errorService";

export interface UserProfile {
  did: string;
  keplrAddress: string;
  keplrName: string;
  createdAt: string;
  lastLogin: string;
  recoveryPhraseBackup: boolean;
  verifiedCredentials: string[];
  isActive: boolean;
}

export interface AuthenticationResult {
  success: boolean;
  profile: UserProfile | null;
  isNewUser: boolean;
  didKeyPair: DIDKeyPair | null;
  recoveryPhrase: RecoveryPhrase | null;
  error?: string;
}

export interface OnboardingData {
  didKeyPair: DIDKeyPair;
  recoveryPhrase: RecoveryPhrase;
  keplrAccount: KeplrAccount;
  blockchainRegistered: boolean;
}

export class UserAuthService {
  private static instance: UserAuthService;
  private storageService: StorageService;
  private currentUser: UserProfile | null = null;
  private currentDID: DIDKeyPair | null = null;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  static getInstance(): UserAuthService {
    if (!UserAuthService.instance) {
      UserAuthService.instance = new UserAuthService();
    }
    return UserAuthService.instance;
  }

  /**
   * Initialize the authentication service
   */
  async initialize(): Promise<void> {
    try {
      await this.storageService.initialize();

      // Check if user is already authenticated
      await this.checkExistingAuth();

      console.log("✅ User authentication service initialized");
    } catch (error) {
      errorService.logError("❌ Auth service initialization failed:", error);
      throw new Error(
        `Failed to initialize auth service: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check for existing authentication
   */
  private async checkExistingAuth(): Promise<void> {
    try {
      const config = await this.storageService.getConfig();
      if (config && config.user_profile) {
        this.currentUser = config.user_profile as UserProfile;

        // Load DID if available
        const storedDID = await this.storageService.getDID(
          this.currentUser.did,
        );
        if (storedDID) {
          // Reconstruct DID keypair from stored data
          this.currentDID = {
            did: storedDID.id,
            privateKey: new Uint8Array(), // Will be loaded from secure storage
            publicKey: new Uint8Array(), // Will be loaded from secure storage
            document: storedDID.document,
          };
        }
      }
    } catch (error) {
      console.warn("No existing authentication found");
    }
  }

  /**
   * Authenticate user with Keplr wallet
   */
  async authenticateWithKeplr(): Promise<AuthenticationResult> {
    try {
      // Connect to Keplr
      const keplrAccount = await keplrService.connect();

      // Check if user already exists
      const existingUser = await this.findUserByKeplrAddress(
        keplrAccount.address,
      );

      if (existingUser) {
        // Existing user - load their profile
        this.currentUser = existingUser;
        this.currentDID = await this.loadUserDID(existingUser.did);

        // Update last login
        existingUser.lastLogin = new Date().toISOString();
        await this.saveUserProfile(existingUser);

        return {
          success: true,
          profile: existingUser,
          isNewUser: false,
          didKeyPair: this.currentDID,
          recoveryPhrase: null,
        };
      } else {
        // New user - create profile
        const onboardingData = await this.createNewUser(keplrAccount);

        return {
          success: true,
          profile: await this.findUserByKeplrAddress(keplrAccount.address),
          isNewUser: true,
          didKeyPair: onboardingData.didKeyPair,
          recoveryPhrase: onboardingData.recoveryPhrase,
        };
      }
    } catch (error) {
      errorService.logError("❌ Keplr authentication failed:", error);
      return {
        success: false,
        profile: null,
        isNewUser: false,
        didKeyPair: null,
        recoveryPhrase: null,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  /**
   * Create new user with complete onboarding
   */
  private async createNewUser(
    keplrAccount: KeplrAccount,
  ): Promise<OnboardingData> {
    try {
      // Generate DID
      const didKeyPair = await keplrService.createDIDFromKeplr();

      // Generate recovery phrase
      const recoveryData = await keplrService.createRecoveryPhrase();
      const recoveryPhrase: RecoveryPhrase = {
        id: `recovery-${Date.now()}`,
        phrase: recoveryData.phrase,
        created: new Date().toISOString(),
        verified: false,
        backup_locations: [],
        strength: 256,
      };

      // Store recovery phrase securely
      await this.storageService.storeRecoveryPhrase(
        recoveryPhrase,
        recoveryData.phrase,
      );

      // Create user profile
      const userProfile: UserProfile = {
        did: didKeyPair.did,
        keplrAddress: keplrAccount.address,
        keplrName: keplrAccount.name,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        recoveryPhraseBackup: false,
        verifiedCredentials: [],
        isActive: true,
      };

      // Store DID
      await this.storageService.storeDID({
        id: didKeyPair.did,
        method: "key",
        identifier: didKeyPair.did,
        document: didKeyPair.document,
        controller: keplrAccount.address,
        created: new Date().toISOString(),
        keys: {
          authentication: [],
          assertionMethod: [],
          keyAgreement: [],
          capabilityInvocation: [],
          capabilityDelegation: [],
        },
      });

      // Save user profile
      await this.saveUserProfile(userProfile);

      // Try to register on blockchain
      let blockchainRegistered = false;
      try {
        await keplrService.registerDIDOnChain(didKeyPair);
        blockchainRegistered = true;
      } catch (blockchainError) {
        console.warn(
          "Blockchain registration failed, continuing without it:",
          blockchainError,
        );
      }

      this.currentUser = userProfile;
      this.currentDID = didKeyPair;

      console.log("✅ New user created successfully:", {
        did: didKeyPair.did,
        keplrAddress: keplrAccount.address,
        blockchainRegistered,
      });

      return {
        didKeyPair,
        recoveryPhrase,
        keplrAccount,
        blockchainRegistered,
      };
    } catch (error) {
      errorService.logError("❌ User creation failed:", error);
      throw new Error(
        `Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Find user by Keplr address
   */
  private async findUserByKeplrAddress(
    address: string,
  ): Promise<UserProfile | null> {
    try {
      const config = await this.storageService.getConfig();
      if (config && config.user_profile) {
        const profile = config.user_profile as UserProfile;
        if (profile.keplrAddress === address) {
          return profile;
        }
      }
      return null;
    } catch (error) {
      errorService.logError("Error finding user:", error);
      return null;
    }
  }

  /**
   * Load user DID from storage
   */
  private async loadUserDID(did: string): Promise<DIDKeyPair | null> {
    try {
      const storedDID = await this.storageService.getDID(did);
      if (storedDID) {
        return {
          did: storedDID.id,
          privateKey: new Uint8Array(), // Private key would be loaded from secure storage
          publicKey: new Uint8Array(), // Public key would be loaded from secure storage
          document: storedDID.document,
        };
      }
      return null;
    } catch (error) {
      errorService.logError("Error loading DID:", error);
      return null;
    }
  }

  /**
   * Save user profile to storage
   */
  private async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const config = (await this.storageService.getConfig()) || {
        id: `config-${Date.now()}`,
        version: "1.0.0",
        created: new Date().toISOString(),
        user_profile: profile,
        security: {
          encryption_enabled: true,
          biometric_enabled: false,
          backup_enabled: false,
        },
        preferences: {
          theme: "dark",
          language: "en",
          notifications: true,
        },
      };

      config.user_profile = profile;
      await this.storageService.storeConfig(config);
    } catch (error) {
      errorService.logError("Error saving user profile:", error);
      throw new Error("Failed to save user profile");
    }
  }

  /**
   * Get current user profile
   */
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  /**
   * Get current DID
   */
  getCurrentDID(): DIDKeyPair | null {
    return this.currentDID;
  }

  /**
   * Connect GitHub credential
   */
  async connectGitHub(accessToken: string): Promise<void> {
    if (!this.currentUser || !this.currentDID) {
      throw new Error("User not authenticated");
    }

    try {
      githubVCService.setAccessToken(accessToken);
      const credential = await githubVCService.createDeveloperCredential(
        this.currentUser.did,
        this.currentDID.privateKey,
      );

      // Update user profile
      this.currentUser.verifiedCredentials.push(credential.id);
      await this.saveUserProfile(this.currentUser);

      console.log("✅ GitHub credential connected");
    } catch (error) {
      errorService.logError("❌ GitHub connection failed:", error);
      throw new Error(
        `Failed to connect GitHub: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Connect LinkedIn credential
   */
  async connectLinkedIn(accessToken: string): Promise<void> {
    if (!this.currentUser || !this.currentDID) {
      throw new Error("User not authenticated");
    }

    try {
      linkedinVCService.setAccessToken(accessToken);
      const credential = await linkedinVCService.createProfessionalCredential(
        this.currentUser.did,
        this.currentDID.privateKey,
      );

      // Update user profile
      this.currentUser.verifiedCredentials.push(credential.id);
      await this.saveUserProfile(this.currentUser);

      console.log("✅ LinkedIn credential connected");
    } catch (error) {
      errorService.logError("❌ LinkedIn connection failed:", error);
      throw new Error(
        `Failed to connect LinkedIn: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Connect Plaid credential
   */
  async connectPlaid(publicToken: string): Promise<void> {
    if (!this.currentUser || !this.currentDID) {
      throw new Error("User not authenticated");
    }

    try {
      const credential = await plaidVCService.createFinancialCredential(
        this.currentUser.did,
        this.currentDID.privateKey,
        publicToken,
      );

      // Update user profile
      this.currentUser.verifiedCredentials.push(credential.id);
      await this.saveUserProfile(this.currentUser);

      console.log("✅ Plaid credential connected");
    } catch (error) {
      errorService.logError("❌ Plaid connection failed:", error);
      throw new Error(
        `Failed to connect Plaid: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get user's verified credentials
   */
  async getVerifiedCredentials(): Promise<any[]> {
    if (!this.currentUser) {
      return [];
    }

    try {
      const credentials = await this.storageService.getCredentials();
      return credentials.filter((cred) =>
        this.currentUser!.verifiedCredentials.includes(cred.id),
      );
    } catch (error) {
      errorService.logError("Error getting verified credentials:", error);
      return [];
    }
  }

  /**
   * Mark recovery phrase as backed up
   */
  async markRecoveryPhraseBackedUp(): Promise<void> {
    if (!this.currentUser) {
      throw new Error("User not authenticated");
    }

    this.currentUser.recoveryPhraseBackup = true;
    await this.saveUserProfile(this.currentUser);
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      await keplrService.disconnect();
      this.currentUser = null;
      this.currentDID = null;

      console.log("✅ User signed out successfully");
    } catch (error) {
      errorService.logError("❌ Sign out failed:", error);
      throw new Error(
        `Failed to sign out: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentDID !== null;
  }

  /**
   * Get authentication status
   */
  getAuthStatus(): {
    isAuthenticated: boolean;
    hasKeplr: boolean;
    hasRecoveryPhrase: boolean;
    credentialsCount: number;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasKeplr: keplrService.isKeplrInstalled(),
      hasRecoveryPhrase: this.currentUser?.recoveryPhraseBackup || false,
      credentialsCount: this.currentUser?.verifiedCredentials.length || 0,
    };
  }
}

export const userAuthService = UserAuthService.getInstance();
