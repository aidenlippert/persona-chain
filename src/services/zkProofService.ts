/**
 * Zero-Knowledge Proof Service for Persona Wallet
 * Handles ZK proof generation, validation, and credential management
 */

// import { CryptoService } from './cryptoService';
// import { StorageService } from './storageService';
// import { PerformanceService } from './performanceService';
import type {
  ZKProof,
  ZKCredential,
  // ZKProofRequest,
  VerifiableCredential,
} from "../types/wallet";

export interface ZKProofOptions {
  protocol: ZKProof["protocol"];
  curve: ZKProof["curve"];
  circuitId?: string;
  privacy_level: "selective" | "zero_knowledge";
  selective_fields?: string[];
}

export interface ZKProofGenerationResult {
  proof: ZKProof;
  commitment: string;
  nullifier: string;
  publicSignals: string[];
}

export class ZKProofService {
  private storageService: any;
  private cryptoService: any;

  constructor() {
    // Initialize after imports to avoid circular dependencies
    setTimeout(() => {
      try {
        this.storageService = require("./storageService").storageService;
        this.cryptoService = require("./cryptoService").cryptoService;
      } catch (error) {
        console.warn('Failed to initialize ZK service dependencies:', error);
        // Use fallback implementations
        this.initializeFallbackServices();
      }
    }, 0);
  }

  /**
   * Initialize fallback services when dependencies fail to load
   */
  private initializeFallbackServices(): void {
    this.cryptoService = {
      generateHash: async (data: string): Promise<Uint8Array> => {
        // Simple fallback hash using Web Crypto API
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        return new Uint8Array(hashBuffer);
      }
    };
    
    this.storageService = {
      storeZKCredential: async () => {
        console.warn('Using fallback storage - ZK credential not persisted');
      },
      getZKCredentials: async () => {
        console.warn('Using fallback storage - returning empty array');
        return [];
      },
      storeZKProof: async () => {
        console.warn('Using fallback storage - ZK proof not persisted');
      }
    };
  }

  /**
   * Generate a zero-knowledge proof for a credential (ENHANCED)
   */
  async generateProof(
    credential: VerifiableCredential,
    proofType:
      | "age_verification"
      | "income_threshold"
      | "employment_status"
      | "selective_disclosure"
      | "membership_proof",
    publicInputs: any[],
    selectiveFields?: string[],
  ): Promise<ZKProof> {
    try {
      const circuitId = this.getCircuitId(proofType);

      // Convert to ZK credential for optimized processing
      const zkCredential = await this.createZKCredential(
        credential,
        "",
        new Uint8Array(),
      );

      // Enhanced proof generation with selective disclosure
      const proof = await this.generateEnhancedProof(
        zkCredential,
        circuitId,
        publicInputs,
        selectiveFields,
      );

      // Store proof for future reference
      if (this.storageService?.storeZKProof) {
        try {
          await this.storageService.storeZKProof({
            id: `proof-${Date.now()}`,
            proofType,
            circuitId,
            proof,
            credential: zkCredential,
            publicInputs,
            selectiveFields,
            created: new Date().toISOString(),
          });
        } catch (error) {
          console.warn('Failed to store ZK proof:', error);
        }
      }

      return proof;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ ZK proof generation failed:", message);
      throw new Error(`ZK proof generation failed: ${message}`);
    }
  }

