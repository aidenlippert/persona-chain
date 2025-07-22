/**
 * 🌍 ESSENTIAL API MARKETPLACE SERVICE
 * Only contains critical APIs for professional identity verification
 * Clean, curated list of essential healthcare, financial, and identity services
 */

import { VerifiableCredential } from '../credentials/VerifiableCredentialService';
import { didCryptoService } from '../crypto/DIDCryptoService';

// 🏥 Healthcare API Categories
export interface HealthcareAPI {
  id: string;
  name: string;
  provider: 'pVerify';
  category: 'eligibility';
  description: string;
  baseUrl: string;
  compliance: ('HIPAA' | 'HITECH' | 'SOC2' | 'GDPR')[];
  endpoints: HealthcareEndpoint[];
  pricing: {
    model: 'per-request';
    freeQuota: number;
    paidRate: string;
  };
  documentation: string;
  testMode: boolean;
}

export interface HealthcareEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  purpose: string;
  requiredAuth: ('api-key' | 'oauth2' | 'jwt')[];
  sampleRequest?: any;
  sampleResponse?: any;
  credentialType: string;
}

// 💰 Financial API Categories
export interface FinancialAPI {
  id: string;
  name: string;
  provider: 'Plaid';
  category: 'account-verification';
  description: string;
  baseUrl: string;
  compliance: ('PCI-DSS' | 'SOC2' | 'GDPR')[];
  endpoints: FinancialEndpoint[];
  regions: string[];
  pricing: {
    model: 'per-account';
    freeQuota: number;
    paidRate: string;
  };
  documentation: string;
  testMode: boolean;
}

export interface FinancialEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  purpose: string;
  requiredAuth: ('api-key' | 'oauth2')[];
  sampleRequest?: any;
  sampleResponse?: any;
  credentialType: string;
}

// 🏛️ Government API Categories
export interface GovernmentAPI {
  id: string;
  name: string;
  provider: 'ID.me';
  category: 'identity';
  description: string;
  baseUrl: string;
  compliance: ('FedRAMP' | 'SOC2' | 'NIST')[];
  endpoints: GovernmentEndpoint[];
  jurisdiction: string[];
  pricing: {
    model: 'government-contract';
    freeQuota: number;
    paidRate: string;
  };
  documentation: string;
  testMode: boolean;
}

export interface GovernmentEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  purpose: string;
  requiredAuth: ('government-key' | 'oauth2')[];
  sampleRequest?: any;
  sampleResponse?: any;
  credentialType: string;
}

/**
 * 🌍 ESSENTIAL API MARKETPLACE SERVICE
 * Only contains critical APIs for professional identity verification
 */
export class RealWorldAPIService {
  private healthcareAPIs: HealthcareAPI[] = [];
  private financialAPIs: FinancialAPI[] = [];
  private governmentAPIs: GovernmentAPI[] = [];

  constructor() {
    this.initializeEssentialAPIs();
  }

  /**
   * 🚀 Initialize only essential APIs
   */
  private initializeEssentialAPIs(): void {
    this.initializeHealthcareAPIs();
    this.initializeFinancialAPIs(); 
    this.initializeGovernmentAPIs();
    console.log('🌍 Initialized essential real-world APIs');
  }

  /**
   * 🏥 Healthcare APIs - Only essential insurance verification
   */
  private initializeHealthcareAPIs(): void {
    this.healthcareAPIs = [
      {
        id: 'pverify-eligibility',
        name: 'pVerify Insurance Eligibility',
        provider: 'pVerify',
        category: 'eligibility',
        description: 'Real-time health insurance eligibility verification for healthcare providers.',
        baseUrl: 'https://api.pverify.io',
        compliance: ['HIPAA', 'HITECH', 'SOC2'],
        endpoints: [
          {
            path: '/eligibility/check',
            method: 'POST',
            purpose: 'Real-time insurance eligibility verification',
            requiredAuth: ['api-key'],
            credentialType: 'HealthInsuranceCredential'
          }
        ],
        pricing: {
          model: 'per-request',
          freeQuota: 100,
          paidRate: '$0.25 per verification'
        },
        documentation: 'https://api.pverify.io/docs',
        testMode: true
      }
    ];
  }

  /**
   * 💰 Financial APIs - Only essential Plaid integration
   */
  private initializeFinancialAPIs(): void {
    this.financialAPIs = [
      {
        id: 'plaid-enhanced',
        name: 'Plaid Financial Verification',
        provider: 'Plaid',
        category: 'account-verification',
        description: 'Connect with 12,000+ financial institutions for account and income verification.',
        baseUrl: 'https://production.plaid.com',
        compliance: ['PCI-DSS', 'SOC2', 'GDPR'],
        regions: ['United States', 'Canada', 'United Kingdom'],
        endpoints: [
          {
            path: '/accounts/get',
            method: 'POST',
            purpose: 'Retrieve verified account information and balances',
            requiredAuth: ['api-key'],
            credentialType: 'BankAccountCredential'
          },
          {
            path: '/income/verification/get',
            method: 'POST',
            purpose: 'Verify employment and income information',
            requiredAuth: ['api-key'],
            credentialType: 'IncomeVerificationCredential'
          }
        ],
        pricing: {
          model: 'per-account',
          freeQuota: 100,
          paidRate: '$0.60 per account linked'
        },
        documentation: 'https://plaid.com/docs/',
        testMode: true
      }
    ];
  }

