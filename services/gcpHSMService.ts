/**
 * Google Cloud Platform HSM Service
 * Hardware Security Module integration for PersonaPass
 */

import { KeyManagementServiceClient } from '@google-cloud/kms';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import type { DID } from '../types/wallet';

export interface HSMKeyConfig {
  keyRingId: string;
  didSigningKeyId: string;
  encryptionKeyId: string;
  credentialSigningKeyId: string;
  projectId: string;
  location: string;
}

export interface HSMSigningResult {
  signature: Uint8Array;
  keyId: string;
  algorithm: string;
  publicKey: Uint8Array;
}

export interface HSMEncryptionResult {
  ciphertext: Uint8Array;
  keyId: string;
  algorithm: string;
}

export class GCPHSMService {
  private kmsClient: KeyManagementServiceClient;
  private secretClient: SecretManagerServiceClient;
  private config: HSMKeyConfig | null = null;

  constructor() {
    this.kmsClient = new KeyManagementServiceClient();
    this.secretClient = new SecretManagerServiceClient();
  }

  /**
   * Initialize HSM service with configuration
   */
  async initialize(): Promise<void> {
    try {
      // Load HSM configuration from Secret Manager
      const configSecret = await this.secretClient.accessSecretVersion({
        name: 'projects/top-cubist-463420-h6/secrets/personapass-hsm-config/versions/latest'
      });

      if (!configSecret.payload?.data) {
        throw new Error('HSM configuration not found');
      }

      const configData = JSON.parse(configSecret.payload.data.toString());
      this.config = {
        keyRingId: configData.keyring_id,
        didSigningKeyId: configData.keys.did_signing,
        encryptionKeyId: configData.keys.encryption,
        credentialSigningKeyId: configData.keys.credential_signing,
        projectId: configData.project_id || 'top-cubist-463420-h6',
        location: configData.location || 'us-central1'
      };

      console.log('GCP HSM Service initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize HSM service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign data with DID signing key
   */
  async signWithDIDKey(data: Uint8Array, userDID: DID): Promise<HSMSigningResult> {
    if (!this.config) {
      throw new Error('HSM service not initialized');
    }

    try {
      // Get the public key first
      const publicKeyResponse = await this.kmsClient.getPublicKey({
        name: this.config.didSigningKeyId
      });

      if (!publicKeyResponse.pem) {
        throw new Error('Failed to retrieve public key');
      }

      // Sign the data
      const signResponse = await this.kmsClient.asymmetricSign({
        name: this.config.didSigningKeyId,
        digest: {
          sha256: data
        }
      });

      if (!signResponse.signature) {
        throw new Error('Signing operation failed');
      }

      return {
        signature: new Uint8Array(signResponse.signature),
        keyId: this.config.didSigningKeyId,
        algorithm: 'EC_SIGN_P256_SHA256',
        publicKey: new TextEncoder().encode(publicKeyResponse.pem)
      };

    } catch (error) {
      throw new Error(`HSM signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign credential data
   */
  async signCredential(credentialData: any): Promise<HSMSigningResult> {
    if (!this.config) {
      throw new Error('HSM service not initialized');
    }

    try {
      const dataToSign = JSON.stringify(credentialData);
      const dataHash = await this.generateHash(dataToSign);

      const signResponse = await this.kmsClient.asymmetricSign({
        name: this.config.credentialSigningKeyId,
        digest: {
          sha256: dataHash
        }
      });

      if (!signResponse.signature) {
        throw new Error('Credential signing failed');
      }

      const publicKeyResponse = await this.kmsClient.getPublicKey({
        name: this.config.credentialSigningKeyId
      });

      return {
        signature: new Uint8Array(signResponse.signature),
        keyId: this.config.credentialSigningKeyId,
        algorithm: 'EC_SIGN_P256_SHA256',
        publicKey: new TextEncoder().encode(publicKeyResponse.pem || '')
      };

    } catch (error) {
      throw new Error(`Credential signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: Uint8Array): Promise<HSMEncryptionResult> {
    if (!this.config) {
      throw new Error('HSM service not initialized');
    }

    try {
      const encryptResponse = await this.kmsClient.encrypt({
        name: this.config.encryptionKeyId,
        plaintext: data
      });

      if (!encryptResponse.ciphertext) {
        throw new Error('Encryption failed');
      }

      return {
        ciphertext: new Uint8Array(encryptResponse.ciphertext),
        keyId: this.config.encryptionKeyId,
        algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION'
      };

    } catch (error) {
      throw new Error(`HSM encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(ciphertext: Uint8Array): Promise<Uint8Array> {
    if (!this.config) {
      throw new Error('HSM service not initialized');
    }

    try {
      const decryptResponse = await this.kmsClient.decrypt({
        name: this.config.encryptionKeyId,
        ciphertext: ciphertext
      });

      if (!decryptResponse.plaintext) {
        throw new Error('Decryption failed');
      }

      return new Uint8Array(decryptResponse.plaintext);

    } catch (error) {
      throw new Error(`HSM decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate secure hash
   */
  private async generateHash(data: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Verify signature
   */
  async verifySignature(
    data: Uint8Array,
    signature: Uint8Array,
    keyId: string
  ): Promise<boolean> {
    if (!this.config) {
      throw new Error('HSM service not initialized');
    }

    try {
      const publicKeyResponse = await this.kmsClient.getPublicKey({
        name: keyId
      });

      if (!publicKeyResponse.pem) {
        throw new Error('Failed to retrieve public key for verification');
      }

      // Import the public key
      const publicKey = await crypto.subtle.importKey(
        'spki',
        this.pemToArrayBuffer(publicKeyResponse.pem),
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        false,
        ['verify']
      );

      // Verify the signature
      const isValid = await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        publicKey,
        signature,
        data
      );

      return isValid;

    } catch (error) {
      throw new Error(`Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate new key version (rotation)
   */
  async rotateKey(keyId: string): Promise<string> {
    if (!this.config) {
      throw new Error('HSM service not initialized');
    }

    try {
      const newVersion = await this.kmsClient.createCryptoKeyVersion({
        parent: keyId
      });

      return newVersion.name || '';

    } catch (error) {
      throw new Error(`Key rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get HSM health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    keyRingStatus: string;
    lastCheck: string;
    errors: string[];
  }> {
    if (!this.config) {
      return {
        status: 'unhealthy',
        keyRingStatus: 'not_initialized',
        lastCheck: new Date().toISOString(),
        errors: ['HSM service not initialized']
      };
    }

    try {
      // Check key ring status
      const keyRingResponse = await this.kmsClient.getKeyRing({
        name: this.config.keyRingId
      });

      // Test signing operation
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      await this.kmsClient.asymmetricSign({
        name: this.config.didSigningKeyId,
        digest: {
          sha256: testData
        }
      });

      return {
        status: 'healthy',
        keyRingStatus: keyRingResponse.name ? 'active' : 'inactive',
        lastCheck: new Date().toISOString(),
        errors: []
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        keyRingStatus: 'error',
        lastCheck: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Convert PEM to ArrayBuffer
   */
  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const base64 = pem
      .replace(/-----BEGIN.*-----/g, '')
      .replace(/-----END.*-----/g, '')
      .replace(/\s/g, '');
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  /**
   * Get key configuration
   */
  getConfig(): HSMKeyConfig | null {
    return this.config;
  }
}

export const gcpHSMService = new GCPHSMService();