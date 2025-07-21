import axios from 'axios';
import { config } from '../config/config';
import { TwitterProfile, TwitterTweet, AccessTokenData } from '../types/social';

export class TwitterService {
  private tokenStore = new Map(); // In production, use encrypted database
  
  /**
   * Build Twitter OAuth 2.0 authorization URL
   */
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.twitter.clientId,
      redirect_uri: config.twitter.redirectUri,
      scope: config.twitter.scope,
      state,
      code_challenge: this.generateCodeChallenge(),
      code_challenge_method: 'plain'
    });
    
    return `${config.twitter.authUrl}?${params.toString()}`;
  }
  
  /**
   * Generate code challenge for PKCE
   */
  private generateCodeChallenge(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    try {
      console.log('🔄 Exchanging Twitter authorization code for token...');
      
      const response = await axios.post(config.twitter.tokenUrl, {
        grant_type: 'authorization_code',
        code,
        client_id: config.twitter.clientId,
        client_secret: config.twitter.clientSecret,
        redirect_uri: config.twitter.redirectUri,
        code_verifier: this.generateCodeChallenge()
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('✅ Twitter token exchange successful');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error exchanging Twitter code for token:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Twitter token for development');
        return {
          access_token: `mock_twitter_token_${Date.now()}`,
          expires_in: 7200, // 2 hours
          scope: config.twitter.scope,
          refresh_token: `mock_twitter_refresh_${Date.now()}`
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Store access token for a DID
   */
  async storeAccessToken(did: string, tokenData: AccessTokenData): Promise<void> {
    const key = `twitter:${did}`;
    
    // In production, encrypt and store in database
    this.tokenStore.set(key, {
      ...tokenData,
      updatedAt: Date.now()
    });
    
    console.log(`🔐 Twitter access token stored for DID: ${did}`);
  }
  
  /**
   * Get access token for a DID
   */
  async getAccessToken(did: string): Promise<AccessTokenData | null> {
    const key = `twitter:${did}`;
    const tokenData = this.tokenStore.get(key);
    
    if (!tokenData) return null;
    
    // Check if token is expired
    if (Date.now() >= tokenData.expiresAt) {
      console.log(`⏰ Twitter token expired for DID: ${did}`);
      // Try to refresh if we have a refresh token
      if (tokenData.refreshToken) {
        const refreshed = await this.refreshAccessToken(did);
        return refreshed;
      }
      this.tokenStore.delete(key);
      return null;
    }
    
    return tokenData;
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(did: string): Promise<AccessTokenData | null> {
    try {
      const key = `twitter:${did}`;
      const currentToken = this.tokenStore.get(key);
      
      if (!currentToken?.refreshToken) {
        return null;
      }
      
      const response = await axios.post(config.twitter.tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: currentToken.refreshToken,
        client_id: config.twitter.clientId,
        client_secret: config.twitter.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const newTokenData: AccessTokenData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || currentToken.refreshToken,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
        scope: response.data.scope || currentToken.scope,
        platform: 'twitter'
      };
      
      // Store refreshed token
      await this.storeAccessToken(did, newTokenData);
      
      console.log(`🔄 Twitter token refreshed for DID: ${did}`);
      return newTokenData;
      
    } catch (error) {
      console.error('❌ Error refreshing Twitter token:', error);
      return null;
    }
  }
  
  /**
   * Make authenticated Twitter API v2 request
   */
  private async makeTwitterRequest(endpoint: string, accessToken: string, params?: any): Promise<any> {
    try {
      const url = `${config.twitter.baseUrl}/${endpoint}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 30000
      });
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ Twitter API request failed for ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Fetch Twitter profile information
   */
  async fetchProfile(did: string): Promise<TwitterProfile> {
    try {
      const accessToken = await this.getAccessToken(did);
      if (!accessToken) {
        throw new Error('Twitter access token not available');
      }
      
      console.log('🐦 Fetching Twitter profile data...');
      
      // Fetch user profile
      const userData = await this.makeTwitterRequest(
        'users/me',
        accessToken.accessToken,
        {
          'user.fields': 'id,name,username,description,location,url,verified,profile_image_url,public_metrics,created_at,protected,pinned_tweet_id'
        }
      );
      
      const user = userData.data;
      
      // Fetch recent tweets
      let recentTweets: TwitterTweet[] = [];
      try {
        const tweetsData = await this.makeTwitterRequest(
          `users/${user.id}/tweets`,
          accessToken.accessToken,
          {
            max_results: 10,
            'tweet.fields': 'id,text,created_at,author_id,public_metrics,referenced_tweets'
          }
        );
        
        recentTweets = tweetsData.data?.map((tweet: any) => ({
          id: tweet.id,
          text: tweet.text,
          createdAt: tweet.created_at,
          authorId: tweet.author_id,
          publicMetrics: tweet.public_metrics,
          referencedTweets: tweet.referenced_tweets
        })) || [];
      } catch (error) {
        console.warn('⚠️ Could not fetch recent tweets:', error.message);
      }
      
      // Transform to our profile format
      const profile: TwitterProfile = {
        id: user.id,
        platform: 'twitter',
        username: user.username,
        displayName: user.name,
        profileUrl: `https://twitter.com/${user.username}`,
        avatarUrl: user.profile_image_url,
        bio: user.description,
        location: user.location,
        website: user.url,
        verified: true,
        isVerifiedAccount: user.verified,
        createdAt: user.created_at,
        lastUpdated: new Date().toISOString(),
        handle: `@${user.username}`,
        followersCount: user.public_metrics?.followers_count || 0,
        followingCount: user.public_metrics?.following_count || 0,
        tweetCount: user.public_metrics?.tweet_count || 0,
        listedCount: user.public_metrics?.listed_count || 0,
        isProtected: user.protected || false,
        pinnedTweetId: user.pinned_tweet_id,
        recentTweets,
        metrics: {
          avgEngagementRate: this.calculateEngagementRate(recentTweets, user.public_metrics?.followers_count || 0)
        }
      };
      
      console.log(`✅ Twitter profile fetched successfully for: @${profile.username}`);
      return profile;
      
    } catch (error) {
      console.error('❌ Error fetching Twitter profile:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock Twitter profile for development');
        return {
          id: 'twitter_mock_1',
          platform: 'twitter',
          username: 'johndoe_dev',
          displayName: 'John Doe',
          profileUrl: 'https://twitter.com/johndoe_dev',
          avatarUrl: 'https://pbs.twimg.com/profile_images/mock-avatar.jpg',
          bio: 'Software Developer | Tech Enthusiast | Building the future',
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          verified: true,
          isVerifiedAccount: false,
          createdAt: '2019-03-15T10:30:00.000Z',
          lastUpdated: new Date().toISOString(),
          handle: '@johndoe_dev',
          followersCount: 1247,
          followingCount: 389,
          tweetCount: 2156,
          listedCount: 23,
          isProtected: false,
          recentTweets: [
            {
              id: 'mock_tweet_1',
              text: 'Just shipped a new feature! Excited to see how users respond 🚀',
              createdAt: '2023-12-01T14:30:00.000Z',
              authorId: 'twitter_mock_1',
              publicMetrics: {
                retweetCount: 12,
                likeCount: 45,
                replyCount: 8,
                quoteCount: 3
              }
            }
          ],
          metrics: {
            avgEngagementRate: 5.2
          }
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Calculate engagement rate from recent tweets
   */
  private calculateEngagementRate(tweets: TwitterTweet[], followerCount: number): number {
    if (!tweets.length || followerCount === 0) return 0;
    
    const totalEngagement = tweets.reduce((sum, tweet) => {
      const metrics = tweet.publicMetrics;
      if (!metrics) return sum;
      
      return sum + metrics.likeCount + metrics.retweetCount + metrics.replyCount + metrics.quoteCount;
    }, 0);
    
    const avgEngagementPerTweet = totalEngagement / tweets.length;
    return (avgEngagementPerTweet / followerCount) * 100;
  }
  
  /**
   * Verify Twitter profile authenticity
   */
  async verifyProfile(profile: TwitterProfile): Promise<{
    verified: boolean;
    confidence: number;
    checks: any;
  }> {
    try {
      console.log('🔍 Verifying Twitter profile authenticity...');
      
      const accountAge = profile.createdAt ? 
        (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24) : 0;
      
      const checks = {
        hasProfilePicture: !!profile.avatarUrl && !profile.avatarUrl.includes('default_profile'),
        hasBio: !!profile.bio && profile.bio.length > 10,
        hasFollowers: profile.followersCount >= config.verification.minimumFollowers,
        accountAge: accountAge >= config.verification.accountAgeMinimumDays,
        hasRecentActivity: profile.recentTweets && profile.recentTweets.length > 0,
        goodEngagement: (profile.metrics?.avgEngagementRate || 0) > 1.0,
        notProtected: !profile.isProtected,
        platformVerified: !!profile.isVerifiedAccount
      };
      
      // Calculate follower-to-following ratio (healthy accounts usually follow less than they're followed)
      const followerRatio = profile.followingCount > 0 ? profile.followersCount / profile.followingCount : 1;
      checks.healthyFollowerRatio = followerRatio > 0.1; // Not following too many compared to followers
      
      // Calculate overall verification
      const passedChecks = Object.values(checks).filter(Boolean).length;
      let confidence = (passedChecks / Object.keys(checks).length) * 0.85; // Max 85% for Twitter
      
      // Boost confidence for verified accounts
      if (profile.isVerifiedAccount) {
        confidence = Math.min(confidence + 0.15, 0.95);
      }
      
      const verified = confidence >= 0.6;
      
      console.log(`✅ Twitter verification completed - Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      return {
        verified,
        confidence,
        checks
      };
      
    } catch (error) {
      console.error('❌ Error verifying Twitter profile:', error);
      return {
        verified: false,
        confidence: 0,
        checks: {}
      };
    }
  }
  
  /**
   * Revoke Twitter access
   */
  async revokeAccess(did: string): Promise<void> {
    try {
      const key = `twitter:${did}`;
      const tokenData = this.tokenStore.get(key);
      
      if (tokenData) {
        try {
          // Twitter provides a token revocation endpoint
          await axios.post('https://api.twitter.com/2/oauth2/revoke', {
            token: tokenData.accessToken,
            client_id: config.twitter.clientId,
            client_secret: config.twitter.clientSecret
          }, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
        } catch (error) {
          console.warn('⚠️ Failed to revoke token with Twitter, but removing locally:', error.message);
        }
        
        this.tokenStore.delete(key);
        console.log(`🔓 Twitter access revoked for DID: ${did}`);
      }
      
    } catch (error) {
      console.error('❌ Error revoking Twitter access:', error);
      throw error;
    }
  }
}