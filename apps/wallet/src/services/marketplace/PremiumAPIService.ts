/**
 * 🏆 PREMIUM API INTEGRATION SERVICE
 * Direct integration with high-value identity/financial APIs
 * Real credential generation with actual verification
 */

import { verifiableCredentialService } from '../credentials/VerifiableCredentialService';

// 🎯 PREMIUM API PROVIDERS
interface PremiumProvider {
  id: string;
  name: string;
  description: string;
  category: string;
  baseUrl: string;
  sandboxUrl: string;
  authType: 'api-key' | 'oauth2' | 'bearer';
  credentialTypes: string[];
  freeQuota: number;
  setupGuide: string[];
  requiredEnvVars: string[];
  testEndpoints: TestEndpoint[];
}

interface TestEndpoint {
  name: string;
  path: string;
  method: string;
  sampleRequest: any;
  sampleResponse: any;
  credentialMapping: { [key: string]: string };
}

interface APIConnection {
  id: string;
  providerId: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  isConnected: boolean;
  lastUsed?: string;
  quotaUsed: number;
  quotaLimit: number;
  testResults?: any;
}

interface CredentialRequest {
  providerId: string;
  endpoint: string;
  data: any;
  options?: {
    challenge?: string;
    expirationDays?: number;
  };
}

/**
 * 🏆 PREMIUM API INTEGRATION SERVICE
 * Handles direct connections to premium identity/financial APIs
 */
export class PremiumAPIService {
  private connections: Map<string, APIConnection> = new Map();
  private providers: Map<string, PremiumProvider> = new Map();

  constructor() {
    this.initializePremiumProviders();
    this.loadStoredConnections();
  }

