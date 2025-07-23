/**
 * Issuer Directory Service
 * Provides intelligent issuer discovery and credential suggestions
 * Implements EUDI ARF guidelines for trusted issuer recommendations
 */

import { EUDILibIntegrationService } from "./eudiLibIntegrationService";
import { StorageService } from "./storageService";
import type { VerifiableCredential, WalletCredential } from "../types/wallet";
import { errorService } from "@/services/errorService";

export interface IssuerDirectoryEntry {
  did: string;
  name: string;
  displayName: {
    [locale: string]: string;
  };
  description: {
    [locale: string]: string;
  };
  logo?: {
    uri: string;
    altText?: string;
  };
  country: string;
  region: "EU" | "EEA" | "INTERNATIONAL";
  trustLevel: "high" | "substantial" | "low";
  certificationStatus:
    | "eidas_qualified"
    | "eudi_certified"
    | "member_state_approved"
    | "self_declared";
  complianceFrameworks: string[];
  contactInfo: {
    website?: string;
    email?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  supportedCredentials: IssuerCredentialInfo[];
  issuanceEndpoint: string;
  authorizationEndpoint?: string;
  metadataEndpoint: string;
  supportedProtocols: Array<"openid4vci" | "aries" | "dif_pe" | "eudi_arf">;
  validityPeriod: {
    notBefore: string;
    notAfter: string;
  };
  reputation: {
    trustScore: number; // 0-100
    issuedCredentials: number;
    verifiedIssuances: number;
    userRatings: {
      average: number;
      count: number;
    };
  };
  categories: string[];
  keywords: string[];
  lastUpdated: string;
}

export interface IssuerCredentialInfo {
  type: string;
  schema: string;
  name: {
    [locale: string]: string;
  };
  description: {
    [locale: string]: string;
  };
  icon?: string;
  category:
    | "identity"
    | "professional"
    | "educational"
    | "financial"
    | "health"
    | "travel"
    | "other";
  requiredDocuments?: string[];
  estimatedIssuanceTime: string; // ISO 8601 duration
  fees?: {
    amount: number;
    currency: string;
    description: string;
  };
  eligibilityCriteria: {
    [locale: string]: string;
  };
  privacyFeatures: {
    selectiveDisclosure: boolean;
    zeroKnowledge: boolean;
    revocable: boolean;
  };
  validityPeriod?: string; // ISO 8601 duration
}

export interface CredentialGap {
  category: string;
  type: string;
  name: string;
  description: string;
  urgency: "high" | "medium" | "low";
  suggestedIssuers: IssuerDirectoryEntry[];
  reasoning: string;
  benefits: string[];
}

export interface IssuerRecommendation {
  issuer: IssuerDirectoryEntry;
  credentialType: string;
  matchScore: number; // 0-100
  reasoning: string[];
  estimatedValue: number; // 0-100
  trustFactors: {
    certificationLevel: number;
    userRating: number;
    regionAlignment: number;
    protocolSupport: number;
  };
}

export interface UserProfile {
  location: {
    country: string;
    region: string;
  };
  preferences: {
    languages: string[];
    privacyLevel: "minimal" | "selective" | "full";
    preferredProtocols: string[];
    trustedRegions: string[];
  };
  credentialHistory: {
    categories: string[];
    recentIssuers: string[];
    frequentTypes: string[];
  };
  goals: {
    targetCredentials: string[];
    useCases: string[];
    timeframe: string;
  };
}

export class IssuerDirectoryService {
  private eudiLibService: EUDILibIntegrationService;
  private storageService: StorageService;
  private directoryCache = new Map<string, IssuerDirectoryEntry>();
  private lastCacheUpdate = 0;
  private cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.eudiLibService = new EUDILibIntegrationService({
      trustedIssuersRegistry: "https://eudi.europa.eu/trusted-issuers",
      verifiersRegistry: "https://eudi.europa.eu/trusted-verifiers",
      revocationRegistry: "https://eudi.europa.eu/revocation",
      encryptionSettings: { algorithm: "AES-GCM", keySize: 256 },
      biometricSettings: {
        enabledMethods: ["face", "fingerprint"],
        fallbackPin: true,
        maxAttempts: 3,
      },
      privacySettings: {
        defaultDisclosureLevel: "selective",
        enableZeroKnowledge: true,
        auditLogging: true,
      },
    });
    this.storageService = StorageService.getInstance();
  }

