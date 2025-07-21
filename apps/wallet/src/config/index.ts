import { z } from 'zod';
import { errorService } from "@/services/errorService";

// Environment validation schema
const envSchema = z.object({
  // Application Configuration
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  VITE_DEMO_MODE: z.string().transform(val => val === 'true').default('false'),

  // API Configuration
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000'),
  VITE_CONNECTOR_API_URL: z.string().url().default('http://localhost:8080'),
  VITE_API_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('10000'),

  // Blockchain Configuration - UPDATED FOR LIVE PERSONACHAIN
  VITE_BLOCKCHAIN_NETWORK: z.enum(['ethereum', 'polygon', 'bsc', 'persona-chain', 'personachain']).transform(val => {
    // Normalize personachain to persona-chain
    return val === 'personachain' ? 'persona-chain' : val;
  }).default('persona-chain'),
  VITE_CHAIN_ID: z.string().default('personachain-1'),
  VITE_BLOCKCHAIN_RPC: z.string().url().optional().default('https://personachain-proxy.aidenlippert.workers.dev'),
  VITE_BLOCKCHAIN_REST: z.string().url().optional().default('https://personachain-proxy.aidenlippert.workers.dev/api'),
  VITE_PERSONA_GAS_PRICE: z.string().default('0.025persona'),

  // Smart Contract Addresses
  VITE_DID_REGISTRY_ADDRESS: z.string().optional().default(''),
  VITE_PSA_CONTRACT_ADDRESS: z.string().optional().default(''),

  // GitHub Integration
  VITE_GITHUB_CLIENT_ID: z.string().default(''),
  VITE_GITHUB_CLIENT_SECRET: z.string().default(''),
  VITE_GITHUB_OAUTH_SCOPE: z.string().default('user:email,read:user'),
  VITE_GITHUB_API_BASE_URL: z.string().url().default('https://api.github.com'),
  VITE_GITHUB_AUTH_URL: z.string().url().default('https://github.com/login/oauth/authorize'),

  // LinkedIn Integration
  VITE_LINKEDIN_CLIENT_ID: z.string().default(''),
  VITE_LINKEDIN_CLIENT_SECRET: z.string().default(''),
  VITE_LINKEDIN_OAUTH_SCOPE: z.string().default('r_liteprofile r_emailaddress'),
  VITE_LINKEDIN_API_BASE_URL: z.string().url().default('https://api.linkedin.com'),
  VITE_LINKEDIN_AUTH_URL: z.string().url().default('https://www.linkedin.com/oauth/v2/authorization'),

  // Plaid Integration
  VITE_PLAID_CLIENT_ID: z.string().default(''),
  VITE_PLAID_SECRET: z.string().default(''),
  VITE_PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  VITE_PLAID_API_BASE_URL: z.string().url().default('https://production.plaid.com'),

  // Authentication & Security
  VITE_JWT_ISSUER: z.string().url().default('https://auth.personapass.com'),
  VITE_WEBAUTHN_RP_ID: z.string().default('localhost'),
  VITE_WEBAUTHN_RP_NAME: z.string().default('PersonaPass Identity Wallet'),
  VITE_ENCRYPTION_KEY: z.string().optional(),

  // Monitoring & Analytics
  VITE_SENTRY_DSN: z.union([z.string().url(), z.literal('')]).optional(),
  VITE_ANALYTICS_ID: z.string().optional(),

  // Feature Flags
  VITE_FEATURE_ZK_PROOFS: z.string().transform(val => val === 'true').default('true'),
  VITE_FEATURE_BIOMETRIC_AUTH: z.string().transform(val => val === 'true').default('true'),
  VITE_FEATURE_GUARDIAN_RECOVERY: z.string().transform(val => val === 'true').default('true'),
  VITE_FEATURE_CROSS_CHAIN: z.string().transform(val => val === 'true').default('true'),

  // Development Settings
  VITE_CORS_ORIGIN: z.string().default('http://localhost:5173'),
  VITE_ENABLE_DEVTOOLS: z.string().transform(val => val === 'true').default('false'),
  VITE_MOCK_INTEGRATIONS: z.string().transform(val => val === 'true').default('false'),
});

// Type inference from schema
type EnvConfig = z.infer<typeof envSchema>;

