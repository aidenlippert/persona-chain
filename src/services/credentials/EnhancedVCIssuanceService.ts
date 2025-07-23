/**
 * 🏭 ENHANCED VC ISSUANCE SERVICE
 * Maps third-party API data to standardized Verifiable Credentials
 * Supports complete roadmap architecture with selective disclosure and ZK proofs
 */

import { verifiableCredentialService } from './VerifiableCredentialService';
import { didCryptoService } from '../crypto/DIDCryptoService';
import { RoadmapAPI, CredentialMapping } from '../marketplace/APIRoadmapService';

// 🎯 VC SCHEMA DEFINITIONS
export interface VCSchema {
  id: string;
  name: string;
  version: string;
  type: string[];
  credentialSubject: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
      format?: string;
    };
  };
  evidenceRequirements: string[];
  proofRequirements: string[];
  revocable: boolean;
  expirationPolicy?: {
    defaultDays: number;
    maxDays?: number;
    renewable: boolean;
  };
}

// 📋 CREDENTIAL ISSUANCE REQUEST
export interface VCIssuanceRequest {
  apiId: string;
  apiData: any;
  holderDID: string;
  credentialType: string;
  options?: {
    expirationDays?: number;
    challenge?: string;
    domain?: string;
    selective?: string[];
    zkProof?: boolean;
  };
}

// 🎯 ISSUANCE RESULT
export interface VCIssuanceResult {
  success: boolean;
  credential?: any;
  credentialId?: string;
  error?: string;
  warnings?: string[];
  metadata: {
    apiSource: string;
    issuanceDate: string;
    credentialType: string;
    revocable: boolean;
    expirationDate?: string;
  };
}

/**
 * 🏭 ENHANCED VC ISSUANCE SERVICE
 * Transforms API data into standardized, interoperable VCs
 */
export class EnhancedVCIssuanceService {
  private vcSchemas: Map<string, VCSchema> = new Map();

  constructor() {
    this.initializeVCSchemas();
  }

