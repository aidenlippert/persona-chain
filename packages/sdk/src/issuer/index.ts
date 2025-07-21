/**
 * PersonaPass Issuer SDK
 * Complete toolkit for credential issuance and management
 */

export { IssuerClient, createIssuerClient } from './client';
export { CredentialBuilder } from './credentialBuilder';
export { TemplateManager } from './templateManager';
export { BatchIssuer } from './batchIssuer';
export { StatusManager } from './statusManager';

// Services
export { IssuanceService } from './services/issuance';
export { RegistryService } from './services/registry';
export { NotificationService } from './services/notification';
export { ComplianceService } from './services/compliance';

// Types
export * from './types';