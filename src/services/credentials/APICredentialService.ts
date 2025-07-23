/**
 * API-to-Credential Service
 * Handles fetching data from APIs and converting to Verifiable Credentials
 */

import { RapidAPIMetadata } from '../automation/RapidAPIConnector';
import { VerifiableCredential, CredentialSubject } from '../../types/credentials';
import { didService } from '../didService';
import { vcManagerService } from '../vcManagerService';
import { errorService } from "@/services/errorService";

interface APICredentialRequest {
  api: RapidAPIMetadata;
  userInputs: Record<string, any>;
  credentialType: string;
  userDID: string;
}

interface APIResponse {
  success: boolean;
  data: any;
  metadata: {
    timestamp: string;
    apiId: string;
    responseTime: number;
    verification_level: 'basic' | 'enhanced' | 'premium';
  };
  error?: string;
}

export class APICredentialService {
  private static instance: APICredentialService;

  private constructor() {}

  static getInstance(): APICredentialService {
    if (!APICredentialService.instance) {
      APICredentialService.instance = new APICredentialService();
    }
    return APICredentialService.instance;
  }

  /**
   * Create VC from API data
   */
  async createCredentialFromAPI(request: APICredentialRequest): Promise<VerifiableCredential> {
    console.log(`🔗 Creating credential from ${request.api.name} API...`);

    try {
      // Step 1: Fetch data from API
      const apiResponse = await this.fetchAPIData(request.api, request.userInputs);
      
      if (!apiResponse.success) {
        throw new Error(`API call failed: ${apiResponse.error}`);
      }

      // Step 2: Transform API data to credential subject
      const credentialSubject = await this.transformAPIDataToCredential(
        apiResponse.data,
        request.api,
        request.userDID
      );

      // Step 3: Create verifiable credential
      const vc = await this.createVerifiableCredential(
        credentialSubject,
        request.api,
        apiResponse.metadata,
        request.userDID
      );

      // Step 4: Store credential
      await vcManagerService.storeCredential(vc);

      console.log(`✅ Credential created successfully from ${request.api.name}`);
      return vc;

    } catch (error) {
      errorService.logError(`❌ Failed to create credential from ${request.api.name}:`, error);
      throw error;
    }
  }

