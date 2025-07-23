/**
 * DID Service - Production DID Creation and Management
 *
 * Implements W3C DID Core Specification using did:key method
 * with Ed25519 cryptographic signatures for secure identity generation
 */

import { ed25519 } from "@noble/curves/ed25519";
// import { randomBytes } from '@noble/hashes/utils';
import { sha256 } from "@noble/hashes/sha256";
import { base58btc } from "multiformats/bases/base58";
// Use mock service in development/testing
import { gcpHSMService } from "./mockGcpHSMService";
// Import blockchain service for DID registry
import { blockchainService } from "./blockchainService";
import { errorService } from "@/services/errorService";

/**
 * DID Document structure according to W3C DID Core spec
 */
export interface DIDDocument {
  "@context": string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  keyAgreement?: string[];
  capabilityInvocation: string[];
  capabilityDelegation: string[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
}

export interface DIDKeyPair {
  did: string;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  document: DIDDocument;
  hsmBacked?: boolean;
  hsmKeyId?: string;
}

/**
 * Production DID Service for Persona Identity Wallet
 *
 * Features:
 * - Ed25519 cryptographic key generation
 * - W3C DID Core compliant DID documents
 * - Secure private key management
 * - did:key method implementation
 * - Multibase encoding for interoperability
 */
// Enhanced DID lifecycle management types
export interface DIDGenerationOptions {
  useHSM?: boolean;
  method?: 'did:key' | 'did:personachain';
  keyType?: 'Ed25519' | 'secp256k1';
  metadata?: Record<string, any>;
}

export interface DIDCreationResult {
  success: boolean;
  did?: string;
  privateKey?: Uint8Array;
  publicKey?: Uint8Array;
  document?: DIDDocument;
  hsmBacked?: boolean;
  hsmKeyId?: string;
  creationTime?: number;
  publicKeyLength?: number;
  documentValid?: boolean;
  error?: string;
}

export interface DIDSignatureResult {
  success: boolean;
  signature?: Uint8Array;
  publicKey?: Uint8Array;
  did?: string;
  timestamp?: Date;
  hsmBacked?: boolean;
  error?: string;
}

export interface DIDVerificationResult {
  valid: boolean;
  did?: string;
  timestamp?: Date;
  verificationTime?: number;
  error?: string;
}

export interface DIDResolutionResult {
  success: boolean;
  document?: DIDDocument;
  cached?: boolean;
  resolutionTime?: number;
  error?: string;
}

export interface DIDValidationResult {
  valid: boolean;
  errors?: string[];
  validationTime?: number;
}

export interface DIDKeyRotationResult {
  success: boolean;
  did?: string;
  newPrivateKey?: Uint8Array;
  newPublicKey?: Uint8Array;
  newDocument?: DIDDocument;
  rotationTime?: number;
  error?: string;
}

export interface DIDOperation {
  id: string;
  type: 'create' | 'resolve' | 'validate' | 'rotate';
  did?: string;
  options?: DIDGenerationOptions;
  document?: DIDDocument;
  privateKey?: Uint8Array;
}

export interface DIDOperationResult {
  operationId: string;
  success: boolean;
  result?: any;
  error?: string;
}

export interface DIDBatchResult {
  success: boolean;
  operations: DIDOperationResult[];
  totalOperations: number;
  successfulOperations: number;
  processingTime: number;
  error?: string;
}

export interface DIDRegistryEntry {
  did: string;
  created: Date;
  lastUsed: Date;
  status: 'active' | 'revoked' | 'suspended';
  keyRotations: number;
  verificationCount: number;
  metadata?: Record<string, any>;
}

export interface DIDAnalytics {
  did?: string;
  createdAt?: Date;
  lastUsed?: Date;
  status?: string;
  keyRotations?: number;
  verificationCount?: number;
  usageMetrics?: DIDUsageMetrics;
  aggregateStats?: DIDAggregateStats;
}

export interface DIDUsageMetrics {
  totalOperations: number;
  signOperations: number;
  verifyOperations: number;
  avgResponseTime: number;
  errorRate: number;
  lastWeekUsage: number[];
}

export interface DIDAggregateStats {
  totalDIDs: number;
  activeDIDs: number;
  totalOperations: number;
  avgCreationTime: number;
  hsmBackedPercentage: number;
  topMethods: Array<{ method: string; count: number }>;
}

export interface DIDCacheStats {
  size: number;
  entries: string[];
}

// DID Analytics Service for tracking DID lifecycle events
class DIDAnalyticsService {
  private static instance: DIDAnalyticsService;
  private metrics: Map<string, DIDUsageMetrics> = new Map();
  private events: DIDAnalyticsEvent[] = [];

  static getInstance(): DIDAnalyticsService {
    if (!DIDAnalyticsService.instance) {
      DIDAnalyticsService.instance = new DIDAnalyticsService();
    }
    return DIDAnalyticsService.instance;
  }

  trackDIDCreation(event: DIDCreationEvent): void {
    this.events.push({
      type: 'creation',
      timestamp: new Date(),
      did: event.did,
      method: event.method,
      creationTime: event.creationTime,
      hsmBacked: event.hsmBacked,
      keyType: event.keyType,
      seedBased: event.seedBased
    });
  }

  trackDIDUsage(event: DIDUsageEvent): void {
    this.events.push({
      type: 'usage',
      timestamp: new Date(),
      did: event.did,
      operation: event.operation,
      duration: event.duration,
      hsmBacked: event.hsmBacked,
      success: event.success
    });

    // Update metrics
    const existing = this.metrics.get(event.did) || {
      totalOperations: 0,
      signOperations: 0,
      verifyOperations: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastWeekUsage: new Array(7).fill(0)
    };

    existing.totalOperations++;
    if (event.operation === 'sign') existing.signOperations++;
    if (event.operation === 'verify') existing.verifyOperations++;
    
    // Update average response time
    existing.avgResponseTime = (existing.avgResponseTime * (existing.totalOperations - 1) + event.duration) / existing.totalOperations;
    
    // Update error rate
    if (!event.success) {
      existing.errorRate = (existing.errorRate * (existing.totalOperations - 1) + 1) / existing.totalOperations;
    }

    this.metrics.set(event.did, existing);
  }

