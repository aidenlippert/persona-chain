/**
 * PersonaPass SDK Client
 * Main client for creating proof requests and validating responses
 */

// import { v4 as uuid } from 'uuid';
import { ProofRequestService } from './services/proofRequest';
import { ValidationService } from './services/validation';
import { ZKProofService } from './services/zkProof';
import { CryptoService } from './services/crypto';
import { EventEmitter } from './utils/eventEmitter';
import type {
  SDKConfig,
  ProofRequest,
  ProofResponse,
  VerifiablePresentation,
  ValidationResult,
  PresentationDefinition,
  OpenID4VPRequest,
  ZKCredential,
  ProofRequestEvent,
  ProofResponseEvent,
  ValidationEvent
} from './types';

export class PersonaPassSDK extends EventEmitter {
  private config: SDKConfig;
  private proofRequestService: ProofRequestService;
  private validationService: ValidationService;
  private zkProofService: ZKProofService;
  private cryptoService: CryptoService;

  constructor(config: SDKConfig) {
    super();
    this.config = config;
    
    // Initialize services
    this.cryptoService = new CryptoService();
    this.proofRequestService = new ProofRequestService(config, this.cryptoService);
    this.validationService = new ValidationService(config, this.cryptoService);
    this.zkProofService = new ZKProofService(config, this.cryptoService);

    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Create a proof request for verifiable credentials
   */
  async createProofRequest(
    presentationDefinition: PresentationDefinition,
    options?: {
      holder?: string;
      challenge?: string;
      domain?: string;
      expires_in?: number;
      callback_url?: string;
      purpose?: string;
    }
  ): Promise<ProofRequest> {
    try {
      const request = await this.proofRequestService.createRequest(
        presentationDefinition,
        options
      );

      // Emit event
      const event: ProofRequestEvent = {
        type: 'proof_request_sent',
        request_id: request.id,
        verifier: this.config.verifier.id,
        holder: options?.holder || '',
        timestamp: new Date().toISOString(),
        metadata: {
          presentation_definition: presentationDefinition,
          purpose: options?.purpose || request.metadata.purpose
        }
      };
      
      this.emit('proof_request_sent', event);

      return request;
    } catch (error) {
      console.error('Error creating proof request:', error);
      throw error;
    }
  }

  /**
   * Create an OpenID4VP request
   */
  async createOpenID4VPRequest(
    presentationDefinition: PresentationDefinition,
    options?: {
      response_uri?: string;
      response_mode?: 'direct_post' | 'direct_post.jwt';
      state?: string;
      scope?: string;
      client_metadata?: {
        client_name?: string;
        logo_uri?: string;
        policy_uri?: string;
        tos_uri?: string;
      };
    }
  ): Promise<OpenID4VPRequest> {
    try {
      return await this.proofRequestService.createOpenID4VPRequest(
        presentationDefinition,
        options
      );
    } catch (error) {
      console.error('Error creating OpenID4VP request:', error);
      throw error;
    }
  }

  /**
   * Validate a verifiable presentation
   */
  async validatePresentation(
    presentation: VerifiablePresentation,
    challenge?: string,
    domain?: string
  ): Promise<ValidationResult> {
    try {
      const result = await this.validationService.validatePresentation(
        presentation,
        challenge,
        domain
      );

      // Emit validation event
      const event: ValidationEvent = {
        type: 'validation_completed',
        request_id: '', // Would be passed from context
        presentation_id: presentation.id,
        result,
        timestamp: new Date().toISOString()
      };
      
      this.emit('validation_completed', event);

      return result;
    } catch (error) {
      console.error('Error validating presentation:', error);
      throw error;
    }
  }

  /**
   * Process a proof response
   */
  async processProofResponse(
    response: ProofResponse,
    originalRequest: ProofRequest
  ): Promise<ValidationResult> {
    try {
      // Validate the presentation in the response
      const validationResult = await this.validatePresentation(
        response.presentation,
        originalRequest.challenge,
        originalRequest.domain
      );

      // Emit response event
      const event: ProofResponseEvent = {
        type: 'proof_response_received',
        request_id: originalRequest.id,
        response_id: response.id,
        verifier: this.config.verifier.id,
        holder: response.from,
        timestamp: new Date().toISOString(),
        status: response.status,
        validation_result: validationResult
      };
      
      this.emit('proof_response_received', event);

      return validationResult;
    } catch (error) {
      console.error('Error processing proof response:', error);
      throw error;
    }
  }

  /**
   * Validate a zero-knowledge credential
   */
  async validateZKCredential(
    zkCredential: ZKCredential,
    verificationKey?: string
  ): Promise<ValidationResult> {
    try {
      return await this.zkProofService.validateZKProof(
        zkCredential.proof,
        verificationKey
      );
    } catch (error) {
      console.error('Error validating ZK credential:', error);
      throw error;
    }
  }

  /**
   * Generate a QR code for a proof request
   */
  async generateQRCode(
    request: ProofRequest | OpenID4VPRequest,
    options?: {
      size?: number;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
  ): Promise<string> {
    try {
      return await this.proofRequestService.generateQRCode(request, options);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Create a presentation definition
   */
  createPresentationDefinition(
    requirements: {
      id: string;
      name?: string;
      purpose?: string;
      fields: Array<{
        path: string[];
        filter?: {
          type?: string;
          pattern?: string;
          const?: unknown;
          enum?: unknown[];
        };
        required?: boolean;
      }>;
    }[]
  ): PresentationDefinition {
    return this.proofRequestService.createPresentationDefinition(requirements);
  }

  /**
   * Check credential status (revocation, etc.)
   */
  async checkCredentialStatus(credentialId: string): Promise<{
    active: boolean;
    revoked: boolean;
    suspended: boolean;
    reason?: string;
  }> {
    try {
      return await this.validationService.checkCredentialStatus(credentialId);
    } catch (error) {
      console.error('Error checking credential status:', error);
      throw error;
    }
  }

  /**
   * Verify issuer trust
   */
  async verifyIssuerTrust(issuerDid: string): Promise<{
    trusted: boolean;
    level: 'high' | 'medium' | 'low' | 'untrusted';
    reason?: string;
  }> {
    try {
      return await this.validationService.verifyIssuerTrust(issuerDid);
    } catch (error) {
      console.error('Error verifying issuer trust:', error);
      throw error;
    }
  }

  /**
   * Get SDK configuration
   */
  getConfig(): SDKConfig {
    return { ...this.config };
  }

  /**
   * Update SDK configuration
   */
  updateConfig(updates: Partial<SDKConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Update services with new config
    this.proofRequestService.updateConfig(this.config);
    this.validationService.updateConfig(this.config);
    this.zkProofService.updateConfig(this.config);
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    total_validations: number;
    successful_validations: number;
    failed_validations: number;
    average_validation_time_ms: number;
  } {
    return this.validationService.getStats();
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.validationService.clearCache();
  }

  /**
   * Set up event forwarding from services
   */
  private setupEventForwarding(): void {
    // Forward events from services to main SDK
    this.proofRequestService.on('*', (event, data) => {
      this.emit(event, data);
    });

    this.validationService.on('*', (event, data) => {
      this.emit(event, data);
    });

    this.zkProofService.on('*', (event, data) => {
      this.emit(event, data);
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.proofRequestService.destroy();
    this.validationService.destroy();
    this.zkProofService.destroy();
  }
}

// Factory function for easier SDK initialization
export function createPersonaPassSDK(config: SDKConfig): PersonaPassSDK {
  return new PersonaPassSDK(config);
}

// Default configuration helper
export function createDefaultConfig(verifierId: string, verifierName: string): SDKConfig {
  return {
    verifier: {
      id: verifierId,
      name: verifierName,
      domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    },
    endpoints: {},
    validation: {
      check_revocation: true,
      check_expiration: true,
      check_issuer_trust: true,
      max_age_seconds: 86400 // 24 hours
    },
    zk: {
      enabled: true,
      supported_protocols: ['groth16', 'plonk'],
      verification_keys: {}
    },
    security: {
      require_https: true,
      signature_validation: true
    }
  };
}