  /**
   * Enhanced proof generation with selective disclosure
   */
  private async generateEnhancedProof(
    zkCredential: ZKCredential,
    circuitId: string,
    publicInputs: any[],
    selectiveFields?: string[],
  ): Promise<ZKProof> {
    // Generate witness with selective field disclosure
    const witness = await this.generateSelectiveWitness(
      zkCredential,
      circuitId,
      selectiveFields,
    );

    // Create circuit-specific proof
    const circuitProof = await this.generateCircuitProof(
      circuitId,
      witness,
      publicInputs,
    );

    // Create commitment for selective disclosure
    const commitment = await this.generateSelectiveCommitment(
      zkCredential,
      selectiveFields,
    );

    // Generate nullifier for uniqueness
    const nullifier = await this.generateNullifier(zkCredential.id, circuitId);

    const zkProof: ZKProof = {
      type: "ZKProof",
      protocol: "groth16",
      curve: "bn128",
      proof: circuitProof,
      publicSignals: publicInputs.map(String),
      verificationKey: await this.getVerificationKey(circuitId),
      commitment,
      nullifier,
      circuitId,
      created: new Date().toISOString(),
    };

    return zkProof;
  }

  /**
   * Generate selective disclosure witness
   */
  private async generateSelectiveWitness(
    zkCredential: ZKCredential,
    circuitId: string,
    selectiveFields?: string[],
  ): Promise<Uint8Array> {
    const credentialData = JSON.stringify(zkCredential);

    // If selective fields specified, only include those
    let witnessData = credentialData;
    if (selectiveFields && selectiveFields.length > 0) {
      const selectiveData: any = {
        id: zkCredential.id,
        type: zkCredential.type,
      };

      // Extract only selected fields
      selectiveFields.forEach((field) => {
        if (field.includes(".")) {
          const parts = field.split(".");
          let source = zkCredential as any;
          let target = selectiveData;

          for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {};
            target = target[parts[i]];
            source = source?.[parts[i]];
          }

          if (source && parts.length > 0) {
            target[parts[parts.length - 1]] = source[parts[parts.length - 1]];
          }
        } else {
          selectiveData[field] = (zkCredential as any)[field];
        }
      });

      witnessData = JSON.stringify(selectiveData);
    }

    // Ensure cryptoService is available
    if (!this.cryptoService) {
      this.initializeFallbackServices();
    }

