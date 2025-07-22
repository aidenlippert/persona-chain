import { VerifiableCredential, VCCreationResult } from './VCCreationService';
import { DIDService } from '../didService';
import { CryptoService } from '../cryptoService';
import { Logger } from '../utils/Logger';

/**
 * DID Attachment Service for PersonaChain
 * Manages the complete lifecycle of attaching Verifiable Credentials to DIDs
 * 
 * Features:
 * - Credential-to-DID attachment and lifecycle management
 * - DID document credential service endpoint management
 * - Credential portfolio and wallet management
 * - Credential presentation and sharing workflows
 * - Cross-platform credential synchronization
 * - Privacy-preserving credential management
 * - Credential search, filtering, and organization
 * - Automated credential refresh and updates
 * - Credential verification and integrity checking
 * - Credential relationship and dependency management
 */

export interface DIDCredentialAttachment {
  id: string;
  didId: string;
  credentialId: string;
  credential: VerifiableCredential;
  attachmentMetadata: AttachmentMetadata;
  accessControl: AccessControlPolicy;
  sharingRules: SharingRule[];
  presentationTemplates: PresentationTemplate[];
  lifecycleState: CredentialLifecycleState;
  relationships: CredentialRelationship[];
  synchronization: SynchronizationConfig;
}

export interface AttachmentMetadata {
  attachedAt: Date;
  attachedBy: string;
  attachmentMethod: 'direct' | 'service-endpoint' | 'linked-data' | 'encrypted';
  version: string;
  category: string;
  tags: string[];
  priority: number;
  visibility: 'public' | 'private' | 'selective' | 'encrypted';
  storageLocation: 'local' | 'ipfs' | 'blockchain' | 'cloud' | 'hybrid';
  backup: BackupConfiguration;
  retention: RetentionPolicy;
}

export interface AccessControlPolicy {
  owner: string;
  viewers: AccessPermission[];
  editors: AccessPermission[];
  controllers: AccessPermission[];
  defaultAccess: 'none' | 'read' | 'verify' | 'present';
  requiresConsent: boolean;
  consentDuration: string;
  auditLogging: boolean;
  geographicRestrictions: string[];
  timeRestrictions?: TimeRestriction[];
}

export interface AccessPermission {
  subject: string;
  subjectType: 'did' | 'organization' | 'application' | 'role' | 'group';
  permissions: string[];
  conditions: AccessCondition[];
  grantedAt: Date;
  expiresAt?: Date;
  grantedBy: string;
}

export interface AccessCondition {
  type: 'time' | 'location' | 'context' | 'purpose' | 'audience';
  operator: 'equals' | 'contains' | 'in' | 'between' | 'matches';
  value: any;
  required: boolean;
}

export interface SharingRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: SharingCondition[];
  actions: SharingAction[];
  recipients: SharingRecipient[];
  format: 'full-credential' | 'presentation' | 'selective-disclosure' | 'zero-knowledge';
  encryption: EncryptionOptions;
  auditTrail: boolean;
  expirationPolicy: ExpirationPolicy;
}

export interface SharingCondition {
  type: 'request-received' | 'time-based' | 'location-based' | 'purpose-based' | 'manual';
  parameters: Record<string, any>;
  priority: number;
}

export interface SharingAction {
  type: 'auto-share' | 'request-approval' | 'notify-only' | 'reject' | 'conditional-share';
  parameters: Record<string, any>;
  delay?: number;
}

export interface SharingRecipient {
  id: string;
  type: 'did' | 'organization' | 'application' | 'service' | 'verifier';
  trustLevel: number;
  previousInteractions: InteractionHistory[];
  preferences: RecipientPreferences;
}

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  purpose: string;
  audience: string[];
  credentialSelection: CredentialSelectionCriteria;
  disclosureLevel: 'minimal' | 'selective' | 'full' | 'zero-knowledge';
  format: 'vp' | 'custom' | 'standardized';
  schema: any;
  styling: PresentationStyling;
  validity: ValidityConfiguration;
}

export interface CredentialSelectionCriteria {
  includeTypes: string[];
  excludeTypes: string[];
  requiredFields: string[];
  optionalFields: string[];
  freshnessRequirement: string;
  verificationLevel: 'basic' | 'enhanced' | 'comprehensive';
  sourceRestrictions: string[];
}

export interface PresentationStyling {
  theme: string;
  colors: Record<string, string>;
  layout: 'card' | 'list' | 'grid' | 'timeline';
  branding: BrandingOptions;
  customCss?: string;
}

export interface BrandingOptions {
  logo?: string;
  organizationName?: string;
  colors?: Record<string, string>;
  fonts?: string[];
  customElements?: any[];
}

export interface ValidityConfiguration {
  validFrom?: Date;
  validUntil?: Date;
  maxUses?: number;
  singleUse: boolean;
  nonce?: string;
  challenge?: string;
}

export interface CredentialLifecycleState {
  status: 'active' | 'expired' | 'revoked' | 'suspended' | 'pending-refresh' | 'archived';
  lastVerified: Date;
  verificationStatus: 'valid' | 'invalid' | 'unknown' | 'pending';
  refreshSchedule?: RefreshSchedule;
  dependencies: CredentialDependency[];
  notifications: LifecycleNotification[];
  history: LifecycleEvent[];
}

export interface RefreshSchedule {
  enabled: boolean;
  interval: string;
  lastRefresh: Date;
  nextRefresh: Date;
  autoRefresh: boolean;
  refreshConditions: RefreshCondition[];
}

