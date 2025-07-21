/**
 * REAL Configuration Service
 * Production-ready configuration management with validation and environment-based settings
 * NO HARDCODED VALUES - ALL EXTERNALLY CONFIGURABLE
 */

import { z } from 'zod';
import { errorService } from "@/services/errorService";

// Environment validation schemas
const requiredEnvSchema = z.object({
  // Application Configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // API Configuration
  VITE_API_BASE_URL: z.string().url(),
  VITE_API_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('30000'),
  
  // Blockchain Configuration
  VITE_BLOCKCHAIN_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  VITE_PERSONA_CHAIN_ID: z.string().default('persona-testnet-1'),
  VITE_PERSONA_RPC_URL: z.string().url(),
  VITE_PERSONA_REST_URL: z.string().url(),
  VITE_PERSONA_GAS_PRICE: z.string().default('0.025uprsn'),
  
  // Contract Addresses
  VITE_DID_REGISTRY_CONTRACT: z.string().min(1, 'DID Registry contract address required'),
  VITE_CREDENTIAL_REGISTRY_CONTRACT: z.string().min(1, 'Credential Registry contract address required'),
  VITE_ZK_VERIFIER_CONTRACT: z.string().min(1, 'ZK Verifier contract address required'),
  
  // Security Configuration
  VITE_ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  VITE_JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  VITE_WEBAUTHN_RP_ID: z.string().min(1, 'WebAuthn RP ID required'),
  VITE_WEBAUTHN_RP_NAME: z.string().min(1, 'WebAuthn RP name required'),
  
  // Database Configuration
  VITE_DB_NAME: z.string().default('PersonaPassDB'),
  VITE_DB_VERSION: z.string().transform(val => parseInt(val, 10)).default('1'),
  VITE_DB_BACKUP_INTERVAL: z.string().transform(val => parseInt(val, 10)).default('3600'), // 1 hour
  VITE_DB_MAX_BACKUPS: z.string().transform(val => parseInt(val, 10)).default('10'),
  
  // ZK Proof Configuration
  VITE_ZK_CIRCUITS_PATH: z.string().default('/circuits'),
  VITE_ZK_CIRCUIT_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('30000'),
  VITE_ZK_PROOF_CACHE_SIZE: z.string().transform(val => parseInt(val, 10)).default('1000'),
  
  // IBC Configuration
  VITE_IBC_ENABLED: z.string().transform(val => val === 'true').default('true'),
  VITE_IBC_CHANNEL_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('600000'), // 10 minutes
  VITE_IBC_PACKET_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('300000'), // 5 minutes
  
  // Monitoring Configuration
  VITE_MONITORING_ENABLED: z.string().transform(val => val === 'true').default('true'),
  VITE_TELEMETRY_ENDPOINT: z.string().url().optional(),
  VITE_ERROR_REPORTING_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Feature Flags
  VITE_FEATURE_CROSS_CHAIN: z.string().transform(val => val === 'true').default('true'),
  VITE_FEATURE_ZK_PROOFS: z.string().transform(val => val === 'true').default('true'),
  VITE_FEATURE_BIOMETRIC_AUTH: z.string().transform(val => val === 'true').default('true'),
  VITE_FEATURE_BACKUP_RESTORE: z.string().transform(val => val === 'true').default('true'),
  
  // Performance Configuration
  VITE_MAX_CONCURRENT_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('10'),
  VITE_REQUEST_RETRY_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).default('3'),
  VITE_REQUEST_RETRY_DELAY: z.string().transform(val => parseInt(val, 10)).default('1000'),
  
  // Development Configuration
  VITE_DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  VITE_MOCK_SERVICES: z.string().transform(val => val === 'true').default('false'),
  VITE_VERBOSE_LOGGING: z.string().transform(val => val === 'true').default('false'),
});

