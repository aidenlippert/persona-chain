/**
 * RapidAPI to VC Workflow Service
 * Orchestrates the complete flow from API selection to VC creation
 */

import RapidAPIConnector, { RapidAPIMetadata } from '../automation/RapidAPIConnector';
import { vcManagerService } from '../vcManagerService';
import { didService } from '../didService';
import { storageService } from '../storageService';
import { errorService, ErrorCategory, ErrorSeverity } from '../errorService';
import { errorService } from "@/services/errorService";

export interface VCCreationRequest {
  apiId: string;
  apiEndpoint: string;
  requestData: Record<string, any>;
  vcTemplate: {
    type: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
  };
  holderDID: string;
  issuerDID: string;
  privacy: 'public' | 'private' | 'selective';
}

export interface VCCreationResult {
  success: boolean;
  vcId?: string;
  credential?: any;
  apiResponse?: any;
  error?: string;
  verificationScore?: number;
}

export interface DataMappingRule {
  apiField: string;
  vcField: string;
  transform?: (value: any) => any;
  required: boolean;
}

export interface APIToVCMapping {
  apiId: string;
  vcType: string;
  mappingRules: DataMappingRule[];
  scoreCalculation: {
    baseScore: number;
    qualityFactors: Array<{
      field: string;
      weight: number;
      validator: (value: any) => number; // Returns 0-1
    }>;
  };
}

// Pre-configured mappings for common APIs
const API_VC_MAPPINGS: APIToVCMapping[] = [
  {
    apiId: 'rapidapi_trulioo_global',
    vcType: 'IdentityVerificationCredential',
    mappingRules: [
      { apiField: 'PersonInfo.FirstName', vcField: 'firstName', required: true },
      { apiField: 'PersonInfo.LastName', vcField: 'lastName', required: true },
      { apiField: 'PersonInfo.DateOfBirth', vcField: 'dateOfBirth', required: true },
      { apiField: 'PersonInfo.Country', vcField: 'nationality', required: true },
      { apiField: 'Record.RecordStatus', vcField: 'verificationStatus', required: true },
      { 
        apiField: 'Record.DatasourceResults', 
        vcField: 'verificationScore', 
        transform: (results: any[]) => {
          const verified = results.filter(r => r.Result === 'match').length;
          return Math.round((verified / results.length) * 100);
        },
        required: true 
      }
    ],
    scoreCalculation: {
      baseScore: 85,
      qualityFactors: [
        {
          field: 'verificationScore',
          weight: 0.4,
          validator: (score: number) => Math.min(score / 100, 1)
        },
        {
          field: 'verificationStatus',
          weight: 0.3,
          validator: (status: string) => status === 'match' ? 1 : 0.5
        },
        {
          field: 'datasourceCount',
          weight: 0.3,
          validator: (count: number) => Math.min(count / 10, 1)
        }
      ]
    }
  },
  {
    apiId: 'rapidapi_yodlee_fastlink',
    vcType: 'FinancialAccountCredential',
    mappingRules: [
      { apiField: 'account.accountName', vcField: 'accountName', required: true },
      { apiField: 'account.accountType', vcField: 'accountType', required: true },
      { apiField: 'account.balance.amount', vcField: 'balance', required: true },
      { apiField: 'account.balance.currency', vcField: 'currency', required: true },
      { apiField: 'account.providerName', vcField: 'institution', required: true },
      { 
        apiField: 'account.lastUpdated', 
        vcField: 'lastVerified', 
        transform: (date: string) => new Date(date).toISOString(),
        required: true 
      }
    ],
    scoreCalculation: {
      baseScore: 90,
      qualityFactors: [
        {
          field: 'balance',
          weight: 0.4,
          validator: (balance: number) => balance > 0 ? 1 : 0.3
        },
        {
          field: 'accountType',
          weight: 0.3,
          validator: (type: string) => ['checking', 'savings', 'investment'].includes(type) ? 1 : 0.7
        },
        {
          field: 'lastVerified',
          weight: 0.3,
          validator: (date: string) => {
            const daysDiff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
            return Math.max(0, 1 - (daysDiff / 30)); // Decay over 30 days
          }
        }
      ]
    }
  },
  {
    apiId: 'rapidapi_twilio_verify',
    vcType: 'PhoneVerificationCredential',
    mappingRules: [
      { apiField: 'to', vcField: 'phoneNumber', required: true },
      { apiField: 'status', vcField: 'verificationStatus', required: true },
      { apiField: 'channel', vcField: 'verificationMethod', required: true },
      { apiField: 'date_created', vcField: 'verificationDate', required: true },
      { 
        apiField: 'lookup.country_code', 
        vcField: 'country', 
        transform: (code: string) => code?.toUpperCase(),
        required: false 
      }
    ],
    scoreCalculation: {
      baseScore: 80,
      qualityFactors: [
        {
          field: 'verificationStatus',
          weight: 0.6,
          validator: (status: string) => status === 'approved' ? 1 : 0
        },
        {
          field: 'verificationMethod',
          weight: 0.2,
          validator: (method: string) => method === 'sms' ? 1 : 0.8
        },
        {
          field: 'verificationDate',
          weight: 0.2,
          validator: (date: string) => {
            const daysDiff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
            return Math.max(0, 1 - (daysDiff / 90)); // Decay over 90 days
          }
        }
      ]
    }
  }
];

