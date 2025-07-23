/**
 * REAL HSM Service Implementation
 * Production-ready Hardware Security Module integration for secure key management
 * NO HARDCODED KEYS - ALL KEYS STORED IN SECURE HARDWARE
 */

import { realConfigService } from './realConfigService';
import { cryptoService } from './cryptoService';
import { realDatabaseService } from './realDatabaseService';
import { errorService } from "@/services/errorService";

interface HSMConfig {
  endpoint: string;
  keyId: string;
  accessKey: string;
  region?: string;
  timeout: number;
  retryAttempts: number;
}

interface HSMKey {
  keyId: string;
  alias: string;
  keyType: 'SIGNING' | 'ENCRYPTION' | 'HMAC';
  keyUsage: string[];
  created: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
}

interface HSMSigningRequest {
  keyId: string;
  data: string;
  algorithm: 'ECDSA_SHA_256' | 'RSA_PKCS1_SHA_256' | 'ED25519';
  messageType: 'RAW' | 'DIGEST';
}

interface HSMSigningResponse {
  signature: string;
  keyId: string;
  algorithm: string;
  timestamp: number;
}

interface HSMEncryptionRequest {
  keyId: string;
  plaintext: string;
  algorithm: 'AES_256_GCM' | 'RSA_OAEP_SHA_256';
  additionalData?: string;
}

interface HSMEncryptionResponse {
  ciphertext: string;
  keyId: string;
  algorithm: string;
  iv?: string;
  tag?: string;
  timestamp: number;
}

interface HSMKeyGeneration {
  keyType: 'SIGNING' | 'ENCRYPTION' | 'HMAC';
  keySpec: 'ECC_NIST_P256' | 'RSA_2048' | 'RSA_4096' | 'ED25519';
  keyUsage: string[];
  alias: string;
  description?: string;
}

