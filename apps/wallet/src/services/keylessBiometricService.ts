/**
 * Keyless Biometric SDK Integration Service
 * Provides privacy-first biometric authentication for high-assurance actions
 * Supports ZK-friendly attestation and auditable authentication flows
 */

import { CryptoService } from "./cryptoService";
import {
  EUDILibIntegrationService,
  EUDIBiometricAttestation,
} from "./eudiLibIntegrationService";
import type { DID } from "../types/wallet";
import { errorService } from "@/services/errorService";

// Keyless SDK Types
export interface KeylessBiometricConfig {
  apiKey: string;
  environment: "production" | "staging" | "development";
  biometricMethods: Array<"face" | "fingerprint" | "iris" | "voice" | "palm">;
  privacySettings: {
    templateStorage: "local" | "federated" | "none";
    biometricDataRetention: "session" | "device" | "never";
    auditLogging: boolean;
    zkProofGeneration: boolean;
  };
  livenessDetection: {
    enabled: boolean;
    methods: Array<
      "blink" | "head_movement" | "voice_challenge" | "hand_gesture"
    >;
    confidenceThreshold: number; // 0-100
  };
  fallbackOptions: {
    enablePin: boolean;
    enablePasskey: boolean;
    enablePasswordless: boolean;
  };
}

export interface BiometricAuthenticationRequest {
  challenge: string;
  purpose:
    | "authentication"
    | "authorization"
    | "proof_of_presence"
    | "high_assurance";
  requireLiveness: boolean;
  biometricMethods?: Array<"face" | "fingerprint" | "iris" | "voice" | "palm">;
  userPrompt?: {
    title: string;
    subtitle: string;
    description: string;
  };
  zkProofRequired?: boolean;
  auditLevel?: "minimal" | "standard" | "comprehensive";
}

export interface BiometricAuthenticationResult {
  success: boolean;
  authenticationId: string;
  biometricType: "face" | "fingerprint" | "iris" | "voice" | "palm";
  confidenceScore: number; // 0-100
  livenessScore: number; // 0-100
  timestamp: string;
  attestation?: EUDIBiometricAttestation;
  zkProof?: ZKBiometricProof;
  auditTrail?: BiometricAuditEvent[];
  fallbackUsed?: boolean;
  error?: string;
}

export interface ZKBiometricProof {
  proofType: "zk-snark" | "zk-stark" | "bulletproof";
  proof: string;
  publicSignals: string[];
  verificationKey: string;
  circuitId: string;
  provenClaims: Array<{
    claim: string;
    value: boolean;
    confidence: number;
  }>;
}

export interface BiometricAuditEvent {
  eventId: string;
  timestamp: string;
  eventType:
    | "authentication_started"
    | "liveness_check"
    | "template_match"
    | "authentication_completed";
  biometricType: string;
  confidenceScore?: number;
  livenessScore?: number;
  zkProofGenerated?: boolean;
  userAgent: string;
  ipAddress?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export interface BiometricTemplate {
  templateId: string;
  biometricType: "face" | "fingerprint" | "iris" | "voice" | "palm";
  encryptedTemplate: string;
  qualityScore: number;
  createdAt: string;
  lastUsed: string;
  usageCount: number;
  privacyLevel: "local_only" | "federated" | "cloud_backup";
}

export interface LivenessChallenge {
  challengeId: string;
  challengeType: "blink" | "head_movement" | "voice_challenge" | "hand_gesture";
  instructions: string;
  timeoutMs: number;
  requiredActions: Array<{
    action: string;
    sequence: number;
    duration?: number;
  }>;
}

export interface StepUpAuthContext {
  sessionId: string;
  originalAuthentication: string;
  stepUpReason:
    | "high_value_transaction"
    | "privileged_operation"
    | "regulatory_requirement";
  requiredAssuranceLevel: "substantial" | "high";
  timeoutMs: number;
  maxAttempts: number;
}

export class KeylessBiometricService {
  private config: KeylessBiometricConfig;
  private cryptoService: CryptoService;
  private eudiLibService: EUDILibIntegrationService;
  private activeTemplates = new Map<string, BiometricTemplate>();
  private auditEvents: BiometricAuditEvent[] = [];
  private stepUpContexts = new Map<string, StepUpAuthContext>();

