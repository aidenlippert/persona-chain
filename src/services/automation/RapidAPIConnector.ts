/**
 * RapidAPI Hub Connector for PersonaPass
 * Access to 40,000+ APIs through Nokia-acquired RapidAPI marketplace
 */

export interface RapidAPIMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  baseUrl: string;
  pricing: {
    model: 'free' | 'freemium' | 'paid';
    tiers?: Array<{
      name: string;
      price: number;
      requests: number;
      features: string[];
    }>;
  };
  authentication: {
    type: 'rapidapi-key' | 'api-key' | 'oauth2' | 'basic';
    headers: Record<string, string>;
  };
  endpoints: Array<{
    path: string;
    method: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
  }>;
  rateLimits: {
    requests: number;
    window: number;
  };
  reliability: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  rapidApiUrl: string;
}

export interface RapidAPISearchFilters {
  category?: string;
  tags?: string[];
  pricing?: 'free' | 'freemium' | 'paid';
  verified?: boolean;
  minReliability?: number;
  maxLatency?: number;
}

export class RapidAPIConnector {
  private static instance: RapidAPIConnector;
  private rapidApiKey: string;
  private rapidApiHost = 'rapidapi.com';
  private baseUrl = 'https://rapidapi-api.p.rapidapi.com';

  // Cached API metadata
  private apiCache: Map<string, RapidAPIMetadata> = new Map();
  private categoryCache: Map<string, RapidAPIMetadata[]> = new Map();

  private constructor() {
    this.rapidApiKey = process.env.VITE_RAPIDAPI_KEY || '';
  }

  static getInstance(): RapidAPIConnector {
    if (!RapidAPIConnector.instance) {
      RapidAPIConnector.instance = new RapidAPIConnector();
    }
    return RapidAPIConnector.instance;
  }

  /**
   * Search RapidAPI Hub for verification APIs
   */
  async searchVerificationAPIs(filters: RapidAPISearchFilters): Promise<RapidAPIMetadata[]> {
    try {
      // Check cache first
      const cacheKey = JSON.stringify(filters);
      if (this.categoryCache.has(cacheKey)) {
        return this.categoryCache.get(cacheKey)!;
      }

      // Search RapidAPI Hub
      const searchResults = await this.performSearch(filters);
      
      // Cache results
      this.categoryCache.set(cacheKey, searchResults);
      
      return searchResults;
    } catch (error) {
      errorService.logError('RapidAPI search failed:', error);
      return this.getFallbackAPIs(filters);
    }
  }