// Application configuration interface
export interface AppConfig {
  app: {
    version: string;
    environment: 'development' | 'staging' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    demoMode: boolean;
  };
  api: {
    baseUrl: string;
    connectorUrl: string;
    timeout: number;
  };
  blockchain: {
    network: 'ethereum' | 'polygon' | 'bsc' | 'persona-chain';
    chainId: string;
    rpcUrl: string;
    restUrl: string;
    gasPrice: string;
  };
  contracts: {
    didRegistry?: string;
    psaContract?: string;
  };
  auth: {
    providers: {
      github: {
        clientId: string;
        clientSecret: string;
        scope: string;
        apiBaseUrl: string;
      };
      linkedin: {
        clientId: string;
        clientSecret: string;
        scope: string;
        apiBaseUrl: string;
      };
      plaid: {
        clientId: string;
        secret: string;
        environment: 'sandbox' | 'development' | 'production';
        apiBaseUrl: string;
      };
    };
  };
  security: {
    jwtIssuer: string;
    webauthn: {
      rpId: string;
      rpName: string;
    };
    encryptionKey?: string;
  };
  monitoring: {
    sentryDsn?: string;
    analyticsId?: string;
  };
  features: {
    zkProofs: boolean;
    biometricAuth: boolean;
    guardianRecovery: boolean;
    crossChain: boolean;
  };
  development: {
    corsOrigin: string;
    enableDevtools: boolean;
    mockIntegrations: boolean;
  };
}

// Production fallback configurations
const fallbackConfig = {
  blockchain: {
    rpcUrls: {
      ethereum: [
        'https://rpc.ankr.com/eth',
        'https://eth.llamarpc.com',
        'https://ethereum.publicnode.com'
      ],
      polygon: [
        'https://polygon-rpc.com',
        'https://rpc.ankr.com/polygon',
        'https://polygon.llamarpc.com'
      ],
      bsc: [
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://bsc-dataseed1.ninicoin.io'
      ],
      'persona-chain': [
        'https://personachain-proxy.aidenlippert.workers.dev',
        'https://rpc.personachain.com',
        'https://persona-rpc.cosmos.network'
      ]
    },
    restUrls: {
      ethereum: ['https://api.etherscan.io/api'],
      polygon: ['https://api.polygonscan.com/api'],
      bsc: ['https://api.bscscan.com/api'],
      'persona-chain': [
        'https://personachain-proxy.aidenlippert.workers.dev/api',
        'https://api.personachain.com',
        'https://persona-api.cosmos.network'
      ]
    }
  }
};

