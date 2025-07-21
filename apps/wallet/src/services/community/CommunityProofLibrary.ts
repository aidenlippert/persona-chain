/**
 * Community Proof Library Service
 * Social proof sharing, discovery, and verification system
 */

import { VerifiableCredential } from '../../types/identity';
import { databaseService } from '../database/DatabaseService';
import { errorService } from "@/services/errorService";

export interface CommunityProof {
  id: string;
  title: string;
  description: string;
  category: 'identity' | 'professional' | 'financial' | 'educational' | 'social' | 'technical';
  proofType: string;
  templateId?: string;
  creatorDid: string;
  creatorDisplayName: string;
  isAnonymous: boolean;
  verificationLevel: 'basic' | 'enhanced' | 'premium' | 'verified';
  trustScore: number; // 0-1
  usageCount: number;
  endorsements: number;
  reports: number;
  tags: string[];
  metadata: CommunityProofMetadata;
  sharing: SharingConfiguration;
  verification: ProofVerificationStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface CommunityProofMetadata {
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedGenerationTime: number; // minutes
  requiredData: string[];
  supportedProviders: string[];
  compatibleApis: string[];
  generationSteps: number;
  privacyLevel: 'public' | 'pseudonymous' | 'anonymous';
  zkpImplementation: string;
  circuitSize: number;
  proofSize: number; // bytes
}

export interface SharingConfiguration {
  isPublic: boolean;
  allowDerivatives: boolean;
  requireAttribution: boolean;
  commercialUse: boolean;
  shareableWith: 'everyone' | 'verified-users' | 'premium-users' | 'specific-users';
  maxUses?: number;
  currentUses: number;
  licenseType: 'cc0' | 'cc-by' | 'cc-by-sa' | 'proprietary' | 'custom';
  customLicense?: string;
}

export interface ProofVerificationStatus {
  isVerified: boolean;
  verifiedBy: string[];
  communityEndorsements: CommunityEndorsement[];
  lastVerification?: string;
  verificationHistory: VerificationEvent[];
  qualityScore: number; // 0-1
  reliabilityScore: number; // 0-1
}

export interface CommunityEndorsement {
  id: string;
  endorserDid: string;
  endorserDisplayName: string;
  endorserTrustLevel: number;
  endorsementType: 'quality' | 'accuracy' | 'usefulness' | 'innovation';
  comment?: string;
  timestamp: string;
}

export interface VerificationEvent {
  id: string;
  verifierDid: string;
  verifierType: 'community' | 'official' | 'automated';
  result: 'verified' | 'failed' | 'partial';
  details: string;
  timestamp: string;
  evidence?: string[];
}

export interface ProofTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: number;
  requiredInputs: TemplateInput[];
  outputs: TemplateOutput[];
  circuit: string;
  implementation: string;
  tags: string[];
  creatorDid: string;
  usageCount: number;
  rating: number;
  isOfficial: boolean;
  isOpen: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description: string;
  required: boolean;
  validation?: string;
  example?: any;
}

export interface TemplateOutput {
  name: string;
  type: string;
  description: string;
  privacy: 'public' | 'private' | 'zero-knowledge';
}

export interface CommunityStats {
  totalProofs: number;
  totalTemplates: number;
  activeUsers: number;
  verifiedProofs: number;
  totalEndorsements: number;
  averageTrustScore: number;
  categoryCounts: Record<string, number>;
  popularTemplates: ProofTemplate[];
  recentActivity: CommunityActivity[];
}

export interface CommunityActivity {
  id: string;
  type: 'proof_shared' | 'template_created' | 'endorsement_given' | 'verification_completed';
  actorDid: string;
  actorDisplayName: string;
  targetId: string;
  targetTitle: string;
  timestamp: string;
  isAnonymous: boolean;
}