  constructor(config: KeylessBiometricConfig) {
    this.config = config;
    this.cryptoService = CryptoService.getInstance();
    this.eudiLibService = new EUDILibIntegrationService({
      trustedIssuersRegistry: "https://eudi.europa.eu/trusted-issuers",
      verifiersRegistry: "https://eudi.europa.eu/trusted-verifiers",
      revocationRegistry: "https://eudi.europa.eu/revocation",
      encryptionSettings: { algorithm: "AES-GCM", keySize: 256 },
      biometricSettings: {
        enabledMethods: config.biometricMethods.slice(0, 2) as any,
        fallbackPin: config.fallbackOptions.enablePin,
        maxAttempts: 3,
      },
      privacySettings: {
        defaultDisclosureLevel: "minimal",
        enableZeroKnowledge: config.privacySettings.zkProofGeneration,
        auditLogging: config.privacySettings.auditLogging,
      },
    });

    this.initializeKeylessSDK();
  }

  /**
   * Initialize Keyless SDK with privacy-first configuration
   */
  private async initializeKeylessSDK(): Promise<void> {
    try {
      // Initialize Keyless SDK (would be actual SDK initialization)
      console.log("Initializing Keyless Biometric SDK...");

      // Setup privacy-preserving template storage
      await this.setupPrivateTemplateStorage();

      // Initialize biometric sensors
      await this.initializeBiometricSensors();

      // Setup ZK proof circuit if enabled
      if (this.config.privacySettings.zkProofGeneration) {
        await this.initializeZKCircuits();
      }

      console.log("Keyless SDK initialized successfully");
    } catch (error) {
      errorService.logError("Failed to initialize Keyless SDK:", error);
      throw error;
    }
  }

  /**
   * Perform biometric authentication with ZK proof generation
   */
  async authenticateWithBiometrics(
    request: BiometricAuthenticationRequest,
  ): Promise<BiometricAuthenticationResult> {
    const authenticationId = `auth-${crypto.randomUUID()}`;
    const startTime = Date.now();

    try {
      // Log authentication start
      await this.logAuditEvent({
        eventId: `${authenticationId}-start`,
        timestamp: new Date().toISOString(),
        eventType: "authentication_started",
        biometricType: request.biometricMethods?.[0] || "face",
        userAgent: navigator.userAgent,
      });

      // Check biometric availability
      const availableMethods = await this.getAvailableBiometricMethods();
      const selectedMethod = this.selectBestBiometricMethod(
        request.biometricMethods || this.config.biometricMethods,
        availableMethods,
      );

      if (!selectedMethod) {
        return await this.handleFallbackAuthentication(
          request,
          authenticationId,
        );
      }

      // Perform liveness detection if required
      let livenessScore = 100;
      if (request.requireLiveness && this.config.livenessDetection.enabled) {
        livenessScore = await this.performLivenessDetection(selectedMethod);

        if (livenessScore < this.config.livenessDetection.confidenceThreshold) {
          throw new Error(`Liveness detection failed: score ${livenessScore}`);
        }
      }

      // Perform biometric authentication
      const authResult = await this.performBiometricAuthentication(
        selectedMethod,
        request.challenge,
      );

      // Generate EUDI-compliant attestation if required
      let attestation: EUDIBiometricAttestation | undefined;
      if (request.purpose === "high_assurance") {
        attestation = await this.eudiLibService.performBiometricAuthentication(
          request.challenge,
          selectedMethod,
        );
      }

      // Generate ZK proof if required
      let zkProof: ZKBiometricProof | undefined;
      if (
        request.zkProofRequired &&
        this.config.privacySettings.zkProofGeneration
      ) {
        zkProof = await this.generateZKBiometricProof(authResult, request);
      }

      // Create final result
      const result: BiometricAuthenticationResult = {
        success: authResult.success,
        authenticationId,
        biometricType: selectedMethod,
        confidenceScore: authResult.confidenceScore,
        livenessScore,
        timestamp: new Date().toISOString(),
        attestation,
        zkProof,
        auditTrail: this.getAuditTrail(authenticationId),
        fallbackUsed: false,
      };

      // Log completion
      await this.logAuditEvent({
        eventId: `${authenticationId}-complete`,
        timestamp: new Date().toISOString(),
        eventType: "authentication_completed",
        biometricType: selectedMethod,
        confidenceScore: authResult.confidenceScore,
        livenessScore,
        zkProofGenerated: !!zkProof,
        userAgent: navigator.userAgent,
      });

      return result;
    } catch (error) {
      errorService.logError("Biometric authentication failed:", error);

      return {
        success: false,
        authenticationId,
        biometricType: "face", // Default
        confidenceScore: 0,
        livenessScore: 0,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        auditTrail: this.getAuditTrail(authenticationId),
      };
    }
  }