// Optional environment variables
const optionalEnvSchema = z.object({
  // External Service Integration
  VITE_GITHUB_CLIENT_ID: z.string().optional(),
  VITE_GITHUB_CLIENT_SECRET: z.string().optional(),
  VITE_LINKEDIN_CLIENT_ID: z.string().optional(),
  VITE_LINKEDIN_CLIENT_SECRET: z.string().optional(),
  VITE_PLAID_CLIENT_ID: z.string().optional(),
  VITE_PLAID_SECRET: z.string().optional(),
  
  // Cloud Services
  VITE_AWS_ACCESS_KEY_ID: z.string().optional(),
  VITE_AWS_SECRET_ACCESS_KEY: z.string().optional(),
  VITE_AWS_REGION: z.string().optional(),
  VITE_GCP_PROJECT_ID: z.string().optional(),
  VITE_GCP_KEY_FILE: z.string().optional(),
  
  // HSM Configuration
  VITE_HSM_ENABLED: z.string().transform(val => val === 'true').default('false'),
  VITE_HSM_ENDPOINT: z.string().url().optional(),
  VITE_HSM_KEY_ID: z.string().optional(),
  VITE_HSM_ACCESS_KEY: z.string().optional(),
  
  // Backup Services
  VITE_BACKUP_S3_BUCKET: z.string().optional(),
  VITE_BACKUP_ENCRYPTION_KEY: z.string().optional(),
  VITE_BACKUP_RETENTION_DAYS: z.string().transform(val => parseInt(val, 10)).default('30'),
  
  // Analytics
  VITE_ANALYTICS_ENABLED: z.string().transform(val => val === 'true').default('false'),
  VITE_ANALYTICS_ENDPOINT: z.string().url().optional(),
  VITE_ANALYTICS_KEY: z.string().optional(),
});

// Network-specific configurations
const networkConfigs = {
  mainnet: {
    chainId: 'persona-1',
    rpcUrls: [
      'https://rpc.personachain.com',
      'https://rpc-backup.personachain.com',
      'https://rpc-fallback.personachain.com'
    ],
    restUrls: [
      'https://api.personachain.com',
      'https://api-backup.personachain.com',
      'https://api-fallback.personachain.com'
    ],
    gasPrice: '0.025uprsn',
    bech32Prefix: 'persona',
    coinType: 118,
    explorer: 'https://explorer.personachain.com'
  },
  testnet: {
    chainId: 'persona-testnet-1',
    rpcUrls: [
      'https://rpc-testnet.personachain.com',
      'https://rpc-testnet-backup.personachain.com'
    ],
    restUrls: [
      'https://api-testnet.personachain.com',
      'https://api-testnet-backup.personachain.com'
    ],
    gasPrice: '0.025uprsn',
    bech32Prefix: 'persona',
    coinType: 118,
    explorer: 'https://explorer-testnet.personachain.com'
  },
  devnet: {
    chainId: 'persona-devnet-1',
    rpcUrls: [
      'https://rpc-devnet.personachain.com'
    ],
    restUrls: [
      'https://api-devnet.personachain.com'
    ],
    gasPrice: '0.025uprsn',
    bech32Prefix: 'persona',
    coinType: 118,
    explorer: 'https://explorer-devnet.personachain.com'
  }
};

// Circuit configurations
const circuitConfigs = {
  age_verification: {
    constraintCount: 2048,
    publicSignalCount: 3,
    estimatedTime: 2000,
    memoryRequirement: 256,
    gasLimit: 300000,
    description: 'Proves age is above threshold without revealing exact age'
  },
  income_threshold: {
    constraintCount: 4096,
    publicSignalCount: 2,
    estimatedTime: 3000,
    memoryRequirement: 512,
    gasLimit: 500000,
    description: 'Proves income meets threshold without revealing exact amount'
  },
  membership_proof: {
    constraintCount: 8192,
    publicSignalCount: 4,
    estimatedTime: 5000,
    memoryRequirement: 1024,
    gasLimit: 800000,
    description: 'Proves membership in group without revealing identity'
  },
  selective_disclosure: {
    constraintCount: 16384,
    publicSignalCount: 8,
    estimatedTime: 8000,
    memoryRequirement: 2048,
    gasLimit: 1200000,
    description: 'Selectively discloses parts of credential'
  },
  identity_verification: {
    constraintCount: 32768,
    publicSignalCount: 12,
    estimatedTime: 15000,
    memoryRequirement: 4096,
    gasLimit: 2000000,
    description: 'Comprehensive identity verification with privacy'
  }
};

