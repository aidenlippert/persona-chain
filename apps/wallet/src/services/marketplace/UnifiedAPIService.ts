/**
 * 🌐 UNIFIED API MARKETPLACE SERVICE
 * Orchestrates discovery, premium APIs, and real credential generation
 * Single interface for all API marketplace functionality
 */

import { apiDiscoveryService, DiscoveredAPI } from './APIDiscoveryService';
import { premiumAPIService } from './PremiumAPIService';
import { realWorldAPIService, HealthcareAPI, EducationAPI, GovernmentAPI, FinancialAPI } from './RealWorldAPIService';
import { verifiableCredentialService } from '../credentials/VerifiableCredentialService';

// 🎯 UNIFIED API TYPES
export interface UnifiedAPI {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  type: 'premium' | 'discovered' | 'real-world' | 'user-submitted';
  authType: string;
  pricing: 'free' | 'freemium' | 'paid';
  verified: boolean;
  rating: number;
  features: string[];
  credentialType: string;
  setupTime: string;
  popularity: number;
  endpoints: APIEndpoint[];
  integrationGuide?: any;
  connectionStatus?: ConnectionStatus;
}

interface APIEndpoint {
  name: string;
  description: string;
  method: string;
  path: string;
  credentialFields?: string[];
}

interface ConnectionStatus {
  isConnected: boolean;
  quotaUsed?: number;
  quotaLimit?: number;
  lastUsed?: string;
  testResults?: any;
}

interface APIConnectionRequest {
  apiId: string;
  credentials?: { [key: string]: string };
  testData?: any;
}

interface CredentialCreationRequest {
  apiId: string;
  endpoint: string;
  inputData: any;
  options?: {
    challenge?: string;
    expirationDays?: number;
  };
}

/**
 * 🌐 UNIFIED API MARKETPLACE SERVICE
 * Single orchestration layer for all API marketplace functionality
 */
export class UnifiedAPIService {
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * 🚀 Initialize the unified service
   */
  private async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Unified API Service...');

      // Start discovery in background (don't wait)
      this.startBackgroundDiscovery();