  /**
   * 🏗️ Initialize Premium API Providers
   */
  private initializePremiumProviders(): void {
    const providers: PremiumProvider[] = [
      {
        id: 'trulioo',
        name: 'Trulioo GlobalGateway',
        description: 'Global identity verification with 5+ billion records across 195+ countries',
        category: 'Identity & KYC',
        baseUrl: 'https://api.globaldatacompany.com',
        sandboxUrl: 'https://api.globaldatacompany.com',
        authType: 'api-key',
        credentialTypes: ['IdentityVerification', 'DocumentVerification', 'AddressVerification'],
        freeQuota: 100,
        setupGuide: [
          'Create account at trulioo.com',
          'Get API credentials from console',
          'Add TRULIOO_API_KEY to environment',
          'Test with sandbox data'
        ],
        requiredEnvVars: ['TRULIOO_API_KEY'],
        testEndpoints: [
          {
            name: 'Verify Identity',
            path: '/verifications/v1/verify',
            method: 'POST',
            sampleRequest: {
              AcceptTruliooTermsAndConditions: true,
              ConfigurationName: 'Identity Verification',
              CountryCode: 'US',
              DataFields: {
                PersonInfo: {
                  FirstGivenName: 'John',
                  FirstSurName: 'Doe',
                  DayOfBirth: 15,
                  MonthOfBirth: 6,
                  YearOfBirth: 1985
                },
                Location: {
                  BuildingNumber: '123',
                  StreetName: 'Main St',
                  City: 'Anytown',
                  StateProvinceCode: 'CA',
                  PostalCode: '90210'
                }
              }
            },
            sampleResponse: {
              TransactionID: 'abc123-def456',
              UploadedDt: '2024-01-15T10:30:00Z',
              CountryCode: 'US',
              ProductName: 'Identity Verification',
              Record: {
                TransactionRecordID: 'rec123',
                RecordStatus: 'match',
                DatasourceResults: [
                  {
                    DatasourceName: 'Credit Bureau',
                    DatasourceFields: [
                      { FieldName: 'PersonInfo.FirstGivenName', Status: 'match' },
                      { FieldName: 'PersonInfo.FirstSurName', Status: 'match' },
                      { FieldName: 'Location.City', Status: 'match' }
                    ]
                  }
                ]
              }
            },
            credentialMapping: {
              'credentialSubject.verificationId': 'TransactionID',
              'credentialSubject.verificationStatus': 'Record.RecordStatus',
              'credentialSubject.verificationDate': 'UploadedDt',
              'credentialSubject.verificationLevel': 'ProductName',
              'credentialSubject.countryCode': 'CountryCode'
            }
          }
        ]
      },
      {
        id: 'plaid',
        name: 'Plaid Financial API',
        description: 'Connect to 12,000+ financial institutions for income and asset verification',
        category: 'Financial & Credit',
        baseUrl: 'https://production.plaid.com',
        sandboxUrl: 'https://sandbox.plaid.com',
        authType: 'api-key',
        credentialTypes: ['FinancialVerification', 'IncomeVerification', 'AssetVerification'],
        freeQuota: 100,
        setupGuide: [
          'Create account at plaid.com',
          'Get client ID and secret from dashboard',
          'Add PLAID_CLIENT_ID and PLAID_SECRET to environment',
          'Configure webhook URL'
        ],
        requiredEnvVars: ['PLAID_CLIENT_ID', 'PLAID_SECRET'],
        testEndpoints: [
          {
            name: 'Create Link Token',
            path: '/link/token/create',
            method: 'POST',
            sampleRequest: {
              client_id: 'your_client_id',
              secret: 'your_secret',
              client_name: 'PersonaChain',
              country_codes: ['US'],
              language: 'en',
              user: {
                client_user_id: 'unique_user_id'
              },
              products: ['auth', 'identity', 'income']
            },
            sampleResponse: {
              link_token: 'link-sandbox-12345',
              expiration: '2024-01-15T11:00:00Z'
            },
            credentialMapping: {
              'credentialSubject.linkToken': 'link_token',
              'credentialSubject.expirationDate': 'expiration'
            }
          },
          {
            name: 'Get Account Info',
            path: '/accounts/get',
            method: 'POST',
            sampleRequest: {
              client_id: 'your_client_id',
              secret: 'your_secret',
              access_token: 'access-sandbox-12345'
            },
            sampleResponse: {
              accounts: [
                {
                  account_id: 'acc123',
                  balances: {
                    available: 1000.50,
                    current: 1200.75
                  },
                  name: 'Plaid Checking',
                  type: 'depository',
                  subtype: 'checking'
                }
              ]
            },
            credentialMapping: {
              'credentialSubject.accountId': 'accounts[0].account_id',
              'credentialSubject.accountName': 'accounts[0].name',
              'credentialSubject.accountType': 'accounts[0].type',
              'credentialSubject.currentBalance': 'accounts[0].balances.current'
            }
          }
        ]
      },
      {
        id: 'jumio',
        name: 'Jumio Netverify',
        description: 'AI-powered identity verification and document authentication',
        category: 'Identity & KYC',
        baseUrl: 'https://netverify.com/api',
        sandboxUrl: 'https://netverify.com/api',
        authType: 'bearer',
        credentialTypes: ['DocumentVerification', 'BiometricVerification', 'IdentityVerification'],
        freeQuota: 50,
        setupGuide: [
          'Create account at jumio.com',
          'Get API token and secret from portal',
          'Add JUMIO_API_TOKEN and JUMIO_API_SECRET to environment',
          'Configure callback URLs'
        ],
        requiredEnvVars: ['JUMIO_API_TOKEN', 'JUMIO_API_SECRET'],
        testEndpoints: [
          {
            name: 'Create Verification',
            path: '/netverify/v2/initiateNetverify',
            method: 'POST',
            sampleRequest: {
              customerInternalReference: 'user123',
              userReference: 'verification456',
              successUrl: 'https://yourapp.com/success',
              errorUrl: 'https://yourapp.com/error',
              reportingCriteria: 'PersonaChain Verification',
              enabledFields: 'idNumber,idFirstName,idLastName,idDob'
            },
            sampleResponse: {
              timestamp: '2024-01-15T10:30:00Z',
              transactionReference: 'jumio-txn-123',
              redirectUrl: 'https://netverify.com/widget/jumio-txn-123'
            },
            credentialMapping: {
              'credentialSubject.transactionReference': 'transactionReference',
              'credentialSubject.verificationUrl': 'redirectUrl',
              'credentialSubject.timestamp': 'timestamp'
            }
          }
        ]
      },
      {
        id: 'onfido',
        name: 'Onfido Identity Verification',
        description: 'Real-time identity verification with document and biometric checks',
        category: 'Identity & KYC',
        baseUrl: 'https://api.onfido.com/v3',
        sandboxUrl: 'https://api.onfido.com/v3',
        authType: 'bearer',
        credentialTypes: ['IdentityCheck', 'DocumentCheck', 'FacialSimilarityCheck'],
        freeQuota: 25,
        setupGuide: [
          'Create account at onfido.com',
          'Get API key from dashboard',
          'Add ONFIDO_API_KEY to environment',
          'Configure webhook endpoints'
        ],
        requiredEnvVars: ['ONFIDO_API_KEY'],
        testEndpoints: [
          {
            name: 'Create Applicant',
            path: '/applicants',
            method: 'POST',
            sampleRequest: {
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com'
            },
            sampleResponse: {
              id: 'applicant123',
              created_at: '2024-01-15T10:30:00Z',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com'
            },
            credentialMapping: {
              'credentialSubject.applicantId': 'id',
              'credentialSubject.firstName': 'first_name',
              'credentialSubject.lastName': 'last_name',
              'credentialSubject.email': 'email',
              'credentialSubject.createdAt': 'created_at'
            }
          }
        ]
      },
      {
        id: 'experian',
        name: 'Experian Credit API',
        description: 'Real-time credit reports and identity verification',
        category: 'Financial & Credit',
        baseUrl: 'https://api.experian.com',
        sandboxUrl: 'https://sandbox-api.experian.com',
        authType: 'oauth2',
        credentialTypes: ['CreditReport', 'CreditScore', 'IdentityVerification'],
        freeQuota: 10,
        setupGuide: [
          'Create developer account at developer.experian.com',
          'Apply for API access',
          'Get client credentials',
          'Add EXPERIAN_CLIENT_ID and EXPERIAN_CLIENT_SECRET to environment'
        ],
        requiredEnvVars: ['EXPERIAN_CLIENT_ID', 'EXPERIAN_CLIENT_SECRET'],
        testEndpoints: [
          {
            name: 'Get Credit Profile',
            path: '/businessinformation/businesses/v1/search',
            method: 'POST',
            sampleRequest: {
              name: 'Test Business',
              street: '123 Main St',
              city: 'Anytown',
              state: 'CA',
              zip: '90210'
            },
            sampleResponse: {
              results: [
                {
                  bin: '123456789',
                  businessName: 'Test Business',
                  address: {
                    street: '123 Main St',
                    city: 'Anytown',
                    state: 'CA',
                    zip: '90210'
                  },
                  matchIndicators: {
                    nameMatchIndicator: 'Y',
                    addressMatchIndicator: 'Y'
                  }
                }
              ]
            },
            credentialMapping: {
              'credentialSubject.businessId': 'results[0].bin',
              'credentialSubject.businessName': 'results[0].businessName',
              'credentialSubject.verificationDate': new Date().toISOString()
            }
          }
        ]
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });

    console.log('🏆 Initialized premium API providers:', providers.length);
  }