export class RapidAPIVCWorkflow {
  private static instance: RapidAPIVCWorkflow;
  private rapidApiConnector: RapidAPIConnector;

  private constructor() {
    this.rapidApiConnector = RapidAPIConnector.getInstance();
  }

  static getInstance(): RapidAPIVCWorkflow {
    if (!RapidAPIVCWorkflow.instance) {
      RapidAPIVCWorkflow.instance = new RapidAPIVCWorkflow();
    }
    return RapidAPIVCWorkflow.instance;
  }

  /**
   * Execute API call and create VC from response
   */
  async createVCFromAPI(request: VCCreationRequest): Promise<VCCreationResult> {
    try {
      console.log('🚀 Starting VC creation workflow for API:', request.apiId);

      // Step 1: Get API metadata
      const apiMetadata = await this.getAPIMetadata(request.apiId);
      if (!apiMetadata) {
        throw new Error(`API metadata not found for ${request.apiId}`);
      }

      // Step 2: Execute API call
      const apiResponse = await this.executeAPICall(apiMetadata, request.apiEndpoint, request.requestData);
      console.log('📡 API response received:', apiResponse);

      // Step 3: Map API response to VC data
      const vcData = await this.mapAPIResponseToVC(request.apiId, apiResponse, request.vcTemplate);
      console.log('🔄 Mapped VC data:', vcData);

      // Step 4: Calculate verification score
      const verificationScore = this.calculateVerificationScore(request.apiId, apiResponse);
      console.log('📊 Verification score:', verificationScore);

      // Step 5: Create VC
      const credential = await this.createVerifiableCredential({
        ...vcData,
        issuer: request.issuerDID,
        subject: request.holderDID,
        verificationScore,
        privacy: request.privacy,
        sourceAPI: {
          id: request.apiId,
          name: apiMetadata.name,
          provider: apiMetadata.provider,
          endpoint: request.apiEndpoint
        }
      });

      // Step 6: Store VC
      const vcId = await this.storeCredential(credential);
      
      console.log('✅ VC created successfully:', vcId);

      return {
        success: true,
        vcId,
        credential,
        apiResponse,
        verificationScore
      };

    } catch (error) {
      errorService.logError('❌ VC creation failed:', error);
      
      const personalError = errorService.createError(
        'VC_CREATION_FAILED',
        'Failed to create verifiable credential from API data',
        ErrorCategory.BLOCKCHAIN,
        ErrorSeverity.MEDIUM,
        errorService.createContext({
          component: 'rapidapi-vc-workflow',
          apiId: request.apiId,
          endpoint: request.apiEndpoint
        }),
        {
          originalError: error instanceof Error ? error : undefined,
          userMessage: 'Failed to create credential. Please check your API configuration and try again.',
          retryable: true
        }
      );

      errorService.reportError(personalError);

      return {
        success: false,
        error: personalError.userMessage
      };
    }
  }