  /**
   * 🏛️ Government APIs - Only essential ID.me identity verification
   */
  private initializeGovernmentAPIs(): void {
    this.governmentAPIs = [
      {
        id: 'id-me-identity',
        name: 'ID.me Government Identity',
        provider: 'ID.me',
        category: 'identity',
        description: 'Government-grade identity verification trusted by 27+ states and federal agencies.',
        baseUrl: 'https://api.id.me/api/public/v3',
        compliance: ['FedRAMP', 'SOC2', 'NIST'],
        jurisdiction: ['United States'],
        endpoints: [
          {
            path: '/identity/verify',
            method: 'POST',
            purpose: 'Government-grade identity verification with biometrics',
            requiredAuth: ['oauth2'],
            credentialType: 'GovernmentIdentityCredential'
          }
        ],
        pricing: {
          model: 'government-contract',
          freeQuota: 100,
          paidRate: 'Government contract pricing'
        },
        documentation: 'https://developers.id.me/',
        testMode: true
      }
    ];
  }

  /**
   * 🔍 Search Essential APIs
   */
  async searchRealWorldAPIs(
    query: string,
    filters?: {
      category?: 'healthcare' | 'government' | 'financial' | 'all';
      compliance?: string[];
      region?: string[];
      pricing?: 'free' | 'paid' | 'enterprise';
    }
  ): Promise<(HealthcareAPI | GovernmentAPI | FinancialAPI)[]> {
    try {
      let allAPIs: (HealthcareAPI | GovernmentAPI | FinancialAPI)[] = [];

      // Collect APIs based on category filter
      if (!filters?.category || filters.category === 'all') {
        allAPIs = [...this.healthcareAPIs, ...this.governmentAPIs, ...this.financialAPIs];
      } else {
        switch (filters.category) {
          case 'healthcare':
            allAPIs = this.healthcareAPIs;
            break;
          case 'government':
            allAPIs = this.governmentAPIs;
            break;
          case 'financial':
            allAPIs = this.financialAPIs;
            break;
        }
      }

      // Filter by search query
      const searchResults = allAPIs.filter(api => 
        api.name.toLowerCase().includes(query.toLowerCase()) ||
        api.description.toLowerCase().includes(query.toLowerCase()) ||
        api.provider.toLowerCase().includes(query.toLowerCase())
      );

      // Apply compliance filter
      if (filters?.compliance && filters.compliance.length > 0) {
        return searchResults.filter(api => 
          filters.compliance!.some(comp => api.compliance.includes(comp as any))
        );
      }

      console.log(`🔍 Found ${searchResults.length} essential APIs for query: "${query}"`);
      return searchResults;

    } catch (error) {
      console.error('❌ Real-world API search failed:', error);
      return [];
    }
  }

  // 🔍 PUBLIC GETTER METHODS

  /**
   * 🏥 Get healthcare APIs
   */
  getHealthcareAPIs(): HealthcareAPI[] {
    return this.healthcareAPIs;
  }

  /**
   * 🏛️ Get government APIs  
   */
  getGovernmentAPIs(): GovernmentAPI[] {
    return this.governmentAPIs;
  }

  /**
   * 💰 Get financial APIs
   */
  getFinancialAPIs(): FinancialAPI[] {
    return this.financialAPIs;
  }

  /**
   * 📊 Get all API statistics
   */
  getAPIStatistics(): {
    totalAPIs: number;
    healthcareAPIs: number;
    governmentAPIs: number;
    financialAPIs: number;
    complianceStandards: string[];
  } {
    const allCompliance = new Set<string>();
    
    this.healthcareAPIs.forEach(api => api.compliance.forEach(c => allCompliance.add(c)));
    this.governmentAPIs.forEach(api => api.compliance.forEach(c => allCompliance.add(c)));
    this.financialAPIs.forEach(api => api.compliance.forEach(c => allCompliance.add(c)));

    return {
      totalAPIs: this.healthcareAPIs.length + this.governmentAPIs.length + this.financialAPIs.length,
      healthcareAPIs: this.healthcareAPIs.length,
      governmentAPIs: this.governmentAPIs.length,
      financialAPIs: this.financialAPIs.length,
      complianceStandards: Array.from(allCompliance)
    };
  }
}

// 🏭 Export singleton instance
export const realWorldAPIService = new RealWorldAPIService();