  /**
   * Get comprehensive identity verification APIs
   */
  async getIdentityVerificationAPIs(): Promise<RapidAPIMetadata[]> {
    const identityAPIs: RapidAPIMetadata[] = [
      {
        id: 'rapidapi_trulioo_global',
        name: 'Trulioo GlobalGateway',
        description: 'Global identity verification and KYC compliance in 100+ countries',
        category: 'identity_verification',
        provider: 'Trulioo',
        baseUrl: 'https://api.globaldatacompany.com/v1',
        pricing: {
          model: 'paid',
          tiers: [
            { name: 'Starter', price: 1.50, requests: 1000, features: ['Basic verification', 'Document check'] },
            { name: 'Professional', price: 1.25, requests: 10000, features: ['Full verification', 'AML screening', 'Watchlist check'] },
            { name: 'Enterprise', price: 1.00, requests: 100000, features: ['Custom rules', 'Bulk processing', 'Priority support'] }
          ]
        },
        authentication: {
          type: 'rapidapi-key',
          headers: {
            'X-RapidAPI-Key': 'RAPIDAPI_KEY',
            'X-RapidAPI-Host': 'trulioo-globalgatewaytesting.p.rapidapi.com'
          }
        },
        endpoints: [
          {
            path: '/verifications/v1/verify',
            method: 'POST',
            description: 'Verify identity documents and personal information',
            parameters: [
              { name: 'countryCode', type: 'string', required: true, description: 'ISO country code' },
              { name: 'personInfo', type: 'object', required: true, description: 'Personal information to verify' },
              { name: 'document', type: 'object', required: false, description: 'Document information' }
            ]
          }
        ],
        rateLimits: { requests: 100, window: 60 },
        reliability: { uptime: 99.9, responseTime: 850, errorRate: 0.01 },
        rapidApiUrl: 'https://rapidapi.com/trulioo/api/trulioo-globalgatewaytesting'
      },
      {
        id: 'rapidapi_jumio_netverify',
        name: 'Jumio Netverify',
        description: 'AI-powered identity verification with biometric authentication',
        category: 'biometric_verification',
        provider: 'Jumio',
        baseUrl: 'https://netverify.com/api',
        pricing: {
          model: 'paid',
          tiers: [
            { name: 'Basic', price: 2.00, requests: 500, features: ['ID verification', 'Liveness detection'] },
            { name: 'Advanced', price: 1.75, requests: 5000, features: ['Full biometric suite', 'Fraud detection', 'Real-time results'] }
          ]
        },
        authentication: {
          type: 'oauth2',
          headers: {
            'Authorization': 'Bearer TOKEN',
            'X-RapidAPI-Key': 'RAPIDAPI_KEY'
          }
        },
        endpoints: [
          {
            path: '/acquisitions',
            method: 'POST',
            description: 'Start identity verification process',
            parameters: [
              { name: 'customerInternalReference', type: 'string', required: true, description: 'Customer reference' },
              { name: 'userReference', type: 'string', required: true, description: 'User reference' }
            ]
          }
        ],
        rateLimits: { requests: 50, window: 60 },
        reliability: { uptime: 99.8, responseTime: 1200, errorRate: 0.02 },
        rapidApiUrl: 'https://rapidapi.com/jumio/api/jumio-netverify'
      },
      {
        id: 'rapidapi_onfido',
        name: 'Onfido Identity Verification',
        description: 'Machine learning-powered identity verification and background checks',
        category: 'identity_verification',
        provider: 'Onfido',
        baseUrl: 'https://api.onfido.com/v3',
        pricing: {
          model: 'paid',
          tiers: [
            { name: 'Essentials', price: 1.20, requests: 1000, features: ['Document verification', 'Facial similarity'] },
            { name: 'Complete', price: 2.50, requests: 1000, features: ['Full verification', 'Watchlist screening', 'Enhanced fraud detection'] }
          ]
        },
        authentication: {
          type: 'api-key',
          headers: {
            'Authorization': 'Token token=API_TOKEN',
            'X-RapidAPI-Key': 'RAPIDAPI_KEY'
          }
        },
        endpoints: [
          {
            path: '/applicants',
            method: 'POST',
            description: 'Create applicant for verification',
            parameters: [
              { name: 'first_name', type: 'string', required: true, description: 'First name' },
              { name: 'last_name', type: 'string', required: true, description: 'Last name' }
            ]
          }
        ],
        rateLimits: { requests: 100, window: 60 },
        reliability: { uptime: 99.7, responseTime: 950, errorRate: 0.015 },
        rapidApiUrl: 'https://rapidapi.com/onfido/api/onfido-identity'
      }
    ];

    return identityAPIs;
  }