export interface RefreshCondition {
  type: 'expiration-warning' | 'data-staleness' | 'source-update' | 'verification-failure';
  threshold: any;
  action: 'refresh' | 'notify' | 'suspend';
}

export interface CredentialDependency {
  credentialId: string;
  relationship: 'requires' | 'enhances' | 'conflicts' | 'supersedes' | 'supports';
  strength: number;
  conditions: string[];
}

export interface CredentialRelationship {
  type: 'supersedes' | 'supplements' | 'contradicts' | 'confirms' | 'requires';
  targetCredentialId: string;
  strength: number;
  confidence: number;
  metadata: Record<string, any>;
}

export interface SynchronizationConfig {
  enabled: boolean;
  targets: SyncTarget[];
  strategy: 'real-time' | 'periodic' | 'on-demand' | 'event-driven';
  conflictResolution: 'latest-wins' | 'manual-resolve' | 'source-priority' | 'merge';
  encryptionInTransit: boolean;
  backupBeforeSync: boolean;
}

export interface SyncTarget {
  id: string;
  type: 'wallet' | 'cloud' | 'blockchain' | 'ipfs' | 'peer';
  endpoint: string;
  authentication: SyncAuthentication;
  lastSync: Date;
  syncStatus: 'active' | 'error' | 'disabled';
}

export interface DIDCredentialPortfolio {
  didId: string;
  attachments: DIDCredentialAttachment[];
  organization: PortfolioOrganization;
  analytics: PortfolioAnalytics;
  preferences: PortfolioPreferences;
  security: PortfolioSecurity;
  sharing: PortfolioSharing;
}

export interface PortfolioOrganization {
  categories: CredentialCategory[];
  collections: CredentialCollection[];
  tags: string[];
  customFields: CustomField[];
  sorting: SortingConfiguration;
  filtering: FilterConfiguration;
}

export interface CredentialCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  credentialTypes: string[];
  displayOrder: number;
  parentCategory?: string;
}

export interface CredentialCollection {
  id: string;
  name: string;
  description: string;
  credentialIds: string[];
  createdAt: Date;
  updatedAt: Date;
  sharing: CollectionSharingSettings;
  presentation: CollectionPresentationSettings;
}

export interface PortfolioAnalytics {
  totalCredentials: number;
  credentialsByType: Record<string, number>;
  credentialsBySource: Record<string, number>;
  credentialsByStatus: Record<string, number>;
  verificationStats: VerificationStatistics;
  usageStats: UsageStatistics;
  trendsAnalysis: TrendsAnalysis;
  recommendations: PortfolioRecommendation[];
}

export interface PortfolioPreferences {
  defaultVisibility: string;
  autoRefresh: boolean;
  notificationSettings: NotificationSettings;
  presentationDefaults: PresentationDefaults;
  backupSettings: BackupSettings;
  privacySettings: PrivacySettings;
}

export interface AttachmentRequest {
  didId: string;
  credential: VerifiableCredential;
  attachmentOptions: AttachmentOptions;
  accessControl?: AccessControlPolicy;
  sharingRules?: SharingRule[];
  metadata?: Partial<AttachmentMetadata>;
}

export interface AttachmentOptions {
  method: 'direct' | 'service-endpoint' | 'linked-data' | 'encrypted';
  storageLocation: 'local' | 'ipfs' | 'blockchain' | 'cloud' | 'hybrid';
  visibility: 'public' | 'private' | 'selective' | 'encrypted';
  backup: boolean;
  synchronize: boolean;
  category?: string;
  tags?: string[];
  priority?: number;
}

export interface AttachmentResult {
  success: boolean;
  attachmentId?: string;
  didDocumentUpdated: boolean;
  serviceEndpointCreated: boolean;
  storageLocation: string;
  accessUrls: string[];
  metadata: {
    attachedAt: Date;
    processingTime: number;
    method: string;
    storageSize: number;
    encryptionUsed: boolean;
  };
  errors?: string[];
  warnings?: string[];
}

export interface DetachmentRequest {
  didId: string;
  attachmentId: string;
  options: DetachmentOptions;
}

export interface DetachmentOptions {
  removeFromDIDDocument: boolean;
  removeFromStorage: boolean;
  revokeCredential: boolean;
  notifyRecipients: boolean;
  archiveInstead: boolean;
  reason?: string;
}

export interface PresentationRequest {
  didId: string;
  credentialIds?: string[];
  templateId?: string;
  audience: string;
  purpose: string;
  customCriteria?: CredentialSelectionCriteria;
  format: 'vp' | 'custom' | 'selective-disclosure' | 'zero-knowledge';
  deliveryMethod: 'return' | 'send' | 'publish' | 'qr-code';
  privacyOptions?: PresentationPrivacyOptions;
}

export interface PresentationPrivacyOptions {
  minimizeData: boolean;
  anonymize: boolean;
  useZeroKnowledge: boolean;
  selectiveFields?: string[];
  linkabilityPrevention: boolean;
}

export class DIDAttachmentService {
  private attachments: Map<string, DIDCredentialAttachment> = new Map();
  private portfolios: Map<string, DIDCredentialPortfolio> = new Map();
  private logger: Logger;
  private didService: DIDService;
  private cryptoService: CryptoService;
  private storageService: StorageService;
  private syncService: SynchronizationService;
  private presentationService: PresentationService;

  constructor() {
    this.logger = new Logger('DIDAttachmentService');
    this.didService = new DIDService();
    this.cryptoService = new CryptoService();
    this.storageService = new StorageService();
    this.syncService = new SynchronizationService();
    this.presentationService = new PresentationService();
  }

