/**
 * Mock GCP HSM Service for testing
 * Provides the same interface as the real service for development/testing
 */

import type { DID } from "../types/wallet";

export interface HSMSigningResult {
  signature: Uint8Array;
  keyId: string;
  algorithm: string;
  publicKey: Uint8Array;
}

export interface HSMKeyConfig {
  keyRingId: string;
  didSigningKeyId: string;
  encryptionKeyId: string;
  credentialSigningKeyId: string;
  projectId: string;
  location: string;
}

export class MockGCPHSMService {
  private config: HSMKeyConfig | null = null;

  async initialize(): Promise<void> {
    this.config = {
      keyRingId: "test-keyring",
      didSigningKeyId: "test-did-signing-key",
      encryptionKeyId: "test-encryption-key",
      credentialSigningKeyId: "test-credential-signing-key",
      projectId: "test-project",
      location: "us-central1",
    };
    console.log("Mock GCP HSM Service initialized");
  }

  async signWithDIDKey(
    data: Uint8Array,
    userDID: DID,
  ): Promise<HSMSigningResult> {
    if (!this.config) {
      throw new Error("HSM service not initialized");
    }

    // Mock signing - just return deterministic data
    const mockSignature = new Uint8Array(64);
    mockSignature.fill(1, 0, 32);
    mockSignature.fill(2, 32, 64);

    const mockPublicKey = new Uint8Array(32);
    mockPublicKey.fill(3);

    return {
      signature: mockSignature,
      keyId: this.config.didSigningKeyId,
      algorithm: "ED25519",
      publicKey: mockPublicKey,
    };
  }

  getConfig(): HSMKeyConfig | null {
    return this.config;
  }
}

export const gcpHSMService = new MockGCPHSMService();
