/**
 * PersonaPass Mobile Client
 * Main client for mobile credential management with native platform integration
 */

import { Platform } from 'react-native';
import { PersonaPassSDK } from '@personapass/sdk';
import { BiometricService } from './services/biometric';
import { SecureStorageService } from './services/secureStorage';
import { QRScannerService } from './services/qrScanner';
import { NotificationService } from './services/notification';
import { NetworkService } from './services/network';
import { AndroidCredentialsService } from './android/credentialsService';
import { IOSWalletService } from './ios/walletService';
import { EUDIWalletService } from './eudi/walletService';
import { MobileWebAuthnService } from './webauthn/mobileService';
import { DeviceInfo } from './utils/deviceInfo';
import type {
  MobileClientConfig,
  CredentialStorageOptions,
  BiometricAuthOptions,
  QRScanOptions,
  NotificationOptions,
  MobileCredential,
  PlatformCapabilities
} from './types';

export interface MobileClientOptions {
  apiEndpoint: string;
  walletDID?: string;
  biometric?: BiometricAuthOptions;
  storage?: CredentialStorageOptions;
  notifications?: NotificationOptions;
  eudi?: {
    enabled: boolean;
    baseUrl?: string;
  };
  debug?: boolean;
}

export class MobileClient {
  private readonly config: MobileClientConfig;
  private readonly sdk: PersonaPassSDK;
  
  // Core Services
  public readonly biometric: BiometricService;
  public readonly storage: SecureStorageService;
  public readonly qrScanner: QRScannerService;
  public readonly notifications: NotificationService;
  public readonly network: NetworkService;
  public readonly webauthn: MobileWebAuthnService;
  
  // Platform Services
  public readonly android?: AndroidCredentialsService;
  public readonly ios?: IOSWalletService;
  public readonly eudi?: EUDIWalletService;
  
  // Device Information
  public readonly device: DeviceInfo;
  public readonly capabilities: PlatformCapabilities;

  constructor(options: MobileClientOptions) {
    this.device = new DeviceInfo();
    this.capabilities = this.detectPlatformCapabilities();
    
    this.config = {
      apiEndpoint: options.apiEndpoint,
      walletDID: options.walletDID,
      platform: Platform.OS,
      device: this.device.getInfo(),
      capabilities: this.capabilities,
      biometric: {
        enabled: true,
        fallbackToPassword: true,
        promptMessage: 'Authenticate to access your credentials',
        ...options.biometric
      },
      storage: {
        encryptionLevel: 'device',
        backupEnabled: false,
        syncEnabled: true,
        ...options.storage
      },
      notifications: {
        enabled: true,
        types: ['credential_received', 'proof_request', 'security_alert'],
        ...options.notifications
      },
      eudi: {
        enabled: false,
        ...options.eudi
      },
      debug: options.debug || false
    };

    // Initialize PersonaPass SDK
    this.sdk = new PersonaPassSDK({
      apiEndpoint: options.apiEndpoint,
      debug: options.debug
    });

    // Initialize core services
    this.biometric = new BiometricService(this.config);
    this.storage = new SecureStorageService(this.config);
    this.qrScanner = new QRScannerService(this.config);
    this.notifications = new NotificationService(this.config);
    this.network = new NetworkService(this.config);
    this.webauthn = new MobileWebAuthnService(this.config, this.biometric);

    // Initialize platform-specific services
    if (Platform.OS === 'android' && this.capabilities.androidCredentialsAPI) {
      this.android = new AndroidCredentialsService(this.config, this.storage);
    }
    
    if (Platform.OS === 'ios' && this.capabilities.iosWallet) {
      this.ios = new IOSWalletService(this.config, this.storage);
    }
    
    if (this.config.eudi.enabled) {
      this.eudi = new EUDIWalletService(this.config, this.storage);
    }
  }

  /**
   * Initialize the mobile client
   */
  async initialize(): Promise<void> {
    try {
      // Initialize device security
      await this.biometric.initialize();
      await this.storage.initialize();
      
      // Initialize network monitoring
      await this.network.initialize();
      
      // Setup notifications
      if (this.config.notifications.enabled) {
        await this.notifications.initialize();
      }
      
      // Initialize platform services
      if (this.android) {
        await this.android.initialize();
      }
      
      if (this.ios) {
        await this.ios.initialize();
      }
      
      if (this.eudi) {
        await this.eudi.initialize();
      }
      
      // Sync credentials on startup
      await this.syncCredentials();
      
    } catch (error) {
      console.error('Failed to initialize MobileClient:', error);
      throw error;
    }
  }

  /**
   * Store a credential securely
   */
  async storeCredential(
    credential: MobileCredential,
    options?: { requireBiometric?: boolean }
  ): Promise<void> {
    // Authenticate if required
    if (options?.requireBiometric || this.config.biometric.enabled) {
      await this.biometric.authenticate();
    }
    
    // Store in secure storage
    await this.storage.storeCredential(credential);
    
    // Store in platform wallet if available
    if (this.android && credential.androidCompatible) {
      await this.android.storeCredential(credential);
    }
    
    if (this.ios && credential.iosCompatible) {
      await this.ios.storeCredential(credential);
    }
    
    // Sync with backend
    if (this.config.storage.syncEnabled && this.network.isOnline()) {
      await this.syncCredentialToBackend(credential);
    }
    
    // Send notification
    if (this.config.notifications.enabled) {
      await this.notifications.notifyCredentialStored(credential);
    }
  }

  /**
   * Retrieve stored credentials
   */
  async getCredentials(): Promise<MobileCredential[]> {
    // Authenticate
    if (this.config.biometric.enabled) {
      await this.biometric.authenticate();
    }
    
    return this.storage.getCredentials();
  }