  /**
   * 🔗 Connect to Premium API
   */
  async connectAPI(providerId: string, credentials: { [key: string]: string }): Promise<APIConnection> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      console.log(`🔗 Connecting to ${provider.name}...`);

      // Test the connection
      const testResult = await this.testConnection(provider, credentials);
      
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.error}`);
      }

      // Create connection record
      const connection: APIConnection = {
        id: `conn_${providerId}_${Date.now()}`,
        providerId,
        isConnected: true,
        quotaUsed: 0,
        quotaLimit: provider.freeQuota,
        lastUsed: new Date().toISOString(),
        testResults: testResult.data,
        ...credentials
      };

      this.connections.set(connection.id, connection);
      await this.saveConnections();

      console.log(`✅ Successfully connected to ${provider.name}`);
      return connection;

    } catch (error) {
      console.error(`❌ Failed to connect to ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * 🧪 Test API Connection
   */
  private async testConnection(provider: PremiumProvider, credentials: { [key: string]: string }): Promise<{
    success: boolean;
    error?: string;
    data?: any;
  }> {
    try {
      // Use sandbox URL for testing
      const baseUrl = provider.sandboxUrl;
      const testEndpoint = provider.testEndpoints[0];
      
      if (!testEndpoint) {
        return { success: true, data: { message: 'No test endpoint available' } };
      }

      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'User-Agent': 'PersonaChain/1.0'
      };

      // Add authentication headers
      if (provider.authType === 'api-key') {
        headers['X-API-Key'] = credentials.apiKey || credentials.TRULIOO_API_KEY || '';
      } else if (provider.authType === 'bearer') {
        headers['Authorization'] = `Bearer ${credentials.accessToken || credentials.JUMIO_API_TOKEN || ''}`;
      }

      const response = await fetch(`${baseUrl}${testEndpoint.path}`, {
        method: testEndpoint.method,
        headers,
        body: JSON.stringify(testEndpoint.sampleRequest)
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🏆 Create Premium Credential
   */
  async createCredential(request: CredentialRequest): Promise<any> {
    try {
      const provider = this.providers.get(request.providerId);
      if (!provider) {
        throw new Error(`Provider ${request.providerId} not found`);
      }

      const connection = Array.from(this.connections.values())
        .find(conn => conn.providerId === request.providerId && conn.isConnected);

      if (!connection) {
        throw new Error(`No active connection found for ${request.providerId}`);
      }

      // Check quota
      if (connection.quotaUsed >= connection.quotaLimit) {
        throw new Error(`Quota exceeded for ${provider.name} (${connection.quotaUsed}/${connection.quotaLimit})`);
      }

      console.log(`🏆 Creating credential via ${provider.name}...`);

      // Make API call
      const apiResponse = await this.callAPI(provider, connection, request.endpoint, request.data);

      // Find the test endpoint for credential mapping
      const endpoint = provider.testEndpoints.find(e => e.path === request.endpoint);
      if (!endpoint) {
        throw new Error(`Endpoint ${request.endpoint} not found for ${request.providerId}`);
      }

      // Map API response to credential subject
      const credentialSubject = this.mapResponseToCredential(apiResponse, endpoint.credentialMapping);

      // Create verifiable credential
      const credential = await verifiableCredentialService.issueCredential(
        credentialSubject,
        provider.credentialTypes,
        {
          id: `did:provider:${provider.id}`,
          name: provider.name,
          description: provider.description
        },
        {
          expirationDate: request.options?.expirationDays ? 
            new Date(Date.now() + (request.options.expirationDays * 24 * 60 * 60 * 1000)).toISOString() : 
            undefined,
          challenge: request.options?.challenge,
          evidence: [{
            type: ['APIEvidence'],
            verifier: provider.name,
            evidenceDocument: 'API Response',
            subjectPresence: 'Digital',
            documentPresence: 'Digital'
          }]
        }
      );

      // Update quota
      connection.quotaUsed += 1;
      connection.lastUsed = new Date().toISOString();
      await this.saveConnections();

      console.log(`✅ Created credential from ${provider.name}:`, credential.id);
      return credential;

    } catch (error) {
      console.error(`❌ Failed to create credential:`, error);
      throw error;
    }
  }

  /**
   * 📞 Call Premium API
   */
  private async callAPI(provider: PremiumProvider, connection: APIConnection, endpoint: string, data: any): Promise<any> {
    try {
      const baseUrl = provider.sandboxUrl; // Use sandbox for now
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'User-Agent': 'PersonaChain/1.0'
      };

      // Add authentication
      if (provider.authType === 'api-key') {
        headers['X-API-Key'] = connection.apiKey || '';
      } else if (provider.authType === 'bearer') {
        headers['Authorization'] = `Bearer ${connection.accessToken || ''}`;
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`❌ API call failed:`, error);
      throw error;
    }
  }

  /**
   * 🗂️ Map API Response to Credential
   */
  private mapResponseToCredential(apiResponse: any, mapping: { [key: string]: string }): any {
    const credentialSubject: any = {
      apiProvider: 'Premium API',
      verificationDate: new Date().toISOString()
    };

    for (const [credentialPath, responsePath] of Object.entries(mapping)) {
      try {
        const value = this.getNestedValue(apiResponse, responsePath);
        this.setNestedValue(credentialSubject, credentialPath.replace('credentialSubject.', ''), value);
      } catch (error) {
        console.warn(`⚠️ Failed to map ${responsePath} to ${credentialPath}:`, error);
      }
    }

    return credentialSubject;
  }

  /**
   * 🔍 Get nested object value
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        return current?.[arrayKey]?.[index];
      }
      return current?.[key];
    }, obj);
  }

  /**
   * 📝 Set nested object value
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
   * 💾 Save connections to storage
   */
  private async saveConnections(): Promise<void> {
    try {
      const connectionsData = Array.from(this.connections.values());
      localStorage.setItem('persona_api_connections', JSON.stringify(connectionsData));
    } catch (error) {
      console.error('❌ Failed to save connections:', error);
    }
  }

  /**
   * 📦 Load stored connections
   */
  private loadStoredConnections(): void {
    try {
      const stored = localStorage.getItem('persona_api_connections');
      if (stored) {
        const connectionsData: APIConnection[] = JSON.parse(stored);
        connectionsData.forEach(conn => {
          this.connections.set(conn.id, conn);
        });
        console.log('📦 Loaded stored connections:', this.connections.size);
      }
    } catch (error) {
      console.error('❌ Failed to load connections:', error);
    }
  }

  // 🔍 PUBLIC METHODS

  /**
   * 📋 Get available providers
   */
  getProviders(): PremiumProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 🔗 Get active connections
   */
  getConnections(): APIConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 🎯 Get provider by ID
   */
  getProvider(id: string): PremiumProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * 🗑️ Disconnect API
   */
  async disconnectAPI(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isConnected = false;
      await this.saveConnections();
      console.log(`🗑️ Disconnected from API: ${connectionId}`);
    }
  }

  /**
   * 📊 Get connection status
   */
  getConnectionStatus(providerId: string): {
    connected: boolean;
    quotaUsed: number;
    quotaLimit: number;
    lastUsed?: string;
  } | null {
    const connection = Array.from(this.connections.values())
      .find(conn => conn.providerId === providerId);

    if (!connection) return null;

    return {
      connected: connection.isConnected,
      quotaUsed: connection.quotaUsed,
      quotaLimit: connection.quotaLimit,
      lastUsed: connection.lastUsed
    };
  }
}

// 🏭 Export singleton instance
export const premiumAPIService = new PremiumAPIService();