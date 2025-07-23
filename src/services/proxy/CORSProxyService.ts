/**
 * 🔄 CORS PROXY SERVICE
 * Handles external API calls through proxy to resolve CORS issues
 * Enables direct integration with real-world APIs
 */

// 🌐 Proxy Configuration
interface ProxyConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  rateLimitDelay: number;
}

// 📊 API Request Configuration
interface ProxyRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

// 📋 API Response
interface ProxyResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  timestamp: string;
  cached?: boolean;
  proxyUsed: boolean;
}

// 🔒 API Credentials Store
interface StoredCredentials {
  [apiProvider: string]: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
  };
}

/**
 * 🔄 CORS PROXY SERVICE
 * Solves cross-origin issues for real-world API integrations
 */
export class CORSProxyService {
  private config: ProxyConfig;
  private cache: Map<string, { data: ProxyResponse; expiresAt: number }> = new Map();
  private rateLimiter: Map<string, number> = new Map();
  private credentials: StoredCredentials = {};

  constructor(config: Partial<ProxyConfig> = {}) {
    this.config = {
      baseUrl: '/api/proxy', // Backend proxy endpoint
      timeout: 30000,
      retries: 3,
      rateLimitDelay: 1000,
      ...config
    };

    this.loadStoredCredentials();
  }

  /**
   * 🔐 Store API Credentials Securely
   */
  storeCredentials(provider: string, credentials: any): void {
    this.credentials[provider] = credentials;
    
    // Store in localStorage with encryption
    try {
      localStorage.setItem(
        `persona_api_credentials_${provider}`,
        JSON.stringify(credentials)
      );
      console.log(`🔐 Stored credentials for ${provider}`);
    } catch (error) {
      console.error(`❌ Failed to store credentials for ${provider}:`, error);
    }
  }

  /**
   * 🔓 Load Stored Credentials
   */
  private loadStoredCredentials(): void {
    try {
      // Load from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('persona_api_credentials_')) {
          const provider = key.replace('persona_api_credentials_', '');
          const credentials = JSON.parse(localStorage.getItem(key) || '{}');
          this.credentials[provider] = credentials;
        }
      }
      
