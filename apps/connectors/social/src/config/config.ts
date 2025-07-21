import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3004,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'social-connector-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || 'social-encryption-key-32bytes!!',
  apiKey: process.env.SOCIAL_API_KEY || 'social-connector-api-key',
  
  // LinkedIn API configuration (Real Production API)
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || 'linkedin-client-id-placeholder',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'linkedin-secret-placeholder',
    baseUrl: process.env.LINKEDIN_BASE_URL || 'https://api.linkedin.com',
    authUrl: process.env.LINKEDIN_AUTH_URL || 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: process.env.LINKEDIN_TOKEN_URL || 'https://www.linkedin.com/oauth/v2/accessToken',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3004/oauth/callback/linkedin',
    scope: process.env.LINKEDIN_SCOPE || 'r_liteprofile r_emailaddress w_member_social',
    apiVersion: process.env.LINKEDIN_API_VERSION || 'v2',
    // Real LinkedIn API endpoints
    endpoints: {
      profile: '/v2/people/~',
      email: '/v2/emailAddress?q=members&projection=(elements*(handle~))',
      connections: '/v2/connections',
      posts: '/v2/shares',
      companies: '/v2/organizationAcls?q=roleAssignee'
    }
  },
  
  // Twitter API configuration (X/Twitter API v2 - Real Production API)
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || 'twitter-client-id-placeholder',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || 'twitter-secret-placeholder',
    bearerToken: process.env.TWITTER_BEARER_TOKEN || 'twitter-bearer-token-placeholder',
    baseUrl: process.env.TWITTER_BASE_URL || 'https://api.twitter.com/2',
    authUrl: process.env.TWITTER_AUTH_URL || 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: process.env.TWITTER_TOKEN_URL || 'https://api.twitter.com/2/oauth2/token',
    redirectUri: process.env.TWITTER_REDIRECT_URI || 'http://localhost:3004/oauth/callback/twitter',
    scope: process.env.TWITTER_SCOPE || 'tweet.read users.read follows.read offline.access',
    // Real Twitter API v2 endpoints
    endpoints: {
      user: '/users/me',
      userByUsername: '/users/by/username',
      tweets: '/users/:id/tweets',
      followers: '/users/:id/followers',
      following: '/users/:id/following',
      metrics: '/users/:id/tweets?tweet.fields=public_metrics'
    }
  },
  
  // GitHub API configuration (Real Production API)
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || 'github-client-id-placeholder',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'github-secret-placeholder',
    baseUrl: process.env.GITHUB_BASE_URL || 'https://api.github.com',
    authUrl: process.env.GITHUB_AUTH_URL || 'https://github.com/login/oauth/authorize',
    tokenUrl: process.env.GITHUB_TOKEN_URL || 'https://github.com/login/oauth/access_token',
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3004/oauth/callback/github',
    scope: process.env.GITHUB_SCOPE || 'user:email read:user public_repo',
    // Real GitHub API endpoints
    endpoints: {
      user: '/user',
      userRepos: '/user/repos',
      userOrgs: '/user/orgs',
      userFollowers: '/user/followers',
      userFollowing: '/user/following',
      userStats: '/user/repos?sort=updated&per_page=100',
      userContributions: '/search/commits?q=author:'
    }
  },
  
  // Discord API configuration (gaming/community verification)
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || 'discord-client-id-placeholder',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || 'discord-secret-placeholder',
    baseUrl: process.env.DISCORD_BASE_URL || 'https://discord.com/api/v10',
    authUrl: process.env.DISCORD_AUTH_URL || 'https://discord.com/api/oauth2/authorize',
    tokenUrl: process.env.DISCORD_TOKEN_URL || 'https://discord.com/api/oauth2/token',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3004/oauth/callbackSocial',
    scope: process.env.DISCORD_SCOPE || 'identify email guilds'
  },
  
  // Redis configuration for caching
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '3')
  },
  
  // Social verification settings
  verification: {
    minimumFollowers: parseInt(process.env.MIN_FOLLOWERS || '10'),
    minimumConnections: parseInt(process.env.MIN_CONNECTIONS || '5'),
    accountAgeMinimumDays: parseInt(process.env.MIN_ACCOUNT_AGE_DAYS || '30'),
    enableInfluencerVerification: process.env.ENABLE_INFLUENCER_VERIFICATION === 'true',
    enableProfessionalVerification: process.env.ENABLE_PROFESSIONAL_VERIFICATION === 'true'
  },
  
  // Security settings
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};