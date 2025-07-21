/**
 * Enterprise API Service
 * Production-ready enterprise API with authentication, billing, and advanced features
 */

import { monitoringService, logger } from './monitoringService';
import { errorService, ErrorCategory, ErrorSeverity } from './errorService';
import { rateLimitService } from './rateLimitService';
import { securityAuditService } from './securityAuditService';
import { personaTokenService } from './personaTokenService';
// Lazy load blockchainService to avoid circular dependency
import { cryptoService } from './cryptoService';
import type { DID } from '../types/wallet';

// Safe BigInt constants to avoid exponentiation transpilation issues
const DECIMALS_18 = BigInt('1000000000000000000'); // 10^18
const DECIMALS_15 = BigInt('1000000000000000'); // 10^15


export interface EnterpriseClient {
  id: string;
  name: string;
  organizationDID: DID;
  apiKey: string;
  apiSecret: string;
  tier: 'starter' | 'professional' | 'enterprise' | 'unlimited';
  status: 'active' | 'suspended' | 'trial' | 'expired';
  createdAt: number;
  expiresAt: number;
  billing: {
    plan: 'monthly' | 'annual' | 'usage_based';
    monthlySpend: bigint;
    annualSpend: bigint;
    creditLimit: bigint;
    autoTopup: boolean;
  };
  usage: {
    apiCalls: number;
    credentialsCreated: number;
    zkProofsGenerated: number;
    blockchainTransactions: number;
    storageUsed: number; // bytes
    bandwidth: number; // bytes
  };
  permissions: {
    endpoints: string[];
    rateLimit: {
      requestsPerSecond: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
    features: {
      bulkOperations: boolean;
      realTimeUpdates: boolean;
      advancedAnalytics: boolean;
      customIntegrations: boolean;
      prioritySupport: boolean;
      whiteLabeling: boolean;
    };
  };
}

export interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  name: string;
  description: string;
  tier: 'starter' | 'professional' | 'enterprise' | 'unlimited';
  costPerCall: bigint; // PSA tokens
  category: 'credentials' | 'verification' | 'analytics' | 'blockchain' | 'storage';
  authentication: 'api_key' | 'oauth' | 'jwt' | 'signature';
  documentation: string;
  examples: Array<{
    request: any;
    response: any;
    description: string;
  }>;
  isActive: boolean;
  version: string;
}

export interface APIUsageLog {
  id: string;
  clientId: string;
  endpoint: string;
  method: string;
  timestamp: number;
  responseTime: number;
  statusCode: number;
  requestSize: number;
  responseSize: number;
  cost: bigint;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
}

export interface BillingRecord {
  id: string;
  clientId: string;
  period: {
    start: number;
    end: number;
  };
  usage: {
    apiCalls: number;
    credentialsCreated: number;
    zkProofsGenerated: number;
    blockchainTransactions: number;
    storageUsed: number;
    bandwidth: number;
  };
  costs: {
    apiCalls: bigint;
    credentialsCreated: bigint;
    zkProofsGenerated: bigint;
    blockchainTransactions: bigint;
    storageUsed: bigint;
    bandwidth: bigint;
    total: bigint;
  };
  payment: {
    method: 'psa_tokens' | 'credit_card' | 'bank_transfer';
    transactionId: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    dueDate: number;
    paidAt?: number;
  };
  invoice: {
    number: string;
    url: string;
    pdfPath: string;
  };
}

export interface WebhookEvent {
  id: string;
  clientId: string;
  type: 'usage_threshold' | 'billing_alert' | 'api_error' | 'security_alert' | 'system_update';
  payload: Record<string, any>;
  timestamp: number;
  attempts: number;
  status: 'pending' | 'delivered' | 'failed' | 'expired';
  webhookUrl: string;
  signature: string;
}

export class EnterpriseAPIService {
  private static instance: EnterpriseAPIService;
  private clients: Map<string, EnterpriseClient> = new Map();
  private endpoints: Map<string, APIEndpoint> = new Map();
  private usageLogs: Map<string, APIUsageLog[]> = new Map();
  private billingRecords: Map<string, BillingRecord[]> = new Map();
  private webhooks: Map<string, WebhookEvent[]> = new Map();
  private apiKeys: Map<string, string> = new Map(); // apiKey -> clientId