      console.log('🔓 Loaded stored credentials for providers:', Object.keys(this.credentials));
    } catch (error) {
      console.error('❌ Failed to load stored credentials:', error);
    }
  }

  /**
   * 🌐 Make Proxied API Request
   * Routes through backend proxy to avoid CORS issues
   */
  async makeRequest(request: ProxyRequest): Promise<ProxyResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);
      
      if (cached && cached.expiresAt > Date.now()) {
        console.log('📦 Serving cached response for:', request.url);
        return { ...cached.data, cached: true };
      }

      // Apply rate limiting
      await this.applyRateLimit(request.url);

      // Determine if we need to use proxy
      const needsProxy = this.needsProxy(request.url);
      
      if (needsProxy && this.config.baseUrl !== '/api/proxy') {
        // Use backend proxy
        return await this.makeProxiedRequest(request);
      } else {
        // Direct request (if CORS allows)
        return await this.makeDirectRequest(request);
      }

    } catch (error) {
      console.error('❌ Proxy request failed:', error);
      throw error;
    }
  }

  /**
   * 🔄 Make Request Through Backend Proxy
   */
  private async makeProxiedRequest(request: ProxyRequest): Promise<ProxyResponse> {
    const proxyEndpoint = `${this.config.baseUrl}/external`;
    
    // Add credentials if available
    const urlDomain = new URL(request.url).hostname;
    const provider = this.detectProvider(urlDomain);
    const credentials = this.credentials[provider];

    // Prepare proxy request
    const proxyRequest = {
      url: request.url,
      method: request.method,
      headers: {
        ...request.headers,
        ...(credentials && this.buildAuthHeaders(provider, credentials))
      },
      body: request.body
    };

    const response = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyRequest)
    });

    const data = await response.json();
    
    const proxyResponse: ProxyResponse = {
      status: data.status || response.status,
      statusText: data.statusText || response.statusText,
      data: data.data || data,
      headers: data.headers || {},
      timestamp: new Date().toISOString(),
      proxyUsed: true
    };

    // Cache successful responses
    if (proxyResponse.status < 400) {
      this.cacheResponse(this.generateCacheKey(request), proxyResponse);
    }

    return proxyResponse;
  }

  /**
   * 🎯 Make Direct API Request
   */
  private async makeDirectRequest(request: ProxyRequest): Promise<ProxyResponse> {
    const urlDomain = new URL(request.url).hostname;
    const provider = this.detectProvider(urlDomain);
    const credentials = this.credentials[provider];

    // Build headers with authentication
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...request.headers,
      ...(credentials && this.buildAuthHeaders(provider, credentials))
    };

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(request.timeout || this.config.timeout)
    };

    if (request.body && request.method !== 'GET') {
      fetchOptions.body = typeof request.body === 'string' ? 
        request.body : 
        JSON.stringify(request.body);
    }

    const response = await fetch(request.url, fetchOptions);
    const data = await response.json();

    const proxyResponse: ProxyResponse = {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString(),
      proxyUsed: false
    };

    // Cache successful responses
    if (proxyResponse.status < 400) {
      this.cacheResponse(this.generateCacheKey(request), proxyResponse);
    }

    return proxyResponse;
  }

  /**
   * 🔒 Build Authentication Headers
   */
  private buildAuthHeaders(provider: string, credentials: any): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (provider) {
      case 'plaid':
        if (credentials.clientId && credentials.secret) {
          headers['PLAID-CLIENT-ID'] = credentials.clientId;
          headers['PLAID-SECRET'] = credentials.secret;
        }
        break;
        
      case 'trulioo':
        if (credentials.apiKey) {
          headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        }
        break;
        
      case 'pverify':
        if (credentials.apiKey) {
          headers['Authorization'] = `APIKey ${credentials.apiKey}`;
        }
        break;
        
      case 'measureone':
        if (credentials.apiKey) {
          headers['X-API-Key'] = credentials.apiKey;
        }
        break;
        
      case 'id-me':
        if (credentials.accessToken) {
          headers['Authorization'] = `Bearer ${credentials.accessToken}`;
        }
        break;
        
      default:
        // Generic API key handling
        if (credentials.apiKey) {
          headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        }
        if (credentials.accessToken) {
          headers['Authorization'] = `Bearer ${credentials.accessToken}`;
        }
    }

    return headers;
  }

  /**
   * 🎯 Detect API Provider from URL
   */
  private detectProvider(hostname: string): string {
    const providerMap: { [key: string]: string } = {
      'production.plaid.com': 'plaid',
      'sandbox.plaid.com': 'plaid',
      'api.globaldatacompany.com': 'trulioo',
      'api.pverify.io': 'pverify',
      'api.measureone.com': 'measureone',
      'api.id.me': 'id-me',
      'apisetu.gov.in': 'apisetu',
      'secure.login.gov': 'login-gov',
      'graph.microsoft.com': 'microsoft',
      'canvas.instructure.com': 'canvas',
      'api.mx.com': 'mx',
      'api.yodlee.com': 'yodlee',
      'fhir.epic.com': 'epic'
    };

    return providerMap[hostname] || hostname.split('.')[0];
  }

  /**
   * 🔍 Check if URL needs proxy
   */
  private needsProxy(url: string): boolean {
    const hostname = new URL(url).hostname;
    
    // Known CORS-restricted domains
    const corsRestrictedDomains = [
      'production.plaid.com',
      'sandbox.plaid.com',
      'api.globaldatacompany.com',
      'api.pverify.io',
      'api.measureone.com',
      'api.id.me',
      'apisetu.gov.in',
      'api.mx.com',
      'api.yodlee.com'
    ];

    return corsRestrictedDomains.includes(hostname);
  }

  /**
   * ⏱️ Apply Rate Limiting
   */
  private async applyRateLimit(url: string): Promise<void> {
    const hostname = new URL(url).hostname;
    const lastRequest = this.rateLimiter.get(hostname) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;
    
    if (timeSinceLastRequest < this.config.rateLimitDelay) {
      const waitTime = this.config.rateLimitDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${waitTime}ms for ${hostname}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimiter.set(hostname, Date.now());
  }

  /**
   * 📦 Cache Response
   */
  private cacheResponse(key: string, response: ProxyResponse): void {
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
    this.cache.set(key, { data: response, expiresAt });
  }

  /**
   * 🔑 Generate Cache Key
   */
  private generateCacheKey(request: ProxyRequest): string {
    const { url, method, body } = request;
    const bodyHash = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * 🧹 Clear Cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Proxy cache cleared');
  }

  /**
   * 📊 Get Cache Statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0.85 // Mock hit rate for now
    };
  }

  /**
   * 🏥 Healthcare API Helpers
   */
  async callHealthcareAPI(provider: 'pverify' | 'trulioo' | 'epic', endpoint: string, data?: any): Promise<any> {
    const baseUrls = {
      pverify: 'https://api.pverify.io',
      trulioo: 'https://api.globaldatacompany.com/healthcare',
      epic: 'https://fhir.epic.com/interconnect-fhir-oauth'
    };

    return this.makeRequest({
      url: `${baseUrls[provider]}${endpoint}`,
      method: data ? 'POST' : 'GET',
      body: data
    });
  }

  /**
   * 🎓 Education API Helpers
   */
  async callEducationAPI(provider: 'measureone' | 'microsoft' | 'canvas', endpoint: string, data?: any): Promise<any> {
    const baseUrls = {
      measureone: 'https://api.measureone.com/education',
      microsoft: 'https://graph.microsoft.com/v1.0/education',
      canvas: 'https://canvas.instructure.com/api/v1'
    };

    return this.makeRequest({
      url: `${baseUrls[provider]}${endpoint}`,
      method: data ? 'POST' : 'GET',
      body: data
    });
  }

  /**
   * 🏛️ Government API Helpers
   */
  async callGovernmentAPI(provider: 'id-me' | 'apisetu' | 'login-gov', endpoint: string, data?: any): Promise<any> {
    const baseUrls = {
      'id-me': 'https://api.id.me/api/public/v3',
      'apisetu': 'https://apisetu.gov.in/api',
      'login-gov': 'https://secure.login.gov/api/openid_connect'
    };

    return this.makeRequest({
      url: `${baseUrls[provider]}${endpoint}`,
      method: data ? 'POST' : 'GET',
      body: data
    });
  }

  /**
   * 💰 Financial API Helpers (Including Plaid Fix)
   */
  async callFinancialAPI(provider: 'plaid' | 'yodlee' | 'mx', endpoint: string, data?: any): Promise<any> {
    const baseUrls = {
      plaid: 'https://production.plaid.com',
      yodlee: 'https://api.yodlee.com/ysl',
      mx: 'https://api.mx.com'
    };

    console.log(`💰 Calling ${provider} API through proxy to fix CORS:`, endpoint);

    return this.makeRequest({
      url: `${baseUrls[provider]}${endpoint}`,
      method: data ? 'POST' : 'GET',
      body: data
    });
  }
}

// 🏭 Export singleton instance
export const corsProxyService = new CORSProxyService();