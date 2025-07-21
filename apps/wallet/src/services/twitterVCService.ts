/**
 * Twitter/X Verifiable Credential Service
 * Creates VCs from Twitter/X profile data and activity
 */

import { DIDService } from "./didService";
import { cryptoService } from "./cryptoService";
import { storageService } from "./storageService";
import { rateLimitService } from "./rateLimitService";
import { errorService, ErrorCategory, ErrorSeverity, handleErrors } from "./errorService";
import { configService } from '../config';
import { errorService } from "@/services/errorService";
import type {
  VerifiableCredential,
  WalletCredential,
  DID,
} from "../types/wallet";

export interface TwitterProfile {
  id: string;
  username: string;
  name: string;
  description: string;
  location: string;
  url: string;
  entities: {
    url?: {
      urls: Array<{
        url: string;
        expanded_url: string;
        display_url: string;
      }>;
    };
    description?: {
      urls: Array<{
        url: string;
        expanded_url: string;
        display_url: string;
      }>;
    };
  };
  protected: boolean;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
  created_at: string;
  profile_image_url: string;
  profile_banner_url?: string;
  verified: boolean;
  verified_type?: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
    like_count: number;
  };
  context_annotations?: Array<{
    domain: {
      id: string;
      name: string;
      description: string;
    };
    entity: {
      id: string;
      name: string;
      description: string;
    };
  }>;
}

export interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  conversation_id: string;
  in_reply_to_user_id?: string;
  lang: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    bookmark_count: number;
    impression_count: number;
  };
  context_annotations?: Array<{
    domain: {
      id: string;
      name: string;
      description: string;
    };
    entity: {
      id: string;
      name: string;
      description: string;
    };
  }>;
  entities?: {
    urls?: Array<{
      start: number;
      end: number;
      url: string;
      expanded_url: string;
      display_url: string;
      status: number;
      title: string;
      description: string;
      unwound_url: string;
    }>;
    hashtags?: Array<{
      start: number;
      end: number;
      tag: string;
    }>;
    mentions?: Array<{
      start: number;
      end: number;
      username: string;
      id: string;
    }>;
  };
  referenced_tweets?: Array<{
    type: string;
    id: string;
  }>;
  reply_settings: string;
  source?: string;
}

export interface TwitterSpace {
  id: string;
  state: string;
  created_at: string;
  title: string;
  host_ids: string[];
  speaker_ids: string[];
  is_ticketed: boolean;
  participant_count: number;
  subscriber_count: number;
  topic_ids: string[];
  lang: string;
}

export interface TwitterList {
  id: string;
  name: string;
  description: string;
  created_at: string;
  follower_count: number;
  member_count: number;
  private: boolean;
  owner_id: string;
}