export interface ProofSearchQuery {
  query?: string;
  category?: string;
  complexity?: string;
  verificationLevel?: string;
  tags?: string[];
  creatorDid?: string;
  minTrustScore?: number;
  sortBy: 'relevance' | 'recent' | 'popular' | 'trustScore' | 'usage';
  sortDirection: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export interface ProofSearchResult {
  proofs: CommunityProof[];
  total: number;
  facets: {
    categories: Record<string, number>;
    complexities: Record<string, number>;
    verificationLevels: Record<string, number>;
    tags: Record<string, number>;
  };
  suggestions: string[];
}

export class CommunityProofLibraryService {
  private static instance: CommunityProofLibraryService;
  private proofs: Map<string, CommunityProof> = new Map();
  private templates: Map<string, ProofTemplate> = new Map();
  private userEndorsements: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeMockData();
    console.log('👥 Community Proof Library Service initialized');
  }

  static getInstance(): CommunityProofLibraryService {
    if (!CommunityProofLibraryService.instance) {
      CommunityProofLibraryService.instance = new CommunityProofLibraryService();
    }
    return CommunityProofLibraryService.instance;
  }

  /**
   * Initialize with mock community data
   */
  private initializeMockData(): void {
    // Mock templates
    const templates: ProofTemplate[] = [
      {
        id: 'age-verification-template',
        name: 'Age Verification (18+)',
        description: 'Zero-knowledge proof that verifies age is above 18 without revealing exact age',
        category: 'identity',
        complexity: 'simple',
        estimatedTime: 2,
        requiredInputs: [
          {
            name: 'birthDate',
            type: 'date',
            description: 'Date of birth',
            required: true,
            example: '1990-01-01'
          }
        ],
        outputs: [
          {
            name: 'isOver18',
            type: 'boolean',
            description: 'Confirmation of age verification',
            privacy: 'zero-knowledge'
          }
        ],
        circuit: 'age_verification.circom',
        implementation: 'groth16',
        tags: ['age', 'identity', 'verification', 'compliance'],
        creatorDid: 'did:persona:official:templates',
        usageCount: 1247,
        rating: 4.8,
        isOfficial: true,
        isOpen: true,
        version: '1.2.0',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z'
      },
      {
        id: 'income-threshold-template',
        name: 'Income Threshold Verification',
        description: 'Proves income exceeds a threshold without revealing exact amount',
        category: 'financial',
        complexity: 'moderate',
        estimatedTime: 5,
        requiredInputs: [
          {
            name: 'monthlyIncome',
            type: 'number',
            description: 'Monthly income amount',
            required: true,
            example: 5000
          },
          {
            name: 'threshold',
            type: 'number',
            description: 'Minimum income threshold',
            required: true,
            example: 3000
          }
        ],
        outputs: [
          {
            name: 'meetsThreshold',
            type: 'boolean',
            description: 'Confirmation of income threshold',
            privacy: 'zero-knowledge'
          }
        ],
        circuit: 'income_threshold.circom',
        implementation: 'plonk',
        tags: ['income', 'financial', 'threshold', 'lending'],
        creatorDid: 'did:persona:community:financial-experts',
        usageCount: 892,
        rating: 4.6,
        isOfficial: false,
        isOpen: true,
        version: '2.1.0',
        createdAt: '2024-02-01T09:15:00Z',
        updatedAt: '2024-02-15T16:45:00Z'
      },
      {
        id: 'education-level-template',
        name: 'Education Level Verification',
        description: 'Verifies completion of education level without revealing institution details',
        category: 'educational',
        complexity: 'moderate',
        estimatedTime: 4,
        requiredInputs: [
          {
            name: 'degreeLevel',
            type: 'string',
            description: 'Education level achieved',
            required: true,
            example: 'bachelor'
          },
          {
            name: 'graduationYear',
            type: 'number',
            description: 'Year of graduation',
            required: true,
            example: 2020
          }
        ],
        outputs: [
          {
            name: 'hasQualification',
            type: 'boolean',
            description: 'Confirmation of education level',
            privacy: 'zero-knowledge'
          }
        ],
        circuit: 'education_level.circom',
        implementation: 'groth16',
        tags: ['education', 'degree', 'qualification', 'academic'],
        creatorDid: 'did:persona:community:edu-validators',
        usageCount: 634,
        rating: 4.4,
        isOfficial: false,
        isOpen: true,
        version: '1.5.0',
        createdAt: '2024-01-20T11:30:00Z',
        updatedAt: '2024-02-10T13:20:00Z'
      }
    ];

    templates.forEach(template => this.templates.set(template.id, template));

    // Mock community proofs
    const proofs: CommunityProof[] = [
      {
        id: 'proof-001',
        title: 'Verified Software Engineer',
        description: 'Zero-knowledge proof combining education, experience, and skill verification for software engineering roles',
        category: 'professional',
        proofType: 'composite_professional',
        templateId: 'professional-composite-template',
        creatorDid: 'did:persona:user:alex-dev',
        creatorDisplayName: 'Alex D.',
        isAnonymous: false,
        verificationLevel: 'enhanced',
        trustScore: 0.94,
        usageCount: 156,
        endorsements: 47,
        reports: 0,
        tags: ['software', 'engineering', 'professional', 'experience'],
        metadata: {
          complexity: 'complex',
          estimatedGenerationTime: 8,
          requiredData: ['education_credentials', 'employment_history', 'skill_assessments'],
          supportedProviders: ['linkedin', 'github', 'university_apis'],
          compatibleApis: ['linkedin_advanced', 'github_advanced', 'education_verification'],
          generationSteps: 6,
          privacyLevel: 'pseudonymous',
          zkpImplementation: 'groth16',
          circuitSize: 15000,
          proofSize: 2048
        },
        sharing: {
          isPublic: true,
          allowDerivatives: true,
          requireAttribution: false,
          commercialUse: true,
          shareableWith: 'everyone',
          currentUses: 156,
          licenseType: 'cc-by'
        },
        verification: {
          isVerified: true,
          verifiedBy: ['did:persona:verifier:professional-board'],
          communityEndorsements: [
            {
              id: 'end-001',
              endorserDid: 'did:persona:user:jane-tech',
              endorserDisplayName: 'Jane T.',
              endorserTrustLevel: 0.87,
              endorsementType: 'quality',
              comment: 'Excellent proof design, very comprehensive',
              timestamp: '2024-02-15T14:20:00Z'
            }
          ],
          verificationHistory: [],
          qualityScore: 0.92,
          reliabilityScore: 0.96
        },
        createdAt: '2024-01-25T16:45:00Z',
        updatedAt: '2024-02-15T14:20:00Z',
        isActive: true
      },
      {
        id: 'proof-002',
        title: 'Verified University Graduate',
        description: 'Privacy-preserving proof of university graduation with degree type verification',
        category: 'educational',
        proofType: 'education_verification',
        templateId: 'education-level-template',
        creatorDid: 'did:persona:user:sarah-edu',
        creatorDisplayName: 'Sarah M.',
        isAnonymous: false,
        verificationLevel: 'verified',
        trustScore: 0.91,
        usageCount: 89,
        endorsements: 23,
        reports: 0,
        tags: ['university', 'degree', 'education', 'academic'],
        metadata: {
          complexity: 'moderate',
          estimatedGenerationTime: 4,
          requiredData: ['diploma', 'transcript', 'university_verification'],
          supportedProviders: ['national_student_clearinghouse', 'university_apis'],
          compatibleApis: ['clearinghouse_api', 'university_verification'],
          generationSteps: 4,
          privacyLevel: 'pseudonymous',
          zkpImplementation: 'plonk',
          circuitSize: 8000,
          proofSize: 1536
        },
        sharing: {
          isPublic: true,
          allowDerivatives: false,
          requireAttribution: true,
          commercialUse: false,
          shareableWith: 'verified-users',
          currentUses: 89,
          licenseType: 'cc-by-sa'
        },
        verification: {
          isVerified: true,
          verifiedBy: ['did:persona:verifier:education-board'],
          communityEndorsements: [],
          verificationHistory: [],
          qualityScore: 0.88,
          reliabilityScore: 0.93
        },
        createdAt: '2024-02-01T09:30:00Z',
        updatedAt: '2024-02-10T11:15:00Z',
        isActive: true
      },
      {
        id: 'proof-003',
        title: 'Anonymous Credit Worthiness',
        description: 'Zero-knowledge proof of credit score range without revealing exact score or identity',
        category: 'financial',
        proofType: 'credit_range_verification',
        templateId: 'credit-range-template',
        creatorDid: 'did:persona:user:anon-finance',
        creatorDisplayName: 'Anonymous',
        isAnonymous: true,
        verificationLevel: 'premium',
        trustScore: 0.89,
        usageCount: 234,
        endorsements: 67,
        reports: 2,
        tags: ['credit', 'financial', 'anonymous', 'lending'],
        metadata: {
          complexity: 'complex',
          estimatedGenerationTime: 6,
          requiredData: ['credit_report', 'identity_verification'],
          supportedProviders: ['experian', 'equifax', 'transunion'],
          compatibleApis: ['experian_api', 'credit_verification'],
          generationSteps: 5,
          privacyLevel: 'anonymous',
          zkpImplementation: 'stark',
          circuitSize: 12000,
          proofSize: 3072
        },
        sharing: {
          isPublic: true,
          allowDerivatives: true,
          requireAttribution: false,
          commercialUse: true,
          shareableWith: 'everyone',
          currentUses: 234,
          licenseType: 'cc0'
        },
        verification: {
          isVerified: true,
          verifiedBy: ['did:persona:verifier:financial-authorities'],
          communityEndorsements: [],
          verificationHistory: [],
          qualityScore: 0.85,
          reliabilityScore: 0.92
        },
        createdAt: '2024-01-18T13:22:00Z',
        updatedAt: '2024-02-08T16:45:00Z',
        isActive: true
      }
    ];

    proofs.forEach(proof => this.proofs.set(proof.id, proof));

    console.log(`✅ Initialized community library with ${templates.length} templates and ${proofs.length} proofs`);
  }

