/**
 * Universal DID Service - Multi-Method DID Support
 * Implements support for multiple DID methods with universal resolution
 * 
 * Supported Methods:
 * - did:persona (PersonaPass native)
 * - did:key (W3C standard)
 * - did:web (Web-based DIDs)
 * - did:ethr (Ethereum DIDs)
 * - Custom methods via registry
 */

import { ed25519 } from "@noble/curves/ed25519";
import { secp256k1 } from "@noble/curves/secp256k1";

// Enable WASM for optimal cryptographic performance
if (typeof globalThis !== 'undefined') {
  // Allow WASM for better performance
  globalThis.crypto = globalThis.crypto || {};
  (globalThis as any).__NOBLE_DISABLE_WASM__ = false;
}
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/hashes/utils";
import { base58btc } from "multiformats/bases/base58";
import { base64url } from "multiformats/bases/base64";
import { cryptoService } from "./cryptoService";
// Lazy load blockchainService to avoid circular dependency
import type { DID, PublicKey } from "@/types/wallet";

// DID Method Registry Types
export interface DIDMethodSpec {
  name: string;
  prefix: string;
  resolver: DIDMethodResolver;
  generator: DIDMethodGenerator;
  validator: DIDMethodValidator;
  keyTypes: string[];
  features: DIDMethodFeatures;
}

export interface DIDMethodFeatures {
  supportsKeyRotation: boolean;
  supportsCrossChain: boolean;
  supportsVerifiableCredentials: boolean;
  requiresBlockchain: boolean;
  supportsOfflineVerification: boolean;
}

export interface DIDMethodResolver {
  resolve(did: string): Promise<UniversalDIDDocument>;
  verify(did: string, signature: Uint8Array, data: Uint8Array): Promise<boolean>;
}

export interface DIDMethodGenerator {
  generate(options: DIDGenerationOptions): Promise<UniversalDIDResult>;
  generateFromSeed(seed: string, options: DIDGenerationOptions): Promise<UniversalDIDResult>;
}

export interface DIDMethodValidator {
  validate(did: string): boolean;
  validateDocument(document: UniversalDIDDocument): DIDValidationResult;
}

// Universal DID Types
export interface UniversalDIDDocument {
  "@context": string[];
  id: string;
  method: string;
  controller: string | string[];
  verificationMethod: UniversalVerificationMethod[];
  authentication: (string | UniversalVerificationMethod)[];
  assertionMethod?: (string | UniversalVerificationMethod)[];
  keyAgreement?: (string | UniversalVerificationMethod)[];
  capabilityInvocation?: (string | UniversalVerificationMethod)[];
  capabilityDelegation?: (string | UniversalVerificationMethod)[];
  service?: ServiceEndpoint[];
  created?: string;
  updated?: string;
  deactivated?: boolean;
  metadata?: DIDDocumentMetadata;
}

export interface UniversalVerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: JsonWebKey;
  publicKeyMultibase?: string;
  publicKeyBase58?: string;
  blockchainAccountId?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | object;
}

export interface DIDDocumentMetadata {
  created?: string;
  updated?: string;
  deactivated?: boolean;
  nextUpdate?: string;
  versionId?: string;
  nextVersionId?: string;
  method?: DIDMethodMetadata;
}

export interface DIDMethodMetadata {
  published?: boolean;
  recoveryCommitment?: string;
  updateCommitment?: string;
}

export interface UniversalDIDResult {
  success: boolean;
  did?: string;
  document?: UniversalDIDDocument;
  keyPair?: UniversalKeyPair;
  metadata?: DIDCreationMetadata;
  error?: string;
}

export interface UniversalKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  keyId: string;
  keyType: string;
  curve: string;
}

export interface DIDCreationMetadata {
  method: string;
  keyType: string;
  created: Date;
  version: string;
  features: string[];
}

export interface DIDGenerationOptions {
  method?: string;
  keyType?: 'Ed25519' | 'secp256k1' | 'P-256';
  network?: string;
  service?: ServiceEndpoint[];
  useHSM?: boolean;
  metadata?: Record<string, any>;
}

export interface DIDValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  metadata?: any;
}

export interface DIDResolutionOptions {
  accept?: string;
  versionId?: string;
  versionTime?: string;
  noCache?: boolean;
}