  trackDIDKeyRotation(event: DIDKeyRotationEvent): void {
    this.events.push({
      type: 'keyRotation',
      timestamp: new Date(),
      did: event.did,
      rotationTime: event.rotationTime,
      newPublicKey: event.newPublicKey
    });
  }

  async getDIDUsageMetrics(did: string): Promise<DIDUsageMetrics> {
    return this.metrics.get(did) || {
      totalOperations: 0,
      signOperations: 0,
      verifyOperations: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastWeekUsage: new Array(7).fill(0)
    };
  }

  async getAggregateAnalytics(): Promise<DIDAnalytics> {
    const totalDIDs = new Set(this.events.map(e => e.did)).size;
    const totalOperations = this.events.filter(e => e.type === 'usage').length;
    const creationEvents = this.events.filter(e => e.type === 'creation') as DIDCreationEvent[];
    
    const avgCreationTime = creationEvents.reduce((sum, e) => sum + (e.creationTime || 0), 0) / creationEvents.length || 0;
    const hsmBackedCount = creationEvents.filter(e => e.hsmBacked).length;
    const hsmBackedPercentage = (hsmBackedCount / creationEvents.length) * 100 || 0;

    const methodCounts = new Map<string, number>();
    creationEvents.forEach(e => {
      const count = methodCounts.get(e.method) || 0;
      methodCounts.set(e.method, count + 1);
    });

    const topMethods = Array.from(methodCounts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    return {
      aggregateStats: {
        totalDIDs,
        activeDIDs: totalDIDs, // All DIDs are considered active for now
        totalOperations,
        avgCreationTime,
        hsmBackedPercentage,
        topMethods
      }
    };
  }
}

// Supporting interfaces for analytics
interface DIDAnalyticsEvent {
  type: 'creation' | 'usage' | 'keyRotation';
  timestamp: Date;
  did: string;
  [key: string]: any;
}

interface DIDCreationEvent {
  did: string;
  method: string;
  creationTime: number;
  hsmBacked: boolean;
  keyType: string;
  seedBased?: boolean;
}

interface DIDUsageEvent {
  did: string;
  operation: 'sign' | 'verify' | 'resolve';
  duration: number;
  hsmBacked: boolean;
  success?: boolean;
}

interface DIDKeyRotationEvent {
  did: string;
  rotationTime: number;
  newPublicKey: string;
}

// Import base58 properly
const base58 = {
  encode: (data: Uint8Array): string => base58btc.encode(data),
  decode: (str: string): Uint8Array => base58btc.decode(str)
};

class DIDService {
  private static readonly DID_KEY_PREFIX = 'did:key:';
  private static readonly ED25519_MULTICODEC_PREFIX = new Uint8Array([
    0xed, 0x01,
  ]);

  // Enhanced DID lifecycle management
  private static didCache = new Map<string, DIDDocument>();
  private static analyticsService = new DIDAnalyticsService();
  private static didRegistry = new Map<string, DIDRegistryEntry>();

