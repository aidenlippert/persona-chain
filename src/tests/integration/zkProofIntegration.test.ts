/**
 * ZK Proof Integration Tests
 * Tests the enhanced ZK proof service with existing wallet infrastructure
 */

import { describe, it, expect, beforeEach } from "vitest";
import { enhancedZKProofService } from "../../services/enhancedZKProofService";
import { vcManagerService } from "../../services/vcManagerService";
import { DIDService } from "../../services/didService";
import { blockchainPersistenceService } from "../../services/blockchainPersistenceService";
import type { VerifiableCredential } from "../../types/wallet";

describe("ZK Proof Integration", () => {
  let testCredential: VerifiableCredential;
  let testDID: any;

  beforeEach(async () => {
    // Initialize test DID
    testDID = await DIDService.generateDID(false); // Use local signing for tests

    // Create test credential
    testCredential = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: "urn:uuid:test-credential-123",
      type: ["VerifiableCredential", "EmploymentCredential"],
      issuer: testDID.did,
      issuanceDate: "2023-01-01T00:00:00Z",
      expirationDate: "2024-01-01T00:00:00Z",
      credentialSubject: {
        id: "did:example:subject",
        name: "John Doe",
        title: "Software Engineer",
        company: "TechCorp",
        salary: 75000,
        startDate: "2020-01-01",
        department: "Engineering",
        level: "Senior",
      },
      proof: {
        type: "Ed25519Signature2020",
        created: "2023-01-01T00:00:00Z",
        verificationMethod: `${testDID.did}#key-1`,
        proofPurpose: "assertionMethod",
        proofValue: "test-proof-value",
      },
    };
  });

  describe("Enhanced ZK Proof Service Integration", () => {
    it("should integrate with wallet infrastructure", async () => {
      // Initialize the enhanced service
      expect(enhancedZKProofService).toBeDefined();

      // Check that circuits are loaded
      const circuits = enhancedZKProofService.listCircuits();
      expect(circuits).toBeDefined();
      expect(circuits.length).toBeGreaterThan(0);
    });

    it("should generate age verification proof", async () => {
      const request = {
        credentialId: testCredential.id,
        proofType: "age_verification" as const,
        publicInputs: {
          minimum_age: 18,
          current_timestamp: Math.floor(Date.now() / 1000),
          date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
        },
        privacyLevel: "selective" as const,
      };

      const result = await enhancedZKProofService.generateProof(request);

      expect(result.proof).toBeDefined();
      expect(result.proof.type).toBe("ZKProof");
      expect(result.proof.protocol).toBe("groth16");
      expect(result.proof.circuitId).toBe("age_verification");
      expect(result.commitment).toBeDefined();
      expect(result.nullifier).toBeDefined();
      expect(result.verificationData.isValid).toBe(true);
    });

    it("should generate income threshold proof", async () => {
      const request = {
        credentialId: testCredential.id,
        proofType: "income_threshold" as const,
        publicInputs: {
          minimum_income: 50000,
          verification_timestamp: Math.floor(Date.now() / 1000),
          actual_income: 75000,
        },
        privacyLevel: "zero_knowledge" as const,
      };

      const result = await enhancedZKProofService.generateProof(request);

      expect(result.proof).toBeDefined();
      expect(result.proof.circuitId).toBe("income_threshold");
      expect(result.proof.metadata?.privacyLevel).toBe("zero_knowledge");
      expect(result.verificationData.isValid).toBe(true);
    });

    it("should generate selective disclosure proof", async () => {
      const selectiveFields = ["name", "title", "company"];
      const request = {
        credentialId: testCredential.id,
        proofType: "selective_disclosure" as const,
        publicInputs: {
          disclosed_fields_hash: "test-hash",
          verification_timestamp: Math.floor(Date.now() / 1000),
          full_credential: testCredential,
        },
        selectiveFields,
        privacyLevel: "selective" as const,
      };

      const result = await enhancedZKProofService.generateProof(request);

      expect(result.proof).toBeDefined();
      expect(result.proof.circuitId).toBe("selective_disclosure");
      expect(result.proof.metadata?.selectiveFields).toEqual(selectiveFields);
      expect(result.verificationData.isValid).toBe(true);
    });

    it("should verify generated proofs", async () => {
      const request = {
        credentialId: testCredential.id,
        proofType: "age_verification" as const,
        publicInputs: {
          minimum_age: 21,
          current_timestamp: Math.floor(Date.now() / 1000),
          date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
        },
        privacyLevel: "selective" as const,
      };

      const result = await enhancedZKProofService.generateProof(request);
      const isValid = await enhancedZKProofService.verifyProof(
        result.proof,
        result.commitment,
      );

      expect(isValid).toBe(true);
    });

    it("should prevent double spending with nullifiers", async () => {
      const request = {
        credentialId: testCredential.id,
        proofType: "membership_proof" as const,
        publicInputs: {
          membership_root: "test-root",
          verification_timestamp: Math.floor(Date.now() / 1000),
          member_data: "test-member",
        },
        privacyLevel: "zero_knowledge" as const,
      };

      // Generate first proof
      const result1 = await enhancedZKProofService.generateProof(request);
      expect(await enhancedZKProofService.verifyProof(result1.proof)).toBe(
        true,
      );

      // Try to verify the same proof again (should fail due to nullifier)
      const isValidSecond = await enhancedZKProofService.verifyProof(
        result1.proof,
      );
      expect(isValidSecond).toBe(false);
    });
  });

  describe("Privacy-Preserving Credential Integration", () => {
    it("should create privacy-preserving credential", async () => {
      const ppCredential =
        await enhancedZKProofService.createPrivacyPreservingCredential(
          testCredential,
          "selective",
        );

      expect(ppCredential).toBeDefined();
      expect(ppCredential.id).toBe(`zk-${testCredential.id}`);
      expect(ppCredential.metadata.privacyLevel).toBe("selective");
      expect(ppCredential.commitment).toBeDefined();
      expect(ppCredential.nullifierHash).toBeDefined();
      expect(ppCredential.encryptedData).toBeDefined();
    });

    it("should handle different privacy levels", async () => {
      const levels = ["minimal", "selective", "zero_knowledge"] as const;

      for (const level of levels) {
        const ppCredential =
          await enhancedZKProofService.createPrivacyPreservingCredential(
            testCredential,
            level,
          );

        expect(ppCredential.metadata.privacyLevel).toBe(level);

        // Check public attributes based on privacy level
        switch (level) {
          case "minimal":
            expect(ppCredential.publicAttributes).toHaveProperty("type");
            expect(ppCredential.publicAttributes).toHaveProperty("issuer");
            expect(ppCredential.publicAttributes).toHaveProperty(
              "expirationDate",
            );
            break;
          case "selective":
            expect(ppCredential.publicAttributes).toHaveProperty("type");
            expect(ppCredential.publicAttributes).toHaveProperty("issuer");
            expect(ppCredential.publicAttributes).not.toHaveProperty(
              "expirationDate",
            );
            break;
          case "zero_knowledge":
            expect(ppCredential.publicAttributes).toHaveProperty("type");
            expect(ppCredential.publicAttributes).not.toHaveProperty("issuer");
            break;
        }
      }
    });

    it("should provide privacy recommendations", async () => {
      const testCases = [
        { type: "FinancialCredential", expectedLevel: "zero_knowledge" },
        { type: "EmploymentCredential", expectedLevel: "selective" },
        { type: "BasicCredential", expectedLevel: "minimal" },
      ];

      for (const testCase of testCases) {
        const recommendation = enhancedZKProofService.getPrivacyRecommendations(
          testCase.type,
        );

        expect(recommendation.level).toBe(testCase.expectedLevel);
        expect(recommendation.reason).toBeDefined();
        expect(recommendation.recommendedFields).toBeDefined();
      }
    });
  });

  describe("Blockchain Integration", () => {
    it("should work with blockchain persistence", async () => {
      // This is a mock test since blockchain persistence requires actual blockchain
      const mockConfig = {
        rpcUrl: "http://localhost:8545",
        chainId: 31337,
        registryAddress: "0x1234567890123456789012345678901234567890",
        useHSM: false,
      };

      // Test that the service can be initialized with blockchain config
      expect(() => {
        blockchainPersistenceService.getConfig();
      }).not.toThrow();
    });

    it("should generate proofs for blockchain verification", async () => {
      const request = {
        credentialId: testCredential.id,
        proofType: "identity_verification" as const,
        publicInputs: {
          identity_commitment: "test-commitment",
          verification_timestamp: Math.floor(Date.now() / 1000),
          identity_data: "test-identity",
          biometric_data: "test-biometric",
        },
        privacyLevel: "zero_knowledge" as const,
      };

      const result = await enhancedZKProofService.generateProof(request);

      expect(result.proof).toBeDefined();
      expect(result.proof.circuitId).toBe("identity_verification");
      expect(result.commitment).toBeDefined();

      // Verify the proof can be used for blockchain verification
      const isValid = await enhancedZKProofService.verifyProof(result.proof);
      expect(isValid).toBe(true);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle multiple concurrent proofs", async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => ({
        credentialId: `${testCredential.id}-${i}`,
        proofType: "age_verification" as const,
        publicInputs: {
          minimum_age: 18,
          current_timestamp: Math.floor(Date.now() / 1000),
          date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
        },
        privacyLevel: "selective" as const,
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentRequests.map((request) =>
          enhancedZKProofService.generateProof(request),
        ),
      );
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all proofs
      for (const result of results) {
        expect(result.proof).toBeDefined();
        expect(result.verificationData.isValid).toBe(true);
      }
    });

    it("should handle large credential data", async () => {
      // Create a large credential with many fields
      const largeCredential = {
        ...testCredential,
        credentialSubject: {
          ...testCredential.credentialSubject,
          ...Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`field${i}`, `value${i}`]),
          ),
        },
      };

      const ppCredential =
        await enhancedZKProofService.createPrivacyPreservingCredential(
          largeCredential,
          "selective",
        );

      expect(ppCredential).toBeDefined();
      expect(ppCredential.privateAttributes.length).toBeGreaterThan(50);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid proof types", async () => {
      const request = {
        credentialId: testCredential.id,
        proofType: "invalid_proof_type" as any,
        publicInputs: {},
        privacyLevel: "selective" as const,
      };

      await expect(
        enhancedZKProofService.generateProof(request),
      ).rejects.toThrow();
    });

    it("should handle invalid proof verification", async () => {
      const invalidProof = {
        type: "ZKProof",
        protocol: "groth16",
        curve: "bn128",
        proof: null,
        publicSignals: [],
        verificationKey: null,
        commitment: "",
        nullifier: "",
        circuitId: "age_verification",
        created: new Date().toISOString(),
      } as any;

      const isValid = await enhancedZKProofService.verifyProof(invalidProof);
      expect(isValid).toBe(false);
    });

    it("should handle expired proofs", async () => {
      const request = {
        credentialId: testCredential.id,
        proofType: "age_verification" as const,
        publicInputs: {
          minimum_age: 18,
          current_timestamp: Math.floor(Date.now() / 1000),
        },
        privacyLevel: "selective" as const,
        challenge: "test-challenge",
      };

      const result = await enhancedZKProofService.generateProof(request);

      // Manually expire the proof
      result.proof.metadata = {
        ...result.proof.metadata,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const isValid = await enhancedZKProofService.verifyProof(result.proof);
      expect(isValid).toBe(false);
    });
  });

  describe("Circuit Information", () => {
    it("should provide circuit information", async () => {
      const circuits = enhancedZKProofService.listCircuits();

      expect(circuits).toBeDefined();
      expect(circuits.length).toBeGreaterThan(0);

      for (const circuit of circuits) {
        expect(circuit).toHaveProperty("id");
        expect(circuit).toHaveProperty("name");
        expect(circuit).toHaveProperty("constraints");
        expect(circuit).toHaveProperty("description");
      }
    });

    it("should get specific circuit information", async () => {
      const circuitInfo =
        enhancedZKProofService.getCircuitInfo("age_verification");

      expect(circuitInfo).toBeDefined();
      expect(circuitInfo?.id).toBe("age_verification");
      expect(circuitInfo?.name).toBe("Age Verification Circuit");
      expect(circuitInfo?.constraints).toBeGreaterThan(0);
    });
  });
});
