/**
 * PersonaPass Issuer Client
 * Main client for credential issuance operations
 */

import { EventEmitter } from '../utils/eventEmitter';
import { IssuanceService } from './services/issuance';
import { RegistryService } from './services/registry';
import { NotificationService } from './services/notification';
import { ComplianceService } from './services/compliance';
import { CredentialBuilder } from './credentialBuilder';
import { TemplateManager } from './templateManager';
import { BatchIssuer } from './batchIssuer';
import { StatusManager } from './statusManager';
import type {
  IssuerConfig,
  CredentialTemplate,
  IssuanceRequest,
  IssuanceResult,
  BatchIssuanceOptions,
  IssuerMetrics,
  ComplianceReport
} from './types';

export interface IssuerClientOptions {
  apiEndpoint: string;
  chainEndpoint: string;
  issuerDID: string;
  privateKey: string;
  config?: Partial<IssuerConfig>;
  debug?: boolean;
}

export class IssuerClient extends EventEmitter {
  private readonly config: IssuerConfig;
  private readonly issuanceService: IssuanceService;
  private readonly registryService: RegistryService;
  private readonly notificationService: NotificationService;
  private readonly complianceService: ComplianceService;
  
  public readonly credentialBuilder: CredentialBuilder;
  public readonly templateManager: TemplateManager;
  public readonly batchIssuer: BatchIssuer;
  public readonly statusManager: StatusManager;

  constructor(options: IssuerClientOptions) {
    super();
    
    this.config = {
      apiEndpoint: options.apiEndpoint,
      chainEndpoint: options.chainEndpoint,
      issuerDID: options.issuerDID,
      privateKey: options.privateKey,
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      enableMetrics: true,
      enableCompliance: true,
      notifications: {
        enabled: true,
        channels: ['webhook', 'email']
      },
      ...options.config
    };

    // Initialize services
    this.issuanceService = new IssuanceService(this.config);
    this.registryService = new RegistryService(this.config);
    this.notificationService = new NotificationService(this.config);
    this.complianceService = new ComplianceService(this.config);

    // Initialize utilities
    this.credentialBuilder = new CredentialBuilder(this.config);
    this.templateManager = new TemplateManager(this.config);
    this.batchIssuer = new BatchIssuer(this.config, this.issuanceService);
    this.statusManager = new StatusManager(this.config, this.registryService);

    // Setup event forwarding
    this.setupEventForwarding();
  }

  /**
   * Issue a single verifiable credential
   */
  async issueCredential(request: IssuanceRequest): Promise<IssuanceResult> {
    try {
      this.emit('issuance:started', { request });
      
      // Validate request
      await this.validateIssuanceRequest(request);
      
      // Check compliance
      if (this.config.enableCompliance) {
        await this.complianceService.validateIssuance(request);
      }
      
      // Issue credential
      const result = await this.issuanceService.issue(request);
      
      // Register in blockchain
      await this.registryService.register(result.credential);
      
      // Send notifications
      if (this.config.notifications.enabled) {
        await this.notificationService.notifyIssuance(result);
      }
      
      this.emit('issuance:completed', { request, result });
      return result;
      
    } catch (error) {
      this.emit('issuance:failed', { request, error });
      throw error;
    }
  }

  /**
   * Issue multiple credentials in batch
   */
  async issueBatch(
    requests: IssuanceRequest[],
    options?: BatchIssuanceOptions
  ): Promise<IssuanceResult[]> {
    return this.batchIssuer.issue(requests, options);
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(credentialId: string, reason?: string): Promise<void> {
    try {
      this.emit('revocation:started', { credentialId, reason });
      
      // Update status in registry
      await this.statusManager.revoke(credentialId, reason);
      
      // Send notifications
      if (this.config.notifications.enabled) {
        await this.notificationService.notifyRevocation(credentialId, reason);
      }
      
      this.emit('revocation:completed', { credentialId, reason });
      
    } catch (error) {
      this.emit('revocation:failed', { credentialId, reason, error });
      throw error;
    }
  }

  /**
   * Suspend a credential temporarily
   */
  async suspendCredential(credentialId: string, reason?: string): Promise<void> {
    try {
      this.emit('suspension:started', { credentialId, reason });
      
      // Update status in registry
      await this.statusManager.suspend(credentialId, reason);
      
      // Send notifications
      if (this.config.notifications.enabled) {
        await this.notificationService.notifySuspension(credentialId, reason);
      }
      
      this.emit('suspension:completed', { credentialId, reason });
      
    } catch (error) {
      this.emit('suspension:failed', { credentialId, reason, error });
      throw error;
    }
  }

  /**
   * Get issuer metrics and analytics
   */
  async getMetrics(): Promise<IssuerMetrics> {
    return this.issuanceService.getMetrics();
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<ComplianceReport> {
    return this.complianceService.generateReport();
  }

  /**
   * Get credential templates
   */
  async getTemplates(): Promise<CredentialTemplate[]> {
    return this.templateManager.getTemplates();
  }

  /**
   * Create a new credential template
   */
  async createTemplate(template: Omit<CredentialTemplate, 'id' | 'createdAt'>): Promise<CredentialTemplate> {
    return this.templateManager.createTemplate(template);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, updates: Partial<CredentialTemplate>): Promise<CredentialTemplate> {
    return this.templateManager.updateTemplate(id, updates);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    return this.templateManager.deleteTemplate(id);
  }

  /**
   * Validate an issuance request
   */
  private async validateIssuanceRequest(request: IssuanceRequest): Promise<void> {
    // Basic validation
    if (!request.subjectDID) {
      throw new Error('Subject DID is required');
    }
    
    if (!request.credentialType) {
      throw new Error('Credential type is required');
    }
    
    if (!request.claims || Object.keys(request.claims).length === 0) {
      throw new Error('Claims are required');
    }
    
    // Validate against template if specified
    if (request.templateId) {
      const template = await this.templateManager.getTemplate(request.templateId);
      if (!template) {
        throw new Error(`Template ${request.templateId} not found`);
      }
      
      await this.templateManager.validateAgainstTemplate(request, template);
    }
  }

  /**
   * Setup event forwarding from services
   */
  private setupEventForwarding(): void {
    // Forward events from services
    [
      this.issuanceService,
      this.registryService,
      this.notificationService,
      this.complianceService,
      this.batchIssuer,
      this.statusManager
    ].forEach(service => {
      if (service instanceof EventEmitter) {
        service.onAny((event, data) => {
          this.emit(event, data);
        });
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cleanup services
    await Promise.all([
      this.issuanceService.cleanup?.(),
      this.registryService.cleanup?.(),
      this.notificationService.cleanup?.(),
      this.complianceService.cleanup?.(),
      this.batchIssuer.cleanup?.(),
      this.statusManager.cleanup?.()
    ].filter(Boolean));
    
    // Remove all listeners
    this.removeAllListeners();
  }
}

/**
 * Create a new IssuerClient instance
 */
export function createIssuerClient(options: IssuerClientOptions): IssuerClient {
  return new IssuerClient(options);
}

/**
 * Create default issuer configuration
 */
export function createDefaultIssuerConfig(): Partial<IssuerConfig> {
  return {
    batchSize: 100,
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000,
    enableMetrics: true,
    enableCompliance: true,
    notifications: {
      enabled: true,
      channels: ['webhook']
    }
  };
}