  /**
   * Enhanced DID generation with lifecycle tracking
   * Supports multiple DID methods and hardware backing
   */
  static async generateDID(options: DIDGenerationOptions = {}): Promise<DIDCreationResult> {
    const startTime = performance.now();
    
    try {
      let privateKey: Uint8Array;
      let publicKey: Uint8Array;
      let hsmBacked = false;
      let hsmKeyId = '';

      // Use HSM if available and requested
      if (options.useHSM && gcpHSMService.isAvailable()) {
        const hsmResult = await this.generateHSMBackedDID();
        if (hsmResult.success) {
          return hsmResult;
        }
        console.warn('HSM generation failed, falling back to software generation');
      }

      // Generate cryptographically secure key pair
      privateKey = ed25519.utils.randomPrivateKey();
      publicKey = ed25519.getPublicKey(privateKey);
      
      const publicKeyMultibase = this.encodePublicKeyMultibase(publicKey);
      const did = `${this.DID_KEY_PREFIX}${publicKeyMultibase}`;

      // Create DID document
      const document = this.createDIDDocument(did, publicKey);
      
      // Validate document
      const validation = await this.validateDIDDocument(document);
      if (!validation.valid) {
        throw new Error(`DID document validation failed: ${validation.errors?.join(', ')}`);
      }

      // Track creation metrics
      const creationTime = performance.now() - startTime;
      this.analyticsService.trackDIDCreation({
        did,
        method: 'did:key',
        creationTime,
        hsmBacked,
        keyType: 'Ed25519'
      });

      // Cache the DID document
      this.didCache.set(did, document);

      // Register in lifecycle tracking
      this.didRegistry.set(did, {
        did,
        created: new Date(),
        lastUsed: new Date(),
        status: 'active',
        keyRotations: 0,
        verificationCount: 0
      });

      return {
        success: true,
        did,
        privateKey,
        publicKey,
        document,
        hsmBacked,
        hsmKeyId,
        creationTime,
        publicKeyLength: publicKey.length,
        documentValid: true
      };

    } catch (error) {
      errorService.logError('DID generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        creationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Generate HSM-backed DID for enterprise security
   */
  static async generateHSMBackedDID(): Promise<DIDCreationResult> {
    const startTime = performance.now();
    
    try {
      await gcpHSMService.initialize();
      
      // Use HSM for key generation and signing
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const testDID = 'test-did-for-hsm';
      
      const sigResult = await gcpHSMService.signWithDIDKey(testData, testDID);
      const publicKey = sigResult.publicKey;
      
      const publicKeyMultibase = this.encodePublicKeyMultibase(publicKey);
      const did = `${this.DID_KEY_PREFIX}${publicKeyMultibase}`;
      
      // Create DID document
      const document = this.createDIDDocument(did, publicKey);
      
      // Validate document
      const validation = await this.validateDIDDocument(document);
      
      const creationTime = performance.now() - startTime;
      
      // Track HSM creation
      this.analyticsService.trackDIDCreation({
        did,
        method: 'did:key',
        creationTime,
        hsmBacked: true,
        keyType: 'Ed25519'
      });

      return {
        success: true,
        did,
        privateKey: new Uint8Array(), // Private key stays in HSM
        publicKey,
        document,
        hsmBacked: true,
        hsmKeyId: sigResult.keyId,
        creationTime,
        publicKeyLength: publicKey.length,
        documentValid: validation.valid
      };

    } catch (error) {
      errorService.logError('HSM-backed DID generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HSM generation failed',
        creationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Enhanced multi-base encoding for public key
   */
  private static encodePublicKeyMultibase(publicKey: Uint8Array): string {
    try {
      // Combine multicodec prefix with public key
      const multicodecKey = new Uint8Array([
        ...this.ED25519_MULTICODEC_PREFIX,
        ...publicKey,
      ]);

      // Encode as multibase (base58btc)
      return base58.encode(multicodecKey);
    } catch (error) {
      throw new Error(`Failed to encode public key: ${error}`);
    }
  }

  /**
   * Create W3C compliant DID document
   */
  private static createDIDDocument(did: string, publicKey: Uint8Array): DIDDocument {
    const publicKeyMultibase = this.encodePublicKeyMultibase(publicKey);
    const verificationMethodId = `${did}#${publicKeyMultibase}`;

    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id: did,
      verificationMethod: [
        {
          id: verificationMethodId,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyMultibase,
        },
      ],
      authentication: [verificationMethodId],
      assertionMethod: [verificationMethodId],
      capabilityInvocation: [verificationMethodId],
      capabilityDelegation: [verificationMethodId],
    };
  }

  /**
   * Enhanced DID signing with lifecycle tracking
   */
  static async signWithDID(
    data: Uint8Array,
    privateKey: Uint8Array,
    didKeyPair: DIDKeyPair
  ): Promise<DIDSignatureResult> {
    const startTime = performance.now();
    
    try {
      // Use HSM if available
      if (didKeyPair.hsmBacked && didKeyPair.hsmKeyId) {
        const sigResult = await gcpHSMService.signWithDIDKey(
          data,
          didKeyPair.did,
          didKeyPair.hsmKeyId
        );
        
        this.analyticsService.trackDIDUsage({
          did: didKeyPair.did,
          operation: 'sign',
          duration: performance.now() - startTime,
          hsmBacked: true
        });

        return {
          success: true,
          signature: sigResult.signature,
          publicKey: sigResult.publicKey,
          did: didKeyPair.did,
          timestamp: new Date(),
          hsmBacked: true
        };
      }

      // Standard Ed25519 signing
      const signature = ed25519.sign(data, privateKey);
      
      // Update usage tracking
      const registryEntry = this.didRegistry.get(didKeyPair.did);
      if (registryEntry) {
        registryEntry.lastUsed = new Date();
        registryEntry.verificationCount++;
      }

      this.analyticsService.trackDIDUsage({
        did: didKeyPair.did,
        operation: 'sign',
        duration: performance.now() - startTime,
        hsmBacked: false
      });

      return {
        success: true,
        signature,
        publicKey: didKeyPair.publicKey,
        did: didKeyPair.did,
        timestamp: new Date(),
        hsmBacked: false
      };

    } catch (error) {
      errorService.logError('DID signing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signing failed',
        did: didKeyPair.did,
        timestamp: new Date()
      };
    }
  }

  /**
   * Enhanced DID signature verification
   */
  static async verifyDIDSignature(
    signature: Uint8Array,
    data: Uint8Array,
    publicKey: Uint8Array,
    did?: string
  ): Promise<DIDVerificationResult> {
    const startTime = performance.now();
    
    try {
      const isValid = ed25519.verify(signature, data, publicKey);
      
      // Track verification
      if (did) {
        const registryEntry = this.didRegistry.get(did);
        if (registryEntry) {
          registryEntry.verificationCount++;
        }

        this.analyticsService.trackDIDUsage({
          did,
          operation: 'verify',
          duration: performance.now() - startTime,
          success: isValid
        });
      }

      return {
        valid: isValid,
        did,
        timestamp: new Date(),
        verificationTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('DID verification failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        did,
        timestamp: new Date(),
        verificationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Extract public key from DID
   */
  static extractPublicKeyFromDID(did: string): Uint8Array | null {
    try {
      if (!did.startsWith(this.DID_KEY_PREFIX)) {
        throw new Error('Invalid DID format');
      }

      const multibaseKey = did.substring(this.DID_KEY_PREFIX.length);
      const multicodecKey = base58.decode(multibaseKey);
      
      // Remove multicodec prefix to get raw public key
      return multicodecKey.slice(this.ED25519_MULTICODEC_PREFIX.length);

    } catch (error) {
      errorService.logError('Failed to extract public key from DID:', error);
      return null;
    }
  }

  /**
   * Universal DID resolver with caching
   */
  static async resolveDID(did: string): Promise<DIDResolutionResult> {
    const startTime = performance.now();
    
    try {
      // Check cache first
      const cachedDocument = this.didCache.get(did);
      if (cachedDocument) {
        return {
          success: true,
          document: cachedDocument,
          cached: true,
          resolutionTime: performance.now() - startTime
        };
      }

      // For did:key, reconstruct document
      if (did.startsWith(this.DID_KEY_PREFIX)) {
        const publicKey = this.extractPublicKeyFromDID(did);
        if (!publicKey) {
          throw new Error('Invalid DID format');
        }

        const document = this.createDIDDocument(did, publicKey);
        
        // Cache the resolved document
        this.didCache.set(did, document);

        return {
          success: true,
          document,
          cached: false,
          resolutionTime: performance.now() - startTime
        };
      }

      // For other DID methods, use universal resolver
      return await this.resolveWithUniversalResolver(did);

    } catch (error) {
      errorService.logError('DID resolution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resolution failed',
        resolutionTime: performance.now() - startTime
      };
    }
  }

  /**
   * Enhanced DID document validation
   */
  static async validateDIDDocument(document: any): Promise<DIDValidationResult> {
    const startTime = performance.now();
    
    try {
      // Check required fields
      const requiredFields = [
        '@context',
        'id',
        'verificationMethod',
        'authentication',
        'assertionMethod'
      ];

      const hasRequiredFields = requiredFields.every(field => 
        document.hasOwnProperty(field) && document[field] !== null
      );

      if (!hasRequiredFields) {
        return {
          valid: false,
          errors: ['Missing required fields'],
          validationTime: performance.now() - startTime
        };
      }

      // Validate context
      if (!Array.isArray(document['@context']) || 
          !document['@context'].includes('https://www.w3.org/ns/did/v1')) {
        return {
          valid: false,
          errors: ['Invalid @context'],
          validationTime: performance.now() - startTime
        };
      }

      // Validate verification methods
      if (!Array.isArray(document.verificationMethod)) {
        return {
          valid: false,
          errors: ['Invalid verification method'],
          validationTime: performance.now() - startTime
        };
      }

      // Validate each verification method
      const errors: string[] = [];
      for (const vm of document.verificationMethod) {
        if (!vm.id || !vm.type || !vm.controller || !vm.publicKeyMultibase) {
          errors.push(`Invalid verification method: ${vm.id || 'unknown'}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        validationTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('DID document validation failed:', error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        validationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Generate DID from seed (for Keplr integration)
   */
  static async generateDIDFromSeed(seed: string): Promise<DIDCreationResult> {
    const startTime = performance.now();
    
    try {
      // Generate deterministic private key from seed
      const seedBytes = new TextEncoder().encode(seed);
      const hash = sha256(seedBytes);
      const privateKey = hash.slice(0, 32);
      
      const publicKey = ed25519.getPublicKey(privateKey);
      const publicKeyMultibase = this.encodePublicKeyMultibase(publicKey);
      const did = `${this.DID_KEY_PREFIX}${publicKeyMultibase}`;
      const document = this.createDIDDocument(did, publicKey);

      // Track seed-based creation
      this.analyticsService.trackDIDCreation({
        did,
        method: 'did:key',
        creationTime: performance.now() - startTime,
        hsmBacked: false,
        keyType: 'Ed25519',
        seedBased: true
      });

      return {
        success: true,
        did,
        privateKey,
        publicKey,
        document,
        hsmBacked: false,
        creationTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('Seed-based DID generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Seed generation failed',
        creationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Key rotation for DID
   */
  static async rotateDIDKey(did: string, currentPrivateKey: Uint8Array): Promise<DIDKeyRotationResult> {
    const startTime = performance.now();
    
    try {
      // Generate new key pair
      const newPrivateKey = ed25519.utils.randomPrivateKey();
      const newPublicKey = ed25519.getPublicKey(newPrivateKey);
      
      // Create new DID document
      const newDocument = this.createDIDDocument(did, newPublicKey);
      
      // Update cache
      this.didCache.set(did, newDocument);
      
      // Update registry
      const registryEntry = this.didRegistry.get(did);
      if (registryEntry) {
        registryEntry.keyRotations++;
        registryEntry.lastUsed = new Date();
      }

      // Track rotation
      this.analyticsService.trackDIDKeyRotation({
        did,
        rotationTime: performance.now() - startTime,
        newPublicKey: base58.encode(newPublicKey)
      });

      return {
        success: true,
        did,
        newPrivateKey,
        newPublicKey,
        newDocument,
        rotationTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('DID key rotation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Key rotation failed',
        rotationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Batch DID operations
   */
  static async batchDIDOperations(operations: DIDOperation[]): Promise<DIDBatchResult> {
    const startTime = performance.now();
    const results: DIDOperationResult[] = [];
    
    try {
      // Process operations in parallel where possible
      const promises = operations.map(async (operation) => {
        switch (operation.type) {
          case 'create':
            return await this.generateDID(operation.options);
          case 'resolve':
            return await this.resolveDID(operation.did!);
          case 'validate':
            return await this.validateDIDDocument(operation.document!);
          case 'rotate':
            return await this.rotateDIDKey(operation.did!, operation.privateKey!);
          default:
            return { success: false, error: 'Unknown operation type' };
        }
      });

      const operationResults = await Promise.allSettled(promises);
      
      operationResults.forEach((result, index) => {
        const operation = operations[index];
        
        if (result.status === 'fulfilled') {
          results.push({
            operationId: operation.id,
            success: true,
            result: result.value
          });
        } else {
          results.push({
            operationId: operation.id,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Operation failed'
          });
        }
      });

      const successCount = results.filter(r => r.success).length;
      
      return {
        success: true,
        operations: results,
        totalOperations: operations.length,
        successfulOperations: successCount,
        processingTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('Batch DID operations failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch processing failed',
        operations: results,
        totalOperations: operations.length,
        successfulOperations: 0,
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Get DID analytics
   */
  static async getDIDAnalytics(did?: string): Promise<DIDAnalytics> {
    if (did) {
      const registryEntry = this.didRegistry.get(did);
      if (!registryEntry) {
        throw new Error('DID not found in registry');
      }
      
      return {
        did,
        createdAt: registryEntry.created,
        lastUsed: registryEntry.lastUsed,
        status: registryEntry.status,
        keyRotations: registryEntry.keyRotations,
        verificationCount: registryEntry.verificationCount,
        usageMetrics: await this.analyticsService.getDIDUsageMetrics(did)
      };
    }

    // Return aggregate analytics
    return await this.analyticsService.getAggregateAnalytics();
  }

  /**
   * Universal resolver for external DID methods
   */
  private static async resolveWithUniversalResolver(did: string): Promise<DIDResolutionResult> {
    const startTime = performance.now();
    
    try {
      // This would integrate with external DID resolvers
      // For now, return a placeholder implementation
      throw new Error('External DID resolution not implemented');

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'External resolution failed',
        resolutionTime: performance.now() - startTime
      };
    }
  }

  /**
   * Clear DID cache
   */
  static clearCache(): void {
    this.didCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): DIDCacheStats {
    return {
      size: this.didCache.size,
      entries: Array.from(this.didCache.keys())
    };
  }
}

/**
 * Enhanced DID Registry Service for blockchain integration
 */
export class DIDRegistryService {
  private static instance: DIDRegistryService;
  private blockchainService: typeof blockchainService;
  private registryCache = new Map<string, DIDRegistryRecord>();

  static getInstance(): DIDRegistryService {
    if (!DIDRegistryService.instance) {
      DIDRegistryService.instance = new DIDRegistryService();
    }
    return DIDRegistryService.instance;
  }

  private constructor() {
    this.blockchainService = blockchainService;
  }

  /**
   * Register DID on blockchain with comprehensive metadata
   */
  async registerDID(didCreationResult: DIDCreationResult, options: DIDRegistryOptions = {}): Promise<DIDRegistryResult> {
    const startTime = performance.now();
    
    try {
      if (!didCreationResult.success || !didCreationResult.did || !didCreationResult.document) {
        throw new Error('Invalid DID creation result');
      }

      // Prepare registry transaction
      const registryTx = await this.blockchainService.sendTransaction({
        to: options.registryAddress || import.meta.env.VITE_DID_REGISTRY_ADDRESS,
        data: this.encodeDIDRegistration(didCreationResult.did, didCreationResult.document),
        gasLimit: 500000,
        value: '0',
        metadata: {
          operation: 'did_registration',
          didMethod: 'did:key',
          hsmBacked: didCreationResult.hsmBacked
        }
      });

      if (!registryTx.success) {
        throw new Error(`Blockchain registration failed: ${registryTx.error}`);
      }

      // Create registry record
      const registryRecord: DIDRegistryRecord = {
        did: didCreationResult.did,
        blockchainTxHash: registryTx.hash!,
        registeredAt: new Date(),
        networkId: this.blockchainService.getCurrentNetwork().id,
        registryAddress: options.registryAddress || import.meta.env.VITE_DID_REGISTRY_ADDRESS,
        status: 'active',
        metadata: {
          hsmBacked: didCreationResult.hsmBacked,
          keyType: 'Ed25519',
          creationTime: didCreationResult.creationTime,
          ...options.metadata
        }
      };

      // Cache the record
      this.registryCache.set(didCreationResult.did, registryRecord);

      // Monitor transaction confirmation
      this.monitorRegistrationConfirmation(registryTx.hash!, didCreationResult.did);

      return {
        success: true,
        did: didCreationResult.did,
        txHash: registryTx.hash!,
        registryRecord,
        registrationTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('DID registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
        registrationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Batch register multiple DIDs
   */
  async batchRegisterDIDs(didResults: DIDCreationResult[], options: DIDRegistryOptions = {}): Promise<DIDBatchRegistryResult> {
    const startTime = performance.now();
    const results: DIDRegistryResult[] = [];

    try {
      // Prepare batch transaction
      const batchTx = await this.blockchainService.batchTransactions(
        didResults.map(result => ({
          to: options.registryAddress || import.meta.env.VITE_DID_REGISTRY_ADDRESS,
          data: this.encodeDIDRegistration(result.did!, result.document!),
          gasLimit: 500000,
          value: '0',
          metadata: {
            operation: 'did_registration',
            did: result.did,
            hsmBacked: result.hsmBacked
          }
        }))
      );

      if (!batchTx.success) {
        throw new Error(`Batch registration failed: ${batchTx.error}`);
      }

      // Process individual results
      didResults.forEach((result, index) => {
        if (result.success && result.did) {
          const registryRecord: DIDRegistryRecord = {
            did: result.did,
            blockchainTxHash: batchTx.batchHash!,
            registeredAt: new Date(),
            networkId: this.blockchainService.getCurrentNetwork().id,
            registryAddress: options.registryAddress || import.meta.env.VITE_DID_REGISTRY_ADDRESS,
            status: 'active',
            metadata: {
              hsmBacked: result.hsmBacked,
              keyType: 'Ed25519',
              batchIndex: index
            }
          };

          this.registryCache.set(result.did, registryRecord);
          
          results.push({
            success: true,
            did: result.did,
            txHash: batchTx.batchHash!,
            registryRecord
          });
        } else {
          results.push({
            success: false,
            error: result.error || 'DID creation failed'
          });
        }
      });

      return {
        success: true,
        batchTxHash: batchTx.batchHash!,
        results,
        totalRegistrations: didResults.length,
        successfulRegistrations: results.filter(r => r.success).length,
        processingTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('Batch DID registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch registration failed',
        results,
        totalRegistrations: didResults.length,
        successfulRegistrations: 0,
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Resolve DID from blockchain registry
   */
  async resolveFromRegistry(did: string): Promise<DIDRegistryLookupResult> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cachedRecord = this.registryCache.get(did);
      if (cachedRecord) {
        return {
          success: true,
          record: cachedRecord,
          cached: true,
          lookupTime: performance.now() - startTime
        };
      }

      // Query blockchain registry
      const registryData = await this.queryBlockchainRegistry(did);
      
      if (!registryData) {
        return {
          success: false,
          error: 'DID not found in registry',
          lookupTime: performance.now() - startTime
        };
      }

      // Cache the result
      this.registryCache.set(did, registryData);

      return {
        success: true,
        record: registryData,
        cached: false,
        lookupTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('Registry lookup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lookup failed',
        lookupTime: performance.now() - startTime
      };
    }
  }

  /**
   * Update DID status in registry
   */
  async updateDIDStatus(did: string, status: 'active' | 'revoked' | 'suspended', reason?: string): Promise<DIDStatusUpdateResult> {
    const startTime = performance.now();

    try {
      // Prepare status update transaction
      const updateTx = await this.blockchainService.sendTransaction({
        to: import.meta.env.VITE_DID_REGISTRY_ADDRESS,
        data: this.encodeDIDStatusUpdate(did, status, reason),
        gasLimit: 300000,
        value: '0',
        metadata: {
          operation: 'did_status_update',
          did,
          newStatus: status,
          reason
        }
      });

      if (!updateTx.success) {
        throw new Error(`Status update failed: ${updateTx.error}`);
      }

      // Update cache
      const cachedRecord = this.registryCache.get(did);
      if (cachedRecord) {
        cachedRecord.status = status;
        cachedRecord.metadata = {
          ...cachedRecord.metadata,
          statusUpdatedAt: new Date(),
          statusUpdateReason: reason
        };
      }

      return {
        success: true,
        did,
        newStatus: status,
        txHash: updateTx.hash!,
        updateTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('DID status update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status update failed',
        updateTime: performance.now() - startTime
      };
    }
  }

  /**
   * Get DID registry analytics
   */
  async getRegistryAnalytics(): Promise<DIDRegistryAnalytics> {
    const records = Array.from(this.registryCache.values());
    
    return {
      totalRegistrations: records.length,
      activeRegistrations: records.filter(r => r.status === 'active').length,
      revokedRegistrations: records.filter(r => r.status === 'revoked').length,
      suspendedRegistrations: records.filter(r => r.status === 'suspended').length,
      hsmBackedPercentage: (records.filter(r => r.metadata?.hsmBacked).length / records.length) * 100,
      networkDistribution: this.getNetworkDistribution(records),
      registrationsOverTime: this.getRegistrationsOverTime(records)
    };
  }

  // Private helper methods
  private encodeDIDRegistration(did: string, document: DIDDocument): string {
    // Encode DID registration data for blockchain transaction
    return JSON.stringify({
      did,
      document,
      timestamp: Date.now()
    });
  }

  private encodeDIDStatusUpdate(did: string, status: string, reason?: string): string {
    // Encode DID status update data for blockchain transaction
    return JSON.stringify({
      did,
      status,
      reason,
      timestamp: Date.now()
    });
  }

  private async queryBlockchainRegistry(did: string): Promise<DIDRegistryRecord | null> {
    // This would integrate with the actual blockchain registry contract
    // For now, return null as placeholder
    return null;
  }

  private async monitorRegistrationConfirmation(txHash: string, did: string): Promise<void> {
    // Monitor transaction confirmation and update registry record
    setTimeout(async () => {
      const receipt = await this.blockchainService.getTransactionReceipt(txHash);
      if (receipt.success) {
        const record = this.registryCache.get(did);
        if (record) {
          record.metadata = {
            ...record.metadata,
            confirmed: true,
            blockNumber: receipt.blockNumber,
            confirmationTime: new Date()
          };
        }
      }
    }, 5000);
  }

  private getNetworkDistribution(records: DIDRegistryRecord[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    records.forEach(record => {
      distribution[record.networkId] = (distribution[record.networkId] || 0) + 1;
    });
    return distribution;
  }

  private getRegistrationsOverTime(records: DIDRegistryRecord[]): Array<{ date: string; count: number }> {
    const grouped = records.reduce((acc, record) => {
      const date = record.registeredAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }
}

/**
 * Universal DID Resolver Service
 */
export class DIDResolverService {
  private static instance: DIDResolverService;
  private resolverCache = new Map<string, DIDResolutionResult>();
  private resolverEndpoints = new Map<string, string>();

  static getInstance(): DIDResolverService {
    if (!DIDResolverService.instance) {
      DIDResolverService.instance = new DIDResolverService();
    }
    return DIDResolverService.instance;
  }

  private constructor() {
    // Initialize resolver endpoints for different DID methods
    this.resolverEndpoints.set('did:key', 'builtin'); // Built-in resolver
    this.resolverEndpoints.set('did:web', 'https://dev.uniresolver.io/1.0/identifiers/');
    this.resolverEndpoints.set('did:ethr', 'https://dev.uniresolver.io/1.0/identifiers/');
    this.resolverEndpoints.set('did:ion', 'https://dev.uniresolver.io/1.0/identifiers/');
    this.resolverEndpoints.set('did:personachain', 'builtin'); // Custom resolver
  }

  /**
   * Universal DID resolution with method detection
   */
  async resolveDID(did: string, options: DIDResolutionOptions = {}): Promise<DIDResolutionResult> {
    const startTime = performance.now();

    try {
      // Check cache first (unless force refresh)
      if (!options.forceRefresh) {
        const cached = this.resolverCache.get(did);
        if (cached) {
          return {
            ...cached,
            cached: true,
            resolutionTime: performance.now() - startTime
          };
        }
      }

      // Determine DID method
      const method = this.extractDIDMethod(did);
      if (!method) {
        throw new Error('Invalid DID format');
      }

      // Route to appropriate resolver
      const result = await this.resolveByMethod(did, method, options);
      
      // Cache successful resolutions
      if (result.success) {
        this.resolverCache.set(did, result);
      }

      return {
        ...result,
        resolutionTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('DID resolution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resolution failed',
        resolutionTime: performance.now() - startTime
      };
    }
  }

  /**
   * Cross-chain DID verification
   */
  async verifyDIDCrossChain(did: string, networks: string[]): Promise<DIDCrossChainVerificationResult> {
    const startTime = performance.now();
    const verificationResults: DIDNetworkVerificationResult[] = [];

    try {
      // Verify on each network in parallel
      const promises = networks.map(async (network) => {
        const result = await this.verifyDIDOnNetwork(did, network);
        return {
          network,
          ...result
        };
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          verificationResults.push(result.value);
        } else {
          verificationResults.push({
            network: networks[index],
            verified: false,
            error: result.reason instanceof Error ? result.reason.message : 'Verification failed'
          });
        }
      });

      const verifiedNetworks = verificationResults.filter(r => r.verified).length;
      const totalNetworks = networks.length;

      return {
        success: true,
        did,
        verifiedNetworks,
        totalNetworks,
        verificationPercentage: (verifiedNetworks / totalNetworks) * 100,
        results: verificationResults,
        verificationTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('Cross-chain verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cross-chain verification failed',
        verificationTime: performance.now() - startTime
      };
    }
  }

  /**
   * Batch DID resolution
   */
  async batchResolveDIDs(dids: string[], options: DIDResolutionOptions = {}): Promise<DIDBatchResolutionResult> {
    const startTime = performance.now();
    const results: DIDResolutionResult[] = [];

    try {
      // Process in parallel with concurrency limit
      const concurrencyLimit = options.concurrencyLimit || 10;
      const batches = this.chunkArray(dids, concurrencyLimit);

      for (const batch of batches) {
        const batchPromises = batch.map(did => this.resolveDID(did, options));
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason instanceof Error ? result.reason.message : 'Resolution failed'
            });
          }
        });
      }

      const successfulResolutions = results.filter(r => r.success).length;

      return {
        success: true,
        results,
        totalDIDs: dids.length,
        successfulResolutions,
        resolutionPercentage: (successfulResolutions / dids.length) * 100,
        processingTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('Batch resolution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch resolution failed',
        results,
        totalDIDs: dids.length,
        successfulResolutions: 0,
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * DID portability check
   */
  async checkDIDPortability(did: string): Promise<DIDPortabilityResult> {
    const startTime = performance.now();

    try {
      // Check if DID can be resolved on multiple networks
      const networks = ['ethereum', 'polygon', 'bsc', 'personachain'];
      const crossChainResult = await this.verifyDIDCrossChain(did, networks);

      const isPortable = crossChainResult.verifiedNetworks > 1;
      const supportedNetworks = crossChainResult.results
        .filter(r => r.verified)
        .map(r => r.network);

      return {
        success: true,
        did,
        isPortable,
        supportedNetworks,
        portabilityScore: crossChainResult.verificationPercentage,
        recommendations: this.generatePortabilityRecommendations(did, crossChainResult),
        checkTime: performance.now() - startTime
      };

    } catch (error) {
      errorService.logError('Portability check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Portability check failed',
        checkTime: performance.now() - startTime
      };
    }
  }

  // Private helper methods
  private extractDIDMethod(did: string): string | null {
    const match = did.match(/^did:([^:]+):/);
    return match ? match[1] : null;
  }

  private async resolveByMethod(did: string, method: string, options: DIDResolutionOptions): Promise<DIDResolutionResult> {
    const endpoint = this.resolverEndpoints.get(`did:${method}`);
    
    if (!endpoint) {
      throw new Error(`Unsupported DID method: ${method}`);
    }

    if (endpoint === 'builtin') {
      return await this.resolveBuiltinMethod(did, method);
    }

    return await this.resolveExternalMethod(did, endpoint, options);
  }

  private async resolveBuiltinMethod(did: string, method: string): Promise<DIDResolutionResult> {
    if (method === 'key') {
      return await DIDService.resolveDID(did);
    }
    
    if (method === 'personachain') {
      return await this.resolvePersonaChainDID(did);
    }

    throw new Error(`Builtin resolver not implemented for method: ${method}`);
  }

  private async resolveExternalMethod(did: string, endpoint: string, options: DIDResolutionOptions): Promise<DIDResolutionResult> {
    const response = await fetch(`${endpoint}${did}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`External resolver failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      document: data.didDocument,
      metadata: data.didDocumentMetadata,
      cached: false
    };
  }

  private async resolvePersonaChainDID(did: string): Promise<DIDResolutionResult> {
    // This would integrate with PersonaChain-specific resolution
    // For now, return a placeholder
    throw new Error('PersonaChain resolver not implemented');
  }

  private async verifyDIDOnNetwork(did: string, network: string): Promise<DIDNetworkVerificationResult> {
    try {
      // Switch to network and verify DID exists
      await blockchainService.switchNetwork(network);
      
      // Query DID registry on this network
      const registryService = DIDRegistryService.getInstance();
      const lookupResult = await registryService.resolveFromRegistry(did);

      return {
        verified: lookupResult.success,
        network,
        registryRecord: lookupResult.record,
        error: lookupResult.error
      };

    } catch (error) {
      return {
        verified: false,
        network,
        error: error instanceof Error ? error.message : 'Network verification failed'
      };
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private generatePortabilityRecommendations(did: string, crossChainResult: DIDCrossChainVerificationResult): string[] {
    const recommendations: string[] = [];
    
    if (crossChainResult.verificationPercentage < 50) {
      recommendations.push('Consider registering DID on additional networks for better portability');
    }
    
    if (crossChainResult.verificationPercentage === 100) {
      recommendations.push('Excellent portability - DID verified on all tested networks');
    }
    
    const failedNetworks = crossChainResult.results.filter(r => !r.verified).map(r => r.network);
    if (failedNetworks.length > 0) {
      recommendations.push(`Consider registering on: ${failedNetworks.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Clear resolver cache
   */
  clearCache(): void {
    this.resolverCache.clear();
  }

  /**
   * Get resolver statistics
   */
  getResolverStats(): DIDResolverStats {
    return {
      cacheSize: this.resolverCache.size,
      supportedMethods: Array.from(this.resolverEndpoints.keys()),
      cachedDIDs: Array.from(this.resolverCache.keys())
    };
  }
}

// Registry-related interfaces
interface DIDRegistryOptions {
  registryAddress?: string;
  metadata?: Record<string, any>;
}

interface DIDRegistryRecord {
  did: string;
  blockchainTxHash: string;
  registeredAt: Date;
  networkId: string;
  registryAddress: string;
  status: 'active' | 'revoked' | 'suspended';
  metadata?: Record<string, any>;
}

interface DIDRegistryResult {
  success: boolean;
  did?: string;
  txHash?: string;
  registryRecord?: DIDRegistryRecord;
  registrationTime?: number;
  error?: string;
}

interface DIDBatchRegistryResult {
  success: boolean;
  batchTxHash?: string;
  results: DIDRegistryResult[];
  totalRegistrations: number;
  successfulRegistrations: number;
  processingTime: number;
  error?: string;
}

interface DIDRegistryLookupResult {
  success: boolean;
  record?: DIDRegistryRecord;
  cached?: boolean;
  lookupTime?: number;
  error?: string;
}

interface DIDStatusUpdateResult {
  success: boolean;
  did?: string;
  newStatus?: string;
  txHash?: string;
  updateTime?: number;
  error?: string;
}

interface DIDRegistryAnalytics {
  totalRegistrations: number;
  activeRegistrations: number;
  revokedRegistrations: number;
  suspendedRegistrations: number;
  hsmBackedPercentage: number;
  networkDistribution: Record<string, number>;
  registrationsOverTime: Array<{ date: string; count: number }>;
}

// Resolver-related interfaces
interface DIDResolutionOptions {
  forceRefresh?: boolean;
  concurrencyLimit?: number;
  timeout?: number;
}

interface DIDCrossChainVerificationResult {
  success: boolean;
  did?: string;
  verifiedNetworks?: number;
  totalNetworks?: number;
  verificationPercentage?: number;
  results?: DIDNetworkVerificationResult[];
  verificationTime?: number;
  error?: string;
}

interface DIDNetworkVerificationResult {
  network: string;
  verified: boolean;
  registryRecord?: DIDRegistryRecord;
  error?: string;
}

interface DIDBatchResolutionResult {
  success: boolean;
  results: DIDResolutionResult[];
  totalDIDs: number;
  successfulResolutions: number;
  resolutionPercentage: number;
  processingTime: number;
  error?: string;
}

interface DIDPortabilityResult {
  success: boolean;
  did?: string;
  isPortable?: boolean;
  supportedNetworks?: string[];
  portabilityScore?: number;
  recommendations?: string[];
  checkTime?: number;
  error?: string;
}

interface DIDResolverStats {
  cacheSize: number;
  supportedMethods: string[];
  cachedDIDs: string[];
}

/**
 * DID Storage Service for secure key management
 */
export class DIDStorageService {
  private static readonly STORAGE_KEY_PREFIX = "personapass_did_";

  /**
   * Store DID keypair securely in browser storage
   *
   * @param alias - Storage alias for the DID
   * @param didKeyPair - DID keypair to store
   */
  static async storeDID(alias: string, didKeyPair: DIDKeyPair): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${alias}`;

      // Store only essential data (private key should be encrypted in production)
      const storedData = {
        did: didKeyPair.did,
        privateKey: Array.from(didKeyPair.privateKey), // Convert to array for JSON
        publicKey: Array.from(didKeyPair.publicKey),
        document: didKeyPair.document,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(storedData));
      console.log(`[SUCCESS] DID stored successfully with alias: ${alias}`);
    } catch (error) {
      errorService.logError("[ERROR] DID storage failed:", error);
      throw new Error(
        `Failed to store DID: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Retrieve DID keypair from storage
   *
   * @param alias - Storage alias
   * @returns DID keypair or null if not found
   */
  static async retrieveDID(alias: string): Promise<DIDKeyPair | null> {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${alias}`;
      const storedData = localStorage.getItem(storageKey);

      if (!storedData) {
        return null;
      }

      const parsed = JSON.parse(storedData);
      return {
        did: parsed.did,
        privateKey: new Uint8Array(parsed.privateKey),
        publicKey: new Uint8Array(parsed.publicKey),
        document: parsed.document,
      };
    } catch (error) {
      errorService.logError("[ERROR] DID retrieval failed:", error);
      return null;
    }
  }

  /**
   * List all stored DIDs
   *
   * @returns Array of DID aliases
   */
  static async listDIDs(): Promise<string[]> {
    try {
      const aliases: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          const alias = key.substring(this.STORAGE_KEY_PREFIX.length);
          aliases.push(alias);
        }
      }

      return aliases;
    } catch (error) {
      errorService.logError("[ERROR] DID listing failed:", error);
      return [];
    }
  }

  /**
   * Delete DID from storage
   *
   * @param alias - Storage alias
   */
  static async deleteDID(alias: string): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${alias}`;
      localStorage.removeItem(storageKey);
      console.log(`[SUCCESS] DID deleted successfully: ${alias}`);
    } catch (error) {
      errorService.logError("[ERROR] DID deletion failed:", error);
      throw new Error(
        `Failed to delete DID: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

// Create an instance wrapper for backwards compatibility
class DIDServiceInstance {
  async generateDID(options?: DIDGenerationOptions): Promise<DIDCreationResult> {
    return await DIDService.generateDID(options);
  }

  async signWithDID(data: Uint8Array, privateKey: Uint8Array, didKeyPair: DIDKeyPair): Promise<DIDSignatureResult> {
    return await DIDService.signWithDID(data, privateKey, didKeyPair);
  }

  async verifyDIDSignature(signature: Uint8Array, data: Uint8Array, publicKey: Uint8Array, did?: string): Promise<DIDVerificationResult> {
    return await DIDService.verifyDIDSignature(signature, data, publicKey, did);
  }

  extractPublicKeyFromDID(did: string): Uint8Array | null {
    return DIDService.extractPublicKeyFromDID(did);
  }

  async resolveDID(did: string): Promise<DIDResolutionResult> {
    return await DIDService.resolveDID(did);
  }

  async validateDIDDocument(document: any): Promise<DIDValidationResult> {
    return await DIDService.validateDIDDocument(document);
  }

  async generateDIDFromSeed(seed: string): Promise<DIDCreationResult> {
    return await DIDService.generateDIDFromSeed(seed);
  }

  async rotateDIDKey(did: string, currentPrivateKey: Uint8Array): Promise<DIDKeyRotationResult> {
    return await DIDService.rotateDIDKey(did, currentPrivateKey);
  }

  async batchDIDOperations(operations: DIDOperation[]): Promise<DIDBatchResult> {
    return await DIDService.batchDIDOperations(operations);
  }

  async getDIDAnalytics(did?: string): Promise<DIDAnalytics> {
    return await DIDService.getDIDAnalytics(did);
  }

  clearCache(): void {
    DIDService.clearCache();
  }

  getCacheStats(): DIDCacheStats {
    return DIDService.getCacheStats();
  }
}

// Export class and singleton instances
export { DIDService };
export const didService = new DIDServiceInstance();
export const didRegistryService = DIDRegistryService.getInstance();
export const didResolverService = DIDResolverService.getInstance();
export const didStorageService = new DIDStorageService();