  /**
   * Get a specific credential by ID
   */
  async getCredential(id: string): Promise<MobileCredential | null> {
    // Authenticate
    if (this.config.biometric.enabled) {
      await this.biometric.authenticate();
    }
    
    return this.storage.getCredential(id);
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<void> {
    // Authenticate
    if (this.config.biometric.enabled) {
      await this.biometric.authenticate();
    }
    
    // Remove from storage
    await this.storage.deleteCredential(id);
    
    // Remove from platform wallets
    if (this.android) {
      await this.android.deleteCredential(id);
    }
    
    if (this.ios) {
      await this.ios.deleteCredential(id);
    }
    
    // Sync deletion
    if (this.config.storage.syncEnabled && this.network.isOnline()) {
      await this.syncCredentialDeletion(id);
    }
  }

  /**
   * Scan QR code for proof request
   */
  async scanProofRequest(options?: QRScanOptions): Promise<any> {
    const qrData = await this.qrScanner.scan(options);
    return this.sdk.parseProofRequest(qrData);
  }

  /**
   * Create a verifiable presentation
   */
  async createPresentation(
    proofRequest: any,
    selectedCredentials: string[]
  ): Promise<any> {
    // Authenticate
    if (this.config.biometric.enabled) {
      await this.biometric.authenticate();
    }
    
    // Get selected credentials
    const credentials = await Promise.all(
      selectedCredentials.map(id => this.getCredential(id))
    );
    
    const validCredentials = credentials.filter(Boolean);
    
    // Create presentation using SDK
    const presentation = await this.sdk.createPresentation(
      proofRequest,
      validCredentials
    );
    
    // Log presentation creation
    await this.storage.logActivity({
      type: 'presentation_created',
      timestamp: new Date().toISOString(),
      details: {
        proofRequestId: proofRequest.id,
        credentialIds: selectedCredentials
      }
    });
    
    return presentation;
  }

  /**
   * Register biometric authentication
   */
  async registerBiometric(): Promise<void> {
    await this.biometric.register();
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    return this.biometric.isAvailable();
  }

  /**
   * Get supported biometric types
   */
  async getBiometricTypes(): Promise<string[]> {
    return this.biometric.getSupportedTypes();
  }

  /**
   * Sync credentials with backend
   */
  async syncCredentials(): Promise<void> {
    if (!this.network.isOnline()) {
      console.warn('Cannot sync credentials: device is offline');
      return;
    }
    
    try {
      // Get local credentials
      const localCredentials = await this.storage.getCredentials();
      
      // Get remote credentials
      const remoteCredentials = await this.sdk.getWalletCredentials();
      
      // Sync logic (merge, conflict resolution, etc.)
      await this.mergeCredentials(localCredentials, remoteCredentials);
      
    } catch (error) {
      console.error('Failed to sync credentials:', error);
    }
  }

  /**
   * Get device capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return this.capabilities;
  }

  /**
   * Get device information
   */
  getDeviceInfo(): any {
    return this.device.getInfo();
  }

  /**
   * Enable EUDI wallet features
   */
  async enableEUDI(): Promise<void> {
    if (!this.eudi) {
      throw new Error('EUDI wallet not supported on this platform');
    }
    
    await this.eudi.enable();
    this.config.eudi.enabled = true;
  }

  /**
   * Disable EUDI wallet features
   */
  async disableEUDI(): Promise<void> {
    if (this.eudi) {
      await this.eudi.disable();
    }
    
    this.config.eudi.enabled = false;
  }

  /**
   * Backup wallet data
   */
  async createBackup(password: string): Promise<string> {
    // Authenticate
    await this.biometric.authenticate();
    
    // Create encrypted backup
    return this.storage.createBackup(password);
  }

  /**
   * Restore wallet from backup
   */
  async restoreFromBackup(backup: string, password: string): Promise<void> {
    // Authenticate
    await this.biometric.authenticate();
    
    // Restore from encrypted backup
    await this.storage.restoreFromBackup(backup, password);
    
    // Reinitialize services
    await this.initialize();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.network.cleanup?.();
    await this.notifications.cleanup?.();
    await this.qrScanner.cleanup?.();
    await this.android?.cleanup?.();
    await this.ios?.cleanup?.();
    await this.eudi?.cleanup?.();
  }

  /**
   * Detect platform capabilities
   */
  private detectPlatformCapabilities(): PlatformCapabilities {
    return {
      biometric: true, // Determined at runtime
      secureEnclave: Platform.OS === 'ios',
      androidCredentialsAPI: Platform.OS === 'android',
      iosWallet: Platform.OS === 'ios',
      nfc: true, // Determined at runtime
      bluetooth: true,
      camera: true,
      notifications: true,
      backgroundProcessing: true,
      webauthn: true
    };
  }

  /**
   * Merge local and remote credentials
   */
  private async mergeCredentials(
    local: MobileCredential[],
    remote: any[]
  ): Promise<void> {
    // Implementation for credential synchronization
    // This would include conflict resolution, duplicate detection, etc.
  }

  /**
   * Sync credential to backend
   */
  private async syncCredentialToBackend(credential: MobileCredential): Promise<void> {
    // Implementation for uploading credential metadata to backend
  }

  /**
   * Sync credential deletion to backend
   */
  private async syncCredentialDeletion(credentialId: string): Promise<void> {
    // Implementation for syncing credential deletion
  }
}

/**
 * Create a new MobileClient instance
 */
export function createMobileClient(options: MobileClientOptions): MobileClient {
  return new MobileClient(options);
}