  private readonly TIER_CONFIGURATIONS = {
    starter: {
      monthlyFee: BigInt('100') * DECIMALS_18, // 100 PSA
      rateLimit: { requestsPerSecond: 10, requestsPerHour: 1000, requestsPerDay: 10000 },
      features: {
        bulkOperations: false,
        realTimeUpdates: false,
        advancedAnalytics: false,
        customIntegrations: false,
        prioritySupport: false,
        whiteLabeling: false,
      },
    },
    professional: {
      monthlyFee: BigInt('500') * DECIMALS_18, // 500 PSA
      rateLimit: { requestsPerSecond: 50, requestsPerHour: 10000, requestsPerDay: 100000 },
      features: {
        bulkOperations: true,
        realTimeUpdates: true,
        advancedAnalytics: true,
        customIntegrations: false,
        prioritySupport: true,
        whiteLabeling: false,
      },
    },
    enterprise: {
      monthlyFee: BigInt('2000') * DECIMALS_18, // 2000 PSA
      rateLimit: { requestsPerSecond: 200, requestsPerHour: 50000, requestsPerDay: 500000 },
      features: {
        bulkOperations: true,
        realTimeUpdates: true,
        advancedAnalytics: true,
        customIntegrations: true,
        prioritySupport: true,
        whiteLabeling: true,
      },
    },
    unlimited: {
      monthlyFee: BigInt('10000') * DECIMALS_18, // 10000 PSA
      rateLimit: { requestsPerSecond: 1000, requestsPerHour: 1000000, requestsPerDay: 10000000 },
      features: {
        bulkOperations: true,
        realTimeUpdates: true,
        advancedAnalytics: true,
        customIntegrations: true,
        prioritySupport: true,
        whiteLabeling: true,
      },
    },
  };

  private constructor() {
    this.initializeEnterpriseAPI();
    this.initializeEndpoints();
    this.startBillingEngine();
    this.startWebhookProcessor();
  }

  static getInstance(): EnterpriseAPIService {
    if (!EnterpriseAPIService.instance) {
      EnterpriseAPIService.instance = new EnterpriseAPIService();
    }
    return EnterpriseAPIService.instance;
  }

  /**
   * Initialize enterprise API service
   */
  private initializeEnterpriseAPI(): void {
    // Register enterprise health checks
    monitoringService.registerHealthCheck('enterprise_api', async () => {
      const activeClients = Array.from(this.clients.values()).filter(c => c.status === 'active');
      return activeClients.length > 0;
    });

    // Set up enterprise monitoring
    setInterval(() => {
      this.monitorEnterpriseMetrics();
    }, 60000); // Every minute

    // Set up billing cycle processing
    setInterval(() => {
      this.processBillingCycle();
    }, 24 * 60 * 60 * 1000); // Daily

    logger.info('🏢 Enterprise API Service initialized', {
      tiers: Object.keys(this.TIER_CONFIGURATIONS),
      endpoints: this.endpoints.size,
    });
  }