  /**
   * Search community proofs with advanced filtering
   */
  async searchProofs(query: ProofSearchQuery): Promise<ProofSearchResult> {
    console.log('🔍 Searching community proofs...');

    try {
      let results = Array.from(this.proofs.values());

      // Apply filters
      if (query.query) {
        const searchTerm = query.query.toLowerCase();
        results = results.filter(proof =>
          proof.title.toLowerCase().includes(searchTerm) ||
          proof.description.toLowerCase().includes(searchTerm) ||
          proof.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      if (query.category) {
        results = results.filter(proof => proof.category === query.category);
      }

      if (query.complexity) {
        results = results.filter(proof => proof.metadata.complexity === query.complexity);
      }

      if (query.verificationLevel) {
        results = results.filter(proof => proof.verificationLevel === query.verificationLevel);
      }

      if (query.tags && query.tags.length > 0) {
        results = results.filter(proof =>
          query.tags!.some(tag => proof.tags.includes(tag))
        );
      }

      if (query.minTrustScore) {
        results = results.filter(proof => proof.trustScore >= query.minTrustScore!);
      }

      if (query.creatorDid) {
        results = results.filter(proof => proof.creatorDid === query.creatorDid);
      }

      // Calculate facets
      const facets = this.calculateSearchFacets(results);

      // Sort results
      results = this.sortProofs(results, query.sortBy, query.sortDirection);

      // Paginate
      const total = results.length;
      const paginatedResults = results.slice(query.offset, query.offset + query.limit);

      // Generate suggestions
      const suggestions = this.generateSearchSuggestions(query.query || '');

      return {
        proofs: paginatedResults,
        total,
        facets,
        suggestions
      };

    } catch (error) {
      errorService.logError('❌ Proof search failed:', error);
      throw error;
    }
  }

  /**
   * Calculate search facets for filtering
   */
  private calculateSearchFacets(proofs: CommunityProof[]) {
    const facets = {
      categories: {} as Record<string, number>,
      complexities: {} as Record<string, number>,
      verificationLevels: {} as Record<string, number>,
      tags: {} as Record<string, number>
    };

    proofs.forEach(proof => {
      facets.categories[proof.category] = (facets.categories[proof.category] || 0) + 1;
      facets.complexities[proof.metadata.complexity] = (facets.complexities[proof.metadata.complexity] || 0) + 1;
      facets.verificationLevels[proof.verificationLevel] = (facets.verificationLevels[proof.verificationLevel] || 0) + 1;
      
      proof.tags.forEach(tag => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      });
    });

    return facets;
  }

  /**
   * Sort proofs based on criteria
   */
  private sortProofs(
    proofs: CommunityProof[],
    sortBy: string,
    direction: 'asc' | 'desc'
  ): CommunityProof[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return proofs.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * multiplier;
        case 'popular':
          return (b.usageCount - a.usageCount) * multiplier;
        case 'trustScore':
          return (b.trustScore - a.trustScore) * multiplier;
        case 'relevance':
        default:
          return (b.endorsements - a.endorsements) * multiplier;
      }
    });
  }

  /**
   * Generate search suggestions
   */
  private generateSearchSuggestions(query: string): string[] {
    const commonTerms = [
      'age verification',
      'income proof',
      'education verification',
      'professional credentials',
      'identity verification',
      'credit score',
      'employment history',
      'skill certification'
    ];

    if (!query) return commonTerms.slice(0, 5);

    return commonTerms
      .filter(term => term.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }

  /**
   * Share a proof to the community
   */
  async shareProof(
    userDid: string,
    proofData: Partial<CommunityProof>,
    sharingConfig: SharingConfiguration
  ): Promise<CommunityProof> {
    console.log('📤 Sharing proof to community...');

    try {
      const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const communityProof: CommunityProof = {
        id: proofId,
        title: proofData.title || 'Untitled Proof',
        description: proofData.description || '',
        category: proofData.category || 'identity',
        proofType: proofData.proofType || 'custom',
        templateId: proofData.templateId,
        creatorDid: userDid,
        creatorDisplayName: proofData.creatorDisplayName || 'Anonymous',
        isAnonymous: proofData.isAnonymous || false,
        verificationLevel: 'basic',
        trustScore: 0.5,
        usageCount: 0,
        endorsements: 0,
        reports: 0,
        tags: proofData.tags || [],
        metadata: proofData.metadata || {
          complexity: 'simple',
          estimatedGenerationTime: 5,
          requiredData: [],
          supportedProviders: [],
          compatibleApis: [],
          generationSteps: 3,
          privacyLevel: 'public',
          zkpImplementation: 'groth16',
          circuitSize: 1000,
          proofSize: 512
        },
        sharing: sharingConfig,
        verification: {
          isVerified: false,
          verifiedBy: [],
          communityEndorsements: [],
          verificationHistory: [],
          qualityScore: 0.5,
          reliabilityScore: 0.5
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      this.proofs.set(proofId, communityProof);

      // Store in database
      await this.storeCommunityProof(communityProof);

      console.log('✅ Proof shared to community successfully');
      return communityProof;

    } catch (error) {
      errorService.logError('❌ Failed to share proof:', error);
      throw error;
    }
  }

  /**
   * Endorse a community proof
   */
  async endorseProof(
    proofId: string,
    endorserDid: string,
    endorsementType: CommunityEndorsement['endorsementType'],
    comment?: string
  ): Promise<boolean> {
    console.log('👍 Endorsing community proof...');

    try {
      const proof = this.proofs.get(proofId);
      if (!proof) {
        throw new Error('Proof not found');
      }

      // Check if user already endorsed this proof
      const userEndorsements = this.userEndorsements.get(endorserDid) || new Set();
      if (userEndorsements.has(proofId)) {
        throw new Error('User has already endorsed this proof');
      }

      const endorsement: CommunityEndorsement = {
        id: `end_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        endorserDid,
        endorserDisplayName: 'Community Member', // Would get from user profile
        endorserTrustLevel: 0.75, // Would calculate based on user history
        endorsementType,
        comment,
        timestamp: new Date().toISOString()
      };

      proof.verification.communityEndorsements.push(endorsement);
      proof.endorsements++;
      proof.trustScore = Math.min(1, proof.trustScore + 0.01);
      proof.updatedAt = new Date().toISOString();

      userEndorsements.add(proofId);
      this.userEndorsements.set(endorserDid, userEndorsements);

      console.log('✅ Proof endorsed successfully');
      return true;

    } catch (error) {
      errorService.logError('❌ Failed to endorse proof:', error);
      throw error;
    }
  }

  /**
   * Get community statistics
   */
  async getCommunityStats(): Promise<CommunityStats> {
    console.log('📊 Calculating community statistics...');

    try {
      const proofs = Array.from(this.proofs.values());
      const templates = Array.from(this.templates.values());

      const stats: CommunityStats = {
        totalProofs: proofs.length,
        totalTemplates: templates.length,
        activeUsers: new Set(proofs.map(p => p.creatorDid)).size,
        verifiedProofs: proofs.filter(p => p.verification.isVerified).length,
        totalEndorsements: proofs.reduce((sum, p) => sum + p.endorsements, 0),
        averageTrustScore: proofs.reduce((sum, p) => sum + p.trustScore, 0) / proofs.length,
        categoryCounts: {},
        popularTemplates: templates
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 5),
        recentActivity: this.generateRecentActivity(proofs)
      };

      // Calculate category counts
      proofs.forEach(proof => {
        stats.categoryCounts[proof.category] = (stats.categoryCounts[proof.category] || 0) + 1;
      });

      return stats;

    } catch (error) {
      errorService.logError('❌ Failed to get community stats:', error);
      throw error;
    }
  }

  /**
   * Generate recent activity feed
   */
  private generateRecentActivity(proofs: CommunityProof[]): CommunityActivity[] {
    const activities: CommunityActivity[] = [];

    // Add recent proof shares
    proofs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .forEach(proof => {
        activities.push({
          id: `activity_${proof.id}`,
          type: 'proof_shared',
          actorDid: proof.creatorDid,
          actorDisplayName: proof.creatorDisplayName,
          targetId: proof.id,
          targetTitle: proof.title,
          timestamp: proof.createdAt,
          isAnonymous: proof.isAnonymous
        });
      });

    return activities.slice(0, 20);
  }

  /**
   * Get proof templates
   */
  async getProofTemplates(): Promise<ProofTemplate[]> {
    return Array.from(this.templates.values())
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get proof by ID
   */
  async getProofById(proofId: string): Promise<CommunityProof | null> {
    return this.proofs.get(proofId) || null;
  }

  /**
   * Use a community proof (increment usage count)
   */
  async useProof(proofId: string, userDid: string): Promise<boolean> {
    console.log('🔄 Using community proof...');

    try {
      const proof = this.proofs.get(proofId);
      if (!proof) {
        throw new Error('Proof not found');
      }

      proof.usageCount++;
      proof.sharing.currentUses++;
      proof.updatedAt = new Date().toISOString();

      console.log('✅ Proof usage recorded');
      return true;

    } catch (error) {
      errorService.logError('❌ Failed to record proof usage:', error);
      return false;
    }
  }

  /**
   * Store community proof in database (mock implementation)
   */
  private async storeCommunityProof(proof: CommunityProof): Promise<void> {
    // In production, this would store in the database
    console.log('💾 Community proof stored:', proof.id);
  }
}

// Export singleton instance
export const communityProofLibrary = CommunityProofLibraryService.getInstance();