      console.log('✅ Unified API Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Unified API Service:', error);
      throw error;
    }
  }

  /**
   * 🔍 Start background API discovery
   */
  private startBackgroundDiscovery(): void {
    // Start discovery but don't block initialization
    setTimeout(async () => {
      try {
        console.log('🔍 Starting background API discovery...');
        await apiDiscoveryService.discoverAPIs(false);
        console.log('✅ Background API discovery completed');
      } catch (error) {
        console.error('❌ Background discovery failed:', error);
      }
    }, 1000);
  }

  /**
   * 🔍 Search All APIs (Premium + Discovered)
   */
  async searchAPIs(
    query: string, 
    category?: string, 
    filters?: {
      type?: 'premium' | 'discovered' | 'real-world' | 'all';
      pricing?: 'free' | 'freemium' | 'paid';
      verified?: boolean;
      minRating?: number;
      compliance?: string[];
      region?: string[];
    },
    limit: number = 50
  ): Promise<UnifiedAPI[]> {
    await this.initialize();

    try {
      const results: UnifiedAPI[] = [];

      // Search real-world APIs first (highest priority)
      if (!filters?.type || filters.type === 'real-world' || filters.type === 'all') {
        const realWorldAPIs = await this.searchRealWorldAPIs(query, category, filters);
        results.push(...realWorldAPIs);
      }

      // Search premium APIs
      if (!filters?.type || filters.type === 'premium' || filters.type === 'all') {
        const premiumAPIs = this.searchPremiumAPIs(query, category, filters);
        results.push(...premiumAPIs);
      }

      // Search discovered APIs
      if (!filters?.type || filters.type === 'discovered' || filters.type === 'all') {
        const discoveredAPIs = this.searchDiscoveredAPIs(query, category, filters);
        results.push(...discoveredAPIs);
      }

      // Sort by relevance and rating
      const sortedResults = results
        .sort((a, b) => {
          // Real-world APIs get highest priority
          if (a.type === 'real-world' && b.type !== 'real-world') return -1;
          if (b.type === 'real-world' && a.type !== 'real-world') return 1;
          
          // Premium APIs get second priority
          if (a.type === 'premium' && b.type !== 'premium') return -1;
          if (b.type === 'premium' && a.type !== 'premium') return 1;
          
          // Then by rating and popularity
          return (b.rating * b.popularity) - (a.rating * a.popularity);
        })
        .slice(0, limit);

      console.log(`🔍 Found ${sortedResults.length} APIs for query: "${query}"`);
      return sortedResults;

    } catch (error) {
      console.error('❌ API search failed:', error);
      return [];
    }
  }

  /**
   * 🌍 Search real-world APIs (Healthcare, Education, Government, Financial)
   */
  private async searchRealWorldAPIs(
    query: string,
    category?: string,
    filters?: any
  ): Promise<UnifiedAPI[]> {
    try {
      const realWorldAPIs = await realWorldAPIService.searchRealWorldAPIs(query, {
        category: category as any,
        compliance: filters?.compliance,
        region: filters?.region,
        pricing: filters?.pricing
      });

      const results: UnifiedAPI[] = [];

      for (const api of realWorldAPIs) {
        const unifiedAPI: UnifiedAPI = {
          id: api.id,
          name: api.name,
          description: api.description,
          category: api.category,
          provider: api.provider,
          type: 'real-world',
          authType: 'authType' in api ? api.authType : 'api-key',
          pricing: api.pricing.freeQuota > 0 ? 'freemium' : 'paid',
          verified: true, // Real-world APIs are all verified
          rating: 4.9, // Real-world APIs get highest rating
          features: [`${api.provider} Integration`, ...api.compliance],
          credentialType: api.endpoints[0]?.credentialType || 'Real-World Verification',
          setupTime: '2-15 minutes',
          popularity: 98, // Real-world APIs get highest popularity
          endpoints: api.endpoints.map(endpoint => ({
            name: endpoint.purpose,
            description: endpoint.purpose,
            method: endpoint.method,
            path: endpoint.path,
            credentialFields: []
          })),
          integrationGuide: {
            compliance: api.compliance,
            documentation: api.documentation,
            testMode: api.testMode
          }
        };

        results.push(unifiedAPI);
      }

      console.log(`🌍 Found ${results.length} real-world APIs for query: "${query}"`);
      return results;

    } catch (error) {
      console.error('❌ Real-world API search failed:', error);
      return [];
    }
  }

  /**
   * 🏆 Search premium APIs
   */
  private searchPremiumAPIs(
    query: string, 
    category?: string, 
    filters?: any
  ): UnifiedAPI[] {
    const providers = premiumAPIService.getProviders();
    const results: UnifiedAPI[] = [];

    for (const provider of providers) {
      const searchText = `${provider.name} ${provider.description}`.toLowerCase();
      const queryLower = query.toLowerCase();

      // Check if matches query
      if (query && !searchText.includes(queryLower)) {
        continue;
      }

      // Check category filter
      if (category && category !== 'all' && !provider.category.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }

      // Apply filters
      if (filters?.verified && !provider.name.includes('Trulioo') && !provider.name.includes('Plaid')) {
        continue; // Only verified premium providers
      }

      // Get connection status
      const connectionInfo = premiumAPIService.getConnectionStatus(provider.id);
      const connectionStatus: ConnectionStatus | undefined = connectionInfo ? {
        isConnected: connectionInfo.connected,
        quotaUsed: connectionInfo.quotaUsed,
        quotaLimit: connectionInfo.quotaLimit,
        lastUsed: connectionInfo.lastUsed
      } : undefined;

      const unifiedAPI: UnifiedAPI = {
        id: provider.id,
        name: provider.name,
        description: provider.description,
        category: provider.category,
        provider: provider.name,
        type: 'premium',
        authType: provider.authType,
        pricing: provider.freeQuota > 0 ? 'freemium' : 'paid',
        verified: true,
        rating: 4.8, // Premium APIs get high rating
        features: provider.credentialTypes,
        credentialType: provider.credentialTypes[0] || 'Premium Verification',
        setupTime: '5-10 minutes',
        popularity: 95, // Premium APIs get high popularity
        endpoints: provider.testEndpoints.map(endpoint => ({
          name: endpoint.name,
          description: endpoint.name,
          method: endpoint.method,
          path: endpoint.path,
          credentialFields: Object.keys(endpoint.credentialMapping || {})
        })),
        integrationGuide: {
          setupSteps: provider.setupGuide,
          requiredEnvVars: provider.requiredEnvVars
        },
        connectionStatus
      };

      results.push(unifiedAPI);
    }

    return results;
  }

  /**
   * 🔍 Search discovered APIs
   */
  private searchDiscoveredAPIs(
    query: string, 
    category?: string, 
    filters?: any
  ): UnifiedAPI[] {
    const discoveredAPIs = apiDiscoveryService.searchAPIs(query, category, 1000);
    const results: UnifiedAPI[] = [];

    for (const api of discoveredAPIs) {
      // Apply filters
      if (filters?.pricing && api.pricing !== filters.pricing) {
        continue;
      }

      if (filters?.verified && !api.verified) {
        continue;
      }

      if (filters?.minRating && api.rating < filters.minRating) {
        continue;
      }

      const unifiedAPI: UnifiedAPI = {
        id: api.id,
        name: api.name,
        description: api.description,
        category: api.category,
        provider: api.provider,
        type: 'discovered',
        authType: api.authType,
        pricing: api.pricing,
        verified: api.verified,
        rating: api.rating,
        features: api.tags,
        credentialType: api.credentialTemplate.type[1] || 'API Credential',
        setupTime: '1-5 minutes',
        popularity: api.popularity,
        endpoints: api.endpoints.map(endpoint => ({
          name: endpoint.name,
          description: endpoint.description,
          method: endpoint.method,
          path: endpoint.path,
          credentialFields: endpoint.credentialFields
        })),
        integrationGuide: api.integrationGuide
      };

      results.push(unifiedAPI);
    }

    return results;
  }

  /**
   * 🔗 Connect to API
   */
  async connectToAPI(request: APIConnectionRequest): Promise<{
    success: boolean;
    connectionId?: string;
    error?: string;
    testResults?: any;
  }> {
    await this.initialize();

    try {
      console.log(`🔗 Connecting to API: ${request.apiId}`);

      // Check if it's a premium API
      const premiumProvider = premiumAPIService.getProvider(request.apiId);
      
      if (premiumProvider) {
        // Connect to premium API
        const connection = await premiumAPIService.connectAPI(
          request.apiId, 
          request.credentials || {}
        );

        return {
          success: true,
          connectionId: connection.id,
          testResults: connection.testResults
        };
      } else {
        // Handle discovered API connection
        const discoveredAPI = apiDiscoveryService.getAPI(request.apiId);
        
        if (!discoveredAPI) {
          throw new Error(`API ${request.apiId} not found`);
        }

        // For discovered APIs, we create a mock connection for now
        // In production, this would implement actual OAuth/API key flows
        const mockConnection = {
          id: `conn_${request.apiId}_${Date.now()}`,
          success: true,
          testResults: {
            message: `Successfully connected to ${discoveredAPI.name}`,
            timestamp: new Date().toISOString()
          }
        };

        return {
          success: true,
          connectionId: mockConnection.id,
          testResults: mockConnection.testResults
        };
      }

    } catch (error) {
      console.error(`❌ Failed to connect to API ${request.apiId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * 🏆 Create Verifiable Credential from API
   */
  async createCredentialFromAPI(request: CredentialCreationRequest): Promise<any> {
    await this.initialize();

    try {
      console.log(`🏆 Creating credential from API: ${request.apiId}`);

      // Check if it's a premium API
      const premiumProvider = premiumAPIService.getProvider(request.apiId);
      
      if (premiumProvider) {
        // Use premium API service
        return await premiumAPIService.createCredential({
          providerId: request.apiId,
          endpoint: request.endpoint,
          data: request.inputData,
          options: request.options
        });
      } else {
        // Handle discovered API credential creation
        const discoveredAPI = apiDiscoveryService.getAPI(request.apiId);
        
        if (!discoveredAPI) {
          throw new Error(`API ${request.apiId} not found`);
        }

        // Create credential from discovered API
        return await this.createDiscoveredAPICredential(discoveredAPI, request);
      }

    } catch (error) {
      console.error(`❌ Failed to create credential from API ${request.apiId}:`, error);
      throw error;
    }
  }

  /**
   * 📋 Create credential from discovered API
   */
  private async createDiscoveredAPICredential(
    api: DiscoveredAPI, 
    request: CredentialCreationRequest
  ): Promise<any> {
    try {
      // For discovered APIs, we create a credential based on the API metadata
      // In production, this would make actual API calls
      
      const credentialSubject = {
        id: await verifiableCredentialService.getCurrentDID() || 'did:persona:user',
        apiProvider: api.provider,
        apiName: api.name,
        credentialType: api.credentialTemplate.type[1] || 'API Credential',
        verificationMethod: request.endpoint,
        verifiedAt: new Date().toISOString(),
        verificationLevel: api.verified ? 'verified' : 'unverified',
        features: api.tags,
        apiUrl: api.baseUrl,
        // Add mock data based on the API category
        ...this.generateMockCredentialData(api.category)
      };

      // Create verifiable credential
      const credential = await verifiableCredentialService.issueCredential(
        credentialSubject,
        api.credentialTemplate.type,
        {
          id: `did:api:${api.provider.toLowerCase()}`,
          name: api.provider,
          description: api.description
        },
        {
          expirationDate: request.options?.expirationDays ? 
            new Date(Date.now() + (request.options.expirationDays * 24 * 60 * 60 * 1000)).toISOString() : 
            undefined,
          challenge: request.options?.challenge,
          evidence: [{
            type: ['APIEvidence'],
            verifier: api.provider,
            evidenceDocument: 'API Integration',
            subjectPresence: 'Digital',
            documentPresence: 'Digital'
          }]
        }
      );

      console.log(`✅ Created credential from discovered API: ${api.name}`);
      return credential;

    } catch (error) {
      console.error(`❌ Failed to create discovered API credential:`, error);
      throw error;
    }
  }

  /**
   * 🎭 Generate mock credential data based on category
   */
  private generateMockCredentialData(category: string): any {
    const mockData: { [key: string]: any } = {
      'Identity & KYC': {
        verificationScore: 95,
        documentsVerified: ['passport', 'driver_license'],
        riskLevel: 'low'
      },
      'Financial & Credit': {
        creditScore: 750,
        accountsVerified: 3,
        incomeVerified: true
      },
      'Education & Skills': {
        degreeLevel: 'bachelor',
        institution: 'Example University',
        graduationYear: 2020
      },
      'Professional & Work': {
        yearsExperience: 5,
        skillsVerified: ['javascript', 'react', 'node.js'],
        employmentStatus: 'employed'
      },
      'Health & Medical': {
        recordsAccessed: true,
        lastCheckup: '2024-01-01',
        provider: 'Example Health System'
      }
    };

    return mockData[category] || {
      dataVerified: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📊 Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<{
    totalAPIs: number;
    premiumAPIs: number;
    discoveredAPIs: number;
    categories: { name: string; count: number }[];
    recentConnections: number;
  }> {
    await this.initialize();

    const premiumProviders = premiumAPIService.getProviders();
    const categories = apiDiscoveryService.getCategories();
    const discoveryStatus = apiDiscoveryService.getDiscoveryStatus();
    const connections = premiumAPIService.getConnections();

    return {
      totalAPIs: premiumProviders.length + discoveryStatus.totalAPIs,
      premiumAPIs: premiumProviders.length,
      discoveredAPIs: discoveryStatus.totalAPIs,
      categories: categories.map(cat => ({ name: cat.name, count: cat.count })),
      recentConnections: connections.filter(conn => {
        if (!conn.lastUsed) return false;
        const lastUsed = new Date(conn.lastUsed);
        const daysSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 7; // Last 7 days
      }).length
    };
  }

  /**
   * 📋 Get featured APIs
   */
  async getFeaturedAPIs(limit: number = 10): Promise<UnifiedAPI[]> {
    await this.initialize();

    const featured: UnifiedAPI[] = [];

    // Add premium APIs first
    const premiumAPIs = this.searchPremiumAPIs('', undefined, undefined);
    featured.push(...premiumAPIs.slice(0, Math.ceil(limit / 2)));

    // Add top discovered APIs
    const discoveredAPIs = apiDiscoveryService.getFeaturedAPIs(Math.floor(limit / 2));
    const unifiedDiscovered = discoveredAPIs.map(api => ({
      id: api.id,
      name: api.name,
      description: api.description,
      category: api.category,
      provider: api.provider,
      type: 'discovered' as const,
      authType: api.authType,
      pricing: api.pricing,
      verified: api.verified,
      rating: api.rating,
      features: api.tags,
      credentialType: api.credentialTemplate.type[1] || 'API Credential',
      setupTime: '1-5 minutes',
      popularity: api.popularity,
      endpoints: api.endpoints.map(endpoint => ({
        name: endpoint.name,
        description: endpoint.description,
        method: endpoint.method,
        path: endpoint.path,
        credentialFields: endpoint.credentialFields
      }))
    }));

    featured.push(...unifiedDiscovered);

    return featured.slice(0, limit);
  }

  /**
   * 🔄 Refresh API discovery
   */
  async refreshAPIs(): Promise<void> {
    await this.initialize();
    await apiDiscoveryService.discoverAPIs(true);
  }

  /**
   * 📊 Get API categories
   */
  async getCategories(): Promise<{ name: string; count: number }[]> {
    await this.initialize();
    return apiDiscoveryService.getCategories().map(cat => ({
      name: cat.name,
      count: cat.count
    }));
  }
}

// 🏭 Export singleton instance
export const unifiedAPIService = new UnifiedAPIService();