  /**
   * Load and cache issuer directory from multiple sources
   */
  async loadIssuerDirectory(forceRefresh = false): Promise<void> {
    const now = Date.now();

    if (!forceRefresh && now - this.lastCacheUpdate < this.cacheExpiryMs) {
      return; // Use cached data
    }

    try {
      // Load from EUDI trust registry
      await this.eudiLibService.loadTrustRegistry();

      // Load from additional sources
      const [eudiIssuers, memberStateIssuers, internationalIssuers] =
        await Promise.all([
          this.loadEUDIIssuers(),
          this.loadMemberStateIssuers(),
          this.loadInternationalIssuers(),
        ]);

      // Merge and deduplicate
      const allIssuers = [
        ...eudiIssuers,
        ...memberStateIssuers,
        ...internationalIssuers,
      ];
      const uniqueIssuers = this.deduplicateIssuers(allIssuers);

      // Update cache
      this.directoryCache.clear();
      uniqueIssuers.forEach((issuer) => {
        this.directoryCache.set(issuer.did, issuer);
      });

      this.lastCacheUpdate = now;
      console.log(`Loaded ${uniqueIssuers.length} issuers into directory`);
    } catch (error) {
      errorService.logError("Failed to load issuer directory:", error);
      throw error;
    }
  }