  /**
   * Get financial data and verification APIs
   */
  async getFinancialVerificationAPIs(): Promise<RapidAPIMetadata[]> {
    const financialAPIs: RapidAPIMetadata[] = [
      {
        id: 'rapidapi_yodlee_fastlink',
        name: 'Yodlee FastLink',
        description: 'Comprehensive financial data aggregation and account verification',
        category: 'financial_data',
        provider: 'Yodlee',
        baseUrl: 'https://production.api.yodlee.com/ysl',
        pricing: {
          model: 'paid',
          tiers: [
            { name: 'Developer', price: 0.50, requests: 1000, features: ['Basic account data', 'Transaction history'] },
            { name: 'Professional', price: 0.35, requests: 10000, features: ['Enhanced data', 'Income analysis', 'Risk assessment'] },
            { name: 'Enterprise', price: 0.25, requests: 100000, features: ['Custom categorization', 'Bulk processing', 'Premium support'] }
          ]
        },
        authentication: {
          type: 'oauth2',
          headers: {
            'Authorization': 'Bearer ACCESS_TOKEN',
            'Api-Version': '1.1',
            'X-RapidAPI-Key': 'RAPIDAPI_KEY'
          }
        },
        endpoints: [
          {
            path: '/accounts',
            method: 'GET',
            description: 'Get user account information',
            parameters: [
              { name: 'accountId', type: 'string', required: false, description: 'Specific account ID' },
              { name: 'container', type: 'string', required: false, description: 'Account container type' }
            ]
          }
        ],
        rateLimits: { requests: 200, window: 60 },
        reliability: { uptime: 99.5, responseTime: 750, errorRate: 0.025 },
        rapidApiUrl: 'https://rapidapi.com/yodlee/api/yodlee-fastlink'
      },
      {
        id: 'rapidapi_mx_platform',
        name: 'MX Platform API',
        description: 'Open banking data and financial insights platform',
        category: 'financial_data',
        provider: 'MX Technologies',
        baseUrl: 'https://api.mx.com',
        pricing: {
          model: 'paid',
          tiers: [
            { name: 'Basic', price: 0.40, requests: 1000, features: ['Account aggregation', 'Transaction data'] },
            { name: 'Advanced', price: 0.30, requests: 10000, features: ['Enhanced categorization', 'Spending insights', 'Net worth tracking'] }
          ]
        },
        authentication: {
          type: 'basic',
          headers: {
            'Authorization': 'Basic ENCODED_CREDENTIALS',
            'Accept': 'application/vnd.mx.api.v1+json',
            'X-RapidAPI-Key': 'RAPIDAPI_KEY'
          }
        },
        endpoints: [
          {
            path: '/users/{user_guid}/accounts',
            method: 'GET',
            description: 'List user accounts',
            parameters: [
              { name: 'user_guid', type: 'string', required: true, description: 'User identifier' },
              { name: 'page', type: 'integer', required: false, description: 'Page number' }
            ]
          }
        ],
        rateLimits: { requests: 150, window: 60 },
        reliability: { uptime: 99.6, responseTime: 650, errorRate: 0.02 },
        rapidApiUrl: 'https://rapidapi.com/mx-technologies/api/mx-platform'
      }
    ];

    return financialAPIs;
  }

  /**
   * Get communication and phone verification APIs
   */
  async getCommunicationAPIs(): Promise<RapidAPIMetadata[]> {
    const communicationAPIs: RapidAPIMetadata[] = [
      {
        id: 'rapidapi_twilio_verify',
        name: 'Twilio Verify',
        description: 'Multi-channel verification via SMS, voice, email, and WhatsApp',
        category: 'communication',
        provider: 'Twilio',
        baseUrl: 'https://verify.twilio.com/v2',
        pricing: {
          model: 'freemium',
          tiers: [
            { name: 'Free', price: 0, requests: 100, features: ['SMS verification', 'Voice verification'] },
            { name: 'Pay-as-you-go', price: 0.05, requests: -1, features: ['All channels', 'Custom branding', 'Analytics'] }
          ]
        },
        authentication: {
          type: 'basic',
          headers: {
            'Authorization': 'Basic ACCOUNT_SID:AUTH_TOKEN',
            'X-RapidAPI-Key': 'RAPIDAPI_KEY'
          }
        },
        endpoints: [
          {
            path: '/Services/{ServiceSid}/Verifications',
            method: 'POST',
            description: 'Send verification code',
            parameters: [
              { name: 'To', type: 'string', required: true, description: 'Phone number to verify' },
              { name: 'Channel', type: 'string', required: true, description: 'Verification channel (sms, call, whatsapp)' }
            ]
          }
        ],
        rateLimits: { requests: 1000, window: 3600 },
        reliability: { uptime: 99.95, responseTime: 400, errorRate: 0.005 },
        rapidApiUrl: 'https://rapidapi.com/twilio/api/twilio-verify'
      },
      {
        id: 'rapidapi_telesign',
        name: 'TeleSign Verify',
        description: 'Global phone verification and fraud prevention',
        category: 'communication',
        provider: 'TeleSign',
        baseUrl: 'https://rest-api.telesign.com/v1',
        pricing: {
          model: 'paid',
          tiers: [
            { name: 'Standard', price: 0.045, requests: -1, features: ['SMS verification', 'Voice verification', 'Phone number intelligence'] },
            { name: 'Premium', price: 0.035, requests: -1, features: ['Enhanced fraud scoring', 'Risk assessment', 'Telecom data'] }
          ]
        },
        authentication: {
          type: 'basic',
          headers: {
            'Authorization': 'Basic CUSTOMER_ID:API_KEY',
            'X-RapidAPI-Key': 'RAPIDAPI_KEY'
          }
        },
        endpoints: [
          {
            path: '/verify/sms',
            method: 'POST',
            description: 'Send SMS verification',
            parameters: [
              { name: 'phone_number', type: 'string', required: true, description: 'Phone number' },
              { name: 'message', type: 'string', required: false, description: 'Custom message template' }
            ]
          }
        ],
        rateLimits: { requests: 500, window: 3600 },
        reliability: { uptime: 99.8, responseTime: 600, errorRate: 0.012 },
        rapidApiUrl: 'https://rapidapi.com/telesign/api/telesign-verify'
      }
    ];

    return communicationAPIs;
  }

