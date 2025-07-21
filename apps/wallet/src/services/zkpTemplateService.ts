/**
 * ZKP Template Service
 * Manages categorized zero-knowledge proof templates for common use cases
 */

import { enhancedZKProofService } from './enhancedZKProofService';
import { storageService } from './storageService';
import { errorService, ErrorCategory, ErrorSeverity } from './errorService';
import { analyticsService } from './analyticsService';
import type { ZKProof, ZKCredential, VerifiableCredential } from '../types/wallet';

export interface ZKPTemplate {
  id: string;
  name: string;
  description: string;
  category: ZKPCategory;
  subcategory: string;
  circuitId: string;
  version: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime: number; // seconds
  gasEstimate: number;
  requirements: {
    credentials: Array<{
      type: string;
      required: boolean;
      description: string;
    }>;
    inputs: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'date' | 'array';
      required: boolean;
      description: string;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
      };
    }>;
    outputs: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'date' | 'array';
      description: string;
      isPublic: boolean;
    }>;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    tags: string[];
    usageCount: number;
    rating: number;
    reviews: number;
    featured: boolean;
    verified: boolean;
    securityLevel: 'basic' | 'enhanced' | 'enterprise';
  };
  circuit: {
    wasmUrl: string;
    zkeyUrl: string;
    vkeyUrl: string;
    constraintCount: number;
    publicSignalCount: number;
    privateSignalCount: number;
  };
  examples: Array<{
    name: string;
    description: string;
    inputs: Record<string, any>;
    expectedOutputs: Record<string, any>;
    useCase: string;
  }>;
  documentation: {
    overview: string;
    setupInstructions: string;
    troubleshooting: string;
    faq: Array<{
      question: string;
      answer: string;
    }>;
  };
}

export type ZKPCategory = 
  | 'identity'
  | 'financial'
  | 'education'
  | 'employment'
  | 'healthcare'
  | 'government'
  | 'social'
  | 'membership'
  | 'reputation'
  | 'compliance'
  | 'custom';

export interface ZKPTemplateLibrary {
  [category: string]: {
    [subcategory: string]: ZKPTemplate[];
  };
}

export interface ProofGenerationRequest {
  templateId: string;
  inputs: Record<string, any>;
  credentials: string[]; // credential IDs
  options: {
    privacy: 'minimal' | 'balanced' | 'maximum';
    verification: 'self' | 'third_party' | 'public';
    expiration?: number; // timestamp
    metadata?: Record<string, any>;
  };
}

export interface ProofGenerationResult {
  proof: ZKProof;
  credential: ZKCredential;
  verificationUrl: string;
  shareableProof: string;
  metadata: {
    templateUsed: string;
    proofId: string;
    createdAt: string;
    expiresAt?: string;
    verificationCount: number;
    privacyLevel: string;
  };
}

export class ZKPTemplateService {
  private templates: ZKPTemplateLibrary = {};
  private customTemplates: Map<string, ZKPTemplate> = new Map();
  private templateCache: Map<string, ZKPTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default template library
   */
  private initializeDefaultTemplates(): void {
    // Identity Templates
    this.addTemplate(this.createAgeVerificationTemplate());
    this.addTemplate(this.createResidencyProofTemplate());
    this.addTemplate(this.createIdentityVerificationTemplate());
    this.addTemplate(this.createCitizenshipProofTemplate());

    // Financial Templates
    this.addTemplate(this.createIncomeRangeTemplate());
    this.addTemplate(this.createCreditScoreTemplate());
    this.addTemplate(this.createAssetOwnershipTemplate());
    this.addTemplate(this.createPaymentHistoryTemplate());

    // Education Templates
    this.addTemplate(this.createDegreeVerificationTemplate());
    this.addTemplate(this.createSkillCertificationTemplate());
    this.addTemplate(this.createAcademicAchievementTemplate());

    // Employment Templates
    this.addTemplate(this.createEmploymentStatusTemplate());
    this.addTemplate(this.createSalaryRangeTemplate());
    this.addTemplate(this.createExperienceYearsTemplate());

    // Social Templates
    this.addTemplate(this.createSocialMediaFollowersTemplate());
    this.addTemplate(this.createInfluenceScoreTemplate());
    this.addTemplate(this.createCommunityMembershipTemplate());

    // Membership Templates
    this.addTemplate(this.createPremiumMembershipTemplate());
    this.addTemplate(this.createVIPStatusTemplate());
    this.addTemplate(this.createLoyaltyTierTemplate());

    // Compliance Templates
    this.addTemplate(this.createKYCComplianceTemplate());
    this.addTemplate(this.createAMLComplianceTemplate());
    this.addTemplate(this.createSanctionCheckTemplate());

    console.log(`✅ Initialized ZKP Template Library with ${this.getTotalTemplateCount()} templates`);
  }

  /**
   * Get all templates by category
   */
  getTemplatesByCategory(category: ZKPCategory): ZKPTemplate[] {
    const categoryTemplates = this.templates[category] || {};
    return Object.values(categoryTemplates).flat();
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ZKPTemplate | null {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    // Search in default templates
    for (const category of Object.values(this.templates)) {
      for (const subcategory of Object.values(category)) {
        const template = subcategory.find(t => t.id === templateId);
        if (template) {
          this.templateCache.set(templateId, template);
          return template;
        }
      }
    }

    // Check custom templates
    const customTemplate = this.customTemplates.get(templateId);
    if (customTemplate) {
      this.templateCache.set(templateId, customTemplate);
      return customTemplate;
    }

    return null;
  }

  /**
   * Generate ZK proof from template
   */
  async generateProofFromTemplate(
    request: ProofGenerationRequest
  ): Promise<ProofGenerationResult> {
    try {
      const template = this.getTemplate(request.templateId);
      if (!template) {
        throw new Error(`Template not found: ${request.templateId}`);
      }

      // Validate inputs
      this.validateInputs(template, request.inputs);

      // Load required credentials
      const credentials = await this.loadCredentials(request.credentials);
      
      // Validate credential requirements
      this.validateCredentialRequirements(template, credentials);

      // Prepare proof inputs
      const proofInputs = this.prepareProofInputs(template, request.inputs, credentials);

      // Generate ZK proof
      const proof = await enhancedZKProofService.generateProof(
        template.circuitId,
        proofInputs,
        {
          privacy: request.options.privacy,
          verification: request.options.verification,
          metadata: request.options.metadata,
        }
      );

      // Create ZK credential
      const credential = await this.createZKCredential(template, proof, request);

      // Store proof and credential
      await storageService.storeCredential({
        id: credential.id,
        type: 'ZKCredential',
        credential: credential as any,
        metadata: {
          tags: template.metadata.tags,
          favorite: false,
          lastUsed: new Date().toISOString(),
          usageCount: 0,
          source: 'zkp_template',
          name: `${template.name} - ZK Proof`,
          description: `Zero-knowledge proof generated from ${template.name} template`,
          issuer: 'PersonaPass ZKP Engine',
          issuedAt: new Date().toISOString(),
          expiresAt: request.options.expiration ? new Date(request.options.expiration).toISOString() : undefined,
        },
        storage: {
          encrypted: true,
          backed_up: true,
          synced: true,
        },
      });

      // Update template usage
      this.updateTemplateUsage(template.id);

      // Track analytics
      analyticsService.trackEvent(
        'zkp_template',
        'proof_generated',
        'success',
        template.id,
        {
          category: template.category,
          difficulty: template.difficulty,
          privacy: request.options.privacy,
          credentialCount: request.credentials.length,
        }
      );

      return {
        proof,
        credential,
        verificationUrl: this.generateVerificationUrl(proof.commitment),
        shareableProof: this.generateShareableProof(proof),
        metadata: {
          templateUsed: template.id,
          proofId: proof.commitment,
          createdAt: new Date().toISOString(),
          expiresAt: request.options.expiration ? new Date(request.options.expiration).toISOString() : undefined,
          verificationCount: 0,
          privacyLevel: request.options.privacy,
        },
      };
    } catch (error) {
      errorService.logError(error instanceof Error ? error : new Error('ZKP generation failed'), {
        category: ErrorCategory.CRYPTO,
        severity: ErrorSeverity.HIGH,
        metadata: { templateId: request.templateId, inputs: request.inputs },
      });
      throw error;
    }
  }

  /**
   * Search templates
   */
  searchTemplates(query: string, filters?: {
    category?: ZKPCategory;
    difficulty?: string;
    tags?: string[];
    featured?: boolean;
  }): ZKPTemplate[] {
    const allTemplates = this.getAllTemplates();
    
    return allTemplates.filter(template => {
      // Text search
      const matchesQuery = !query || 
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.description.toLowerCase().includes(query.toLowerCase()) ||
        template.metadata.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

      // Category filter
      const matchesCategory = !filters?.category || template.category === filters.category;

      // Difficulty filter
      const matchesDifficulty = !filters?.difficulty || template.difficulty === filters.difficulty;

      // Tags filter
      const matchesTags = !filters?.tags?.length || 
        filters.tags.some(tag => template.metadata.tags.includes(tag));

      // Featured filter
      const matchesFeatured = filters?.featured === undefined || 
        template.metadata.featured === filters.featured;

      return matchesQuery && matchesCategory && matchesDifficulty && matchesTags && matchesFeatured;
    });
  }

  /**
   * Get featured templates
   */
  getFeaturedTemplates(): ZKPTemplate[] {
    return this.getAllTemplates()
      .filter(template => template.metadata.featured)
      .sort((a, b) => b.metadata.rating - a.metadata.rating);
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 10): ZKPTemplate[] {
    return this.getAllTemplates()
      .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
      .slice(0, limit);
  }

  /**
   * Get templates by difficulty
   */
  getTemplatesByDifficulty(difficulty: string): ZKPTemplate[] {
    return this.getAllTemplates().filter(template => template.difficulty === difficulty);
  }

  /**
   * Create custom template
   */
  async createCustomTemplate(template: Omit<ZKPTemplate, 'id' | 'metadata'>): Promise<ZKPTemplate> {
    const customTemplate: ZKPTemplate = {
      ...template,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'User',
        tags: template.metadata?.tags || [],
        usageCount: 0,
        rating: 0,
        reviews: 0,
        featured: false,
        verified: false,
        securityLevel: 'basic',
      },
    };

    this.customTemplates.set(customTemplate.id, customTemplate);
    await this.saveCustomTemplate(customTemplate);

    return customTemplate;
  }

