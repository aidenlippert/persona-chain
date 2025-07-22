/**
 * 🛤️ API ROADMAP SERVICE
 * Phased implementation of identity verification APIs
 * Complete architecture for real-world identity data to VCs
 */

import { verifiableCredentialService } from '../credentials/VerifiableCredentialService';
import { didCryptoService } from '../crypto/DIDCryptoService';

// 🎯 ROADMAP PHASES
export enum RoadmapPhase {
  PHASE_1_KYC = 'phase-1-kyc',
  PHASE_2_EMPLOYMENT = 'phase-2-employment',
  PHASE_3_HEALTHCARE = 'phase-3-healthcare',
  PHASE_4_ACCESS_CONTROL = 'phase-4-access-control',
  PHASE_5_TRAVEL_LIFESTYLE = 'phase-5-travel-lifestyle',
  PHASE_6_PRIVACY_ZKP = 'phase-6-privacy-zkp'
}

// 📋 COMPREHENSIVE API STRUCTURE
export interface RoadmapAPI {
  id: string;
  name: string;
  provider: string;
  domain: string;
  phase: RoadmapPhase;
  category: string;
  description: string;
  baseUrl: string;
  authType: 'oauth2' | 'api-key' | 'bearer' | 'basic';
  dataTypes: string[];
  vcTypes: string[];
  useCase: string;
  impact: 'high' | 'medium' | 'low';
  complexity: 'easy' | 'medium' | 'hard';
  compliance: string[];
  endpoints: RoadmapEndpoint[];
  credentialMapping: CredentialMapping;
  implementation: {
    enabled: boolean;
    priority: number;
    estimatedDays: number;
    dependencies: string[];
  };
}

interface RoadmapEndpoint {
  path: string;
  method: string;
  purpose: string;
  dataReturned: string[];
  credentialFields: string[];
  sampleResponse?: any;
}

interface CredentialMapping {
  vcType: string;
  credentialSubject: { [key: string]: string };
  evidenceFields: string[];
  proofRequirements: string[];
  expirationDays?: number;
  revocable: boolean;
}

/**
 * 🛤️ API ROADMAP SERVICE
 * Manages phased rollout of identity verification APIs
 */
export class APIRoadmapService {
  private roadmapAPIs: Map<string, RoadmapAPI> = new Map();
  private enabledPhases: Set<RoadmapPhase> = new Set();

  constructor() {
    this.initializeRoadmapAPIs();
    this.enablePhase(RoadmapPhase.PHASE_1_KYC); // Start with Phase 1
  }

  /**
   * 🚀 Initialize complete API roadmap
   */
  private initializeRoadmapAPIs(): void {
    this.initializePhase1KYC();
    this.initializePhase2Employment();
    this.initializePhase3Healthcare();
    this.initializePhase4AccessControl();
    this.initializePhase5TravelLifestyle();
    this.initializePhase6PrivacyZKP();
    
    console.log('🛤️ Initialized complete API roadmap:', this.roadmapAPIs.size, 'APIs across 6 phases');
  }