  /**
   * Initialize API endpoints
   */
  private initializeEndpoints(): void {
    const endpoints: APIEndpoint[] = [
      // Credential Management
      {
        id: 'create_credential',
        path: '/api/v1/credentials',
        method: 'POST',
        name: 'Create Credential',
        description: 'Create a new verifiable credential',
        tier: 'starter',
        costPerCall: BigInt('10') * DECIMALS_18, // 10 PSA
        category: 'credentials',
        authentication: 'api_key',
        documentation: 'https://docs.personapass.xyz/api/credentials/create',
        examples: [
          {
            request: {
              type: 'EmploymentCredential',
              subject: 'did:key:abc123',
              claims: { position: 'Engineer', company: 'TechCorp' },
            },
            response: {
              id: 'cred_123',
              credential: { /* VC object */ },
              status: 'created',
            },
            description: 'Create an employment credential',
          },
        ],
        isActive: true,
        version: '1.0.0',
      },
      {
        id: 'bulk_create_credentials',
        path: '/api/v1/credentials/bulk',
        method: 'POST',
        name: 'Bulk Create Credentials',
        description: 'Create multiple verifiable credentials in batch',
        tier: 'professional',
        costPerCall: BigInt('50') * DECIMALS_18, // 50 PSA
        category: 'credentials',
        authentication: 'api_key',
        documentation: 'https://docs.personapass.xyz/api/credentials/bulk',
        examples: [
          {
            request: {
              credentials: [
                { type: 'EmploymentCredential', subject: 'did:key:abc123' },
                { type: 'EducationCredential', subject: 'did:key:def456' },
              ],
            },
            response: {
              results: [
                { id: 'cred_123', status: 'created' },
                { id: 'cred_124', status: 'created' },
              ],
              summary: { total: 2, successful: 2, failed: 0 },
            },
            description: 'Bulk create multiple credentials',
          },
        ],
        isActive: true,
        version: '1.0.0',
      },
      // Verification
      {
        id: 'verify_credential',
        path: '/api/v1/verify',
        method: 'POST',
        name: 'Verify Credential',
        description: 'Verify a verifiable credential or presentation',
        tier: 'starter',
        costPerCall: BigInt('5') * DECIMALS_18, // 5 PSA
        category: 'verification',
        authentication: 'api_key',
        documentation: 'https://docs.personapass.xyz/api/verify',
        examples: [
          {
            request: {
              credential: { /* VC object */ },
              challenge: 'abc123',
            },
            response: {
              isValid: true,
              verified: true,
              errors: [],
            },
            description: 'Verify a credential',
          },
        ],
        isActive: true,
        version: '1.0.0',
      },
      // ZK Proofs
      {
        id: 'generate_zk_proof',
        path: '/api/v1/zk/prove',
        method: 'POST',
        name: 'Generate ZK Proof',
        description: 'Generate zero-knowledge proof for credential',
        tier: 'professional',
        costPerCall: BigInt('100') * DECIMALS_18, // 100 PSA
        category: 'verification',
        authentication: 'signature',
        documentation: 'https://docs.personapass.xyz/api/zk/prove',
        examples: [
          {
            request: {
              circuitId: 'age_verification',
              privateInputs: { dateOfBirth: '1990-01-01' },
              publicInputs: { minimumAge: 18 },
            },
            response: {
              proof: { /* ZK proof object */ },
              publicSignals: ['1'],
            },
            description: 'Generate age verification proof',
          },
        ],
        isActive: true,
        version: '1.0.0',
      },
      // Analytics
      {
        id: 'get_analytics',
        path: '/api/v1/analytics',
        method: 'GET',
        name: 'Get Analytics',
        description: 'Get credential and verification analytics',
        tier: 'professional',
        costPerCall: BigInt('25') * DECIMALS_18, // 25 PSA
        category: 'analytics',
        authentication: 'api_key',
        documentation: 'https://docs.personapass.xyz/api/analytics',
        examples: [
          {
            request: {
              timeframe: '30d',
              metrics: ['credentials_created', 'verifications_performed'],
            },
            response: {
              timeframe: '30d',
              data: {
                credentials_created: 1250,
                verifications_performed: 3400,
              },
            },
            description: 'Get 30-day analytics',
          },
        ],
        isActive: true,
        version: '1.0.0',
      },
      // Blockchain
      {
        id: 'anchor_credential',
        path: '/api/v1/blockchain/anchor',
        method: 'POST',
        name: 'Anchor Credential',
        description: 'Anchor credential hash to blockchain',
        tier: 'enterprise',
        costPerCall: BigInt('200') * DECIMALS_18, // 200 PSA
        category: 'blockchain',
        authentication: 'signature',
        documentation: 'https://docs.personapass.xyz/api/blockchain/anchor',
        examples: [
          {
            request: {
              credentialHash: '0xabc123...',
              network: 'polygon',
              metadata: { purpose: 'immutable_record' },
            },
            response: {
              transactionHash: '0xdef456...',
              blockNumber: 12345678,
              status: 'confirmed',
            },
            description: 'Anchor credential to blockchain',
          },
        ],
        isActive: true,
        version: '1.0.0',
      },
    ];

    endpoints.forEach(endpoint => {
      this.endpoints.set(endpoint.id, endpoint);
    });

    logger.info('📡 Enterprise API endpoints initialized', {
      endpointCount: endpoints.length,
      categories: [...new Set(endpoints.map(e => e.category))],
    });
  }

