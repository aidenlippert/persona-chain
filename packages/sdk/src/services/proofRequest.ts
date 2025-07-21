/**
 * Proof Request Service
 * Handles creation of proof requests and OpenID4VP requests
 */

import { v4 as uuid } from 'uuid';
import { EventEmitter } from '../utils/eventEmitter';
import { CryptoService } from './crypto';
import { ProofRequestError } from '../types';
import type {
  SDKConfig,
  ProofRequest,
  OpenID4VPRequest,
  PresentationDefinition,
  InputDescriptor,
  FieldConstraint
} from '../types';

export class ProofRequestService extends EventEmitter {
  private config: SDKConfig;
  private cryptoService: CryptoService;

  constructor(config: SDKConfig, cryptoService: CryptoService) {
    super();
    this.config = config;
    this.cryptoService = cryptoService;
  }

  /**
   * Create a proof request
   */
  async createRequest(
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
      // Validate presentation definition
      this.validatePresentationDefinition(presentationDefinition);

      // Generate challenge if not provided
      const challenge = options?.challenge || await this.generateChallenge();

      // Calculate expiration
      const expiresIn = options?.expires_in || 3600; // 1 hour default
      const expires = new Date(Date.now() + expiresIn * 1000).toISOString();

      const request: ProofRequest = {
        id: `proof-req-${uuid()}`,
        type: 'ProofRequest',
        from: this.config.verifier.id,
        to: options?.holder || '',
        created: new Date().toISOString(),
        expires,
        presentation_definition: presentationDefinition,
        challenge,
        domain: options?.domain || this.config.verifier.domain,
        callback_url: options?.callback_url || this.config.endpoints.callback,
        metadata: {
          purpose: options?.purpose || presentationDefinition.purpose || 'Credential verification',
          verifier_name: this.config.verifier.name,
          verifier_logo: this.config.verifier.logo,
          requirements: this.extractRequirements(presentationDefinition)
        }
      };

      this.emit('proof_request_created', { request });
      return request;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ProofRequestError(`Failed to create proof request: ${message}`, {
        presentationDefinition,
        options
      });
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
      // Validate presentation definition
      this.validatePresentationDefinition(presentationDefinition);

      // Generate nonce
      const nonce = await this.generateChallenge();

      const request: OpenID4VPRequest = {
        client_id: this.config.verifier.id,
        client_id_scheme: this.config.verifier.did ? 'did' : 'redirect_uri',
        response_type: 'vp_token',
        nonce,
        presentation_definition: presentationDefinition,
        response_uri: options?.response_uri || this.config.endpoints.callback,
        response_mode: options?.response_mode || 'direct_post',
        state: options?.state || uuid(),
        scope: options?.scope,
        client_metadata: {
          client_name: options?.client_metadata?.client_name || this.config.verifier.name,
          logo_uri: options?.client_metadata?.logo_uri || this.config.verifier.logo,
          policy_uri: options?.client_metadata?.policy_uri,
          tos_uri: options?.client_metadata?.tos_uri
        }
      };

      this.emit('openid4vp_request_created', { request });
      return request;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ProofRequestError(`Failed to create OpenID4VP request: ${message}`, {
        presentationDefinition,
        options
      });
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
    const inputDescriptors: InputDescriptor[] = requirements.map(req => {
      const fields: FieldConstraint[] = req.fields.map(field => ({
        path: field.path,
        filter: field.filter,
        predicate: field.required ? 'required' : 'preferred'
      }));

      return {
        id: req.id,
        name: req.name,
        purpose: req.purpose,
        constraints: {
          limit_disclosure: 'preferred',
          fields
        }
      };
    });

    return {
      id: `pd-${uuid()}`,
      name: 'Credential Verification Request',
      purpose: 'Verify identity credentials',
      input_descriptors: inputDescriptors,
      format: {
        jwt_vc_json: {
          alg: ['EdDSA', 'ES256K']
        },
        ldp_vc: {
          proof_type: ['Ed25519Signature2020', 'EcdsaSecp256k1Signature2019']
        }
      }
    };
  }

  /**
   * Generate QR code for a request
   */
  async generateQRCode(
    request: ProofRequest | OpenID4VPRequest,
    options?: {
      size?: number;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
  ): Promise<string> {
    try {
      // Import QRCode dynamically to avoid bundling issues
      const QRCode = await import('qrcode');
      
      let qrData: string;
      
      if ('client_id' in request) {
        // OpenID4VP request - create URL format
        const params = new URLSearchParams();
        params.append('client_id', request.client_id);
        params.append('response_type', request.response_type);
        params.append('nonce', request.nonce);
        
        if (request.response_uri) {
          params.append('response_uri', request.response_uri);
        }
        
        if (request.response_mode) {
          params.append('response_mode', request.response_mode);
        }
        
        if (request.presentation_definition) {
          params.append('presentation_definition', JSON.stringify(request.presentation_definition));
        }
        
        if (request.state) {
          params.append('state', request.state);
        }

        qrData = `openid4vp://?${params.toString()}`;
      } else {
        // Standard proof request - JSON format
        qrData = JSON.stringify({
          type: 'proof_request',
          version: '1.0',
          request
        });
      }

      return await QRCode.toDataURL(qrData, {
        width: options?.size || 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: options?.errorCorrectionLevel || 'M'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ProofRequestError(`Failed to generate QR code: ${message}`, {
        request,
        options
      });
    }
  }

  /**
   * Generate a cryptographic challenge
   */
  private async generateChallenge(): Promise<string> {
    return await this.cryptoService.generateChallenge();
  }

  /**
   * Validate presentation definition
   */
  private validatePresentationDefinition(definition: PresentationDefinition): void {
    if (!definition.id) {
      throw new Error('Presentation definition must have an id');
    }

    if (!definition.input_descriptors || definition.input_descriptors.length === 0) {
      throw new Error('Presentation definition must have at least one input descriptor');
    }

    for (const descriptor of definition.input_descriptors) {
      if (!descriptor.id) {
        throw new Error('Input descriptor must have an id');
      }

      if (!descriptor.constraints || !descriptor.constraints.fields || descriptor.constraints.fields.length === 0) {
        throw new Error('Input descriptor must have field constraints');
      }

      for (const field of descriptor.constraints.fields) {
        if (!field.path || field.path.length === 0) {
          throw new Error('Field constraint must have a path');
        }
      }
    }
  }

  /**
   * Extract human-readable requirements from presentation definition
   */
  private extractRequirements(definition: PresentationDefinition): string[] {
    const requirements: string[] = [];

    for (const descriptor of definition.input_descriptors) {
      if (descriptor.name) {
        requirements.push(descriptor.name);
      } else {
        // Generate requirement from fields
        const fieldNames = descriptor.constraints.fields
          .map(field => field.path.join('.'))
          .join(', ');
        requirements.push(`Fields: ${fieldNames}`);
      }
    }

    return requirements;
  }

  /**
   * Update configuration
   */
  updateConfig(config: SDKConfig): void {
    this.config = config;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
  }
}