  /**
   * 🏆 Phase 1: Core Identity & KYC (High Impact / Low Barrier)
   */
  private initializePhase1KYC(): void {
    const phase1APIs: RoadmapAPI[] = [
      {
        id: 'plaid-kyc',
        name: 'Plaid KYC Verification',
        provider: 'Plaid',
        domain: 'Finance & Banking',
        phase: RoadmapPhase.PHASE_1_KYC,
        category: 'Financial KYC',
        description: 'Verified identity, bank account ownership, balance and transaction data for KYC compliance',
        baseUrl: 'https://production.plaid.com',
        authType: 'api-key',
        dataTypes: ['identity', 'accounts', 'balances', 'transactions'],
        vcTypes: ['KYCCredential', 'BankAccountCredential'],
        useCase: 'Reusable KYC credential across banks and lenders - builds trust, speeds onboarding',
        impact: 'high',
        complexity: 'easy',
        compliance: ['PCI-DSS', 'SOC2', 'GDPR'],
        endpoints: [
          {
            path: '/identity/get',
            method: 'POST',
            purpose: 'Get verified identity information',
            dataReturned: ['name', 'address', 'phone', 'email'],
            credentialFields: ['fullName', 'verifiedAddress', 'verifiedPhone', 'verifiedEmail']
          },
          {
            path: '/accounts/get',
            method: 'POST',
            purpose: 'Get bank account ownership verification',
            dataReturned: ['account_id', 'name', 'type', 'balances'],
            credentialFields: ['accountOwnership', 'accountType', 'verificationDate']
          }
        ],
        credentialMapping: {
          vcType: 'KYCCredential',
          credentialSubject: {
            'fullName': 'accounts[0].owners[0].names[0]',
            'verifiedAddress': 'accounts[0].owners[0].addresses[0]',
            'accountOwnership': 'accounts[0].account_id',
            'verificationLevel': 'bank_verified'
          },
          evidenceFields: ['bank_statement', 'account_verification'],
          proofRequirements: ['bank_connection', 'identity_match'],
          expirationDays: 365,
          revocable: true
        },
        implementation: {
          enabled: true,
          priority: 1,
          estimatedDays: 3,
          dependencies: []
        }
      },
      {
        id: 'trulioo-identity',
        name: 'Trulioo Global Identity',
        provider: 'Trulioo',
        domain: 'Identity & KYC',
        phase: RoadmapPhase.PHASE_1_KYC,
        category: 'Government ID Verification',
        description: 'Government-issued ID verification using global databases across 195+ countries',
        baseUrl: 'https://api.globaldatacompany.com',
        authType: 'api-key',
        dataTypes: ['identity_verification', 'document_verification', 'address_verification'],
        vcTypes: ['GovernmentIDCredential', 'AgeVerificationCredential'],
        useCase: 'Secure access to services requiring government ID verification',
        impact: 'high',
        complexity: 'medium',
        compliance: ['SOC2', 'GDPR', 'ISO27001'],
        endpoints: [
          {
            path: '/verifications/v1/verify',
            method: 'POST',
            purpose: 'Verify identity against government databases',
            dataReturned: ['verification_status', 'match_score', 'verified_fields'],
            credentialFields: ['governmentVerified', 'verificationLevel', 'matchScore']
          },
          {
            path: '/verifications/v1/documentverification',
            method: 'POST',
            purpose: 'Verify government-issued document authenticity',
            dataReturned: ['document_status', 'extracted_data', 'security_features'],
            credentialFields: ['documentType', 'documentVerified', 'extractedData']
          }
        ],
        credentialMapping: {
          vcType: 'GovernmentIDCredential',
          credentialSubject: {
            'governmentVerified': 'Record.RecordStatus',
            'verificationLevel': 'ProductName',
            'documentType': 'DocumentType',
            'verificationDate': 'UploadedDt'
          },
          evidenceFields: ['government_database', 'document_scan'],
          proofRequirements: ['government_verification', 'document_authenticity'],
          expirationDays: 1095, // 3 years
          revocable: false
        },
        implementation: {
          enabled: true,
          priority: 2,
          estimatedDays: 5,
          dependencies: ['plaid-kyc']
        }
      },
      {
        id: 'age-verification',
        name: 'Age Verification Service',
        provider: 'PersonaChain',
        domain: 'Identity & KYC',
        phase: RoadmapPhase.PHASE_1_KYC,
        category: 'Age Verification',
        description: 'Privacy-preserving age verification without revealing full birth date',
        baseUrl: 'https://api.personachain.com/age',
        authType: 'bearer',
        dataTypes: ['age_range', 'over_18', 'over_21'],
        vcTypes: ['AgeVerificationCredential'],
        useCase: 'Minimal disclosure for commerce and regulated access (e.g., over-21 without revealing birth date)',
        impact: 'medium',
        complexity: 'easy',
        compliance: ['COPPA', 'GDPR'],
        endpoints: [
          {
            path: '/verify/age',
            method: 'POST',
            purpose: 'Verify age range without revealing exact birth date',
            dataReturned: ['age_verified', 'age_range', 'verification_method'],
            credentialFields: ['ageVerified', 'minimumAge', 'verificationMethod']
          }
        ],
        credentialMapping: {
          vcType: 'AgeVerificationCredential',
          credentialSubject: {
            'ageVerified': 'age_verified',
            'minimumAge': 'minimum_age',
            'ageRange': 'age_range',
            'privacyLevel': 'minimal_disclosure'
          },
          evidenceFields: ['government_id', 'verification_method'],
          proofRequirements: ['age_verification'],
          expirationDays: 365,
          revocable: true
        },
        implementation: {
          enabled: true,
          priority: 3,
          estimatedDays: 2,
          dependencies: ['trulioo-identity']
        }
      }
    ];

    phase1APIs.forEach(api => {
      this.roadmapAPIs.set(api.id, api);
    });
  }