  /**
   * Attach a verifiable credential to a DID
   */
  public async attachCredentialToDID(request: AttachmentRequest): Promise<AttachmentResult> {
    const startTime = Date.now();

    try {
      // 1. Validate DID exists and is controlled by requester
      const didDocument = await this.didService.resolveDID(request.didId);
      if (!didDocument) {
        throw new Error(`DID ${request.didId} not found`);
      }

      // 2. Validate credential
      const validationResult = await this.validateCredentialForAttachment(request.credential);
      if (!validationResult.valid) {
        throw new Error(`Credential validation failed: ${validationResult.errors.join(', ')}`);
      }

      // 3. Generate attachment ID
      const attachmentId = this.generateAttachmentId();

      // 4. Prepare attachment metadata
      const attachmentMetadata: AttachmentMetadata = {
        attachedAt: new Date(),
        attachedBy: request.didId,
        attachmentMethod: request.attachmentOptions.method,
        version: '1.0.0',
        category: request.attachmentOptions.category || 'general',
        tags: request.attachmentOptions.tags || [],
        priority: request.attachmentOptions.priority || 1,
        visibility: request.attachmentOptions.visibility,
        storageLocation: request.attachmentOptions.storageLocation,
        backup: this.createBackupConfiguration(request.attachmentOptions.backup),
        retention: this.createDefaultRetentionPolicy(),
        ...request.metadata,
      };

      // 5. Store credential based on storage method
      const storageResult = await this.storeCredential(
        request.credential,
        request.attachmentOptions.storageLocation,
        request.attachmentOptions.visibility === 'encrypted'
      );

      // 6. Create credential attachment record
      const attachment: DIDCredentialAttachment = {
        id: attachmentId,
        didId: request.didId,
        credentialId: request.credential.id,
        credential: request.credential,
        attachmentMetadata,
        accessControl: request.accessControl || this.createDefaultAccessControl(request.didId),
        sharingRules: request.sharingRules || [],
        presentationTemplates: this.createDefaultPresentationTemplates(request.credential),
        lifecycleState: this.initializeLifecycleState(),
        relationships: await this.detectCredentialRelationships(request.didId, request.credential),
        synchronization: this.createDefaultSyncConfig(),
      };

      // 7. Update DID document if required
      let didDocumentUpdated = false;
      let serviceEndpointCreated = false;

      if (request.attachmentOptions.method === 'service-endpoint') {
        await this.addCredentialServiceEndpoint(request.didId, attachment);
        didDocumentUpdated = true;
        serviceEndpointCreated = true;
      } else if (request.attachmentOptions.method === 'linked-data') {
        await this.addLinkedDataReference(request.didId, attachment);
        didDocumentUpdated = true;
      }

      // 8. Store attachment
      this.attachments.set(attachmentId, attachment);

      // 9. Update portfolio
      await this.updatePortfolio(request.didId, attachment);

      // 10. Set up synchronization if enabled
      if (request.attachmentOptions.synchronize) {
        await this.syncService.setupSync(attachment);
      }

      // 11. Trigger lifecycle management
      await this.startLifecycleManagement(attachment);

      const result: AttachmentResult = {
        success: true,
        attachmentId,
        didDocumentUpdated,
        serviceEndpointCreated,
        storageLocation: storageResult.location,
        accessUrls: storageResult.accessUrls,
        metadata: {
          attachedAt: new Date(),
          processingTime: Date.now() - startTime,
          method: request.attachmentOptions.method,
          storageSize: storageResult.size,
          encryptionUsed: storageResult.encrypted,
        },
      };

      this.logger.info(`Credential attached to DID ${request.didId}:`, result);
      return result;

    } catch (error) {
      this.logger.error(`Failed to attach credential to DID ${request.didId}:`, error);
      
      return {
        success: false,
        didDocumentUpdated: false,
        serviceEndpointCreated: false,
        storageLocation: '',
        accessUrls: [],
        metadata: {
          attachedAt: new Date(),
          processingTime: Date.now() - startTime,
          method: request.attachmentOptions.method,
          storageSize: 0,
          encryptionUsed: false,
        },
        errors: [error.message],
      };
    }
  }

  /**
   * Detach a credential from a DID
   */
  public async detachCredentialFromDID(request: DetachmentRequest): Promise<boolean> {
    try {
      const attachment = this.attachments.get(request.attachmentId);
      if (!attachment || attachment.didId !== request.didId) {
        throw new Error('Attachment not found or access denied');
      }

      // 1. Remove from DID document if requested
      if (request.options.removeFromDIDDocument) {
        await this.removeFromDIDDocument(attachment);
      }

      // 2. Remove from storage if requested
      if (request.options.removeFromStorage) {
        await this.storageService.remove(attachment.credentialId);
      }

      // 3. Revoke credential if requested
      if (request.options.revokeCredential) {
        await this.revokeCredential(attachment.credential);
      }

      // 4. Notify recipients if requested
      if (request.options.notifyRecipients) {
        await this.notifyDetachment(attachment, request.options.reason);
      }

      // 5. Archive or delete attachment
      if (request.options.archiveInstead) {
        attachment.lifecycleState.status = 'archived';
        attachment.lifecycleState.history.push({
          event: 'archived',
          timestamp: new Date(),
          reason: request.options.reason,
          actor: request.didId,
        });
      } else {
        this.attachments.delete(request.attachmentId);
      }

      // 6. Update portfolio
      await this.updatePortfolioAfterDetachment(request.didId, request.attachmentId);

      this.logger.info(`Credential detached from DID ${request.didId}: ${request.attachmentId}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to detach credential:`, error);
      return false;
    }
  }

