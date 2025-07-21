import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server config
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Security
  apiKey: process.env.ACADEMICS_API_KEY || 'academics-dev-key-12345',
  jwtSecret: process.env.JWT_SECRET || 'academics-jwt-secret-dev',
  encryptionKey: process.env.ENCRYPTION_KEY || 'academics-encryption-key-32bytes!',
  
  // ID.me Student Verification API
  idme: {
    baseUrl: process.env.IDME_BASE_URL || 'https://api.id.me',
    clientId: process.env.IDME_CLIENT_ID || 'idme-client-id-placeholder',
    clientSecret: process.env.IDME_CLIENT_SECRET || 'idme-client-secret-placeholder',
    redirectUri: process.env.IDME_REDIRECT_URI || 'http://localhost:3001/oauth/callback/idme',
    scope: 'openid profile student_verification',
    apiKey: process.env.IDME_API_KEY || 'idme-api-key-placeholder'
  },
  
  // National Student Clearinghouse API (Real Production)
  nsc: {
    baseUrl: process.env.NSC_BASE_URL || 'https://api.studentclearinghouse.org',
    apiKey: process.env.NSC_API_KEY || 'nsc-api-key-placeholder',
    clientId: process.env.NSC_CLIENT_ID || 'nsc-client-id-placeholder',
    clientSecret: process.env.NSC_CLIENT_SECRET || 'nsc-client-secret-placeholder',
    redirectUri: process.env.NSC_REDIRECT_URI || 'http://localhost:3001/oauth/callback/nsc',
    // NSC uses OAuth 2.0 for API access
    authUrl: 'https://api.studentclearinghouse.org/oauth/authorize',
    tokenUrl: 'https://api.studentclearinghouse.org/oauth/token'
  },
  
  // OneRoster API (For institutions supporting OneRoster)
  oneRoster: {
    baseUrl: process.env.ONEROSTER_BASE_URL || 'https://api.oneroster.org/v1p1',
    clientId: process.env.ONEROSTER_CLIENT_ID || 'oneroster-client-id-placeholder',
    clientSecret: process.env.ONEROSTER_CLIENT_SECRET || 'oneroster-client-secret-placeholder',
    // OneRoster uses OAuth 1.0a or 2.0 depending on implementation
    authType: process.env.ONEROSTER_AUTH_TYPE || 'oauth2'
  },
  
  // Blockchain integration
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8080',
    apiUrl: process.env.BLOCKCHAIN_API_URL || 'http://localhost:8080'
  },
  
  // Redis for session storage
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'academics:'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100') // limit each IP to 100 requests per windowMs
  }
};

// Validation
const requiredEnvVars = [
  'IDME_CLIENT_ID',
  'IDME_CLIENT_SECRET', 
  'IDME_API_KEY',
  'NSC_API_KEY',
  'NSC_CLIENT_ID',
  'NSC_CLIENT_SECRET',
  'ONEROSTER_CLIENT_ID',
  'ONEROSTER_CLIENT_SECRET',
  'ENCRYPTION_KEY',
  'JWT_SECRET'
];

if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`⚠️  Warning: ${envVar} is not set in production environment`);
    }
  }
}