  /**
   * 💼 Phase 2: Employment, Education & Credit
   */
  private initializePhase2Employment(): void {
    const phase2APIs: RoadmapAPI[] = [
      {
        id: 'linkedin-employment',
        name: 'LinkedIn Employment History',
        provider: 'LinkedIn',
        domain: 'Professional & Work',
        phase: RoadmapPhase.PHASE_2_EMPLOYMENT,
        category: 'Employment Verification',
        description: 'Verified work history, roles, and professional endorsements',
        baseUrl: 'https://api.linkedin.com/v2',
        authType: 'oauth2',
        dataTypes: ['profile', 'positions', 'skills', 'endorsements'],
        vcTypes: ['EmploymentCredential', 'ProfessionalCredential'],
        useCase: 'Fast hiring and fraud prevention with verified employment history',
        impact: 'high',
        complexity: 'medium',
        compliance: ['GDPR', 'SOC2'],
        endpoints: [
          {
            path: '/people/~',
            method: 'GET',
            purpose: 'Get verified professional profile',
            dataReturned: ['firstName', 'lastName', 'headline', 'positions'],
            credentialFields: ['professionalTitle', 'currentCompany', 'workHistory']
          }
        ],
        credentialMapping: {
          vcType: 'EmploymentCredential',
          credentialSubject: {
            'professionalTitle': 'headline',
            'currentCompany': 'positions.values[0].company.name',
            'workHistory': 'positions.values',
            'verificationMethod': 'linkedin_verification'
          },
          evidenceFields: ['linkedin_profile', 'employment_history'],
          proofRequirements: ['linkedin_verification'],
          expirationDays: 365,
          revocable: true
        },
        implementation: {
          enabled: false,
          priority: 4,
          estimatedDays: 4,
          dependencies: ['plaid-kyc', 'trulioo-identity']
        }
      },
      {
        id: 'experian-credit',
        name: 'Experian Credit Score',
        provider: 'Experian',
        domain: 'Credit & Lending',
        phase: RoadmapPhase.PHASE_2_EMPLOYMENT,
        category: 'Credit Verification',
        description: 'Credit score and history for creditworthiness credentials',
        baseUrl: 'https://api.experian.com',
        authType: 'oauth2',
        dataTypes: ['credit_score', 'credit_history', 'tradelines'],
        vcTypes: ['CreditScoreCredential'],
        useCase: 'Reusable creditworthiness credential for lending and financial services',
        impact: 'high',
        complexity: 'hard',
        compliance: ['FCRA', 'SOC2', 'GDPR'],
        endpoints: [
          {
            path: '/consumerservices/credit-profile',
            method: 'POST',
            purpose: 'Get credit score and history',
            dataReturned: ['credit_score', 'credit_grade', 'payment_history'],
            credentialFields: ['creditScore', 'creditGrade', 'verificationDate']
          }
        ],
        credentialMapping: {
          vcType: 'CreditScoreCredential',
          credentialSubject: {
            'creditScore': 'credit_score',
            'creditGrade': 'credit_grade',
            'verificationDate': 'report_date',
            'bureau': 'Experian'
          },
          evidenceFields: ['credit_report', 'bureau_verification'],
          proofRequirements: ['credit_bureau_verification'],
          expirationDays: 90,
          revocable: true
        },
        implementation: {
          enabled: false,
          priority: 5,
          estimatedDays: 7,
          dependencies: ['plaid-kyc', 'trulioo-identity']
        }
      }
    ];

    phase2APIs.forEach(api => {
      this.roadmapAPIs.set(api.id, api);
    });
  }

