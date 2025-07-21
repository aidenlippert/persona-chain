import { z } from 'zod';

// =============================================================================
// ENVIRONMENT VALIDATION SCHEMAS
// =============================================================================

const EnvironmentSchema = z.enum(['development', 'staging', 'production']);
const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
const NetworkSchema = z.enum(['ethereum', 'polygon', 'bsc']);
const PlaidEnvironmentSchema = z.enum(['sandbox', 'development', 'production']);

// =============================================================================
// CONFIGURATION SCHEMAS
// =============================================================================

const AppConfigSchema = z.object({
  name: z.string().min(1, 'App name is required'),
  version: z.string().min(1, 'App version is required'),
  environment: EnvironmentSchema,
  baseUrl: z.string().url('Invalid base URL'),
});

const ApiConfigSchema = z.object({
  baseUrl: z.string().url('Invalid API base URL'),
  walletApiUrl: z.string().url('Invalid wallet API URL'),
  connectorApiUrl: z.string().url('Invalid connector API URL'),
  timeout: z.number().positive('API timeout must be positive'),
  retryAttempts: z.number().min(0, 'Retry attempts must be non-negative'),
  retryDelay: z.number().positive('Retry delay must be positive'),
});

const PersonaChainConfigSchema = z.object({
  chainId: z.string().min(1, 'Chain ID is required'),
  chainName: z.string().min(1, 'Chain name is required'),
  rpcUrl: z.string().url('Invalid RPC URL'),
  restUrl: z.string().url('Invalid REST URL'),
  faucetUrl: z.string().url('Invalid faucet URL').optional(),
  gasPrice: z.string().min(1, 'Gas price is required'),
  bech32Prefix: z.string().min(1, 'Bech32 prefix is required'),
});

const LegacyBlockchainConfigSchema = z.object({
  chainId: z.string().min(1, 'Legacy chain ID is required'),
  chainName: z.string().min(1, 'Legacy chain name is required'),
  rpcUrl: z.string().url('Invalid legacy RPC URL'),
  restUrl: z.string().url('Invalid legacy REST URL'),
  network: NetworkSchema,
});

const MultiChainConfigSchema = z.object({
  ethereum: z.object({
    rpcUrl: z.string().url('Invalid Ethereum RPC URL'),
    psaToken: z.string().min(1, 'PSA token address is required'),
  }),
  polygon: z.object({
    rpcUrl: z.string().url('Invalid Polygon RPC URL'),
    psaToken: z.string().min(1, 'PSA token address is required'),
  }),
  bsc: z.object({
    rpcUrl: z.string().url('Invalid BSC RPC URL'),
    psaToken: z.string().min(1, 'PSA token address is required'),
  }),
  blockExplorerUrl: z.string().url('Invalid block explorer URL'),
});

const SmartContractConfigSchema = z.object({
  didRegistryAddress: z.string().min(1, 'DID registry address is required'),
  psaContractAddress: z.string().min(1, 'PSA contract address is required'),
});

const IdentityConfigSchema = z.object({
  didMethod: z.string().min(1, 'DID method is required'),
  webauthn: z.object({
    rpId: z.string().min(1, 'WebAuthn RP ID is required'),
    rpName: z.string().min(1, 'WebAuthn RP name is required'),
  }),
});

const ThirdPartyIntegrationsSchema = z.object({
  github: z.object({
    clientId: z.string().min(1, 'GitHub client ID is required'),
    clientSecret: z.string().min(1, 'GitHub client secret is required'),
    redirectUri: z.string().url('Invalid GitHub redirect URI'),
  }),
  linkedin: z.object({
    clientId: z.string().min(1, 'LinkedIn client ID is required'),
    clientSecret: z.string().min(1, 'LinkedIn client secret is required'),
    redirectUri: z.string().url('Invalid LinkedIn redirect URI'),
  }),
  plaid: z.object({
    clientId: z.string().min(1, 'Plaid client ID is required'),
    secret: z.string().min(1, 'Plaid secret is required'),
    environment: PlaidEnvironmentSchema,
  }),
});

const EudiConfigSchema = z.object({
  trustRegistryUrl: z.string().url('Invalid EUDI trust registry URL'),
  issuerRegistryUrl: z.string().url('Invalid EUDI issuer registry URL'),
});

const SecurityConfigSchema = z.object({
  encryptionKeySize: z.number().positive('Encryption key size must be positive'),
  jwtExpiration: z.number().positive('JWT expiration must be positive'),
  sessionTimeout: z.number().positive('Session timeout must be positive'),
  maxLoginAttempts: z.number().positive('Max login attempts must be positive'),
  rateLimitWindow: z.number().positive('Rate limit window must be positive'),
  rateLimitMax: z.number().positive('Rate limit max must be positive'),
});