  /**
   * Execute API call with proper authentication and error handling
   */
  private async executeAPICall(
    apiMetadata: RapidAPIMetadata,
    endpoint: string,
    requestData: Record<string, any>
  ): Promise<any> {
    const url = `${apiMetadata.baseUrl}${endpoint}`;
    const headers = {
      ...apiMetadata.authentication.headers,
      'Content-Type': 'application/json'
    };

    // Replace placeholder keys with actual keys
    if (headers['X-RapidAPI-Key'] === 'RAPIDAPI_KEY') {
      headers['X-RapidAPI-Key'] = process.env.VITE_RAPIDAPI_KEY || '';
    }

    const requestOptions: RequestInit = {
      method: 'POST', // Most verification APIs use POST
      headers,
      body: JSON.stringify(requestData)
    };

    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Map API response to VC data using predefined mappings
   */
  private async mapAPIResponseToVC(
    apiId: string,
    apiResponse: any,
    vcTemplate: VCCreationRequest['vcTemplate']
  ): Promise<any> {
    const mapping = API_VC_MAPPINGS.find(m => m.apiId === apiId);
    
    if (!mapping) {
      // Generic mapping for unknown APIs
      return {
        type: [vcTemplate.type],
        name: vcTemplate.name,
        description: vcTemplate.description,
        category: vcTemplate.category,
        tags: vcTemplate.tags,
        rawData: apiResponse,
        dataSource: apiId
      };
    }

    const vcData: any = {
      type: [mapping.vcType],
      name: vcTemplate.name,
      description: vcTemplate.description,
      category: vcTemplate.category,
      tags: vcTemplate.tags
    };

    // Apply mapping rules
    for (const rule of mapping.mappingRules) {
      try {
        const value = this.getNestedValue(apiResponse, rule.apiField);
        
        if (value !== undefined) {
          vcData[rule.vcField] = rule.transform ? rule.transform(value) : value;
        } else if (rule.required) {
          throw new Error(`Required field ${rule.apiField} not found in API response`);
        }
      } catch (error) {
        if (rule.required) {
          throw error;
        }
        console.warn(`Optional field mapping failed for ${rule.apiField}:`, error);
      }
    }

    return vcData;
  }

  /**
   * Calculate verification score based on API response quality
   */
  private calculateVerificationScore(apiId: string, apiResponse: any): number {
    const mapping = API_VC_MAPPINGS.find(m => m.apiId === apiId);
    
    if (!mapping) {
      return 75; // Default score for unknown APIs
    }

    let score = mapping.scoreCalculation.baseScore;
    
    for (const factor of mapping.scoreCalculation.qualityFactors) {
      try {
        const value = this.getNestedValue(apiResponse, factor.field);
        if (value !== undefined) {
          const qualityScore = factor.validator(value);
          score += (qualityScore * factor.weight * 15); // Max 15 points per factor
        }
      } catch (error) {
        console.warn(`Score calculation failed for factor ${factor.field}:`, error);
      }
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Create W3C compliant verifiable credential
   */
  private async createVerifiableCredential(data: any): Promise<any> {
    const currentDID = await didService.getCurrentDID();
    if (!currentDID) {
      throw new Error('No DID available for credential issuance');
    }

    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://personapass.xyz/contexts/v1'
      ],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ['VerifiableCredential', ...data.type],
      issuer: data.issuer || currentDID.did,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: data.subject,
        ...data
      },
      evidence: [{
        type: 'APIVerification',
        source: data.sourceAPI,
        verificationScore: data.verificationScore,
        timestamp: new Date().toISOString()
      }],
      credentialStatus: {
        type: 'PersonaPassRevocationList2024',
        status: 'active'
      }
    };

    // Sign the credential
    const signedCredential = await didService.signCredential(credential, currentDID);
    
    return signedCredential;
  }

  /**
   * Store credential securely
   */
  private async storeCredential(credential: any): Promise<string> {
    const credentialId = credential.id;
    
    // Store in local storage
    await storageService.setItem(`credential_${credentialId}`, JSON.stringify(credential));
    
    // Add to credential list
    const existingCredentials = await storageService.getItem('user_credentials') || '[]';
    const credentials = JSON.parse(existingCredentials);
    credentials.push({
      id: credentialId,
      type: credential.type,
      name: credential.credentialSubject.name || 'Unnamed Credential',
      issuer: credential.issuer,
      issuanceDate: credential.issuanceDate,
      status: 'verified',
      verificationScore: credential.evidence[0]?.verificationScore
    });
    
    await storageService.setItem('user_credentials', JSON.stringify(credentials));
    
    return credentialId;
  }

  /**
   * Get API metadata by ID
   */
  private async getAPIMetadata(apiId: string): Promise<RapidAPIMetadata | null> {
    // Try to get from different categories
    const categories = ['identity_verification', 'financial_data', 'communication'];
    
    for (const category of categories) {
      const apis = await this.rapidApiConnector.getAPIsByCategory(category);
      const api = apis.find(a => a.id === apiId);
      if (api) return api;
    }
    
    return null;
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Batch create VCs from multiple APIs
   */
  async createVCsFromMultipleAPIs(requests: VCCreationRequest[]): Promise<VCCreationResult[]> {
    const results: VCCreationResult[] = [];
    
    // Process in parallel but limit concurrency
    const concurrency = 3;
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(request => this.createVCFromAPI(request))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Get available VC templates for an API
   */
  async getVCTemplatesForAPI(apiId: string): Promise<Array<{ type: string; name: string; description: string }>> {
    const mapping = API_VC_MAPPINGS.find(m => m.apiId === apiId);
    
    if (mapping) {
      return [{
        type: mapping.vcType,
        name: mapping.vcType.replace('Credential', ''),
        description: `Verifiable credential for ${mapping.vcType.replace('Credential', '').toLowerCase()}`
      }];
    }
    
    // Return generic templates
    return [
      {
        type: 'DataVerificationCredential',
        name: 'Data Verification',
        description: 'Generic data verification credential'
      }
    ];
  }
}

export const rapidAPIVCWorkflow = RapidAPIVCWorkflow.getInstance();