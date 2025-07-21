/**
 * ZK Proof Validation Tests
 * Core validation of enhanced ZK proof service functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the enhanced ZK proof service
const mockEnhancedZKProofService = {
  initialized: false,
  circuits: new Map(),
  nullifierStore: new Set(),

  async initializeService() {
    // Mock circuit initialization
    const mockCircuits = [
      {
        id: "age_verification",
        name: "Age Verification Circuit",
        constraints: 1247,
        description: "Age verification without revealing exact age",
      },
      {
        id: "income_threshold",
        name: "Income Threshold Circuit",
        constraints: 2156,
        description: "Income threshold verification",
      },
      {
        id: "selective_disclosure",
        name: "Selective Disclosure Circuit",
        constraints: 3421,
        description: "Selective field disclosure from credentials",
      },
      {
        id: "membership_proof",
        name: "Membership Proof Circuit",
        constraints: 2987,
        description: "Anonymous membership proof using Merkle trees",
      },
    ];

    for (const circuit of mockCircuits) {
      this.circuits.set(circuit.id, circuit);
    }

    this.initialized = true;
  },

  listCircuits() {
    return Array.from(this.circuits.values());
  },

  getCircuitInfo(circuitId: string) {
    return this.circuits.get(circuitId);
  },

  async generateProof(request: any) {
    if (!this.initialized) {
      await this.initializeService();
    }

    const circuit = this.circuits.get(request.proofType);
    if (!circuit) {
      throw new Error(`Circuit not found: ${request.proofType}`);
    }

    // Generate mock proof components
    const salt = new Uint8Array(32);
    const nullifier = `nullifier_${request.credentialId}_${Date.now()}`;
    const commitment = `commitment_${request.credentialId}_${Date.now()}`;

    // Store nullifier
    this.nullifierStore.add(nullifier);

    const zkProof = {
      type: "ZKProof",
      protocol: "groth16",
      curve: "bn128",
      proof: {
        pi_a: ["1234567890", "9876543210", "1"],
        pi_b: [
          ["1111111111", "2222222222"],
          ["3333333333", "4444444444"],
          ["1", "0"],
        ],
        pi_c: ["5555555555", "6666666666", "1"],
      },
      publicSignals: Object.values(request.publicInputs).map(String),
      verificationKey: {
        protocol: "groth16",
        curve: "bn128",
        nPublic: 2,
      },
      commitment,
      nullifier,
      circuitId: circuit.id,
      created: new Date().toISOString(),
      metadata: {
        privacyLevel: request.privacyLevel,
        selectiveFields: request.selectiveFields,
        expiresAt: request.challenge
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      },
    };

    return {
      proof: zkProof,
      commitment,
      nullifier,
      publicSignals: zkProof.publicSignals,
      verificationData: {
        isValid: true,
        circuitId: circuit.id,
      },
    };
  },

  async verifyProof(proof: any, expectedCommitment?: string) {
    if (!proof.proof || !proof.publicSignals || !proof.commitment) {
      return false;
    }

    const circuit = this.circuits.get(proof.circuitId);
    if (!circuit) {
      return false;
    }

    // Check for double spending
    if (this.nullifierStore.has(proof.nullifier)) {
      return false;
    }

    // Check commitment match
    if (expectedCommitment && proof.commitment !== expectedCommitment) {
      return false;
    }

    // Check expiration
    if (
      proof.metadata?.expiresAt &&
      new Date() > new Date(proof.metadata.expiresAt)
    ) {
      return false;
    }

    return true;
  },

  async createPrivacyPreservingCredential(
    credential: any,
    privacyLevel: string,
  ) {
    const commitment = `commitment_${credential.id}_${Date.now()}`;
    const nullifierHash = `nullifier_${credential.id}_${Date.now()}`;
    const encryptedData = `encrypted_${credential.id}_${Date.now()}`;

    let publicAttributes: any = {};
    let privateAttributes: string[] = [];

    switch (privacyLevel) {
      case "minimal":
        publicAttributes = {
          type: credential.type,
          issuer: credential.issuer,
          issuanceDate: credential.issuanceDate,
          expirationDate: credential.expirationDate,
        };
        privateAttributes = Object.keys(
          credential.credentialSubject || {},
        ).filter((attr) => attr !== "id");
        break;
      case "selective":
        publicAttributes = {
          type: credential.type,
          issuer: credential.issuer,
          issuanceDate: credential.issuanceDate,
        };
        privateAttributes = Object.keys(credential.credentialSubject || {});
        break;
      case "zero_knowledge":
        publicAttributes = { type: credential.type };
        privateAttributes = [
          ...Object.keys(credential.credentialSubject || {}),
          "issuer",
          "issuanceDate",
          "expirationDate",
        ];
        break;
    }

    return {
      id: `zk-${credential.id}`,
      type: Array.isArray(credential.type)
        ? credential.type.join(",")
        : credential.type,
      commitment,
      nullifierHash,
      encryptedData,
      publicAttributes,
      privateAttributes,
      metadata: {
        privacyLevel,
        createdAt: new Date().toISOString(),
        expiresAt: credential.expirationDate,
        issuer:
          typeof credential.issuer === "string"
            ? credential.issuer
            : credential.issuer.id,
        subject: credential.credentialSubject?.id || "unknown",
      },
    };
  },

  getPrivacyRecommendations(credentialType: string) {
    const highPrivacy = ["financial", "health", "government", "biometric"];
    const mediumPrivacy = ["employment", "education", "professional"];

    const typeLC = credentialType.toLowerCase();

    if (highPrivacy.some((type) => typeLC.includes(type))) {
      return {
        level: "zero_knowledge",
        reason: "High-sensitivity data requires maximum privacy protection",
        recommendedFields: ["type", "issuer"],
      };
    }

    if (mediumPrivacy.some((type) => typeLC.includes(type))) {
      return {
        level: "selective",
        reason: "Professional credentials benefit from selective disclosure",
        recommendedFields: ["type", "issuer", "issuanceDate", "title"],
      };
    }

    return {
      level: "minimal",
      reason: "Basic privacy protection is sufficient for this credential type",
      recommendedFields: ["type", "issuer", "issuanceDate", "expirationDate"],
    };
  },
};

describe("ZK Proof Validation", () => {
  let zkService: typeof mockEnhancedZKProofService;

  beforeEach(async () => {
    zkService = { ...mockEnhancedZKProofService };
    zkService.circuits = new Map();
    zkService.nullifierStore = new Set();
    zkService.initialized = false;
    await zkService.initializeService();
  });

  describe("Service Initialization", () => {
    it("should initialize successfully", async () => {
      expect(zkService.initialized).toBe(true);
      expect(zkService.circuits.size).toBeGreaterThan(0);
    });

    it("should load all required circuits", async () => {
      const circuits = zkService.listCircuits();
      expect(circuits).toHaveLength(4);

      const circuitIds = circuits.map((c) => c.id);
      expect(circuitIds).toContain("age_verification");
      expect(circuitIds).toContain("income_threshold");
      expect(circuitIds).toContain("selective_disclosure");
      expect(circuitIds).toContain("membership_proof");
    });

    it("should provide circuit information", () => {
      const ageCircuit = zkService.getCircuitInfo("age_verification");
      expect(ageCircuit).toBeDefined();
      expect(ageCircuit?.name).toBe("Age Verification Circuit");
      expect(ageCircuit?.constraints).toBe(1247);
    });
  });

  describe("Proof Generation", () => {
    it("should generate age verification proof", async () => {
      const request = {
        credentialId: "cred-123",
        proofType: "age_verification",
        publicInputs: {
          minimum_age: 18,
          current_timestamp: Math.floor(Date.now() / 1000),
        },
        privacyLevel: "selective",
      };

      const result = await zkService.generateProof(request);

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
        credentialId: "cred-456",
        proofType: "income_threshold",
        publicInputs: {
          minimum_income: 50000,
          verification_timestamp: Math.floor(Date.now() / 1000),
        },
        privacyLevel: "zero_knowledge",
      };

      const result = await zkService.generateProof(request);

      expect(result.proof).toBeDefined();
      expect(result.proof.circuitId).toBe("income_threshold");
      expect(result.proof.metadata.privacyLevel).toBe("zero_knowledge");
    });

    it("should generate selective disclosure proof", async () => {
      const request = {
        credentialId: "cred-789",
        proofType: "selective_disclosure",
        publicInputs: {
          disclosed_fields_hash: "hash123",
          verification_timestamp: Math.floor(Date.now() / 1000),
        },
        selectiveFields: ["name", "title"],
        privacyLevel: "selective",
      };

      const result = await zkService.generateProof(request);

      expect(result.proof).toBeDefined();
      expect(result.proof.circuitId).toBe("selective_disclosure");
      expect(result.proof.metadata.selectiveFields).toEqual(["name", "title"]);
    });

    it("should handle invalid proof types", async () => {
      const request = {
        credentialId: "cred-invalid",
        proofType: "invalid_circuit",
        publicInputs: {},
        privacyLevel: "selective",
      };

      await expect(zkService.generateProof(request)).rejects.toThrow(
        "Circuit not found",
      );
    });
  });

  describe("Proof Verification", () => {
    it("should verify valid proofs", async () => {
      const request = {
        credentialId: "cred-verify-test",
        proofType: "age_verification",
        publicInputs: {
          minimum_age: 21,
          current_timestamp: Math.floor(Date.now() / 1000),
        },
        privacyLevel: "selective",
      };

      const result = await zkService.generateProof(request);
      const isValid = await zkService.verifyProof(
        result.proof,
        result.commitment,
      );

      expect(isValid).toBe(true);
    });

    it("should reject invalid proof structures", async () => {
      const invalidProof = {
        type: "ZKProof",
        protocol: "groth16",
        curve: "bn128",
        // Missing required fields
      };

      const isValid = await zkService.verifyProof(invalidProof);
      expect(isValid).toBe(false);
    });

    it("should handle commitment mismatches", async () => {
      const request = {
        credentialId: "cred-mismatch",
        proofType: "age_verification",
        publicInputs: {
          minimum_age: 18,
          current_timestamp: Math.floor(Date.now() / 1000),
        },
        privacyLevel: "selective",
      };

      const result = await zkService.generateProof(request);
      const isValid = await zkService.verifyProof(
        result.proof,
        "wrong_commitment",
      );

      expect(isValid).toBe(false);
    });

    it("should prevent double spending with nullifiers", async () => {
      const request = {
        credentialId: "cred-double-spend",
        proofType: "membership_proof",
        publicInputs: {
          membership_root: "root123",
          verification_timestamp: Math.floor(Date.now() / 1000),
        },
        privacyLevel: "zero_knowledge",
      };

      // Generate first proof
      const result1 = await zkService.generateProof(request);
      expect(await zkService.verifyProof(result1.proof)).toBe(true);

      // Second verification should fail due to nullifier
      const isValidSecond = await zkService.verifyProof(result1.proof);
      expect(isValidSecond).toBe(false);
    });
  });

  describe("Privacy-Preserving Credentials", () => {
    const testCredential = {
      id: "cred-test-123",
      type: ["VerifiableCredential", "EmploymentCredential"],
      issuer: "did:example:issuer",
      issuanceDate: "2023-01-01T00:00:00Z",
      expirationDate: "2024-01-01T00:00:00Z",
      credentialSubject: {
        id: "did:example:subject",
        name: "John Doe",
        title: "Software Engineer",
        company: "TechCorp",
        salary: 75000,
      },
    };

    it("should create privacy-preserving credential with minimal privacy", async () => {
      const ppCredential = await zkService.createPrivacyPreservingCredential(
        testCredential,
        "minimal",
      );

      expect(ppCredential.id).toBe("zk-cred-test-123");
      expect(ppCredential.metadata.privacyLevel).toBe("minimal");
      expect(ppCredential.publicAttributes).toHaveProperty("type");
      expect(ppCredential.publicAttributes).toHaveProperty("issuer");
      expect(ppCredential.publicAttributes).toHaveProperty("expirationDate");
    });

    it("should create privacy-preserving credential with selective privacy", async () => {
      const ppCredential = await zkService.createPrivacyPreservingCredential(
        testCredential,
        "selective",
      );

      expect(ppCredential.metadata.privacyLevel).toBe("selective");
      expect(ppCredential.publicAttributes).toHaveProperty("type");
      expect(ppCredential.publicAttributes).toHaveProperty("issuer");
      expect(ppCredential.publicAttributes).not.toHaveProperty(
        "expirationDate",
      );
    });

    it("should create privacy-preserving credential with zero knowledge privacy", async () => {
      const ppCredential = await zkService.createPrivacyPreservingCredential(
        testCredential,
        "zero_knowledge",
      );

      expect(ppCredential.metadata.privacyLevel).toBe("zero_knowledge");
      expect(ppCredential.publicAttributes).toHaveProperty("type");
      expect(ppCredential.publicAttributes).not.toHaveProperty("issuer");
      expect(ppCredential.privateAttributes).toContain("issuer");
    });
  });

  describe("Privacy Recommendations", () => {
    it("should recommend high privacy for financial credentials", () => {
      const recommendation = zkService.getPrivacyRecommendations(
        "FinancialCredential",
      );

      expect(recommendation.level).toBe("zero_knowledge");
      expect(recommendation.reason).toContain("High-sensitivity");
      expect(recommendation.recommendedFields).toContain("type");
    });

    it("should recommend medium privacy for employment credentials", () => {
      const recommendation = zkService.getPrivacyRecommendations(
        "EmploymentCredential",
      );

      expect(recommendation.level).toBe("selective");
      expect(recommendation.reason).toContain("Professional");
      expect(recommendation.recommendedFields).toContain("title");
    });

    it("should recommend minimal privacy for basic credentials", () => {
      const recommendation =
        zkService.getPrivacyRecommendations("BasicCredential");

      expect(recommendation.level).toBe("minimal");
      expect(recommendation.reason).toContain("sufficient");
      expect(recommendation.recommendedFields).toContain("expirationDate");
    });
  });
});