  /**
   * Template creation helpers
   */
  private createAgeVerificationTemplate(): ZKPTemplate {
    return {
      id: 'age_verification_v1',
      name: 'Age Verification',
      description: 'Prove you are above a certain age without revealing your exact age or birth date',
      category: 'identity',
      subcategory: 'age_proof',
      circuitId: 'age_verification',
      version: '1.0.0',
      difficulty: 'beginner',
      estimatedTime: 30,
      gasEstimate: 100000,
      requirements: {
        credentials: [{
          type: 'IdentityCredential',
          required: true,
          description: 'Government-issued ID or verified birth certificate',
        }],
        inputs: [{
          name: 'minimumAge',
          type: 'number',
          required: true,
          description: 'Minimum age to prove (e.g., 18, 21)',
          validation: { min: 0, max: 150 },
        }],
        outputs: [{
          name: 'isAboveAge',
          type: 'boolean',
          description: 'Whether the person is above the minimum age',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['age', 'identity', 'verification', 'compliance'],
        usageCount: 0,
        rating: 4.8,
        reviews: 245,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/age_verification.wasm',
        zkeyUrl: '/circuits/age_verification.zkey',
        vkeyUrl: '/circuits/age_verification_vkey.json',
        constraintCount: 1024,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Alcohol Purchase',
        description: 'Prove you are 21 or older to purchase alcohol',
        inputs: { minimumAge: 21 },
        expectedOutputs: { isAboveAge: true },
        useCase: 'Age-gated commerce',
      }],
      documentation: {
        overview: 'This template allows you to prove you meet age requirements without revealing your exact age.',
        setupInstructions: '1. Connect your verified identity credential\n2. Enter the minimum age requirement\n3. Generate proof',
        troubleshooting: 'Ensure your identity credential contains a verified birth date.',
        faq: [{
          question: 'What information is revealed?',
          answer: 'Only whether you meet the age requirement - your exact age and birth date remain private.',
        }],
      },
    };
  }

  private createIncomeRangeTemplate(): ZKPTemplate {
    return {
      id: 'income_range_v1',
      name: 'Income Range Proof',
      description: 'Prove your income falls within a specific range without revealing exact amount',
      category: 'financial',
      subcategory: 'income_proof',
      circuitId: 'income_range',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 45,
      gasEstimate: 150000,
      requirements: {
        credentials: [{
          type: 'IncomeCredential',
          required: true,
          description: 'Bank-verified income credential from Plaid or similar service',
        }],
        inputs: [{
          name: 'minimumIncome',
          type: 'number',
          required: true,
          description: 'Minimum income amount',
          validation: { min: 0 },
        }, {
          name: 'maximumIncome',
          type: 'number',
          required: false,
          description: 'Maximum income amount (optional)',
          validation: { min: 0 },
        }],
        outputs: [{
          name: 'meetsIncomeRequirement',
          type: 'boolean',
          description: 'Whether income falls within specified range',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['income', 'financial', 'lending', 'qualification'],
        usageCount: 0,
        rating: 4.6,
        reviews: 189,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/income_range.wasm',
        zkeyUrl: '/circuits/income_range.zkey',
        vkeyUrl: '/circuits/income_range_vkey.json',
        constraintCount: 2048,
        publicSignalCount: 1,
        privateSignalCount: 4,
      },
      examples: [{
        name: 'Loan Pre-qualification',
        description: 'Prove income meets lending requirements',
        inputs: { minimumIncome: 50000, maximumIncome: 200000 },
        expectedOutputs: { meetsIncomeRequirement: true },
        useCase: 'Financial services',
      }],
      documentation: {
        overview: 'Prove your income qualifies for financial products without revealing exact amounts.',
        setupInstructions: '1. Connect verified income credential\n2. Set income range parameters\n3. Generate proof',
        troubleshooting: 'Ensure your income credential is current and verified.',
        faq: [{
          question: 'How current does my income data need to be?',
          answer: 'Most lenders require income data within the last 90 days.',
        }],
      },
    };
  }

  private createDegreeVerificationTemplate(): ZKPTemplate {
    return {
      id: 'degree_verification_v1',
      name: 'Degree Verification',
      description: 'Prove you have a specific degree or educational qualification',
      category: 'education',
      subcategory: 'degree_proof',
      circuitId: 'degree_verification',
      version: '1.0.0',
      difficulty: 'beginner',
      estimatedTime: 25,
      gasEstimate: 80000,
      requirements: {
        credentials: [{
          type: 'EducationCredential',
          required: true,
          description: 'Verified educational credential from institution',
        }],
        inputs: [{
          name: 'requiredDegree',
          type: 'string',
          required: true,
          description: 'Required degree type (e.g., "Bachelor", "Master", "PhD")',
        }, {
          name: 'fieldOfStudy',
          type: 'string',
          required: false,
          description: 'Specific field of study (optional)',
        }],
        outputs: [{
          name: 'hasQualification',
          type: 'boolean',
          description: 'Whether the person has the required qualification',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['education', 'degree', 'qualification', 'employment'],
        usageCount: 0,
        rating: 4.7,
        reviews: 156,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/degree_verification.wasm',
        zkeyUrl: '/circuits/degree_verification.zkey',
        vkeyUrl: '/circuits/degree_verification_vkey.json',
        constraintCount: 512,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Job Application',
        description: 'Prove you have required educational qualifications',
        inputs: { requiredDegree: 'Bachelor', fieldOfStudy: 'Computer Science' },
        expectedOutputs: { hasQualification: true },
        useCase: 'Employment verification',
      }],
      documentation: {
        overview: 'Verify educational qualifications without revealing institution or graduation details.',
        setupInstructions: '1. Connect verified education credential\n2. Specify degree requirements\n3. Generate proof',
        troubleshooting: 'Ensure your education credential is verified by the issuing institution.',
        faq: [{
          question: 'Which institutions are supported?',
          answer: 'Any institution that issues W3C-compliant verifiable credentials.',
        }],
      },
    };
  }

  // Additional template creation methods would follow similar patterns...
  private createResidencyProofTemplate(): ZKPTemplate {
    return {
      id: 'residency_proof_v1',
      name: 'Residency Proof',
      description: 'Prove your residency in a specific location without revealing your exact address',
      category: 'identity',
      subcategory: 'residency_proof',
      circuitId: 'residency_verification',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 60,
      gasEstimate: 120000,
      requirements: {
        credentials: [{
          type: 'AddressCredential',
          required: true,
          description: 'Government-issued proof of address or utility bill',
        }],
        inputs: [{
          name: 'requiredRegion',
          type: 'string',
          required: true,
          description: 'Required region/area (e.g., "California", "New York", "Europe")',
        }],
        outputs: [{
          name: 'residesInRegion',
          type: 'boolean',
          description: 'Whether the person resides in the specified region',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['residency', 'location', 'identity', 'compliance'],
        usageCount: 0,
        rating: 4.5,
        reviews: 78,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/residency_proof.wasm',
        zkeyUrl: '/circuits/residency_proof.zkey',
        vkeyUrl: '/circuits/residency_proof_vkey.json',
        constraintCount: 1536,
        publicSignalCount: 1,
        privateSignalCount: 4,
      },
      examples: [{
        name: 'Regional Employment',
        description: 'Prove residency for regional job requirements',
        inputs: { requiredRegion: 'California' },
        expectedOutputs: { residesInRegion: true },
        useCase: 'Regional employment verification',
      }],
      documentation: {
        overview: 'Verify your residency in a specific region without revealing your exact address.',
        setupInstructions: '1. Connect verified address credential\n2. Specify required region\n3. Generate proof',
        troubleshooting: 'Ensure your address credential is current and verified.',
        faq: [{
          question: 'What address information is revealed?',
          answer: 'Only whether you reside in the specified region - your exact address remains private.',
        }],
      },
    };
  }
  private createIdentityVerificationTemplate(): ZKPTemplate {
    return {
      id: 'identity_verification_v1',
      name: 'Identity Verification',
      description: 'Prove your identity without revealing personal information',
      category: 'identity',
      subcategory: 'identity_proof',
      circuitId: 'identity_verification',
      version: '1.0.0',
      difficulty: 'advanced',
      estimatedTime: 90,
      gasEstimate: 200000,
      requirements: {
        credentials: [{
          type: 'IdentityCredential',
          required: true,
          description: 'Government-issued ID or passport',
        }],
        inputs: [{
          name: 'verificationLevel',
          type: 'string',
          required: true,
          description: 'Required verification level (basic, enhanced, premium)',
        }],
        outputs: [{
          name: 'identityVerified',
          type: 'boolean',
          description: 'Whether identity meets verification requirements',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['identity', 'verification', 'kyc', 'compliance'],
        usageCount: 0,
        rating: 4.9,
        reviews: 523,
        featured: true,
        verified: true,
        securityLevel: 'enterprise',
      },
      circuit: {
        wasmUrl: '/circuits/identity_verification.wasm',
        zkeyUrl: '/circuits/identity_verification.zkey',
        vkeyUrl: '/circuits/identity_verification_vkey.json',
        constraintCount: 4096,
        publicSignalCount: 1,
        privateSignalCount: 8,
      },
      examples: [{
        name: 'KYC Compliance',
        description: 'Prove identity for financial services KYC',
        inputs: { verificationLevel: 'enhanced' },
        expectedOutputs: { identityVerified: true },
        useCase: 'Financial services onboarding',
      }],
      documentation: {
        overview: 'Comprehensive identity verification while maintaining privacy.',
        setupInstructions: '1. Upload government ID\n2. Complete verification process\n3. Generate proof',
        troubleshooting: 'Ensure your ID document is clear and not expired.',
        faq: [{
          question: 'What identity information is shared?',
          answer: 'Only verification status - no personal details are revealed.',
        }],
      },
    };
  }
  private createCitizenshipProofTemplate(): ZKPTemplate {
    return {
      id: 'citizenship_proof_v1',
      name: 'Citizenship Proof',
      description: 'Prove citizenship or nationality without revealing passport details',
      category: 'identity',
      subcategory: 'citizenship_proof',
      circuitId: 'citizenship_verification',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 45,
      gasEstimate: 110000,
      requirements: {
        credentials: [{
          type: 'PassportCredential',
          required: true,
          description: 'Valid passport or citizenship certificate',
        }],
        inputs: [{
          name: 'requiredCountry',
          type: 'string',
          required: true,
          description: 'Required country of citizenship (ISO country code)',
        }],
        outputs: [{
          name: 'isCitizen',
          type: 'boolean',
          description: 'Whether the person is a citizen of the specified country',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['citizenship', 'nationality', 'travel', 'compliance'],
        usageCount: 0,
        rating: 4.7,
        reviews: 89,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/citizenship_proof.wasm',
        zkeyUrl: '/circuits/citizenship_proof.zkey',
        vkeyUrl: '/circuits/citizenship_proof_vkey.json',
        constraintCount: 1024,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Visa Application',
        description: 'Prove citizenship for visa application requirements',
        inputs: { requiredCountry: 'US' },
        expectedOutputs: { isCitizen: true },
        useCase: 'Travel and visa applications',
      }],
      documentation: {
        overview: 'Verify citizenship status without revealing passport or personal details.',
        setupInstructions: '1. Upload passport credential\n2. Specify required country\n3. Generate proof',
        troubleshooting: 'Ensure your passport credential is valid and not expired.',
        faq: [{
          question: 'What passport information is revealed?',
          answer: 'Only citizenship status - no passport number or personal details are shared.',
        }],
      },
    };
  }
  private createCreditScoreTemplate(): ZKPTemplate {
    return {
      id: 'credit_score_v1',
      name: 'Credit Score Range',
      description: 'Prove your credit score falls within a specific range',
      category: 'financial',
      subcategory: 'credit_proof',
      circuitId: 'credit_score_range',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 40,
      gasEstimate: 140000,
      requirements: {
        credentials: [{
          type: 'CreditReportCredential',
          required: true,
          description: 'Credit report from authorized credit bureau',
        }],
        inputs: [{
          name: 'minimumScore',
          type: 'number',
          required: true,
          description: 'Minimum credit score required',
          validation: { min: 300, max: 850 },
        }, {
          name: 'maximumScore',
          type: 'number',
          required: false,
          description: 'Maximum credit score (optional)',
          validation: { min: 300, max: 850 },
        }],
        outputs: [{
          name: 'meetsCreditRequirement',
          type: 'boolean',
          description: 'Whether credit score meets the specified range',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['credit', 'financial', 'lending', 'qualification'],
        usageCount: 0,
        rating: 4.6,
        reviews: 234,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/credit_score_range.wasm',
        zkeyUrl: '/circuits/credit_score_range.zkey',
        vkeyUrl: '/circuits/credit_score_range_vkey.json',
        constraintCount: 1536,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Mortgage Pre-approval',
        description: 'Prove creditworthiness for mortgage application',
        inputs: { minimumScore: 680, maximumScore: 850 },
        expectedOutputs: { meetsCreditRequirement: true },
        useCase: 'Mortgage and loan applications',
      }],
      documentation: {
        overview: 'Verify credit score requirements without revealing exact score.',
        setupInstructions: '1. Connect credit report credential\n2. Set score range\n3. Generate proof',
        troubleshooting: 'Ensure your credit report is recent and from a recognized bureau.',
        faq: [{
          question: 'Which credit bureaus are supported?',
          answer: 'Experian, Equifax, and TransUnion credit reports are supported.',
        }],
      },
    };
  }
  private createAssetOwnershipTemplate(): ZKPTemplate {
    return {
      id: 'asset_ownership_v1',
      name: 'Asset Ownership Proof',
      description: 'Prove ownership of assets without revealing exact values',
      category: 'financial',
      subcategory: 'asset_proof',
      circuitId: 'asset_ownership',
      version: '1.0.0',
      difficulty: 'advanced',
      estimatedTime: 75,
      gasEstimate: 180000,
      requirements: {
        credentials: [{
          type: 'AssetCredential',
          required: true,
          description: 'Bank or brokerage-verified asset holdings',
        }],
        inputs: [{
          name: 'assetType',
          type: 'string',
          required: true,
          description: 'Type of asset (real_estate, stocks, bonds, crypto)',
        }, {
          name: 'minimumValue',
          type: 'number',
          required: true,
          description: 'Minimum asset value required',
          validation: { min: 0 },
        }],
        outputs: [{
          name: 'ownsAsset',
          type: 'boolean',
          description: 'Whether the person owns assets meeting the criteria',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['assets', 'wealth', 'investment', 'collateral'],
        usageCount: 0,
        rating: 4.4,
        reviews: 67,
        featured: false,
        verified: true,
        securityLevel: 'enterprise',
      },
      circuit: {
        wasmUrl: '/circuits/asset_ownership.wasm',
        zkeyUrl: '/circuits/asset_ownership.zkey',
        vkeyUrl: '/circuits/asset_ownership_vkey.json',
        constraintCount: 2048,
        publicSignalCount: 1,
        privateSignalCount: 5,
      },
      examples: [{
        name: 'Collateral Verification',
        description: 'Prove asset ownership for loan collateral',
        inputs: { assetType: 'real_estate', minimumValue: 500000 },
        expectedOutputs: { ownsAsset: true },
        useCase: 'Secured lending and collateral verification',
      }],
      documentation: {
        overview: 'Verify asset ownership and value thresholds without revealing exact holdings.',
        setupInstructions: '1. Connect asset credential\n2. Specify asset type and minimum value\n3. Generate proof',
        troubleshooting: 'Ensure your asset credentials are current and from verified sources.',
        faq: [{
          question: 'Which asset types are supported?',
          answer: 'Real estate, stocks, bonds, cryptocurrency, and other financial instruments.',
        }],
      },
    };
  }
  private createPaymentHistoryTemplate(): ZKPTemplate {
    return {
      id: 'payment_history_v1',
      name: 'Payment History Proof',
      description: 'Prove consistent payment history without revealing transaction details',
      category: 'financial',
      subcategory: 'payment_proof',
      circuitId: 'payment_history',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 50,
      gasEstimate: 160000,
      requirements: {
        credentials: [{
          type: 'PaymentHistoryCredential',
          required: true,
          description: 'Bank or payment processor verified payment history',
        }],
        inputs: [{
          name: 'timeframe',
          type: 'number',
          required: true,
          description: 'Number of months to analyze',
          validation: { min: 1, max: 60 },
        }, {
          name: 'minimumScore',
          type: 'number',
          required: true,
          description: 'Minimum payment reliability score (0-100)',
          validation: { min: 0, max: 100 },
        }],
        outputs: [{
          name: 'hasGoodPaymentHistory',
          type: 'boolean',
          description: 'Whether payment history meets the reliability threshold',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['payments', 'reliability', 'financial', 'lending'],
        usageCount: 0,
        rating: 4.3,
        reviews: 92,
        featured: false,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/payment_history.wasm',
        zkeyUrl: '/circuits/payment_history.zkey',
        vkeyUrl: '/circuits/payment_history_vkey.json',
        constraintCount: 1800,
        publicSignalCount: 1,
        privateSignalCount: 4,
      },
      examples: [{
        name: 'Credit Application',
        description: 'Prove payment reliability for credit application',
        inputs: { timeframe: 12, minimumScore: 75 },
        expectedOutputs: { hasGoodPaymentHistory: true },
        useCase: 'Credit and loan applications',
      }],
      documentation: {
        overview: 'Verify payment reliability without revealing transaction details or amounts.',
        setupInstructions: '1. Connect payment history credential\n2. Set timeframe and score threshold\n3. Generate proof',
        troubleshooting: 'Ensure your payment history credential covers the requested timeframe.',
        faq: [{
          question: 'How is payment reliability calculated?',
          answer: 'Based on on-time payments, consistency, and account standing over the specified period.',
        }],
      },
    };
  }
  private createSkillCertificationTemplate(): ZKPTemplate {
    return {
      id: 'skill_certification_v1',
      name: 'Skill Certification',
      description: 'Prove specific skills or certifications without revealing all qualifications',
      category: 'education',
      subcategory: 'skill_proof',
      circuitId: 'skill_certification',
      version: '1.0.0',
      difficulty: 'beginner',
      estimatedTime: 35,
      gasEstimate: 90000,
      requirements: {
        credentials: [{
          type: 'SkillCredential',
          required: true,
          description: 'Professional certification or skill verification',
        }],
        inputs: [{
          name: 'requiredSkill',
          type: 'string',
          required: true,
          description: 'Required skill or certification name',
        }, {
          name: 'minimumLevel',
          type: 'string',
          required: false,
          description: 'Minimum proficiency level (basic, intermediate, advanced, expert)',
        }],
        outputs: [{
          name: 'hasSkill',
          type: 'boolean',
          description: 'Whether the person has the required skill at the specified level',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['skills', 'certification', 'employment', 'qualification'],
        usageCount: 0,
        rating: 4.6,
        reviews: 178,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/skill_certification.wasm',
        zkeyUrl: '/circuits/skill_certification.zkey',
        vkeyUrl: '/circuits/skill_certification_vkey.json',
        constraintCount: 768,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Job Application',
        description: 'Prove required technical skills for a position',
        inputs: { requiredSkill: 'React Development', minimumLevel: 'intermediate' },
        expectedOutputs: { hasSkill: true },
        useCase: 'Technical job applications',
      }],
      documentation: {
        overview: 'Verify specific skills and certifications without revealing your complete qualification profile.',
        setupInstructions: '1. Connect skill credential\n2. Specify required skill and level\n3. Generate proof',
        troubleshooting: 'Ensure your skill credentials are from recognized certification providers.',
        faq: [{
          question: 'Which certification providers are supported?',
          answer: 'Major providers including Coursera, edX, AWS, Google, Microsoft, and industry associations.',
        }],
      },
    };
  }
  private createAcademicAchievementTemplate(): ZKPTemplate {
    return {
      id: 'academic_achievement_v1',
      name: 'Academic Achievement',
      description: 'Prove academic achievements like GPA or honors without revealing transcripts',
      category: 'education',
      subcategory: 'achievement_proof',
      circuitId: 'academic_achievement',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 45,
      gasEstimate: 115000,
      requirements: {
        credentials: [{
          type: 'AcademicCredential',
          required: true,
          description: 'Official transcript or academic record',
        }],
        inputs: [{
          name: 'achievementType',
          type: 'string',
          required: true,
          description: 'Type of achievement (gpa, honors, ranking, award)',
        }, {
          name: 'minimumThreshold',
          type: 'number',
          required: true,
          description: 'Minimum achievement threshold (e.g., 3.5 GPA)',
          validation: { min: 0, max: 4.0 },
        }],
        outputs: [{
          name: 'meetsAchievement',
          type: 'boolean',
          description: 'Whether the person meets the academic achievement criteria',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['academic', 'gpa', 'honors', 'achievement', 'education'],
        usageCount: 0,
        rating: 4.5,
        reviews: 134,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/academic_achievement.wasm',
        zkeyUrl: '/circuits/academic_achievement.zkey',
        vkeyUrl: '/circuits/academic_achievement_vkey.json',
        constraintCount: 1200,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Graduate School Application',
        description: 'Prove minimum GPA requirement for graduate program',
        inputs: { achievementType: 'gpa', minimumThreshold: 3.5 },
        expectedOutputs: { meetsAchievement: true },
        useCase: 'Graduate school and scholarship applications',
      }],
      documentation: {
        overview: 'Verify academic achievements without revealing complete academic records.',
        setupInstructions: '1. Connect academic credential\n2. Specify achievement type and threshold\n3. Generate proof',
        troubleshooting: 'Ensure your academic credentials are from accredited institutions.',
        faq: [{
          question: 'What achievement types are supported?',
          answer: 'GPA, class rank, honors (cum laude, magna cum laude), academic awards, and Dean\'s List.',
        }],
      },
    };
  }
  private createEmploymentStatusTemplate(): ZKPTemplate {
    return {
      id: 'employment_status_v1',
      name: 'Employment Status',
      description: 'Prove employment status without revealing employer details',
      category: 'employment',
      subcategory: 'status_proof',
      circuitId: 'employment_status',
      version: '1.0.0',
      difficulty: 'beginner',
      estimatedTime: 30,
      gasEstimate: 85000,
      requirements: {
        credentials: [{
          type: 'EmploymentCredential',
          required: true,
          description: 'Employment verification from employer or HR system',
        }],
        inputs: [{
          name: 'requiredStatus',
          type: 'string',
          required: true,
          description: 'Required employment status (employed, self_employed, contractor)',
        }, {
          name: 'minimumDuration',
          type: 'number',
          required: false,
          description: 'Minimum employment duration in months',
          validation: { min: 0, max: 600 },
        }],
        outputs: [{
          name: 'hasEmploymentStatus',
          type: 'boolean',
          description: 'Whether the person has the required employment status',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['employment', 'status', 'income', 'verification'],
        usageCount: 0,
        rating: 4.7,
        reviews: 198,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/employment_status.wasm',
        zkeyUrl: '/circuits/employment_status.zkey',
        vkeyUrl: '/circuits/employment_status_vkey.json',
        constraintCount: 640,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Rental Application',
        description: 'Prove employment status for rental application',
        inputs: { requiredStatus: 'employed', minimumDuration: 6 },
        expectedOutputs: { hasEmploymentStatus: true },
        useCase: 'Rental and housing applications',
      }],
      documentation: {
        overview: 'Verify employment status without revealing employer or salary information.',
        setupInstructions: '1. Connect employment credential\n2. Specify required status and duration\n3. Generate proof',
        troubleshooting: 'Ensure your employment credential is current and verified by your employer.',
        faq: [{
          question: 'What employment statuses are supported?',
          answer: 'Full-time, part-time, contractor, self-employed, and consultant statuses.',
        }],
      },
    };
  }
  private createSalaryRangeTemplate(): ZKPTemplate {
    return {
      id: 'salary_range_v1',
      name: 'Salary Range Proof',
      description: 'Prove salary falls within a range without revealing exact amount',
      category: 'employment',
      subcategory: 'salary_proof',
      circuitId: 'salary_range',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 45,
      gasEstimate: 130000,
      requirements: {
        credentials: [{
          type: 'SalaryCredential',
          required: true,
          description: 'Salary verification from employer or payroll system',
        }],
        inputs: [{
          name: 'minimumSalary',
          type: 'number',
          required: true,
          description: 'Minimum salary amount',
          validation: { min: 0 },
        }, {
          name: 'maximumSalary',
          type: 'number',
          required: false,
          description: 'Maximum salary amount (optional)',
          validation: { min: 0 },
        }, {
          name: 'currency',
          type: 'string',
          required: true,
          description: 'Currency code (USD, EUR, GBP, etc.)',
        }],
        outputs: [{
          name: 'meetsSalaryRange',
          type: 'boolean',
          description: 'Whether salary falls within the specified range',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['salary', 'income', 'employment', 'qualification'],
        usageCount: 0,
        rating: 4.5,
        reviews: 167,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/salary_range.wasm',
        zkeyUrl: '/circuits/salary_range.zkey',
        vkeyUrl: '/circuits/salary_range_vkey.json',
        constraintCount: 1400,
        publicSignalCount: 1,
        privateSignalCount: 4,
      },
      examples: [{
        name: 'Loan Application',
        description: 'Prove salary meets loan qualification requirements',
        inputs: { minimumSalary: 75000, maximumSalary: 200000, currency: 'USD' },
        expectedOutputs: { meetsSalaryRange: true },
        useCase: 'Loan and mortgage applications',
      }],
      documentation: {
        overview: 'Verify salary requirements without revealing exact compensation details.',
        setupInstructions: '1. Connect salary credential\n2. Set salary range and currency\n3. Generate proof',
        troubleshooting: 'Ensure your salary credential is current and includes the specified currency.',
        faq: [{
          question: 'Which currencies are supported?',
          answer: 'Major currencies including USD, EUR, GBP, CAD, AUD, JPY, and others.',
        }],
      },
    };
  }
  private createExperienceYearsTemplate(): ZKPTemplate {
    return {
      id: 'experience_years_v1',
      name: 'Experience Years',
      description: 'Prove years of experience in a field without revealing employment history',
      category: 'employment',
      subcategory: 'experience_proof',
      circuitId: 'experience_years',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 40,
      gasEstimate: 110000,
      requirements: {
        credentials: [{
          type: 'ExperienceCredential',
          required: true,
          description: 'Work experience verification from employers or professional networks',
        }],
        inputs: [{
          name: 'fieldOfExperience',
          type: 'string',
          required: true,
          description: 'Field or industry of experience (e.g., software_development, marketing)',
        }, {
          name: 'minimumYears',
          type: 'number',
          required: true,
          description: 'Minimum years of experience required',
          validation: { min: 0, max: 50 },
        }],
        outputs: [{
          name: 'hasExperience',
          type: 'boolean',
          description: 'Whether the person has the required years of experience',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['experience', 'employment', 'qualification', 'career'],
        usageCount: 0,
        rating: 4.6,
        reviews: 143,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/experience_years.wasm',
        zkeyUrl: '/circuits/experience_years.zkey',
        vkeyUrl: '/circuits/experience_years_vkey.json',
        constraintCount: 1100,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Senior Position Application',
        description: 'Prove minimum experience for senior role',
        inputs: { fieldOfExperience: 'software_development', minimumYears: 5 },
        expectedOutputs: { hasExperience: true },
        useCase: 'Senior-level job applications',
      }],
      documentation: {
        overview: 'Verify years of experience without revealing specific employers or positions.',
        setupInstructions: '1. Connect experience credential\n2. Specify field and minimum years\n3. Generate proof',
        troubleshooting: 'Ensure your experience credentials cover the specified field and timeframe.',
        faq: [{
          question: 'How is experience calculated?',
          answer: 'Total years in the field, including overlapping positions and relevant contract work.',
        }],
      },
    };
  }
  private createSocialMediaFollowersTemplate(): ZKPTemplate {
    return {
      id: 'social_media_followers_v1',
      name: 'Social Media Followers',
      description: 'Prove follower count threshold without revealing exact numbers',
      category: 'social',
      subcategory: 'follower_proof',
      circuitId: 'social_media_followers',
      version: '1.0.0',
      difficulty: 'beginner',
      estimatedTime: 25,
      gasEstimate: 75000,
      requirements: {
        credentials: [{
          type: 'SocialMediaCredential',
          required: true,
          description: 'Verified social media account with follower metrics',
        }],
        inputs: [{
          name: 'platform',
          type: 'string',
          required: true,
          description: 'Social media platform (twitter, instagram, linkedin, tiktok)',
        }, {
          name: 'minimumFollowers',
          type: 'number',
          required: true,
          description: 'Minimum follower count threshold',
          validation: { min: 0 },
        }],
        outputs: [{
          name: 'hasFollowers',
          type: 'boolean',
          description: 'Whether the account has the minimum follower count',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['social', 'followers', 'influence', 'marketing'],
        usageCount: 0,
        rating: 4.4,
        reviews: 256,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/social_media_followers.wasm',
        zkeyUrl: '/circuits/social_media_followers.zkey',
        vkeyUrl: '/circuits/social_media_followers_vkey.json',
        constraintCount: 512,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Influencer Campaign',
        description: 'Prove minimum follower count for brand partnership',
        inputs: { platform: 'instagram', minimumFollowers: 10000 },
        expectedOutputs: { hasFollowers: true },
        useCase: 'Influencer marketing and brand partnerships',
      }],
      documentation: {
        overview: 'Verify social media reach without revealing exact follower counts.',
        setupInstructions: '1. Connect social media credential\n2. Select platform and set threshold\n3. Generate proof',
        troubleshooting: 'Ensure your social media credentials are recent and verified.',
        faq: [{
          question: 'Which platforms are supported?',
          answer: 'Twitter, Instagram, LinkedIn, TikTok, YouTube, and other major platforms.',
        }],
      },
    };
  }
  private createInfluenceScoreTemplate(): ZKPTemplate {
    return {
      id: 'influence_score_v1',
      name: 'Influence Score',
      description: 'Prove social media influence score without revealing metrics',
      category: 'social',
      subcategory: 'influence_proof',
      circuitId: 'influence_score',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 55,
      gasEstimate: 145000,
      requirements: {
        credentials: [{
          type: 'SocialInfluenceCredential',
          required: true,
          description: 'Verified social media influence metrics and engagement data',
        }],
        inputs: [{
          name: 'minimumScore',
          type: 'number',
          required: true,
          description: 'Minimum influence score (0-100)',
          validation: { min: 0, max: 100 },
        }, {
          name: 'platforms',
          type: 'array',
          required: true,
          description: 'Array of platforms to consider for influence calculation',
        }],
        outputs: [{
          name: 'hasInfluence',
          type: 'boolean',
          description: 'Whether the person meets the minimum influence threshold',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['influence', 'social', 'engagement', 'authority'],
        usageCount: 0,
        rating: 4.3,
        reviews: 187,
        featured: true,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/influence_score.wasm',
        zkeyUrl: '/circuits/influence_score.zkey',
        vkeyUrl: '/circuits/influence_score_vkey.json',
        constraintCount: 1600,
        publicSignalCount: 1,
        privateSignalCount: 5,
      },
      examples: [{
        name: 'Brand Ambassador',
        description: 'Prove influence score for brand ambassador program',
        inputs: { minimumScore: 70, platforms: ['twitter', 'instagram'] },
        expectedOutputs: { hasInfluence: true },
        useCase: 'Brand ambassador and partnership programs',
      }],
      documentation: {
        overview: 'Verify social media influence without revealing detailed engagement metrics.',
        setupInstructions: '1. Connect influence credential\n2. Set minimum score and platforms\n3. Generate proof',
        troubleshooting: 'Ensure your influence credentials include recent engagement data.',
        faq: [{
          question: 'How is influence score calculated?',
          answer: 'Based on engagement rate, reach, consistency, and audience quality across platforms.',
        }],
      },
    };
  }
  private createCommunityMembershipTemplate(): ZKPTemplate {
    return {
      id: 'community_membership_v1',
      name: 'Community Membership',
      description: 'Prove membership in specific communities without revealing all affiliations',
      category: 'social',
      subcategory: 'membership_proof',
      circuitId: 'community_membership',
      version: '1.0.0',
      difficulty: 'beginner',
      estimatedTime: 30,
      gasEstimate: 80000,
      requirements: {
        credentials: [{
          type: 'CommunityCredential',
          required: true,
          description: 'Verified membership in online or offline communities',
        }],
        inputs: [{
          name: 'communityType',
          type: 'string',
          required: true,
          description: 'Type of community (professional, gaming, tech, social, etc.)',
        }, {
          name: 'minimumMembershipDuration',
          type: 'number',
          required: false,
          description: 'Minimum membership duration in months',
          validation: { min: 0, max: 120 },
        }],
        outputs: [{
          name: 'isCommunityMember',
          type: 'boolean',
          description: 'Whether the person is a member of the specified community type',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['community', 'membership', 'social', 'network'],
        usageCount: 0,
        rating: 4.2,
        reviews: 94,
        featured: false,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/community_membership.wasm',
        zkeyUrl: '/circuits/community_membership.zkey',
        vkeyUrl: '/circuits/community_membership_vkey.json',
        constraintCount: 640,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Professional Network',
        description: 'Prove membership in professional communities',
        inputs: { communityType: 'professional', minimumMembershipDuration: 6 },
        expectedOutputs: { isCommunityMember: true },
        useCase: 'Professional networking and job applications',
      }],
      documentation: {
        overview: 'Verify community membership without revealing all social affiliations.',
        setupInstructions: '1. Connect community credential\n2. Specify community type and duration\n3. Generate proof',
        troubleshooting: 'Ensure your community credentials are current and verified.',
        faq: [{
          question: 'What types of communities are supported?',
          answer: 'Professional associations, gaming communities, tech forums, social clubs, and more.',
        }],
      },
    };
  }
  private createPremiumMembershipTemplate(): ZKPTemplate {
    return {
      id: 'premium_membership_v1',
      name: 'Premium Membership',
      description: 'Prove premium membership status without revealing service details',
      category: 'membership',
      subcategory: 'premium_proof',
      circuitId: 'premium_membership',
      version: '1.0.0',
      difficulty: 'beginner',
      estimatedTime: 20,
      gasEstimate: 70000,
      requirements: {
        credentials: [{
          type: 'MembershipCredential',
          required: true,
          description: 'Verified premium membership from service provider',
        }],
        inputs: [{
          name: 'membershipTier',
          type: 'string',
          required: true,
          description: 'Required membership tier (premium, gold, platinum, etc.)',
        }, {
          name: 'minimumDuration',
          type: 'number',
          required: false,
          description: 'Minimum membership duration in months',
          validation: { min: 0, max: 120 },
        }],
        outputs: [{
          name: 'hasPremiumMembership',
          type: 'boolean',
          description: 'Whether the person has the required premium membership',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['membership', 'premium', 'subscription', 'status'],
        usageCount: 0,
        rating: 4.1,
        reviews: 76,
        featured: false,
        verified: true,
        securityLevel: 'basic',
      },
      circuit: {
        wasmUrl: '/circuits/premium_membership.wasm',
        zkeyUrl: '/circuits/premium_membership.zkey',
        vkeyUrl: '/circuits/premium_membership_vkey.json',
        constraintCount: 384,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Exclusive Access',
        description: 'Prove premium membership for exclusive content access',
        inputs: { membershipTier: 'premium', minimumDuration: 3 },
        expectedOutputs: { hasPremiumMembership: true },
        useCase: 'Exclusive content and service access',
      }],
      documentation: {
        overview: 'Verify premium membership status without revealing service provider details.',
        setupInstructions: '1. Connect membership credential\n2. Specify tier and duration\n3. Generate proof',
        troubleshooting: 'Ensure your membership credential is current and active.',
        faq: [{
          question: 'Which membership types are supported?',
          answer: 'Premium, Gold, Platinum, VIP, and other subscription tiers from various providers.',
        }],
      },
    };
  }
  private createVIPStatusTemplate(): ZKPTemplate {
    return {
      id: 'vip_status_v1',
      name: 'VIP Status',
      description: 'Prove VIP or elite status without revealing specific privileges',
      category: 'membership',
      subcategory: 'vip_proof',
      circuitId: 'vip_status',
      version: '1.0.0',
      difficulty: 'intermediate',
      estimatedTime: 35,
      gasEstimate: 95000,
      requirements: {
        credentials: [{
          type: 'VIPCredential',
          required: true,
          description: 'Verified VIP or elite status from service provider',
        }],
        inputs: [{
          name: 'statusLevel',
          type: 'string',
          required: true,
          description: 'Required VIP status level (vip, elite, diamond, etc.)',
        }, {
          name: 'serviceCategory',
          type: 'string',
          required: false,
          description: 'Service category (travel, entertainment, financial, etc.)',
        }],
        outputs: [{
          name: 'hasVIPStatus',
          type: 'boolean',
          description: 'Whether the person has the required VIP status',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['vip', 'elite', 'status', 'privileges'],
        usageCount: 0,
        rating: 4.0,
        reviews: 45,
        featured: false,
        verified: true,
        securityLevel: 'enhanced',
      },
      circuit: {
        wasmUrl: '/circuits/vip_status.wasm',
        zkeyUrl: '/circuits/vip_status.zkey',
        vkeyUrl: '/circuits/vip_status_vkey.json',
        constraintCount: 768,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Elite Service Access',
        description: 'Prove VIP status for premium service access',
        inputs: { statusLevel: 'diamond', serviceCategory: 'travel' },
        expectedOutputs: { hasVIPStatus: true },
        useCase: 'Premium service access and priority treatment',
      }],
      documentation: {
        overview: 'Verify VIP or elite status without revealing specific privileges or benefits.',
        setupInstructions: '1. Connect VIP credential\n2. Specify status level and category\n3. Generate proof',
        troubleshooting: 'Ensure your VIP credentials are current and from recognized providers.',
        faq: [{
          question: 'What VIP programs are supported?',
          answer: 'Airline status, hotel programs, credit card tiers, and other elite membership programs.',
        }],
      },
    };
  }
  private createLoyaltyTierTemplate(): ZKPTemplate {
    return {
      id: 'loyalty_tier_v1',
      name: 'Loyalty Tier',
      description: 'Prove loyalty program tier without revealing spending or activity details',
      category: 'membership',
      subcategory: 'loyalty_proof',
      circuitId: 'loyalty_tier',
      version: '1.0.0',
      difficulty: 'beginner',
      estimatedTime: 25,
      gasEstimate: 65000,
      requirements: {
        credentials: [{
          type: 'LoyaltyCredential',
          required: true,
          description: 'Verified loyalty program membership and tier status',
        }],
        inputs: [{
          name: 'minimumTier',
          type: 'string',
          required: true,
          description: 'Minimum loyalty tier (bronze, silver, gold, platinum)',
        }, {
          name: 'programType',
          type: 'string',
          required: false,
          description: 'Type of loyalty program (retail, airline, hotel, etc.)',
        }],
        outputs: [{
          name: 'hasLoyaltyTier',
          type: 'boolean',
          description: 'Whether the person has the minimum loyalty tier',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['loyalty', 'tier', 'rewards', 'customer'],
        usageCount: 0,
        rating: 4.2,
        reviews: 112,
        featured: false,
        verified: true,
        securityLevel: 'basic',
      },
      circuit: {
        wasmUrl: '/circuits/loyalty_tier.wasm',
        zkeyUrl: '/circuits/loyalty_tier.zkey',
        vkeyUrl: '/circuits/loyalty_tier_vkey.json',
        constraintCount: 512,
        publicSignalCount: 1,
        privateSignalCount: 3,
      },
      examples: [{
        name: 'Customer Rewards',
        description: 'Prove loyalty tier for enhanced customer rewards',
        inputs: { minimumTier: 'gold', programType: 'retail' },
        expectedOutputs: { hasLoyaltyTier: true },
        useCase: 'Customer loyalty programs and rewards',
      }],
      documentation: {
        overview: 'Verify loyalty program tier without revealing spending patterns or transaction history.',
        setupInstructions: '1. Connect loyalty credential\n2. Specify minimum tier and program type\n3. Generate proof',
        troubleshooting: 'Ensure your loyalty credentials are current and from recognized programs.',
        faq: [{
          question: 'Which loyalty programs are supported?',
          answer: 'Major retail, airline, hotel, and credit card loyalty programs.',
        }],
      },
    };
  }
  private createKYCComplianceTemplate(): ZKPTemplate {
    return {
      id: 'kyc_compliance_v1',
      name: 'KYC Compliance',
      description: 'Prove KYC compliance without revealing personal information',
      category: 'compliance',
      subcategory: 'kyc_proof',
      circuitId: 'kyc_compliance',
      version: '1.0.0',
      difficulty: 'advanced',
      estimatedTime: 90,
      gasEstimate: 220000,
      requirements: {
        credentials: [{
          type: 'KYCCredential',
          required: true,
          description: 'Verified KYC compliance from financial institution',
        }],
        inputs: [{
          name: 'complianceLevel',
          type: 'string',
          required: true,
          description: 'Required KYC compliance level (basic, enhanced, premium)',
        }, {
          name: 'jurisdiction',
          type: 'string',
          required: false,
          description: 'Regulatory jurisdiction (US, EU, UK, etc.)',
        }],
        outputs: [{
          name: 'isKYCCompliant',
          type: 'boolean',
          description: 'Whether the person meets KYC compliance requirements',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['kyc', 'compliance', 'regulation', 'financial'],
        usageCount: 0,
        rating: 4.8,
        reviews: 89,
        featured: true,
        verified: true,
        securityLevel: 'enterprise',
      },
      circuit: {
        wasmUrl: '/circuits/kyc_compliance.wasm',
        zkeyUrl: '/circuits/kyc_compliance.zkey',
        vkeyUrl: '/circuits/kyc_compliance_vkey.json',
        constraintCount: 3072,
        publicSignalCount: 1,
        privateSignalCount: 6,
      },
      examples: [{
        name: 'Financial Service Access',
        description: 'Prove KYC compliance for financial service onboarding',
        inputs: { complianceLevel: 'enhanced', jurisdiction: 'US' },
        expectedOutputs: { isKYCCompliant: true },
        useCase: 'Financial services and regulated industry access',
      }],
      documentation: {
        overview: 'Verify KYC compliance status without revealing personal identification details.',
        setupInstructions: '1. Connect KYC credential\n2. Specify compliance level and jurisdiction\n3. Generate proof',
        troubleshooting: 'Ensure your KYC credentials are current and from regulated financial institutions.',
        faq: [{
          question: 'Which KYC standards are supported?',
          answer: 'FATF, BSA, EU AML directives, and other international KYC/AML standards.',
        }],
      },
    };
  }
  private createAMLComplianceTemplate(): ZKPTemplate {
    return {
      id: 'aml_compliance_v1',
      name: 'AML Compliance',
      description: 'Prove anti-money laundering compliance without revealing screening details',
      category: 'compliance',
      subcategory: 'aml_proof',
      circuitId: 'aml_compliance',
      version: '1.0.0',
      difficulty: 'advanced',
      estimatedTime: 85,
      gasEstimate: 210000,
      requirements: {
        credentials: [{
          type: 'AMLCredential',
          required: true,
          description: 'Verified AML compliance screening from financial institution',
        }],
        inputs: [{
          name: 'screeningLevel',
          type: 'string',
          required: true,
          description: 'Required AML screening level (standard, enhanced, comprehensive)',
        }, {
          name: 'riskTolerance',
          type: 'string',
          required: false,
          description: 'Risk tolerance level (low, medium, high)',
        }],
        outputs: [{
          name: 'isAMLCompliant',
          type: 'boolean',
          description: 'Whether the person meets AML compliance requirements',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['aml', 'compliance', 'screening', 'financial'],
        usageCount: 0,
        rating: 4.7,
        reviews: 67,
        featured: true,
        verified: true,
        securityLevel: 'enterprise',
      },
      circuit: {
        wasmUrl: '/circuits/aml_compliance.wasm',
        zkeyUrl: '/circuits/aml_compliance.zkey',
        vkeyUrl: '/circuits/aml_compliance_vkey.json',
        constraintCount: 2560,
        publicSignalCount: 1,
        privateSignalCount: 5,
      },
      examples: [{
        name: 'Banking Onboarding',
        description: 'Prove AML compliance for banking relationship',
        inputs: { screeningLevel: 'enhanced', riskTolerance: 'low' },
        expectedOutputs: { isAMLCompliant: true },
        useCase: 'Banking and financial institution onboarding',
      }],
      documentation: {
        overview: 'Verify AML compliance without revealing screening results or risk assessments.',
        setupInstructions: '1. Connect AML credential\n2. Specify screening level and risk tolerance\n3. Generate proof',
        troubleshooting: 'Ensure your AML credentials are current and from authorized screening providers.',
        faq: [{
          question: 'What AML databases are checked?',
          answer: 'OFAC, EU sanctions, UN sanctions, PEP lists, and other regulatory databases.',
        }],
      },
    };
  }
  private createSanctionCheckTemplate(): ZKPTemplate {
    return {
      id: 'sanction_check_v1',
      name: 'Sanctions Screening',
      description: 'Prove clean sanctions screening without revealing screening details',
      category: 'compliance',
      subcategory: 'sanction_proof',
      circuitId: 'sanction_check',
      version: '1.0.0',
      difficulty: 'advanced',
      estimatedTime: 70,
      gasEstimate: 190000,
      requirements: {
        credentials: [{
          type: 'SanctionCredential',
          required: true,
          description: 'Verified sanctions screening from compliance provider',
        }],
        inputs: [{
          name: 'screeningScope',
          type: 'string',
          required: true,
          description: 'Screening scope (global, regional, national)',
        }, {
          name: 'sanctionLists',
          type: 'array',
          required: true,
          description: 'Array of sanction lists to check (OFAC, EU, UN, etc.)',
        }],
        outputs: [{
          name: 'isSanctionsClear',
          type: 'boolean',
          description: 'Whether the person passes sanctions screening',
          isPublic: true,
        }],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PersonaPass',
        tags: ['sanctions', 'screening', 'compliance', 'regulatory'],
        usageCount: 0,
        rating: 4.9,
        reviews: 34,
        featured: true,
        verified: true,
        securityLevel: 'enterprise',
      },
      circuit: {
        wasmUrl: '/circuits/sanction_check.wasm',
        zkeyUrl: '/circuits/sanction_check.zkey',
        vkeyUrl: '/circuits/sanction_check_vkey.json',
        constraintCount: 2048,
        publicSignalCount: 1,
        privateSignalCount: 4,
      },
      examples: [{
        name: 'International Banking',
        description: 'Prove sanctions clearance for international banking',
        inputs: { screeningScope: 'global', sanctionLists: ['OFAC', 'EU', 'UN'] },
        expectedOutputs: { isSanctionsClear: true },
        useCase: 'International banking and cross-border transactions',
      }],
      documentation: {
        overview: 'Verify sanctions screening clearance without revealing screening reports.',
        setupInstructions: '1. Connect sanctions credential\n2. Specify screening scope and lists\n3. Generate proof',
        troubleshooting: 'Ensure your sanctions credentials are current and from authorized providers.',
        faq: [{
          question: 'Which sanction lists are supported?',
          answer: 'OFAC SDN, EU sanctions, UN sanctions, UK sanctions, and other regulatory lists.',
        }],
      },
    };
  }

  /**
   * Helper methods
   */
  private addTemplate(template: ZKPTemplate): void {
    if (!this.templates[template.category]) {
      this.templates[template.category] = {};
    }
    if (!this.templates[template.category][template.subcategory]) {
      this.templates[template.category][template.subcategory] = [];
    }
    this.templates[template.category][template.subcategory].push(template);
  }

  private getAllTemplates(): ZKPTemplate[] {
    const templates: ZKPTemplate[] = [];
    for (const category of Object.values(this.templates)) {
      for (const subcategory of Object.values(category)) {
        templates.push(...subcategory);
      }
    }
    templates.push(...this.customTemplates.values());
    return templates;
  }

  private getTotalTemplateCount(): number {
    return this.getAllTemplates().length;
  }

  private validateInputs(template: ZKPTemplate, inputs: Record<string, any>): void {
    for (const requirement of template.requirements.inputs) {
      if (requirement.required && !(requirement.name in inputs)) {
        throw new Error(`Required input missing: ${requirement.name}`);
      }
      
      if (requirement.name in inputs) {
        const value = inputs[requirement.name];
        if (requirement.validation) {
          if (requirement.validation.min !== undefined && value < requirement.validation.min) {
            throw new Error(`Input ${requirement.name} below minimum: ${requirement.validation.min}`);
          }
          if (requirement.validation.max !== undefined && value > requirement.validation.max) {
            throw new Error(`Input ${requirement.name} above maximum: ${requirement.validation.max}`);
          }
        }
      }
    }
  }

  private async loadCredentials(credentialIds: string[]): Promise<any[]> {
    const credentials = [];
    for (const id of credentialIds) {
      const credential = await storageService.getCredential(id);
      if (credential) {
        credentials.push(credential);
      }
    }
    return credentials;
  }

  private validateCredentialRequirements(template: ZKPTemplate, credentials: any[]): void {
    for (const requirement of template.requirements.credentials) {
      if (requirement.required) {
        const hasCredential = credentials.some(cred => 
          cred.type === requirement.type || 
          (cred.credential && cred.credential.type.includes(requirement.type))
        );
        if (!hasCredential) {
          throw new Error(`Required credential missing: ${requirement.type}`);
        }
      }
    }
  }

  private prepareProofInputs(template: ZKPTemplate, inputs: Record<string, any>, credentials: any[]): any {
    // Combine user inputs with credential data
    const proofInputs = { ...inputs };
    
    // Extract relevant data from credentials
    credentials.forEach(cred => {
      if (cred.credential && cred.credential.credentialSubject) {
        // Add credential data to inputs based on template requirements
        Object.assign(proofInputs, cred.credential.credentialSubject);
      }
    });

    return proofInputs;
  }

  private async createZKCredential(template: ZKPTemplate, proof: ZKProof, request: ProofGenerationRequest): Promise<ZKCredential> {
    return {
      id: `zkp_${template.id}_${Date.now()}`,
      type: 'ZKCredential',
      circuitId: template.circuitId,
      commitment: proof.commitment,
      nullifierHash: proof.nullifier,
      metadata: {
        credentialType: template.category,
        source: 'zkp_template',
        commitment: proof.commitment,
        nullifierHash: proof.nullifier,
        expiresAt: request.options.expiration ? new Date(request.options.expiration).toISOString() : undefined,
        privacy_level: request.options.privacy === 'maximum' ? 'zero_knowledge' : 'selective',
      },
      created: new Date().toISOString(),
    };
  }

  private updateTemplateUsage(templateId: string): void {
    const template = this.getTemplate(templateId);
    if (template) {
      template.metadata.usageCount++;
      template.metadata.updatedAt = new Date().toISOString();
    }
  }

  private generateVerificationUrl(commitment: string): string {
    return `${window.location.origin}/verify/${commitment}`;
  }

  private generateShareableProof(proof: ZKProof): string {
    return JSON.stringify({
      commitment: proof.commitment,
      nullifier: proof.nullifier,
      publicSignals: proof.publicSignals,
      verificationKey: proof.verificationKey,
    });
  }

  private async saveCustomTemplate(template: ZKPTemplate): Promise<void> {
    // Save to local storage or remote storage
    localStorage.setItem(`zkp_template_${template.id}`, JSON.stringify(template));
  }
}

// Export singleton instance
export const zkpTemplateService = new ZKPTemplateService();