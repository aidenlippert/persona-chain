import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'finance-connector-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || 'finance-encryption-key-32bytes!',
  apiKey: process.env.FINANCE_API_KEY || 'finance-connector-api-key',
  
  // Plaid API configuration (Production Ready)
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID || 'plaid-client-id-placeholder',
    secret: process.env.PLAID_SECRET || 'plaid-secret-placeholder',
    environment: process.env.PLAID_ENV || 'sandbox', // sandbox, development, production
    baseUrl: process.env.PLAID_BASE_URL || 'https://production.plaid.com',
    redirectUri: process.env.PLAID_REDIRECT_URI || 'http://localhost:3002/oauth/callback/plaid',
    products: ['transactions', 'accounts', 'identity', 'assets', 'liabilities'],
    webhookUrl: process.env.PLAID_WEBHOOK_URL || 'https://your-domain.com/webhooks/plaid'
  },

  // Yodlee API configuration
  yodlee: {
    baseUrl: process.env.YODLEE_BASE_URL || 'https://api.yodlee.com/ysl',
    clientId: process.env.YODLEE_CLIENT_ID || 'yodlee-client-id-placeholder',
    secret: process.env.YODLEE_SECRET || 'yodlee-secret-placeholder',
    username: process.env.YODLEE_USERNAME || 'yodlee-username-placeholder',
    password: process.env.YODLEE_PASSWORD || 'yodlee-password-placeholder',
    redirectUri: process.env.YODLEE_REDIRECT_URI || 'http://localhost:3002/oauth/callback/yodlee'
  },
  
  // Credit Karma API configuration
  creditKarma: {
    clientId: process.env.CREDIT_KARMA_CLIENT_ID || 'ck-client-id-placeholder',
    clientSecret: process.env.CREDIT_KARMA_CLIENT_SECRET || 'ck-secret-placeholder',
    baseUrl: process.env.CREDIT_KARMA_BASE_URL || 'https://api.creditkarma.com',
    redirectUri: process.env.CREDIT_KARMA_REDIRECT_URI || 'http://localhost:3002/oauth/callbackFinance',
    apiKey: process.env.CREDIT_KARMA_API_KEY || 'ck-api-key-placeholder'
  },
  
  // Experian API (alternative credit source)
  experian: {
    clientId: process.env.EXPERIAN_CLIENT_ID || 'experian-client-id-placeholder',
    clientSecret: process.env.EXPERIAN_CLIENT_SECRET || 'experian-secret-placeholder',
    baseUrl: process.env.EXPERIAN_BASE_URL || 'https://api.experian.com',
    apiKey: process.env.EXPERIAN_API_KEY || 'experian-api-key-placeholder'
  },
  
  // Redis configuration for caching
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1')
  },
  
  // Security settings
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};