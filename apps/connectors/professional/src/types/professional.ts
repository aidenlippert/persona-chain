/**
 * Professional Credential Connector Types
 * GitHub, LinkedIn, ORCID, StackExchange integration
 */

import { VerifiableCredential } from '../../../shared/types/w3c-types';
import { ZKCommitment } from '../../../shared/zk/commitmentService';

// Base OAuth2 Types
export interface OAuth2TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
  provider: ProfessionalProvider;
  userId?: string;
}

export type ProfessionalProvider = 'github' | 'linkedin' | 'orcid' | 'stackexchange';

export interface OAuth2State {
  state: string;
  provider: ProfessionalProvider;
  did: string;
  timestamp: number;
  codeVerifier?: string; // For PKCE
  nonce?: string;
}

// Provider-specific profile data types
export interface GitHubProfile {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  bio?: string;
  blog?: string;
  location?: string;
  company?: string;
  hireable?: boolean;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  type: string;
  twitter_username?: string;
  plan?: {
    name: string;
    space: number;
    private_repos: number;
    collaborators: number;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  clone_url: string;
  language?: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  license?: {
    key: string;
    name: string;
  };
  topics: string[];
  visibility: 'public' | 'private';
  archived: boolean;
  disabled: boolean;
  fork: boolean;
}

export interface LinkedInProfile {
  id: string;
  firstName: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  lastName: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  profilePicture?: {
    displayImage: string;
  };
  headline?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  location?: {
    country: string;
    countryCode: string;
    region: string;
  };
  industry?: string;
  summary?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
}

export interface LinkedInEmail {
  elements: Array<{
    handle: string;
    'handle~': {
      emailAddress: string;
    };
  }>;
}

export interface ORCIDProfile {
  'orcid-identifier': {
    uri: string;
    path: string;
    host: string;
  };
  person: {
    name: {
      'given-names': {
        value: string;
      };
      'family-name': {
        value: string;
      };
      'credit-name'?: {
        value: string;
      };
    };
    biography?: {
      content: string;
    };
    'researcher-urls'?: {
      'researcher-url': Array<{
        'url-name': string;
        url: {
          value: string;
        };
      }>;
    };
    emails?: {
      email: Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
    };
    addresses?: {
      address: Array<{
        country: {
          value: string;
        };
      }>;
    };
    keywords?: {
      keyword: Array<{
        content: string;
      }>;
    };
    'external-identifiers'?: {
      'external-identifier': Array<{
        'external-id-type': string;
        'external-id-value': string;
        'external-id-url': {
          value: string;
        };
      }>;
    };
  };
}

export interface ORCIDWorks {
  group: Array<{
    'work-summary': Array<{
      'put-code': number;
      'created-date': {
        value: number;
      };
      'last-modified-date': {
        value: number;
      };
      title: {
        title: {
          value: string;
        };
      };
      'journal-title'?: {
        value: string;
      };
      type: string;
      'publication-date'?: {
        year: {
          value: string;
        };
        month?: {
          value: string;
        };
        day?: {
          value: string;
        };
      };
      'external-ids': {
        'external-id': Array<{
          'external-id-type': string;
          'external-id-value': string;
        }>;
      };
    }>;
  }>;
}

export interface StackExchangeProfile {
  account_id: number;
  user_id: number;
  display_name: string;
  reputation: number;
  website_url?: string;
  location?: string;
  about_me?: string;
  age?: number;
  profile_image: string;
  link: string;
  creation_date: number;
  last_access_date: number;
  last_modified_date: number;
  is_employee: boolean;
  badge_counts: {
    bronze: number;
    silver: number;
    gold: number;
  };
  accept_rate?: number;
  user_type: string;
}

export interface StackExchangeBadge {
  badge_id: number;
  rank: 'bronze' | 'silver' | 'gold';
  name: string;
  description: string;
  award_count: number;
  badge_type: string;
  user: {
    user_id: number;
    display_name: string;
    reputation: number;
    profile_image: string;
    link: string;
  };
}

// Credential schema types
export interface ProfessionalCredentialSubject {
  id: string; // DID of the credential holder
  type: 'ProfessionalProfile';
  provider: ProfessionalProvider;
  profileId: string;
  verifiedAt: string;
  
  // Common fields
  name?: string;
  email?: string;
  profileUrl?: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  
  // GitHub-specific
  githubData?: {
    login: string;
    publicRepos: number;
    followers: number;
    following: number;
    company?: string;
    blog?: string;
    hireable?: boolean;
    memberSince: string;
    accountType: string;
    topLanguages?: string[];
    totalStars: number;
    totalForks: number;
    contributionYears: number[];
    organizationMemberships?: string[];
  };
  
