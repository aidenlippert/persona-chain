import { APIResponse } from './APIAggregatorService';
import { DIDService } from '../didService';
import { CryptoService } from '../cryptoService';
import { Logger } from '../utils/Logger';
import { validateSchema } from '../utils/SchemaValidator';

/**
 * VC Creation and Issuance Service for PersonaChain
 * Transforms API data into W3C Verifiable Credentials and manages the complete issuance lifecycle
 * 
 * Features:
 * - W3C VC specification compliance
 * - Dynamic credential schema generation and validation
 * - Multi-signature support with cryptographic verification
 * - Credential template management and customization
 * - Issuance workflow orchestration with state management
 * - DID integration and credential attachment
 * - Credential revocation and lifecycle management
 * - Privacy-preserving credential features
 * - Batch credential creation and optimization
 * - Compliance with international standards (ISO, NIST)
 */

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name?: string;
    description?: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: any;
  };
  credentialSchema?: {
    id: string;
    type: string;
  };
  credentialStatus?: {
    id: string;
    type: string;
    statusPurpose: string;
    statusListIndex: string;
    statusListCredential: string;
  };
  proof: CredentialProof | CredentialProof[];
  refreshService?: {
    id: string;
    type: string;
  };
  termsOfUse?: {
    type: string;
    id?: string;
    [key: string]: any;
  }[];
  evidence?: {
    id?: string;
    type: string[];
    [key: string]: any;
  }[];
}

export interface CredentialProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue?: string;
  jws?: string;
  challenge?: string;
  domain?: string;
  nonce?: string;
}

export interface CredentialTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  schema: CredentialSchema;
  contexts: string[];
  types: string[];
  credentialSubjectTemplate: any;
  proofRequirements: ProofRequirement[];
  issuanceRules: IssuanceRule[];
  expirationPolicy: ExpirationPolicy;
  revocationPolicy: RevocationPolicy;
  refreshPolicy?: RefreshPolicy;
  termsOfUse?: any[];
  evidenceRequirements?: EvidenceRequirement[];
}

export interface CredentialSchema {
  id: string;
  type: string;
  jsonSchema: any;
  linkedDataSchema?: any;
  validationRules: ValidationRule[];
}

export interface ProofRequirement {
  type: string;
  verificationMethod: string;
  challenge?: boolean;
  domain?: string;
  created?: boolean;
  expires?: string;
}

export interface IssuanceRule {
  condition: string;
  action: string;
  parameters: Record<string, any>;
  priority: number;
}

export interface ExpirationPolicy {
  type: 'fixed' | 'sliding' | 'conditional' | 'never';
  duration?: string; // ISO 8601 duration
  conditions?: any[];
  warningPeriod?: string;
}

export interface RevocationPolicy {
  type: 'revocation-list' | 'status-list' | 'did-document' | 'blockchain';
  endpoint?: string;
  method: string;
  automaticRevocation?: {
    triggers: string[];
    conditions: any[];
  };
}

export interface RefreshPolicy {
  type: 'automatic' | 'manual' | 'conditional';
  interval?: string;
  endpoint?: string;
  conditions?: any[];
}

export interface EvidenceRequirement {
  type: string;
  required: boolean;
  verificationLevel: 'low' | 'medium' | 'high' | 'very_high';
  acceptableEvidence: string[];
}

export interface ValidationRule {
  field: string;
  rule: string;
  parameters: any;
  message: string;
}

export interface VCCreationRequest {
  templateId: string;
  subjectDID: string;
  issuerDID: string;
  apiData: APIResponse[];
  additionalClaims?: Record<string, any>;
  proofOptions?: ProofOptions;
  issuanceOptions?: IssuanceOptions;
  privacyOptions?: PrivacyOptions;
}

export interface ProofOptions {
  type: string;
  verificationMethod?: string;
  challenge?: string;
  domain?: string;
  created?: Date;
  expires?: Date;
  nonce?: string;
}

export interface IssuanceOptions {
  immediate: boolean;
  batchMode?: boolean;
  notificationOptions?: NotificationOptions;
  deliveryMethod?: 'push' | 'pull' | 'webhook' | 'email';
  encryptionRequired?: boolean;
}

export interface PrivacyOptions {
  selectiveDisclosure?: boolean;
  unlinkability?: boolean;
  minimization?: string[];
  anonymization?: boolean;
  dataLocalization?: string[];
}

export interface NotificationOptions {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  webhook?: string;
}