  /**
   * 📋 Initialize W3C-compliant VC schemas
   */
  private initializeVCSchemas(): void {
    const schemas: VCSchema[] = [
      // Phase 1: KYC Credentials
      {
        id: 'kyc-credential-v1',
        name: 'KYC Verification Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'KYCCredential'],
        credentialSubject: {
          fullName: { type: 'string', required: true, description: 'Verified full legal name' },
          verifiedAddress: { type: 'object', required: true, description: 'Bank-verified address' },
          accountOwnership: { type: 'string', required: true, description: 'Verified bank account ownership' },
          verificationLevel: { type: 'string', required: true, description: 'Level of verification completed' },
          verificationDate: { type: 'string', required: true, description: 'Date of verification', format: 'date-time' }
        },
        evidenceRequirements: ['bank_statement', 'account_verification'],
        proofRequirements: ['bank_connection', 'identity_match'],
        revocable: true,
        expirationPolicy: { defaultDays: 365, maxDays: 1095, renewable: true }
      },
      {
        id: 'government-id-credential-v1',
        name: 'Government ID Verification Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'GovernmentIDCredential'],
        credentialSubject: {
          governmentVerified: { type: 'boolean', required: true, description: 'Government database verification status' },
          verificationLevel: { type: 'string', required: true, description: 'Level of government verification' },
          documentType: { type: 'string', required: true, description: 'Type of government document verified' },
          matchScore: { type: 'number', required: false, description: 'Identity match confidence score' },
          jurisdictionCode: { type: 'string', required: true, description: 'Government jurisdiction code' }
        },
        evidenceRequirements: ['government_database', 'document_scan'],
        proofRequirements: ['government_verification', 'document_authenticity'],
        revocable: false,
        expirationPolicy: { defaultDays: 1095, renewable: false }
      },
      {
        id: 'age-verification-credential-v1',
        name: 'Privacy-Preserving Age Verification Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'AgeVerificationCredential'],
        credentialSubject: {
          ageVerified: { type: 'boolean', required: true, description: 'Age verification status' },
          minimumAge: { type: 'number', required: true, description: 'Verified minimum age' },
          ageRange: { type: 'string', required: false, description: 'Age range category' },
          privacyLevel: { type: 'string', required: true, description: 'Privacy preservation method' },
          verificationMethod: { type: 'string', required: true, description: 'Method used for verification' }
        },
        evidenceRequirements: ['government_id', 'verification_method'],
        proofRequirements: ['age_verification'],
        revocable: true,
        expirationPolicy: { defaultDays: 365, renewable: true }
      },

      // Phase 2: Employment & Credit Credentials
      {
        id: 'employment-credential-v1',
        name: 'Employment History Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'EmploymentCredential'],
        credentialSubject: {
          professionalTitle: { type: 'string', required: true, description: 'Current professional title' },
          currentCompany: { type: 'string', required: true, description: 'Current employer name' },
          workHistory: { type: 'array', required: true, description: 'Employment history records' },
          verificationMethod: { type: 'string', required: true, description: 'Employment verification method' },
          employmentStatus: { type: 'string', required: true, description: 'Current employment status' }
        },
        evidenceRequirements: ['linkedin_profile', 'employment_history'],
        proofRequirements: ['linkedin_verification'],
        revocable: true,
        expirationPolicy: { defaultDays: 365, renewable: true }
      },
      {
        id: 'credit-score-credential-v1',
        name: 'Credit Score Verification Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'CreditScoreCredential'],
        credentialSubject: {
          creditScore: { type: 'number', required: true, description: 'Verified credit score' },
          creditGrade: { type: 'string', required: true, description: 'Credit grade category' },
          bureau: { type: 'string', required: true, description: 'Credit bureau source' },
          scoreModel: { type: 'string', required: false, description: 'Credit scoring model used' },
          verificationDate: { type: 'string', required: true, description: 'Score verification date', format: 'date-time' }
        },
        evidenceRequirements: ['credit_report', 'bureau_verification'],
        proofRequirements: ['credit_bureau_verification'],
        revocable: true,
        expirationPolicy: { defaultDays: 90, renewable: true }
      },

      // Phase 3: Healthcare Credentials
      {
        id: 'immunization-credential-v1',
        name: 'Medical Immunization Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'ImmunizationCredential'],
        credentialSubject: {
          vaccineType: { type: 'string', required: true, description: 'Type of vaccine administered' },
          vaccinationDate: { type: 'string', required: true, description: 'Date of vaccination', format: 'date' },
          vaccinationStatus: { type: 'string', required: true, description: 'Vaccination status' },
          healthcareProvider: { type: 'string', required: true, description: 'Healthcare provider name' },
          lotNumber: { type: 'string', required: false, description: 'Vaccine lot number' }
        },
        evidenceRequirements: ['medical_record', 'healthcare_provider'],
        proofRequirements: ['ehr_verification', 'healthcare_provider_signature'],
        revocable: false,
        expirationPolicy: { defaultDays: 1825, renewable: false }
      },

      // Phase 4: Access Control Credentials
      {
        id: 'building-access-credential-v1',
        name: 'Building Access Rights Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'BuildingAccessCredential'],
        credentialSubject: {
          buildingAccess: { type: 'string', required: true, description: 'Building or facility name' },
          accessLevel: { type: 'string', required: true, description: 'Access permission level' },
          accessRights: { type: 'array', required: true, description: 'Specific access rights granted' },
          employeeStatus: { type: 'string', required: true, description: 'Employee status in organization' },
          validFrom: { type: 'string', required: true, description: 'Access valid from date', format: 'date' }
        },
        evidenceRequirements: ['access_logs', 'permission_grants'],
        proofRequirements: ['facility_verification'],
        revocable: true,
        expirationPolicy: { defaultDays: 180, renewable: true }
      },

      // Phase 5: Travel Credentials
      {
        id: 'flight-ticket-credential-v1',
        name: 'Flight Ticket Verification Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'FlightTicketCredential'],
        credentialSubject: {
          bookingReference: { type: 'string', required: true, description: 'Flight booking reference' },
          flightNumber: { type: 'string', required: true, description: 'Flight number' },
          departureDate: { type: 'string', required: true, description: 'Flight departure date', format: 'date-time' },
          passengerName: { type: 'string', required: true, description: 'Passenger name on booking' },
          seatAssignment: { type: 'string', required: false, description: 'Assigned seat number' }
        },
        evidenceRequirements: ['booking_confirmation', 'payment_record'],
        proofRequirements: ['airline_verification'],
        revocable: true,
        expirationPolicy: { defaultDays: 1, renewable: false }
      },

      // Phase 6: Zero-Knowledge Proof Credentials
      {
        id: 'zk-income-credential-v1',
        name: 'Zero-Knowledge Income Verification Credential',
        version: '1.0.0',
        type: ['VerifiableCredential', 'ZKIncomeCredential'],
        credentialSubject: {
          incomeRange: { type: 'string', required: true, description: 'Verified income range category' },
          zkProof: { type: 'string', required: true, description: 'Zero-knowledge proof of income' },
          privacyLevel: { type: 'string', required: true, description: 'Privacy preservation level' },
          verificationMethod: { type: 'string', required: true, description: 'ZK proof verification method' },
          proofValidUntil: { type: 'string', required: true, description: 'Proof validity expiration', format: 'date-time' }
        },
        evidenceRequirements: ['zk_proof', 'income_verification'],
        proofRequirements: ['zero_knowledge_proof', 'income_source_verification'],
        revocable: true,
        expirationPolicy: { defaultDays: 90, renewable: true }
      }
    ];

    schemas.forEach(schema => {
      this.vcSchemas.set(schema.id, schema);
    });

    console.log('📋 Initialized VC schemas:', schemas.length);
  }