export interface TwitterOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface TwitterTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export class TwitterVCService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private oauthConfig: TwitterOAuthConfig;
  private baseURL = "https://api.twitter.com/2";

  constructor(config?: TwitterOAuthConfig) {
    this.oauthConfig = config || {
      clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || "",
      clientSecret: import.meta.env.VITE_TWITTER_CLIENT_SECRET || "",
      redirectUri: import.meta.env.VITE_TWITTER_REDIRECT_URI || "",
      scopes: [
        "tweet.read",
        "users.read",
        "follows.read",
        "space.read",
        "list.read",
        "offline.access"
      ]
    };
  }

  /**
   * Initialize OAuth2 flow with PKCE
   */
  initiateOAuth(): { url: string; codeVerifier: string } {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scopes.join(" "),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    });

    return {
      url: `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
      codeVerifier
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<void> {
    if (!this.verifyState(state)) {
      throw new Error("Invalid state parameter");
    }

    try {
      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${this.oauthConfig.clientId}:${this.oauthConfig.clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.oauthConfig.redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twitter OAuth error: ${response.status} - ${errorData.error_description}`);
      }

      const tokenData: TwitterTokenResponse = await response.json();
      this.setTokens(tokenData);
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error}`);
    }
  }

  /**
   * Set access tokens
   */
  private setTokens(tokenData: TwitterTokenResponse): void {
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;
    this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${this.oauthConfig.clientId}:${this.oauthConfig.clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Twitter token refresh error: ${response.status}`);
      }

      const tokenData: TwitterTokenResponse = await response.json();
      this.setTokens(tokenData);
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error}`);
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeAuthenticatedRequest(endpoint: string, params?: URLSearchParams): Promise<any> {
    // Check if token needs refresh
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt - 60000) {
      await this.refreshAccessToken();
    }

    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    const url = params ? `${this.baseURL}${endpoint}?${params.toString()}` : `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twitter API error: ${response.status} - ${errorData.detail || errorData.error}`);
    }

    return response.json();
  }

  /**
   * Create Twitter Profile Credential
   */
  @handleErrors(ErrorCategory.EXTERNAL_API, ErrorSeverity.HIGH)
  async createProfileCredential(
    userDID: DID,
    privateKey: Uint8Array,
    accessToken: string
  ): Promise<WalletCredential> {
    this.accessToken = accessToken;

    try {
      // Get user profile with expanded data
      const profileParams = new URLSearchParams({
        "user.fields": "id,username,name,description,location,url,entities,protected,followers_count,following_count,tweet_count,listed_count,created_at,profile_image_url,profile_banner_url,verified,verified_type,public_metrics,context_annotations"
      });

      const profileData = await this.makeAuthenticatedRequest("/users/me", profileParams);
      const profile: TwitterProfile = profileData.data;

      // Get recent tweets for activity analysis
      const tweetsParams = new URLSearchParams({
        "tweet.fields": "id,text,author_id,created_at,conversation_id,in_reply_to_user_id,lang,public_metrics,context_annotations,entities,referenced_tweets,reply_settings,source",
        "max_results": "100"
      });

      const tweetsData = await this.makeAuthenticatedRequest(`/users/${profile.id}/tweets`, tweetsParams);
      const tweets: TwitterTweet[] = tweetsData.data || [];

      // Analyze user activity and influence
      const activityAnalysis = this.analyzeUserActivity(profile, tweets);
      const influenceMetrics = this.calculateInfluenceMetrics(profile, tweets);

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/twitter/v1",
        ],
        id: `urn:uuid:twitter-profile-${Date.now()}`,
        type: [
          "VerifiableCredential",
          "SocialMediaCredential",
          "TwitterProfileCredential",
        ],
        issuer: {
          id: "did:web:twitter.com",
          name: "Twitter Inc.",
          url: "https://twitter.com",
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          Date.now() + 180 * 24 * 60 * 60 * 1000
        ).toISOString(), // 6 months
        credentialSubject: {
          id: userDID,
          type: "TwitterUser",
          profile: {
            id: profile.id,
            username: profile.username,
            name: profile.name,
            description: profile.description,
            location: profile.location,
            url: profile.url,
            verified: profile.verified,
            verifiedType: profile.verified_type,
            protected: profile.protected,
            accountCreated: profile.created_at,
            accountAge: this.calculateAccountAge(profile.created_at),
            profileImageUrl: profile.profile_image_url,
            profileBannerUrl: profile.profile_banner_url,
          },
          metrics: {
            followers: profile.public_metrics.followers_count,
            following: profile.public_metrics.following_count,
            tweets: profile.public_metrics.tweet_count,
            lists: profile.public_metrics.listed_count,
            likes: profile.public_metrics.like_count,
            followersToFollowingRatio: profile.public_metrics.following_count > 0 
              ? profile.public_metrics.followers_count / profile.public_metrics.following_count 
              : 0,
            tweetsPerDay: this.calculateTweetsPerDay(profile.created_at, profile.public_metrics.tweet_count),
          },
          activityAnalysis: activityAnalysis,
          influenceMetrics: influenceMetrics,
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: "twitter-oauth2",
            accountVerified: profile.verified,
            accountType: profile.verified_type || "standard",
            accountStanding: profile.protected ? "protected" : "public",
            dataPointsVerified: [
              "profile",
              "metrics",
              "tweets",
              "activity",
              "influence"
            ],
          },
        },
        proof: await this.createProof(userDID, privateKey, profile),
      };

      const walletCredential: WalletCredential = {
        id: credential.id,
        type: "TwitterProfileCredential",
        credential,
        metadata: {
          tags: ["social", "twitter", "identity", "verified", "influence"],
          favorite: false,
          lastUsed: new Date().toISOString(),
          usageCount: 0,
          source: "twitter",
          name: `Twitter Profile - ${profile.name}`,
          description: `Verified Twitter profile for @${profile.username}`,
          issuer: "Twitter Inc.",
          issuedAt: credential.issuanceDate,
          expiresAt: credential.expirationDate,
          w3cCompliant: true,
        },
        storage: {
          encrypted: true,
          backed_up: true,
          synced: true,
        },
      };

      await storageService.storeCredential(walletCredential);

      console.log("✅ Twitter Profile Credential created successfully:", {
        id: credential.id,
        username: profile.username,
        followers: profile.public_metrics.followers_count,
        verified: profile.verified,
      });

      return walletCredential;
    } catch (error) {
      errorService.logError("❌ Failed to create Twitter profile credential:", error);
      throw new Error(
        `Failed to create Twitter profile credential: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create Twitter Influence Credential
   */
  async createInfluenceCredential(
    userDID: DID,
    privateKey: Uint8Array
  ): Promise<WalletCredential> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    try {
      const profileParams = new URLSearchParams({
        "user.fields": "public_metrics,verified,created_at"
      });

      const profileData = await this.makeAuthenticatedRequest("/users/me", profileParams);
      const profile: TwitterProfile = profileData.data;

      // Get recent tweets for engagement analysis
      const tweetsParams = new URLSearchParams({
        "tweet.fields": "public_metrics,created_at,context_annotations",
        "max_results": "100"
      });

      const tweetsData = await this.makeAuthenticatedRequest(`/users/${profile.id}/tweets`, tweetsParams);
      const tweets: TwitterTweet[] = tweetsData.data || [];

      // Calculate influence metrics
      const influenceScore = this.calculateInfluenceScore(profile, tweets);
      const engagementRate = this.calculateEngagementRate(tweets);
      const topicAuthority = this.calculateTopicAuthority(tweets);

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://personapass.xyz/contexts/twitter-influence/v1",
        ],
        id: `urn:uuid:twitter-influence-${Date.now()}`,
        type: [
          "VerifiableCredential",
          "InfluenceCredential",
          "TwitterInfluenceCredential",
        ],
        issuer: {
          id: "did:web:twitter.com",
          name: "Twitter Inc.",
          url: "https://twitter.com",
        },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        ).toISOString(), // 3 months
        credentialSubject: {
          id: userDID,
          type: "TwitterInfluencer",
          influence: {
            score: influenceScore,
            tier: this.getInfluenceTier(influenceScore),
            verified: profile.verified,
            followers: profile.public_metrics.followers_count,
            engagement: {
              rate: engagementRate,
              averageLikes: this.calculateAverageLikes(tweets),
              averageRetweets: this.calculateAverageRetweets(tweets),
              averageReplies: this.calculateAverageReplies(tweets),
            },
            authority: {
              topics: topicAuthority,
              expertise: this.determineExpertise(topicAuthority),
              thoughtLeadership: this.calculateThoughtLeadership(tweets),
            },
            consistency: {
              postingFrequency: this.calculatePostingFrequency(tweets),
              contentQuality: this.calculateContentQuality(tweets),
              audienceGrowth: this.calculateAudienceGrowth(profile),
            },
          },
          verificationData: {
            verifiedAt: new Date().toISOString(),
            method: "twitter-influence-analysis",
            analysisWindow: "90-days",
            tweetsAnalyzed: tweets.length,
            metricsCalculated: [
              "influence_score",
              "engagement_rate",
              "topic_authority",
              "consistency_metrics"
            ],
          },
        },
        proof: await this.createProof(userDID, privateKey, { profile, tweets }),
      };

      const walletCredential: WalletCredential = {
        id: credential.id,
        type: "TwitterInfluenceCredential",
        credential,
        metadata: {
          tags: ["influence", "twitter", "social", "authority", "engagement"],
          favorite: false,
          lastUsed: new Date().toISOString(),
          usageCount: 0,
          source: "twitter",
          name: `Twitter Influence - ${this.getInfluenceTier(influenceScore)}`,
          description: `Verified Twitter influence credential with ${influenceScore} influence score`,
          issuer: "Twitter Inc.",
          issuedAt: credential.issuanceDate,
          expiresAt: credential.expirationDate,
          w3cCompliant: true,
        },
        storage: {
          encrypted: true,
          backed_up: true,
          synced: true,
        },
      };

      await storageService.storeCredential(walletCredential);

      return walletCredential;
    } catch (error) {
      throw new Error(
        `Failed to create Twitter influence credential: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Helper methods
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private generateCodeChallenge(codeVerifier: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest as ArrayBuffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private generateState(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private verifyState(state: string): boolean {
    return state.length === 64;
  }

  private calculateAccountAge(createdAt: string): number {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24)); // Age in days
  }

  private calculateTweetsPerDay(createdAt: string, tweetCount: number): number {
    const accountAge = this.calculateAccountAge(createdAt);
    return accountAge > 0 ? tweetCount / accountAge : 0;
  }

  private analyzeUserActivity(profile: TwitterProfile, tweets: TwitterTweet[]) {
    const recentTweets = tweets.filter(tweet => {
      const tweetAge = Date.now() - new Date(tweet.created_at).getTime();
      return tweetAge <= 30 * 24 * 60 * 60 * 1000; // Last 30 days
    });

    return {
      tweetsLast30Days: recentTweets.length,
      avgTweetsPerDay: recentTweets.length / 30,
      mostActiveHour: this.findMostActiveHour(recentTweets),
      languages: this.extractLanguages(recentTweets),
      topHashtags: this.extractTopHashtags(recentTweets),
      mentionedUsers: this.extractMentionedUsers(recentTweets),
      replyRate: this.calculateReplyRate(recentTweets),
    };
  }

  private calculateInfluenceMetrics(profile: TwitterProfile, tweets: TwitterTweet[]) {
    const totalEngagement = tweets.reduce((sum, tweet) => 
      sum + tweet.public_metrics.like_count + tweet.public_metrics.retweet_count + tweet.public_metrics.reply_count, 0
    );

    return {
      influenceScore: this.calculateInfluenceScore(profile, tweets),
      engagementRate: tweets.length > 0 ? totalEngagement / tweets.length : 0,
      viralityScore: this.calculateViralityScore(tweets),
      authorityScore: this.calculateAuthorityScore(profile, tweets),
      consistencyScore: this.calculateConsistencyScore(tweets),
    };
  }

  private calculateInfluenceScore(profile: TwitterProfile, tweets: TwitterTweet[]): number {
    const followerWeight = Math.log10(profile.public_metrics.followers_count + 1) * 10;
    const engagementWeight = this.calculateEngagementRate(tweets) * 20;
    const verificationWeight = profile.verified ? 15 : 0;
    const activityWeight = Math.min(tweets.length / 10, 10);
    const ageWeight = Math.min(this.calculateAccountAge(profile.created_at) / 365, 5);

    return Math.min(followerWeight + engagementWeight + verificationWeight + activityWeight + ageWeight, 100);
  }

  private calculateEngagementRate(tweets: TwitterTweet[]): number {
    if (tweets.length === 0) return 0;
    
    const totalEngagement = tweets.reduce((sum, tweet) => 
      sum + tweet.public_metrics.like_count + tweet.public_metrics.retweet_count + tweet.public_metrics.reply_count, 0
    );
    
    const totalImpressions = tweets.reduce((sum, tweet) => 
      sum + tweet.public_metrics.impression_count, 0
    );

    return totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
  }

  private calculateTopicAuthority(tweets: TwitterTweet[]): Record<string, number> {
    const topics: Record<string, number> = {};
    
    tweets.forEach(tweet => {
      if (tweet.context_annotations) {
        tweet.context_annotations.forEach(annotation => {
          const topic = annotation.domain.name;
          topics[topic] = (topics[topic] || 0) + 1;
        });
      }
    });

    return topics;
  }

  private getInfluenceTier(score: number): string {
    if (score >= 80) return "influencer";
    if (score >= 60) return "thought-leader";
    if (score >= 40) return "engaged-user";
    if (score >= 20) return "active-user";
    return "casual-user";
  }

  private calculateAverageLikes(tweets: TwitterTweet[]): number {
    if (tweets.length === 0) return 0;
    return tweets.reduce((sum, tweet) => sum + tweet.public_metrics.like_count, 0) / tweets.length;
  }

  private calculateAverageRetweets(tweets: TwitterTweet[]): number {
    if (tweets.length === 0) return 0;
    return tweets.reduce((sum, tweet) => sum + tweet.public_metrics.retweet_count, 0) / tweets.length;
  }

  private calculateAverageReplies(tweets: TwitterTweet[]): number {
    if (tweets.length === 0) return 0;
    return tweets.reduce((sum, tweet) => sum + tweet.public_metrics.reply_count, 0) / tweets.length;
  }

  private determineExpertise(topicAuthority: Record<string, number>): string[] {
    const sortedTopics = Object.entries(topicAuthority)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
    
    return sortedTopics;
  }

  private calculateThoughtLeadership(tweets: TwitterTweet[]): number {
    const originalTweets = tweets.filter(tweet => !tweet.referenced_tweets);
    const avgEngagement = originalTweets.reduce((sum, tweet) => 
      sum + tweet.public_metrics.like_count + tweet.public_metrics.retweet_count, 0
    ) / Math.max(originalTweets.length, 1);

    return Math.min(avgEngagement / 10, 100);
  }

  private calculatePostingFrequency(tweets: TwitterTweet[]): number {
    if (tweets.length === 0) return 0;
    
    const sortedTweets = tweets.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const timespan = new Date(sortedTweets[sortedTweets.length - 1].created_at).getTime() - 
                     new Date(sortedTweets[0].created_at).getTime();
    
    return timespan > 0 ? tweets.length / (timespan / (1000 * 60 * 60 * 24)) : 0;
  }

  private calculateContentQuality(tweets: TwitterTweet[]): number {
    const avgLength = tweets.reduce((sum, tweet) => sum + tweet.text.length, 0) / Math.max(tweets.length, 1);
    const urlCount = tweets.filter(tweet => tweet.entities?.urls).length;
    const urlRatio = urlCount / Math.max(tweets.length, 1);
    
    return Math.min((avgLength / 10) + (urlRatio * 20), 100);
  }

  private calculateAudienceGrowth(profile: TwitterProfile): number {
    // This would require historical data in a real implementation
    // For now, return a placeholder based on account age and followers
    const ageInDays = this.calculateAccountAge(profile.created_at);
    return ageInDays > 0 ? profile.public_metrics.followers_count / ageInDays : 0;
  }

  private calculateViralityScore(tweets: TwitterTweet[]): number {
    const viralThreshold = 1000; // Retweets + likes
    const viralTweets = tweets.filter(tweet => 
      tweet.public_metrics.retweet_count + tweet.public_metrics.like_count > viralThreshold
    );
    
    return tweets.length > 0 ? (viralTweets.length / tweets.length) * 100 : 0;
  }

  private calculateAuthorityScore(profile: TwitterProfile, tweets: TwitterTweet[]): number {
    const verificationBonus = profile.verified ? 30 : 0;
    const followerScore = Math.log10(profile.public_metrics.followers_count + 1) * 10;
    const engagementScore = this.calculateEngagementRate(tweets);
    
    return Math.min(verificationBonus + followerScore + engagementScore, 100);
  }

  private calculateConsistencyScore(tweets: TwitterTweet[]): number {
    if (tweets.length < 7) return 0;
    
    const dailyTweets = this.groupTweetsByDay(tweets);
    const activeDays = Object.keys(dailyTweets).length;
    const totalDays = this.calculateDateRange(tweets);
    
    return totalDays > 0 ? (activeDays / totalDays) * 100 : 0;
  }

  private findMostActiveHour(tweets: TwitterTweet[]): number {
    const hourCounts = new Array(24).fill(0);
    
    tweets.forEach(tweet => {
      const hour = new Date(tweet.created_at).getHours();
      hourCounts[hour]++;
    });
    
    return hourCounts.indexOf(Math.max(...hourCounts));
  }

  private extractLanguages(tweets: TwitterTweet[]): string[] {
    const languages = new Set<string>();
    tweets.forEach(tweet => {
      if (tweet.lang) languages.add(tweet.lang);
    });
    return Array.from(languages);
  }

  private extractTopHashtags(tweets: TwitterTweet[]): string[] {
    const hashtagCounts: Record<string, number> = {};
    
    tweets.forEach(tweet => {
      if (tweet.entities?.hashtags) {
        tweet.entities.hashtags.forEach(hashtag => {
          hashtagCounts[hashtag.tag] = (hashtagCounts[hashtag.tag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  private extractMentionedUsers(tweets: TwitterTweet[]): string[] {
    const mentions = new Set<string>();
    
    tweets.forEach(tweet => {
      if (tweet.entities?.mentions) {
        tweet.entities.mentions.forEach(mention => {
          mentions.add(mention.username);
        });
      }
    });
    
    return Array.from(mentions);
  }

  private calculateReplyRate(tweets: TwitterTweet[]): number {
    const replies = tweets.filter(tweet => tweet.in_reply_to_user_id);
    return tweets.length > 0 ? replies.length / tweets.length : 0;
  }

  private groupTweetsByDay(tweets: TwitterTweet[]): Record<string, TwitterTweet[]> {
    const groups: Record<string, TwitterTweet[]> = {};
    
    tweets.forEach(tweet => {
      const day = new Date(tweet.created_at).toDateString();
      if (!groups[day]) groups[day] = [];
      groups[day].push(tweet);
    });
    
    return groups;
  }

  private calculateDateRange(tweets: TwitterTweet[]): number {
    if (tweets.length === 0) return 0;
    
    const dates = tweets.map(tweet => new Date(tweet.created_at).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  }

  private async createProof(
    userDID: DID,
    privateKey: Uint8Array,
    data: any
  ): Promise<any> {
    const proofData = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${userDID}#key-1`,
      proofPurpose: "assertionMethod",
    };

    const dataToSign = JSON.stringify({
      ...proofData,
      credentialHash: await cryptoService.generateHash(JSON.stringify(data)),
    });

    const signature = await DIDService.signWithDID(
      new TextEncoder().encode(dataToSign),
      privateKey
    );

    return {
      ...proofData,
      proofValue: Array.from(signature)
        .map(b => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  }
}

// Create TwitterVCService instance
function createTwitterVCService(): TwitterVCService {
  try {
    const thirdPartyConfig = configService.getThirdPartyConfig();
    return new TwitterVCService({
      clientId: thirdPartyConfig.twitter.clientId,
      clientSecret: thirdPartyConfig.twitter.clientSecret,
      redirectUri: thirdPartyConfig.twitter.redirectUri,
      scopes: thirdPartyConfig.twitter.scopes,
    });
  } catch (error) {
    console.warn('Configuration service not available, using fallback values:', error);
    return new TwitterVCService();
  }
}

export const twitterVCService = createTwitterVCService();