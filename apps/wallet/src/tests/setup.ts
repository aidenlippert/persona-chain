/**
 * Test setup configuration for Persona Wallet tests
 */

import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

// Mock crypto API
const mockCrypto = {
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    generateKey: vi.fn(),
    importKey: vi.fn(),
    exportKey: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    digest: vi.fn(),
  },
};

// Mock WebAuthn API
const mockWebAuthn = {
  create: vi.fn(),
  get: vi.fn(),
};

// Setup global mocks
beforeEach(() => {
  // Mock browser APIs
  Object.defineProperty(global, "indexedDB", {
    value: mockIndexedDB,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, "crypto", {
    value: mockCrypto,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, "navigator", {
    value: {
      ...global.navigator,
      credentials: mockWebAuthn,
    },
    writable: true,
    configurable: true,
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(global, "sessionStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
});

// Enhanced ZK Proof Service Mock
const mockEnhancedZKProofService = {
  generateProof: vi.fn().mockImplementation(async (request: any) => ({
    proof: {
      type: "ZKProof",
      protocol: "groth16",
      curve: "bn128",
      proof: "0x" + "a".repeat(128),
      publicSignals: ["0x123", "0x456"],
      verificationKey: "0x" + "b".repeat(256),
      commitment: "0x" + "c".repeat(64),
      nullifier: "0x" + "d".repeat(64),
      circuitId: request.proofType,
      created: new Date().toISOString(),
      metadata: {
        privacyLevel: request.privacyLevel,
        selectiveFields: request.selectiveFields,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      },
    },
    commitment: "0x" + "c".repeat(64),
    nullifier: "0x" + "d".repeat(64),
    verificationData: {
      isValid: true,
      verifiedAt: new Date().toISOString(),
      verificationMethod: "test-verification",
    },
  })),

  verifyProof: vi.fn().mockImplementation(async (proof: any, commitment?: string) => {
    // Mock double-spending prevention
    if (proof.metadata?.used) {
      return false;
    }
    
    // Mock expiration check
    if (proof.metadata?.expiresAt && new Date(proof.metadata.expiresAt) < new Date()) {
      return false;
    }
    
    // Mock invalid proof detection
    if (!proof.proof || proof.proof === null) {
      return false;
    }
    
    // Mark as used for double-spending test
    if (proof.metadata) {
      proof.metadata.used = true;
    }
    
    return true;
  }),

  createPrivacyPreservingCredential: vi.fn().mockImplementation(async (credential: any, privacyLevel: string) => ({
    id: `zk-${credential.id}`,
    metadata: {
      privacyLevel,
      createdAt: new Date().toISOString(),
    },
    commitment: "0x" + "c".repeat(64),
    nullifierHash: "0x" + "d".repeat(64),
    encryptedData: "0x" + "e".repeat(128),
    publicAttributes: privacyLevel === "minimal" 
      ? { type: credential.type, issuer: credential.issuer, expirationDate: credential.expirationDate }
      : privacyLevel === "selective"
      ? { type: credential.type, issuer: credential.issuer }
      : { type: credential.type },
    privateAttributes: Object.keys(credential.credentialSubject || {}),
  })),

  getPrivacyRecommendations: vi.fn().mockImplementation((credentialType: string) => ({
    level: credentialType.includes("Financial") ? "zero_knowledge" 
          : credentialType.includes("Employment") ? "selective" 
          : "minimal",
    reason: `Privacy level recommended based on ${credentialType} sensitivity`,
    recommendedFields: ["type", "issuer"],
  })),

  listCircuits: vi.fn().mockReturnValue([
    { id: "age_verification", name: "Age Verification Circuit", constraints: 1000, description: "Verifies age without revealing exact date" },
    { id: "income_threshold", name: "Income Threshold Circuit", constraints: 1500, description: "Verifies income meets threshold" },
    { id: "selective_disclosure", name: "Selective Disclosure Circuit", constraints: 2000, description: "Reveals selected fields only" },
    { id: "membership_proof", name: "Membership Proof Circuit", constraints: 800, description: "Proves membership without revealing identity" },
    { id: "identity_verification", name: "Identity Verification Circuit", constraints: 2500, description: "Verifies identity with zero knowledge" },
  ]),

  getCircuitInfo: vi.fn().mockImplementation((circuitId: string) => {
    const circuits = mockEnhancedZKProofService.listCircuits();
    return circuits.find(c => c.id === circuitId) || null;
  }),
};

// Enhanced DID Service Mock
const mockDIDService = {
  generateDID: vi.fn().mockImplementation(async (useKeplr: boolean = false) => ({
    did: "did:persona:test123456789abcdef",
    publicKey: "0x" + "1".repeat(64),
    privateKey: useKeplr ? null : "0x" + "2".repeat(64),
    keyType: "Ed25519",
    created: new Date().toISOString(),
  })),

  signData: vi.fn().mockImplementation(async (data: any, privateKey: string) => ({
    signature: "0x" + "3".repeat(128),
    publicKey: "0x" + "1".repeat(64),
    algorithm: "Ed25519",
  })),

  verifySignature: vi.fn().mockResolvedValue(true),

  createDIDDocument: vi.fn().mockImplementation(async (did: string, publicKey: string) => ({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: did,
    verificationMethod: [{
      id: `${did}#key-1`,
      type: "Ed25519VerificationKey2020",
      controller: did,
      publicKeyMultibase: publicKey,
    }],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
  })),
};

// Mock the enhanced ZK proof service module
vi.mock("../services/enhancedZKProofService", () => ({
  enhancedZKProofService: mockEnhancedZKProofService,
}));

// Mock the DID service module  
vi.mock("../services/didService", () => ({
  DIDService: mockDIDService,
}));

// Mock blockchain persistence service
vi.mock("../services/blockchainPersistenceService", () => ({
  blockchainPersistenceService: {
    getConfig: vi.fn().mockReturnValue({
      rpcUrl: "http://localhost:8545",
      chainId: 31337,
      registryAddress: "0x1234567890123456789012345678901234567890",
      useHSM: false,
    }),
  },
}));

// Mock VC manager service
vi.mock("../services/vcManagerService", () => ({
  vcManagerService: {
    createCredential: vi.fn(),
    verifyCredential: vi.fn().mockResolvedValue(true),
    storeCredential: vi.fn(),
    getCredential: vi.fn(),
  },
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