  /**
   * Fetch data from API with proper authentication
   */
  private async fetchAPIData(api: RapidAPIMetadata, userInputs: Record<string, any>): Promise<APIResponse> {
    const startTime = Date.now();

    try {
      // Check if API mocking is enabled for development
      const enableMocking = import.meta?.env?.VITE_ENABLE_API_MOCKING === 'true';
      if (enableMocking) {
        console.log(`🧪 [MOCK] Simulating API call to ${api.name}`);
        return this.generateMockResponse(api, startTime);
      }

      // Validate required environment variables
      const missingEnvVars = this.validateEnvironmentVariables(api);
      if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
      }

      // Build headers with proper authentication
      const headers = this.buildAuthHeaders(api);
      
      // Build request based on API type
      const response = await this.makeAPICall(api, userInputs, headers);
      const responseTime = Date.now() - startTime;

      // Handle response
      if (!response.ok) {
        throw new Error(`API call failed: HTTP ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        data: responseData,
        metadata: {
          timestamp: new Date().toISOString(),
          apiId: api.id,
          responseTime,
          verification_level: this.determineVerificationLevel(api, responseTime)
        }
      };

    } catch (error) {
      errorService.logError(`❌ API call failed for ${api.name}:`, error);
      
      return {
        success: false,
        data: null,
        metadata: {
          timestamp: new Date().toISOString(),
          apiId: api.id,
          responseTime: Date.now() - startTime,
          verification_level: 'basic'
        },
        error: (error as Error).message
      };
    }
  }

  /**
   * Make API call based on API specifications
   */
  private async makeAPICall(
    api: RapidAPIMetadata, 
    userInputs: Record<string, any>, 
    headers: Record<string, string>
  ): Promise<Response> {
    
    // Handle different API types
    switch (api.id) {
      case 'plaid_financial':
        return this.callPlaidAPI(userInputs, headers);
      case 'experian_credit':
        return this.callExperianAPI(userInputs, headers);
      case 'linkedin_advanced':
        return this.callLinkedInAPI(userInputs, headers);
      case 'github_advanced':
        return this.callGitHubAPI(userInputs, headers);
      case 'twilio_verify':
        return this.callTwilioAPI(userInputs, headers);
      case 'trulioo_global':
        return this.callTruliooAPI(userInputs, headers);
      case 'onfido_verify':
        return this.callOnfidoAPI(userInputs, headers);
      default:
        return this.callGenericRapidAPI(api, userInputs, headers);
    }
  }

  /**
   * API-specific implementations
   */
  private async callPlaidAPI(inputs: Record<string, any>, headers: Record<string, string>): Promise<Response> {
    return fetch('https://production.plaid.com/accounts/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        client_id: process.env.VITE_PLAID_CLIENT_ID,
        secret: process.env.VITE_PLAID_SECRET,
        access_token: inputs.access_token
      })
    });
  }

  private async callExperianAPI(inputs: Record<string, any>, headers: Record<string, string>): Promise<Response> {
    return fetch(`${process.env.VITE_EXPERIAN_BASE_URL}/credit-profile/v2/credit-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_EXPERIAN_ACCESS_TOKEN}`,
        ...headers
      },
      body: JSON.stringify({
        consumerPii: inputs.consumerInfo
      })
    });
  }

  private async callLinkedInAPI(inputs: Record<string, any>, headers: Record<string, string>): Promise<Response> {
    return fetch('https://api.linkedin.com/v2/people/~', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${inputs.access_token}`,
        ...headers
      }
    });
  }

  private async callGitHubAPI(inputs: Record<string, any>, headers: Record<string, string>): Promise<Response> {
    return fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': `token ${inputs.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...headers
      }
    });
  }

  private async callTwilioAPI(inputs: Record<string, any>, headers: Record<string, string>): Promise<Response> {
    const accountSid = process.env.VITE_TWILIO_ACCOUNT_SID;
    const serviceSid = process.env.VITE_TWILIO_SERVICE_SID;
    
    return fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${accountSid}:${process.env.VITE_TWILIO_AUTH_TOKEN}`)}`,
        ...headers
      },
      body: new URLSearchParams({
        To: inputs.phoneNumber,
        Channel: inputs.channel || 'sms'
      })
    });
  }

  private async callTruliooAPI(inputs: Record<string, any>, headers: Record<string, string>): Promise<Response> {
    return fetch('https://api.globaldatacompany.com/v1/verifications/v1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        AcceptTruliooTermsAndConditions: true,
        CountryCode: inputs.countryCode,
        PersonInfo: inputs.personInfo,
        Document: inputs.document
      })
    });
  }

  private async callOnfidoAPI(inputs: Record<string, any>, headers: Record<string, string>): Promise<Response> {
    return fetch('https://api.onfido.com/v3/applicants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        first_name: inputs.firstName,
        last_name: inputs.lastName,
        email: inputs.email
      })
    });
  }

  private async callGenericRapidAPI(
    api: RapidAPIMetadata, 
    inputs: Record<string, any>, 
    headers: Record<string, string>
  ): Promise<Response> {
    const endpoint = api.endpoints[0];
    const url = `${api.baseUrl}${endpoint.path}`;
    
    return fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: endpoint.method !== 'GET' ? JSON.stringify(inputs) : undefined
    });
  }

  /**
   * Transform API response data into credential subject
   */
  private async transformAPIDataToCredential(
    apiData: any, 
    api: RapidAPIMetadata, 
    userDID: string
  ): Promise<CredentialSubject> {
    const baseSubject: CredentialSubject = {
      id: userDID,
      verification_source: api.name,
      verification_provider: api.provider,
      verification_date: new Date().toISOString(),
      verification_method: api.category
    };

    // Transform based on API type
    switch (api.category) {
      case 'identity_verification':
      case 'biometric_verification':
        return {
          ...baseSubject,
          identity_verified: true,
          verification_level: 'enhanced',
          document_verified: apiData.Record?.RecordStatus === 'match',
          identity_score: apiData.Record?.DatasourceResults?.[0]?.DatasourceResult || 'verified',
          verified_fields: this.extractVerifiedFields(apiData)
        };

      case 'financial_data':
      case 'credit_verification':
        return {
          ...baseSubject,
          financial_verified: true,
          credit_score: apiData.creditScore || apiData.scores?.[0]?.scoreValue,
          account_verified: apiData.accounts?.length > 0,
          income_verified: !!apiData.income,
          financial_risk_level: this.calculateFinancialRisk(apiData)
        };

      case 'professional_verification':
      case 'developer_verification':
        return {
          ...baseSubject,
          professional_verified: true,
          profile_verified: true,
          employment_verified: !!apiData.positions || !!apiData.company,
          skills_verified: apiData.skills?.length > 0 || apiData.languages?.length > 0,
          experience_level: this.calculateExperienceLevel(apiData)
        };

      case 'communication':
        return {
          ...baseSubject,
          phone_verified: apiData.status === 'approved' || apiData.valid === true,
          verification_method: 'sms_voice',
          phone_number: apiData.to || apiData.phone_number,
          verification_status: apiData.status
        };

      default:
        return {
          ...baseSubject,
          data_verified: true,
          verification_data: apiData
        };
    }
  }

  /**
   * Create the final verifiable credential
   */
  private async createVerifiableCredential(
    credentialSubject: CredentialSubject,
    api: RapidAPIMetadata,
    metadata: APIResponse['metadata'],
    userDID: string
  ): Promise<VerifiableCredential> {
    const issuerDID = await didService.getDID();
    
    const vc: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://personapass.xyz/contexts/api-verification/v1'
      ],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ['VerifiableCredential', `${api.category.replace(/_/g, '')}Credential`],
      issuer: {
        id: issuerDID,
        name: 'PersonaPass Identity Wallet',
        description: `Credential generated from ${api.name} API verification`
      },
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // 1 year
      credentialSubject,
      evidence: [{
        type: 'APIVerification',
        api_provider: api.provider,
        api_name: api.name,
        api_category: api.category,
        verification_timestamp: metadata.timestamp,
        response_time_ms: metadata.responseTime,
        verification_level: metadata.verification_level,
        api_url: api.rapidApiUrl
      }],
      credentialStatus: {
        id: `https://personapass.xyz/status/${crypto.randomUUID()}`,
        type: 'RevocationList2020Status'
      }
    };

    // Add proof
    const proof = await this.generateProof(vc, issuerDID);
    vc.proof = proof;

    return vc;
  }

  /**
   * Helper methods
   */
  private determineVerificationLevel(api: RapidAPIMetadata, responseTime: number): 'basic' | 'enhanced' | 'premium' {
    if (api.reliability.uptime > 99.8 && responseTime < 500) return 'premium';
    if (api.reliability.uptime > 99.5 && responseTime < 1000) return 'enhanced';
    return 'basic';
  }

  private extractVerifiedFields(data: any): string[] {
    const fields: string[] = [];
    if (data.PersonInfo?.FirstGivenName) fields.push('first_name');
    if (data.PersonInfo?.FirstSurName) fields.push('last_name');
    if (data.PersonInfo?.DayOfBirth) fields.push('date_of_birth');
    if (data.Location?.BuildingNumber) fields.push('address');
    return fields;
  }

  private calculateFinancialRisk(data: any): 'low' | 'medium' | 'high' {
    const score = data.creditScore || data.scores?.[0]?.scoreValue || 0;
    if (score >= 750) return 'low';
    if (score >= 650) return 'medium';
    return 'high';
  }

  private calculateExperienceLevel(data: any): 'junior' | 'mid' | 'senior' {
    const repoCount = data.public_repos || 0;
    const followerCount = data.followers || 0;
    const years = data.positions?.length || 0;
    
    const score = (repoCount * 0.3) + (followerCount * 0.2) + (years * 2);
    
    if (score >= 10) return 'senior';
    if (score >= 5) return 'mid';
    return 'junior';
  }

  private async generateProof(vc: VerifiableCredential, issuerDID: string): Promise<any> {
    // Simplified proof generation - in production use proper cryptographic signatures
    return {
      type: 'Ed25519Signature2018',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${issuerDID}#keys-1`,
      jws: 'mock_signature_' + btoa(JSON.stringify(vc)).substring(0, 32)
    };
  }

  /**
   * Batch credential creation from multiple APIs
   */
  async createCredentialsFromMultipleAPIs(requests: APICredentialRequest[]): Promise<{
    successful: VerifiableCredential[];
    failed: { api: string; error: string }[];
  }> {
    const results = {
      successful: [] as VerifiableCredential[],
      failed: [] as { api: string; error: string }[]
    };

    for (const request of requests) {
      try {
        const vc = await this.createCredentialFromAPI(request);
        results.successful.push(vc);
      } catch (error) {
        results.failed.push({
          api: request.api.name,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Get supported credential types for an API
   */
  getSupportedCredentialTypes(api: RapidAPIMetadata): string[] {
    switch (api.category) {
      case 'identity_verification':
        return ['IdentityVerificationCredential', 'KYCCredential', 'DocumentVerificationCredential'];
      case 'financial_data':
        return ['FinancialVerificationCredential', 'BankAccountCredential', 'IncomeVerificationCredential'];
      case 'credit_verification':
        return ['CreditScoreCredential', 'CreditReportCredential', 'FinancialRiskCredential'];
      case 'professional_verification':
        return ['ProfessionalProfileCredential', 'EmploymentCredential', 'SkillsCredential'];
      case 'developer_verification':
        return ['DeveloperProfileCredential', 'CodeContributionCredential', 'TechnicalSkillsCredential'];
      case 'communication':
        return ['PhoneVerificationCredential', 'ContactVerificationCredential'];
      default:
        return ['DataVerificationCredential'];
    }
  }

  /**
   * Validate required environment variables for API
   */
  private validateEnvironmentVariables(api: RapidAPIMetadata): string[] {
    const missing: string[] = [];
    const env = import.meta?.env || {};

    // Always require RapidAPI key for marketplace APIs
    if (!env.VITE_RAPIDAPI_KEY) {
      missing.push('VITE_RAPIDAPI_KEY');
    }

    // API-specific environment variables
    switch (api.id) {
      case 'rapidapi_trulioo_global':
        if (!env.VITE_TRULIOO_API_KEY) missing.push('VITE_TRULIOO_API_KEY');
        break;
      case 'rapidapi_jumio_netverify':
        if (!env.VITE_JUMIO_API_TOKEN) missing.push('VITE_JUMIO_API_TOKEN');
        break;
      case 'rapidapi_onfido':
        if (!env.VITE_ONFIDO_API_TOKEN) missing.push('VITE_ONFIDO_API_TOKEN');
        break;
      case 'rapidapi_yodlee_fastlink':
        if (!env.VITE_YODLEE_CLIENT_ID) missing.push('VITE_YODLEE_CLIENT_ID');
        if (!env.VITE_YODLEE_SECRET) missing.push('VITE_YODLEE_SECRET');
        break;
      case 'rapidapi_mx_platform':
        if (!env.VITE_MX_CLIENT_ID) missing.push('VITE_MX_CLIENT_ID');
        if (!env.VITE_MX_SECRET) missing.push('VITE_MX_SECRET');
        break;
      case 'rapidapi_twilio_verify':
        if (!env.VITE_TWILIO_ACCOUNT_SID) missing.push('VITE_TWILIO_ACCOUNT_SID');
        if (!env.VITE_TWILIO_AUTH_TOKEN) missing.push('VITE_TWILIO_AUTH_TOKEN');
        break;
      case 'rapidapi_telesign':
        if (!env.VITE_TELESIGN_CUSTOMER_ID) missing.push('VITE_TELESIGN_CUSTOMER_ID');
        if (!env.VITE_TELESIGN_API_KEY) missing.push('VITE_TELESIGN_API_KEY');
        break;
      case 'linkedin_advanced':
        if (!env.VITE_LINKEDIN_ACCESS_TOKEN) missing.push('VITE_LINKEDIN_ACCESS_TOKEN');
        break;
      case 'github_advanced':
        if (!env.VITE_GITHUB_ACCESS_TOKEN) missing.push('VITE_GITHUB_ACCESS_TOKEN');
        break;
    }

    return missing;
  }

  /**
   * Build authentication headers for API
   */
  private buildAuthHeaders(api: RapidAPIMetadata): Record<string, string> {
    const env = import.meta?.env || {};
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'PersonaPass/1.0'
    };

    // Add RapidAPI authentication
    if (env.VITE_RAPIDAPI_KEY) {
      headers['X-RapidAPI-Key'] = env.VITE_RAPIDAPI_KEY;
      headers['X-RapidAPI-Host'] = this.extractRapidAPIHost(api);
    }

    // Add API-specific authentication
    switch (api.id) {
      case 'rapidapi_trulioo_global':
        if (env.VITE_TRULIOO_API_KEY) {
          headers['Authorization'] = `Bearer ${env.VITE_TRULIOO_API_KEY}`;
        }
        break;
      case 'rapidapi_jumio_netverify':
        if (env.VITE_JUMIO_API_TOKEN) {
          headers['Authorization'] = `Bearer ${env.VITE_JUMIO_API_TOKEN}`;
        }
        break;
      case 'rapidapi_onfido':
        if (env.VITE_ONFIDO_API_TOKEN) {
          headers['Authorization'] = `Token token=${env.VITE_ONFIDO_API_TOKEN}`;
        }
        break;
      case 'rapidapi_yodlee_fastlink':
        if (env.VITE_YODLEE_CLIENT_ID && env.VITE_YODLEE_SECRET) {
          const credentials = btoa(`${env.VITE_YODLEE_CLIENT_ID}:${env.VITE_YODLEE_SECRET}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'rapidapi_mx_platform':
        if (env.VITE_MX_CLIENT_ID && env.VITE_MX_SECRET) {
          const credentials = btoa(`${env.VITE_MX_CLIENT_ID}:${env.VITE_MX_SECRET}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'rapidapi_twilio_verify':
        if (env.VITE_TWILIO_ACCOUNT_SID && env.VITE_TWILIO_AUTH_TOKEN) {
          const credentials = btoa(`${env.VITE_TWILIO_ACCOUNT_SID}:${env.VITE_TWILIO_AUTH_TOKEN}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'rapidapi_telesign':
        if (env.VITE_TELESIGN_CUSTOMER_ID && env.VITE_TELESIGN_API_KEY) {
          const credentials = btoa(`${env.VITE_TELESIGN_CUSTOMER_ID}:${env.VITE_TELESIGN_API_KEY}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'linkedin_advanced':
        if (env.VITE_LINKEDIN_ACCESS_TOKEN) {
          headers['Authorization'] = `Bearer ${env.VITE_LINKEDIN_ACCESS_TOKEN}`;
        }
        break;
      case 'github_advanced':
        if (env.VITE_GITHUB_ACCESS_TOKEN) {
          headers['Authorization'] = `token ${env.VITE_GITHUB_ACCESS_TOKEN}`;
          headers['Accept'] = 'application/vnd.github.v3+json';
        }
        break;
    }

    return headers;
  }

  /**
   * Generate mock response for development/testing
   */
  private generateMockResponse(api: RapidAPIMetadata, startTime: number): APIResponse {
    const responseTime = Math.floor(Math.random() * 1000) + 200; // 200-1200ms
    
    // Generate realistic mock data based on API category
    let mockData: any;
    
    switch (api.category) {
      case 'identity_verification':
      case 'biometric_verification':
        mockData = {
          Record: {
            RecordStatus: 'match',
            DatasourceResults: [{
              DatasourceResult: 'verified',
              DatasourceName: api.name,
              AppendedFields: [
                { FieldName: 'FirstGivenName', Data: 'John' },
                { FieldName: 'FirstSurName', Data: 'Doe' },
                { FieldName: 'YearOfBirth', Data: '1990' }
              ]
            }]
          },
          TransactionStatus: 'Completed',
          timestamp: new Date().toISOString()
        };
        break;

      case 'financial_data':
      case 'credit_verification':
        mockData = {
          accounts: [
            {
              account_id: 'mock_account_123',
              name: 'Checking Account',
              type: 'depository',
              subtype: 'checking',
              balances: {
                available: 1250.75,
                current: 1250.75
              }
            }
          ],
          creditScore: 750,
          scores: [{ scoreValue: 750, scoreType: 'FICO' }],
          income: {
            verified: true,
            amount: 75000,
            frequency: 'yearly'
          },
          timestamp: new Date().toISOString()
        };
        break;

      case 'communication':
        mockData = {
          status: 'approved',
          valid: true,
          to: '+1234567890',
          phone_number: '+1234567890',
          verification_check: {
            status: 'approved',
            valid: true
          },
          timestamp: new Date().toISOString()
        };
        break;

      case 'professional_verification':
        mockData = {
          id: 'mock_linkedin_123',
          firstName: { localized: { en_US: 'John' } },
          lastName: { localized: { en_US: 'Doe' } },
          positions: {
            values: [{
              title: 'Senior Developer',
              company: { name: 'Tech Corp' },
              startDate: { year: 2020, month: 1 }
            }]
          },
          skills: { values: [{ skill: { name: 'JavaScript' } }] },
          timestamp: new Date().toISOString()
        };
        break;

      case 'developer_verification':
        mockData = {
          login: 'johndoe',
          id: 12345,
          name: 'John Doe',
          company: 'Tech Corp',
          public_repos: 42,
          followers: 150,
          following: 75,
          created_at: '2018-01-01T00:00:00Z',
          languages: ['JavaScript', 'TypeScript', 'Python'],
          timestamp: new Date().toISOString()
        };
        break;

      default:
        mockData = {
          verified: true,
          status: 'success',
          data: { mock: true },
          timestamp: new Date().toISOString()
        };
    }

    return {
      success: true,
      data: mockData,
      metadata: {
        timestamp: new Date().toISOString(),
        apiId: api.id,
        responseTime,
        verification_level: 'enhanced'
      }
    };
  }

  /**
   * Extract RapidAPI host from URL
   */
  private extractRapidAPIHost(api: RapidAPIMetadata): string {
    try {
      const url = new URL(api.rapidApiUrl || api.baseUrl);
      const hostname = url.hostname;
      
      // Convert rapidapi.com URLs to p.rapidapi.com format
      if (hostname.includes('rapidapi.com')) {
        return hostname.replace('rapidapi.com', 'p.rapidapi.com');
      }
      
      return hostname;
    } catch {
      return 'api.rapidapi.com';
    }
  }
}

export const apiCredentialService = APICredentialService.getInstance();