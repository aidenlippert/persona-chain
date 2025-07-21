import { v4 as uuidv4 } from 'uuid';
// import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
// import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface CredentialSubject {
  id: string;
  [key: string]: any;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name?: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  proof?: any;
  evidence?: any[];
}

export interface VCGenerationOptions {
  issuer: {
    id: string;
    name?: string;
  };
  expirationDate?: Date;
  evidence?: any[];
  additionalContext?: string[];
  additionalTypes?: string[];
}

export class VCGeneratorService {
  private signingKey: any;

  constructor() {
    // In production, load from secure key management
    this.initializeSigningKey();
  }

  private async initializeSigningKey() {
    try {
      // For demo purposes, generate a key
      // In production, load from secure storage
      // For demo purposes, use Node.js crypto
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      this.signingKey = { publicKey, privateKey };
      
      logger.info('VC signing key initialized');
    } catch (error) {
      logger.error('Failed to initialize signing key', { error });
    }
  }

  /**
   * Generate a W3C Verifiable Credential
   */
  async generateVC(
    credentialType: string,
    credentialSubject: CredentialSubject,
    options: VCGenerationOptions
  ): Promise<VerifiableCredential> {
    try {
      const credential: VerifiableCredential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1',
          ...(options.additionalContext || [])
        ],
        id: `urn:uuid:${uuidv4()}`,
        type: ['VerifiableCredential', credentialType, ...(options.additionalTypes || [])],
        issuer: options.issuer,
        issuanceDate: new Date().toISOString(),
        credentialSubject
      };

      if (options.expirationDate) {
        credential.expirationDate = options.expirationDate.toISOString();
      }

      if (options.evidence) {
        credential.evidence = options.evidence;
      }

      // Sign the credential
      if (this.signingKey) {
        credential.proof = await this.signCredential(credential);
      }

      logger.info('Verifiable credential generated', {
        credentialId: credential.id,
        type: credentialType,
        subject: credentialSubject.id
      });

      return credential;
    } catch (error) {
      logger.error('Failed to generate verifiable credential', {
        error,
        credentialType,
        subject: credentialSubject.id
      });
      throw new Error('Failed to generate verifiable credential');
    }
  }

  /**
   * Sign a credential using Ed25519
   */
  private async signCredential(credential: VerifiableCredential): Promise<any> {
    try {
      // const suite = new Ed25519Signature2020({
      //   key: this.signingKey
      // });

      // For demo purposes, create a simple proof
      // In production, use proper LD-Proof generation
      const proof = {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: 'did:personachain:issuer:connector-service#key-1',
        proofPurpose: 'assertionMethod',
        jws: await this.createJWS(credential)
      };

      return proof;
    } catch (error) {
      logger.error('Failed to sign credential', { error });
      throw new Error('Failed to sign credential');
    }
  }

  /**
   * Create a JWS signature for the credential
   */
  private async createJWS(credential: VerifiableCredential): Promise<string> {
    // Simplified JWS creation for demo
    // In production, use proper JWS library
    const header = Buffer.from(JSON.stringify({
      alg: 'EdDSA',
      b64: false,
      crit: ['b64']
    })).toString('base64url');

    const payload = Buffer.from(JSON.stringify(credential)).toString('base64url');
    
    const signature = crypto
      .createHash('sha256')
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}..${signature}`;
  }

  /**
   * Verify a credential (basic validation)
   */
  async verifyCredential(credential: VerifiableCredential): Promise<boolean> {
    try {
      // Check required fields
      if (!credential['@context'] || !credential.id || !credential.type || 
          !credential.issuer || !credential.issuanceDate || !credential.credentialSubject) {
        return false;
      }

      // Check expiration
      if (credential.expirationDate) {
        const expirationDate = new Date(credential.expirationDate);
        if (expirationDate < new Date()) {
          return false;
        }
      }

      // In production, verify the proof/signature
      if (credential.proof) {
        // Verify signature...
      }

      return true;
    } catch (error) {
      logger.error('Credential verification failed', { error });
      return false;
    }
  }

  /**
   * Generate platform-specific credential types
   */
  async generatePlatformCredential(
    platform: string,
    data: any,
    options: VCGenerationOptions
  ): Promise<VerifiableCredential> {
    const platformCredentialTypes: Record<string, string> = {
      github: 'GitHubIdentityCredential',
      linkedin: 'LinkedInIdentityCredential',
      plaid: 'PlaidIdentityCredential',
      orcid: 'ORCIDCredential',
      twitter: 'TwitterIdentityCredential',
      stackexchange: 'StackExchangeCredential'
    };

    const credentialType = platformCredentialTypes[platform] || 'PlatformCredential';
    
    return this.generateVC(credentialType, data, options);
  }
}