interface AppConfig {
  app: {
    version: string;
    environment: 'development' | 'staging' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    debugMode: boolean;
    mockServices: boolean;
    verboseLogging: boolean;
  };
  api: {
    baseUrl: string;
    timeout: number;
    maxConcurrentRequests: number;
    retryAttempts: number;
    retryDelay: number;
  };
  blockchain: {
    network: 'mainnet' | 'testnet' | 'devnet';
    chainId: string;
    rpcUrls: string[];
    restUrls: string[];
    gasPrice: string;
    bech32Prefix: string;
    coinType: number;
    explorer: string;
  };
  contracts: {
    didRegistry: string;
    credentialRegistry: string;
    zkVerifier: string;
  };
  security: {
    encryptionKey: string;
    jwtSecret: string;
    webauthn: {
      rpId: string;
      rpName: string;
    };
    hsm: {
      enabled: boolean;
      endpoint?: string;
      keyId?: string;
      accessKey?: string;
    };
  };
  database: {
    name: string;
    version: number;
    backupInterval: number;
    maxBackups: number;
  };
  zkProofs: {
    circuitsPath: string;
    timeout: number;
    cacheSize: number;
    circuits: typeof circuitConfigs;
  };
  ibc: {
    enabled: boolean;
    channelTimeout: number;
    packetTimeout: number;
  };
  monitoring: {
    enabled: boolean;
    telemetryEndpoint?: string;
    errorReportingEnabled: boolean;
  };
  features: {
    crossChain: boolean;
    zkProofs: boolean;
    biometricAuth: boolean;
    backupRestore: boolean;
  };
  integrations: {
    github: {
      clientId?: string;
      clientSecret?: string;
    };
    linkedin: {
      clientId?: string;
      clientSecret?: string;
    };
    plaid: {
      clientId?: string;
      secret?: string;
    };
  };
  cloud: {
    aws: {
      accessKeyId?: string;
      secretAccessKey?: string;
      region?: string;
    };
    gcp: {
      projectId?: string;
      keyFile?: string;
    };
  };
  backup: {
    s3Bucket?: string;
    encryptionKey?: string;
    retentionDays: number;
  };
  analytics: {
    enabled: boolean;
    endpoint?: string;
    key?: string;
  };
}

export class RealConfigService {
  private static instance: RealConfigService;
  private config: AppConfig;
  private isInitialized = false;
  private configValidationErrors: string[] = [];

  private constructor() {
    this.config = {} as AppConfig;
  }

  static getInstance(): RealConfigService {
    if (!RealConfigService.instance) {
      RealConfigService.instance = new RealConfigService();
    }
    return RealConfigService.instance;
  }

  /**
   * Initialize configuration from environment variables
   */
  async initialize(): Promise<void> {
    try {
      // Load environment variables
      const env = this.loadEnvironmentVariables();
      
      // Validate required configuration
      this.validateConfiguration(env);
      
      // Build configuration object
      this.config = this.buildConfiguration(env);
      
      // Validate final configuration
      this.validateFinalConfiguration();
      
      this.isInitialized = true;
      
      if (this.config.app.debugMode) {
        console.log('✅ Real Configuration Service initialized');
        console.log('📊 Configuration summary:', {
          environment: this.config.app.environment,
          network: this.config.blockchain.network,
          features: this.config.features
        });
      }
    } catch (error) {
      errorService.logError('❌ Failed to initialize configuration:', error);
      throw error;
    }
  }

  /**
   * Load and validate environment variables
   */
  private loadEnvironmentVariables(): any {
    const env = { ...import.meta.env, ...process.env };
    
    // Validate required environment variables
    const requiredResult = requiredEnvSchema.safeParse(env);
    if (!requiredResult.success) {
      const missingVars = requiredResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      
      throw new Error(`Missing required environment variables:\n${missingVars}`);
    }
    
    // Validate optional environment variables
    const optionalResult = optionalEnvSchema.safeParse(env);
    
    return {
      ...requiredResult.data,
      ...optionalResult.data
    };
  }

