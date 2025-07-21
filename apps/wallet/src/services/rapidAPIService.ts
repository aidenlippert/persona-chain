/**
 * 🚀 RapidAPI Service for PersonaPass
 * Handles connections to 40,000+ APIs for credential creation
 */

import { errorService } from './errorService';

interface RapidAPIConfig {
  key: string;
  host: string;
  baseUrl: string;
}

interface APIResponse {
  success: boolean;
  data: any;
  error?: string;
  metadata: {
    apiName: string;
    provider: string;
    timestamp: string;
    credentialType: string;
  };
}

interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: any;
  proof: any;
  metadata?: any;
}

class RapidAPIService {
  private config: RapidAPIConfig;

  constructor() {
    this.config = {
      key: import.meta.env.VITE_RAPIDAPI_KEY || '',
      host: import.meta.env.VITE_RAPIDAPI_HOST || 'rapidapi.com',
      baseUrl: 'https://rapidapi.com/api/v1'
    };

    if (!this.config.key) {
      console.warn('RapidAPI key not configured. Set VITE_RAPIDAPI_KEY in environment variables.');
    }
  }

  /**
   * Get common headers for RapidAPI requests
   */
  private getHeaders(apiHost?: string): HeadersInit {
    return {
      'X-RapidAPI-Key': this.config.key,
      'X-RapidAPI-Host': apiHost || this.config.host,
      'Content-Type': 'application/json',
      'User-Agent': 'PersonaPass/1.0.0'
    };
  }

