import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.number().default(3003),
  
  // Security
  jwtSecret: z.string().min(32),
  encryptionKey: z.string().min(32),
  
  // Database
  redisUrl: z.string().optional(),
  mongoUrl: z.string().optional(),
  
  // Professional Provider Configurations
  github: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    redirectUri: z.string(),
    scope: z.string().default('user:email,read:user'),
    authUrl: z.string().default('https://github.com/login/oauth/authorize'),
    tokenUrl: z.string().default('https://github.com/login/oauth/access_token'),
    baseUrl: z.string().default('https://api.github.com'),
    endpoints: z.object({
      user: z.string().default('/user'),
      emails: z.string().default('/user/emails'),
      repos: z.string().default('/user/repos'),
      orgs: z.string().default('/user/orgs'),
      followers: z.string().default('/user/followers'),
      following: z.string().default('/user/following')
    })
  }),
  
  linkedin: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    redirectUri: z.string(),
    scope: z.string().default('r_liteprofile,r_emailaddress,w_member_social'),
    authUrl: z.string().default('https://www.linkedin.com/oauth/v2/authorization'),
    tokenUrl: z.string().default('https://www.linkedin.com/oauth/v2/accessToken'),
    baseUrl: z.string().default('https://api.linkedin.com/v2'),
    endpoints: z.object({
      profile: z.string().default('/people/~:(id,first-name,last-name,profile-picture,headline,location,industry,summary)'),
      email: z.string().default('/emailAddress?q=members&projection=(elements*(handle~))'),
      positions: z.string().default('/positions'),
      skills: z.string().default('/skills'),
      educations: z.string().default('/educations')
    })
  }),
  
  orcid: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    redirectUri: z.string(),
    scope: z.string().default('/read-public'),
    authUrl: z.string().default('https://orcid.org/oauth/authorize'),
    tokenUrl: z.string().default('https://orcid.org/oauth/token'),
    baseUrl: z.string().default('https://pub.orcid.org/v3.0'),
    endpoints: z.object({
      person: z.string().default('/person'),
      works: z.string().default('/works'),
      education: z.string().default('/educations'),
      employment: z.string().default('/employments'),
      research: z.string().default('/research-resources')
    })
  }),
  
  stackexchange: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    redirectUri: z.string(),
    scope: z.string().default('read_inbox'),
    authUrl: z.string().default('https://stackoverflow.com/oauth'),
    tokenUrl: z.string().default('https://stackoverflow.com/oauth/access_token'),
    baseUrl: z.string().default('https://api.stackexchange.com/2.3'),
    endpoints: z.object({
      user: z.string().default('/me'),
      reputation: z.string().default('/me/reputation'),
      badges: z.string().default('/me/badges'),
      answers: z.string().default('/me/answers'),
      questions: z.string().default('/me/questions'),
      tags: z.string().default('/me/tags')
    })
  }),
  
  // Credential settings
  credentialSettings: z.object({
    defaultExpirationMonths: z.number().default(12),
    enableZKProofs: z.boolean().default(true),
    enableSelectiveDisclosure: z.boolean().default(true),
    issuerDid: z.string(),
    issuerName: z.string().default('PersonaPass Professional Connector'),
    credentialVersion: z.string().default('1.0.0')
  }),
  
  // Security settings
  security: z.object({
    enableRateLimiting: z.boolean().default(true),
    maxRequestsPerMinute: z.number().default(100),
    sessionTimeout: z.number().default(3600), // 1 hour
    tokenRefreshThreshold: z.number().default(300), // 5 minutes
    enableCORS: z.boolean().default(true),
    corsOrigins: z.array(z.string()).default(['https://wallet.personapass.me'])
  })
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT) : 3003,
  
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production-32-chars',
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-change-in-production-32',
  
  redisUrl: process.env.REDIS_URL,
  mongoUrl: process.env.MONGO_URL,
  
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || 'github-client-id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'github-client-secret',
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'https://wallet.personapass.me/connect/github/callback',
    scope: process.env.GITHUB_SCOPE || 'user:email,read:user',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    baseUrl: 'https://api.github.com',
    endpoints: {
      user: '/user',
      emails: '/user/emails',
      repos: '/user/repos',
      orgs: '/user/orgs',
      followers: '/user/followers',
      following: '/user/following'
    }
  },
  
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || 'linkedin-client-id',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'linkedin-client-secret',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'https://wallet.personapass.me/connect/linkedin/callback',
    scope: process.env.LINKEDIN_SCOPE || 'r_liteprofile,r_emailaddress',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    baseUrl: 'https://api.linkedin.com/v2',
    endpoints: {
      profile: '/people/~:(id,first-name,last-name,profile-picture,headline,location,industry,summary)',
      email: '/emailAddress?q=members&projection=(elements*(handle~))',
      positions: '/positions',
      skills: '/skills',
      educations: '/educations'
    }
  },
  
  orcid: {
    clientId: process.env.ORCID_CLIENT_ID || 'orcid-client-id',
    clientSecret: process.env.ORCID_CLIENT_SECRET || 'orcid-client-secret',
    redirectUri: process.env.ORCID_REDIRECT_URI || 'https://wallet.personapass.me/connect/orcid/callback',
    scope: process.env.ORCID_SCOPE || '/read-public',
    authUrl: 'https://orcid.org/oauth/authorize',
    tokenUrl: 'https://orcid.org/oauth/token',
    baseUrl: 'https://pub.orcid.org/v3.0',
    endpoints: {
      person: '/person',
      works: '/works',
      education: '/educations',
      employment: '/employments',
      research: '/research-resources'
    }
  },
  
  stackexchange: {
    clientId: process.env.STACKEXCHANGE_CLIENT_ID || 'stackexchange-client-id',
    clientSecret: process.env.STACKEXCHANGE_CLIENT_SECRET || 'stackexchange-client-secret',
    redirectUri: process.env.STACKEXCHANGE_REDIRECT_URI || 'https://wallet.personapass.me/connect/stackexchange/callback',
    scope: process.env.STACKEXCHANGE_SCOPE || 'read_inbox',
    authUrl: 'https://stackoverflow.com/oauth',
    tokenUrl: 'https://stackoverflow.com/oauth/access_token',
    baseUrl: 'https://api.stackexchange.com/2.3',
    endpoints: {
      user: '/me',
      reputation: '/me/reputation',
      badges: '/me/badges',
      answers: '/me/answers',
      questions: '/me/questions',
      tags: '/me/tags'
    }
  },
  
  credentialSettings: {
    defaultExpirationMonths: process.env.CREDENTIAL_EXPIRATION_MONTHS ? parseInt(process.env.CREDENTIAL_EXPIRATION_MONTHS) : 12,
    enableZKProofs: process.env.ENABLE_ZK_PROOFS !== 'false',
    enableSelectiveDisclosure: process.env.ENABLE_SELECTIVE_DISCLOSURE !== 'false',
    issuerDid: process.env.ISSUER_DID || 'did:persona:professional-connector',
    issuerName: process.env.ISSUER_NAME || 'PersonaPass Professional Connector',
    credentialVersion: process.env.CREDENTIAL_VERSION || '1.0.0'
  },
  
  security: {
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    maxRequestsPerMinute: process.env.MAX_REQUESTS_PER_MINUTE ? parseInt(process.env.MAX_REQUESTS_PER_MINUTE) : 100,
    sessionTimeout: process.env.SESSION_TIMEOUT ? parseInt(process.env.SESSION_TIMEOUT) : 3600,
    tokenRefreshThreshold: process.env.TOKEN_REFRESH_THRESHOLD ? parseInt(process.env.TOKEN_REFRESH_THRESHOLD) : 300,
    enableCORS: process.env.ENABLE_CORS !== 'false',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['https://wallet.personapass.me']
  }
});

export default config;