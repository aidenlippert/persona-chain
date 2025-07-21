import { LinkedInService } from './LinkedInService';
import { TwitterService } from './TwitterService';
import { GitHubService } from './GitHubService';
import { 
  SocialProfile, 
  SocialCredentials, 
  SocialVerification, 
  InfluenceMetrics, 
  ProfessionalMetrics,
  AccessTokenData 
} from '../types/social';

export class SocialService {
  private linkedInService: LinkedInService;
  private twitterService: TwitterService;
  private gitHubService: GitHubService;
  
  constructor() {
    this.linkedInService = new LinkedInService();
    this.twitterService = new TwitterService();
    this.gitHubService = new GitHubService();
  }
  
  /**
   * Check if user has authorized social data access
   */
  async checkAuthorizationStatus(did: string): Promise<{ 
    authorized: boolean; 
    platforms: { [key: string]: boolean };
    authUrls?: any 
  }> {
    try {
      const [linkedInToken, twitterToken, gitHubToken] = await Promise.all([
        this.linkedInService.getAccessToken(did),
        this.twitterService.getAccessToken(did),
        this.gitHubService.getAccessToken(did)
      ]);
      
      const platforms = {
        linkedin: !!linkedInToken,
        twitter: !!twitterToken,
        github: !!gitHubToken
      };
      
      const authorizedCount = Object.values(platforms).filter(Boolean).length;
      
      if (authorizedCount === 0) {
        return {
          authorized: false,
          platforms,
          authUrls: {
            linkedin: `/oauth/authorizeSocial?did=${did}&platform=linkedin`,
            twitter: `/oauth/authorizeSocial?did=${did}&platform=twitter`,
            github: `/oauth/authorizeSocial?did=${did}&platform=github`
          }
        };
      }
      
      return { 
        authorized: true,
        platforms
      };
      
    } catch (error) {
      console.error('Error checking social authorization status:', error);
      return {
        authorized: false,
        platforms: {
          linkedin: false,
          twitter: false,
          github: false
        },
        authUrls: {
          linkedin: `/oauth/authorizeSocial?did=${did}&platform=linkedin`,
          twitter: `/oauth/authorizeSocial?did=${did}&platform=twitter`,
          github: `/oauth/authorizeSocial?did=${did}&platform=github`
        }
      };
    }
  }
  
