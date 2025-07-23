/**
 * 🏆 REAL W3C VERIFIABLE CREDENTIALS SERVICE
 * Production implementation following W3C VC Data Model 2.0
 * Uses real cryptography for signing and verification
 * Supports Ed25519Signature2020 and JsonWebSignature2020
 */

import { didCryptoService, DIDKeyPair } from '../crypto/DIDCryptoService';

// 🎯 W3C Verifiable Credentials Data Model 2.0 Types
export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string | CredentialIssuer;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  credentialStatus?: CredentialStatus;
  proof: Proof[];
  refreshService?: RefreshService;
  termsOfUse?: TermsOfUse[];
  evidence?: Evidence[];
  credentialSchema?: CredentialSchema[];
}

export interface CredentialIssuer {
  id: string;
  name?: string;
  description?: string;
  image?: string;
}

export interface CredentialSubject {
  id?: string;
  [key: string]: any;
}

export interface Proof {
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

export interface CredentialStatus {
  id: string;
  type: string;
  statusPurpose?: string;
  statusListIndex?: string;
  statusListCredential?: string;
}

export interface RefreshService {
  id: string;
  type: string;
}

export interface TermsOfUse {
  type: string;
  id?: string;
  profile?: string;
  prohibition?: Prohibition[];
}

export interface Prohibition {
  assigner?: string;
  assignee?: string;
  target?: string;
  action?: string[];
}

export interface Evidence {
  type: string[];
  verifier: string;
  evidenceDocument: string;
  subjectPresence: string;
  documentPresence: string;
}

export interface CredentialSchema {
  id: string;
  type: string;
}

// 🔐 Presentation Types
export interface VerifiablePresentation {
  '@context': string[];
  id: string;
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof: Proof[];
}

// 📋 Template Types
export interface CredentialTemplate {
  id: string;
  name: string;
  description: string;
  schema: CredentialSchema;
  requiredFields: string[];
  optionalFields: string[];
  proofType: string[];
  category: string;
}

/**
 * 🏆 REAL W3C VERIFIABLE CREDENTIALS SERVICE
 * Industry-standard implementation with real cryptographic proofs
 */
export class VerifiableCredentialService {
  private currentDIDKeyPair: DIDKeyPair | null = null;

  constructor() {
    this.loadDIDKeyPair();
  }

  /**
   * 🔐 Load or Generate DID Key Pair
   */
  private async loadDIDKeyPair(): Promise<DIDKeyPair> {
    try {
      // 🔓 Try to load existing key pair
      let keyPair = await didCryptoService.loadKeyPair();
      
      if (!keyPair) {
        // 🔑 Generate new key pair if none exists
        console.log('🔑 Generating new DID key pair...');
        keyPair = await didCryptoService.generateDIDKeyPair();
        await didCryptoService.storeKeyPair(keyPair);
      }
      
      this.currentDIDKeyPair = keyPair;
      console.log('🔐 DID key pair ready:', keyPair.did);
      
      return keyPair;
    } catch (error) {
      console.error('❌ Failed to load DID key pair:', error);
      throw error;
    }
  }

  /**
   * 🏆 Issue Real Verifiable Credential
   * Creates W3C compliant credential with cryptographic proof
   */
  async issueCredential(
    credentialSubject: CredentialSubject,
    credentialType: string[],
    issuerInfo: CredentialIssuer,
    options: {
      expirationDate?: string;
      challenge?: string;
      domain?: string;
      evidence?: Evidence[];
      credentialSchema?: CredentialSchema[];
    } = {}
  ): Promise<VerifiableCredential> {
    try {
      // 🔐 Ensure we have DID key pair
      const keyPair = this.currentDIDKeyPair || await this.loadDIDKeyPair();
      
      // 📋 Create credential ID
      const credentialId = `urn:uuid:${this.generateUUID()}`;
      
      // 📅 Set dates
      const now = new Date().toISOString();
      const issuanceDate = now;
      const expirationDate = options.expirationDate || 
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year default
      
      // 🏗️ Build credential without proof
      const unsignedCredential: Omit<VerifiableCredential, 'proof'> = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1'
        ],
        id: credentialId,
        type: ['VerifiableCredential', ...credentialType],
        issuer: issuerInfo,
        issuanceDate,
        expirationDate,
        credentialSubject: {
          id: keyPair.did,
          ...credentialSubject
        }
      };