  // LinkedIn-specific
  linkedinData?: {
    headline?: string;
    industry?: string;
    summary?: string;
    connectionCount?: number;
    skills?: string[];
    positions?: Array<{
      title: string;
      company: string;
      startDate: string;
      endDate?: string;
      description?: string;
    }>;
    education?: Array<{
      school: string;
      degree: string;
      fieldOfStudy: string;
      startDate: string;
      endDate?: string;
    }>;
  };
  
  // ORCID-specific
  orcidData?: {
    orcidId: string;
    creditName?: string;
    biography?: string;
    keywords?: string[];
    researcherUrls?: Array<{
      name: string;
      url: string;
    }>;
    externalIds?: Array<{
      type: string;
      value: string;
      url?: string;
    }>;
    worksCount: number;
    educationCount: number;
    employmentCount: number;
    topWorks?: Array<{
      title: string;
      journal?: string;
      type: string;
      publicationDate?: string;
      doi?: string;
    }>;
  };
  
  // StackExchange-specific
  stackexchangeData?: {
    userId: number;
    displayName: string;
    reputation: number;
    badges: {
      bronze: number;
      silver: number;
      gold: number;
    };
    acceptRate?: number;
    memberSince: string;
    lastSeen: string;
    isEmployee: boolean;
    topTags?: Array<{
      name: string;
      score: number;
      postCount: number;
    }>;
    answerCount: number;
    questionCount: number;
    reputationChangeYear: number;
    topBadges?: Array<{
      name: string;
      rank: 'bronze' | 'silver' | 'gold';
      awardCount: number;
    }>;
  };
  
  // Verification metadata
  verificationMethod: string;
  verificationDate: string;
  credentialVersion: string;
  privacyLevel: 'full' | 'selective' | 'zero_knowledge';
}

export interface ProfessionalCredential extends VerifiableCredential {
  credentialSubject: ProfessionalCredentialSubject;
  credentialSchema: {
    id: string;
    type: 'JsonSchemaValidator2018';
  };
  refreshService?: {
    id: string;
    type: 'ManualRefresh2018';
  };
  renderMethod?: Array<{
    id: string;
    type: string;
    template: string;
    css?: string;
  }>;
}

// Credential request and response types
export interface ProfessionalCredentialRequest {
  did: string;
  provider: ProfessionalProvider;
  accessToken: string;
  options: {
    includePrivateData: boolean;
    includeRepositories: boolean; // GitHub only
    includeConnections: boolean; // LinkedIn only
    includeWorks: boolean; // ORCID only
    includeBadges: boolean; // StackExchange only
    privacyLevel: 'full' | 'selective' | 'zero_knowledge';
    expirationMonths?: number;
  };
}

export interface ProfessionalCredentialResponse {
  success: boolean;
  credential?: ProfessionalCredential;
  zkCommitment?: ZKCommitment;
  error?: string;
  metadata: {
    provider: ProfessionalProvider;
    profileId: string;
    issuedAt: string;
    expiresAt?: string;
    privacyLevel: 'full' | 'selective' | 'zero_knowledge';
    dataPoints: string[];
    verificationMethod: string;
  };
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
}

// Error types
export interface ProfessionalConnectorError {
  code: 'OAUTH_ERROR' | 'PROFILE_FETCH_ERROR' | 'CREDENTIAL_GENERATION_ERROR' | 'VALIDATION_ERROR' | 'RATE_LIMIT_ERROR' | 'NETWORK_ERROR';
  message: string;
  provider?: ProfessionalProvider;
  details?: Record<string, any>;
  timestamp: string;
}

// Webhook and event types
export interface ProfessionalWebhookEvent {
  id: string;
  type: 'credential.issued' | 'credential.revoked' | 'credential.refreshed' | 'profile.updated';
  provider: ProfessionalProvider;
  did: string;
  credentialId: string;
  timestamp: string;
  data: Record<string, any>;
}

// Analytics and metrics types
export interface ProfessionalMetrics {
  totalCredentials: number;
  credentialsByProvider: Record<ProfessionalProvider, number>;
  credentialsByPrivacyLevel: Record<'full' | 'selective' | 'zero_knowledge', number>;
  refreshRateByProvider: Record<ProfessionalProvider, number>;
  averageCredentialLifetime: number;
  errorRateByProvider: Record<ProfessionalProvider, number>;
  mostRequestedDataPoints: string[];
}

// Configuration types
export interface ProfessionalConnectorConfig {
  enabledProviders: ProfessionalProvider[];
  defaultPrivacyLevel: 'full' | 'selective' | 'zero_knowledge';
  defaultExpirationMonths: number;
  enableRateLimiting: boolean;
  enableWebhooks: boolean;
  webhookEndpoints: Record<string, string>;
  cacheConfiguration: {
    profileCacheTTL: number;
    tokenCacheTTL: number;
    schemaCacheTTL: number;
  };
  securitySettings: {
    enableTokenEncryption: boolean;
    enableAuditLogging: boolean;
    enableIPWhitelist: boolean;
    allowedOrigins: string[];
  };
}