  /**
   * Test API connection and authentication
   */
  async testAPIConnection(apiId: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const api = this.apiCache.get(apiId);
    if (!api) {
      return { success: false, responseTime: 0, error: 'API not found' };
    }

    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const response = await fetch(api.baseUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': this.extractHostFromUrl(api.rapidApiUrl)
        }
      });

      const responseTime = Date.now() - startTime;
      
      return {
        success: response.ok,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get API usage statistics from RapidAPI
   */
  async getAPIUsageStats(apiId: string): Promise<{
    requests: number;
    errors: number;
    avgResponseTime: number;
    lastUsed: Date;
  }> {
    // Mock implementation - in production would fetch from RapidAPI analytics
    return {
      requests: Math.floor(Math.random() * 1000),
      errors: Math.floor(Math.random() * 10),
      avgResponseTime: Math.floor(Math.random() * 1000 + 200),
      lastUsed: new Date()
    };
  }

  /**
   * Subscribe to API on RapidAPI marketplace
   */
  async subscribeToAPI(apiId: string, tier: string): Promise<{
    success: boolean;
    subscriptionId?: string;
    error?: string;
  }> {
    // This would integrate with RapidAPI's subscription API
    // For now, return mock success
    return {
      success: true,
      subscriptionId: `sub_${Date.now()}_${apiId}`,
    };
  }

  /**
   * Get all available APIs in a category
   */
  async getAPIsByCategory(category: string): Promise<RapidAPIMetadata[]> {
    switch (category) {
      case 'identity_verification':
      case 'biometric_verification':
        return this.getIdentityVerificationAPIs();
      case 'financial_data':
      case 'credit_verification':
        return this.getFinancialVerificationAPIs();
      case 'communication':
      case 'phone_verification':
        return this.getCommunicationAPIs();
      default:
        return [];
    }
  }

  // Private helper methods
  private async performSearch(filters: RapidAPISearchFilters): Promise<RapidAPIMetadata[]> {
    // In production, this would call RapidAPI's search endpoint
    // For now, return filtered mock data
    const allAPIs = [
      ...(await this.getIdentityVerificationAPIs()),
      ...(await this.getFinancialVerificationAPIs()),
      ...(await this.getCommunicationAPIs())
    ];

    return allAPIs.filter(api => {
      if (filters.category && !api.category.includes(filters.category)) return false;
      if (filters.pricing && api.pricing.model !== filters.pricing) return false;
      if (filters.minReliability && api.reliability.uptime < filters.minReliability) return false;
      if (filters.maxLatency && api.reliability.responseTime > filters.maxLatency) return false;
      return true;
    });
  }

  private getFallbackAPIs(filters: RapidAPISearchFilters): RapidAPIMetadata[] {
    // Return cached or pre-configured APIs as fallback
    return [];
  }

  private extractHostFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('rapidapi.com', 'p.rapidapi.com');
    } catch {
      return 'api.rapidapi.com';
    }
  }
}

export default RapidAPIConnector;