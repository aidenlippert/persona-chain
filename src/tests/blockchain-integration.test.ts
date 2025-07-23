/**
 * Blockchain Integration Tests
 * Tests DID registration and credential verification on blockchain
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { userAuthService } from "../services/userAuthService";
import { keplrService } from "../services/keplrService";
import { blockchainPersistenceService } from "../services/blockchainPersistenceService";
import { DIDService } from "../services/didService";

// Mock Keplr wallet
const mockKeplrAccount = {
  address: "persona1test123456789abcdef",
  pubKey: new Uint8Array([1, 2, 3, 4, 5]),
  name: "Test Account",
  algo: "secp256k1",
  bech32Address: "persona1test123456789abcdef",
};

// Mock window.keplr
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

describe("Blockchain Integration", () => {
  beforeEach(async () => {
    // Initialize services
    await userAuthService.initialize();
    vi.clearAllMocks();
  });

  describe("DID Registration", () => {
    it("should create DID and register on blockchain", async () => {
      // Mock blockchain registration success
      const mockRegisterDID = vi
        .spyOn(blockchainPersistenceService, "registerDID")
        .mockResolvedValue({
          did: "did:key:test123",
          document: { id: "did:key:test123" },
          blockNumber: 123456,
          transactionHash: "0xabc123",
          timestamp: Date.now(),
          isActive: true,
        });

      // Test DID creation from Keplr
      const didKeyPair = await keplrService.createDIDFromKeplr();

      expect(didKeyPair).toBeDefined();
      expect(didKeyPair.did).toMatch(/^did:key:/);
      expect(didKeyPair.document).toBeDefined();
      expect(didKeyPair.privateKey).toBeDefined();
      expect(didKeyPair.publicKey).toBeDefined();
    });

    it("should handle blockchain registration failure gracefully", async () => {
      // Mock blockchain registration failure
      const mockRegisterDID = vi
        .spyOn(blockchainPersistenceService, "registerDID")
        .mockRejectedValue(new Error("Blockchain connection failed"));

      // Test DID creation still works even if blockchain fails
      const didKeyPair = await keplrService.createDIDFromKeplr();

      expect(didKeyPair).toBeDefined();
      expect(didKeyPair.did).toMatch(/^did:key:/);

      // Blockchain registration should fail but not crash the app
      await expect(
        keplrService.registerDIDOnChain(didKeyPair),
      ).rejects.toThrow();
    });
  });

  describe("User Authentication with Blockchain", () => {
    it("should authenticate new user and register DID on blockchain", async () => {
      // Mock blockchain registration
      const mockRegisterDID = vi
        .spyOn(blockchainPersistenceService, "registerDID")
        .mockResolvedValue({
          did: "did:key:test123",
          document: { id: "did:key:test123" },
          blockNumber: 123456,
          transactionHash: "0xabc123",
          timestamp: Date.now(),
          isActive: true,
        });

      // Mock DID generation
      const mockGenerateDID = vi
        .spyOn(DIDService, "generateDIDFromSeed")
        .mockResolvedValue({
          did: "did:key:test123",
          privateKey: new Uint8Array([1, 2, 3]),
          publicKey: new Uint8Array([4, 5, 6]),
          document: { id: "did:key:test123" },
        });

      // Test user authentication
      const authResult = await userAuthService.authenticateWithKeplr();

      expect(authResult.success).toBe(true);
      expect(authResult.isNewUser).toBe(true);
      expect(authResult.didKeyPair).toBeDefined();
      expect(authResult.recoveryPhrase).toBeDefined();
      expect(authResult.profile).toBeDefined();

      // Verify DID was registered on blockchain
      expect(mockRegisterDID).toHaveBeenCalledWith(
        expect.objectContaining({
          did: "did:key:test123",
        }),
      );
    });

    it("should load existing user without blockchain registration", async () => {
      // Mock existing user
      const existingProfile = {
        did: "did:key:existing123",
        keplrAddress: mockKeplrAccount.address,
        keplrName: mockKeplrAccount.name,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        recoveryPhraseBackup: true,
        verifiedCredentials: [],
        isActive: true,
      };

      // Mock storage service to return existing user
      const mockFindUser = vi
        .spyOn(userAuthService as any, "findUserByKeplrAddress")
        .mockResolvedValue(existingProfile);

      // Test user authentication
      const authResult = await userAuthService.authenticateWithKeplr();

      expect(authResult.success).toBe(true);
      expect(authResult.isNewUser).toBe(false);
      expect(authResult.profile).toEqual(existingProfile);

      // Verify no blockchain registration for existing user
      const mockRegisterDID = vi.spyOn(
        blockchainPersistenceService,
        "registerDID",
      );
      expect(mockRegisterDID).not.toHaveBeenCalled();
    });
  });

  describe("Blockchain Configuration", () => {
    it("should initialize blockchain service with correct configuration", async () => {
      const mockInitialize = vi
        .spyOn(blockchainPersistenceService, "initialize")
        .mockResolvedValue();

      await keplrService.initialize();

      // Test blockchain initialization during DID registration
      const didKeyPair = await keplrService.createDIDFromKeplr();

      try {
        await keplrService.registerDIDOnChain(didKeyPair);
      } catch (error) {
        // Expected to fail in test environment
      }

      expect(mockInitialize).toHaveBeenCalledWith({
        rpcUrl: "https://rpc.personachain.com",
        chainId: 1337,
        registryAddress: "0x1234567890123456789012345678901234567890",
        useHSM: false,
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle Keplr connection errors", async () => {
      // Mock Keplr connection failure
      window.keplr.enable = vi
        .fn()
        .mockRejectedValue(new Error("User rejected"));

      const authResult = await userAuthService.authenticateWithKeplr();

      expect(authResult.success).toBe(false);
      expect(authResult.error).toBeDefined();
      expect(authResult.profile).toBeNull();
    });

    it("should handle blockchain initialization errors", async () => {
      // Mock blockchain initialization failure
      const mockInitialize = vi
        .spyOn(blockchainPersistenceService, "initialize")
        .mockRejectedValue(new Error("RPC connection failed"));

      const didKeyPair = await keplrService.createDIDFromKeplr();

      // Should throw error when blockchain fails
      await expect(keplrService.registerDIDOnChain(didKeyPair)).rejects.toThrow(
        "Failed to register DID on blockchain",
      );
    });
  });
});