export class RealHSMService {
  private static instance: RealHSMService;
  private config: HSMConfig;
  private isInitialized = false;
  private keyCache = new Map<string, HSMKey>();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.config = {
      endpoint: '',
      keyId: '',
      accessKey: '',
      timeout: 30000,
      retryAttempts: 3
    };
  }

  static getInstance(): RealHSMService {
    if (!RealHSMService.instance) {
      RealHSMService.instance = new RealHSMService();
    }
    return RealHSMService.instance;
  }

  /**
   * Initialize HSM service with configuration
   */
  async initialize(): Promise<void> {
    try {
      const appConfig = realConfigService.getConfig();
      
      if (!appConfig.security.hsm.enabled) {
        throw new Error('HSM is not enabled in configuration');
      }

      if (!appConfig.security.hsm.endpoint || !appConfig.security.hsm.keyId || !appConfig.security.hsm.accessKey) {
        throw new Error('HSM configuration is incomplete');
      }

      this.config = {
        endpoint: appConfig.security.hsm.endpoint,
        keyId: appConfig.security.hsm.keyId,
        accessKey: appConfig.security.hsm.accessKey,
        region: appConfig.cloud.aws.region,
        timeout: 30000,
        retryAttempts: 3
      };

      // Test connection to HSM
      await this.testConnection();

      this.isInitialized = true;
      console.log('✅ Real HSM Service initialized');
    } catch (error) {
      errorService.logError('❌ Failed to initialize HSM Service:', error);
      throw error;
    }
  }

  /**
   * Test HSM connection
   */
  private async testConnection(): Promise<void> {
    try {
      // Test connection by listing keys
      await this.listKeys();
      console.log('🔗 HSM connection test successful');
    } catch (error) {
      throw new Error(`HSM connection test failed: ${error}`);
    }
  }

  /**
   * Generate a new key in HSM
   */
  async generateKey(keyGeneration: HSMKeyGeneration): Promise<HSMKey> {
    this.ensureInitialized();

    try {
      const requestBody = {
        KeyUsage: keyGeneration.keyUsage,
        KeySpec: keyGeneration.keySpec,
        Origin: 'AWS_HSM',
        Description: keyGeneration.description || `PersonaPass ${keyGeneration.keyType} key`,
        Tags: [
          {
            TagKey: 'Application',
            TagValue: 'PersonaPass'
          },
          {
            TagKey: 'Environment',
            TagValue: realConfigService.getConfig().app.environment
          },
          {
            TagKey: 'KeyType',
            TagValue: keyGeneration.keyType
          }
        ]
      };

      const response = await this.makeHSMRequest('/keys', 'POST', requestBody);
      
      const hsmKey: HSMKey = {
        keyId: response.KeyId,
        alias: keyGeneration.alias,
        keyType: keyGeneration.keyType,
        keyUsage: keyGeneration.keyUsage,
        created: new Date(),
        status: 'ACTIVE'
      };

      // Create alias for the key
      await this.createAlias(keyGeneration.alias, hsmKey.keyId);

      // Cache the key
      this.keyCache.set(hsmKey.keyId, hsmKey);

      console.log(`🔑 Generated HSM key: ${hsmKey.keyId} (${keyGeneration.alias})`);
      return hsmKey;

    } catch (error) {
      errorService.logError('❌ Failed to generate HSM key:', error);
      throw error;
    }
  }

  /**
   * Sign data using HSM
   */
  async signData(request: HSMSigningRequest): Promise<HSMSigningResponse> {
    this.ensureInitialized();

    try {
      const requestBody = {
        KeyId: request.keyId,
        Message: request.data,
        MessageType: request.messageType,
        SigningAlgorithm: request.algorithm
      };

      const response = await this.makeHSMRequest('/sign', 'POST', requestBody);

      const signingResponse: HSMSigningResponse = {
        signature: response.Signature,
        keyId: request.keyId,
        algorithm: request.algorithm,
        timestamp: Date.now()
      };

      console.log(`✍️ Data signed with HSM key: ${request.keyId}`);
      return signingResponse;

    } catch (error) {
      errorService.logError('❌ Failed to sign data with HSM:', error);
      throw error;
    }
  }

  /**
   * Verify signature using HSM
   */
  async verifySignature(keyId: string, data: string, signature: string, algorithm: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const requestBody = {
        KeyId: keyId,
        Message: data,
        MessageType: 'RAW',
        Signature: signature,
        SigningAlgorithm: algorithm
      };

      const response = await this.makeHSMRequest('/verify', 'POST', requestBody);
      
      console.log(`🔍 Signature verified with HSM key: ${keyId}`);
      return response.SignatureValid === true;

    } catch (error) {
      errorService.logError('❌ Failed to verify signature with HSM:', error);
      return false;
    }
  }

  /**
   * Encrypt data using HSM
   */
  async encryptData(request: HSMEncryptionRequest): Promise<HSMEncryptionResponse> {
    this.ensureInitialized();

    try {
      const requestBody = {
        KeyId: request.keyId,
        Plaintext: request.plaintext,
        EncryptionAlgorithm: request.algorithm,
        EncryptionContext: request.additionalData ? { data: request.additionalData } : undefined
      };

      const response = await this.makeHSMRequest('/encrypt', 'POST', requestBody);

      const encryptionResponse: HSMEncryptionResponse = {
        ciphertext: response.CiphertextBlob,
        keyId: request.keyId,
        algorithm: request.algorithm,
        iv: response.IV,
        tag: response.AuthenticationTag,
        timestamp: Date.now()
      };

      console.log(`🔐 Data encrypted with HSM key: ${request.keyId}`);
      return encryptionResponse;

    } catch (error) {
      errorService.logError('❌ Failed to encrypt data with HSM:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using HSM
   */
  async decryptData(keyId: string, ciphertext: string, algorithm: string, iv?: string, tag?: string): Promise<string> {
    this.ensureInitialized();

    try {
      const requestBody = {
        KeyId: keyId,
        CiphertextBlob: ciphertext,
        EncryptionAlgorithm: algorithm,
        IV: iv,
        AuthenticationTag: tag
      };

      const response = await this.makeHSMRequest('/decrypt', 'POST', requestBody);

      console.log(`🔓 Data decrypted with HSM key: ${keyId}`);
      return response.Plaintext;

    } catch (error) {
      errorService.logError('❌ Failed to decrypt data with HSM:', error);
      throw error;
    }
  }

  /**
   * Generate DID keypair using HSM
   */
  async generateDIDKeyPair(alias: string): Promise<{
    keyId: string;
    publicKey: string;
    did: string;
  }> {
    this.ensureInitialized();

    try {
      // Generate signing key in HSM
      const hsmKey = await this.generateKey({
        keyType: 'SIGNING',
        keySpec: 'ECC_NIST_P256',
        keyUsage: ['SIGN_VERIFY'],
        alias: `did-key-${alias}`,
        description: `DID keypair for ${alias}`
      });

      // Get public key from HSM
      const publicKey = await this.getPublicKey(hsmKey.keyId);

      // Generate DID from public key
      const did = `did:persona:${await cryptoService.hash(publicKey)}`;

      // Store DID-key mapping in database
      await realDatabaseService.storeOperation(
        `did-key-${Date.now()}`,
        'did_operation',
        {
          did,
          keyId: hsmKey.keyId,
          publicKey,
          alias,
          created: Date.now()
        },
        'hsm'
      );

      console.log(`🆔 Generated DID with HSM key: ${did}`);
      return {
        keyId: hsmKey.keyId,
        publicKey,
        did
      };

    } catch (error) {
      errorService.logError('❌ Failed to generate DID keypair with HSM:', error);
      throw error;
    }
  }

  /**
   * Sign DID document using HSM
   */
  async signDIDDocument(keyId: string, document: any): Promise<{
    signature: string;
    proof: any;
  }> {
    this.ensureInitialized();

    try {
      const documentString = JSON.stringify(document, null, 0);
      const documentHash = await cryptoService.hash(documentString);

      const signingResponse = await this.signData({
        keyId,
        data: documentHash,
        algorithm: 'ECDSA_SHA_256',
        messageType: 'DIGEST'
      });

      const proof = {
        type: 'EcdsaSecp256k1Signature2019',
        created: new Date().toISOString(),
        verificationMethod: `${document.id}#${keyId}`,
        proofPurpose: 'assertionMethod',
        proofValue: signingResponse.signature
      };

      console.log(`📝 DID document signed with HSM key: ${keyId}`);
      return {
        signature: signingResponse.signature,
        proof
      };

    } catch (error) {
      errorService.logError('❌ Failed to sign DID document with HSM:', error);
      throw error;
    }
  }

  /**
   * Get public key from HSM
   */
  async getPublicKey(keyId: string): Promise<string> {
    this.ensureInitialized();

    try {
      const response = await this.makeHSMRequest(`/keys/${keyId}/public`, 'GET');
      return response.PublicKey;
    } catch (error) {
      errorService.logError('❌ Failed to get public key from HSM:', error);
      throw error;
    }
  }

  /**
   * List all keys in HSM
   */
  async listKeys(): Promise<HSMKey[]> {
    this.ensureInitialized();

    try {
      const response = await this.makeHSMRequest('/keys', 'GET');
      
      const keys: HSMKey[] = response.Keys.map((key: any) => ({
        keyId: key.KeyId,
        alias: key.Alias || key.KeyId,
        keyType: this.mapKeyUsageToType(key.KeyUsage),
        keyUsage: key.KeyUsage,
        created: new Date(key.CreationDate),
        status: key.KeyState === 'Enabled' ? 'ACTIVE' : 'INACTIVE'
      }));

      // Update cache
      keys.forEach(key => {
        this.keyCache.set(key.keyId, key);
      });

      return keys;

    } catch (error) {
      errorService.logError('❌ Failed to list HSM keys:', error);
      throw error;
    }
  }

  /**
   * Delete key from HSM
   */
  async deleteKey(keyId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      await this.makeHSMRequest(`/keys/${keyId}`, 'DELETE');
      
      // Remove from cache
      this.keyCache.delete(keyId);
      
      console.log(`🗑️ Deleted HSM key: ${keyId}`);
      return true;

    } catch (error) {
      errorService.logError('❌ Failed to delete HSM key:', error);
      return false;
    }
  }

  /**
   * Create alias for key
   */
  private async createAlias(alias: string, keyId: string): Promise<void> {
    try {
      const requestBody = {
        AliasName: `alias/${alias}`,
        TargetKeyId: keyId
      };

      await this.makeHSMRequest('/aliases', 'POST', requestBody);
      console.log(`🏷️ Created alias: ${alias} -> ${keyId}`);
    } catch (error) {
      errorService.logError('❌ Failed to create alias:', error);
      throw error;
    }
  }

  /**
   * Make authenticated request to HSM
   */
  private async makeHSMRequest(path: string, method: string, body?: any): Promise<any> {
    const url = `${this.config.endpoint}${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.accessKey}`,
      'X-PersonaPass-Key-ID': this.config.keyId
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout)
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HSM request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          console.warn(`⚠️ HSM request attempt ${attempt} failed, retrying in ${delay}ms...`);
        }
      }
    }

    throw lastError;
  }

  /**
   * Map key usage to key type
   */
  private mapKeyUsageToType(keyUsage: string[]): 'SIGNING' | 'ENCRYPTION' | 'HMAC' {
    if (keyUsage.includes('SIGN_VERIFY')) return 'SIGNING';
    if (keyUsage.includes('ENCRYPT_DECRYPT')) return 'ENCRYPTION';
    if (keyUsage.includes('GENERATE_VERIFY_MAC')) return 'HMAC';
    return 'SIGNING'; // Default
  }

  /**
   * Check if service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('HSM Service not initialized');
    }
  }

  /**
   * Get HSM service statistics
   */
  getStatistics(): {
    totalKeys: number;
    cacheSize: number;
    isConnected: boolean;
    lastHealthCheck: number;
  } {
    return {
      totalKeys: this.keyCache.size,
      cacheSize: this.keyCache.size,
      isConnected: this.isInitialized,
      lastHealthCheck: Date.now()
    };
  }

  /**
   * Clear key cache
   */
  clearCache(): void {
    this.keyCache.clear();
    console.log('🧹 HSM key cache cleared');
  }
}

// Export singleton instance
export const realHSMService = RealHSMService.getInstance();