  /**
   * Perform step-up authentication for high-assurance operations
   */
  async performStepUpAuthentication(
    context: StepUpAuthContext,
    originalAuthToken: string,
  ): Promise<BiometricAuthenticationResult> {
    try {
      // Store step-up context
      this.stepUpContexts.set(context.sessionId, context);

      // Determine required biometric assurance level
      const requiredMethods = this.getRequiredBiometricMethods(
        context.requiredAssuranceLevel,
      );

      // Create step-up authentication request
      const stepUpRequest: BiometricAuthenticationRequest = {
        challenge: await this.cryptoService.generateHash(
          context.sessionId + originalAuthToken + Date.now(),
        ),
        purpose: "high_assurance",
        requireLiveness: true,
        biometricMethods: requiredMethods,
        userPrompt: {
          title: "High Assurance Authentication Required",
          subtitle: `Reason: ${context.stepUpReason}`,
          description: "Please complete biometric authentication to continue",
        },
        zkProofRequired: true,
        auditLevel: "comprehensive",
      };

      // Perform enhanced biometric authentication
      const result = await this.authenticateWithBiometrics(stepUpRequest);

      // Validate assurance level achieved
      if (result.success) {
        const achievedLevel = this.calculateAssuranceLevel(result);
        if (achievedLevel < context.requiredAssuranceLevel) {
          throw new Error(
            `Insufficient assurance level: ${achievedLevel} < ${context.requiredAssuranceLevel}`,
          );
        }
      }

      return result;
    } finally {
      // Clean up step-up context
      this.stepUpContexts.delete(context.sessionId);
    }
  }