    const hash = await this.cryptoService.generateHash(
      witnessData + circuitId,
    );
    return new Uint8Array(hash);
  }

  /**
   * Generate circuit-specific proof
   */
  private async generateCircuitProof(
    circuitId: string,
    witness: Uint8Array,
    publicInputs: any[],
  ): Promise<any> {
    // Simulate circuit proof generation
    // In a real implementation, this would use actual ZK libraries like snarkjs
    const proofData = {
      a: Array.from(witness.slice(0, 32))
        .map((b) => b.toString(16))
        .join(""),
      b: Array.from(witness.slice(32, 64))
        .map((b) => b.toString(16))
        .join(""),
      c: Array.from(witness.slice(64, 96))
        .map((b) => b.toString(16))
        .join(""),
      h: Array.from(witness.slice(96, 128))
        .map((b) => b.toString(16))
        .join(""),
      k: Array.from(witness.slice(128, 160))
        .map((b) => b.toString(16))
        .join(""),
    };

    return {
      circuit: circuitId,
      proof: proofData,
      publicSignals: publicInputs.map((input) =>
        typeof input === "string" ? input : JSON.stringify(input),
      ),
    };
  }

  /**
   * Generate selective commitment
   */
  private async generateSelectiveCommitment(
    zkCredential: ZKCredential,
    selectiveFields?: string[],
  ): Promise<string> {
    const commitmentData = selectiveFields
      ? selectiveFields
          .map((field) => `${field}:${this.getFieldValue(zkCredential, field)}`)
          .join("|")
      : JSON.stringify(zkCredential);

    // Ensure cryptoService is available
    if (!this.cryptoService) {
      this.initializeFallbackServices();
    }

    const hash = await this.cryptoService.generateHash(commitmentData);
    return Array.from(hash as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Get field value from credential
   */
  private getFieldValue(credential: any, fieldPath: string): any {
    const parts = fieldPath.split(".");
    let value = credential;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Generate nullifier for uniqueness
   */
  private async generateNullifier(
    credentialId: string,
    circuitId: string,
  ): Promise<string> {
    const nullifierInput = `${credentialId}:${circuitId}:${Date.now()}`;
    
    // Ensure cryptoService is available
    if (!this.cryptoService) {
      this.initializeFallbackServices();
    }
    
    const hash = await this.cryptoService.generateHash(nullifierInput);
    return Array.from(hash as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Get verification key for circuit
   */
  private async getVerificationKey(circuitId: string): Promise<any> {
    // In a real implementation, this would load the actual verification key
    return {
      circuit: circuitId,
      alpha: "verification_key_alpha",
      beta: "verification_key_beta",
      gamma: "verification_key_gamma",
      delta: "verification_key_delta",
      ic: ["verification_key_ic"],
    };
  }

  /**
   * Verify ZK proof
   */
  async verifyProof(
    proof: ZKProof,
    expectedCommitment?: string,
  ): Promise<boolean> {
    try {
      // Verify proof structure
      if (!proof.proof || !proof.publicSignals || !proof.commitment) {
        return false;
      }

      // Verify commitment if provided
      if (expectedCommitment && proof.commitment !== expectedCommitment) {
        return false;
      }

      // Note: Expiration check removed as ZKProof doesn't have metadata property

      // Verify nullifier uniqueness (check against stored nullifiers)
      const isNullifierUsed = await this.checkNullifierUsed(proof.nullifier);
      if (isNullifierUsed) {
        return false;
      }

      // Simulate circuit verification
      // In a real implementation, this would use the verification key
      const verificationResult = await this.verifyCircuitProof(
        proof.proof,
        proof.publicSignals,
        proof.verificationKey,
      );

      if (verificationResult) {
        // Store nullifier to prevent reuse
        await this.storeNullifier(proof.nullifier);
      }

      return verificationResult;
    } catch (error) {
      console.error("ZK proof verification failed:", error);
      return false;
    }
  }

  /**
   * Verify circuit proof
   */
  private async verifyCircuitProof(
    proof: any,
    publicInputs: any[],
    verificationKey: any,
  ): Promise<boolean> {
    // Simulate verification process
    // In a real implementation, this would use snarkjs or similar
    return (
      proof &&
      publicInputs &&
      verificationKey &&
      proof.circuit &&
      proof.publicSignals
    );
  }

  /**
   * Check if nullifier has been used
   */
  private async checkNullifierUsed(nullifier: string): Promise<boolean> {
    try {
      // Check in storage (simplified)
      const usedNullifiers = JSON.parse(
        localStorage.getItem("used_nullifiers") || "[]",
      );
      return usedNullifiers.includes(nullifier);
    } catch (error) {
      return false;
    }
  }

  /**
   * Store nullifier to prevent reuse
   */
  private async storeNullifier(nullifier: string): Promise<void> {
    try {
      const usedNullifiers = JSON.parse(
        localStorage.getItem("used_nullifiers") || "[]",
      );
      usedNullifiers.push(nullifier);
      localStorage.setItem("used_nullifiers", JSON.stringify(usedNullifiers));
    } catch (error) {
      console.error("Failed to store nullifier:", error);
    }
  }

  /**
   * Generate proof for age verification
   */
  async generateAgeProof(
    credential: VerifiableCredential,
    minimumAge: number,
  ): Promise<ZKProof> {
    return this.generateProof(
      credential,
      "age_verification",
      [minimumAge],
      ["credentialSubject.dateOfBirth"],
    );
  }

  /**
   * Generate proof for income threshold
   */
  async generateIncomeProof(
    credential: VerifiableCredential,
    minimumIncome: number,
  ): Promise<ZKProof> {
    return this.generateProof(
      credential,
      "income_threshold",
      [minimumIncome],
      ["credentialSubject.incomeData.projectedYearlyIncome"],
    );
  }

  /**
   * Generate proof for employment status
   */
  async generateEmploymentProof(
    credential: VerifiableCredential,
    requiredEmployer?: string,
  ): Promise<ZKProof> {
    return this.generateProof(
      credential,
      "employment_status",
      [requiredEmployer || ""],
      [
        "credentialSubject.employment.company",
        "credentialSubject.employment.isCurrent",
      ],
    );
  }

  /**
   * Create a ZK credential from a regular credential (ENHANCED)
   */
  async createZKCredential(
    credential: VerifiableCredential,
    holder: string,
    _privateKey: Uint8Array,
  ): Promise<ZKCredential> {
    try {
      const zkCredential: ZKCredential = {
        id: `zk-${credential.id}`,
        type: credential.type.join(","),
        // Note: holder property removed from ZKCredential interface
        circuitId: "selective_disclosure",
        commitment: "",
        nullifierHash: "",
        metadata: {
          credentialType: credential.type[credential.type.length - 1],
          source:
            typeof credential.issuer === "string"
              ? credential.issuer
              : credential.issuer.id,
          commitment: "",
          nullifierHash: "",
          expiresAt: credential.expirationDate,
          privacy_level: "zero_knowledge" as const,
        },
        created: new Date().toISOString(),
      };

      // Generate enhanced commitment with all credential data
      zkCredential.commitment =
        await this.generateSelectiveCommitment(zkCredential);

      // Store the ZK credential
      if (this.storageService?.storeZKCredential) {
        try {
          await this.storageService.storeZKCredential(zkCredential);
        } catch (error) {
          console.warn('Failed to store ZK credential:', error);
        }
      }

      console.log("✅ Enhanced ZK credential created:", zkCredential.id);
      return zkCredential;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`ZK credential creation failed: ${message}`);
    }
  }

  /**
   * Get circuit ID for proof type
   */
  private getCircuitId(proofType: string): string {
    const circuitMap: Record<string, string> = {
      age_verification: "age_proof_circuit",
      income_threshold: "income_proof_circuit",
      employment_status: "employment_proof_circuit",
      selective_disclosure: "selective_disclosure_circuit",
      membership_proof: "membership_proof_circuit",
    };

    return circuitMap[proofType] || "default_circuit";
  }

  /**
   * Get stored ZK credentials
   */
  async getZKCredentials(): Promise<ZKCredential[]> {
    try {
      if (!this.storageService?.getZKCredentials) {
        console.warn('Storage service not available for ZK credentials');
        return [];
      }
      return (await this.storageService.getZKCredentials()) || [];
    } catch (error) {
      console.error("Failed to get ZK credentials:", error);
      return [];
    }
  }

  /**
   * Check if ZK proofs are supported for a credential type
   */
  isZKProofSupported(credentialType: string): boolean {
    const supportedTypes = [
      "IdentityCredential",
      "DeveloperCredential",
      "ProfessionalCredential",
      "EmploymentCredential",
      "IncomeCredential",
      "AssetCredential",
      "EducationCredential",
      "MembershipCredential",
    ];

    return supportedTypes.some((type) => credentialType.includes(type));
  }

  /**
   * Get privacy level recommendations for a credential
   */
  getPrivacyRecommendations(credentialType: string): {
    level: "high" | "medium" | "low";
    reason: string;
  } {
    const highSensitivity = [
      "FinancialCredential",
      "HealthCredential",
      "GovernmentCredential",
      "IncomeCredential",
      "AssetCredential",
    ];

    const mediumSensitivity = [
      "EmploymentCredential",
      "EducationCredential",
      "ProfessionalCredential",
    ];

    if (highSensitivity.some((type) => credentialType.includes(type))) {
      return {
        level: "high",
        reason:
          "High-sensitivity credential requires maximum privacy protection",
      };
    }

    if (mediumSensitivity.some((type) => credentialType.includes(type))) {
      return {
        level: "medium",
        reason: "Professional credential should use selective disclosure",
      };
    }

    return {
      level: "low",
      reason: "Selective disclosure is recommended for most credential types",
    };
  }
}

// Export singleton instance
export const zkProofService = new ZKProofService();