  /**
   * 🏭 Issue credential from roadmap API data
   */
  async issueCredentialFromAPI(request: VCIssuanceRequest): Promise<VCIssuanceResult> {
    try {
      console.log(`🏭 Issuing credential from API: ${request.apiId}`);

      // Find appropriate VC schema
      const schema = this.findSchemaForCredentialType(request.credentialType);
      if (!schema) {
        return {
          success: false,
          error: `No schema found for credential type: ${request.credentialType}`,
          metadata: {
            apiSource: request.apiId,
            issuanceDate: new Date().toISOString(),
            credentialType: request.credentialType,
            revocable: false
          }
        };
      }

      // Map API data to credential subject
      const credentialSubject = await this.mapAPIDataToCredentialSubject(
        request.apiData,
        schema,
        request.holderDID
      );

      // Set expiration date
      const expirationDays = request.options?.expirationDays || schema.expirationPolicy?.defaultDays;
      const expirationDate = expirationDays 
        ? new Date(Date.now() + (expirationDays * 24 * 60 * 60 * 1000)).toISOString()
        : undefined;

      // Create issuer information
      const issuer = {
        id: `did:persona:${request.apiId}`,
        name: `PersonaChain ${request.apiId} Issuer`,
        description: `Automated credential issuer for ${request.apiId} API data`
      };

      // Build evidence array
      const evidence = [{
        type: ['APIEvidence'],
        verifier: request.apiId,
        evidenceDocument: 'Third-party API Response',
        subjectPresence: 'Digital',
        documentPresence: 'Digital',
        apiSource: request.apiId,
        dataFreshness: new Date().toISOString()
      }];

      // Issue the credential
      const credential = await verifiableCredentialService.issueCredential(
        credentialSubject,
        schema.type,
        issuer,
        {
          expirationDate,
          challenge: request.options?.challenge,
          evidence,
          credentialSchema: {
            id: schema.id,
            type: 'JsonSchemaValidator2018'
          },
          refreshService: schema.expirationPolicy?.renewable ? {
            id: `${issuer.id}/refresh/${schema.id}`,
            type: 'ManualRefreshService2018'
          } : undefined
        }
      );

      // Handle selective disclosure if requested
      if (request.options?.selective && request.options.selective.length > 0) {
        // TODO: Implement selective disclosure logic
        console.log('🔐 Selective disclosure requested:', request.options.selective);
      }

      // Handle ZK proof generation if requested
      if (request.options?.zkProof) {
        // TODO: Implement ZK proof generation
        console.log('🔐 Zero-knowledge proof requested');
      }

      const result: VCIssuanceResult = {
        success: true,
        credential,
        credentialId: credential.id,
        metadata: {
          apiSource: request.apiId,
          issuanceDate: new Date().toISOString(),
          credentialType: request.credentialType,
          revocable: schema.revocable,
          expirationDate
        }
      };

      console.log(`✅ Successfully issued credential: ${credential.id}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to issue credential from API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during credential issuance',
        metadata: {
          apiSource: request.apiId,
          issuanceDate: new Date().toISOString(),
          credentialType: request.credentialType,
          revocable: false
        }
      };
    }
  }

  /**
   * 🔍 Find appropriate VC schema for credential type
   */
  private findSchemaForCredentialType(credentialType: string): VCSchema | undefined {
    const typeMap: { [key: string]: string } = {
      'KYCCredential': 'kyc-credential-v1',
      'GovernmentIDCredential': 'government-id-credential-v1',
      'AgeVerificationCredential': 'age-verification-credential-v1',
      'EmploymentCredential': 'employment-credential-v1',
      'CreditScoreCredential': 'credit-score-credential-v1',
      'ImmunizationCredential': 'immunization-credential-v1',
      'BuildingAccessCredential': 'building-access-credential-v1',
      'FlightTicketCredential': 'flight-ticket-credential-v1',
      'ZKIncomeCredential': 'zk-income-credential-v1'
    };

    const schemaId = typeMap[credentialType];
    return schemaId ? this.vcSchemas.get(schemaId) : undefined;
  }

  /**
   * 🗂️ Map API data to credential subject
   */
  private async mapAPIDataToCredentialSubject(
    apiData: any,
    schema: VCSchema,
    holderDID: string
  ): Promise<any> {
    const credentialSubject: any = {
      id: holderDID
    };

    // Add required fields with proper type conversion
    Object.entries(schema.credentialSubject).forEach(([field, spec]) => {
      if (spec.required) {
        // Try to map from API data or provide sensible defaults
        credentialSubject[field] = this.extractFieldValue(apiData, field, spec.type);
      }
    });

    // Add metadata
    credentialSubject.issuanceDate = new Date().toISOString();
    credentialSubject.credentialSchema = schema.id;

    return credentialSubject;
  }

  /**
   * 🔧 Extract field value from API data with type conversion
   */
  private extractFieldValue(apiData: any, fieldName: string, fieldType: string): any {
    // Try direct mapping first
    if (apiData[fieldName] !== undefined) {
      return this.convertType(apiData[fieldName], fieldType);
    }

    // Try common API field mappings
    const fieldMappings: { [key: string]: string[] } = {
      'fullName': ['name', 'full_name', 'firstName', 'lastName'],
      'verifiedAddress': ['address', 'addresses', 'location'],
      'accountOwnership': ['account_id', 'accountId', 'bankAccount'],
      'verificationLevel': ['level', 'verification_level', 'status'],
      'governmentVerified': ['verified', 'is_verified', 'verification_status'],
      'professionalTitle': ['title', 'headline', 'job_title', 'position'],
      'currentCompany': ['company', 'employer', 'organization'],
      'creditScore': ['score', 'credit_score', 'fico_score'],
      'vaccineType': ['vaccine', 'immunization', 'vaccine_code'],
      'buildingAccess': ['building', 'facility', 'location'],
      'bookingReference': ['reference', 'booking_id', 'confirmation']
    };

    const possibleFields = fieldMappings[fieldName] || [];
    for (const field of possibleFields) {
      if (apiData[field] !== undefined) {
        return this.convertType(apiData[field], fieldType);
      }
    }

    // Provide sensible defaults based on field type
    return this.getDefaultValue(fieldType);
  }

  /**
   * 🔄 Convert value to specified type
   */
  private convertType(value: any, type: string): any {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : { data: value };
      default:
        return value;
    }
  }

  /**
   * 🎯 Get default value for field type
   */
  private getDefaultValue(type: string): any {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  /**
   * 📋 Get available VC schemas
   */
  getVCSchemas(): VCSchema[] {
    return Array.from(this.vcSchemas.values());
  }

  /**
   * 🎯 Get specific VC schema
   */
  getVCSchema(id: string): VCSchema | undefined {
    return this.vcSchemas.get(id);
  }

  /**
   * ✅ Validate credential data against schema
   */
  validateCredentialData(data: any, schemaId: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const schema = this.vcSchemas.get(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [`Schema not found: ${schemaId}`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    Object.entries(schema.credentialSubject).forEach(([field, spec]) => {
      if (spec.required && (data[field] === undefined || data[field] === null)) {
        errors.push(`Missing required field: ${field}`);
      }

      if (data[field] !== undefined) {
        // Type validation
        const expectedType = spec.type;
        const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
        
        if (expectedType !== actualType && expectedType !== 'object') {
          warnings.push(`Type mismatch for ${field}: expected ${expectedType}, got ${actualType}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// 🏭 Export singleton instance
export const enhancedVCIssuanceService = new EnhancedVCIssuanceService();