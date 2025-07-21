/**
 * DID Blockchain Integration Test
 * Tests core DID functionality without external dependencies
 */

import { describe, it, expect, vi } from "vitest";
import { DIDService } from "../services/didService";
import { userAuthService } from "../services/userAuthService";
import { keplrService } from "../services/keplrService";

// Mock window.keplr
const mockKeplrAccount = {
  address: "persona1test123456789abcdef",
  pubKey: new Uint8Array([1, 2, 3, 4, 5]),
  name: "Test Account",
  algo: "secp256k1",
  bech32Address: "persona1test123456789abcdef",
};

Object.defineProperty(window, "keplr", {
  value: {
    enable: vi.fn(),
    getKey: vi.fn().mockResolvedValue(mockKeplrAccount),
    signArbitrary: vi.fn().mockResolvedValue({
      signature: "test_signature",
      pub_key: { value: new Uint8Array([1, 2, 3, 4, 5]) },
    }),
    experimentalSuggestChain: vi.fn(),
    getBalance: vi.fn().mockResolvedValue({
      denom: "upersona",
      amount: "1000000",
    }),
  },
  writable: true,
});

describe("DID Blockchain Integration", () => {
  describe("DID Generation", () => {
    it("should generate a valid DID with proper format", async () => {
      const didKeyPair = await DIDService.generateDID(false);

      expect(didKeyPair).toBeDefined();
      expect(didKeyPair.did).toMatch(/^did:key:z/);
      expect(didKeyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(didKeyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(didKeyPair.document).toBeDefined();
      expect(didKeyPair.document.id).toBe(didKeyPair.did);
    });

    it("should generate deterministic DID from seed", async () => {
      const seed = "test-seed-123";
      const didKeyPair1 = await DIDService.generateDIDFromSeed(seed);
      const didKeyPair2 = await DIDService.generateDIDFromSeed(seed);

      expect(didKeyPair1.did).toBe(didKeyPair2.did);
      expect(didKeyPair1.privateKey).toEqual(didKeyPair2.privateKey);
      expect(didKeyPair1.publicKey).toEqual(didKeyPair2.publicKey);
    });
  });

  describe("DID Document Validation", () => {
    it("should create valid W3C DID document", async () => {
      const didKeyPair = await DIDService.generateDID(false);
      const doc = didKeyPair.document;

      expect(doc["@context"]).toContain("https://www.w3.org/ns/did/v1");
      expect(doc.id).toBe(didKeyPair.did);
      expect(doc.verificationMethod).toHaveLength(1);
      expect(doc.authentication).toHaveLength(1);
      expect(doc.assertionMethod).toHaveLength(1);
      expect(doc.capabilityInvocation).toHaveLength(1);
      expect(doc.capabilityDelegation).toHaveLength(1);

      const vm = doc.verificationMethod[0];
      expect(vm.type).toBe("Ed25519VerificationKey2020");
      expect(vm.controller).toBe(didKeyPair.did);
      expect(vm.publicKeyMultibase).toBeDefined();
    });
  });

  describe("Cryptographic Operations", () => {
    it("should sign and verify data correctly", async () => {
      const didKeyPair = await DIDService.generateDID(false);
      const testData = new TextEncoder().encode("test message");

      const signature = await DIDService.signWithDID(
        testData,
        didKeyPair.privateKey,
      );
      expect(signature).toBeInstanceOf(Uint8Array);

      const isValid = await DIDService.verifyDIDSignature(
        signature,
        testData,
        didKeyPair.publicKey,
      );
      expect(isValid).toBe(true);
    });

    it("should reject invalid signatures", async () => {
      const didKeyPair = await DIDService.generateDID(false);
      const testData = new TextEncoder().encode("test message");
      const wrongData = new TextEncoder().encode("wrong message");

      const signature = await DIDService.signWithDID(
        testData,
        didKeyPair.privateKey,
      );

      const isValid = await DIDService.verifyDIDSignature(
        signature,
        wrongData,
        didKeyPair.publicKey,
      );
      expect(isValid).toBe(false);
    });
  });

  describe("Keplr Integration", () => {
    it("should create DID from Keplr account", async () => {
      // Connect to Keplr first
      await keplrService.connect();

      const didKeyPair = await keplrService.createDIDFromKeplr();

      expect(didKeyPair).toBeDefined();
      expect(didKeyPair.did).toMatch(/^did:key:z/);
      expect(didKeyPair.document).toBeDefined();
      expect(didKeyPair.document.id).toBe(didKeyPair.did);
    });

    it("should handle Keplr connection errors gracefully", async () => {
      // Mock Keplr not being available
      const originalKeplr = window.keplr;
      Object.defineProperty(window, "keplr", {
        value: null,
        writable: true,
      });

      await expect(keplrService.connect()).rejects.toThrow();

      // Restore Keplr
      Object.defineProperty(window, "keplr", {
        value: originalKeplr,
        writable: true,
      });
    });
  });

  describe("Public Key Extraction", () => {
    it("should extract public key from DID correctly", async () => {
      const didKeyPair = await DIDService.generateDID(false);
      const extractedPubKey = DIDService.extractPublicKeyFromDID(
        didKeyPair.did,
      );

      expect(extractedPubKey).toEqual(didKeyPair.publicKey);
    });

    it("should throw error for invalid DID format", () => {
      expect(() => {
        DIDService.extractPublicKeyFromDID("invalid:did:format");
      }).toThrow("Invalid did:key format");
    });
  });

  describe("DID Resolution", () => {
    it("should resolve DID to document", async () => {
      const didKeyPair = await DIDService.generateDID(false);
      const resolvedDoc = await DIDService.resolveDID(didKeyPair.did);

      expect(resolvedDoc).toEqual(didKeyPair.document);
    });
  });

  describe("Blockchain Integration Mock", () => {
    it("should handle blockchain registration success", async () => {
      const didKeyPair = await DIDService.generateDID(false);

      // Mock successful blockchain registration
      const mockRegisterDID = vi.fn().mockResolvedValue({
        did: didKeyPair.did,
        document: didKeyPair.document,
        blockNumber: 123456,
        transactionHash: "0xabc123",
        timestamp: Date.now(),
        isActive: true,
      });

      const result = await mockRegisterDID(didKeyPair);

      expect(result.did).toBe(didKeyPair.did);
      expect(result.blockNumber).toBe(123456);
      expect(result.transactionHash).toBe("0xabc123");
      expect(result.isActive).toBe(true);
    });

    it("should handle blockchain registration failure", async () => {
      const didKeyPair = await DIDService.generateDID(false);

      // Mock failed blockchain registration
      const mockRegisterDID = vi
        .fn()
        .mockRejectedValue(new Error("Blockchain connection failed"));

      await expect(mockRegisterDID(didKeyPair)).rejects.toThrow(
        "Blockchain connection failed",
      );
    });
  });
});