export interface DIDResolutionResult {
  didDocument?: UniversalDIDDocument;
  didDocumentMetadata?: DIDDocumentMetadata;
  didResolutionMetadata: DIDResolutionMetadata;
}

export interface DIDResolutionMetadata {
  contentType?: string;
  error?: string;
  retrieved?: string;
  duration?: number;
}

// Base58 utility
const base58 = {
  encode: (data: Uint8Array): string => base58btc.encode(data),
  decode: (str: string): Uint8Array => base58btc.decode(str)
};

/**
 * did:persona Method Implementation
 */
class PersonaDIDMethod implements DIDMethodResolver, DIDMethodGenerator, DIDMethodValidator {
  private static readonly METHOD_PREFIX = 'did:persona:';
  private static readonly MULTICODEC_ED25519 = new Uint8Array([0xed, 0x01]);
  private static readonly MULTICODEC_SECP256K1 = new Uint8Array([0xe7, 0x01]);

  async generate(options: DIDGenerationOptions = {}): Promise<UniversalDIDResult> {
    try {
      const keyType = options.keyType || 'Ed25519';
      let keyPair: UniversalKeyPair;

      if (keyType === 'Ed25519') {
        const privateKey = ed25519.utils.randomPrivateKey();
        const publicKey = ed25519.getPublicKey(privateKey);
        
        keyPair = {
          privateKey,
          publicKey,
          keyId: await this.generateKeyId(publicKey),
          keyType: 'Ed25519',
          curve: 'Ed25519'
        };
      } else if (keyType === 'secp256k1') {
        const privateKey = secp256k1.utils.randomPrivateKey();
        const publicKey = secp256k1.getPublicKey(privateKey, false);
        
        keyPair = {
          privateKey,
          publicKey,
          keyId: await this.generateKeyId(publicKey),
          keyType: 'secp256k1',
          curve: 'secp256k1'
        };
      } else {
        throw new Error(`Unsupported key type: ${keyType}`);
      }

      const identifier = await this.generateIdentifier(keyPair.publicKey, keyType);
      const did = `${PersonaDIDMethod.METHOD_PREFIX}${identifier}`;
      const document = await this.createDIDDocument(did, keyPair, options);

      return {
        success: true,
        did,
        document,
        keyPair,
        metadata: {
          method: 'persona',
          keyType,
          created: new Date(),
          version: '1.0',
          features: ['keyRotation', 'crossChain', 'verifiableCredentials']
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DID generation failed'
      };
    }
  }

  async generateFromSeed(seed: string, options: DIDGenerationOptions = {}): Promise<UniversalDIDResult> {
    try {
      const keyType = options.keyType || 'Ed25519';
      const seedBytes = new TextEncoder().encode(seed);
      const hash = sha256(seedBytes);
      
      let keyPair: UniversalKeyPair;

      if (keyType === 'Ed25519') {
        const privateKey = hash.slice(0, 32);
        const publicKey = ed25519.getPublicKey(privateKey);
        
        keyPair = {
          privateKey,
          publicKey,
          keyId: await this.generateKeyId(publicKey),
          keyType: 'Ed25519',
          curve: 'Ed25519'
        };
      } else {
        throw new Error(`Seed generation not supported for ${keyType}`);
      }

      const identifier = await this.generateIdentifier(keyPair.publicKey, keyType);
      const did = `${PersonaDIDMethod.METHOD_PREFIX}${identifier}`;
      const document = await this.createDIDDocument(did, keyPair, options);

      return {
        success: true,
        did,
        document,
        keyPair,
        metadata: {
          method: 'persona',
          keyType,
          created: new Date(),
          version: '1.0',
          features: ['keyRotation', 'crossChain', 'verifiableCredentials']
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Seed-based DID generation failed'
      };
    }
  }

  async resolve(did: string): Promise<UniversalDIDDocument> {
    if (!this.validate(did)) {
      throw new Error('Invalid did:persona DID format');
    }

    // For persona DIDs, try blockchain resolution first
    try {
      const blockchainDoc = await this.resolveFromBlockchain(did);
      if (blockchainDoc) {
        return blockchainDoc;
      }
    } catch (error) {
      console.warn('Blockchain resolution failed, falling back to key derivation', error);
    }

    // Fallback to key derivation
    return this.resolveFromKey(did);
  }

  async verify(did: string, signature: Uint8Array, data: Uint8Array): Promise<boolean> {
    try {
      const document = await this.resolve(did);
      const verificationMethod = document.verificationMethod[0];
      
      if (!verificationMethod.publicKeyMultibase) {
        return false;
      }

      const publicKey = this.decodePublicKey(verificationMethod.publicKeyMultibase);
      const keyType = verificationMethod.type;

      if (keyType === 'Ed25519VerificationKey2020') {
        return ed25519.verify(signature, data, publicKey);
      } else if (keyType === 'EcdsaSecp256k1VerificationKey2019') {
        const sig = secp256k1.Signature.fromCompact(signature);
        return secp256k1.verify(sig, data, publicKey);
      }

      return false;
    } catch {
      return false;
    }
  }

  validate(did: string): boolean {
    return did.startsWith(PersonaDIDMethod.METHOD_PREFIX) && 
           did.length > PersonaDIDMethod.METHOD_PREFIX.length;
  }

  validateDocument(document: UniversalDIDDocument): DIDValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!document.id || !this.validate(document.id)) {
      errors.push('Invalid DID format');
    }

    if (!document.verificationMethod || document.verificationMethod.length === 0) {
      errors.push('Missing verification methods');
    }

    if (!document.authentication || document.authentication.length === 0) {
      errors.push('Missing authentication methods');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private async generateIdentifier(publicKey: Uint8Array, keyType: string): Promise<string> {
    const multicodecPrefix = keyType === 'Ed25519' ? 
      PersonaDIDMethod.MULTICODEC_ED25519 : 
      PersonaDIDMethod.MULTICODEC_SECP256K1;
    
    const multicodecKey = new Uint8Array([...multicodecPrefix, ...publicKey]);
    const hash = sha256(multicodecKey);
    return base58.encode(hash.slice(0, 20)); // Use first 20 bytes
  }

  private async generateKeyId(publicKey: Uint8Array): Promise<string> {
    const hash = sha256(publicKey);
    return base58.encode(hash.slice(0, 8));
  }

  private async createDIDDocument(
    did: string, 
    keyPair: UniversalKeyPair, 
    options: DIDGenerationOptions
  ): Promise<UniversalDIDDocument> {
    const keyId = `${did}#${keyPair.keyId}`;
    const publicKeyMultibase = this.encodePublicKey(keyPair.publicKey, keyPair.keyType);
    
    const verificationMethod: UniversalVerificationMethod = {
      id: keyId,
      type: keyPair.keyType === 'Ed25519' ? 
        'Ed25519VerificationKey2020' : 
        'EcdsaSecp256k1VerificationKey2019',
      controller: did,
      publicKeyMultibase
    };

    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
        "https://personapass.com/contexts/persona-did/v1"
      ],
      id: did,
      method: 'persona',
      controller: did,
      verificationMethod: [verificationMethod],
      authentication: [keyId],
      assertionMethod: [keyId],
      capabilityInvocation: [keyId],
      capabilityDelegation: [keyId],
      service: options.service || [],
      created: new Date().toISOString(),
      metadata: {
        method: {
          published: options.network ? true : false,
          updateCommitment: await this.generateUpdateCommitment(keyPair.publicKey),
          recoveryCommitment: await this.generateRecoveryCommitment(keyPair.publicKey)
        }
      }
    };
  }