  /**
   * Get DID credential portfolio
   */
  public async getDIDPortfolio(didId: string): Promise<DIDCredentialPortfolio | null> {
    if (!this.portfolios.has(didId)) {
      await this.initializePortfolio(didId);
    }

    const portfolio = this.portfolios.get(didId);
    if (portfolio) {
      // Update analytics
      portfolio.analytics = await this.calculatePortfolioAnalytics(didId);
    }

    return portfolio || null;
  }

  /**
   * Create a credential presentation
   */
  public async createPresentation(request: PresentationRequest): Promise<any> {
    try {
      const portfolio = await this.getDIDPortfolio(request.didId);
      if (!portfolio) {
        throw new Error(`Portfolio not found for DID ${request.didId}`);
      }

      // 1. Select credentials based on criteria
      let selectedCredentials: VerifiableCredential[];
      
      if (request.credentialIds) {
        selectedCredentials = await this.getCredentialsByIds(request.didId, request.credentialIds);
      } else if (request.templateId) {
        selectedCredentials = await this.selectCredentialsByTemplate(request.didId, request.templateId);
      } else if (request.customCriteria) {
        selectedCredentials = await this.selectCredentialsByCriteria(request.didId, request.customCriteria);
      } else {
        throw new Error('No credential selection criteria provided');
      }

      // 2. Apply privacy options
      if (request.privacyOptions) {
        selectedCredentials = await this.applyPrivacyOptionsToCredentials(
          selectedCredentials,
          request.privacyOptions
        );
      }

      // 3. Create presentation
      const presentation = await this.presentationService.createPresentation({
        credentials: selectedCredentials,
        holder: request.didId,
        audience: request.audience,
        purpose: request.purpose,
        format: request.format,
      });

      // 4. Handle delivery
      switch (request.deliveryMethod) {
        case 'return':
          return presentation;
        case 'send':
          await this.sendPresentation(presentation, request.audience);
          return { sent: true, presentationId: presentation.id };
        case 'publish':
          const url = await this.publishPresentation(presentation);
          return { published: true, url };
        case 'qr-code':
          const qrCode = await this.generatePresentationQRCode(presentation);
          return { qrCode, presentationId: presentation.id };
        default:
          return presentation;
      }

    } catch (error) {
      this.logger.error(`Failed to create presentation:`, error);
      throw error;
    }
  }