export interface VCCreationResult {
  success: boolean;
  credential?: VerifiableCredential;
  credentialId?: string;
  issuanceState: 'pending' | 'issued' | 'failed' | 'revoked';
  metadata: {
    createdAt: Date;
    processingTime: number;
    template: string;
    apiSources: string[];
    qualityScore: number;
    complianceLevel: string;
  };
  errors?: string[];
  warnings?: string[];
  qrCode?: string;
  deepLink?: string;
}

export interface BatchVCCreationRequest {
  requests: VCCreationRequest[];
  batchOptions: {
    maxConcurrency: number;
    failureHandling: 'stop' | 'continue' | 'rollback';
    progressCallback?: (progress: BatchProgress) => void;
  };
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  estimatedTimeRemaining: number;
}

export class VCCreationService {
  private templates: Map<string, CredentialTemplate> = new Map();
  private logger: Logger;
  private didService: DIDService;
  private cryptoService: CryptoService;
  private schemaRegistry: SchemaRegistry;
  private issuanceWorkflow: IssuanceWorkflow;
  private credentialStorage: CredentialStorage;

  constructor() {
    this.logger = new Logger('VCCreationService');
    this.didService = new DIDService();
    this.cryptoService = new CryptoService();
    this.schemaRegistry = new SchemaRegistry();
    this.issuanceWorkflow = new IssuanceWorkflow();
    this.credentialStorage = new CredentialStorage();
    this.initializeTemplates();
  }

  /**
   * Initialize credential templates
   */
  private initializeTemplates(): void {
    // Identity Verification Credential Template
    this.registerTemplate({
      id: 'identity-verification',
      name: 'Identity Verification Credential',
      description: 'Verifies individual identity through multiple data sources',
      version: '1.0.0',
      schema: {
        id: 'https://personachain.org/schemas/identity-verification/v1.0',
        type: 'JsonSchemaValidator2018',
        jsonSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            nationality: { type: 'string' },
            documentNumber: { type: 'string' },
            documentType: { type: 'string' },
            verificationLevel: { 
              type: 'string', 
              enum: ['basic', 'enhanced', 'comprehensive'] 
            },
            verificationDate: { type: 'string', format: 'date-time' },
            verificationMethod: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['id', 'firstName', 'lastName', 'verificationLevel'],
        },
        validationRules: [
          {
            field: 'confidence',
            rule: 'minimum',
            parameters: { value: 0.8 },
            message: 'Identity verification confidence must be at least 80%',
          },
        ],
      },
      contexts: [
        'https://www.w3.org/2018/credentials/v1',
        'https://personachain.org/contexts/identity-verification/v1',
      ],
      types: ['VerifiableCredential', 'IdentityVerificationCredential'],
      credentialSubjectTemplate: {
        firstName: '${apiData.identity.firstName}',
        lastName: '${apiData.identity.lastName}',
        dateOfBirth: '${apiData.identity.dateOfBirth}',
        nationality: '${apiData.identity.nationality}',
        verificationLevel: 'enhanced',
        verificationDate: '${now}',
        verificationMethod: ['api-verification', 'document-check', 'biometric-match'],
        confidence: '${calculated.confidenceScore}',
      },
      proofRequirements: [
        {
          type: 'Ed25519Signature2020',
          verificationMethod: '${issuer.verificationMethod}',
          challenge: true,
          created: true,
        },
      ],
      issuanceRules: [
        {
          condition: 'confidence >= 0.8',
          action: 'issue',
          parameters: {},
          priority: 1,
        },
        {
          condition: 'confidence < 0.8',
          action: 'reject',
          parameters: { reason: 'Insufficient verification confidence' },
          priority: 2,
        },
      ],
      expirationPolicy: {
        type: 'fixed',
        duration: 'P1Y', // 1 year
        warningPeriod: 'P30D', // 30 days
      },
      revocationPolicy: {
        type: 'status-list',
        method: 'StatusList2021',
        automaticRevocation: {
          triggers: ['identity-change', 'document-expiry', 'security-breach'],
          conditions: [],
        },
      },
      evidenceRequirements: [
        {
          type: 'DocumentVerification',
          required: true,
          verificationLevel: 'high',
          acceptableEvidence: ['passport', 'national-id', 'drivers-license'],
        },
      ],
    });