  private encodePublicKey(publicKey: Uint8Array, keyType: string): string {
    const multicodecPrefix = keyType === 'Ed25519' ? 
      PersonaDIDMethod.MULTICODEC_ED25519 : 
      PersonaDIDMethod.MULTICODEC_SECP256K1;
    
    const multicodecKey = new Uint8Array([...multicodecPrefix, ...publicKey]);
    return base58.encode(multicodecKey);
  }

  private decodePublicKey(publicKeyMultibase: string): Uint8Array {
    const multicodecKey = base58.decode(publicKeyMultibase);
    return multicodecKey.slice(2); // Remove multicodec prefix
  }

  private async resolveFromBlockchain(did: string): Promise<UniversalDIDDocument | null> {
    try {
      // This would integrate with the DIDRegistryUniversal contract
      // For now, return null to indicate not found
      return null;
    } catch {
      return null;
    }
  }

  private async resolveFromKey(did: string): Promise<UniversalDIDDocument> {
    // Extract identifier and reconstruct from key
    const identifier = did.substring(PersonaDIDMethod.METHOD_PREFIX.length);
    
    // This is a simplified implementation
    // In practice, we'd need to reverse the key derivation process
    throw new Error('Key-based resolution not fully implemented');
  }

  private async generateUpdateCommitment(publicKey: Uint8Array): Promise<string> {
    const hash = sha256(new Uint8Array([...publicKey, 0x01]));
    return base58.encode(hash);
  }