  /**
   * 🏥 Phase 3: Healthcare & Insurance
   */
  private initializePhase3Healthcare(): void {
    const phase3APIs: RoadmapAPI[] = [
      {
        id: 'epic-fhir',
        name: 'Epic FHIR Medical Records',
        provider: 'Epic',
        domain: 'Health & Medical',
        phase: RoadmapPhase.PHASE_3_HEALTHCARE,
        category: 'Medical Records',
        description: 'Patient-controlled health credentials from EHR systems',
        baseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth',
        authType: 'oauth2',
        dataTypes: ['patient', 'immunization', 'condition', 'observation'],
        vcTypes: ['MedicalRecordCredential', 'ImmunizationCredential'],
        useCase: 'Patient-controlled health data for healthcare providers and insurers',
        impact: 'high',
        complexity: 'hard',
        compliance: ['HIPAA', 'HITECH', 'SOC2'],
        endpoints: [
          {
            path: '/Patient',
            method: 'GET',
            purpose: 'Get patient demographic and medical information',
            dataReturned: ['name', 'birthDate', 'gender', 'address'],
            credentialFields: ['patientId', 'demographics', 'medicalRecordNumber']
          },
          {
            path: '/Immunization',
            method: 'GET',
            purpose: 'Get vaccination records',
            dataReturned: ['vaccineCode', 'occurrenceDate', 'status'],
            credentialFields: ['vaccineType', 'vaccinationDate', 'vaccinationStatus']
          }
        ],
        credentialMapping: {
          vcType: 'ImmunizationCredential',
          credentialSubject: {
            'vaccineType': 'vaccineCode.text',
            'vaccinationDate': 'occurrenceDateTime',
            'vaccinationStatus': 'status',
            'healthcareProvider': 'performer.actor.display'
          },
          evidenceFields: ['medical_record', 'healthcare_provider'],
          proofRequirements: ['ehr_verification', 'healthcare_provider_signature'],
          expirationDays: 1825, // 5 years
          revocable: false
        },
        implementation: {
          enabled: false,
          priority: 6,
          estimatedDays: 10,
          dependencies: ['plaid-kyc', 'trulioo-identity']
        }
      }
    ];

    phase3APIs.forEach(api => {
      this.roadmapAPIs.set(api.id, api);
    });
  }

