export interface SocialProfile {
  id: string;
  platform: 'linkedin' | 'twitter' | 'github' | 'discord';
  username: string;
  displayName: string;
  profileUrl: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  verified: boolean;
  isVerifiedAccount?: boolean; // Platform's own verification
  createdAt?: string;
  lastUpdated: string;
}

export interface LinkedInProfile extends SocialProfile {
  platform: 'linkedin';
  headline?: string;
  industry?: string;
  currentPosition?: LinkedInPosition;
  education?: LinkedInEducation[];
  connections?: number;
  endorsements?: LinkedInEndorsement[];
  skills?: LinkedInSkill[];
  publications?: LinkedInPublication[];
  certifications?: LinkedInCertification[];
}

export interface LinkedInPosition {
  title: string;
  company: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  location?: string;
}

export interface LinkedInEducation {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  activities?: string;
}

export interface LinkedInEndorsement {
  skill: string;
  count: number;
  endorsers?: string[];
}

export interface LinkedInSkill {
  name: string;
  endorsements: number;
}

export interface LinkedInPublication {
  title: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  url?: string;
}

export interface LinkedInCertification {
  name: string;
  authority: string;
  licenseNumber?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
}

export interface TwitterProfile extends SocialProfile {
  platform: 'twitter';
  handle: string;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  listedCount?: number;
  isProtected: boolean;
  pinnedTweetId?: string;
  recentTweets?: TwitterTweet[];
  metrics?: TwitterMetrics;
}

export interface TwitterTweet {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  publicMetrics?: {
    retweetCount: number;
    likeCount: number;
    replyCount: number;
    quoteCount: number;
  };
  referencedTweets?: {
    type: string;
    id: string;
  }[];
}

export interface TwitterMetrics {
  impressionCount?: number;
  urlLinkClicks?: number;
  userProfileClicks?: number;
  avgEngagementRate?: number;
}

export interface GitHubProfile extends SocialProfile {
  platform: 'github';
  login: string;
  name?: string;
  company?: string;
  blog?: string;
  email?: string;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  repositories?: GitHubRepository[];
  contributions?: GitHubContributions;
  achievements?: GitHubAchievement[];
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stargazersCount: number;
  forksCount: number;
  size: number;
  createdAt: string;
  updatedAt: string;
  topics: string[];
  license?: {
    name: string;
    spdxId: string;
  };
}

export interface GitHubContributions {
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalStars: number;
  contributionsLastYear: number;
  streakDays: number;
}

export interface GitHubAchievement {
  type: string;
  tier: string;
  badge: string;
  description: string;
}

export interface DiscordProfile extends SocialProfile {
  platform: 'discord';
  discriminator?: string;
  globalName?: string;
  flags?: number;
  premiumType?: number;
  publicFlags?: number;
  guilds?: DiscordGuild[];
  mutualGuilds?: number;
  accountAge?: number;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner?: boolean;
  permissions?: string;
  features: string[];
  memberCount?: number;
  roles?: DiscordRole[];
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  permissions: string;
  position: number;
}

export interface SocialVerification {
  platform: string;
  profileId: string;
  verificationLevel: 'basic' | 'standard' | 'premium' | 'influencer' | 'professional';
  verificationChecks: {
    accountAge: boolean;
    followerThreshold: boolean;
    engagementRate: boolean;
    profileCompleteness: boolean;
    platformVerification: boolean;
    activityConsistency: boolean;
  };
  credibilityScore: number;
  influenceMetrics?: InfluenceMetrics;
  professionalMetrics?: ProfessionalMetrics;
  verified: boolean;
  verifiedAt: string;
}

export interface InfluenceMetrics {
  followerCount: number;
  engagementRate: number;
  reachEstimate: number;
  contentQualityScore: number;
  audienceQuality: number;
  influenceRank: 'micro' | 'mid' | 'macro' | 'mega';
}

export interface ProfessionalMetrics {
  connectionCount: number;
  endorsementCount: number;
  skillsCount: number;
  publicationsCount: number;
  certificationsCount: number;
  industryRank: number;
  professionalScore: number;
}

export interface SocialCredentials {
  did: string;
  profiles: SocialProfile[];
  verifications: SocialVerification[];
  aggregateMetrics: {
    totalFollowers: number;
    totalConnections: number;
    averageEngagement: number;
    platformCount: number;
    verifiedPlatforms: number;
    professionalNetworks: number;
    socialNetworks: number;
  };
  socialGraph?: SocialGraphMetrics;
  lastUpdated: string;
}

export interface SocialGraphMetrics {
  networkSize: number;
  clusteringCoefficient: number;
  centralityScore: number;
  reachability: number;
  mutualConnections: number;
  networkDiversity: number;
}

export interface AccessTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  platform: string;
  userId?: string;
  username?: string;
}

export interface OAuthState {
  did: string;
  platform: string;
  returnUrl?: string;
  timestamp: number;
}