const FeatureFlagsSchema = z.object({
  enableCredentials: z.boolean(),
  enableBiometrics: z.boolean(),
  enableAnalytics: z.boolean(),
  zkProofsEnabled: z.boolean(),
  biometricAuthEnabled: z.boolean(),
  androidCredentialsEnabled: z.boolean(),
  demoMode: z.boolean(),
});

const LoggingConfigSchema = z.object({
  logLevel: LogLevelSchema,
  analyticsEnabled: z.boolean(),
  sentryDsn: z.string().optional(),
  enablePerformanceMonitoring: z.boolean(),
});

const DevelopmentConfigSchema = z.object({
  debugMode: z.boolean(),
  enableDevtools: z.boolean(),
  mockServices: z.boolean(),
  bypassAuth: z.boolean(),
});

const PerformanceConfigSchema = z.object({
  cacheTimeout: z.number().positive('Cache timeout must be positive'),
  requestTimeout: z.number().positive('Request timeout must be positive'),
  retryAttempts: z.number().min(0, 'Retry attempts must be non-negative'),
  retryDelay: z.number().positive('Retry delay must be positive'),
});

const LocalizationConfigSchema = z.object({
  defaultLocale: z.string().min(1, 'Default locale is required'),
  supportedLocales: z.array(z.string().min(1)),
  currencyCode: z.string().min(1, 'Currency code is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

// =============================================================================
// MAIN CONFIGURATION SCHEMA
// =============================================================================

export const ConfigSchema = z.object({
  app: AppConfigSchema,
  api: ApiConfigSchema,
  personaChain: PersonaChainConfigSchema,
  legacyBlockchain: LegacyBlockchainConfigSchema,
  multiChain: MultiChainConfigSchema,
  smartContracts: SmartContractConfigSchema,
  identity: IdentityConfigSchema,
  thirdParty: ThirdPartyIntegrationsSchema,
  eudi: EudiConfigSchema,
  security: SecurityConfigSchema,
  features: FeatureFlagsSchema,
  logging: LoggingConfigSchema,
  development: DevelopmentConfigSchema,
  performance: PerformanceConfigSchema,
  localization: LocalizationConfigSchema,
});

// =============================================================================
// TYPESCRIPT TYPES
// =============================================================================

export type Environment = z.infer<typeof EnvironmentSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
export type Network = z.infer<typeof NetworkSchema>;
export type PlaidEnvironment = z.infer<typeof PlaidEnvironmentSchema>;

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ApiConfig = z.infer<typeof ApiConfigSchema>;
export type PersonaChainConfig = z.infer<typeof PersonaChainConfigSchema>;
export type LegacyBlockchainConfig = z.infer<typeof LegacyBlockchainConfigSchema>;
export type MultiChainConfig = z.infer<typeof MultiChainConfigSchema>;
export type SmartContractConfig = z.infer<typeof SmartContractConfigSchema>;
export type IdentityConfig = z.infer<typeof IdentityConfigSchema>;
export type ThirdPartyIntegrationsConfig = z.infer<typeof ThirdPartyIntegrationsSchema>;
export type EudiConfig = z.infer<typeof EudiConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type DevelopmentConfig = z.infer<typeof DevelopmentConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type LocalizationConfig = z.infer<typeof LocalizationConfigSchema>;

export type Config = z.infer<typeof ConfigSchema>;

// =============================================================================
// CONFIGURATION VALIDATION ERRORS
// =============================================================================

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ConfigurationValidationError extends ConfigurationError {
  constructor(
    message: string,
    public readonly errors: z.ZodError,
    field?: string
  ) {
    super(message, field);
    this.name = 'ConfigurationValidationError';
  }
}

// =============================================================================
// ENVIRONMENT VARIABLE HELPERS
// =============================================================================

export const getEnvVar = (key: string, fallback?: string): string => {
  const value = import.meta.env[key] || fallback;
  if (value === undefined) {
    throw new ConfigurationError(`Environment variable ${key} is required but not set`);
  }
  return value;
};

export const getEnvVarOptional = (key: string, fallback?: string): string | undefined => {
  return import.meta.env[key] || fallback;
};

export const getEnvVarAsNumber = (key: string, fallback?: number): number => {
  const value = import.meta.env[key];
  if (value === undefined) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new ConfigurationError(`Environment variable ${key} is required but not set`);
  }
  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new ConfigurationError(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return parsed;
};

export const getEnvVarAsBoolean = (key: string, fallback?: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new ConfigurationError(`Environment variable ${key} is required but not set`);
  }
  return value.toLowerCase() === 'true';
};

export const getEnvVarAsArray = (key: string, separator: string = ',', fallback?: string[]): string[] => {
  const value = import.meta.env[key];
  if (value === undefined) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new ConfigurationError(`Environment variable ${key} is required but not set`);
  }
  return value.split(separator).map(item => item.trim()).filter(item => item.length > 0);
};

// =============================================================================
// CONFIGURATION FACTORY
// =============================================================================

export const createConfig = (): Config => {
  try {
    const config: Config = {
      app: {
        name: getEnvVar('VITE_APP_NAME', 'PersonaPass Wallet'),
        version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
        environment: getEnvVar('VITE_APP_ENVIRONMENT', 'development') as Environment,
        baseUrl: getEnvVar('VITE_APP_BASE_URL', 'http://localhost:5175'),
      },
      api: {
        baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080'),
        walletApiUrl: getEnvVar('VITE_WALLET_API_URL', 'http://localhost:3001'),
        connectorApiUrl: getEnvVar('VITE_CONNECTOR_API_URL', 'http://localhost:8080'),
        timeout: getEnvVarAsNumber('VITE_REQUEST_TIMEOUT', 30000),
        retryAttempts: getEnvVarAsNumber('VITE_RETRY_ATTEMPTS', 3),
        retryDelay: getEnvVarAsNumber('VITE_RETRY_DELAY', 1000),
      },
      personaChain: {
        chainId: getEnvVar('VITE_PERSONA_CHAIN_ID', 'personachain-testnet-1'),
        chainName: getEnvVar('VITE_PERSONA_CHAIN_NAME', 'PersonaChain Testnet'),
        rpcUrl: getEnvVar('VITE_PERSONA_CHAIN_RPC', 'https://rpc.testnet.personachain.io'),
        restUrl: getEnvVar('VITE_PERSONA_CHAIN_REST', 'https://api.testnet.personachain.io'),
        faucetUrl: getEnvVarOptional('VITE_PERSONA_CHAIN_FAUCET'),
        gasPrice: getEnvVar('VITE_PERSONA_GAS_PRICE', '0.025uprsn'),
        bech32Prefix: getEnvVar('VITE_PERSONA_BECH32_PREFIX', 'persona'),
      },
      legacyBlockchain: {
        chainId: getEnvVar('VITE_CHAIN_ID', 'persona-1'),
        chainName: getEnvVar('VITE_CHAIN_NAME', 'PersonaChain'),
        rpcUrl: getEnvVar('VITE_BLOCKCHAIN_RPC', 'https://rpc.personachain.com'),
        restUrl: getEnvVar('VITE_BLOCKCHAIN_REST', 'https://rest.personachain.com'),
        network: getEnvVar('VITE_BLOCKCHAIN_NETWORK', 'polygon') as Network,
      },
      multiChain: {
        ethereum: {
          rpcUrl: getEnvVar('VITE_ETHEREUM_RPC_URL', 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID'),
          psaToken: getEnvVar('VITE_PSA_TOKEN_ETH', '0x0000000000000000000000000000000000000000'),
        },
        polygon: {
          rpcUrl: getEnvVar('VITE_POLYGON_RPC_URL', 'https://polygon-rpc.com'),
          psaToken: getEnvVar('VITE_PSA_TOKEN_POLYGON', '0x0000000000000000000000000000000000000000'),
        },
        bsc: {
          rpcUrl: getEnvVar('VITE_BSC_RPC_URL', 'https://bsc-dataseed.binance.org'),
          psaToken: getEnvVar('VITE_PSA_TOKEN_BSC', '0x0000000000000000000000000000000000000000'),
        },
        blockExplorerUrl: getEnvVar('VITE_BLOCK_EXPLORER_URL', 'https://polygonscan.com'),
      },
      smartContracts: {
        didRegistryAddress: getEnvVar('VITE_DID_REGISTRY_ADDRESS', 'persona14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s0k0puz'),
        psaContractAddress: getEnvVar('VITE_PSA_CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000'),
      },
      identity: {
        didMethod: getEnvVar('VITE_DID_METHOD', 'persona'),
        webauthn: {
          rpId: getEnvVar('VITE_WEBAUTHN_RP_ID', 'localhost'),
          rpName: getEnvVar('VITE_WEBAUTHN_RP_NAME', 'PersonaPass Development'),
        },
      },
      thirdParty: {
        github: {
          clientId: getEnvVar('VITE_GITHUB_CLIENT_ID', ''),
          clientSecret: getEnvVar('VITE_GITHUB_CLIENT_SECRET', ''),
          redirectUri: getEnvVar('VITE_GITHUB_REDIRECT_URI', 'http://localhost:5175/auth/github/callback'),
        },
        linkedin: {
          clientId: getEnvVar('VITE_LINKEDIN_CLIENT_ID', ''),
          clientSecret: getEnvVar('VITE_LINKEDIN_CLIENT_SECRET', ''),
          redirectUri: getEnvVar('VITE_LINKEDIN_REDIRECT_URI', 'http://localhost:5175/auth/linkedin/callback'),
        },
        plaid: {
          clientId: getEnvVar('VITE_PLAID_CLIENT_ID', ''),
          secret: getEnvVar('VITE_PLAID_SECRET', ''),
          environment: getEnvVar('VITE_PLAID_ENVIRONMENT', 'sandbox') as PlaidEnvironment,
        },
      },
      eudi: {
        trustRegistryUrl: getEnvVar('VITE_EUDI_TRUST_REGISTRY_URL', 'https://trust.eidas.europa.eu'),
        issuerRegistryUrl: getEnvVar('VITE_EUDI_ISSUER_REGISTRY_URL', 'https://issuers.eidas.europa.eu'),
      },
      security: {
        encryptionKeySize: getEnvVarAsNumber('VITE_ENCRYPTION_KEY_SIZE', 256),
        jwtExpiration: getEnvVarAsNumber('VITE_JWT_EXPIRATION', 3600),
        sessionTimeout: getEnvVarAsNumber('VITE_SESSION_TIMEOUT', 1800),
        maxLoginAttempts: getEnvVarAsNumber('VITE_MAX_LOGIN_ATTEMPTS', 5),
        rateLimitWindow: getEnvVarAsNumber('VITE_RATE_LIMIT_WINDOW', 900),
        rateLimitMax: getEnvVarAsNumber('VITE_RATE_LIMIT_MAX', 100),
      },
      features: {
        enableCredentials: getEnvVarAsBoolean('VITE_ENABLE_CREDENTIALS', true),
        enableBiometrics: getEnvVarAsBoolean('VITE_ENABLE_BIOMETRICS', true),
        enableAnalytics: getEnvVarAsBoolean('VITE_ENABLE_ANALYTICS', false),
        zkProofsEnabled: getEnvVarAsBoolean('VITE_ZK_PROOFS_ENABLED', true),
        biometricAuthEnabled: getEnvVarAsBoolean('VITE_BIOMETRIC_AUTH_ENABLED', true),
        androidCredentialsEnabled: getEnvVarAsBoolean('VITE_ANDROID_CREDENTIALS_ENABLED', true),
        demoMode: getEnvVarAsBoolean('VITE_DEMO_MODE', false),
      },
      logging: {
        logLevel: getEnvVar('VITE_LOG_LEVEL', 'info') as LogLevel,
        analyticsEnabled: getEnvVarAsBoolean('VITE_ANALYTICS_ENABLED', false),
        sentryDsn: getEnvVarOptional('VITE_SENTRY_DSN'),
        enablePerformanceMonitoring: getEnvVarAsBoolean('VITE_ENABLE_PERFORMANCE_MONITORING', false),
      },
      development: {
        debugMode: getEnvVarAsBoolean('VITE_DEBUG_MODE', false),
        enableDevtools: getEnvVarAsBoolean('VITE_ENABLE_DEVTOOLS', false),
        mockServices: getEnvVarAsBoolean('VITE_MOCK_SERVICES', false),
        bypassAuth: getEnvVarAsBoolean('VITE_BYPASS_AUTH', false),
      },
      performance: {
        cacheTimeout: getEnvVarAsNumber('VITE_CACHE_TIMEOUT', 300),
        requestTimeout: getEnvVarAsNumber('VITE_REQUEST_TIMEOUT', 30000),
        retryAttempts: getEnvVarAsNumber('VITE_RETRY_ATTEMPTS', 3),
        retryDelay: getEnvVarAsNumber('VITE_RETRY_DELAY', 1000),
      },
      localization: {
        defaultLocale: getEnvVar('VITE_DEFAULT_LOCALE', 'en'),
        supportedLocales: getEnvVarAsArray('VITE_SUPPORTED_LOCALES', ',', ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh']),
        currencyCode: getEnvVar('VITE_CURRENCY_CODE', 'USD'),
        timezone: getEnvVar('VITE_TIMEZONE', 'UTC'),
      },
    };

    // Validate the configuration
    const validatedConfig = ConfigSchema.parse(config);
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ConfigurationValidationError(
        'Configuration validation failed',
        error
      );
    }
    throw error;
  }
};