/**
 * Verifiable Credential Generation Framework for PersonaPass
 * Converts API data into W3C compliant Verifiable Credentials
 */

import { VerifiableCredential, CredentialSubject } from '../../../types/credentials';

export interface VCTemplate {
  type: string;
  context: string[];
  credentialSchema?: {
    id: string;
    type: string;
  };
  requiredFields: string[];
  optionalFields?: string[];
  expirationMonths?: number;
  refreshable?: boolean;
}

export interface ApiDataMapping {
  apiField: string;
  vcField: string;
  transform?: (value: any) => any;
  required?: boolean;
}

export interface VCGenerationConfig {
  template: VCTemplate;
  mappings: ApiDataMapping[];
  issuer: {
    id: string;
    name: string;
    url?: string;
  };
  proofType?: 'Ed25519Signature2020' | 'JsonWebSignature2020' | 'ZKProof';
}

export class VCGenerationFramework {
  private static instance: VCGenerationFramework;
  private templates: Map<string, VCTemplate> = new Map();

  private constructor() {
    this.loadDefaultTemplates();
  }

  static getInstance(): VCGenerationFramework {
    if (!VCGenerationFramework.instance) {
      VCGenerationFramework.instance = new VCGenerationFramework();
    }
    return VCGenerationFramework.instance;
  }

  /**
   * Generate VC from API data using specified configuration
   */
  async generateVC(
    apiData: any,
    config: VCGenerationConfig,
    subjectDid: string
  ): Promise<VerifiableCredential> {
    const { template, mappings, issuer, proofType = 'Ed25519Signature2020' } = config;

    // Map API data to VC format
    const credentialSubject = this.mapApiDataToVC(apiData, mappings, subjectDid);

    // Validate required fields
    this.validateRequiredFields(credentialSubject, template.requiredFields);

    // Generate VC
    const vc: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        ...template.context
      ],
      type: ['VerifiableCredential', template.type],
      issuer: {
        id: issuer.id,
        name: issuer.name,
        ...(issuer.url && { url: issuer.url })
      },
      issuanceDate: new Date().toISOString(),
      ...(template.expirationMonths && {
        expirationDate: new Date(
          Date.now() + template.expirationMonths * 30 * 24 * 60 * 60 * 1000
        ).toISOString()
      }),
      credentialSubject,
      ...(template.credentialSchema && {
        credentialSchema: template.credentialSchema
      }),
      ...(template.refreshable && {
        refreshService: {
          id: `${issuer.id}/refresh`,
          type: 'ManualRefreshService2018'
        }
      })
    };

    // Add proof if specified
    if (proofType) {
      vc.proof = await this.generateProof(vc, proofType);
    }

    return vc;
  }

  /**
   * Map API response data to VC credential subject
   */
  private mapApiDataToVC(
    apiData: any,
    mappings: ApiDataMapping[],
    subjectDid: string
  ): CredentialSubject {
    const credentialSubject: CredentialSubject = {
      id: subjectDid
    };

    mappings.forEach(mapping => {
      const value = this.getNestedValue(apiData, mapping.apiField);
      
      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value;
        this.setNestedValue(credentialSubject, mapping.vcField, transformedValue);
      } else if (mapping.required) {
        throw new Error(`Required field ${mapping.apiField} is missing from API data`);
      }
    });

    return credentialSubject;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Validate that all required fields are present
   */
  private validateRequiredFields(credentialSubject: CredentialSubject, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      this.getNestedValue(credentialSubject, field) === undefined
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Generate cryptographic proof for VC
   */
  private async generateProof(vc: VerifiableCredential, proofType: string): Promise<any> {
    // This would integrate with the actual signing service
    // For now, return a mock proof structure
    return {
      type: proofType,
      created: new Date().toISOString(),
      verificationMethod: 'did:persona:issuer#keys-1',
      proofPurpose: 'assertionMethod',
      ...(proofType === 'ZKProof' && {
        zkProof: {
          type: 'BoundedSignature',
          algorithm: 'BLS12-381'
        }
      })
    };
  }

  /**
   * Load default VC templates for various data sources
   */
  private loadDefaultTemplates(): void {
    // Financial credential templates
    this.templates.set('BankAccountCredential', {
      type: 'BankAccountCredential',
      context: ['https://schema.persona.org/credentials/banking/v1'],
      requiredFields: ['bankAccount.accountType', 'bankAccount.institutionName'],
      optionalFields: ['bankAccount.routingNumber', 'bankAccount.lastFourDigits'],
      expirationMonths: 12,
      refreshable: true
    });

    this.templates.set('IncomeVerificationCredential', {
      type: 'IncomeVerificationCredential',
      context: ['https://schema.persona.org/credentials/income/v1'],
      requiredFields: ['income.annualAmount', 'income.currency', 'employment.employer'],
      optionalFields: ['income.frequency', 'employment.position'],
      expirationMonths: 6,
      refreshable: true
    });

    // Identity credential templates
    this.templates.set('AddressVerificationCredential', {
      type: 'AddressVerificationCredential', 
      context: ['https://schema.persona.org/credentials/address/v1'],
      requiredFields: ['address.street', 'address.city', 'address.postalCode'],
      optionalFields: ['address.state', 'address.country'],
      expirationMonths: 24,
      refreshable: true
    });

    this.templates.set('PhoneVerificationCredential', {
      type: 'PhoneVerificationCredential',
      context: ['https://schema.persona.org/credentials/phone/v1'],
      requiredFields: ['phone.number', 'phone.verified'],
      optionalFields: ['phone.countryCode', 'phone.carrier'],
      expirationMonths: 12,
      refreshable: true
    });

    // Employment credential templates
    this.templates.set('EmploymentCredential', {
      type: 'EmploymentCredential',
      context: ['https://schema.persona.org/credentials/employment/v1'],
      requiredFields: ['employment.employer', 'employment.position', 'employment.startDate'],
      optionalFields: ['employment.endDate', 'employment.salary', 'employment.department'],
      expirationMonths: 12,
      refreshable: true
    });

    // Education credential templates
    this.templates.set('EducationCredential', {
      type: 'EducationCredential',
      context: ['https://schema.persona.org/credentials/education/v1'],
      requiredFields: ['education.institution', 'education.degree', 'education.graduationDate'],
      optionalFields: ['education.major', 'education.gpa', 'education.honors'],
      expirationMonths: 60, // 5 years
      refreshable: false
    });

    // Healthcare credential templates
    this.templates.set('VaccinationCredential', {
      type: 'VaccinationCredential',
      context: ['https://schema.persona.org/credentials/health/v1'],
      requiredFields: ['vaccination.vaccine', 'vaccination.date', 'vaccination.provider'],
      optionalFields: ['vaccination.batchNumber', 'vaccination.site'],
      expirationMonths: 24,
      refreshable: false
    });
  }

  /**
   * Get available VC templates
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get specific VC template
   */
  getTemplate(type: string): VCTemplate | undefined {
    return this.templates.get(type);
  }

  /**
   * Register custom VC template
   */
  registerTemplate(type: string, template: VCTemplate): void {
    this.templates.set(type, template);
  }
}

export default VCGenerationFramework;