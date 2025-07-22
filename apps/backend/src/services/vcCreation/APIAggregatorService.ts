import axios, { AxiosResponse } from 'axios';
import { RateLimiter } from 'limiter';
import { Logger } from '../utils/Logger';
import { RetryService } from '../RetryService';
import { CacheService } from '../CacheService';

/**
 * API Aggregator Service for PersonaChain VC Creation Pipeline
 * Fetches data from external APIs (RapidAPI, custom APIs) and transforms it for VC creation
 * 
 * Features:
 * - Multi-provider API integration (RapidAPI, direct APIs, government APIs)
 * - Rate limiting and quota management
 * - Intelligent caching and data freshness validation
 * - Error handling and retry logic
 * - Data transformation and normalization
 * - Security and authentication handling
 * - Performance monitoring and analytics
 */

export interface APIProvider {
  id: string;
  name: string;
  baseUrl: string;
  authentication: AuthenticationConfig;
  rateLimits: RateLimitConfig;
  supportedDataTypes: DataType[];
  reliability: number; // 0-1 reliability score
  costPerRequest: number;
  averageResponseTime: number;
}

export interface AuthenticationConfig {
  type: 'apiKey' | 'oauth' | 'bearer' | 'basic' | 'custom';
  credentials: Record<string, string>;
  headers?: Record<string, string>;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstAllowance: number;
  cooldownPeriod: number;
}

export interface DataType {
  category: 'identity' | 'financial' | 'education' | 'employment' | 'health' | 'government' | 'social' | 'professional';
  subType: string;
  schema: any;
  credentialTemplate: string;
  verificationLevel: 'self-attested' | 'verified' | 'authoritative';
  dataFreshness: number; // hours
}

export interface APIRequest {
  providerId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  cacheStrategy?: CacheStrategy;
}

export interface APIResponse {
  success: boolean;
  data: any;
  metadata: {
    providerId: string;
    endpoint: string;
    responseTime: number;
    timestamp: Date;
    dataFreshness: Date;
    reliability: number;
    cost: number;
  };
  error?: string;
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  };
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface CacheStrategy {
  enabled: boolean;
  ttl: number;
  refreshThreshold: number;
  invalidateOn: string[];
}

export class APIAggregatorService {
  private providers: Map<string, APIProvider> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private logger: Logger;
  private retryService: RetryService;
  private cacheService: CacheService;
  private metrics: APIMetrics;

  constructor() {
    this.logger = new Logger('APIAggregatorService');
    this.retryService = new RetryService();
    this.cacheService = new CacheService();
    this.metrics = new APIMetrics();
    this.initializeProviders();
  }