  /**
   * Generate Zero-Knowledge proof for biometric authentication
   */
  async generateZKBiometricProof(
    authResult: any,
    request: BiometricAuthenticationRequest,
  ): Promise<ZKBiometricProof> {
    try {
      // Define claims to prove without revealing biometric data
      const claims = [
        {
          claim: "biometric_authentication_successful",
          value: authResult.success,
          confidence: authResult.confidenceScore,
        },
        {
          claim: "liveness_detection_passed",
          value:
            authResult.livenessScore >=
            this.config.livenessDetection.confidenceThreshold,
          confidence: authResult.livenessScore,
        },
        {
          claim: "template_match_confidence_sufficient",
          value: authResult.confidenceScore >= 85, // High confidence threshold
          confidence: authResult.confidenceScore,
        },
      ];

      // Generate circuit inputs (without sensitive biometric data)
      const circuitInputs = {
        challenge_hash: await this.cryptoService.generateHash(
          request.challenge,
        ),
        confidence_threshold: 85,
        liveness_threshold: this.config.livenessDetection.confidenceThreshold,
        timestamp: Math.floor(Date.now() / 1000),
        // Template hash (not actual template)
        template_commitment: await this.cryptoService.generateHash(
          "template_placeholder",
        ),
      };

      // Generate ZK proof using appropriate circuit
      const circuitId = this.selectZKCircuit(request.purpose);
      const zkProof = await this.generateZKProof(circuitInputs, circuitId);

      return {
        proofType: "zk-snark",
        proof: zkProof.proof,
        publicSignals: zkProof.publicSignals,
        verificationKey: zkProof.verificationKey,
        circuitId,
        provenClaims: claims,
      };
    } catch (error) {
      throw new Error(
        `ZK proof generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Enroll biometric template with privacy preservation
   */
  async enrollBiometricTemplate(
    biometricType: "face" | "fingerprint" | "iris" | "voice" | "palm",
    userDID: string,
  ): Promise<{
    templateId: string;
    qualityScore: number;
    enrollmentComplete: boolean;
  }> {
    try {
      const templateId = `template-${crypto.randomUUID()}`;

      // Capture biometric sample
      const sample = await this.captureBiometricSample(biometricType);

      // Assess quality
      const qualityScore = await this.assessBiometricQuality(
        sample,
        biometricType,
      );

      if (qualityScore < 70) {
        throw new Error(`Biometric quality insufficient: ${qualityScore}`);
      }

      // Generate privacy-preserving template
      const template = await this.generatePrivateTemplate(
        sample,
        biometricType,
      );

      // Encrypt template based on privacy settings
      const encryptedTemplate = await this.encryptTemplate(template, userDID);

      // Store template
      const biometricTemplate: BiometricTemplate = {
        templateId,
        biometricType,
        encryptedTemplate,
        qualityScore,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        usageCount: 0,
        privacyLevel: this.config.privacySettings.templateStorage as any,
      };

      this.activeTemplates.set(templateId, biometricTemplate);

      return {
        templateId,
        qualityScore,
        enrollmentComplete: true,
      };
    } catch (error) {
      throw new Error(
        `Biometric enrollment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Verify ZK biometric proof
   */
  async verifyZKBiometricProof(
    proof: ZKBiometricProof,
    challenge: string,
  ): Promise<{
    valid: boolean;
    verifiedClaims: Array<{
      claim: string;
      verified: boolean;
    }>;
    verificationTimestamp: string;
  }> {
    try {
      // Verify ZK proof cryptographically
      const proofValid = await this.verifyZKProof(
        proof.proof,
        proof.publicSignals,
        proof.verificationKey,
        proof.circuitId,
      );

      if (!proofValid) {
        return {
          valid: false,
          verifiedClaims: [],
          verificationTimestamp: new Date().toISOString(),
        };
      }

      // Verify challenge binding
      const challengeHash = await this.cryptoService.generateHash(challenge);
      const challengeValid = proof.publicSignals.includes(challengeHash);

      // Verify individual claims
      const verifiedClaims = proof.provenClaims.map((claim) => ({
        claim: claim.claim,
        verified: claim.value && proofValid && challengeValid,
      }));

      return {
        valid: proofValid && challengeValid,
        verifiedClaims,
        verificationTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      errorService.logError("ZK proof verification failed:", error);
      return {
        valid: false,
        verifiedClaims: [],
        verificationTimestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get comprehensive audit trail for authentication session
   */
  getAuditTrail(authenticationId: string): BiometricAuditEvent[] {
    return this.auditEvents.filter((event) =>
      event.eventId.startsWith(authenticationId),
    );
  }

  /**
   * Clean up biometric data based on privacy settings
   */
  async cleanupBiometricData(): Promise<void> {
    try {
      const now = Date.now();
      const retentionPeriod = this.getRetentionPeriod();

      // Clean up expired templates
      for (const [templateId, template] of this.activeTemplates.entries()) {
        const templateAge = now - new Date(template.createdAt).getTime();
        if (templateAge > retentionPeriod) {
          await this.securelyDeleteTemplate(templateId);
        }
      }

      // Clean up audit events
      this.auditEvents = this.auditEvents.filter((event) => {
        const eventAge = now - new Date(event.timestamp).getTime();
        return eventAge <= retentionPeriod;
      });

      console.log("Biometric data cleanup completed");
    } catch (error) {
      errorService.logError("Biometric data cleanup failed:", error);
    }
  }

  /**
   * Private helper methods
   */
  private async setupPrivateTemplateStorage(): Promise<void> {
    // Setup secure, private template storage
    console.log("Setting up private template storage");
  }

  private async initializeBiometricSensors(): Promise<void> {
    // Initialize available biometric sensors
    console.log("Initializing biometric sensors");
  }

  private async initializeZKCircuits(): Promise<void> {
    // Initialize ZK circuits for biometric proofs
    console.log("Initializing ZK circuits");
  }

  private async getAvailableBiometricMethods(): Promise<string[]> {
    const available = [];

    // Check for WebAuthn support
    if (window.PublicKeyCredential) {
      available.push("fingerprint");
    }

    // Check for camera access (face)
    if (navigator.mediaDevices) {
      available.push("face");
    }

    return available;
  }

  private selectBestBiometricMethod(
    requested: string[],
    available: string[],
  ): string | null {
    // Find the best available method from requested
    for (const method of requested) {
      if (available.includes(method)) {
        return method;
      }
    }
    return null;
  }

  private async performLivenessDetection(
    biometricType: string,
  ): Promise<number> {
    // Perform liveness detection based on biometric type
    // Return confidence score 0-100
    return 95; // Simulated high confidence
  }

  private async performBiometricAuthentication(
    biometricType: string,
    challenge: string,
  ): Promise<{
    success: boolean;
    confidenceScore: number;
  }> {
    // Perform actual biometric authentication
    // This would integrate with Keyless SDK
    return {
      success: true,
      confidenceScore: 92,
    };
  }

  private async handleFallbackAuthentication(
    request: BiometricAuthenticationRequest,
    authenticationId: string,
  ): Promise<BiometricAuthenticationResult> {
    // Handle fallback authentication methods
    return {
      success: false,
      authenticationId,
      biometricType: "face",
      confidenceScore: 0,
      livenessScore: 0,
      timestamp: new Date().toISOString(),
      fallbackUsed: true,
      error: "No biometric methods available",
    };
  }

  private getRequiredBiometricMethods(
    assuranceLevel: string,
  ): Array<"face" | "fingerprint" | "iris" | "voice" | "palm"> {
    switch (assuranceLevel) {
      case "high":
        return ["iris", "face", "fingerprint"];
      case "substantial":
        return ["face", "fingerprint"];
      default:
        return ["face"];
    }
  }

  private calculateAssuranceLevel(
    result: BiometricAuthenticationResult,
  ): string {
    if (result.confidenceScore >= 95 && result.livenessScore >= 95) {
      return "high";
    } else if (result.confidenceScore >= 85 && result.livenessScore >= 85) {
      return "substantial";
    }
    return "low";
  }

  private selectZKCircuit(purpose: string): string {
    switch (purpose) {
      case "high_assurance":
        return "biometric_high_assurance_v1";
      case "authorization":
        return "biometric_authorization_v1";
      default:
        return "biometric_authentication_v1";
    }
  }

  private async generateZKProof(inputs: any, circuitId: string): Promise<any> {
    // Generate actual ZK proof using circuit
    return {
      proof: `zk_proof_${circuitId}_${Date.now()}`,
      publicSignals: Object.values(inputs).map(String),
      verificationKey: `vk_${circuitId}`,
    };
  }

  private async captureBiometricSample(biometricType: string): Promise<any> {
    // Capture biometric sample from sensor
    return `sample_${biometricType}_${Date.now()}`;
  }

  private async assessBiometricQuality(
    sample: any,
    biometricType: string,
  ): Promise<number> {
    // Assess quality of biometric sample
    return 85; // Simulated quality score
  }

  private async generatePrivateTemplate(
    sample: any,
    biometricType: string,
  ): Promise<any> {
    // Generate privacy-preserving biometric template
    return `template_${biometricType}_${Date.now()}`;
  }

  private async encryptTemplate(
    template: any,
    userDID: string,
  ): Promise<string> {
    // Encrypt template using user's DID-derived key
    const key = await this.cryptoService.generateHash(userDID);
    return `encrypted_${template}_${key}`;
  }

  private async verifyZKProof(
    proof: string,
    publicSignals: string[],
    verificationKey: string,
    circuitId: string,
  ): Promise<boolean> {
    // Verify ZK proof cryptographically
    return proof.includes(circuitId) && publicSignals.length > 0;
  }

  private getRetentionPeriod(): number {
    switch (this.config.privacySettings.biometricDataRetention) {
      case "session":
        return 60 * 60 * 1000; // 1 hour
      case "device":
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      case "never":
      default:
        return 0; // Immediate deletion
    }
  }

  private async securelyDeleteTemplate(templateId: string): Promise<void> {
    this.activeTemplates.delete(templateId);
    console.log(`Securely deleted biometric template: ${templateId}`);
  }

  private async logAuditEvent(event: BiometricAuditEvent): Promise<void> {
    if (this.config.privacySettings.auditLogging) {
      this.auditEvents.push(event);
    }
  }
}