  /**
   * Create enterprise client
   */
  async createEnterpriseClient(
    organizationDID: DID,
    name: string,
    tier: 'starter' | 'professional' | 'enterprise' | 'unlimited',
    billingPlan: 'monthly' | 'annual' | 'usage_based' = 'monthly'
  ): Promise<EnterpriseClient> {
    try {
      const clientId = `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const apiKey = await this.generateAPIKey(clientId);
      const apiSecret = await this.generateAPISecret(clientId);

      const tierConfig = this.TIER_CONFIGURATIONS[tier];
      const expiresAt = billingPlan === 'annual' 
        ? Date.now() + 365 * 24 * 60 * 60 * 1000 
        : Date.now() + 30 * 24 * 60 * 60 * 1000;

      const client: EnterpriseClient = {
        id: clientId,
        name,
        organizationDID,
        apiKey,
        apiSecret,
        tier,
        status: 'active',
        createdAt: Date.now(),
        expiresAt,
        billing: {
          plan: billingPlan,
          monthlySpend: BigInt(0),
          annualSpend: BigInt(0),
          creditLimit: tierConfig.monthlyFee * BigInt(10), // 10x monthly fee
          autoTopup: true,
        },
        usage: {
          apiCalls: 0,
          credentialsCreated: 0,
          zkProofsGenerated: 0,
          blockchainTransactions: 0,
          storageUsed: 0,
          bandwidth: 0,
        },
        permissions: {
          endpoints: this.getEndpointsForTier(tier),
          rateLimit: tierConfig.rateLimit,
          features: tierConfig.features,
        },
      };

      this.clients.set(clientId, client);
      this.apiKeys.set(apiKey, clientId);

      // Create initial billing record
      await this.createBillingRecord(clientId);

      // Record metrics
      monitoringService.recordMetric('enterprise_client_created', 1, {
        tier,
        plan: billingPlan,
        organization: organizationDID,
      });

      logger.info('🏢 Enterprise client created successfully', {
        clientId,
        name,
        tier,
        organizationDID,
      });

      return client;
    } catch (error) {
      logger.error('❌ Failed to create enterprise client', {
        organizationDID,
        name,
        tier,
        error,
      });
      throw errorService.createError(
        'ENTERPRISE_CLIENT_CREATE_ERROR',
        `Failed to create enterprise client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.INTERNAL,
        ErrorSeverity.HIGH,
        errorService.createContext({ component: 'enterprise-api', action: 'create-client' })
      );
    }
  }

  /**
   * Authenticate API request
   */
  async authenticateRequest(
    apiKey: string,
    signature?: string,
    timestamp?: number,
    nonce?: string
  ): Promise<{ client: EnterpriseClient; isValid: boolean }> {
    try {
      const clientId = this.apiKeys.get(apiKey);
      if (!clientId) {
        throw errorService.createError(
          'INVALID_API_KEY',
          'Invalid API key',
          ErrorCategory.AUTHENTICATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'enterprise-api', action: 'authenticate' })
        );
      }

      const client = this.clients.get(clientId);
      if (!client) {
        throw errorService.createError(
          'CLIENT_NOT_FOUND',
          'Client not found',
          ErrorCategory.AUTHENTICATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'enterprise-api', action: 'authenticate' })
        );
      }

      // Check client status
      if (client.status !== 'active') {
        throw errorService.createError(
          'CLIENT_INACTIVE',
          `Client status is ${client.status}`,
          ErrorCategory.AUTHENTICATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'enterprise-api', action: 'authenticate' })
        );
      }

      // Check expiration
      if (Date.now() > client.expiresAt) {
        throw errorService.createError(
          'CLIENT_EXPIRED',
          'Client subscription expired',
          ErrorCategory.AUTHENTICATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'enterprise-api', action: 'authenticate' })
        );
      }

      // Verify signature if provided (for high-security endpoints)
      if (signature && timestamp && nonce) {
        const isSignatureValid = await this.verifySignature(
          client,
          signature,
          timestamp,
          nonce
        );
        if (!isSignatureValid) {
          throw errorService.createError(
            'INVALID_SIGNATURE',
            'Invalid request signature',
            ErrorCategory.AUTHENTICATION,
            ErrorSeverity.HIGH,
            errorService.createContext({ component: 'enterprise-api', action: 'authenticate' })
          );
        }
      }

      return { client, isValid: true };
    } catch (error) {
      logger.error('❌ Authentication failed', { apiKey, error });
      return { 
        client: {} as EnterpriseClient, 
        isValid: false 
      };
    }
  }

  /**
   * Process API request with billing
   */
  async processAPIRequest(
    client: EnterpriseClient,
    endpointId: string,
    requestData: any,
    metadata: {
      method: string;
      path: string;
      ipAddress: string;
      userAgent: string;
      requestSize: number;
      responseSize: number;
      responseTime: number;
      statusCode: number;
    }
  ): Promise<{ success: boolean; cost: bigint; usageLog: APIUsageLog }> {
    try {
      const endpoint = this.endpoints.get(endpointId);
      if (!endpoint) {
        throw errorService.createError(
          'ENDPOINT_NOT_FOUND',
          `Endpoint ${endpointId} not found`,
          ErrorCategory.VALIDATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'enterprise-api', action: 'process-request' })
        );
      }

      // Check permissions
      if (!client.permissions.endpoints.includes(endpointId)) {
        throw errorService.createError(
          'ENDPOINT_NOT_PERMITTED',
          `Endpoint ${endpointId} not permitted for tier ${client.tier}`,
          ErrorCategory.AUTHORIZATION,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'enterprise-api', action: 'process-request' })
        );
      }

      // Check rate limits
      const rateLimitResult = rateLimitService.checkRateLimit(client.id, endpointId);
      if (!rateLimitResult.allowed) {
        throw errorService.createError(
          'RATE_LIMIT_EXCEEDED',
          'Rate limit exceeded for endpoint',
          ErrorCategory.RATE_LIMIT,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'enterprise-api', action: 'process-request' })
        );
      }

      // Calculate cost
      const cost = endpoint.costPerCall;

      // Check client balance/credit
      const hasCredit = await this.checkClientCredit(client, cost);
      if (!hasCredit) {
        throw errorService.createError(
          'INSUFFICIENT_CREDIT',
          'Insufficient credit for API call',
          ErrorCategory.BILLING,
          ErrorSeverity.MEDIUM,
          errorService.createContext({ component: 'enterprise-api', action: 'process-request' })
        );
      }

      // Create usage log
      const usageLog: APIUsageLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId: client.id,
        endpoint: endpointId,
        method: metadata.method,
        timestamp: Date.now(),
        responseTime: metadata.responseTime,
        statusCode: metadata.statusCode,
        requestSize: metadata.requestSize,
        responseSize: metadata.responseSize,
        cost,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: requestData,
      };

      // Update client usage
      await this.updateClientUsage(client, endpoint, cost);

      // Store usage log
      if (!this.usageLogs.has(client.id)) {
        this.usageLogs.set(client.id, []);
      }
      this.usageLogs.get(client.id)!.push(usageLog);

      // Record metrics
      monitoringService.recordMetric('enterprise_api_call', 1, {
        client: client.id,
        endpoint: endpointId,
        tier: client.tier,
        cost: cost.toString(),
      });

      logger.info('📊 API request processed successfully', {
        clientId: client.id,
        endpoint: endpointId,
        cost: cost.toString(),
        responseTime: metadata.responseTime,
      });

      return { success: true, cost, usageLog };
    } catch (error) {
      logger.error('❌ Failed to process API request', {
        clientId: client.id,
        endpointId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get client analytics
   */
  async getClientAnalytics(
    clientId: string,
    timeframe: '1d' | '7d' | '30d' | '90d' = '30d'
  ): Promise<{
    usage: {
      apiCalls: number;
      credentialsCreated: number;
      zkProofsGenerated: number;
      blockchainTransactions: number;
      costs: bigint;
    };
    performance: {
      averageResponseTime: number;
      errorRate: number;
      successRate: number;
    };
    topEndpoints: Array<{
      endpoint: string;
      calls: number;
      cost: bigint;
    }>;
  }> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw errorService.createError(
        'CLIENT_NOT_FOUND',
        'Client not found',
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'enterprise-api', action: 'get-analytics' })
      );
    }

    const timeframeMs = this.getTimeframeMs(timeframe);
    const since = Date.now() - timeframeMs;

    const logs = this.usageLogs.get(clientId) || [];
    const recentLogs = logs.filter(log => log.timestamp >= since);

    const usage = {
      apiCalls: recentLogs.length,
      credentialsCreated: recentLogs.filter(log => log.endpoint === 'create_credential').length,
      zkProofsGenerated: recentLogs.filter(log => log.endpoint === 'generate_zk_proof').length,
      blockchainTransactions: recentLogs.filter(log => log.endpoint === 'anchor_credential').length,
      costs: recentLogs.reduce((sum, log) => sum + log.cost, BigInt(0)),
    };

    const performance = {
      averageResponseTime: recentLogs.length > 0 
        ? recentLogs.reduce((sum, log) => sum + log.responseTime, 0) / recentLogs.length 
        : 0,
      errorRate: recentLogs.length > 0 
        ? recentLogs.filter(log => log.statusCode >= 400).length / recentLogs.length 
        : 0,
      successRate: recentLogs.length > 0 
        ? recentLogs.filter(log => log.statusCode < 400).length / recentLogs.length 
        : 0,
    };

    const endpointStats = new Map<string, { calls: number; cost: bigint }>();
    recentLogs.forEach(log => {
      const current = endpointStats.get(log.endpoint) || { calls: 0, cost: BigInt(0) };
      endpointStats.set(log.endpoint, {
        calls: current.calls + 1,
        cost: current.cost + log.cost,
      });
    });

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({ endpoint, ...stats }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    return { usage, performance, topEndpoints };
  }

  /**
   * Get available endpoints for client
   */
  getAvailableEndpoints(clientId: string): APIEndpoint[] {
    const client = this.clients.get(clientId);
    if (!client) return [];

    return Array.from(this.endpoints.values())
      .filter(endpoint => 
        client.permissions.endpoints.includes(endpoint.id) && 
        endpoint.isActive
      );
  }

  /**
   * Generate API documentation
   */
  generateAPIDocumentation(clientId: string): {
    endpoints: Array<{
      id: string;
      path: string;
      method: string;
      name: string;
      description: string;
      cost: string;
      examples: any[];
    }>;
    authentication: {
      methods: string[];
      examples: any;
    };
    rateLimit: {
      requestsPerSecond: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
  } {
    const client = this.clients.get(clientId);
    if (!client) {
      throw errorService.createError(
        'CLIENT_NOT_FOUND',
        'Client not found',
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        errorService.createContext({ component: 'enterprise-api', action: 'generate-docs' })
      );
    }

    const availableEndpoints = this.getAvailableEndpoints(clientId);
    
    const endpoints = availableEndpoints.map(endpoint => ({
      id: endpoint.id,
      path: endpoint.path,
      method: endpoint.method,
      name: endpoint.name,
      description: endpoint.description,
      cost: `${endpoint.costPerCall.toString()} PSA`,
      examples: endpoint.examples,
    }));

    const authentication = {
      methods: ['api_key', 'signature'],
      examples: {
        api_key: {
          header: 'Authorization: Bearer YOUR_API_KEY',
          description: 'Include API key in Authorization header',
        },
        signature: {
          headers: {
            'X-API-Key': 'YOUR_API_KEY',
            'X-Timestamp': '1640995200',
            'X-Nonce': 'random_nonce_123',
            'X-Signature': 'computed_signature_hash',
          },
          description: 'Include signature for high-security endpoints',
        },
      },
    };

    return {
      endpoints,
      authentication,
      rateLimit: client.permissions.rateLimit,
    };
  }

  /**
   * Private helper methods
   */
  private async generateAPIKey(clientId: string): Promise<string> {
    const keyData = `${clientId}:${Date.now()}:${Math.random()}`;
    const hash = await cryptoService.generateHash(keyData);
    return `pk_${hash.substring(0, 32)}`;
  }

  private async generateAPISecret(clientId: string): Promise<string> {
    const secretData = `${clientId}:secret:${Date.now()}:${Math.random()}`;
    const hash = await cryptoService.generateHash(secretData);
    return `sk_${hash.substring(0, 64)}`;
  }

  private getEndpointsForTier(tier: string): string[] {
    return Array.from(this.endpoints.values())
      .filter(endpoint => {
        const tierOrder = ['starter', 'professional', 'enterprise', 'unlimited'];
        const endpointTierIndex = tierOrder.indexOf(endpoint.tier);
        const clientTierIndex = tierOrder.indexOf(tier);
        return clientTierIndex >= endpointTierIndex;
      })
      .map(endpoint => endpoint.id);
  }

  private async verifySignature(
    client: EnterpriseClient,
    signature: string,
    timestamp: number,
    nonce: string
  ): Promise<boolean> {
    try {
      // Check timestamp (within 5 minutes)
      if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
        return false;
      }

      // Create signature payload
      const payload = `${client.apiKey}:${timestamp}:${nonce}`;
      const expectedSignature = await cryptoService.generateHash(payload + client.apiSecret);
      
      return signature === expectedSignature;
    } catch (error) {
      logger.error('❌ Signature verification failed', { error });
      return false;
    }
  }

  private async checkClientCredit(client: EnterpriseClient, cost: bigint): Promise<boolean> {
    // Check if client has enough credit or PSA tokens
    try {
      const balance = await personaTokenService.getUserBalance(client.organizationDID);
      return balance.balance >= cost;
    } catch (error) {
      logger.error('❌ Credit check failed', { clientId: client.id, error });
      return false;
    }
  }

  private async updateClientUsage(
    client: EnterpriseClient,
    endpoint: APIEndpoint,
    cost: bigint
  ): Promise<void> {
    // Update client usage statistics
    client.usage.apiCalls++;
    client.billing.monthlySpend += cost;
    client.billing.annualSpend += cost;

    // Update specific usage counters
    switch (endpoint.category) {
      case 'credentials':
        client.usage.credentialsCreated++;
        break;
      case 'verification':
        if (endpoint.id === 'generate_zk_proof') {
          client.usage.zkProofsGenerated++;
        }
        break;
      case 'blockchain':
        client.usage.blockchainTransactions++;
        break;
    }

    // Charge the client
    await personaTokenService.chargeForAPIUsage(
      client.organizationDID,
      endpoint.path,
      'call',
      BigInt(1)
    );

    this.clients.set(client.id, client);
  }

  private async createBillingRecord(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const billingRecord: BillingRecord = {
      id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientId,
      period: {
        start: Date.now(),
        end: client.billing.plan === 'annual' 
          ? Date.now() + 365 * 24 * 60 * 60 * 1000 
          : Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
      usage: { ...client.usage },
      costs: {
        apiCalls: BigInt(0),
        credentialsCreated: BigInt(0),
        zkProofsGenerated: BigInt(0),
        blockchainTransactions: BigInt(0),
        storageUsed: BigInt(0),
        bandwidth: BigInt(0),
        total: BigInt(0),
      },
      payment: {
        method: 'psa_tokens',
        transactionId: '',
        status: 'pending',
        dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      invoice: {
        number: `INV-${Date.now()}`,
        url: '',
        pdfPath: '',
      },
    };

    if (!this.billingRecords.has(clientId)) {
      this.billingRecords.set(clientId, []);
    }
    this.billingRecords.get(clientId)!.push(billingRecord);
  }

  private getTimeframeMs(timeframe: string): number {
    switch (timeframe) {
      case '1d': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      case '90d': return 90 * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private monitorEnterpriseMetrics(): void {
    const activeClients = Array.from(this.clients.values()).filter(c => c.status === 'active');
    const totalRevenue = activeClients.reduce((sum, client) => sum + client.billing.monthlySpend, BigInt(0));
    const totalAPIcalls = activeClients.reduce((sum, client) => sum + client.usage.apiCalls, 0);

    monitoringService.recordMetric('enterprise_active_clients', activeClients.length);
    monitoringService.recordMetric('enterprise_total_revenue', Number(totalRevenue));
    monitoringService.recordMetric('enterprise_total_api_calls', totalAPIcalls);

    // Record metrics by tier
    const tiers = ['starter', 'professional', 'enterprise', 'unlimited'];
    tiers.forEach(tier => {
      const tierClients = activeClients.filter(c => c.tier === tier);
      monitoringService.recordMetric('enterprise_clients_by_tier', tierClients.length, { tier });
    });
  }

  private processBillingCycle(): void {
    const now = Date.now();
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.status === 'active' && now >= client.expiresAt) {
        this.processBillingForClient(clientId).catch(error => {
          logger.error('❌ Billing processing failed', { clientId, error });
        });
      }
    }
  }

  private async processBillingForClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Calculate billing amount
      const tierConfig = this.TIER_CONFIGURATIONS[client.tier];
      const billingAmount = client.billing.plan === 'usage_based' 
        ? client.billing.monthlySpend 
        : tierConfig.monthlyFee;

      // Charge client
      await personaTokenService.chargeForAPIUsage(
        client.organizationDID,
        'subscription_renewal',
        'call',
        billingAmount
      );

      // Extend subscription
      const extensionPeriod = client.billing.plan === 'annual' 
        ? 365 * 24 * 60 * 60 * 1000 
        : 30 * 24 * 60 * 60 * 1000;
      
      client.expiresAt = Date.now() + extensionPeriod;
      client.billing.monthlySpend = BigInt(0); // Reset monthly spend

      this.clients.set(clientId, client);

      logger.info('💰 Billing processed successfully', {
        clientId,
        amount: billingAmount.toString(),
        newExpiresAt: client.expiresAt,
      });
    } catch (error) {
      // Suspend client if billing fails
      client.status = 'suspended';
      this.clients.set(clientId, client);
      
      logger.error('❌ Billing failed - client suspended', {
        clientId,
        error,
      });
    }
  }

  private startBillingEngine(): void {
    setInterval(() => {
      this.processBillingCycle();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private startWebhookProcessor(): void {
    setInterval(() => {
      this.processWebhooks();
    }, 60000); // Every minute
  }

  private processWebhooks(): void {
    // Process webhook delivery
    for (const [clientId, webhooks] of this.webhooks.entries()) {
      const pendingWebhooks = webhooks.filter(w => w.status === 'pending');
      
      for (const webhook of pendingWebhooks) {
        this.deliverWebhook(webhook).catch(error => {
          logger.error('❌ Webhook delivery failed', { 
            webhookId: webhook.id, 
            clientId, 
            error 
          });
        });
      }
    }
  }

  private async deliverWebhook(webhook: WebhookEvent): Promise<void> {
    // Mock webhook delivery - in production, this would make HTTP requests
    webhook.attempts++;
    
    if (webhook.attempts > 3) {
      webhook.status = 'failed';
    } else {
      webhook.status = 'delivered';
    }
    
    logger.debug('📡 Webhook delivered', {
      webhookId: webhook.id,
      type: webhook.type,
      attempts: webhook.attempts,
      status: webhook.status,
    });
  }
}

export const enterpriseAPIService = EnterpriseAPIService.getInstance();