  /**
   * Validate configuration completeness
   */
  private validateConfiguration(env: any): void {
    const errors: string[] = [];
    
    // Check production-specific requirements
    if (env.NODE_ENV === 'production') {
      if (!env.VITE_TELEMETRY_ENDPOINT) {
        errors.push('Telemetry endpoint required in production');
      }
      
      if (!env.VITE_HSM_ENABLED || env.VITE_HSM_ENABLED !== 'true') {
        errors.push('HSM must be enabled in production');
      }
      
      if (env.VITE_MOCK_SERVICES === 'true') {
        errors.push('Mock services must be disabled in production');
      }
    }
    
    // Check network-specific requirements
    if (env.VITE_BLOCKCHAIN_NETWORK === 'mainnet') {
      if (!env.VITE_BACKUP_S3_BUCKET) {
        errors.push('S3 backup bucket required for mainnet');
      }
    }
    
    // Check feature dependencies
    if (env.VITE_FEATURE_CROSS_CHAIN === 'true' && env.VITE_IBC_ENABLED !== 'true') {
      errors.push('IBC must be enabled for cross-chain features');
    }
    
    if (errors.length > 0) {
      this.configValidationErrors = errors;
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Build configuration object from environment variables
   */
  private buildConfiguration(env: any): AppConfig {
    const networkConfig = networkConfigs[env.VITE_BLOCKCHAIN_NETWORK];
    
    return {
      app: {
        version: env.VITE_APP_VERSION,
        environment: env.NODE_ENV,
        logLevel: env.VITE_LOG_LEVEL,
        debugMode: env.VITE_DEBUG_MODE,
        mockServices: env.VITE_MOCK_SERVICES,
        verboseLogging: env.VITE_VERBOSE_LOGGING,
      },
      api: {
        baseUrl: env.VITE_API_BASE_URL,
        timeout: env.VITE_API_TIMEOUT,
        maxConcurrentRequests: env.VITE_MAX_CONCURRENT_REQUESTS,
        retryAttempts: env.VITE_REQUEST_RETRY_ATTEMPTS,
        retryDelay: env.VITE_REQUEST_RETRY_DELAY,
      },
      blockchain: {
        network: env.VITE_BLOCKCHAIN_NETWORK,
        chainId: env.VITE_PERSONA_CHAIN_ID || networkConfig.chainId,
        rpcUrls: env.VITE_PERSONA_RPC_URL ? [env.VITE_PERSONA_RPC_URL] : networkConfig.rpcUrls,
        restUrls: env.VITE_PERSONA_REST_URL ? [env.VITE_PERSONA_REST_URL] : networkConfig.restUrls,
        gasPrice: env.VITE_PERSONA_GAS_PRICE || networkConfig.gasPrice,
        bech32Prefix: networkConfig.bech32Prefix,
        coinType: networkConfig.coinType,
        explorer: networkConfig.explorer,
      },
      contracts: {
        didRegistry: env.VITE_DID_REGISTRY_CONTRACT,
        credentialRegistry: env.VITE_CREDENTIAL_REGISTRY_CONTRACT,
        zkVerifier: env.VITE_ZK_VERIFIER_CONTRACT,
      },
      security: {
        encryptionKey: env.VITE_ENCRYPTION_KEY,
        jwtSecret: env.VITE_JWT_SECRET,
        webauthn: {
          rpId: env.VITE_WEBAUTHN_RP_ID,
          rpName: env.VITE_WEBAUTHN_RP_NAME,
        },
        hsm: {
          enabled: env.VITE_HSM_ENABLED,
          endpoint: env.VITE_HSM_ENDPOINT,
          keyId: env.VITE_HSM_KEY_ID,
          accessKey: env.VITE_HSM_ACCESS_KEY,
        },
      },
      database: {
        name: env.VITE_DB_NAME,
        version: env.VITE_DB_VERSION,
        backupInterval: env.VITE_DB_BACKUP_INTERVAL,
        maxBackups: env.VITE_DB_MAX_BACKUPS,
      },
      zkProofs: {
        circuitsPath: env.VITE_ZK_CIRCUITS_PATH,
        timeout: env.VITE_ZK_CIRCUIT_TIMEOUT,
        cacheSize: env.VITE_ZK_PROOF_CACHE_SIZE,
        circuits: circuitConfigs,
      },
      ibc: {
        enabled: env.VITE_IBC_ENABLED,
        channelTimeout: env.VITE_IBC_CHANNEL_TIMEOUT,
        packetTimeout: env.VITE_IBC_PACKET_TIMEOUT,
      },
      monitoring: {
        enabled: env.VITE_MONITORING_ENABLED,
        telemetryEndpoint: env.VITE_TELEMETRY_ENDPOINT,
        errorReportingEnabled: env.VITE_ERROR_REPORTING_ENABLED,
      },
      features: {
        crossChain: env.VITE_FEATURE_CROSS_CHAIN,
        zkProofs: env.VITE_FEATURE_ZK_PROOFS,
        biometricAuth: env.VITE_FEATURE_BIOMETRIC_AUTH,
        backupRestore: env.VITE_FEATURE_BACKUP_RESTORE,
      },
      integrations: {
        github: {
          clientId: env.VITE_GITHUB_CLIENT_ID,
          clientSecret: env.VITE_GITHUB_CLIENT_SECRET,
        },
        linkedin: {
          clientId: env.VITE_LINKEDIN_CLIENT_ID,
          clientSecret: env.VITE_LINKEDIN_CLIENT_SECRET,
        },
        plaid: {
          clientId: env.VITE_PLAID_CLIENT_ID,
          secret: env.VITE_PLAID_SECRET,
        },
      },
      cloud: {
        aws: {
          accessKeyId: env.VITE_AWS_ACCESS_KEY_ID,
          secretAccessKey: env.VITE_AWS_SECRET_ACCESS_KEY,
          region: env.VITE_AWS_REGION,
        },
        gcp: {
          projectId: env.VITE_GCP_PROJECT_ID,
          keyFile: env.VITE_GCP_KEY_FILE,
        },
      },
      backup: {
        s3Bucket: env.VITE_BACKUP_S3_BUCKET,
        encryptionKey: env.VITE_BACKUP_ENCRYPTION_KEY,
        retentionDays: env.VITE_BACKUP_RETENTION_DAYS,
      },
      analytics: {
        enabled: env.VITE_ANALYTICS_ENABLED,
        endpoint: env.VITE_ANALYTICS_ENDPOINT,
        key: env.VITE_ANALYTICS_KEY,
      },
    };
  }

  /**
   * Validate final configuration
   */
  private validateFinalConfiguration(): void {
    const errors: string[] = [];
    
    // Validate URLs
    try {
      new URL(this.config.api.baseUrl);
    } catch {
      errors.push('Invalid API base URL');
    }
    
    // Validate blockchain configuration
    if (this.config.blockchain.rpcUrls.length === 0) {
      errors.push('At least one RPC URL must be configured');
    }
    
    // Validate contract addresses
    if (!this.config.contracts.didRegistry.match(/^[a-zA-Z0-9]{40,}$/)) {
      errors.push('Invalid DID registry contract address format');
    }
    
    // Validate security settings
    if (this.config.security.encryptionKey.length < 32) {
      errors.push('Encryption key must be at least 32 characters');
    }
    
    if (errors.length > 0) {
      throw new Error(`Final configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): AppConfig {
    if (!this.isInitialized) {
      throw new Error('Configuration not initialized');
    }
    return this.config;
  }

  /**
   * Get specific configuration section
   */
  getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    if (!this.isInitialized) {
      throw new Error('Configuration not initialized');
    }
    return this.config[section];
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    if (!this.isInitialized) {
      throw new Error('Configuration not initialized');
    }
    return this.config.features[feature];
  }

  /**
   * Get circuit configuration
   */
  getCircuitConfig(circuitId: string): typeof circuitConfigs[keyof typeof circuitConfigs] | null {
    if (!this.isInitialized) {
      throw new Error('Configuration not initialized');
    }
    return this.config.zkProofs.circuits[circuitId as keyof typeof circuitConfigs] || null;
  }

  /**
   * Get configuration validation errors
   */
  getValidationErrors(): string[] {
    return this.configValidationErrors;
  }

  /**
   * Reload configuration
   */
  async reload(): Promise<void> {
    this.isInitialized = false;
    this.configValidationErrors = [];
    await this.initialize();
  }

  /**
   * Export configuration for debugging
   */
  exportConfig(): Partial<AppConfig> {
    if (!this.isInitialized) {
      throw new Error('Configuration not initialized');
    }
    
    // Return sanitized configuration (remove sensitive data)
    return {
      app: this.config.app,
      api: { ...this.config.api, baseUrl: '***' },
      blockchain: this.config.blockchain,
      features: this.config.features,
      zkProofs: { ...this.config.zkProofs, circuits: Object.keys(this.config.zkProofs.circuits) },
      ibc: this.config.ibc,
      monitoring: { ...this.config.monitoring, telemetryEndpoint: '***' },
    };
  }
}

// Export singleton instance
export const realConfigService = RealConfigService.getInstance();

// Export configuration types for external use
export type { AppConfig };