/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Application Configuration
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_ENVIRONMENT: string;
  readonly VITE_APP_BASE_URL: string;

  // API Configuration
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_WALLET_API_URL: string;
  readonly VITE_CONNECTOR_API_URL: string;
  readonly VITE_BACKEND_URL: string;

  // PersonaChain Configuration
  readonly VITE_PERSONA_CHAIN_ID: string;
  readonly VITE_PERSONA_CHAIN_NAME: string;
  readonly VITE_PERSONA_CHAIN_RPC: string;
  readonly VITE_PERSONA_CHAIN_REST: string;
  readonly VITE_PERSONA_CHAIN_FAUCET: string;
  readonly VITE_PERSONA_RPC_URL: string;
  readonly VITE_PERSONA_REST_URL: string;
  readonly VITE_PERSONA_GAS_PRICE: string;
  readonly VITE_PERSONA_BECH32_PREFIX: string;

  // Legacy Blockchain Configuration
  readonly VITE_CHAIN_ID: string;
  readonly VITE_CHAIN_NAME: string;
  readonly VITE_BLOCKCHAIN_RPC: string;
  readonly VITE_BLOCKCHAIN_REST: string;
  readonly VITE_BLOCKCHAIN_NETWORK: string;

  // Multi-Chain Configuration
  readonly VITE_ETHEREUM_RPC_URL: string;
  readonly VITE_POLYGON_RPC_URL: string;
  readonly VITE_BSC_RPC_URL: string;
  readonly VITE_BLOCK_EXPLORER_URL: string;

  // Smart Contract Addresses
  readonly VITE_DID_REGISTRY_ADDRESS: string;
  readonly VITE_PSA_CONTRACT_ADDRESS: string;
  readonly VITE_PSA_TOKEN_ETH: string;
  readonly VITE_PSA_TOKEN_POLYGON: string;
  readonly VITE_PSA_TOKEN_BSC: string;

  // Identity & Authentication
  readonly VITE_DID_METHOD: string;
  readonly VITE_WEBAUTHN_RP_ID: string;
  readonly VITE_WEBAUTHN_RP_NAME: string;

  // Third-Party Integrations
  readonly VITE_GITHUB_CLIENT_ID: string;
  readonly VITE_GITHUB_CLIENT_SECRET: string;
  readonly VITE_GITHUB_REDIRECT_URI: string;
  readonly VITE_LINKEDIN_CLIENT_ID: string;
  readonly VITE_LINKEDIN_CLIENT_SECRET: string;
  readonly VITE_LINKEDIN_REDIRECT_URI: string;
  readonly VITE_PLAID_CLIENT_ID: string;
  readonly VITE_PLAID_SECRET: string;
  readonly VITE_PLAID_ENV: string;
  readonly VITE_PLAID_ENVIRONMENT: string;

  // EUDI Wallet Compliance
  readonly VITE_EUDI_TRUST_REGISTRY_URL: string;
  readonly VITE_EUDI_ISSUER_REGISTRY_URL: string;

  // Security Configuration
  readonly VITE_ENCRYPTION_KEY_SIZE: string;
  readonly VITE_JWT_EXPIRATION: string;
  readonly VITE_SESSION_TIMEOUT: string;
  readonly VITE_MAX_LOGIN_ATTEMPTS: string;
  readonly VITE_RATE_LIMIT_WINDOW: string;
  readonly VITE_RATE_LIMIT_MAX: string;

  // Feature Flags
  readonly VITE_ENABLE_CREDENTIALS: string;
  readonly VITE_ENABLE_BIOMETRICS: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ZK_PROOFS_ENABLED: string;
  readonly VITE_BIOMETRIC_AUTH_ENABLED: string;
  readonly VITE_ANDROID_CREDENTIALS_ENABLED: string;
  readonly VITE_DEMO_MODE: string;

  // Logging & Monitoring
  readonly VITE_LOG_LEVEL: string;
  readonly VITE_ANALYTICS_ENABLED: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string;

  // Development & Debugging
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_ENABLE_DEVTOOLS: string;
  readonly VITE_MOCK_SERVICES: string;
  readonly VITE_BYPASS_AUTH: string;

  // Performance Configuration
  readonly VITE_CACHE_TIMEOUT: string;
  readonly VITE_REQUEST_TIMEOUT: string;
  readonly VITE_RETRY_ATTEMPTS: string;
  readonly VITE_RETRY_DELAY: string;

  // Localization
  readonly VITE_DEFAULT_LOCALE: string;
  readonly VITE_SUPPORTED_LOCALES: string;
  readonly VITE_CURRENCY_CODE: string;
  readonly VITE_TIMEZONE: string;

  // Legacy/Deprecated (for backwards compatibility)
  readonly VITE_ENVIRONMENT: string;
  readonly NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