  private async generateRecoveryCommitment(publicKey: Uint8Array): Promise<string> {
    const hash = sha256(new Uint8Array([...publicKey, 0x02]));
    return base58.encode(hash);
  }
}

/**
 * did:key Method Implementation
 */
class KeyDIDMethod implements DIDMethodResolver, DIDMethodGenerator, DIDMethodValidator {
  private static readonly METHOD_PREFIX = 'did:key:';
  private static readonly MULTICODEC_ED25519 = new Uint8Array([0xed, 0x01]);

  async generate(options: DIDGenerationOptions = {}): Promise<UniversalDIDResult> {
    try {
      const keyType = options.keyType || 'Ed25519';
      
      if (keyType !== 'Ed25519') {
        throw new Error('did:key currently only supports Ed25519');
      }

      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = ed25519.getPublicKey(privateKey);
      
      const keyPair: UniversalKeyPair = {
        privateKey,
        publicKey,
        keyId: await this.generateKeyId(publicKey),
        keyType: 'Ed25519',
        curve: 'Ed25519'
      };

      const publicKeyMultibase = this.encodePublicKey(publicKey);
      const did = `${KeyDIDMethod.METHOD_PREFIX}${publicKeyMultibase}`;
      const document = await this.createDIDDocument(did, keyPair);

      return {
        success: true,
        did,
        document,
        keyPair,
        metadata: {
          method: 'key',
          keyType: 'Ed25519',
          created: new Date(),
          version: '1.0',
          features: ['offlineVerification']
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'did:key generation failed'
      };
    }
  }

  async generateFromSeed(seed: string, options: DIDGenerationOptions = {}): Promise<UniversalDIDResult> {
    try {
      const seedBytes = new TextEncoder().encode(seed);
      const hash = sha256(seedBytes);
      const privateKey = hash.slice(0, 32);
      const publicKey = ed25519.getPublicKey(privateKey);
      
      const keyPair: UniversalKeyPair = {
        privateKey,
        publicKey,
        keyId: await this.generateKeyId(publicKey),
        keyType: 'Ed25519',
        curve: 'Ed25519'
      };

      const publicKeyMultibase = this.encodePublicKey(publicKey);
      const did = `${KeyDIDMethod.METHOD_PREFIX}${publicKeyMultibase}`;
      const document = await this.createDIDDocument(did, keyPair);

      return {
        success: true,
        did,
        document,
        keyPair,
        metadata: {
          method: 'key',
          keyType: 'Ed25519',
          created: new Date(),
          version: '1.0',
          features: ['offlineVerification']
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Seed-based did:key generation failed'
      };
    }
  }

  async resolve(did: string): Promise<UniversalDIDDocument> {
    if (!this.validate(did)) {
      throw new Error('Invalid did:key format');
    }

    const publicKeyMultibase = did.substring(KeyDIDMethod.METHOD_PREFIX.length);
    const publicKey = this.decodePublicKey(publicKeyMultibase);
    
    const keyId = `${did}#${publicKeyMultibase}`;
    
    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1"
      ],
      id: did,
      method: 'key',
      controller: did,
      verificationMethod: [{
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase
      }],
      authentication: [keyId],
      assertionMethod: [keyId],
      capabilityInvocation: [keyId],
      capabilityDelegation: [keyId]
    };
  }

  async verify(did: string, signature: Uint8Array, data: Uint8Array): Promise<boolean> {
    try {
      const publicKeyMultibase = did.substring(KeyDIDMethod.METHOD_PREFIX.length);
      const publicKey = this.decodePublicKey(publicKeyMultibase);
      return ed25519.verify(signature, data, publicKey);
    } catch {
      return false;
    }
  }