  /**
   * Analyze user's credential portfolio and suggest missing credentials
   */
  async analyzeCredentialGaps(
    userProfile?: UserProfile,
  ): Promise<CredentialGap[]> {
    try {
      await this.loadIssuerDirectory();

      const existingCredentials = await this.storageService.getCredentials();
      const existingTypes = new Set(
        existingCredentials.map((cred) => {
          const vc = cred.credential as VerifiableCredential;
          return vc.type[vc.type.length - 1]; // Get the most specific type
        }),
      );

      const gaps: CredentialGap[] = [];

      // Analyze essential identity credentials
      if (
        !existingTypes.has("IdentityCredential") &&
        !existingTypes.has("EUIdentityCredential")
      ) {
        gaps.push({
          category: "identity",
          type: "EUIdentityCredential",
          name: "Digital Identity",
          description: "Official digital identity credential for EU citizens",
          urgency: "high",
          suggestedIssuers: this.findIssuersByCredentialType(
            "EUIdentityCredential",
          ),
          reasoning:
            "Digital identity is fundamental for accessing other services",
          benefits: [
            "Access to government services",
            "Age verification",
            "Identity proof for private services",
            "EU-wide recognition",
          ],
        });
      }

      // Analyze professional credentials
      if (!this.hasCredentialCategory(existingTypes, "professional")) {
        gaps.push({
          category: "professional",
          type: "ProfessionalQualificationCredential",
          name: "Professional Qualification",
          description:
            "Proof of professional qualifications and certifications",
          urgency: "medium",
          suggestedIssuers: this.findIssuersByCategory("professional"),
          reasoning:
            "Professional credentials enable career opportunities and service provision",
          benefits: [
            "Professional recognition",
            "Cross-border mobility",
            "Service authorization",
            "Skills verification",
          ],
        });
      }

      // Analyze educational credentials
      if (!this.hasCredentialCategory(existingTypes, "educational")) {
        gaps.push({
          category: "educational",
          type: "EducationCredential",
          name: "Educational Qualification",
          description: "Academic degrees and educational certifications",
          urgency: "medium",
          suggestedIssuers: this.findIssuersByCategory("educational"),
          reasoning:
            "Educational credentials are essential for academic and professional progression",
          benefits: [
            "Academic recognition",
            "Employment opportunities",
            "Further education access",
            "Skills demonstration",
          ],
        });
      }

      // Analyze travel and mobility credentials
      if (
        !existingTypes.has("DriversLicenseCredential") &&
        !existingTypes.has("TravelDocumentCredential")
      ) {
        gaps.push({
          category: "travel",
          type: "DriversLicenseCredential",
          name: "Digital Drivers License",
          description: "Digital driving license for EU member states",
          urgency: "low",
          suggestedIssuers: this.findIssuersByCredentialType(
            "DriversLicenseCredential",
          ),
          reasoning:
            "Digital driving license enables convenient identity verification and travel",
          benefits: [
            "Convenient identity verification",
            "Reduced physical document dependency",
            "Cross-border recognition",
            "Age verification",
          ],
        });
      }

      // Personalize based on user profile
      if (userProfile) {
        return this.personalizeGapAnalysis(gaps, userProfile);
      }

      return gaps.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });
    } catch (error) {
      errorService.logError("Credential gap analysis failed:", error);
      return [];
    }
  }

  /**
   * Get personalized issuer recommendations for a specific credential type
   */
  async getIssuerRecommendations(
    credentialType: string,
    userProfile?: UserProfile,
  ): Promise<IssuerRecommendation[]> {
    try {
      await this.loadIssuerDirectory();

      const eligibleIssuers = this.findIssuersByCredentialType(credentialType);
      const recommendations: IssuerRecommendation[] = [];

      for (const issuer of eligibleIssuers) {
        const matchScore = this.calculateMatchScore(
          issuer,
          credentialType,
          userProfile,
        );
        const trustFactors = this.calculateTrustFactors(issuer, userProfile);
        const reasoning = this.generateRecommendationReasoning(
          issuer,
          trustFactors,
        );
        const estimatedValue = this.calculateEstimatedValue(
          issuer,
          credentialType,
          userProfile,
        );

        recommendations.push({
          issuer,
          credentialType,
          matchScore,
          reasoning,
          estimatedValue,
          trustFactors,
        });
      }

      // Sort by match score and trust level
      return recommendations.sort((a, b) => {
        const scoreA = a.matchScore * 0.6 + a.estimatedValue * 0.4;
        const scoreB = b.matchScore * 0.6 + b.estimatedValue * 0.4;
        return scoreB - scoreA;
      });
    } catch (error) {
      errorService.logError("Failed to get issuer recommendations:", error);
      return [];
    }
  }

  /**
   * Search issuers by various criteria
   */
  async searchIssuers(query: {
    text?: string;
    country?: string;
    category?: string;
    credentialType?: string;
    trustLevel?: string;
    region?: string;
  }): Promise<IssuerDirectoryEntry[]> {
    await this.loadIssuerDirectory();

    let results = Array.from(this.directoryCache.values());

    // Apply filters
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(
        (issuer) =>
          issuer.name.toLowerCase().includes(searchText) ||
          issuer.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchText),
          ) ||
          issuer.supportedCredentials.some((cred) =>
            Object.values(cred.name).some((name) =>
              name.toLowerCase().includes(searchText),
            ),
          ),
      );
    }

    if (query.country) {
      results = results.filter((issuer) => issuer.country === query.country);
    }

    if (query.category) {
      results = results.filter((issuer) =>
        issuer.categories.includes(query.category),
      );
    }

    if (query.credentialType) {
      results = results.filter((issuer) =>
        issuer.supportedCredentials.some(
          (cred) => cred.type === query.credentialType,
        ),
      );
    }

    if (query.trustLevel) {
      results = results.filter(
        (issuer) => issuer.trustLevel === query.trustLevel,
      );
    }

    if (query.region) {
      results = results.filter((issuer) => issuer.region === query.region);
    }

    // Sort by trust score and reputation
    return results.sort((a, b) => {
      const scoreA =
        a.reputation.trustScore * 0.7 +
        a.reputation.userRatings.average * 10 * 0.3;
      const scoreB =
        b.reputation.trustScore * 0.7 +
        b.reputation.userRatings.average * 10 * 0.3;
      return scoreB - scoreA;
    });
  }

  /**
   * Get detailed issuer information
   */
  async getIssuerDetails(did: string): Promise<IssuerDirectoryEntry | null> {
    await this.loadIssuerDirectory();
    return this.directoryCache.get(did) || null;
  }

  /**
   * Track user interaction for improving recommendations
   */
  async trackUserInteraction(interaction: {
    type: "view" | "request" | "complete" | "abandon";
    issuerDID: string;
    credentialType: string;
    timestamp: string;
    context?: string;
  }): Promise<void> {
    try {
      // Store interaction for analytics and personalization
      const interactions =
        (await this.storageService.getItem("user_interactions")) || [];
      interactions.push(interaction);

      // Keep only last 1000 interactions
      if (interactions.length > 1000) {
        interactions.splice(0, interactions.length - 1000);
      }

      await this.storageService.setItem("user_interactions", interactions);
    } catch (error) {
      errorService.logError("Failed to track user interaction:", error);
    }
  }

  /**
   * Private helper methods
   */
  private async loadEUDIIssuers(): Promise<IssuerDirectoryEntry[]> {
    // Load from EUDI trust registry
    // This would be the primary source for EU-compliant issuers
    return [
      {
        did: "did:eudi:eu:government:digital-identity",
        name: "EU Digital Identity Authority",
        displayName: {
          en: "EU Digital Identity Authority",
          de: "EU Digitale Identitätsbehörde",
        },
        description: { en: "Official EU digital identity credential issuer" },
        country: "EU",
        region: "EU",
        trustLevel: "high",
        certificationStatus: "eudi_certified",
        complianceFrameworks: ["eudi-arf", "eidas"],
        contactInfo: {
          website: "https://digital-identity.europa.eu",
          email: "support@digital-identity.europa.eu",
        },
        supportedCredentials: [
          {
            type: "EUIdentityCredential",
            schema: "https://schemas.europa.eu/credentials/identity/v1",
            name: { en: "EU Digital Identity", de: "EU Digitale Identität" },
            description: { en: "Official EU digital identity credential" },
            category: "identity",
            estimatedIssuanceTime: "PT5M",
            eligibilityCriteria: { en: "EU citizen with valid national ID" },
            privacyFeatures: {
              selectiveDisclosure: true,
              zeroKnowledge: true,
              revocable: true,
            },
          },
        ],
        issuanceEndpoint: "https://digital-identity.europa.eu/credentials",
        metadataEndpoint:
          "https://digital-identity.europa.eu/.well-known/openid_credential_issuer",
        supportedProtocols: ["openid4vci", "eudi_arf"],
        validityPeriod: {
          notBefore: "2023-01-01T00:00:00Z",
          notAfter: "2030-12-31T23:59:59Z",
        },
        reputation: {
          trustScore: 100,
          issuedCredentials: 1000000,
          verifiedIssuances: 999950,
          userRatings: { average: 4.8, count: 15000 },
        },
        categories: ["government", "identity"],
        keywords: ["identity", "eu", "digital", "government"],
        lastUpdated: new Date().toISOString(),
      },
      // More issuers would be loaded from actual registry
    ];
  }

  private async loadMemberStateIssuers(): Promise<IssuerDirectoryEntry[]> {
    // Load from member state registries
    return [];
  }

  private async loadInternationalIssuers(): Promise<IssuerDirectoryEntry[]> {
    // Load from international trusted issuer registries
    return [];
  }

  private deduplicateIssuers(
    issuers: IssuerDirectoryEntry[],
  ): IssuerDirectoryEntry[] {
    const seen = new Set<string>();
    return issuers.filter((issuer) => {
      if (seen.has(issuer.did)) {
        return false;
      }
      seen.add(issuer.did);
      return true;
    });
  }

  private findIssuersByCredentialType(
    credentialType: string,
  ): IssuerDirectoryEntry[] {
    return Array.from(this.directoryCache.values()).filter((issuer) =>
      issuer.supportedCredentials.some((cred) => cred.type === credentialType),
    );
  }

  private findIssuersByCategory(category: string): IssuerDirectoryEntry[] {
    return Array.from(this.directoryCache.values()).filter((issuer) =>
      issuer.supportedCredentials.some((cred) => cred.category === category),
    );
  }

  private hasCredentialCategory(
    existingTypes: Set<string>,
    category: string,
  ): boolean {
    const categoryTypes = Array.from(this.directoryCache.values())
      .flatMap((issuer) => issuer.supportedCredentials)
      .filter((cred) => cred.category === category)
      .map((cred) => cred.type);

    return categoryTypes.some((type) => existingTypes.has(type));
  }

  private personalizeGapAnalysis(
    gaps: CredentialGap[],
    userProfile: UserProfile,
  ): CredentialGap[] {
    return gaps.map((gap) => {
      // Filter issuers based on user location and preferences
      const personalizedIssuers = gap.suggestedIssuers.filter((issuer) => {
        // Prefer issuers from user's country or region
        if (issuer.country === userProfile.location.country) return true;
        if (userProfile.preferences.trustedRegions.includes(issuer.region))
          return true;
        return issuer.trustLevel === "high"; // Always include high-trust issuers
      });

      return {
        ...gap,
        suggestedIssuers: personalizedIssuers.slice(0, 5), // Limit to top 5
      };
    });
  }

  private calculateMatchScore(
    issuer: IssuerDirectoryEntry,
    credentialType: string,
    userProfile?: UserProfile,
  ): number {
    let score = 0;

    // Base score for supporting the credential type
    const supportsType = issuer.supportedCredentials.some(
      (cred) => cred.type === credentialType,
    );
    if (!supportsType) return 0;

    score += 40; // Base score for supporting the type

    // Trust level bonus
    switch (issuer.trustLevel) {
      case "high":
        score += 30;
        break;
      case "substantial":
        score += 20;
        break;
      case "low":
        score += 10;
        break;
    }

    // Certification status bonus
    switch (issuer.certificationStatus) {
      case "eidas_qualified":
        score += 20;
        break;
      case "eudi_certified":
        score += 15;
        break;
      case "member_state_approved":
        score += 10;
        break;
      case "self_declared":
        score += 5;
        break;
    }

    // User profile alignment
    if (userProfile) {
      // Location preference
      if (issuer.country === userProfile.location.country) score += 10;
      if (userProfile.preferences.trustedRegions.includes(issuer.region))
        score += 5;

      // Protocol preference
      const hasPreferredProtocol = issuer.supportedProtocols.some((protocol) =>
        userProfile.preferences.preferredProtocols.includes(protocol),
      );
      if (hasPreferredProtocol) score += 5;
    }

    return Math.min(score, 100); // Cap at 100
  }

  private calculateTrustFactors(
    issuer: IssuerDirectoryEntry,
    userProfile?: UserProfile,
  ) {
    return {
      certificationLevel: this.getCertificationScore(
        issuer.certificationStatus,
      ),
      userRating: issuer.reputation.userRatings.average * 20, // Scale to 0-100
      regionAlignment: userProfile
        ? this.getRegionAlignmentScore(issuer, userProfile)
        : 50,
      protocolSupport: (issuer.supportedProtocols.length / 4) * 100, // Assume max 4 protocols
    };
  }

  private getCertificationScore(status: string): number {
    switch (status) {
      case "eidas_qualified":
        return 100;
      case "eudi_certified":
        return 85;
      case "member_state_approved":
        return 70;
      case "self_declared":
        return 40;
      default:
        return 0;
    }
  }

  private getRegionAlignmentScore(
    issuer: IssuerDirectoryEntry,
    userProfile: UserProfile,
  ): number {
    if (issuer.country === userProfile.location.country) return 100;
    if (userProfile.preferences.trustedRegions.includes(issuer.region))
      return 75;
    if (issuer.region === "EU" && userProfile.location.region === "EU")
      return 60;
    return 30;
  }

  private generateRecommendationReasoning(
    issuer: IssuerDirectoryEntry,
    trustFactors: any,
  ): string[] {
    const reasons = [];

    if (trustFactors.certificationLevel >= 85) {
      reasons.push("Highly certified and regulated issuer");
    }

    if (trustFactors.userRating >= 80) {
      reasons.push("Excellent user ratings and feedback");
    }

    if (trustFactors.regionAlignment >= 75) {
      reasons.push("Aligned with your location and preferences");
    }

    if (issuer.reputation.issuedCredentials > 10000) {
      reasons.push("Proven track record with many issued credentials");
    }

    if (issuer.supportedProtocols.includes("eudi_arf")) {
      reasons.push("Full EUDI ARF compliance and support");
    }

    return reasons;
  }

  private calculateEstimatedValue(
    issuer: IssuerDirectoryEntry,
    credentialType: string,
    userProfile?: UserProfile,
  ): number {
    let value = 50; // Base value

    // Add value based on issuer reputation
    value += issuer.reputation.trustScore * 0.3;

    // Add value based on user rating
    value += issuer.reputation.userRatings.average * 10;

    // Add value based on compliance
    if (issuer.complianceFrameworks.includes("eudi-arf")) value += 10;
    if (issuer.complianceFrameworks.includes("eidas")) value += 5;

    // Credential-specific value
    const credInfo = issuer.supportedCredentials.find(
      (cred) => cred.type === credentialType,
    );
    if (credInfo) {
      if (credInfo.privacyFeatures.selectiveDisclosure) value += 5;
      if (credInfo.privacyFeatures.zeroKnowledge) value += 5;
      if (credInfo.fees?.amount === 0) value += 5; // Free issuance
    }

    return Math.min(value, 100);
  }
}
