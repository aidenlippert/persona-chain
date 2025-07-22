/**
 * 🔍 SMART API DISCOVERY ENGINE
 * Auto-discovers 1000+ APIs from multiple sources
 * Generates UI and credentials automatically
 * Zero manual work for API additions
 */

// Import removed to fix unused import error

// 🎯 API DISCOVERY SOURCES
interface APISource {
  id: string;
  name: string;
  url: string;
  parser: (data: any) => Promise<DiscoveredAPI[]>;
  enabled: boolean;
  lastSync?: string;
}

// 📋 DISCOVERED API STRUCTURE
export interface DiscoveredAPI {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  baseUrl: string;
  authType: 'none' | 'api-key' | 'oauth2' | 'bearer' | 'basic';
  authFields?: string[];
  pricing: 'free' | 'freemium' | 'paid';
  freeQuota?: number;
  endpoints: APIEndpoint[];
  openApiSpec?: string;
  docsUrl?: string;
  termsUrl?: string;
  verified: boolean;
  rating: number;
  popularity: number;
  tags: string[];
  credentialTemplate: CredentialTemplate;
  integrationGuide: IntegrationGuide;
}

interface APIEndpoint {
  name: string;
  path: string;
  method: string;
  description: string;
  parameters: Parameter[];
  responseSchema?: any;
  credentialFields?: string[];
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
}

interface CredentialTemplate {
  type: string[];
  subjectFields: string[];
  evidenceFields: string[];
  proofRequirements: string[];
}

interface IntegrationGuide {
  setupSteps: string[];
  codeExamples: { [language: string]: string };
  testingInstructions: string[];
  troubleshooting: string[];
}

/**
 * 🔍 SMART API DISCOVERY ENGINE
 * Automatically discovers and integrates APIs from multiple sources
 */
export class APIDiscoveryService {
  private discoveredAPIs: Map<string, DiscoveredAPI> = new Map();
  private sources: APISource[] = [];
  private isDiscovering: boolean = false;

  constructor() {
    this.initializeSources();
    this.loadCachedAPIs();
  }

  /**
   * 🎯 Initialize Discovery Sources
   */
  private initializeSources(): void {
    this.sources = [
      {
        id: 'github-public-apis',
        name: 'GitHub Public APIs',
        url: 'https://raw.githubusercontent.com/public-apis/public-apis/master/README.md',
        parser: this.parseGitHubPublicAPIs.bind(this),
        enabled: true
      },
      {
        id: 'apis-guru',
        name: 'APIs.guru Directory',
        url: 'https://api.apis.guru/v2/list.json',
        parser: this.parseAPIsGuru.bind(this),
        enabled: true
      },
      {
        id: 'rapidapi-featured',
        name: 'RapidAPI Featured',
        url: 'https://rapidapi.com/search',
        parser: this.parseRapidAPIFeatured.bind(this),
        enabled: false // Requires API key
      },
      {
        id: 'postman-public',
        name: 'Postman Public APIs',
        url: 'https://www.postman.com/explore/apis',
        parser: this.parsePostmanPublic.bind(this),
        enabled: false // Requires scraping
      }
    ];

    console.log('🎯 Initialized API discovery sources:', this.sources.length);
  }

  /**
   * 🚀 Discover APIs from All Sources
   */
  async discoverAPIs(forceRefresh: boolean = false): Promise<DiscoveredAPI[]> {
    if (this.isDiscovering) {
      console.log('🔄 Discovery already in progress...');
      return Array.from(this.discoveredAPIs.values());
    }

    this.isDiscovering = true;

    try {
      console.log('🔍 Starting API discovery from all sources...');

      const discoveryPromises = this.sources
        .filter(source => source.enabled)
        .map(source => this.discoverFromSource(source, forceRefresh));

      const results = await Promise.allSettled(discoveryPromises);
      
      let totalDiscovered = 0;
      results.forEach((result, index) => {
        const source = this.sources.filter(s => s.enabled)[index];
        if (result.status === 'fulfilled') {
          totalDiscovered += result.value.length;
          console.log(`✅ ${source.name}: ${result.value.length} APIs discovered`);
        } else {
          console.error(`❌ ${source.name}: Discovery failed:`, result.reason);
        }
      });

      console.log(`🎉 Total APIs discovered: ${totalDiscovered}`);
      
      // Cache discovered APIs
      await this.cacheDiscoveredAPIs();
      
      return Array.from(this.discoveredAPIs.values());

    } catch (error) {
      console.error('❌ API discovery failed:', error);
      throw error;
    } finally {
      this.isDiscovering = false;
    }
  }

