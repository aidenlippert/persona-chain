/**
 * PersonaPass SDK
 * Main entry point for the PersonaPass verifiable credential SDK
 */

// Export main client
export { PersonaPassSDK, createPersonaPassSDK, createDefaultConfig } from './client';
export { PersonaPassSDK as default } from './client';

// Export services
export { ProofRequestService } from './services/proofRequest';
export { ValidationService } from './services/validation';
export { ZKProofService } from './services/zkProof';
export { CryptoService } from './services/crypto';

// Export utilities
export { EventEmitter } from './utils/eventEmitter';

// Export all types
export * from './types';
// Re-export ValidationErrorClass as ValidationError for convenience
export { ValidationErrorClass as ValidationError } from './types';

// Version
export const VERSION = '1.0.0';

// Default export is already handled above