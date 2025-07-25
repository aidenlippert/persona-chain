/**
 * Mock implementation for enhancedZKProofService
 * Used in tests to avoid actual ZK proof computation
 */

export const enhancedZKProofService = {
  generateProof: async (request: any) => {
    // Mock error for invalid proof types
    const validProofTypes = ["age_verification", "income_threshold", "selective_disclosure", "membership_proof", "identity_verification"];
    if (!validProofTypes.includes(request.proofType)) {
      throw new Error(`Invalid proof type: ${request.proofType}`);
    }
    
    return {
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
  };
  },

  verifyProof: async (proof: any, commitment?: string) => {
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
  },

  createPrivacyPreservingCredential: async (credential: any, privacyLevel: string) => ({
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
  }),

  getPrivacyRecommendations: (credentialType: string) => ({
    level: credentialType.includes("Financial") ? "zero_knowledge" 
          : credentialType.includes("Employment") ? "selective" 
          : "minimal",
    reason: `Privacy level recommended based on ${credentialType} sensitivity`,
    recommendedFields: ["type", "issuer"],
  }),

  listCircuits: () => [
    { id: "age_verification", name: "Age Verification Circuit", constraints: 1000, description: "Verifies age without revealing exact date" },
    { id: "income_threshold", name: "Income Threshold Circuit", constraints: 1500, description: "Verifies income meets threshold" },
    { id: "selective_disclosure", name: "Selective Disclosure Circuit", constraints: 2000, description: "Reveals selected fields only" },
    { id: "membership_proof", name: "Membership Proof Circuit", constraints: 800, description: "Proves membership without revealing identity" },
    { id: "identity_verification", name: "Identity Verification Circuit", constraints: 2500, description: "Verifies identity with zero knowledge" },
  ],

  getCircuitInfo: (circuitId: string) => {
    const circuits = enhancedZKProofService.listCircuits();
    return circuits.find(c => c.id === circuitId) || null;
  },
};