  /**
   * 🚪 Phase 4: Access Control & Physical Security
   */
  private initializePhase4AccessControl(): void {
    const phase4APIs: RoadmapAPI[] = [
      {
        id: 'kisi-access',
        name: 'Kisi Smart Access',
        provider: 'Kisi',
        domain: 'Access & Physical Security',
        phase: RoadmapPhase.PHASE_4_ACCESS_CONTROL,
        category: 'Building Access',
        description: 'Smart lock access history and rights for role-based credentials',
        baseUrl: 'https://api.kisi.io',
        authType: 'api-key',
        dataTypes: ['access_events', 'user_permissions', 'door_access'],
        vcTypes: ['BuildingAccessCredential', 'EmployeeBadgeCredential'],
        useCase: 'Digital and physical role-based access across facilities and SaaS',
        impact: 'medium',
        complexity: 'medium',
        compliance: ['SOC2', 'ISO27001'],
        endpoints: [
          {
            path: '/access_events',
            method: 'GET',
            purpose: 'Get building access history',
            dataReturned: ['door_name', 'access_time', 'access_granted'],
            credentialFields: ['buildingAccess', 'accessLevel', 'accessHistory']
          }
        ],
        credentialMapping: {
          vcType: 'BuildingAccessCredential',
          credentialSubject: {
            'buildingAccess': 'building_name',
            'accessLevel': 'permission_level',
            'accessRights': 'doors_accessible',
            'employeeStatus': 'active'
          },
          evidenceFields: ['access_logs', 'permission_grants'],
          proofRequirements: ['facility_verification'],
          expirationDays: 180,
          revocable: true
        },
        implementation: {
          enabled: false,
          priority: 7,
          estimatedDays: 5,
          dependencies: ['linkedin-employment']
        }
      }
    ];

    phase4APIs.forEach(api => {
      this.roadmapAPIs.set(api.id, api);
    });
  }

  /**
   * ✈️ Phase 5: Travel & Lifestyle
   */
  private initializePhase5TravelLifestyle(): void {
    const phase5APIs: RoadmapAPI[] = [
      {
        id: 'amadeus-travel',
        name: 'Amadeus Travel API',
        provider: 'Amadeus',
        domain: 'Travel & Mobility',
        phase: RoadmapPhase.PHASE_5_TRAVEL_LIFESTYLE,
        category: 'Travel Credentials',
        description: 'Flight bookings and travel itinerary credentials',
        baseUrl: 'https://api.amadeus.com',
        authType: 'oauth2',
        dataTypes: ['bookings', 'flights', 'itinerary'],
        vcTypes: ['FlightTicketCredential', 'TravelCredential'],
        useCase: 'Scannable boarding passes and event tickets at entry points',
        impact: 'medium',
        complexity: 'medium',
        compliance: ['GDPR', 'SOC2'],
        endpoints: [
          {
            path: '/v2/booking/flight-orders',
            method: 'GET',
            purpose: 'Get flight booking information',
            dataReturned: ['booking_reference', 'flight_segments', 'passenger_details'],
            credentialFields: ['bookingReference', 'flightDetails', 'travelDate']
          }
        ],
        credentialMapping: {
          vcType: 'FlightTicketCredential',
          credentialSubject: {
            'bookingReference': 'id',
            'flightNumber': 'itineraries[0].segments[0].carrierCode',
            'departureDate': 'itineraries[0].segments[0].departure.at',
            'passengerName': 'travelers[0].name'
          },
          evidenceFields: ['booking_confirmation', 'payment_record'],
          proofRequirements: ['airline_verification'],
          expirationDays: 1,
          revocable: true
        },
        implementation: {
          enabled: false,
          priority: 8,
          estimatedDays: 6,
          dependencies: ['plaid-kyc', 'trulioo-identity']
        }
      }
    ];

    phase5APIs.forEach(api => {
      this.roadmapAPIs.set(api.id, api);
    });
  }