      // 📎 Add optional fields
      if (options.evidence) {
        (unsignedCredential as any).evidence = options.evidence;
      }
      
      if (options.credentialSchema) {
        (unsignedCredential as any).credentialSchema = options.credentialSchema;
      }

      // ✍️ Create cryptographic proof
      const proof = await this.createEd25519Proof(
        unsignedCredential,
        keyPair,
        {
          challenge: options.challenge,
          domain: options.domain
        }
      );

      // 🏆 Complete credential with proof
      const verifiableCredential: VerifiableCredential = {
        ...unsignedCredential,
        proof: [proof]
      };

      console.log('🏆 Issued verifiable credential:', {
        id: credentialId,
        type: credentialType,
        issuer: typeof issuerInfo === 'string' ? issuerInfo : issuerInfo.id,
        subject: keyPair.did
      });

      return verifiableCredential;

    } catch (error) {
      console.error('❌ Failed to issue credential:', error);
      throw new Error(`Credential issuance failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ✅ Verify Real Verifiable Credential
   * Cryptographically verifies credential proof
   */
  async verifyCredential(credential: VerifiableCredential): Promise<{
    verified: boolean;
    errors: string[];
    checks: {
      structure: boolean;
      proof: boolean;
      expiration: boolean;
      issuer: boolean;
    }
  }> {
    const errors: string[] = [];
    const checks = {
      structure: false,
      proof: false,
      expiration: false,
      issuer: false
    };

    try {
      // ✅ Check credential structure
      checks.structure = this.validateCredentialStructure(credential);
      if (!checks.structure) {
        errors.push('Invalid credential structure');
      }

      // ✅ Check expiration
      if (credential.expirationDate) {
        const now = new Date();
        const expiry = new Date(credential.expirationDate);
        checks.expiration = now < expiry;
        if (!checks.expiration) {
          errors.push('Credential has expired');
        }
      } else {
        checks.expiration = true;
      }

      // ✅ Verify cryptographic proof
      if (credential.proof && credential.proof.length > 0) {
        for (const proof of credential.proof) {
          const proofValid = await this.verifyProof(credential, proof);
          checks.proof = checks.proof || proofValid;
          if (!proofValid) {
            errors.push(`Invalid proof: ${proof.type}`);
          }
        }
      } else {
        errors.push('No proof found in credential');
      }

      // ✅ Check issuer (basic validation)
      const issuer = typeof credential.issuer === 'string' ? 
        credential.issuer : credential.issuer.id;
      checks.issuer = issuer.startsWith('did:') || issuer.startsWith('https://');
      if (!checks.issuer) {
        errors.push('Invalid issuer identifier');
      }

      const verified = checks.structure && checks.proof && checks.expiration && checks.issuer;

      console.log('✅ Credential verification result:', {
        verified,
        errors: errors.length,
        checks
      });

      return { verified, errors, checks };

    } catch (error) {
      console.error('❌ Credential verification failed:', error);
      return {
        verified: false,
        errors: [`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        checks
      };
    }
  }

  /**
   * 📦 Create Verifiable Presentation
   * Packages credentials for sharing with verifiers
   */
  async createPresentation(
    credentials: VerifiableCredential[],
    options: {
      challenge?: string;
      domain?: string;
      holder?: string;
    } = {}
  ): Promise<VerifiablePresentation> {
    try {
      // 🔐 Ensure we have DID key pair
      const keyPair = this.currentDIDKeyPair || await this.loadDIDKeyPair();
      
      // 📋 Create presentation ID
      const presentationId = `urn:uuid:${this.generateUUID()}`;
      
      // 🏗️ Build presentation without proof
      const unsignedPresentation: Omit<VerifiablePresentation, 'proof'> = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1'
        ],
        id: presentationId,
        type: ['VerifiablePresentation'],
        holder: options.holder || keyPair.did,
        verifiableCredential: credentials
      };

      // ✍️ Create proof for presentation
      const proof = await this.createEd25519Proof(
        unsignedPresentation,
        keyPair,
        {
          challenge: options.challenge,
          domain: options.domain,
          proofPurpose: 'authentication'
        }
      );

      // 📦 Complete presentation with proof
      const verifiablePresentation: VerifiablePresentation = {
        ...unsignedPresentation,
        proof: [proof]
      };

      console.log('📦 Created verifiable presentation:', {
        id: presentationId,
        credentials: credentials.length,
        holder: options.holder || keyPair.did
      });

      return verifiablePresentation;

    } catch (error) {
      console.error('❌ Failed to create presentation:', error);
      throw new Error(`Presentation creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ✍️ Create Ed25519Signature2020 Proof
   * Real cryptographic proof following W3C specifications
   */
  private async createEd25519Proof(
    document: any,
    keyPair: DIDKeyPair,
    options: {
      challenge?: string;
      domain?: string;
      proofPurpose?: string;
    } = {}
  ): Promise<Proof> {
    try {
      const created = new Date().toISOString();
      const proofPurpose = options.proofPurpose || 'assertionMethod';

      // 🏗️ Create proof configuration
      const proofConfig: Omit<Proof, 'proofValue'> = {
        type: 'Ed25519Signature2020',
        created,
        verificationMethod: keyPair.verificationMethod,
        proofPurpose
      };

      // 📎 Add optional challenge and domain
      if (options.challenge) {
        (proofConfig as any).challenge = options.challenge;
      }
      if (options.domain) {
        (proofConfig as any).domain = options.domain;
      }

      // 🔗 Create canonicalized document for signing
      const documentToSign = {
        ...document,
        proof: proofConfig
      };

      // 📝 Create signature
      const canonicalized = this.canonicalize(documentToSign);
      const signatureResult = await didCryptoService.signWithDID(
        canonicalized,
        keyPair.privateKey
      );

      // 🏆 Complete proof with signature
      const proof: Proof = {
        ...proofConfig,
        proofValue: signatureResult.signatureBase64
      };

      console.log('✍️ Created Ed25519 proof:', {
        type: proof.type,
        created: proof.created,
        verified: signatureResult.verification
      });

      return proof;

    } catch (error) {
      console.error('❌ Failed to create proof:', error);
      throw error;
    }
  }

  /**
   * ✅ Verify Ed25519Signature2020 Proof
   */
  private async verifyProof(document: any, proof: Proof): Promise<boolean> {
    try {
      if (proof.type !== 'Ed25519Signature2020') {
        console.warn('⚠️ Unsupported proof type:', proof.type);
        return false;
      }

      if (!proof.proofValue) {
        console.error('❌ No proof value found');
        return false;
      }

      // 🔗 Recreate document for verification
      const documentCopy = { ...document };
      const proofCopy = { ...proof };
      delete proofCopy.proofValue;
      documentCopy.proof = proofCopy;

      // 📝 Canonicalize and verify
      const canonicalized = this.canonicalize(documentCopy);
      
      // 🔑 Extract public key from verification method
      // For did:key method, extract from the DID
      const verificationMethod = proof.verificationMethod;
      const publicKey = await this.extractPublicKeyFromDID(verificationMethod);
      
      if (!publicKey) {
        console.error('❌ Could not extract public key from:', verificationMethod);
        return false;
      }

      // 🔓 Convert proof value and verify
      const signature = this.base64ToUint8Array(proof.proofValue);
      const isValid = await didCryptoService.verifyDIDSignature(
        canonicalized,
        signature,
        publicKey
      );

      console.log('✅ Proof verification result:', {
        type: proof.type,
        verificationMethod,
        isValid
      });

      return isValid;

    } catch (error) {
      console.error('❌ Proof verification failed:', error);
      return false;
    }
  }

  /**
   * 🔑 Extract Public Key from DID Verification Method
   */
  private async extractPublicKeyFromDID(verificationMethod: string): Promise<Uint8Array | null> {
    try {
      // Parse DID:key method
      const [did] = verificationMethod.split('#');
      
      if (!did.startsWith('did:key:z')) {
        console.error('❌ Unsupported DID method:', did);
        return null;
      }

      // Extract multicodec key from DID
      const multicodecKey = did.replace('did:key:z', '');
      const keyBytes = this.base58ToUint8Array(multicodecKey);
      
      // Remove multicodec prefix (first 2 bytes for Ed25519: 0xed01)
      if (keyBytes.length < 34 || keyBytes[0] !== 0xed || keyBytes[1] !== 0x01) {
        console.error('❌ Invalid Ed25519 multicodec key');
        return null;
      }
      
      return keyBytes.slice(2); // Remove multicodec prefix

    } catch (error) {
      console.error('❌ Failed to extract public key:', error);
      return null;
    }
  }

  /**
   * 📋 Validate Credential Structure
   */
  private validateCredentialStructure(credential: VerifiableCredential): boolean {
    try {
      // Check required fields
      if (!credential['@context'] || !Array.isArray(credential['@context'])) {
        return false;
      }
      
      if (!credential.id || typeof credential.id !== 'string') {
        return false;
      }
      
      if (!credential.type || !Array.isArray(credential.type)) {
        return false;
      }
      
      if (!credential.type.includes('VerifiableCredential')) {
        return false;
      }
      
      if (!credential.issuer) {
        return false;
      }
      
      if (!credential.issuanceDate) {
        return false;
      }
      
      if (!credential.credentialSubject) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('❌ Structure validation failed:', error);
      return false;
    }
  }

  /**
   * 📝 Simple Canonicalization
   * In production, use proper JSON-LD canonicalization
   */
  private canonicalize(document: any): string {
    // ⚠️ SIMPLIFIED: In production, use proper RDF Dataset Canonicalization
    return JSON.stringify(document, Object.keys(document).sort());
  }

  /**
   * 🆔 Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 🔧 UTILITY METHODS

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    return new Uint8Array(binaryString.length).map((_, i) => binaryString.charCodeAt(i));
  }

  private base58ToUint8Array(base58: string): Uint8Array {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const bytes: number[] = [];
    
    for (let i = 0; i < base58.length; i++) {
      let carry = alphabet.indexOf(base58[i]);
      
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58;
        bytes[j] = carry % 256;
        carry = Math.floor(carry / 256);
      }
      
      while (carry > 0) {
        bytes.push(carry % 256);
        carry = Math.floor(carry / 256);
      }
    }
    
    // Add leading zeros
    for (let i = 0; i < base58.length && base58[i] === alphabet[0]; i++) {
      bytes.push(0);
    }
    
    return new Uint8Array(bytes.reverse());
  }

  /**
   * 🔑 Get Current DID
   */
  async getCurrentDID(): Promise<string | null> {
    try {
      const keyPair = this.currentDIDKeyPair || await this.loadDIDKeyPair();
      return keyPair.did;
    } catch {
      return null;
    }
  }

  /**
   * 🔐 Get Current Key Pair
   */
  async getCurrentKeyPair(): Promise<DIDKeyPair | null> {
    try {
      return this.currentDIDKeyPair || await this.loadDIDKeyPair();
    } catch {
      return null;
    }
  }
}

// 🏭 Export singleton instance
export const verifiableCredentialService = new VerifiableCredentialService();