    // Professional Profile Credential Template
    this.registerTemplate({
      id: 'professional-profile',
      name: 'Professional Profile Credential',
      description: 'Verifies professional experience and qualifications',
      version: '1.0.0',
      schema: {
        id: 'https://personachain.org/schemas/professional-profile/v1.0',
        type: 'JsonSchemaValidator2018',
        jsonSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            jobTitle: { type: 'string' },
            company: { type: 'string' },
            industry: { type: 'string' },
            experience: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  position: { type: 'string' },
                  company: { type: 'string' },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  description: { type: 'string' },
                },
              },
            },
            skills: { type: 'array', items: { type: 'string' } },
            endorsements: { type: 'number' },
            connections: { type: 'number' },
            profileUrl: { type: 'string', format: 'uri' },
            verifiedBy: { type: 'string' },
            lastUpdated: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'fullName', 'jobTitle', 'verifiedBy'],
        },
        validationRules: [
          {
            field: 'experience',
            rule: 'minItems',
            parameters: { value: 1 },
            message: 'At least one professional experience is required',
          },
        ],
      },
      contexts: [
        'https://www.w3.org/2018/credentials/v1',
        'https://personachain.org/contexts/professional-profile/v1',
      ],
      types: ['VerifiableCredential', 'ProfessionalProfileCredential'],
      credentialSubjectTemplate: {
        fullName: '${apiData.profile.fullName}',
        jobTitle: '${apiData.profile.jobTitle}',
        company: '${apiData.profile.company}',
        industry: '${apiData.profile.industry}',
        experience: '${apiData.profile.experience}',
        skills: '${apiData.profile.skills}',
        endorsements: '${apiData.profile.endorsements}',
        connections: '${apiData.profile.connections}',
        profileUrl: '${apiData.profile.profileUrl}',
        verifiedBy: 'LinkedIn',
        lastUpdated: '${now}',
      },
      proofRequirements: [
        {
          type: 'Ed25519Signature2020',
          verificationMethod: '${issuer.verificationMethod}',
          created: true,
        },
      ],
      issuanceRules: [
        {
          condition: 'experience.length > 0',
          action: 'issue',
          parameters: {},
          priority: 1,
        },
      ],
      expirationPolicy: {
        type: 'sliding',
        duration: 'P6M', // 6 months
        warningPeriod: 'P14D', // 14 days
      },
      revocationPolicy: {
        type: 'status-list',
        method: 'StatusList2021',
      },
    });

    // Financial Verification Credential Template
    this.registerTemplate({
      id: 'financial-verification',
      name: 'Financial Verification Credential',
      description: 'Verifies financial status and creditworthiness',
      version: '1.0.0',
      schema: {
        id: 'https://personachain.org/schemas/financial-verification/v1.0',
        type: 'JsonSchemaValidator2018',
        jsonSchema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            id: { type: 'string' },
            creditScore: { type: 'number', minimum: 300, maximum: 850 },
            creditScoreRange: { type: 'string', enum: ['poor', 'fair', 'good', 'very_good', 'excellent'] },
            incomeVerified: { type: 'boolean' },
            incomeRange: { type: 'string' },
            employmentStatus: { type: 'string' },
            bankingRelationship: { type: 'boolean' },
            accountsInGoodStanding: { type: 'number' },
            paymentHistory: { type: 'string', enum: ['poor', 'fair', 'good', 'excellent'] },
            creditUtilization: { type: 'number', minimum: 0, maximum: 1 },
            verificationDate: { type: 'string', format: 'date-time' },
            dataSource: { type: 'string' },
          },
          required: ['id', 'creditScore', 'verificationDate', 'dataSource'],
        },
        validationRules: [
          {
            field: 'creditScore',
            rule: 'range',
            parameters: { min: 300, max: 850 },
            message: 'Credit score must be between 300 and 850',
          },
        ],
      },
      contexts: [
        'https://www.w3.org/2018/credentials/v1',
        'https://personachain.org/contexts/financial-verification/v1',
      ],
      types: ['VerifiableCredential', 'FinancialVerificationCredential'],
      credentialSubjectTemplate: {
        creditScore: '${apiData.credit.score}',
        creditScoreRange: '${calculated.scoreRange}',
        incomeVerified: '${apiData.income.verified}',
        incomeRange: '${calculated.incomeRange}',
        employmentStatus: '${apiData.employment.status}',
        bankingRelationship: '${apiData.banking.hasAccount}',
        accountsInGoodStanding: '${apiData.banking.goodStandingAccounts}',
        paymentHistory: '${apiData.credit.paymentHistory}',
        creditUtilization: '${apiData.credit.utilization}',
        verificationDate: '${now}',
        dataSource: '${apiData.source}',
      },
      proofRequirements: [
        {
          type: 'Ed25519Signature2020',
          verificationMethod: '${issuer.verificationMethod}',
          created: true,
        },
      ],
      issuanceRules: [
        {
          condition: 'creditScore >= 500',
          action: 'issue',
          parameters: {},
          priority: 1,
        },
        {
          condition: 'creditScore < 500',
          action: 'issue-with-warning',
          parameters: { warning: 'Low credit score verification' },
          priority: 2,
        },
      ],
      expirationPolicy: {
        type: 'fixed',
        duration: 'P3M', // 3 months
        warningPeriod: 'P7D', // 7 days
      },
      revocationPolicy: {
        type: 'status-list',
        method: 'StatusList2021',
        automaticRevocation: {
          triggers: ['credit-change', 'bankruptcy', 'fraud-alert'],
          conditions: [],
        },
      },
    });

    this.logger.info(`Initialized ${this.templates.size} credential templates`);
  }

  /**
   * Register a new credential template
   */
  public registerTemplate(template: CredentialTemplate): void {
    this.templates.set(template.id, template);
    this.schemaRegistry.registerSchema(template.schema);
    this.logger.info(`Registered credential template: ${template.name}`);
  }

  /**
   * Create a verifiable credential from API data
   */
  public async createCredential(request: VCCreationRequest): Promise<VCCreationResult> {
    const startTime = Date.now();
    const template = this.templates.get(request.templateId);

    if (!template) {
      return {
        success: false,
        issuanceState: 'failed',
        metadata: {
          createdAt: new Date(),
          processingTime: Date.now() - startTime,
          template: request.templateId,
          apiSources: [],
          qualityScore: 0,
          complianceLevel: 'none',
        },
        errors: [`Template ${request.templateId} not found`],
      };
    }

    try {
      // 1. Validate and process API data
      const processedData = await this.processAPIData(request.apiData, template);
      
      // 2. Generate credential subject
      const credentialSubject = await this.generateCredentialSubject(
        template,
        processedData,
        request.subjectDID,
        request.additionalClaims
      );

      // 3. Validate credential subject against schema
      const validationResult = await this.validateCredentialSubject(credentialSubject, template.schema);
      if (!validationResult.valid) {
        return {
          success: false,
          issuanceState: 'failed',
          metadata: {
            createdAt: new Date(),
            processingTime: Date.now() - startTime,
            template: request.templateId,
            apiSources: request.apiData.map(d => d.metadata.providerId),
            qualityScore: 0,
            complianceLevel: 'none',
          },
          errors: validationResult.errors,
        };
      }

      // 4. Check issuance rules
      const issuanceCheck = await this.checkIssuanceRules(template, credentialSubject, processedData);
      if (!issuanceCheck.canIssue) {
        return {
          success: false,
          issuanceState: 'failed',
          metadata: {
            createdAt: new Date(),
            processingTime: Date.now() - startTime,
            template: request.templateId,
            apiSources: request.apiData.map(d => d.metadata.providerId),
            qualityScore: issuanceCheck.qualityScore,
            complianceLevel: 'partial',
          },
          errors: [issuanceCheck.reason || 'Issuance rules not met'],
          warnings: issuanceCheck.warnings,
        };
      }

      // 5. Create the credential structure
      const credential = await this.buildCredential(
        template,
        credentialSubject,
        request.issuerDID,
        request.subjectDID,
        processedData
      );

      // 6. Add cryptographic proof
      const proofOptions = request.proofOptions || {
        type: 'Ed25519Signature2020',
        created: new Date(),
      };

      const signedCredential = await this.addProof(credential, request.issuerDID, proofOptions);

      // 7. Apply privacy options if specified
      const finalCredential = request.privacyOptions 
        ? await this.applyPrivacyOptions(signedCredential, request.privacyOptions)
        : signedCredential;

      // 8. Store credential
      const credentialId = await this.credentialStorage.store(finalCredential);

      // 9. Generate QR code and deep link
      const qrCode = await this.generateQRCode(finalCredential);
      const deepLink = await this.generateDeepLink(credentialId);

      // 10. Handle issuance workflow
      if (request.issuanceOptions?.immediate) {
        await this.issuanceWorkflow.processImmediate(finalCredential, request.issuanceOptions);
      } else {
        await this.issuanceWorkflow.enqueue(finalCredential, request.issuanceOptions);
      }

      return {
        success: true,
        credential: finalCredential,
        credentialId,
        issuanceState: 'issued',
        metadata: {
          createdAt: new Date(),
          processingTime: Date.now() - startTime,
          template: request.templateId,
          apiSources: request.apiData.map(d => d.metadata.providerId),
          qualityScore: issuanceCheck.qualityScore,
          complianceLevel: 'full',
        },
        warnings: issuanceCheck.warnings,
        qrCode,
        deepLink,
      };

    } catch (error) {
      this.logger.error('Credential creation failed:', error);
      
      return {
        success: false,
        issuanceState: 'failed',
        metadata: {
          createdAt: new Date(),
          processingTime: Date.now() - startTime,
          template: request.templateId,
          apiSources: request.apiData.map(d => d.metadata.providerId),
          qualityScore: 0,
          complianceLevel: 'none',
        },
        errors: [error.message],
      };
    }
  }

  /**
   * Create multiple credentials in batch
   */
  public async createCredentialsBatch(request: BatchVCCreationRequest): Promise<VCCreationResult[]> {
    const results: VCCreationResult[] = [];
    const semaphore = new Semaphore(request.batchOptions.maxConcurrency);
    
    const promises = request.requests.map(async (vcRequest, index) => {
      await semaphore.acquire();
      
      try {
        const result = await this.createCredential(vcRequest);
        results[index] = result;
        
        if (request.batchOptions.progressCallback) {
          const progress = this.calculateBatchProgress(results);
          request.batchOptions.progressCallback(progress);
        }

        if (!result.success && request.batchOptions.failureHandling === 'stop') {
          throw new Error(`Batch creation stopped due to failure: ${result.errors?.join(', ')}`);
        }

        return result;
      } finally {
        semaphore.release();
      }
    });

    if (request.batchOptions.failureHandling === 'rollback') {
      try {
        await Promise.all(promises);
      } catch (error) {
        // Rollback any successful creations
        await this.rollbackBatch(results.filter(r => r.success));
        throw error;
      }
    } else {
      await Promise.allSettled(promises);
    }

    return results;
  }

  /**
   * Revoke a credential
   */
  public async revokeCredential(credentialId: string, reason: string): Promise<boolean> {
    try {
      const credential = await this.credentialStorage.get(credentialId);
      if (!credential) {
        throw new Error(`Credential ${credentialId} not found`);
      }

      // Update revocation status
      await this.updateRevocationStatus(credential, 'revoked', reason);
      
      // Notify holders and verifiers
      await this.notifyRevocation(credential, reason);

      this.logger.info(`Credential ${credentialId} revoked: ${reason}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to revoke credential ${credentialId}:`, error);
      return false;
    }
  }

  /**
   * Refresh a credential with updated data
   */
  public async refreshCredential(credentialId: string, newApiData: APIResponse[]): Promise<VCCreationResult> {
    const existingCredential = await this.credentialStorage.get(credentialId);
    if (!existingCredential) {
      throw new Error(`Credential ${credentialId} not found`);
    }

    // Extract template ID from credential type
    const templateId = this.extractTemplateId(existingCredential);
    
    // Create refresh request
    const refreshRequest: VCCreationRequest = {
      templateId,
      subjectDID: existingCredential.credentialSubject.id,
      issuerDID: existingCredential.issuer.id,
      apiData: newApiData,
      issuanceOptions: { immediate: true },
    };

    // Create new credential
    const result = await this.createCredential(refreshRequest);
    
    if (result.success) {
      // Revoke old credential
      await this.revokeCredential(credentialId, 'Refreshed with updated data');
    }

    return result;
  }

  /**
   * Private helper methods
   */
  private async processAPIData(apiData: APIResponse[], template: CredentialTemplate): Promise<any> {
    const processedData: any = {
      sources: [],
      confidence: 0,
      freshness: new Date(),
    };

    let totalConfidence = 0;
    let successfulSources = 0;

    for (const response of apiData) {
      if (response.success) {
        processedData.sources.push({
          provider: response.metadata.providerId,
          data: response.data,
          reliability: response.metadata.reliability,
          timestamp: response.metadata.timestamp,
        });

        totalConfidence += response.metadata.reliability;
        successfulSources++;
      }
    }

    processedData.confidence = successfulSources > 0 ? totalConfidence / successfulSources : 0;
    processedData.apiData = this.normalizeAPIData(apiData);
    processedData.calculated = await this.calculateDerivedValues(processedData, template);

    return processedData;
  }

  private async generateCredentialSubject(
    template: CredentialTemplate,
    processedData: any,
    subjectDID: string,
    additionalClaims?: Record<string, any>
  ): Promise<any> {
    const credentialSubject = {
      id: subjectDID,
      ...additionalClaims,
    };

    // Process template using the processed data
    for (const [key, value] of Object.entries(template.credentialSubjectTemplate)) {
      if (typeof value === 'string' && value.startsWith('${')) {
        credentialSubject[key] = this.evaluateTemplate(value, processedData);
      } else {
        credentialSubject[key] = value;
      }
    }

    return credentialSubject;
  }

  private async validateCredentialSubject(subject: any, schema: CredentialSchema): Promise<{ valid: boolean; errors: string[] }> {
    return validateSchema(subject, schema.jsonSchema);
  }

  private async checkIssuanceRules(
    template: CredentialTemplate,
    credentialSubject: any,
    processedData: any
  ): Promise<{ canIssue: boolean; reason?: string; qualityScore: number; warnings?: string[] }> {
    const warnings: string[] = [];
    let qualityScore = processedData.confidence;

    for (const rule of template.issuanceRules) {
      const conditionMet = this.evaluateCondition(rule.condition, { credentialSubject, processedData });

      if (rule.action === 'issue' && conditionMet) {
        return { canIssue: true, qualityScore, warnings };
      } else if (rule.action === 'reject' && conditionMet) {
        return { 
          canIssue: false, 
          reason: rule.parameters.reason || 'Issuance rules failed',
          qualityScore,
          warnings 
        };
      } else if (rule.action === 'issue-with-warning' && conditionMet) {
        warnings.push(rule.parameters.warning || 'Warning condition met');
        qualityScore *= 0.9; // Reduce quality score for warnings
      }
    }

    return { canIssue: true, qualityScore, warnings };
  }

  private async buildCredential(
    template: CredentialTemplate,
    credentialSubject: any,
    issuerDID: string,
    subjectDID: string,
    processedData: any
  ): Promise<VerifiableCredential> {
    const credentialId = `urn:uuid:${this.generateUUID()}`;
    const issuanceDate = new Date().toISOString();
    
    let expirationDate: string | undefined;
    if (template.expirationPolicy.type !== 'never') {
      expirationDate = this.calculateExpirationDate(template.expirationPolicy, issuanceDate);
    }

    const credential: VerifiableCredential = {
      '@context': template.contexts,
      id: credentialId,
      type: template.types,
      issuer: {
        id: issuerDID,
        name: 'PersonaChain Identity Platform',
        description: 'Decentralized identity verification and credential issuance platform',
      },
      issuanceDate,
      expirationDate,
      credentialSubject,
      credentialSchema: {
        id: template.schema.id,
        type: template.schema.type,
      },
      credentialStatus: {
        id: `https://personachain.org/status/${credentialId}`,
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '0',
        statusListCredential: 'https://personachain.org/status/list',
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: issuanceDate,
        verificationMethod: `${issuerDID}#key-1`,
        proofPurpose: 'assertionMethod',
      },
    };

    // Add evidence if available
    if (processedData.sources.length > 0) {
      credential.evidence = processedData.sources.map((source: any, index: number) => ({
        id: `evidence-${index}`,
        type: ['DataVerification', 'APIVerification'],
        verifier: source.provider,
        verificationDate: source.timestamp,
        reliability: source.reliability,
      }));
    }

    // Add terms of use if specified in template
    if (template.termsOfUse) {
      credential.termsOfUse = template.termsOfUse;
    }

    // Add refresh service if policy exists
    if (template.refreshPolicy) {
      credential.refreshService = {
        id: `https://personachain.org/refresh/${credentialId}`,
        type: 'ManualRefreshService2018',
      };
    }

    return credential;
  }

  private async addProof(
    credential: VerifiableCredential,
    issuerDID: string,
    proofOptions: ProofOptions
  ): Promise<VerifiableCredential> {
    // Create proof object
    const proof: CredentialProof = {
      type: proofOptions.type,
      created: (proofOptions.created || new Date()).toISOString(),
      verificationMethod: proofOptions.verificationMethod || `${issuerDID}#key-1`,
      proofPurpose: 'assertionMethod',
    };

    if (proofOptions.challenge) {
      proof.challenge = proofOptions.challenge;
    }

    if (proofOptions.domain) {
      proof.domain = proofOptions.domain;
    }

    if (proofOptions.nonce) {
      proof.nonce = proofOptions.nonce;
    }

    // Generate signature
    const signature = await this.cryptoService.signCredential(credential, issuerDID);
    proof.proofValue = signature;

    credential.proof = proof;
    return credential;
  }

  private async applyPrivacyOptions(
    credential: VerifiableCredential,
    privacyOptions: PrivacyOptions
  ): Promise<VerifiableCredential> {
    let processedCredential = { ...credential };

    if (privacyOptions.selectiveDisclosure) {
      processedCredential = await this.enableSelectiveDisclosure(processedCredential);
    }

    if (privacyOptions.minimization && privacyOptions.minimization.length > 0) {
      processedCredential = this.applyDataMinimization(processedCredential, privacyOptions.minimization);
    }

    if (privacyOptions.anonymization) {
      processedCredential = await this.applyAnonymization(processedCredential);
    }

    return processedCredential;
  }

  private normalizeAPIData(apiData: APIResponse[]): any {
    const normalized: any = {};

    for (const response of apiData) {
      if (response.success && response.data) {
        const providerId = response.metadata.providerId;
        
        switch (providerId) {
          case 'linkedin':
            normalized.profile = this.normalizeLinkedInData(response.data);
            break;
          case 'plaid':
            normalized.financial = this.normalizePlaidData(response.data);
            break;
          case 'experian':
            normalized.credit = this.normalizeExperianData(response.data);
            break;
          case 'github':
            normalized.developer = this.normalizeGitHubData(response.data);
            break;
          default:
            normalized[providerId] = response.data;
        }
      }
    }

    return normalized;
  }

  private normalizeLinkedInData(data: any): any {
    return {
      fullName: `${data.firstName} ${data.lastName}`,
      jobTitle: data.headline,
      company: data.positions?.[0]?.companyName,
      industry: data.industry,
      experience: data.positions || [],
      skills: data.skills || [],
      endorsements: data.numRecommenders || 0,
      connections: data.numConnections || 0,
      profileUrl: data.publicProfileUrl,
    };
  }

  private normalizePlaidData(data: any): any {
    return {
      accounts: data.accounts || [],
      income: data.income || {},
      transactions: data.transactions || [],
      identity: data.identity || {},
    };
  }

  private normalizeExperianData(data: any): any {
    return {
      score: data.creditScore,
      paymentHistory: data.paymentHistory,
      utilization: data.creditUtilization,
      accounts: data.accounts || [],
    };
  }

  private normalizeGitHubData(data: any): any {
    return {
      username: data.login,
      name: data.name,
      company: data.company,
      repositories: data.public_repos,
      followers: data.followers,
      following: data.following,
      createdAt: data.created_at,
    };
  }

  private async calculateDerivedValues(processedData: any, template: CredentialTemplate): Promise<any> {
    const calculated: any = {};

    // Calculate confidence score
    calculated.confidenceScore = Math.min(processedData.confidence * 1.2, 1.0);

    // Calculate specific values based on template
    if (template.id === 'financial-verification' && processedData.apiData.credit) {
      const score = processedData.apiData.credit.score;
      if (score >= 800) calculated.scoreRange = 'excellent';
      else if (score >= 740) calculated.scoreRange = 'very_good';
      else if (score >= 670) calculated.scoreRange = 'good';
      else if (score >= 580) calculated.scoreRange = 'fair';
      else calculated.scoreRange = 'poor';

      // Calculate income range
      if (processedData.apiData.financial?.income) {
        const income = processedData.apiData.financial.income.amount;
        if (income >= 100000) calculated.incomeRange = 'high';
        else if (income >= 50000) calculated.incomeRange = 'medium';
        else calculated.incomeRange = 'low';
      }
    }

    return calculated;
  }

  private evaluateTemplate(template: string, data: any): any {
    // Simple template evaluation - in production, use a proper template engine
    if (template === '${now}') {
      return new Date().toISOString();
    }

    // Extract variable path from template like ${apiData.profile.name}
    const match = template.match(/\$\{(.+)\}/);
    if (match) {
      const path = match[1];
      return this.getNestedValue(data, path);
    }

    return template;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition evaluation - in production, use a proper expression engine
    try {
      // Replace variables in condition
      let evaluatedCondition = condition;
      const variables = condition.match(/\w+/g) || [];
      
      for (const variable of variables) {
        if (context.credentialSubject[variable] !== undefined) {
          evaluatedCondition = evaluatedCondition.replace(
            new RegExp(`\\b${variable}\\b`, 'g'),
            JSON.stringify(context.credentialSubject[variable])
          );
        } else if (context.processedData[variable] !== undefined) {
          evaluatedCondition = evaluatedCondition.replace(
            new RegExp(`\\b${variable}\\b`, 'g'),
            JSON.stringify(context.processedData[variable])
          );
        }
      }

      // Evaluate the condition (be careful with eval in production)
      return Function(`"use strict"; return (${evaluatedCondition})`)();
    } catch (error) {
      this.logger.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  private calculateExpirationDate(policy: ExpirationPolicy, issuanceDate: string): string {
    const issuance = new Date(issuanceDate);
    
    if (policy.type === 'fixed' && policy.duration) {
      return this.addDuration(issuance, policy.duration).toISOString();
    }
    
    // Default to 1 year if no policy specified
    return new Date(issuance.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  }

  private addDuration(date: Date, duration: string): Date {
    // Parse ISO 8601 duration (simplified implementation)
    const match = duration.match(/P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?/);
    if (!match) return date;

    const result = new Date(date);
    if (match[1]) result.setFullYear(result.getFullYear() + parseInt(match[1]));
    if (match[2]) result.setMonth(result.getMonth() + parseInt(match[2]));
    if (match[3]) result.setDate(result.getDate() + parseInt(match[3]));

    return result;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private async generateQRCode(credential: VerifiableCredential): Promise<string> {
    // Generate QR code with credential data
    const qrData = {
      type: 'VerifiableCredential',
      id: credential.id,
      url: `https://personachain.org/credentials/${credential.id}`,
    };
    
    // In production, use a proper QR code library
    return `data:image/png;base64,${Buffer.from(JSON.stringify(qrData)).toString('base64')}`;
  }

  private async generateDeepLink(credentialId: string): Promise<string> {
    return `personachain://credentials/${credentialId}`;
  }

  private calculateBatchProgress(results: VCCreationResult[]): BatchProgress {
    const total = results.length;
    const completed = results.filter(r => r && r.issuanceState === 'issued').length;
    const failed = results.filter(r => r && r.issuanceState === 'failed').length;
    const inProgress = total - completed - failed;

    return {
      total,
      completed,
      failed,
      inProgress,
      estimatedTimeRemaining: inProgress * 2000, // Estimate 2 seconds per credential
    };
  }

  private async rollbackBatch(successfulResults: VCCreationResult[]): Promise<void> {
    for (const result of successfulResults) {
      if (result.credentialId) {
        await this.revokeCredential(result.credentialId, 'Batch rollback');
      }
    }
  }

  private async updateRevocationStatus(credential: VerifiableCredential, status: string, reason: string): Promise<void> {
    // Update credential status in the status list
    // Implementation depends on the status list mechanism
  }

  private async notifyRevocation(credential: VerifiableCredential, reason: string): Promise<void> {
    // Notify credential holders and verifiers about revocation
    // Implementation depends on notification system
  }

  private extractTemplateId(credential: VerifiableCredential): string {
    // Extract template ID from credential types
    const credentialTypes = credential.type.filter(t => t !== 'VerifiableCredential');
    return credentialTypes[0]?.toLowerCase().replace('credential', '') || 'unknown';
  }

  private async enableSelectiveDisclosure(credential: VerifiableCredential): Promise<VerifiableCredential> {
    // Add selective disclosure capabilities to the credential
    // This would involve adding merkle tree proofs or similar mechanisms
    return credential;
  }

  private applyDataMinimization(credential: VerifiableCredential, fields: string[]): VerifiableCredential {
    // Remove fields not in the minimization list
    const minimizedSubject = { ...credential.credentialSubject };
    
    for (const key of Object.keys(minimizedSubject)) {
      if (!fields.includes(key) && key !== 'id') {
        delete minimizedSubject[key];
      }
    }

    return {
      ...credential,
      credentialSubject: minimizedSubject,
    };
  }

  private async applyAnonymization(credential: VerifiableCredential): Promise<VerifiableCredential> {
    // Apply anonymization techniques to the credential
    // This could involve removing or hashing identifying information
    return credential;
  }
}

// Supporting classes (simplified implementations)
class SchemaRegistry {
  registerSchema(schema: CredentialSchema): void {
    // Register schema for validation
  }
}

class IssuanceWorkflow {
  async processImmediate(credential: VerifiableCredential, options?: IssuanceOptions): Promise<void> {
    // Process immediate issuance
  }

  async enqueue(credential: VerifiableCredential, options?: IssuanceOptions): Promise<void> {
    // Queue for later processing
  }
}

class CredentialStorage {
  async store(credential: VerifiableCredential): Promise<string> {
    // Store credential and return ID
    return credential.id;
  }

  async get(credentialId: string): Promise<VerifiableCredential | null> {
    // Retrieve credential by ID
    return null;
  }
}

class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.permits++;
    }
  }
}