  /**
   * 🔍 Discover from Single Source
   */
  private async discoverFromSource(source: APISource, forceRefresh: boolean): Promise<DiscoveredAPI[]> {
    try {
      // Check cache first
      if (!forceRefresh && source.lastSync) {
        const lastSync = new Date(source.lastSync);
        const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSync < 24) { // Cache for 24 hours
          console.log(`📦 Using cached data for ${source.name}`);
          return [];
        }
      }

      console.log(`🔍 Discovering from ${source.name}...`);
      
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'PersonaChain-API-Discovery/1.0',
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();
      const discoveredAPIs = await source.parser(data);

      // Add to discovered APIs map
      discoveredAPIs.forEach(api => {
        api.id = `${source.id}_${api.id}`;
        this.discoveredAPIs.set(api.id, api);
      });

      // Update last sync
      source.lastSync = new Date().toISOString();

      return discoveredAPIs;

    } catch (error) {
      console.error(`❌ Failed to discover from ${source.name}:`, error);
      return [];
    }
  }

  /**
   * 📋 Parse GitHub Public APIs Repository
   */
  private async parseGitHubPublicAPIs(readmeContent: string): Promise<DiscoveredAPI[]> {
    const apis: DiscoveredAPI[] = [];
    
    try {
      // Parse the README.md table format
      const lines = readmeContent.split('\n');
      let currentCategory = '';
      let inTable = false;
      
      for (const line of lines) {
        // Detect category headers
        if (line.startsWith('### ')) {
          currentCategory = line.replace('### ', '').trim();
          continue;
        }
        
        // Detect table start
        if (line.includes('| API |') || line.includes('|---|')) {
          inTable = line.includes('| API |');
          continue;
        }
        
        // Parse table rows
        if (inTable && line.startsWith('|') && line.includes('|')) {
          const columns = line.split('|').map(col => col.trim()).filter(col => col);
          
          if (columns.length >= 4) {
            const [name, description, auth] = columns;
            
            // Clean up markdown links
            const cleanName = name.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            const urlMatch = name.match(/\[([^\]]+)\]\(([^)]+)\)/);
            const baseUrl = urlMatch ? urlMatch[2] : '';
            
            if (cleanName && description && baseUrl) {
              const api: DiscoveredAPI = {
                id: this.generateAPIId(cleanName, baseUrl),
                name: cleanName,
                description: description,
                category: this.categorizeAPI(currentCategory, cleanName, description),
                provider: this.extractProvider(baseUrl),
                baseUrl: baseUrl,
                authType: this.parseAuthType(auth),
                pricing: 'free', // GitHub public-apis are typically free
                endpoints: await this.generateEndpointsFromDescription(description),
                verified: false,
                rating: 4.0, // Default rating for public APIs
                popularity: this.calculatePopularity(cleanName, description),
                tags: this.generateTags(cleanName, description, currentCategory),
                credentialTemplate: this.generateCredentialTemplate(cleanName, description),
                integrationGuide: this.generateIntegrationGuide(cleanName, baseUrl, auth)
              };
              
              apis.push(api);
            }
          }
        }
        
        // Stop table parsing on empty line
        if (inTable && line.trim() === '') {
          inTable = false;
        }
      }
      
      console.log(`📋 Parsed ${apis.length} APIs from GitHub public-apis`);
      return apis;
      
    } catch (error) {
      console.error('❌ Failed to parse GitHub public APIs:', error);
      return [];
    }
  }

  /**
   * 🌐 Parse APIs.guru Directory
   */
  private async parseAPIsGuru(jsonData: string): Promise<DiscoveredAPI[]> {
    const apis: DiscoveredAPI[] = [];
    
    // 🚨 FILTER: APIs we want to EXCLUDE (useless/irrelevant for identity)
    const excludedAPIs = [
      'linkedin', 'aws', 'amazon', 'facebook', 'twitter', 'instagram', 'tiktok',
      'youtube', 'netflix', 'spotify', 'gaming', 'entertainment', 'social',
      'weather', 'news', 'sports', 'recipe', 'movie', 'music', 'video',
      'jokes', 'memes', 'fun', 'cat', 'dog', 'pet', 'anime', 'comic',
      'wikipedia', 'dictionary', 'translator', 'language'
    ];

    // 🎯 FILTER: APIs we want to INCLUDE (relevant for identity/professional)
    const relevantKeywords = [
      'identity', 'verification', 'kyc', 'auth', 'credential', 'certificate',
      'financial', 'banking', 'payment', 'money', 'tax', 'invoice', 
      'education', 'university', 'degree', 'learning', 'course', 'skill',
      'health', 'medical', 'doctor', 'patient', 'insurance', 'pharmacy',
      'government', 'public', 'legal', 'law', 'document', 'record',
      'employment', 'job', 'career', 'professional', 'work', 'business',
      'security', 'crypto', 'blockchain', 'compliance', 'audit'
    ];
    
    try {
      const data = JSON.parse(jsonData);
      let totalProcessed = 0;
      let filteredOut = 0;
      
      for (const [apiKey, apiInfo] of Object.entries(data)) {
        totalProcessed++;
        const info = apiInfo as any;
        const versions = info.versions || {};
        const latestVersion = Object.keys(versions).pop();
        const versionInfo = latestVersion ? versions[latestVersion] || {} : {};
        
        const fullText = `${apiKey} ${info.title || ''} ${info.description || ''}`.toLowerCase();
        
        // Skip if contains excluded keywords
        const isExcluded = excludedAPIs.some(excluded => fullText.includes(excluded));
        if (isExcluded) {
          filteredOut++;
          continue;
        }
        
        // Only include if contains relevant keywords OR has high potential
        const isRelevant = relevantKeywords.some(keyword => fullText.includes(keyword)) ||
                          fullText.includes('verify') || fullText.includes('authenticate') ||
                          fullText.includes('credential') || fullText.includes('certificate');
        
        if (!isRelevant) {
          filteredOut++;
          continue;
        }
        
        const api: DiscoveredAPI = {
          id: this.generateAPIId(apiKey, versionInfo.swaggerUrl || ''),
          name: info.title || apiKey,
          description: info.description || `${apiKey} API service`,
          category: this.categorizeAPI('', apiKey, info.description || ''),
          provider: this.extractProvider(versionInfo.swaggerUrl || ''),
          baseUrl: versionInfo.swaggerUrl || '',
          authType: 'api-key', // Most APIs.guru entries use API keys
          pricing: 'freemium',
          endpoints: [], // Will be populated from OpenAPI spec
          openApiSpec: versionInfo.swaggerUrl,
          verified: true, // APIs.guru entries are verified
          rating: 4.2,
          popularity: this.calculatePopularity(apiKey, info.description || ''),
          tags: this.generateTags(apiKey, info.description || '', ''),
          credentialTemplate: this.generateCredentialTemplate(apiKey, info.description || ''),
          integrationGuide: this.generateIntegrationGuide(apiKey, versionInfo.swaggerUrl || '', 'API Key')
        };
        
        apis.push(api);
      }
      
      console.log(`🌐 Parsed ${apis.length} relevant APIs from APIs.guru (filtered ${filteredOut} out of ${totalProcessed})`);
      return apis;
      
    } catch (error) {
      console.error('❌ Failed to parse APIs.guru:', error);
      return [];
    }
  }

  /**
   * ⚡ Parse RapidAPI Featured (Placeholder)
   */
  private async parseRapidAPIFeatured(_data: string): Promise<DiscoveredAPI[]> {
    // TODO: Implement RapidAPI scraping/API integration
    console.log('⚡ RapidAPI parsing not implemented yet');
    return [];
  }

  /**
   * 📮 Parse Postman Public APIs (Placeholder)
   */
  private async parsePostmanPublic(_data: string): Promise<DiscoveredAPI[]> {
    // TODO: Implement Postman API Network integration
    console.log('📮 Postman parsing not implemented yet');
    return [];
  }

  // 🧠 SMART CATEGORIZATION AND ANALYSIS

  /**
   * 🏷️ Categorize API intelligently
   */
  private categorizeAPI(sourceCategory: string, name: string, description: string): string {
    const text = `${sourceCategory} ${name} ${description}`.toLowerCase();
    
    const categories = {
      'Identity & KYC': ['identity', 'verification', 'kyc', 'passport', 'license', 'background'],
      'Financial & Credit': ['financial', 'banking', 'credit', 'payment', 'money', 'currency', 'invoice'],
      'Education & Skills': ['education', 'university', 'degree', 'certificate', 'learning', 'course'],
      'Professional & Work': ['job', 'career', 'employment', 'linkedin', 'resume', 'professional'],
      'Health & Medical': ['health', 'medical', 'hospital', 'doctor', 'patient', 'drug'],
      'Social & Digital': ['social', 'twitter', 'facebook', 'instagram', 'github', 'reddit'],
      'Government & Public': ['government', 'public', 'city', 'state', 'federal', 'tax'],
      'Business & Analytics': ['business', 'analytics', 'metrics', 'data', 'crm', 'sales'],
      'Communication': ['email', 'sms', 'messaging', 'notification', 'chat', 'voice'],
      'Media & Content': ['image', 'video', 'audio', 'photo', 'media', 'content'],
      'Location & Maps': ['location', 'maps', 'geography', 'coordinates', 'address'],
      'Weather & Environment': ['weather', 'climate', 'environment', 'air', 'pollution'],
      'Transportation': ['transport', 'travel', 'flight', 'shipping', 'logistics'],
      'Entertainment': ['game', 'movie', 'music', 'entertainment', 'sport', 'news'],
      'Developer Tools': ['developer', 'code', 'programming', 'api', 'tool', 'utility']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    
    return sourceCategory || 'Other';
  }

  /**
   * 🔐 Parse authentication type
   */
  private parseAuthType(authString: string): 'none' | 'api-key' | 'oauth2' | 'bearer' | 'basic' {
    if (!authString) return 'none';
    
    const auth = authString.toLowerCase();
    if (auth.includes('oauth')) return 'oauth2';
    if (auth.includes('api') || auth.includes('key')) return 'api-key';
    if (auth.includes('bearer') || auth.includes('token')) return 'bearer';
    if (auth.includes('basic')) return 'basic';
    if (auth.includes('no') || auth === 'none') return 'none';
    
    return 'api-key'; // Default assumption
  }

  /**
   * 📊 Calculate popularity score based on identity/professional relevance
   */
  private calculatePopularity(name: string, description: string): number {
    const text = `${name} ${description}`.toLowerCase();
    
    // Focus on identity/professional services, not consumer social media
    const popularityKeywords = {
      'stripe': 95,     // Payment processing
      'plaid': 90,      // Financial data
      'okta': 90,       // Identity management  
      'auth0': 85,      // Authentication
      'github': 80,     // Professional development
      'microsoft': 80,  // Enterprise services
      'google': 75,     // Business APIs only
      'paypal': 70,     // Business payments
      'healthcare': 85, // Health services
      'medical': 80,    // Medical services
      'education': 75,  // Educational verification
      'government': 80, // Government services
      'compliance': 85, // Compliance tools
      'verification': 90, // Identity verification
      'banking': 85,    // Banking services
      'insurance': 75   // Insurance services
    };
    
    for (const [keyword, score] of Object.entries(popularityKeywords)) {
      if (text.includes(keyword)) {
        return score;
      }
    }
    
    // Base score calculation for professional relevance
    let score = 30; // Lower base score
    
    // Boost for professional keywords
    if (text.includes('business') || text.includes('enterprise') || text.includes('professional')) {
      score += 20;
    }
    
    // Boost for identity-related keywords
    if (text.includes('identity') || text.includes('auth') || text.includes('verify')) {
      score += 25;
    }
    
    // Boost for good documentation
    const hasDocumentation = description.length > 50 ? 10 : 0;
    score += hasDocumentation;
    
    return Math.min(score, 95);
  }

  /**
   * 🏷️ Generate tags
   */
  private generateTags(name: string, description: string, category: string): string[] {
    const text = `${name} ${description} ${category}`.toLowerCase();
    const tags = new Set<string>();
    
    // Extract meaningful words
    const words = text.match(/\b\w{3,}\b/g) || [];
    words.forEach(word => {
      if (word.length > 3 && !['api', 'the', 'and', 'for', 'with'].includes(word)) {
        tags.add(word);
      }
    });
    
    return Array.from(tags).slice(0, 8); // Limit to 8 tags
  }

  /**
   * 📋 Generate credential template
   */
  private generateCredentialTemplate(name: string, description: string): CredentialTemplate {
    const category = this.categorizeAPI('', name, description);
    
    const templates = {
      'Identity & KYC': {
        type: ['VerifiableCredential', 'IdentityCredential'],
        subjectFields: ['fullName', 'dateOfBirth', 'nationalId', 'verificationLevel'],
        evidenceFields: ['documentType', 'documentNumber', 'issuingAuthority'],
        proofRequirements: ['documentVerification', 'biometricMatch']
      },
      'Financial & Credit': {
        type: ['VerifiableCredential', 'FinancialCredential'],
        subjectFields: ['accountHolder', 'institutionName', 'accountType', 'verificationDate'],
        evidenceFields: ['bankStatement', 'accountBalance', 'creditScore'],
        proofRequirements: ['bankVerification', 'incomeVerification']
      },
      'Education & Skills': {
        type: ['VerifiableCredential', 'EducationalCredential'],
        subjectFields: ['studentName', 'institution', 'degree', 'graduationDate'],
        evidenceFields: ['transcript', 'diploma', 'accreditation'],
        proofRequirements: ['institutionVerification', 'degreeValidation']
      }
    };
    
    return (templates as any)[category] || {
      type: ['VerifiableCredential', 'APICredential'],
      subjectFields: ['apiProvider', 'serviceType', 'verificationDate'],
      evidenceFields: ['apiResponse', 'dataSource'],
      proofRequirements: ['apiAuthentication', 'dataValidation']
    };
  }

  /**
   * 📖 Generate integration guide
   */
  private generateIntegrationGuide(name: string, baseUrl: string, auth: string): IntegrationGuide {
    const authType = this.parseAuthType(auth);
    
    return {
      setupSteps: [
        `Sign up for ${name} API access`,
        authType === 'api-key' ? 'Get your API key from the dashboard' : 'Configure OAuth2 authentication',
        'Test the connection in PersonaChain',
        'Generate your first verifiable credential'
      ],
      codeExamples: {
        javascript: this.generateJavaScriptExample(name, baseUrl, authType),
        python: this.generatePythonExample(name, baseUrl, authType),
        curl: this.generateCurlExample(baseUrl, authType)
      },
      testingInstructions: [
        'Use the built-in API tester',
        'Verify response format',
        'Check credential generation',
        'Test with sample data'
      ],
      troubleshooting: [
        'Check API key validity',
        'Verify endpoint URL',
        'Review rate limits',
        'Contact support if needed'
      ]
    };
  }

  // 🔧 UTILITY METHODS

  private generateAPIId(name: string, url: string): string {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const urlHash = url ? url.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || '' : '';
    return `${cleanName}_${urlHash}`.substring(0, 50);
  }

  private extractProvider(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '').replace('api.', '').split('.')[0];
    } catch {
      return 'Unknown Provider';
    }
  }

  private async generateEndpointsFromDescription(description: string): Promise<APIEndpoint[]> {
    // Simple endpoint generation based on description keywords
    const endpoints: APIEndpoint[] = [];
    
    if (description.toLowerCase().includes('search')) {
      endpoints.push({
        name: 'Search',
        path: '/search',
        method: 'GET',
        description: 'Search the API database',
        parameters: [
          { name: 'q', type: 'string', required: true, description: 'Search query' },
          { name: 'limit', type: 'number', required: false, description: 'Results limit' }
        ],
        credentialFields: ['searchResults', 'timestamp']
      });
    }
    
    if (description.toLowerCase().includes('verify') || description.toLowerCase().includes('validation')) {
      endpoints.push({
        name: 'Verify',
        path: '/verify',
        method: 'POST',
        description: 'Verify information',
        parameters: [
          { name: 'data', type: 'object', required: true, description: 'Data to verify' }
        ],
        credentialFields: ['verificationResult', 'confidence', 'timestamp']
      });
    }
    
    return endpoints;
  }

  private generateJavaScriptExample(name: string, baseUrl: string, authType: string): string {
    const authHeader = authType === 'api-key' ? 
      `'X-API-Key': 'your-api-key'` : 
      `'Authorization': 'Bearer your-token'`;
    
    return `
// ${name} Integration
const response = await fetch('${baseUrl}/endpoint', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    ${authHeader}
  }
});

const data = await response.json();
const credential = await personaChain.createCredential(data);
    `.trim();
  }

  private generatePythonExample(name: string, baseUrl: string, authType: string): string {
    const authHeader = authType === 'api-key' ? 
      `'X-API-Key': 'your-api-key'` : 
      `'Authorization': 'Bearer your-token'`;
    
    return `
# ${name} Integration
import requests

headers = {
    'Content-Type': 'application/json',
    ${authHeader}
}

response = requests.get('${baseUrl}/endpoint', headers=headers)
data = response.json()
credential = persona_chain.create_credential(data)
    `.trim();
  }

  private generateCurlExample(baseUrl: string, authType: string): string {
    const authHeader = authType === 'api-key' ? 
      `-H "X-API-Key: your-api-key"` : 
      `-H "Authorization: Bearer your-token"`;
    
    return `
curl -X GET "${baseUrl}/endpoint" \\
  -H "Content-Type: application/json" \\
  ${authHeader}
    `.trim();
  }

  /**
   * 💾 Cache discovered APIs with size limits
   */
  private async cacheDiscoveredAPIs(): Promise<void> {
    try {
      // 🚨 PRODUCTION FIX: Implement cache size limits to prevent quota exceeded errors
      const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB limit
      const MAX_APIS_TO_CACHE = 100; // Maximum number of APIs to cache
      
      // Limit the number of APIs we cache
      const apisToCache = Array.from(this.discoveredAPIs.values()).slice(0, MAX_APIS_TO_CACHE);
      
      const cacheData = {
        apis: apisToCache,
        lastUpdate: new Date().toISOString(),
        sources: this.sources.map(s => ({ id: s.id, lastSync: s.lastSync })),
        cacheInfo: {
          totalDiscovered: this.discoveredAPIs.size,
          cached: apisToCache.length,
          cacheVersion: '2.0'
        }
      };
      
      const cacheString = JSON.stringify(cacheData);
      
      // Check cache size before storing
      if (cacheString.length > MAX_CACHE_SIZE) {
        console.warn('⚠️ Cache size too large, reducing API count');
        
        // Reduce to 50 APIs if still too large
        cacheData.apis = apisToCache.slice(0, 50);
        cacheData.cacheInfo.cached = 50;
        
        const reducedCacheString = JSON.stringify(cacheData);
        
        if (reducedCacheString.length > MAX_CACHE_SIZE) {
          console.error('❌ Cache still too large after reduction, clearing old cache');
          localStorage.removeItem('persona_discovered_apis');
          return;
        }
        
        localStorage.setItem('persona_discovered_apis', reducedCacheString);
      } else {
        localStorage.setItem('persona_discovered_apis', cacheString);
      }
      
      console.log('💾 Cached discovered APIs:', {
        total: this.discoveredAPIs.size,
        cached: cacheData.cacheInfo.cached,
        size: `${(cacheString.length / 1024).toFixed(1)}KB`
      });
      
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, clearing API cache');
        try {
          localStorage.removeItem('persona_discovered_apis');
        } catch (clearError) {
          console.error('❌ Failed to clear API cache:', clearError);
        }
      } else {
        console.error('❌ Failed to cache APIs:', error);
      }
    }
  }

  /**
   * 📦 Load cached APIs
   */
  private loadCachedAPIs(): void {
    try {
      const cached = localStorage.getItem('persona_discovered_apis');
      if (cached) {
        const cacheData = JSON.parse(cached);
        
        // Check if cache is less than 24 hours old
        const lastUpdate = new Date(cacheData.lastUpdate);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          cacheData.apis.forEach((api: DiscoveredAPI) => {
            this.discoveredAPIs.set(api.id, api);
          });
          
          console.log('📦 Loaded cached APIs:', this.discoveredAPIs.size);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load cached APIs:', error);
    }
  }

  // 🔍 PUBLIC API METHODS

  /**
   * 🔍 Search discovered APIs
   */
  searchAPIs(query: string, category?: string, limit: number = 50): DiscoveredAPI[] {
    const searchTerms = query.toLowerCase().split(' ');
    const results: { api: DiscoveredAPI; score: number }[] = [];
    
    for (const api of this.discoveredAPIs.values()) {
      let score = 0;
      const searchText = `${api.name} ${api.description} ${api.tags.join(' ')}`.toLowerCase();
      
      // Category filter
      if (category && category !== 'all' && !api.category.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }
      
      // Score based on search terms
      for (const term of searchTerms) {
        if (api.name.toLowerCase().includes(term)) score += 10;
        if (api.description.toLowerCase().includes(term)) score += 5;
        if (api.tags.some(tag => tag.includes(term))) score += 3;
        if (searchText.includes(term)) score += 1;
      }
      
      if (score > 0) {
        results.push({ api, score });
      }
    }
    
    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.api);
  }

  /**
   * 📊 Get API categories with counts
   */
  getCategories(): { name: string; count: number; apis: string[] }[] {
    const categories = new Map<string, string[]>();
    
    for (const api of this.discoveredAPIs.values()) {
      if (!categories.has(api.category)) {
        categories.set(api.category, []);
      }
      categories.get(api.category)!.push(api.id);
    }
    
    return Array.from(categories.entries())
      .map(([name, apis]) => ({ name, count: apis.length, apis }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 🔄 Get discovery status
   */
  getDiscoveryStatus(): {
    isDiscovering: boolean;
    totalAPIs: number;
    sources: { name: string; enabled: boolean; lastSync?: string }[];
  } {
    return {
      isDiscovering: this.isDiscovering,
      totalAPIs: this.discoveredAPIs.size,
      sources: this.sources.map(s => ({
        name: s.name,
        enabled: s.enabled,
        lastSync: s.lastSync
      }))
    };
  }

  /**
   * 🎯 Get API by ID
   */
  getAPI(id: string): DiscoveredAPI | undefined {
    return this.discoveredAPIs.get(id);
  }

  /**
   * ⭐ Get featured APIs
   */
  getFeaturedAPIs(limit: number = 10): DiscoveredAPI[] {
    return Array.from(this.discoveredAPIs.values())
      .filter(api => api.verified && api.rating > 4.0)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }
}

// 🏭 Export singleton instance
export const apiDiscoveryService = new APIDiscoveryService();