  /**
   * 🔐 Phase 6: Privacy & Zero-Knowledge Proofs
   */
  private initializePhase6PrivacyZKP(): void {
    const phase6APIs: RoadmapAPI[] = [
      {
        id: 'zkp-income',
        name: 'ZK Income Verification',
        provider: 'PersonaChain',
        domain: 'Privacy & ZKP',
        phase: RoadmapPhase.PHASE_6_PRIVACY_ZKP,
        category: 'Zero-Knowledge Proofs',
        description: 'Prove income range without revealing exact salary using zero-knowledge proofs',
        baseUrl: 'https://api.personachain.com/zkp',
        authType: 'bearer',
        dataTypes: ['income_range', 'employment_status', 'zkp_proof'],
        vcTypes: ['ZKIncomeCredential'],
        useCase: 'Show earning over $50k/year without revealing salary details',
        impact: 'high',
        complexity: 'hard',
        compliance: ['GDPR', 'Zero-Knowledge'],
        endpoints: [
          {
            path: '/generate/income-proof',
            method: 'POST',
            purpose: 'Generate zero-knowledge proof of income range',
            dataReturned: ['zk_proof', 'income_range', 'proof_validity'],
            credentialFields: ['incomeRange', 'zkProof', 'verificationMethod']
          }
        ],
        credentialMapping: {
          vcType: 'ZKIncomeCredential',
          credentialSubject: {
            'incomeRange': 'income_range',
            'zkProof': 'zk_proof',
            'privacyLevel': 'zero_knowledge',
            'verificationMethod': 'zk_proof_verification'
          },
          evidenceFields: ['zk_proof', 'income_verification'],
          proofRequirements: ['zero_knowledge_proof', 'income_source_verification'],
          expirationDays: 90,
          revocable: true
        },
        implementation: {
          enabled: false,
          priority: 9,
          estimatedDays: 14,
          dependencies: ['plaid-kyc', 'linkedin-employment', 'experian-credit']
        }
      }
    ];

    phase6APIs.forEach(api => {
      this.roadmapAPIs.set(api.id, api);
    });
  }

  /**
   * 🔄 Enable specific roadmap phase
   */
  enablePhase(phase: RoadmapPhase): void {
    this.enabledPhases.add(phase);
    console.log(`✅ Enabled roadmap phase: ${phase}`);
  }

  /**
   * 🚫 Disable specific roadmap phase
   */
  disablePhase(phase: RoadmapPhase): void {
    this.enabledPhases.delete(phase);
    console.log(`❌ Disabled roadmap phase: ${phase}`);
  }

  /**
   * 🔍 Get enabled APIs
   */
  getEnabledAPIs(): RoadmapAPI[] {
    return Array.from(this.roadmapAPIs.values())
      .filter(api => this.enabledPhases.has(api.phase) && api.implementation.enabled)
      .sort((a, b) => a.implementation.priority - b.implementation.priority);
  }

  /**
   * 🛤️ Get roadmap status
   */
  getRoadmapStatus(): {
    totalAPIs: number;
    enabledPhases: RoadmapPhase[];
    enabledAPIs: number;
    phaseBreakdown: { [key in RoadmapPhase]: number };
    nextPriority: RoadmapAPI | null;
  } {
    const phaseBreakdown = {} as { [key in RoadmapPhase]: number };
    Object.values(RoadmapPhase).forEach(phase => {
      phaseBreakdown[phase] = Array.from(this.roadmapAPIs.values())
        .filter(api => api.phase === phase).length;
    });

    const enabledAPIs = this.getEnabledAPIs();
    const nextPriority = enabledAPIs.length > 0 ? enabledAPIs[0] : null;

    return {
      totalAPIs: this.roadmapAPIs.size,
      enabledPhases: Array.from(this.enabledPhases),
      enabledAPIs: enabledAPIs.length,
      phaseBreakdown,
      nextPriority
    };
  }

  /**
   * 🎯 Get API by ID
   */
  getAPI(id: string): RoadmapAPI | undefined {
    return this.roadmapAPIs.get(id);
  }

  /**
   * 🔍 Search roadmap APIs
   */
  searchAPIs(query: string, phase?: RoadmapPhase): RoadmapAPI[] {
    const searchTerms = query.toLowerCase().split(' ');
    
    return Array.from(this.roadmapAPIs.values())
      .filter(api => {
        // Phase filter
        if (phase && api.phase !== phase) return false;
        
        // Search filter
        const searchText = `${api.name} ${api.description} ${api.domain} ${api.category}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      })
      .sort((a, b) => a.implementation.priority - b.implementation.priority);
  }
}

// 🏭 Export singleton instance
export const apiRoadmapService = new APIRoadmapService();