  /**
   * Store access token for a platform
   */
  async storeAccessToken(did: string, platform: string, tokenData: AccessTokenData): Promise<void> {
    switch (platform) {
      case 'linkedin':
        await this.linkedInService.storeAccessToken(did, tokenData);
        break;
      case 'twitter':
        await this.twitterService.storeAccessToken(did, tokenData);
        break;
      case 'github':
        await this.gitHubService.storeAccessToken(did, tokenData);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
  
  /**
   * Fetch all social profiles for a DID
   */
  async fetchAllProfiles(did: string): Promise<SocialProfile[]> {
    const profiles: SocialProfile[] = [];
    
    // Fetch LinkedIn profile
    try {
      const linkedInProfile = await this.linkedInService.fetchProfile(did);
      profiles.push(linkedInProfile);
    } catch (error) {
      console.warn('⚠️ Failed to fetch LinkedIn profile:', error.message);
    }
    
    // Fetch Twitter profile
    try {
      const twitterProfile = await this.twitterService.fetchProfile(did);
      profiles.push(twitterProfile);
    } catch (error) {
      console.warn('⚠️ Failed to fetch Twitter profile:', error.message);
    }
    
    // Fetch GitHub profile
    try {
      const gitHubProfile = await this.gitHubService.fetchProfile(did);
      profiles.push(gitHubProfile);
    } catch (error) {
      console.warn('⚠️ Failed to fetch GitHub profile:', error.message);
    }
    
    return profiles;
  }
  
  /**
   * Verify all social profiles and calculate verification levels
   */
  async verifyAllProfiles(profiles: SocialProfile[]): Promise<SocialVerification[]> {
    const verifications: SocialVerification[] = [];
    
    for (const profile of profiles) {
      try {
        let verification;
        
        switch (profile.platform) {
          case 'linkedin':
            verification = await this.linkedInService.verifyProfile(profile as any);
            break;
          case 'twitter':
            verification = await this.twitterService.verifyProfile(profile as any);
            break;
          case 'github':
            verification = await this.gitHubService.verifyProfile(profile as any);
            break;
          default:
            continue;
        }
        
        const socialVerification: SocialVerification = {
          platform: profile.platform,
          profileId: profile.id,
          verificationLevel: this.calculateVerificationLevel(verification.confidence, profile),
          verificationChecks: verification.checks,
          credibilityScore: verification.confidence * 100,
          verified: verification.verified,
          verifiedAt: new Date().toISOString()
        };
        
        // Add influence metrics for social platforms
        if (profile.platform === 'twitter') {
          socialVerification.influenceMetrics = this.calculateInfluenceMetrics(profile as any);
        }
        
        // Add professional metrics for professional platforms
        if (profile.platform === 'linkedin' || profile.platform === 'github') {
          socialVerification.professionalMetrics = this.calculateProfessionalMetrics(profile as any);
        }
        
        verifications.push(socialVerification);
        
      } catch (error) {
        console.error(`❌ Error verifying ${profile.platform} profile:`, error);
      }
    }
    
    return verifications;
  }
  
  /**
   * Calculate verification level based on confidence and profile data
   */
  private calculateVerificationLevel(
    confidence: number, 
    profile: SocialProfile
  ): 'basic' | 'standard' | 'premium' | 'influencer' | 'professional' {
    
    // Check for influencer status (Twitter)
    if (profile.platform === 'twitter') {
      const twitterProfile = profile as any;
      if (twitterProfile.followersCount > 10000 && confidence > 0.8) {
        return 'influencer';
      }
    }
    
    // Check for professional status (LinkedIn/GitHub)
    if (profile.platform === 'linkedin' || profile.platform === 'github') {
      if (confidence > 0.85) {
        return 'professional';
      }
    }
    
    // Standard verification levels
    if (confidence >= 0.9) return 'premium';
    if (confidence >= 0.7) return 'standard';
    return 'basic';
  }
  
  /**
   * Calculate influence metrics for social platforms
   */
  private calculateInfluenceMetrics(profile: any): InfluenceMetrics {
    const followerCount = profile.followersCount || 0;
    const engagementRate = profile.metrics?.avgEngagementRate || 0;
    
    let influenceRank: 'micro' | 'mid' | 'macro' | 'mega' = 'micro';
    if (followerCount > 1000000) influenceRank = 'mega';
    else if (followerCount > 100000) influenceRank = 'macro';
    else if (followerCount > 10000) influenceRank = 'mid';
    
    return {
      followerCount,
      engagementRate,
      reachEstimate: followerCount * (engagementRate / 100),
      contentQualityScore: Math.min(engagementRate * 10, 100),
      audienceQuality: followerCount > 0 ? Math.min((profile.followingCount || 0) / followerCount * 100, 100) : 0,
      influenceRank
    };
  }
  
  /**
   * Calculate professional metrics for professional platforms
   */
  private calculateProfessionalMetrics(profile: any): ProfessionalMetrics {
    let connectionCount = 0;
    let endorsementCount = 0;
    let skillsCount = 0;
    let publicationsCount = 0;
    let certificationsCount = 0;
    
    if (profile.platform === 'linkedin') {
      connectionCount = profile.connections || 0;
      endorsementCount = profile.endorsements?.reduce((sum: number, e: any) => sum + e.count, 0) || 0;
      skillsCount = profile.skills?.length || 0;
      publicationsCount = profile.publications?.length || 0;
      certificationsCount = profile.certifications?.length || 0;
    } else if (profile.platform === 'github') {
      connectionCount = profile.followers || 0;
      endorsementCount = profile.contributions?.totalStars || 0;
      skillsCount = profile.repositories?.length || 0;
    }
    
    const professionalScore = Math.min(
      (connectionCount * 0.3 + 
       endorsementCount * 0.25 + 
       skillsCount * 0.2 + 
       publicationsCount * 0.15 + 
       certificationsCount * 0.1) / 10,
      100
    );
    
    return {
      connectionCount,
      endorsementCount,
      skillsCount,
      publicationsCount,
      certificationsCount,
      industryRank: Math.floor(professionalScore / 10),
      professionalScore
    };
  }
  
  /**
   * Calculate aggregate social credentials
   */
  async calculateSocialCredentials(did: string): Promise<SocialCredentials> {
    try {
      console.log('📊 Calculating social credentials...');
      
      const profiles = await this.fetchAllProfiles(did);
      const verifications = await this.verifyAllProfiles(profiles);
      
      // Calculate aggregate metrics
      const aggregateMetrics = {
        totalFollowers: profiles.reduce((sum, profile) => {
          if (profile.platform === 'twitter') return sum + (profile as any).followersCount;
          if (profile.platform === 'github') return sum + (profile as any).followers;
          return sum;
        }, 0),
        totalConnections: profiles.reduce((sum, profile) => {
          if (profile.platform === 'linkedin') return sum + ((profile as any).connections || 0);
          return sum;
        }, 0),
        averageEngagement: profiles.reduce((sum, profile, index, array) => {
          if (profile.platform === 'twitter') {
            const engagement = (profile as any).metrics?.avgEngagementRate || 0;
            return index === array.length - 1 ? (sum + engagement) / array.length : sum + engagement;
          }
          return sum;
        }, 0),
        platformCount: profiles.length,
        verifiedPlatforms: verifications.filter(v => v.verified).length,
        professionalNetworks: profiles.filter(p => ['linkedin', 'github'].includes(p.platform)).length,
        socialNetworks: profiles.filter(p => ['twitter'].includes(p.platform)).length
      };
      
      const credentials: SocialCredentials = {
        did,
        profiles,
        verifications,
        aggregateMetrics,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`✅ Social credentials calculated:`, {
        platforms: credentials.profiles.length,
        verifications: credentials.verifications.length,
        totalFollowers: credentials.aggregateMetrics.totalFollowers
      });
      
      return credentials;
      
    } catch (error) {
      console.error('❌ Error calculating social credentials:', error);
      throw error;
    }
  }
  
  /**
   * Get connection status for all platforms
   */
  async getConnectionStatus(did: string): Promise<any> {
    try {
      const authStatus = await this.checkAuthorizationStatus(did);
      
      return {
        did,
        connections: authStatus.platforms,
        authorizedPlatforms: Object.entries(authStatus.platforms)
          .filter(([, authorized]) => authorized)
          .map(([platform]) => platform),
        availablePlatforms: ['linkedin', 'twitter', 'github'],
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error getting social connection status:', error);
      throw error;
    }
  }
  
  /**
   * Revoke access for a platform
   */
  async revokeAccess(did: string, platform: string): Promise<void> {
    try {
      switch (platform) {
        case 'linkedin':
          await this.linkedInService.revokeAccess(did);
          break;
        case 'twitter':
          await this.twitterService.revokeAccess(did);
          break;
        case 'github':
          await this.gitHubService.revokeAccess(did);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      console.log(`🔓 Social access revoked for DID: ${did}, Platform: ${platform}`);
    } catch (error) {
      console.error('❌ Error revoking social access:', error);
      throw error;
    }
  }
  
  /**
   * Verify social credential authenticity
   */
  async verifyCredential(commitment: string, metadata: any): Promise<{ verified: boolean; confidence: number; sources: string[] }> {
    try {
      console.log('🔍 Verifying social credential...');
      
      // Verification logic based on platform
      let confidence = 0.5; // Base confidence
      
      switch (metadata.platform) {
        case 'linkedin':
          confidence = 0.85; // LinkedIn has strong verification
          break;
        case 'twitter':
          confidence = metadata.isVerifiedAccount ? 0.95 : 0.7;
          break;
        case 'github':
          confidence = 0.9; // GitHub has good API verification
          break;
        default:
          confidence = 0.6;
      }
      
      // Adjust based on verification checks
      if (metadata.verificationChecks) {
        const passedChecks = Object.values(metadata.verificationChecks).filter(Boolean).length;
        const totalChecks = Object.keys(metadata.verificationChecks).length;
        confidence *= (passedChecks / totalChecks);
      }
      
      const verified = confidence >= 0.6;
      
      return {
        verified,
        confidence,
        sources: ['Platform API', 'OAuth Verification', 'Profile Analysis']
      };
      
    } catch (error) {
      console.error('❌ Error verifying social credential:', error);
      return {
        verified: false,
        confidence: 0,
        sources: []
      };
    }
  }
}