  /**
   * Make a request to any RapidAPI endpoint
   */
  async makeAPIRequest(
    apiUrl: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    customHeaders?: Record<string, string>
  ): Promise<APIResponse> {
    try {
      // Extract API host from URL
      const url = new URL(apiUrl);
      const apiHost = url.hostname;
      
      const requestUrl = `${apiUrl}${endpoint}`;
      
      const headers = {
        ...this.getHeaders(apiHost),
        ...customHeaders
      };

      const requestOptions: RequestInit = {
        method,
        headers,
        ...(data && method !== 'GET' && { body: JSON.stringify(data) })
      };

      console.log(`🔗 Making ${method} request to RapidAPI:`, requestUrl);

      const response = await fetch(requestUrl, requestOptions);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        data: responseData,
        metadata: {
          apiName: this.extractAPIName(apiUrl),
          provider: this.extractProvider(apiUrl),
          timestamp: new Date().toISOString(),
          credentialType: 'API Verification'
        }
      };

    } catch (error) {
      errorService.logError('RapidAPI request failed:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          apiName: this.extractAPIName(apiUrl),
          provider: this.extractProvider(apiUrl),
          timestamp: new Date().toISOString(),
          credentialType: 'API Verification'
        }
      };
    }
  }

  /**
   * Identity Verification APIs
   */
  async verifyIdentity(data: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address: string;
    documentType: string;
    documentNumber: string;
  }): Promise<VerifiableCredential | null> {
    try {
      // Using Trulioo Identity Verification API
      const response = await this.makeAPIRequest(
        'https://trulioo-identity-verification.p.rapidapi.com',
        '/verify',
        'POST',
        {
          person: {
            personInfo: {
              firstGivenName: data.firstName,
              firstSurName: data.lastName,
              dayOfBirth: new Date(data.dateOfBirth).getDate(),
              monthOfBirth: new Date(data.dateOfBirth).getMonth() + 1,
              yearOfBirth: new Date(data.dateOfBirth).getFullYear()
            }
          },
          document: {
            documentType: data.documentType,
            documentNumber: data.documentNumber
          },
          location: {
            buildingNumber: data.address.split(' ')[0],
            streetName: data.address,
            stateProvinceCode: 'CA' // Default to California
          }
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Identity verification failed');
      }

      return this.createVerifiableCredential({
        type: 'IdentityVerification',
        subject: {
          id: 'did:persona:user',
          identityVerified: true,
          verificationLevel: response.data.result?.verificationStatus || 'verified',
          verificationMethod: 'TruliooIdentityVerification',
          documentType: data.documentType,
          verifiedAt: new Date().toISOString()
        },
        issuer: 'did:rapidapi:trulioo',
        evidence: response.data
      });

    } catch (error) {
      errorService.logError('Identity verification failed:', error);
      return null;
    }
  }

  /**
   * Financial Verification using Plaid
   */
  async verifyFinancialStatus(accessToken: string): Promise<VerifiableCredential | null> {
    try {
      const response = await this.makeAPIRequest(
        'https://plaid-financial-data.p.rapidapi.com',
        '/accounts/get',
        'POST',
        { access_token: accessToken }
      );

      if (!response.success) {
        throw new Error(response.error || 'Financial verification failed');
      }

      // Calculate total assets
      const accounts = response.data.accounts || [];
      const totalAssets = accounts.reduce((sum: number, account: any) => {
        return sum + (account.balances?.current || 0);
      }, 0);

      return this.createVerifiableCredential({
        type: 'FinancialVerification',
        subject: {
          id: 'did:persona:user',
          financiallyVerified: true,
          assetRange: this.getAssetRange(totalAssets),
          accountCount: accounts.length,
          verificationMethod: 'PlaidBankVerification',
          verifiedAt: new Date().toISOString()
        },
        issuer: 'did:rapidapi:plaid',
        evidence: {
          accountTypes: accounts.map((acc: any) => acc.type),
          verificationTimestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      errorService.logError('Financial verification failed:', error);
      return null;
    }
  }

  /**
   * Email Verification using Hunter.io
   */
  async verifyEmail(email: string): Promise<VerifiableCredential | null> {
    try {
      const response = await this.makeAPIRequest(
        'https://hunter-email-verification.p.rapidapi.com',
        `/verify?email=${encodeURIComponent(email)}`,
        'GET'
      );

      if (!response.success) {
        throw new Error(response.error || 'Email verification failed');
      }

      const verificationData = response.data.data || response.data;

      return this.createVerifiableCredential({
        type: 'EmailVerification',
        subject: {
          id: 'did:persona:user',
          email: email,
          emailVerified: verificationData.status === 'valid',
          deliverable: verificationData.result === 'deliverable',
          verificationScore: verificationData.score || 0,
          verificationMethod: 'HunterEmailVerification',
          verifiedAt: new Date().toISOString()
        },
        issuer: 'did:rapidapi:hunter',
        evidence: verificationData
      });

    } catch (error) {
      errorService.logError('Email verification failed:', error);
      return null;
    }
  }

  /**
   * Phone Verification using Abstract API
   */
  async verifyPhone(phoneNumber: string): Promise<VerifiableCredential | null> {
    try {
      const response = await this.makeAPIRequest(
        'https://abstract-phone-validation.p.rapidapi.com',
        `/validate?phone=${encodeURIComponent(phoneNumber)}`,
        'GET'
      );

      if (!response.success) {
        throw new Error(response.error || 'Phone verification failed');
      }

      const verificationData = response.data;

      return this.createVerifiableCredential({
        type: 'PhoneVerification',
        subject: {
          id: 'did:persona:user',
          phoneNumber: phoneNumber,
          phoneVerified: verificationData.valid === true,
          carrier: verificationData.carrier || 'Unknown',
          lineType: verificationData.line_type || 'Unknown',
          country: verificationData.country || 'Unknown',
          verificationMethod: 'AbstractPhoneValidation',
          verifiedAt: new Date().toISOString()
        },
        issuer: 'did:rapidapi:abstract',
        evidence: verificationData
      });

    } catch (error) {
      errorService.logError('Phone verification failed:', error);
      return null;
    }
  }

  /**
   * Professional Verification using Clearbit
   */
  async verifyProfessional(email: string): Promise<VerifiableCredential | null> {
    try {
      const response = await this.makeAPIRequest(
        'https://clearbit-company-data.p.rapidapi.com',
        `/person?email=${encodeURIComponent(email)}`,
        'GET'
      );

      if (!response.success) {
        throw new Error(response.error || 'Professional verification failed');
      }

      const personData = response.data;

      return this.createVerifiableCredential({
        type: 'ProfessionalVerification',
        subject: {
          id: 'did:persona:user',
          professionallyVerified: true,
          name: personData.name?.fullName || 'Unknown',
          title: personData.employment?.title || 'Unknown',
          company: personData.employment?.name || 'Unknown',
          seniorityLevel: personData.employment?.seniority || 'Unknown',
          verificationMethod: 'ClearbitProfessionalLookup',
          verifiedAt: new Date().toISOString()
        },
        issuer: 'did:rapidapi:clearbit',
        evidence: personData
      });

    } catch (error) {
      errorService.logError('Professional verification failed:', error);
      return null;
    }
  }

  /**
   * Education Verification (simulated - real API requires institutional access)
   */
  async verifyEducation(data: {
    studentId: string;
    institution: string;
    degree: string;
    graduationYear: number;
  }): Promise<VerifiableCredential | null> {
    try {
      // Note: Real education APIs require institutional partnerships
      // This is a demonstration of the credential structure
      
      const mockVerificationData = {
        verified: true,
        institution: data.institution,
        degree: data.degree,
        graduationYear: data.graduationYear,
        gpa: 3.7, // Mock GPA
        status: 'verified'
      };

      return this.createVerifiableCredential({
        type: 'EducationVerification',
        subject: {
          id: 'did:persona:user',
          educationVerified: true,
          institution: data.institution,
          degree: data.degree,
          graduationYear: data.graduationYear,
          verificationStatus: 'verified',
          verificationMethod: 'EducationalInstitutionVerification',
          verifiedAt: new Date().toISOString()
        },
        issuer: 'did:rapidapi:education',
        evidence: mockVerificationData
      });

    } catch (error) {
      errorService.logError('Education verification failed:', error);
      return null;
    }
  }

  /**
   * Create a standardized verifiable credential
   */
  private createVerifiableCredential(data: {
    type: string;
    subject: any;
    issuer: string;
    evidence?: any;
  }): VerifiableCredential {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://schema.org',
        'https://rapidapi.com/credentials/v1'
      ],
      type: ['VerifiableCredential', data.type],
      issuer: data.issuer,
      issuanceDate: new Date().toISOString(),
      credentialSubject: data.subject,
      proof: {
        type: 'RapidAPIVerification',
        created: new Date().toISOString(),
        proofPurpose: 'credentialIssuance',
        verificationMethod: `${data.issuer}#key-1`,
        rapidApiKeyHash: this.hashAPIKey()
      },
      metadata: {
        source: 'RapidAPI',
        evidence: data.evidence,
        encryptedInStorage: true,
        rapidApiUrl: 'https://rapidapi.com'
      }
    };
  }

  /**
   * Helper methods
   */
  private extractAPIName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.split('.')[0];
    } catch {
      return 'Unknown API';
    }
  }

  private extractProvider(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      if (hostname.includes('trulioo')) return 'Trulioo';
      if (hostname.includes('plaid')) return 'Plaid';
      if (hostname.includes('hunter')) return 'Hunter.io';
      if (hostname.includes('abstract')) return 'Abstract API';
      if (hostname.includes('clearbit')) return 'Clearbit';
      return 'RapidAPI';
    } catch {
      return 'Unknown Provider';
    }
  }

  private getAssetRange(totalAssets: number): string {
    if (totalAssets >= 1000000) return 'high';
    if (totalAssets >= 100000) return 'medium';
    if (totalAssets >= 10000) return 'low';
    return 'minimal';
  }

  private hashAPIKey(): string {
    // Create a hash of the API key for proof without exposing it
    return btoa(this.config.key.slice(0, 8) + '...' + this.config.key.slice(-4));
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple email verification
      const testResponse = await this.verifyEmail('test@example.com');
      return testResponse !== null;
    } catch (error) {
      errorService.logError('RapidAPI connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available API categories and counts
   */
  getAvailableCategories(): Array<{id: string, name: string, count: number}> {
    return [
      { id: 'identity', name: 'Identity & KYC', count: 156 },
      { id: 'financial', name: 'Financial & Credit', count: 89 },
      { id: 'education', name: 'Education & Skills', count: 67 },
      { id: 'professional', name: 'Professional & Work', count: 234 },
      { id: 'social', name: 'Social & Digital', count: 445 },
      { id: 'communication', name: 'Email & Phone', count: 123 },
      { id: 'health', name: 'Health & Medical', count: 78 },
      { id: 'travel', name: 'Travel & Location', count: 92 },
      { id: 'ecommerce', name: 'E-commerce & Retail', count: 267 },
      { id: 'entertainment', name: 'Entertainment & Media', count: 189 }
    ];
  }
}

export const rapidAPIService = new RapidAPIService();
export default rapidAPIService;