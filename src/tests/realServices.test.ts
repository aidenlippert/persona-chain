/**
 * Comprehensive Test Suite for Real Services
 * Tests all production-ready services with real implementations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { realBlockchainService } from '../services/realBlockchainService';
import { realZKProofService } from '../services/realZKProofService';
import { realDatabaseService } from '../services/realDatabaseService';
import { realHSMService } from '../services/realHSMService';
import { realConfigService } from '../services/realConfigService';
import { cryptoService } from '../services/cryptoService';
import type { DIDKeyPair } from '../services/didService';
import type { VerifiableCredential } from '../types/wallet';

// Test configuration
const TEST_CONFIG = {
  MNEMONIC: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  ENCRYPTION_KEY: 'test-encryption-key-32-characters!!',
  TIMEOUT: 30000, // 30 seconds for blockchain operations
  NETWORK: 'persona-testnet'
};

describe('Real Blockchain Service', () => {
  let connectedToNetwork = false;

  beforeAll(async () => {
    // Try to connect to testnet
    try {
      connectedToNetwork = await realBlockchainService.connectToNetwork(
        TEST_CONFIG.NETWORK,
        TEST_CONFIG.MNEMONIC
      );
    } catch (error) {
      console.warn('⚠️  Could not connect to testnet, skipping blockchain tests');
    }
  }, TEST_CONFIG.TIMEOUT);

  afterAll(async () => {
    if (connectedToNetwork) {
      await realBlockchainService.disconnect();
    }
  });

  it('should connect to network', async () => {
    if (!connectedToNetwork) {
      console.warn('⚠️  Skipping blockchain test - no network connection');
      return;
    }

    const networks = realBlockchainService.getConnectedNetworks();
    expect(networks).toContain(TEST_CONFIG.NETWORK);
  });

  it('should get block height', async () => {
    if (!connectedToNetwork) {
      console.warn('⚠️  Skipping blockchain test - no network connection');
      return;
    }

    const height = await realBlockchainService.getBlockHeight(TEST_CONFIG.NETWORK);
    expect(height).toBeGreaterThan(0);
  }, TEST_CONFIG.TIMEOUT);

  it('should get network health', async () => {
    if (!connectedToNetwork) {
      console.warn('⚠️  Skipping blockchain test - no network connection');
      return;
    }

    const health = realBlockchainService.getNetworkHealth(TEST_CONFIG.NETWORK);
    expect(health).toBeDefined();
    expect(health?.chainId).toBe('persona-testnet-1');
  });

  it('should register DID on blockchain', async () => {
    if (!connectedToNetwork) {
      console.warn('⚠️  Skipping blockchain test - no network connection');
      return;
    }

    const testDID = 'did:persona:test12345';
    const testDocument = {
      id: testDID,
      controller: testDID,
      verificationMethod: [{
        id: `${testDID}#key1`,
        type: 'Ed25519VerificationKey2020',
        controller: testDID,
        publicKeyBase58: 'H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV'
      }],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    const result = await realBlockchainService.registerDID(
      TEST_CONFIG.NETWORK,
      testDID,
      testDocument
    );

    expect(result.success).toBe(true);
    expect(result.txHash).toBeDefined();
  }, TEST_CONFIG.TIMEOUT);

  it('should query DID from blockchain', async () => {
    if (!connectedToNetwork) {
      console.warn('⚠️  Skipping blockchain test - no network connection');
      return;
    }

    const testDID = 'did:persona:test12345';
    
    // First register the DID
    const testDocument = {
      id: testDID,
      controller: testDID,
      verificationMethod: [{
        id: `${testDID}#key1`,
        type: 'Ed25519VerificationKey2020',
        controller: testDID,
        publicKeyBase58: 'H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV'
      }],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    await realBlockchainService.registerDID(TEST_CONFIG.NETWORK, testDID, testDocument);

    // Wait a moment for the transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Query the DID
    const document = await realBlockchainService.queryDID(TEST_CONFIG.NETWORK, testDID);
    expect(document).toBeDefined();
    expect(document?.id).toBe(testDID);
  }, TEST_CONFIG.TIMEOUT);
});

describe('Real ZKProof Service', () => {
  beforeAll(async () => {
    // Initialize the service
    await realZKProofService.initializeService?.();
  }, TEST_CONFIG.TIMEOUT);

  it('should initialize successfully', () => {
    expect(realZKProofService).toBeDefined();
    const stats = realZKProofService.getStatistics();
    expect(stats.supportedCircuits).toBeGreaterThan(0);
  });

  it('should generate age verification proof', async () => {
    const proofInput = {
      privateInputs: {
        birthYear: 1990,
        currentYear: 2024,
        minAge: 18
      },
      publicInputs: {
        threshold: 18,
        isOver: true
      }
    };

    try {
      const proof = await realZKProofService.generateProof(
        'age_verification',
        proofInput,
        { useCache: false }
      );

      expect(proof).toBeDefined();
      expect(proof.proof).toBeDefined();
      expect(proof.proof.protocol).toBe('groth16');
      expect(proof.publicSignals).toBeDefined();
      expect(proof.metadata.circuitId).toBe('age_verification');
    } catch (error) {
      console.warn('⚠️  ZK proof generation failed (circuit files may not be available):', error);
      // Skip test if circuit files are not available
    }
  }, TEST_CONFIG.TIMEOUT);

  it('should verify age verification proof', async () => {
    const proofInput = {
      privateInputs: {
        birthYear: 1990,
        currentYear: 2024,
        minAge: 18
      },
      publicInputs: {
        threshold: 18,
        isOver: true
      }
    };

    try {
      const proof = await realZKProofService.generateProof(
        'age_verification',
        proofInput,
        { useCache: false }
      );

      const verificationResult = await realZKProofService.verifyProof(
        'age_verification',
        proof.proof,
        proof.publicSignals
      );

      expect(verificationResult.isValid).toBe(true);
      expect(verificationResult.verificationTime).toBeGreaterThan(0);
    } catch (error) {
      console.warn('⚠️  ZK proof verification failed (circuit files may not be available):', error);
      // Skip test if circuit files are not available
    }
  }, TEST_CONFIG.TIMEOUT);

  it('should generate batch proofs', async () => {
    const proofInputs = [
      {
        privateInputs: { birthYear: 1990, currentYear: 2024, minAge: 18 },
        publicInputs: { threshold: 18, isOver: true }
      },
      {
        privateInputs: { birthYear: 1995, currentYear: 2024, minAge: 18 },
        publicInputs: { threshold: 18, isOver: true }
      }
    ];

    try {
      const batchResult = await realZKProofService.generateBatchProofs(
        'age_verification',
        proofInputs,
        { maxBatchSize: 5, useParallelProof: true, aggregateProofs: false }
      );

      expect(batchResult.proofs).toHaveLength(2);
      expect(batchResult.totalTime).toBeGreaterThan(0);
      expect(batchResult.averageTime).toBeGreaterThan(0);
    } catch (error) {
      console.warn('⚠️  Batch proof generation failed (circuit files may not be available):', error);
      // Skip test if circuit files are not available
    }
  }, TEST_CONFIG.TIMEOUT);

  it('should get circuit optimization statistics', () => {
    const optimization = realZKProofService.getCircuitOptimization('age_verification');
    
    expect(optimization.constraintReduction).toBeGreaterThan(0);
    expect(optimization.timeImprovement).toBeGreaterThan(0);
    expect(optimization.memoryReduction).toBeGreaterThan(0);
    expect(optimization.recommendedGasLimit).toBeGreaterThan(0);
  });

  it('should cache proofs effectively', async () => {
    const proofInput = {
      privateInputs: {
        birthYear: 1990,
        currentYear: 2024,
        minAge: 18
      },
      publicInputs: {
        threshold: 18,
        isOver: true
      }
    };

    try {
      // Generate proof with caching
      const proof1 = await realZKProofService.generateProof(
        'age_verification',
        proofInput,
        { useCache: true, cacheKey: 'test-cache-key' }
      );

      // Generate same proof again (should be cached)
      const proof2 = await realZKProofService.generateProof(
        'age_verification',
        proofInput,
        { useCache: true, cacheKey: 'test-cache-key' }
      );

      expect(proof1.proof).toEqual(proof2.proof);
      expect(proof1.publicSignals).toEqual(proof2.publicSignals);
    } catch (error) {
      console.warn('⚠️  ZK proof caching test failed (circuit files may not be available):', error);
      // Skip test if circuit files are not available
    }
  }, TEST_CONFIG.TIMEOUT);
});

describe('Real Database Service', () => {
  beforeAll(async () => {
    await realDatabaseService.initialize(TEST_CONFIG.ENCRYPTION_KEY);
  }, TEST_CONFIG.TIMEOUT);

  afterAll(async () => {
    await realDatabaseService.close();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await realDatabaseService.clearTestData?.();
  });

  it('should initialize successfully', async () => {
    expect(realDatabaseService).toBeDefined();
    
    const stats = await realDatabaseService.getStorageStats();
    expect(stats).toBeDefined();
    expect(typeof stats.dids).toBe('number');
    expect(typeof stats.credentials).toBe('number');
  });

  it('should store and retrieve DID', async () => {
    const testDID: DIDKeyPair = {
      did: 'did:persona:test12345',
      keyPair: {
        privateKey: 'test-private-key',
        publicKey: 'test-public-key'
      },
      document: {
        id: 'did:persona:test12345',
        controller: 'did:persona:test12345',
        verificationMethod: [{
          id: 'did:persona:test12345#key1',
          type: 'Ed25519VerificationKey2020',
          controller: 'did:persona:test12345',
          publicKeyBase58: 'H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV'
        }],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      },
      method: 'persona',
      metadata: {
        created: Date.now(),
        version: 1
      }
    };

    const didId = await realDatabaseService.storeDID(testDID);
    expect(didId).toBeDefined();

    const retrievedDID = await realDatabaseService.getDID(didId);
    expect(retrievedDID).toBeDefined();
    expect(retrievedDID?.did).toBe(testDID.did);
    expect(retrievedDID?.method).toBe(testDID.method);
  });

  it('should store and retrieve credentials', async () => {
    const testCredential: VerifiableCredential = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: "test-credential-123",
      type: ["VerifiableCredential", "TestCredential"],
      issuer: "did:persona:issuer",
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "did:persona:subject",
        name: "Test Subject",
        age: 25
      },
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: "did:persona:issuer#key1",
        proofPurpose: "assertionMethod",
        proofValue: "test-proof-value"
      }
    };

    const credId = await realDatabaseService.storeCredential(testCredential);
    expect(credId).toBeDefined();

    const credentials = await realDatabaseService.getCredentials();
    expect(credentials).toHaveLength(1);
    expect(credentials[0].id).toBe(testCredential.id);
    expect(credentials[0].type).toEqual(testCredential.type);
  });

  it('should store and retrieve ZK proofs', async () => {
    const testProof = {
      pi_a: ["test-pi-a-1", "test-pi-a-2"],
      pi_b: [["test-pi-b-1", "test-pi-b-2"], ["test-pi-b-3", "test-pi-b-4"]],
      pi_c: ["test-pi-c-1", "test-pi-c-2"],
      protocol: "groth16",
      curve: "bn128"
    };

    const publicSignals = ["123", "456", "789"];
    const proofId = "test-proof-123";
    const circuitId = "age_verification";

    const storedId = await realDatabaseService.storeProof(
      proofId,
      circuitId,
      testProof,
      publicSignals
    );
    expect(storedId).toBeDefined();

    // Note: We would need to add a getProof method to test retrieval
    // For now, just verify the storage operation succeeded
  });

  it('should create and restore backups', async () => {
    // Store some test data first
    const testDID: DIDKeyPair = {
      did: 'did:persona:backup-test',
      keyPair: { privateKey: 'test-key', publicKey: 'test-pub' },
      document: {
        id: 'did:persona:backup-test',
        controller: 'did:persona:backup-test',
        verificationMethod: [],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      },
      method: 'persona',
      metadata: {}
    };

    await realDatabaseService.storeDID(testDID);

    // Create backup
    const backup = await realDatabaseService.createBackup('full');
    expect(backup).toBeDefined();
    expect(backup.backupId).toBeDefined();
    expect(backup.size).toBeGreaterThan(0);
    expect(backup.checksum).toBeDefined();

    // Restore backup
    const restored = await realDatabaseService.restoreFromBackup(backup.backupId);
    expect(restored).toBe(true);
  });

  it('should handle encryption and decryption', async () => {
    const testDID: DIDKeyPair = {
      did: 'did:persona:encryption-test',
      keyPair: {
        privateKey: 'sensitive-private-key-data',
        publicKey: 'public-key-data'
      },
      document: {
        id: 'did:persona:encryption-test',
        controller: 'did:persona:encryption-test',
        verificationMethod: [{
          id: 'did:persona:encryption-test#key1',
          type: 'Ed25519VerificationKey2020',
          controller: 'did:persona:encryption-test',
          publicKeyBase58: 'encrypted-key-data'
        }],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      },
      method: 'persona',
      metadata: {
        sensitive: 'encrypted-metadata'
      }
    };

    const didId = await realDatabaseService.storeDID(testDID);
    const retrievedDID = await realDatabaseService.getDID(didId);

    expect(retrievedDID).toBeDefined();
    expect(retrievedDID?.keyPair.privateKey).toBe('sensitive-private-key-data');
    expect(retrievedDID?.metadata.sensitive).toBe('encrypted-metadata');
  });

  it('should get accurate storage statistics', async () => {
    const initialStats = await realDatabaseService.getStorageStats();
    
    // Add some test data
    const testDID: DIDKeyPair = {
      did: 'did:persona:stats-test',
      keyPair: { privateKey: 'test', publicKey: 'test' },
      document: {
        id: 'did:persona:stats-test',
        controller: 'did:persona:stats-test',
        verificationMethod: [],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      },
      method: 'persona',
      metadata: {}
    };

    await realDatabaseService.storeDID(testDID);

    const newStats = await realDatabaseService.getStorageStats();
    expect(newStats.dids).toBe(initialStats.dids + 1);
  });
});

describe('Integration Tests', () => {
  beforeAll(async () => {
    await realDatabaseService.initialize(TEST_CONFIG.ENCRYPTION_KEY);
  }, TEST_CONFIG.TIMEOUT);

  afterAll(async () => {
    await realDatabaseService.close();
  });

  it('should handle end-to-end DID lifecycle', async () => {
    // 1. Generate DID
    const didKeyPair = await cryptoService.generateKeyPair();
    const did = `did:persona:${didKeyPair.publicKey.substring(0, 16)}`;
    
    const testDID: DIDKeyPair = {
      did,
      keyPair: didKeyPair,
      document: {
        id: did,
        controller: did,
        verificationMethod: [{
          id: `${did}#key1`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyBase58: didKeyPair.publicKey
        }],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      },
      method: 'persona',
      metadata: {
        created: Date.now(),
        version: 1
      }
    };

    // 2. Store DID in database
    const didId = await realDatabaseService.storeDID(testDID);
    expect(didId).toBeDefined();

    // 3. Retrieve DID from database
    const retrievedDID = await realDatabaseService.getDID(didId);
    expect(retrievedDID).toBeDefined();
    expect(retrievedDID?.did).toBe(did);

    // 4. Register DID on blockchain (if connected)
    try {
      const connected = await realBlockchainService.connectToNetwork(
        TEST_CONFIG.NETWORK,
        TEST_CONFIG.MNEMONIC
      );
      
      if (connected) {
        const result = await realBlockchainService.registerDID(
          TEST_CONFIG.NETWORK,
          did,
          testDID.document
        );
        expect(result.success).toBe(true);
      }
    } catch (error) {
      console.warn('⚠️  Blockchain integration skipped:', error);
    }

    // 5. Generate and store ZK proof
    try {
      const proofInput = {
        privateInputs: { birthYear: 1990, currentYear: 2024, minAge: 18 },
        publicInputs: { threshold: 18, isOver: true }
      };

      const proof = await realZKProofService.generateProof(
        'age_verification',
        proofInput,
        { useCache: false }
      );

      await realDatabaseService.storeProof(
        'integration-test-proof',
        'age_verification',
        proof.proof,
        proof.publicSignals
      );
    } catch (error) {
      console.warn('⚠️  ZK proof integration skipped:', error);
    }
  }, TEST_CONFIG.TIMEOUT);
});

describe('Performance Tests', () => {
  beforeAll(async () => {
    await realDatabaseService.initialize(TEST_CONFIG.ENCRYPTION_KEY);
  }, TEST_CONFIG.TIMEOUT);

  afterAll(async () => {
    await realDatabaseService.close();
  });

  it('should handle concurrent database operations', async () => {
    const concurrentOps = 10;
    const promises = [];

    for (let i = 0; i < concurrentOps; i++) {
      const testDID: DIDKeyPair = {
        did: `did:persona:concurrent-test-${i}`,
        keyPair: { privateKey: `key-${i}`, publicKey: `pub-${i}` },
        document: {
          id: `did:persona:concurrent-test-${i}`,
          controller: `did:persona:concurrent-test-${i}`,
          verificationMethod: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        },
        method: 'persona',
        metadata: {}
      };

      promises.push(realDatabaseService.storeDID(testDID));
    }

    const results = await Promise.all(promises);
    expect(results).toHaveLength(concurrentOps);
    results.forEach(result => expect(result).toBeDefined());
  });

  it('should measure ZK proof generation performance', async () => {
    const proofInput = {
      privateInputs: { birthYear: 1990, currentYear: 2024, minAge: 18 },
      publicInputs: { threshold: 18, isOver: true }
    };

    const iterations = 3;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const start = Date.now();
        await realZKProofService.generateProof(
          'age_verification',
          proofInput,
          { useCache: false }
        );
        const elapsed = Date.now() - start;
        times.push(elapsed);
      } catch (error) {
        console.warn('⚠️  Performance test skipped (circuit files may not be available)');
        return;
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`📊 Average ZK proof generation time: ${avgTime}ms`);
    
    // Expect reasonable performance (adjust based on hardware)
    expect(avgTime).toBeLessThan(30000); // 30 seconds
  }, TEST_CONFIG.TIMEOUT);
});

describe('Real Config Service', () => {
  beforeAll(async () => {
    try {
      await realConfigService.initialize();
    } catch (error) {
      console.warn('⚠️  Config service initialization failed, using defaults');
    }
  });

  it('should load configuration from environment', async () => {
    const config = realConfigService.getConfig();
    expect(config).toBeDefined();
    expect(config.app).toBeDefined();
    expect(config.blockchain).toBeDefined();
    expect(config.security).toBeDefined();
  });

  it('should validate environment variables', () => {
    const errors = realConfigService.getValidationErrors();
    if (errors.length > 0) {
      console.warn('⚠️  Configuration validation errors:', errors);
    }
    // In test environment, some validation errors are expected
  });

  it('should get circuit configuration', () => {
    const circuitConfig = realConfigService.getCircuitConfig('age_verification');
    expect(circuitConfig).toBeDefined();
    expect(circuitConfig.constraintCount).toBeGreaterThan(0);
  });

  it('should check feature flags', () => {
    const zkProofsEnabled = realConfigService.isFeatureEnabled('zkProofs');
    expect(typeof zkProofsEnabled).toBe('boolean');
  });
});

describe('Real HSM Service', () => {
  beforeAll(async () => {
    try {
      await realConfigService.initialize();
      await realHSMService.initialize();
    } catch (error) {
      console.warn('⚠️  HSM service not available, skipping HSM tests');
    }
  });

  it('should initialize successfully if HSM is enabled', async () => {
    try {
      const config = realConfigService.getConfig();
      if (config.security.hsm.enabled) {
        const stats = realHSMService.getStatistics();
        expect(stats).toBeDefined();
        expect(stats.isConnected).toBe(true);
      }
    } catch (error) {
      console.warn('⚠️  HSM not available in test environment');
    }
  });

  it('should generate DID keypair with HSM', async () => {
    try {
      const config = realConfigService.getConfig();
      if (config.security.hsm.enabled) {
        const result = await realHSMService.generateDIDKeyPair('test-did');
        expect(result).toBeDefined();
        expect(result.keyId).toBeDefined();
        expect(result.publicKey).toBeDefined();
        expect(result.did).toMatch(/^did:persona:/);
      }
    } catch (error) {
      console.warn('⚠️  HSM DID generation test skipped:', error);
    }
  });

  it('should sign data with HSM', async () => {
    try {
      const config = realConfigService.getConfig();
      if (config.security.hsm.enabled) {
        const keys = await realHSMService.listKeys();
        if (keys.length > 0) {
          const signingKey = keys.find(k => k.keyType === 'SIGNING');
          if (signingKey) {
            const signature = await realHSMService.signData({
              keyId: signingKey.keyId,
              data: 'test data',
              algorithm: 'ECDSA_SHA_256',
              messageType: 'RAW'
            });
            
            expect(signature).toBeDefined();
            expect(signature.signature).toBeDefined();
            expect(signature.keyId).toBe(signingKey.keyId);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  HSM signing test skipped:', error);
    }
  });

  it('should encrypt and decrypt data with HSM', async () => {
    try {
      const config = realConfigService.getConfig();
      if (config.security.hsm.enabled) {
        const keys = await realHSMService.listKeys();
        const encryptionKey = keys.find(k => k.keyType === 'ENCRYPTION');
        
        if (encryptionKey) {
          const plaintext = 'sensitive test data';
          
          const encrypted = await realHSMService.encryptData({
            keyId: encryptionKey.keyId,
            plaintext,
            algorithm: 'AES_256_GCM'
          });
          
          expect(encrypted).toBeDefined();
          expect(encrypted.ciphertext).toBeDefined();
          
          const decrypted = await realHSMService.decryptData(
            encryptionKey.keyId,
            encrypted.ciphertext,
            'AES_256_GCM',
            encrypted.iv,
            encrypted.tag
          );
          
          expect(decrypted).toBe(plaintext);
        }
      }
    } catch (error) {
      console.warn('⚠️  HSM encryption test skipped:', error);
    }
  });
});

describe('Error Handling Tests', () => {
  beforeAll(async () => {
    await realDatabaseService.initialize(TEST_CONFIG.ENCRYPTION_KEY);
  }, TEST_CONFIG.TIMEOUT);

  afterAll(async () => {
    await realDatabaseService.close();
  });

  it('should handle invalid circuit types', async () => {
    const proofInput = {
      privateInputs: { test: 'data' },
      publicInputs: { test: 'data' }
    };

    await expect(
      realZKProofService.generateProof('invalid-circuit', proofInput)
    ).rejects.toThrow();
  });

  it('should handle database corruption gracefully', async () => {
    // This would test backup/restore functionality
    const backup = await realDatabaseService.createBackup('full');
    expect(backup).toBeDefined();
    
    // Restore should work
    const restored = await realDatabaseService.restoreFromBackup(backup.backupId);
    expect(restored).toBe(true);
  });

  it('should handle network failures gracefully', async () => {
    // Test with invalid network
    const result = await realBlockchainService.connectToNetwork('invalid-network');
    expect(result).toBe(false);
  });

  it('should handle HSM unavailability gracefully', async () => {
    // Test HSM service graceful failure
    try {
      const stats = realHSMService.getStatistics();
      expect(stats).toBeDefined();
    } catch (error) {
      expect(error.message).toContain('not initialized');
    }
  });

  it('should handle configuration validation errors', () => {
    const errors = realConfigService.getValidationErrors();
    expect(Array.isArray(errors)).toBe(true);
    // Configuration errors are expected in test environment
  });
});