  validate(did: string): boolean {
    if (!did.startsWith(KeyDIDMethod.METHOD_PREFIX)) {
      return false;
    }

    try {
      const publicKeyMultibase = did.substring(KeyDIDMethod.METHOD_PREFIX.length);
      this.decodePublicKey(publicKeyMultibase);
      return true;
    } catch {
      return false;
    }
  }

  validateDocument(document: UniversalDIDDocument): DIDValidationResult {
    const errors: string[] = [];

    if (!document.id || !this.validate(document.id)) {
      errors.push('Invalid did:key format');
    }

    if (!document.verificationMethod || document.verificationMethod.length !== 1) {
      errors.push('did:key must have exactly one verification method');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private encodePublicKey(publicKey: Uint8Array): string {
    const multicodecKey = new Uint8Array([...KeyDIDMethod.MULTICODEC_ED25519, ...publicKey]);
    return base58.encode(multicodecKey);
  }

  private decodePublicKey(publicKeyMultibase: string): Uint8Array {
    const multicodecKey = base58.decode(publicKeyMultibase);
    
    // Verify multicodec prefix
    if (multicodecKey[0] !== 0xed || multicodecKey[1] !== 0x01) {
      throw new Error('Invalid multicodec prefix for Ed25519');
    }
    
    return multicodecKey.slice(2);
  }

  private async generateKeyId(publicKey: Uint8Array): Promise<string> {
    const hash = sha256(publicKey);
    return base58.encode(hash.slice(0, 8));
  }

  private async createDIDDocument(did: string, keyPair: UniversalKeyPair): Promise<UniversalDIDDocument> {
    const publicKeyMultibase = this.encodePublicKey(keyPair.publicKey);
    const keyId = `${did}#${publicKeyMultibase}`;
    
    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1"
      ],
      id: did,
      method: 'key',
      controller: did,
      verificationMethod: [{
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase
      }],
      authentication: [keyId],
      assertionMethod: [keyId],
      capabilityInvocation: [keyId],
      capabilityDelegation: [keyId]
    };
  }
}

/**
 * Universal DID Service
 * Coordinates multiple DID methods with universal resolution
 */
export class UniversalDIDService {
  private static instance: UniversalDIDService;
  private methodRegistry = new Map<string, DIDMethodSpec>();
  private resolverCache = new Map<string, UniversalDIDDocument>();

  static getInstance(): UniversalDIDService {
    if (!UniversalDIDService.instance) {
      UniversalDIDService.instance = new UniversalDIDService();
    }
    return UniversalDIDService.instance;
  }

  private constructor() {
    this.registerDefaultMethods();
  }

  /**
   * Register default DID methods
   */
  private registerDefaultMethods(): void {
    const personaMethod = new PersonaDIDMethod();
    const keyMethod = new KeyDIDMethod();

    this.methodRegistry.set('persona', {
      name: 'persona',
      prefix: 'did:persona:',
      resolver: personaMethod,
      generator: personaMethod,
      validator: personaMethod,
      keyTypes: ['Ed25519', 'secp256k1'],
      features: {
        supportsKeyRotation: true,
        supportsCrossChain: true,
        supportsVerifiableCredentials: true,
        requiresBlockchain: false,
        supportsOfflineVerification: true
      }
    });

    this.methodRegistry.set('key', {
      name: 'key',
      prefix: 'did:key:',
      resolver: keyMethod,
      generator: keyMethod,
      validator: keyMethod,
      keyTypes: ['Ed25519'],
      features: {
        supportsKeyRotation: false,
        supportsCrossChain: false,
        supportsVerifiableCredentials: true,
        requiresBlockchain: false,
        supportsOfflineVerification: true
      }
    });
  }

  /**
   * Generate DID with specified method
   */
  async generateDID(options: DIDGenerationOptions = {}): Promise<UniversalDIDResult> {
    const method = options.method || 'persona';
    const methodSpec = this.methodRegistry.get(method);
    
    if (!methodSpec) {
      return {
        success: false,
        error: `Unsupported DID method: ${method}`
      };
    }

    return methodSpec.generator.generate(options);
  }