  /**
   * Initialize API providers
   */
  private initializeProviders(): void {
    // RapidAPI Provider
    this.registerProvider({
      id: 'rapidapi',
      name: 'RapidAPI',
      baseUrl: 'https://rapidapi.com',
      authentication: {
        type: 'apiKey',
        credentials: {
          apiKey: process.env.RAPIDAPI_KEY || '',
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': '',
        },
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstAllowance: 50,
        cooldownPeriod: 3600,
      },
      supportedDataTypes: [
        {
          category: 'identity',
          subType: 'verification',
          schema: {},
          credentialTemplate: 'identity-verification',
          verificationLevel: 'verified',
          dataFreshness: 24,
        },
        {
          category: 'financial',
          subType: 'credit-score',
          schema: {},
          credentialTemplate: 'credit-score',
          verificationLevel: 'authoritative',
          dataFreshness: 168,
        },
      ],
      reliability: 0.99,
      costPerRequest: 0.001,
      averageResponseTime: 250,
    });

    // LinkedIn API Provider
    this.registerProvider({
      id: 'linkedin',
      name: 'LinkedIn API',
      baseUrl: 'https://api.linkedin.com',
      authentication: {
        type: 'oauth',
        credentials: {
          clientId: process.env.LINKEDIN_CLIENT_ID || '',
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        },
      },
      rateLimits: {
        requestsPerSecond: 5,
        requestsPerHour: 500,
        requestsPerDay: 5000,
        burstAllowance: 25,
        cooldownPeriod: 3600,
      },
      supportedDataTypes: [
        {
          category: 'professional',
          subType: 'profile',
          schema: {},
          credentialTemplate: 'professional-profile',
          verificationLevel: 'verified',
          dataFreshness: 72,
        },
        {
          category: 'employment',
          subType: 'experience',
          schema: {},
          credentialTemplate: 'employment-history',
          verificationLevel: 'verified',
          dataFreshness: 168,
        },
      ],
      reliability: 0.97,
      costPerRequest: 0.002,
      averageResponseTime: 400,
    });

    // GitHub API Provider
    this.registerProvider({
      id: 'github',
      name: 'GitHub API',
      baseUrl: 'https://api.github.com',
      authentication: {
        type: 'bearer',
        credentials: {
          token: process.env.GITHUB_TOKEN || '',
        },
      },
      rateLimits: {
        requestsPerSecond: 8,
        requestsPerHour: 5000,
        requestsPerDay: 50000,
        burstAllowance: 40,
        cooldownPeriod: 3600,
      },
      supportedDataTypes: [
        {
          category: 'professional',
          subType: 'developer-profile',
          schema: {},
          credentialTemplate: 'developer-credentials',
          verificationLevel: 'verified',
          dataFreshness: 24,
        },
      ],
      reliability: 0.98,
      costPerRequest: 0.0005,
      averageResponseTime: 180,
    });

    // Plaid API Provider
    this.registerProvider({
      id: 'plaid',
      name: 'Plaid Financial API',
      baseUrl: 'https://production.plaid.com',
      authentication: {
        type: 'custom',
        credentials: {
          clientId: process.env.PLAID_CLIENT_ID || '',
          secret: process.env.PLAID_SECRET || '',
        },
      },
      rateLimits: {
        requestsPerSecond: 2,
        requestsPerHour: 100,
        requestsPerDay: 1000,
        burstAllowance: 10,
        cooldownPeriod: 3600,
      },
      supportedDataTypes: [
        {
          category: 'financial',
          subType: 'bank-account',
          schema: {},
          credentialTemplate: 'bank-verification',
          verificationLevel: 'authoritative',
          dataFreshness: 1,
        },
        {
          category: 'financial',
          subType: 'income',
          schema: {},
          credentialTemplate: 'income-verification',
          verificationLevel: 'authoritative',
          dataFreshness: 24,
        },
      ],
      reliability: 0.995,
      costPerRequest: 0.01,
      averageResponseTime: 800,
    });

    // Experian API Provider
    this.registerProvider({
      id: 'experian',
      name: 'Experian Credit API',
      baseUrl: 'https://api.experian.com',
      authentication: {
        type: 'apiKey',
        credentials: {
          apiKey: process.env.EXPERIAN_API_KEY || '',
        },
      },
      rateLimits: {
        requestsPerSecond: 1,
        requestsPerHour: 50,
        requestsPerDay: 500,
        burstAllowance: 5,
        cooldownPeriod: 3600,
      },
      supportedDataTypes: [
        {
          category: 'financial',
          subType: 'credit-report',
          schema: {},
          credentialTemplate: 'credit-report',
          verificationLevel: 'authoritative',
          dataFreshness: 168,
        },
      ],
      reliability: 0.99,
      costPerRequest: 0.50,
      averageResponseTime: 1200,
    });

    this.logger.info(`Initialized ${this.providers.size} API providers`);
  }

  /**
   * Register a new API provider
   */
  public registerProvider(provider: APIProvider): void {
    this.providers.set(provider.id, provider);
    
    // Initialize rate limiter for provider
    this.rateLimiters.set(provider.id, new RateLimiter({
      tokensPerInterval: provider.rateLimits.requestsPerSecond,
      interval: 'second',
    }));

    this.logger.info(`Registered API provider: ${provider.name}`);
  }

