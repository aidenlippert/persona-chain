/**
 * PersonaPass Mobile SDK
 * Cross-platform mobile SDK for React Native applications
 */

// Core Mobile Client
export { MobileClient, createMobileClient } from './client';

// Platform Services
export { BiometricService } from './services/biometric';
export { SecureStorageService } from './services/secureStorage';
export { QRScannerService } from './services/qrScanner';
export { NotificationService } from './services/notification';
export { NetworkService } from './services/network';

// Android Integration
export { AndroidCredentialsService } from './android/credentialsService';
export { AndroidWalletManager } from './android/walletManager';

// iOS Integration  
export { IOSWalletService } from './ios/walletService';
export { IOSKeychainManager } from './ios/keychainManager';

// EUDI Wallet Compliance
export { EUDIWalletService } from './eudi/walletService';
export { EUDIComplianceManager } from './eudi/complianceManager';

// WebAuthn Mobile
export { MobileWebAuthnService } from './webauthn/mobileService';
export { PasskeyManager } from './webauthn/passkeyManager';

// React Native Components
export { CredentialCard } from './components/CredentialCard';
export { QRScanner } from './components/QRScanner';
export { BiometricPrompt } from './components/BiometricPrompt';
export { WalletProvider } from './components/WalletProvider';

// React Native Hooks
export { useCredentials } from './hooks/useCredentials';
export { useBiometric } from './hooks/useBiometric';
export { useQRScanner } from './hooks/useQRScanner';
export { useSecureStorage } from './hooks/useSecureStorage';
export { useWallet } from './hooks/useWallet';

// Types
export * from './types';

// Utilities
export { DeviceInfo } from './utils/deviceInfo';
export { SecurityUtils } from './utils/security';
export { ValidationUtils } from './utils/validation';

// Version
export const VERSION = '1.0.0';