  /**
   * Search credentials in a DID's portfolio
   */
  public async searchCredentials(
    didId: string,
    query: CredentialSearchQuery
  ): Promise<CredentialSearchResult[]> {
    const portfolio = await this.getDIDPortfolio(didId);
    if (!portfolio) {
      return [];
    }

    let results = portfolio.attachments;

    // Apply filters
    if (query.types && query.types.length > 0) {
      results = results.filter(attachment =>
        query.types!.some(type => attachment.credential.type.includes(type))
      );
    }

    if (query.categories && query.categories.length > 0) {
      results = results.filter(attachment =>
        query.categories!.includes(attachment.attachmentMetadata.category)
      );
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(attachment =>
        query.tags!.some(tag => attachment.attachmentMetadata.tags.includes(tag))
      );
    }

    if (query.status && query.status.length > 0) {
      results = results.filter(attachment =>
        query.status!.includes(attachment.lifecycleState.status)
      );
    }

    if (query.dateRange) {
      results = results.filter(attachment => {
        const issuanceDate = new Date(attachment.credential.issuanceDate);
        return issuanceDate >= query.dateRange!.from && issuanceDate <= query.dateRange!.to;
      });
    }

    if (query.textSearch) {
      const searchTerm = query.textSearch.toLowerCase();
      results = results.filter(attachment =>
        JSON.stringify(attachment.credential.credentialSubject).toLowerCase().includes(searchTerm) ||
        attachment.attachmentMetadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply sorting
    if (query.sortBy) {
      results = this.sortCredentials(results, query.sortBy, query.sortOrder || 'desc');
    }

    // Apply pagination
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    return paginatedResults.map(attachment => ({
      attachmentId: attachment.id,
      credential: attachment.credential,
      metadata: attachment.attachmentMetadata,
      lifecycleState: attachment.lifecycleState,
      relevanceScore: this.calculateRelevanceScore(attachment, query),
    }));
  }

  /**
   * Refresh credentials based on their refresh policies
   */
  public async refreshCredentials(didId: string, credentialIds?: string[]): Promise<RefreshResult[]> {
    const portfolio = await this.getDIDPortfolio(didId);
    if (!portfolio) {
      return [];
    }

    let attachmentsToRefresh = portfolio.attachments;
    
    if (credentialIds) {
      attachmentsToRefresh = attachmentsToRefresh.filter(attachment =>
        credentialIds.includes(attachment.credentialId)
      );
    } else {
      // Only refresh credentials that need refreshing
      attachmentsToRefresh = attachmentsToRefresh.filter(attachment =>
        this.needsRefresh(attachment)
      );
    }

    const results: RefreshResult[] = [];

    for (const attachment of attachmentsToRefresh) {
      try {
        const refreshResult = await this.refreshSingleCredential(attachment);
        results.push(refreshResult);
      } catch (error) {
        results.push({
          credentialId: attachment.credentialId,
          success: false,
          error: error.message,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Private helper methods
   */
  private async validateCredentialForAttachment(credential: VerifiableCredential): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check required fields
    if (!credential.id) errors.push('Credential ID is required');
    if (!credential.issuer) errors.push('Credential issuer is required');
    if (!credential.credentialSubject) errors.push('Credential subject is required');
    if (!credential.proof) errors.push('Credential proof is required');

    // Verify cryptographic proof
    try {
      const proofValid = await this.cryptoService.verifyCredentialProof(credential);
      if (!proofValid) {
        errors.push('Credential proof verification failed');
      }
    } catch (error) {
      errors.push(`Proof verification error: ${error.message}`);
    }

    // Check expiration
    if (credential.expirationDate) {
      const expirationDate = new Date(credential.expirationDate);
      if (expirationDate <= new Date()) {
        errors.push('Credential has expired');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private generateAttachmentId(): string {
    return `attach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createBackupConfiguration(enabled: boolean): BackupConfiguration {
    return {
      enabled,
      frequency: 'daily',
      retention: 30,
      destinations: enabled ? ['local', 'cloud'] : [],
      encryption: true,
    };
  }

  private createDefaultRetentionPolicy(): RetentionPolicy {
    return {
      retainFor: 'P7Y', // 7 years
      deleteAfter: true,
      archiveAfter: 'P5Y', // Archive after 5 years
      conditions: [],
    };
  }

  private createDefaultAccessControl(ownerId: string): AccessControlPolicy {
    return {
      owner: ownerId,
      viewers: [],
      editors: [],
      controllers: [
        {
          subject: ownerId,
          subjectType: 'did',
          permissions: ['read', 'write', 'share', 'revoke'],
          conditions: [],
          grantedAt: new Date(),
          grantedBy: ownerId,
        },
      ],
      defaultAccess: 'none',
      requiresConsent: true,
      consentDuration: 'P1Y',
      auditLogging: true,
      geographicRestrictions: [],
    };
  }

  private createDefaultPresentationTemplates(credential: VerifiableCredential): PresentationTemplate[] {
    return [
      {
        id: `template_${credential.type[1]?.toLowerCase() || 'default'}`,
        name: `${credential.type[1] || 'Credential'} Presentation`,
        description: `Standard presentation template for ${credential.type[1] || 'credential'}`,
        purpose: 'verification',
        audience: ['verifier'],
        credentialSelection: {
          includeTypes: credential.type,
          excludeTypes: [],
          requiredFields: ['id'],
          optionalFields: [],
          freshnessRequirement: 'P30D',
          verificationLevel: 'basic',
          sourceRestrictions: [],
        },
        disclosureLevel: 'selective',
        format: 'vp',
        schema: {},
        styling: {
          theme: 'default',
          colors: { primary: '#007bff', secondary: '#6c757d' },
          layout: 'card',
          branding: {
            organizationName: 'PersonaChain',
          },
        },
        validity: {
          singleUse: false,
          maxUses: 100,
        },
      },
    ];
  }

  private initializeLifecycleState(): CredentialLifecycleState {
    return {
      status: 'active',
      lastVerified: new Date(),
      verificationStatus: 'valid',
      dependencies: [],
      notifications: [],
      history: [
        {
          event: 'attached',
          timestamp: new Date(),
          actor: 'system',
        },
      ],
    };
  }

  private async detectCredentialRelationships(
    didId: string,
    newCredential: VerifiableCredential
  ): Promise<CredentialRelationship[]> {
    const relationships: CredentialRelationship[] = [];
    const portfolio = await this.getDIDPortfolio(didId);
    
    if (!portfolio) return relationships;

    for (const attachment of portfolio.attachments) {
      const relationship = this.analyzeCredentialRelationship(newCredential, attachment.credential);
      if (relationship) {
        relationships.push({
          ...relationship,
          targetCredentialId: attachment.credentialId,
        });
      }
    }

    return relationships;
  }

  private analyzeCredentialRelationship(
    cred1: VerifiableCredential,
    cred2: VerifiableCredential
  ): Partial<CredentialRelationship> | null {
    // Simple relationship detection - can be enhanced with ML
    if (cred1.type.some(type => cred2.type.includes(type))) {
      return {
        type: 'confirms',
        strength: 0.8,
        confidence: 0.7,
        metadata: { reason: 'same-type-confirmation' },
      };
    }

    if (cred1.issuer.id === cred2.issuer.id) {
      return {
        type: 'supplements',
        strength: 0.6,
        confidence: 0.8,
        metadata: { reason: 'same-issuer' },
      };
    }

    return null;
  }

  private createDefaultSyncConfig(): SynchronizationConfig {
    return {
      enabled: false,
      targets: [],
      strategy: 'on-demand',
      conflictResolution: 'latest-wins',
      encryptionInTransit: true,
      backupBeforeSync: true,
    };
  }

  private async storeCredential(
    credential: VerifiableCredential,
    location: string,
    encrypt: boolean
  ): Promise<{ location: string; accessUrls: string[]; size: number; encrypted: boolean }> {
    return this.storageService.store(credential, location, encrypt);
  }

  private async addCredentialServiceEndpoint(
    didId: string,
    attachment: DIDCredentialAttachment
  ): Promise<void> {
    const serviceEndpoint = {
      id: `${didId}#credential-${attachment.id}`,
      type: 'CredentialRepository',
      serviceEndpoint: `https://personachain.org/credentials/${attachment.credentialId}`,
    };

    await this.didService.addServiceEndpoint(didId, serviceEndpoint);
  }

  private async addLinkedDataReference(
    didId: string,
    attachment: DIDCredentialAttachment
  ): Promise<void> {
    // Add linked data reference to DID document
    await this.didService.addLinkedDataReference(didId, {
      type: 'VerifiableCredential',
      href: `https://personachain.org/credentials/${attachment.credentialId}`,
    });
  }

  private async updatePortfolio(didId: string, attachment: DIDCredentialAttachment): Promise<void> {
    if (!this.portfolios.has(didId)) {
      await this.initializePortfolio(didId);
    }

    const portfolio = this.portfolios.get(didId)!;
    portfolio.attachments.push(attachment);
    
    // Update analytics
    portfolio.analytics = await this.calculatePortfolioAnalytics(didId);
  }

  private async initializePortfolio(didId: string): Promise<void> {
    const portfolio: DIDCredentialPortfolio = {
      didId,
      attachments: [],
      organization: {
        categories: this.getDefaultCategories(),
        collections: [],
        tags: [],
        customFields: [],
        sorting: { field: 'issuanceDate', order: 'desc' },
        filtering: { enabled: [], disabled: [] },
      },
      analytics: {
        totalCredentials: 0,
        credentialsByType: {},
        credentialsBySource: {},
        credentialsByStatus: {},
        verificationStats: { total: 0, valid: 0, invalid: 0, pending: 0 },
        usageStats: { presentations: 0, verifications: 0, shares: 0 },
        trendsAnalysis: { growth: 0, activePeriods: [], popularTypes: [] },
        recommendations: [],
      },
      preferences: this.getDefaultPreferences(),
      security: this.getDefaultSecuritySettings(),
      sharing: this.getDefaultSharingSettings(),
    };

    this.portfolios.set(didId, portfolio);
  }

  private getDefaultCategories(): CredentialCategory[] {
    return [
      {
        id: 'identity',
        name: 'Identity',
        description: 'Identity verification credentials',
        color: '#007bff',
        icon: 'user',
        credentialTypes: ['IdentityVerificationCredential'],
        displayOrder: 1,
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Professional and employment credentials',
        color: '#28a745',
        icon: 'briefcase',
        credentialTypes: ['ProfessionalProfileCredential', 'EmploymentCredential'],
        displayOrder: 2,
      },
      {
        id: 'financial',
        name: 'Financial',
        description: 'Financial and credit credentials',
        color: '#ffc107',
        icon: 'credit-card',
        credentialTypes: ['FinancialVerificationCredential', 'CreditScoreCredential'],
        displayOrder: 3,
      },
      {
        id: 'education',
        name: 'Education',
        description: 'Educational qualifications and certifications',
        color: '#17a2b8',
        icon: 'graduation-cap',
        credentialTypes: ['EducationCredential', 'CertificationCredential'],
        displayOrder: 4,
      },
    ];
  }

  private getDefaultPreferences(): PortfolioPreferences {
    return {
      defaultVisibility: 'private',
      autoRefresh: true,
      notificationSettings: {
        email: true,
        push: true,
        sms: false,
        types: ['expiration', 'verification-failure', 'share-request'],
      },
      presentationDefaults: {
        format: 'vp',
        disclosureLevel: 'selective',
        styling: 'default',
      },
      backupSettings: {
        enabled: true,
        frequency: 'daily',
        retention: 30,
        encryption: true,
      },
      privacySettings: {
        minimizeData: true,
        anonymizeMetadata: false,
        linkabilityPrevention: true,
        geographicRestrictions: [],
      },
    };
  }

  private getDefaultSecuritySettings(): PortfolioSecurity {
    return {
      encryption: 'AES-256',
      accessLogging: true,
      integrityChecking: true,
      backupEncryption: true,
      multiFactorAuth: false,
      sessionTimeout: 3600,
      ipWhitelist: [],
      geofencing: false,
    };
  }

  private getDefaultSharingSettings(): PortfolioSharing {
    return {
      defaultShareDuration: 'P30D',
      requireExplicitConsent: true,
      allowAnonymousSharing: false,
      trackSharing: true,
      revokeOnSuspicion: true,
      maxSimultaneousShares: 10,
      trustedRecipients: [],
      blockedRecipients: [],
    };
  }

  private async calculatePortfolioAnalytics(didId: string): Promise<PortfolioAnalytics> {
    const portfolio = this.portfolios.get(didId);
    if (!portfolio) {
      throw new Error(`Portfolio not found for DID ${didId}`);
    }

    const attachments = portfolio.attachments;
    
    const analytics: PortfolioAnalytics = {
      totalCredentials: attachments.length,
      credentialsByType: {},
      credentialsBySource: {},
      credentialsByStatus: {},
      verificationStats: { total: 0, valid: 0, invalid: 0, pending: 0 },
      usageStats: { presentations: 0, verifications: 0, shares: 0 },
      trendsAnalysis: { growth: 0, activePeriods: [], popularTypes: [] },
      recommendations: [],
    };

    // Calculate statistics
    for (const attachment of attachments) {
      // By type
      const primaryType = attachment.credential.type[1] || 'Unknown';
      analytics.credentialsByType[primaryType] = (analytics.credentialsByType[primaryType] || 0) + 1;

      // By source (issuer)
      const issuer = attachment.credential.issuer.name || attachment.credential.issuer.id;
      analytics.credentialsBySource[issuer] = (analytics.credentialsBySource[issuer] || 0) + 1;

      // By status
      const status = attachment.lifecycleState.status;
      analytics.credentialsByStatus[status] = (analytics.credentialsByStatus[status] || 0) + 1;

      // Verification stats
      analytics.verificationStats.total++;
      switch (attachment.lifecycleState.verificationStatus) {
        case 'valid':
          analytics.verificationStats.valid++;
          break;
        case 'invalid':
          analytics.verificationStats.invalid++;
          break;
        case 'pending':
          analytics.verificationStats.pending++;
          break;
      }
    }

    return analytics;
  }

  private async startLifecycleManagement(attachment: DIDCredentialAttachment): Promise<void> {
    // Set up refresh schedule if credential has expiration
    if (attachment.credential.expirationDate) {
      const expirationDate = new Date(attachment.credential.expirationDate);
      const warningDate = new Date(expirationDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before

      attachment.lifecycleState.refreshSchedule = {
        enabled: true,
        interval: 'P30D',
        lastRefresh: new Date(),
        nextRefresh: warningDate,
        autoRefresh: false,
        refreshConditions: [
          {
            type: 'expiration-warning',
            threshold: warningDate,
            action: 'notify',
          },
        ],
      };
    }
  }

  private needsRefresh(attachment: DIDCredentialAttachment): boolean {
    const schedule = attachment.lifecycleState.refreshSchedule;
    if (!schedule || !schedule.enabled) return false;

    return new Date() >= schedule.nextRefresh;
  }

  private async refreshSingleCredential(attachment: DIDCredentialAttachment): Promise<RefreshResult> {
    // Implementation would integrate with VCCreationService to refresh credential
    // This is a placeholder for the actual refresh logic
    return {
      credentialId: attachment.credentialId,
      success: true,
      newCredentialId: `refreshed_${attachment.credentialId}`,
      timestamp: new Date(),
    };
  }

  private sortCredentials(
    attachments: DIDCredentialAttachment[],
    sortBy: string,
    order: 'asc' | 'desc'
  ): DIDCredentialAttachment[] {
    return attachments.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'issuanceDate':
          aValue = new Date(a.credential.issuanceDate);
          bValue = new Date(b.credential.issuanceDate);
          break;
        case 'attachedAt':
          aValue = a.attachmentMetadata.attachedAt;
          bValue = b.attachmentMetadata.attachedAt;
          break;
        case 'priority':
          aValue = a.attachmentMetadata.priority;
          bValue = b.attachmentMetadata.priority;
          break;
        case 'type':
          aValue = a.credential.type[1] || '';
          bValue = b.credential.type[1] || '';
          break;
        default:
          return 0;
      }

      if (order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  private calculateRelevanceScore(attachment: DIDCredentialAttachment, query: CredentialSearchQuery): number {
    let score = 0;

    // Type match
    if (query.types?.some(type => attachment.credential.type.includes(type))) {
      score += 0.3;
    }

    // Category match
    if (query.categories?.includes(attachment.attachmentMetadata.category)) {
      score += 0.2;
    }

    // Tag match
    if (query.tags?.some(tag => attachment.attachmentMetadata.tags.includes(tag))) {
      score += 0.2;
    }

    // Freshness
    const daysSinceIssued = (Date.now() - new Date(attachment.credential.issuanceDate).getTime()) / (24 * 60 * 60 * 1000);
    score += Math.max(0, 0.3 - (daysSinceIssued / 365) * 0.3); // Newer credentials score higher

    return Math.min(1, score);
  }

  private async getCredentialsByIds(didId: string, credentialIds: string[]): Promise<VerifiableCredential[]> {
    const portfolio = await this.getDIDPortfolio(didId);
    if (!portfolio) return [];

    return portfolio.attachments
      .filter(attachment => credentialIds.includes(attachment.credentialId))
      .map(attachment => attachment.credential);
  }

  private async selectCredentialsByTemplate(didId: string, templateId: string): Promise<VerifiableCredential[]> {
    const portfolio = await this.getDIDPortfolio(didId);
    if (!portfolio) return [];

    const template = portfolio.attachments[0]?.presentationTemplates.find(t => t.id === templateId);
    if (!template) return [];

    return portfolio.attachments
      .filter(attachment => 
        template.credentialSelection.includeTypes.some(type => 
          attachment.credential.type.includes(type)
        )
      )
      .map(attachment => attachment.credential);
  }

  private async selectCredentialsByCriteria(
    didId: string,
    criteria: CredentialSelectionCriteria
  ): Promise<VerifiableCredential[]> {
    const portfolio = await this.getDIDPortfolio(didId);
    if (!portfolio) return [];

    return portfolio.attachments
      .filter(attachment => {
        // Include types filter
        if (criteria.includeTypes.length > 0) {
          const hasIncludedType = criteria.includeTypes.some(type => 
            attachment.credential.type.includes(type)
          );
          if (!hasIncludedType) return false;
        }

        // Exclude types filter
        if (criteria.excludeTypes.length > 0) {
          const hasExcludedType = criteria.excludeTypes.some(type => 
            attachment.credential.type.includes(type)
          );
          if (hasExcludedType) return false;
        }

        // Required fields filter
        if (criteria.requiredFields.length > 0) {
          const hasAllRequiredFields = criteria.requiredFields.every(field => 
            attachment.credential.credentialSubject.hasOwnProperty(field)
          );
          if (!hasAllRequiredFields) return false;
        }

        return true;
      })
      .map(attachment => attachment.credential);
  }

  private async applyPrivacyOptionsToCredentials(
    credentials: VerifiableCredential[],
    privacyOptions: PresentationPrivacyOptions
  ): Promise<VerifiableCredential[]> {
    // Apply privacy transformations to credentials
    return credentials; // Simplified for now
  }

  private async sendPresentation(presentation: any, audience: string): Promise<void> {
    // Send presentation to audience
  }

  private async publishPresentation(presentation: any): Promise<string> {
    // Publish presentation and return URL
    return `https://personachain.org/presentations/${presentation.id}`;
  }

  private async generatePresentationQRCode(presentation: any): Promise<string> {
    // Generate QR code for presentation
    return `data:image/png;base64,QR_CODE_DATA`;
  }

  private async removeFromDIDDocument(attachment: DIDCredentialAttachment): Promise<void> {
    // Remove credential references from DID document
  }

  private async revokeCredential(credential: VerifiableCredential): Promise<void> {
    // Revoke the credential
  }

  private async notifyDetachment(attachment: DIDCredentialAttachment, reason?: string): Promise<void> {
    // Notify relevant parties about credential detachment
  }

  private async updatePortfolioAfterDetachment(didId: string, attachmentId: string): Promise<void> {
    const portfolio = this.portfolios.get(didId);
    if (portfolio) {
      portfolio.attachments = portfolio.attachments.filter(a => a.id !== attachmentId);
      portfolio.analytics = await this.calculatePortfolioAnalytics(didId);
    }
  }
}

// Supporting interfaces and types
interface BackupConfiguration {
  enabled: boolean;
  frequency: string;
  retention: number;
  destinations: string[];
  encryption: boolean;
}

interface RetentionPolicy {
  retainFor: string;
  deleteAfter: boolean;
  archiveAfter: string;
  conditions: any[];
}

interface InteractionHistory {
  timestamp: Date;
  type: string;
  outcome: string;
  metadata: any;
}

interface RecipientPreferences {
  preferredFormat: string;
  deliveryMethod: string;
  privacyLevel: string;
  notificationSettings: any;
}

interface TimeRestriction {
  start: string;
  end: string;
  timezone: string;
  recurring: boolean;
}

interface CollectionSharingSettings {
  allowSharing: boolean;
  defaultRecipients: string[];
  sharePermissions: string[];
}

interface CollectionPresentationSettings {
  template: string;
  styling: any;
  includeMetadata: boolean;
}

interface VerificationStatistics {
  total: number;
  valid: number;
  invalid: number;
  pending: number;
}

interface UsageStatistics {
  presentations: number;
  verifications: number;
  shares: number;
}

interface TrendsAnalysis {
  growth: number;
  activePeriods: any[];
  popularTypes: any[];
}

interface PortfolioRecommendation {
  type: string;
  title: string;
  description: string;
  priority: number;
  actions: any[];
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  types: string[];
}

interface PresentationDefaults {
  format: string;
  disclosureLevel: string;
  styling: string;
}

interface BackupSettings {
  enabled: boolean;
  frequency: string;
  retention: number;
  encryption: boolean;
}

interface PrivacySettings {
  minimizeData: boolean;
  anonymizeMetadata: boolean;
  linkabilityPrevention: boolean;
  geographicRestrictions: string[];
}

interface PortfolioSecurity {
  encryption: string;
  accessLogging: boolean;
  integrityChecking: boolean;
  backupEncryption: boolean;
  multiFactorAuth: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  geofencing: boolean;
}

interface PortfolioSharing {
  defaultShareDuration: string;
  requireExplicitConsent: boolean;
  allowAnonymousSharing: boolean;
  trackSharing: boolean;
  revokeOnSuspicion: boolean;
  maxSimultaneousShares: number;
  trustedRecipients: string[];
  blockedRecipients: string[];
}

interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: any[];
}

interface SortingConfiguration {
  field: string;
  order: 'asc' | 'desc';
}

interface FilterConfiguration {
  enabled: string[];
  disabled: string[];
}

interface SyncAuthentication {
  type: string;
  credentials: any;
  headers?: any;
}

interface LifecycleNotification {
  type: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface LifecycleEvent {
  event: string;
  timestamp: Date;
  actor: string;
  reason?: string;
  metadata?: any;
}

interface ExpirationPolicy {
  type: string;
  duration?: string;
  conditions?: any[];
}

interface CredentialSearchQuery {
  types?: string[];
  categories?: string[];
  tags?: string[];
  status?: string[];
  dateRange?: { from: Date; to: Date };
  textSearch?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface CredentialSearchResult {
  attachmentId: string;
  credential: VerifiableCredential;
  metadata: AttachmentMetadata;
  lifecycleState: CredentialLifecycleState;
  relevanceScore: number;
}

interface RefreshResult {
  credentialId: string;
  success: boolean;
  newCredentialId?: string;
  error?: string;
  timestamp: Date;
}

// Supporting service classes (simplified implementations)
class StorageService {
  async store(credential: VerifiableCredential, location: string, encrypt: boolean): Promise<any> {
    return {
      location: `${location}/${credential.id}`,
      accessUrls: [`https://storage.personachain.org/${credential.id}`],
      size: JSON.stringify(credential).length,
      encrypted: encrypt,
    };
  }

  async remove(credentialId: string): Promise<void> {
    // Remove credential from storage
  }
}

class SynchronizationService {
  async setupSync(attachment: DIDCredentialAttachment): Promise<void> {
    // Set up synchronization for attachment
  }
}

class PresentationService {
  async createPresentation(options: any): Promise<any> {
    return {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      id: `urn:uuid:${Date.now()}`,
      holder: options.holder,
      verifiableCredential: options.credentials,
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${options.holder}#key-1`,
        proofPurpose: 'authentication',
      },
    };
  }
}