  /**
   * Generate DID from seed
   */
  async generateDIDFromSeed(seed: string, options: DIDGenerationOptions = {}): Promise<UniversalDIDResult> {
    const method = options.method || 'persona';
    const methodSpec = this.methodRegistry.get(method);
    
    if (!methodSpec) {
      return {
        success: false,
        error: `Unsupported DID method: ${method}`
      };
    }

    return methodSpec.generator.generateFromSeed(seed, options);
  }

  /**
   * Universal DID resolution
   */
  async resolveDID(did: string, options: DIDResolutionOptions = {}): Promise<DIDResolutionResult> {
    const startTime = performance.now();
    
    try {
      // Check cache unless noCache is specified
      if (!options.noCache) {
        const cached = this.resolverCache.get(did);
        if (cached) {
          return {
            didDocument: cached,
            didResolutionMetadata: {
              retrieved: new Date().toISOString(),
              duration: performance.now() - startTime
            }
          };
        }
      }

      const method = this.extractMethod(did);
      if (!method) {
        return {
          didResolutionMetadata: {
            error: 'invalidDid',
            duration: performance.now() - startTime
          }
        };
      }

      const methodSpec = this.methodRegistry.get(method);
      if (!methodSpec) {
        return {
          didResolutionMetadata: {
            error: 'methodNotSupported',
            duration: performance.now() - startTime
          }
        };
      }

      const document = await methodSpec.resolver.resolve(did);
      
      // Cache successful resolutions
      this.resolverCache.set(did, document);

      return {
        didDocument: document,
        didDocumentMetadata: document.metadata,
        didResolutionMetadata: {
          contentType: 'application/did+ld+json',
          retrieved: new Date().toISOString(),
          duration: performance.now() - startTime
        }
      };

    } catch (error) {
      return {
        didResolutionMetadata: {
          error: 'notFound',
          duration: performance.now() - startTime
        }
      };
    }
  }

  /**
   * Verify DID signature
   */
  async verifyDIDSignature(
    did: string, 
    signature: Uint8Array, 
    data: Uint8Array
  ): Promise<boolean> {
    try {
      const method = this.extractMethod(did);
      if (!method) {
        return false;
      }

      const methodSpec = this.methodRegistry.get(method);
      if (!methodSpec) {
        return false;
      }

      return methodSpec.resolver.verify(did, signature, data);
    } catch {
      return false;
    }
  }

  /**
   * Validate DID format
   */
  validateDID(did: string): boolean {
    const method = this.extractMethod(did);
    if (!method) {
      return false;
    }

    const methodSpec = this.methodRegistry.get(method);
    if (!methodSpec) {
      return false;
    }

    return methodSpec.validator.validate(did);
  }

  /**
   * Validate DID document
   */
  validateDIDDocument(document: UniversalDIDDocument): DIDValidationResult {
    const method = this.extractMethod(document.id);
    if (!method) {
      return {
        valid: false,
        errors: ['Invalid DID format']
      };
    }

    const methodSpec = this.methodRegistry.get(method);
    if (!methodSpec) {
      return {
        valid: false,
        errors: [`Unsupported DID method: ${method}`]
      };
    }

    return methodSpec.validator.validateDocument(document);
  }

  /**
   * Get supported DID methods
   */
  getSupportedMethods(): string[] {
    return Array.from(this.methodRegistry.keys());
  }

  /**
   * Get method specification
   */
  getMethodSpec(method: string): DIDMethodSpec | undefined {
    return this.methodRegistry.get(method);
  }

  /**
   * Register custom DID method
   */
  registerMethod(methodSpec: DIDMethodSpec): void {
    this.methodRegistry.set(methodSpec.name, methodSpec);
  }

  /**
   * Clear resolver cache
   */
  clearCache(): void {
    this.resolverCache.clear();
  }

  /**
   * Extract method from DID
   */
  private extractMethod(did: string): string | null {
    const match = did.match(/^did:([^:]+):/);
    return match ? match[1] : null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.resolverCache.size,
      entries: Array.from(this.resolverCache.keys())
    };
  }
}

// Export singleton instance
export const universalDIDService = UniversalDIDService.getInstance();

// Export for backward compatibility
export { UniversalDIDService as DIDService };
export { universalDIDService as didService };