// Configuration validation and creation
class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    try {
      this.config = this.createConfig();
      console.log('✅ Configuration created successfully');
    } catch (error) {
      errorService.logError('❌ Failed to create configuration:', error);
      throw error;
    }
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private createConfig(): AppConfig {
    // Validate environment variables
    const env = envSchema.parse(import.meta.env);
    
    // Create configuration with fallbacks
    const config: AppConfig = {
      app: {
        version: env.VITE_APP_VERSION,
        environment: env.VITE_ENVIRONMENT,
        logLevel: env.VITE_LOG_LEVEL,
        demoMode: env.VITE_DEMO_MODE,
      },
      api: {
        baseUrl: env.VITE_API_BASE_URL,
        connectorUrl: env.VITE_CONNECTOR_API_URL,
        timeout: env.VITE_API_TIMEOUT,
      },
      blockchain: {
        network: env.VITE_BLOCKCHAIN_NETWORK,
        chainId: env.VITE_CHAIN_ID,
        rpcUrl: env.VITE_BLOCKCHAIN_RPC || this.getFallbackRpcUrl(env.VITE_BLOCKCHAIN_NETWORK),
        restUrl: env.VITE_BLOCKCHAIN_REST || this.getFallbackRestUrl(env.VITE_BLOCKCHAIN_NETWORK),
        gasPrice: env.VITE_PERSONA_GAS_PRICE,
      },
      contracts: {
        didRegistry: env.VITE_DID_REGISTRY_ADDRESS,
        psaContract: env.VITE_PSA_CONTRACT_ADDRESS,
      },
      auth: {
        providers: {
          github: {
            clientId: env.VITE_GITHUB_CLIENT_ID,
            clientSecret: env.VITE_GITHUB_CLIENT_SECRET,
            scope: env.VITE_GITHUB_OAUTH_SCOPE,
            apiBaseUrl: env.VITE_GITHUB_API_BASE_URL,
          },
          linkedin: {
            clientId: env.VITE_LINKEDIN_CLIENT_ID,
            clientSecret: env.VITE_LINKEDIN_CLIENT_SECRET,
            scope: env.VITE_LINKEDIN_OAUTH_SCOPE,
            apiBaseUrl: env.VITE_LINKEDIN_API_BASE_URL,
          },
          plaid: {
            clientId: env.VITE_PLAID_CLIENT_ID,
            secret: env.VITE_PLAID_SECRET,
            environment: env.VITE_PLAID_ENV,
            apiBaseUrl: env.VITE_PLAID_API_BASE_URL,
          },
        },
      },
      security: {
        jwtIssuer: env.VITE_JWT_ISSUER,
        webauthn: {
          rpId: env.VITE_WEBAUTHN_RP_ID,
          rpName: env.VITE_WEBAUTHN_RP_NAME,
        },
        encryptionKey: env.VITE_ENCRYPTION_KEY,
      },
      monitoring: {
        sentryDsn: env.VITE_SENTRY_DSN,
        analyticsId: env.VITE_ANALYTICS_ID,
      },
      features: {
        zkProofs: env.VITE_FEATURE_ZK_PROOFS,
        biometricAuth: env.VITE_FEATURE_BIOMETRIC_AUTH,
        guardianRecovery: env.VITE_FEATURE_GUARDIAN_RECOVERY,
        crossChain: env.VITE_FEATURE_CROSS_CHAIN,
      },
      development: {
        corsOrigin: env.VITE_CORS_ORIGIN,
        enableDevtools: env.VITE_ENABLE_DEVTOOLS,
        mockIntegrations: env.VITE_MOCK_INTEGRATIONS,
      },
    };

    // Validate final configuration
    this.validateConfig(config);
    
    return config;
  }

  private getFallbackRpcUrl(network: string): string {
    return fallbackConfig.blockchain.rpcUrls[network as keyof typeof fallbackConfig.blockchain.rpcUrls]?.[0] || '';
  }

  private getFallbackRestUrl(network: string): string {
    return fallbackConfig.blockchain.restUrls[network as keyof typeof fallbackConfig.blockchain.restUrls]?.[0] || '';
  }

  private validateConfig(config: AppConfig): void {
    const errors: string[] = [];

    // Safety check
    if (!config || !config.app) {
      console.warn('⚠️ Config or config.app is undefined, skipping validation');
      return;
    }

    // Validate production requirements
    if (config.app.environment === 'production') {
      if (!config.contracts.didRegistry) {
        errors.push('DID Registry contract address is required in production');
      }
      if (!config.contracts.psaContract) {
        errors.push('PSA contract address is required in production');
      }
      if (!config.security.encryptionKey) {
        errors.push('Encryption key is required in production');
      }
      if (config.development.mockIntegrations) {
        errors.push('Mock integrations must be disabled in production');
      }
    }

    // Validate authentication providers
    if (config.auth.providers.github.clientId && !config.auth.providers.github.clientSecret) {
      errors.push('GitHub client secret is required when client ID is provided');
    }
    if (config.auth.providers.linkedin.clientId && !config.auth.providers.linkedin.clientSecret) {
      errors.push('LinkedIn client secret is required when client ID is provided');
    }
    if (config.auth.providers.plaid.clientId && !config.auth.providers.plaid.secret) {
      errors.push('Plaid secret is required when client ID is provided');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }

  isProduction(): boolean {
    return this.config.app.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }

  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  getPersonaChainConfig() {
    return {
      chainId: this.config.blockchain.chainId,
      rpcUrl: this.config.blockchain.rpcUrl,
      restUrl: this.config.blockchain.restUrl,
      gasPrice: this.config.blockchain.gasPrice,
      bech32Prefix: 'persona'
    };
  }

  getFeatureFlags() {
    return this.config.features;
  }

  getDevelopmentConfig() {
    return {
      debugMode: this.config.development?.enableDevtools || false,
      demoMode: this.config.app.demoMode || false
    };
  }

  initialize() {
    // Initialize configuration service
    this.validateConfig(this.config);
    return Promise.resolve();
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance().getConfig();
export const configManager = ConfigManager.getInstance();
export const configService = configManager;

// Export utility functions for backward compatibility
export const getApiUrl = (): string => config.api.baseUrl;
export const getConnectorApiUrl = (): string => config.api.connectorUrl;
export const getBlockchainConfig = () => config.blockchain;
export const getAuthConfig = () => config.auth;

// Export for testing
export { ConfigManager, fallbackConfig };