  /**
   * Make API request with full pipeline processing
   */
  public async makeRequest(request: APIRequest): Promise<APIResponse> {
    const startTime = Date.now();
    const provider = this.providers.get(request.providerId);
    
    if (!provider) {
      throw new Error(`Provider ${request.providerId} not found`);
    }

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      if (request.cacheStrategy?.enabled) {
        const cachedResponse = await this.cacheService.get(cacheKey);
        if (cachedResponse && this.isCacheValid(cachedResponse, request.cacheStrategy)) {
          this.metrics.recordCacheHit(request.providerId);
          return cachedResponse;
        }
      }

      // Check rate limits
      await this.checkRateLimit(request.providerId);

      // Execute request with retry logic
      const response = await this.executeRequestWithRetry(request, provider);
      
      // Cache response if configured
      if (request.cacheStrategy?.enabled && response.success) {
        await this.cacheService.set(cacheKey, response, request.cacheStrategy.ttl);
      }

      // Record metrics
      this.metrics.recordRequest(request.providerId, Date.now() - startTime, response.success);

      return response;

    } catch (error) {
      this.logger.error(`API request failed for provider ${request.providerId}:`, error);
      
      this.metrics.recordError(request.providerId, error.message);
      
      return {
        success: false,
        data: null,
        metadata: {
          providerId: request.providerId,
          endpoint: request.endpoint,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          dataFreshness: new Date(),
          reliability: provider.reliability,
          cost: provider.costPerRequest,
        },
        error: error.message,
      };
    }
  }

  /**
   * Fetch data for VC creation with intelligent provider selection
   */
  public async fetchDataForVC(dataType: string, parameters: Record<string, any>): Promise<APIResponse[]> {
    const suitableProviders = this.findSuitableProviders(dataType);
    const responses: APIResponse[] = [];

    // Primary provider request
    const primaryProvider = this.selectBestProvider(suitableProviders);
    if (primaryProvider) {
      const request = this.buildAPIRequest(primaryProvider, dataType, parameters);
      const response = await this.makeRequest(request);
      responses.push(response);

      // If primary failed and data is critical, try backup providers
      if (!response.success && this.isCriticalDataType(dataType)) {
        const backupProviders = suitableProviders.filter(p => p.id !== primaryProvider.id);
        for (const backup of backupProviders.slice(0, 2)) { // Try up to 2 backups
          const backupRequest = this.buildAPIRequest(backup, dataType, parameters);
          const backupResponse = await this.makeRequest(backupRequest);
          responses.push(backupResponse);
          
          if (backupResponse.success) break; // Stop on first success
        }
      }
    }

    return responses;
  }

  /**
   * Batch fetch data for multiple VC types
   */
  public async batchFetchData(requests: Array<{ dataType: string; parameters: Record<string, any> }>): Promise<Map<string, APIResponse[]>> {
    const results = new Map<string, APIResponse[]>();
    
    // Group requests by provider to optimize rate limiting
    const providerGroups = this.groupRequestsByProvider(requests);
    
    // Execute requests in parallel within rate limits
    const promises = Array.from(providerGroups.entries()).map(async ([providerId, providerRequests]) => {
      for (const req of providerRequests) {
        const responses = await this.fetchDataForVC(req.dataType, req.parameters);
        results.set(req.dataType, responses);
        
        // Small delay between requests to same provider
        await this.delay(100);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get provider health and status
   */
  public async getProviderHealth(): Promise<Map<string, ProviderHealth>> {
    const healthMap = new Map<string, ProviderHealth>();

    for (const [providerId, provider] of this.providers) {
      const health = await this.checkProviderHealth(provider);
      healthMap.set(providerId, health);
    }

    return healthMap;
  }

  /**
   * Private helper methods
   */
  private async checkRateLimit(providerId: string): Promise<void> {
    const limiter = this.rateLimiters.get(providerId);
    if (limiter) {
      const allowed = await limiter.removeTokens(1);
      if (!allowed) {
        throw new Error(`Rate limit exceeded for provider ${providerId}`);
      }
    }
  }

  private async executeRequestWithRetry(request: APIRequest, provider: APIProvider): Promise<APIResponse> {
    const retryPolicy = request.retryPolicy || {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', '429', '500', '502', '503', '504'],
    };

    return this.retryService.execute(async () => {
      return this.executeRequest(request, provider);
    }, retryPolicy);
  }

  private async executeRequest(request: APIRequest, provider: APIProvider): Promise<APIResponse> {
    const startTime = Date.now();
    
    // Build headers with authentication
    const headers = {
      ...this.buildAuthHeaders(provider.authentication),
      ...request.headers,
      'Content-Type': 'application/json',
      'User-Agent': 'PersonaChain-API-Aggregator/1.0',
    };

    // Build full URL
    const url = `${provider.baseUrl}${request.endpoint}`;

    try {
      const axiosResponse: AxiosResponse = await axios({
        method: request.method,
        url,
        headers,
        params: request.params,
        data: request.body,
        timeout: request.timeout || 30000,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      const success = axiosResponse.status >= 200 && axiosResponse.status < 300;
      
      return {
        success,
        data: axiosResponse.data,
        metadata: {
          providerId: provider.id,
          endpoint: request.endpoint,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          dataFreshness: new Date(),
          reliability: provider.reliability,
          cost: provider.costPerRequest,
        },
        error: success ? undefined : `HTTP ${axiosResponse.status}: ${axiosResponse.statusText}`,
        rateLimitInfo: this.extractRateLimitInfo(axiosResponse.headers),
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          throw error; // Will be caught by retry service
        }
        
        return {
          success: false,
          data: null,
          metadata: {
            providerId: provider.id,
            endpoint: request.endpoint,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
            dataFreshness: new Date(),
            reliability: provider.reliability,
            cost: provider.costPerRequest,
          },
          error: `${statusCode ? `HTTP ${statusCode}: ` : ''}${message}`,
        };
      }

      throw error;
    }
  }

  private buildAuthHeaders(auth: AuthenticationConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (auth.type) {
      case 'apiKey':
        if (auth.headers) {
          Object.assign(headers, auth.headers);
        }
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.credentials.token}`;
        break;
      case 'basic':
        const encoded = Buffer.from(`${auth.credentials.username}:${auth.credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
        break;
      case 'oauth':
        // OAuth tokens should be refreshed separately
        if (auth.credentials.accessToken) {
          headers['Authorization'] = `Bearer ${auth.credentials.accessToken}`;
        }
        break;
    }

    return headers;
  }

  private findSuitableProviders(dataType: string): APIProvider[] {
    return Array.from(this.providers.values()).filter(provider =>
      provider.supportedDataTypes.some(type => 
        type.category === dataType || 
        type.subType === dataType ||
        `${type.category}-${type.subType}` === dataType
      )
    );
  }

  private selectBestProvider(providers: APIProvider[]): APIProvider | null {
    if (providers.length === 0) return null;

    // Score providers based on reliability, cost, and response time
    const scoredProviders = providers.map(provider => ({
      provider,
      score: (provider.reliability * 0.5) + 
             ((1 / provider.costPerRequest) * 0.3) + 
             ((1 / provider.averageResponseTime) * 0.2)
    }));

    scoredProviders.sort((a, b) => b.score - a.score);
    return scoredProviders[0].provider;
  }

  private buildAPIRequest(provider: APIProvider, dataType: string, parameters: Record<string, any>): APIRequest {
    const dataTypeConfig = provider.supportedDataTypes.find(type => 
      type.category === dataType || 
      type.subType === dataType ||
      `${type.category}-${type.subType}` === dataType
    );

    return {
      providerId: provider.id,
      endpoint: this.buildEndpoint(provider, dataType, parameters),
      method: 'GET',
      params: parameters,
      cacheStrategy: {
        enabled: true,
        ttl: (dataTypeConfig?.dataFreshness || 24) * 3600, // Convert hours to seconds
        refreshThreshold: 0.8,
        invalidateOn: ['user-update', 'data-change'],
      },
      retryPolicy: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', '429', '500', '502', '503', '504'],
      },
    };
  }

  private buildEndpoint(provider: APIProvider, dataType: string, parameters: Record<string, any>): string {
    // Provider-specific endpoint building logic
    switch (provider.id) {
      case 'rapidapi':
        return this.buildRapidAPIEndpoint(dataType, parameters);
      case 'linkedin':
        return this.buildLinkedInEndpoint(dataType, parameters);
      case 'github':
        return this.buildGitHubEndpoint(dataType, parameters);
      case 'plaid':
        return this.buildPlaidEndpoint(dataType, parameters);
      case 'experian':
        return this.buildExperianEndpoint(dataType, parameters);
      default:
        return `/api/${dataType}`;
    }
  }

  private buildRapidAPIEndpoint(dataType: string, parameters: Record<string, any>): string {
    const endpoints = {
      'identity-verification': '/identity/verify',
      'credit-score': '/credit/score',
      'financial-profile': '/financial/profile',
      'employment-verification': '/employment/verify',
      'education-verification': '/education/verify',
    };
    return endpoints[dataType] || `/api/${dataType}`;
  }

  private buildLinkedInEndpoint(dataType: string, parameters: Record<string, any>): string {
    const endpoints = {
      'professional-profile': '/v2/people/(id:person-id)',
      'employment-history': '/v2/people/(id:person-id)/positions',
      'education-history': '/v2/people/(id:person-id)/educations',
    };
    return endpoints[dataType] || `/v2/${dataType}`;
  }

  private buildGitHubEndpoint(dataType: string, parameters: Record<string, any>): string {
    const endpoints = {
      'developer-profile': `/users/${parameters.username}`,
      'repository-stats': `/users/${parameters.username}/repos`,
      'contribution-stats': `/users/${parameters.username}/events`,
    };
    return endpoints[dataType] || `/api/${dataType}`;
  }

  private buildPlaidEndpoint(dataType: string, parameters: Record<string, any>): string {
    const endpoints = {
      'bank-account': '/accounts/get',
      'income': '/income/get',
      'transactions': '/transactions/get',
      'identity': '/identity/get',
    };
    return endpoints[dataType] || `/${dataType}`;
  }

  private buildExperianEndpoint(dataType: string, parameters: Record<string, any>): string {
    const endpoints = {
      'credit-report': '/credit/report',
      'credit-score': '/credit/score',
      'identity-verification': '/identity/verify',
    };
    return endpoints[dataType] || `/api/${dataType}`;
  }

  private generateCacheKey(request: APIRequest): string {
    const keyData = {
      providerId: request.providerId,
      endpoint: request.endpoint,
      params: request.params,
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private isCacheValid(cachedResponse: APIResponse, cacheStrategy: CacheStrategy): boolean {
    const age = Date.now() - cachedResponse.metadata.timestamp.getTime();
    const maxAge = cacheStrategy.ttl * 1000;
    const refreshThreshold = maxAge * cacheStrategy.refreshThreshold;
    
    return age < refreshThreshold;
  }

  private extractRateLimitInfo(headers: any): any {
    return {
      remaining: parseInt(headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'] || '0'),
      resetTime: new Date(parseInt(headers['x-ratelimit-reset'] || headers['x-rate-limit-reset'] || '0') * 1000),
      retryAfter: parseInt(headers['retry-after'] || '0'),
    };
  }

  private isRetryableError(error: any): boolean {
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const retryableErrorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    
    return retryableStatusCodes.includes(error.response?.status) ||
           retryableErrorCodes.includes(error.code);
  }

  private isCriticalDataType(dataType: string): boolean {
    const criticalTypes = ['identity-verification', 'bank-account', 'credit-report', 'government-id'];
    return criticalTypes.includes(dataType);
  }

  private groupRequestsByProvider(requests: Array<{ dataType: string; parameters: Record<string, any> }>): Map<string, typeof requests> {
    const groups = new Map<string, typeof requests>();
    
    for (const request of requests) {
      const providers = this.findSuitableProviders(request.dataType);
      const bestProvider = this.selectBestProvider(providers);
      
      if (bestProvider) {
        if (!groups.has(bestProvider.id)) {
          groups.set(bestProvider.id, []);
        }
        groups.get(bestProvider.id)!.push(request);
      }
    }
    
    return groups;
  }

  private async checkProviderHealth(provider: APIProvider): Promise<ProviderHealth> {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${provider.baseUrl}/health`, {
        timeout: 5000,
        headers: this.buildAuthHeaders(provider.authentication),
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        providerId: provider.id,
        status: response.status === 200 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        uptime: this.calculateUptime(provider.id),
        errorRate: this.metrics.getErrorRate(provider.id),
      };
    } catch (error) {
      return {
        providerId: provider.id,
        status: 'unhealthy',
        responseTime: 0,
        lastChecked: new Date(),
        uptime: this.calculateUptime(provider.id),
        errorRate: this.metrics.getErrorRate(provider.id),
        error: error.message,
      };
    }
  }

  private calculateUptime(providerId: string): number {
    return this.metrics.getUptime(providerId);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface ProviderHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  uptime: number;
  errorRate: number;
  error?: string;
}

class APIMetrics {
  private requestCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private responseTimes = new Map<string, number[]>();
  private cacheHits = new Map<string, number>();

  recordRequest(providerId: string, responseTime: number, success: boolean): void {
    this.requestCounts.set(providerId, (this.requestCounts.get(providerId) || 0) + 1);
    
    if (!this.responseTimes.has(providerId)) {
      this.responseTimes.set(providerId, []);
    }
    this.responseTimes.get(providerId)!.push(responseTime);

    if (!success) {
      this.errorCounts.set(providerId, (this.errorCounts.get(providerId) || 0) + 1);
    }
  }

  recordError(providerId: string, error: string): void {
    this.errorCounts.set(providerId, (this.errorCounts.get(providerId) || 0) + 1);
  }

  recordCacheHit(providerId: string): void {
    this.cacheHits.set(providerId, (this.cacheHits.get(providerId) || 0) + 1);
  }

  getErrorRate(providerId: string): number {
    const total = this.requestCounts.get(providerId) || 0;
    const errors = this.errorCounts.get(providerId) || 0;
    return total > 0 ? errors / total : 0;
  }

  getUptime(providerId: string): number {
    return 1 - this.getErrorRate(providerId); // Simplified uptime calculation
  }

  getAverageResponseTime(providerId: string): number {
    const times = this.responseTimes.get(providerId) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getCacheHitRate(providerId: string): number {
    const hits = this.cacheHits.get(providerId) || 0;
    const total = this.requestCounts.get(providerId) || 0;
    return total > 0 ? hits / total : 0;
  }
}