import axios from 'axios';
import { config } from '../config/config';
import { LinkedInProfile, AccessTokenData } from '../types/social';

export class LinkedInService {
  private tokenStore = new Map(); // In production, use encrypted database
  
  /**
   * Build LinkedIn OAuth authorization URL
   */
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.linkedin.clientId,
      redirect_uri: config.linkedin.redirectUri,
      scope: config.linkedin.scope,
      state
    });
    
    return `${config.linkedin.authUrl}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    try {
      console.log('🔄 Exchanging LinkedIn authorization code for token...');
      
      const response = await axios.post(config.linkedin.tokenUrl, {
        grant_type: 'authorization_code',
        code,
        client_id: config.linkedin.clientId,
        client_secret: config.linkedin.clientSecret,
        redirect_uri: config.linkedin.redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('✅ LinkedIn token exchange successful');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error exchanging LinkedIn code for token:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock LinkedIn token for development');
        return {
          access_token: `mock_linkedin_token_${Date.now()}`,
          expires_in: 5184000, // 60 days
          scope: config.linkedin.scope
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Store access token for a DID
   */
  async storeAccessToken(did: string, tokenData: AccessTokenData): Promise<void> {
    const key = `linkedin:${did}`;
    
    // In production, encrypt and store in database
    this.tokenStore.set(key, {
      ...tokenData,
      updatedAt: Date.now()
    });
    
    console.log(`🔐 LinkedIn access token stored for DID: ${did}`);
  }
  
  /**
   * Get access token for a DID
   */
  async getAccessToken(did: string): Promise<AccessTokenData | null> {
    const key = `linkedin:${did}`;
    const tokenData = this.tokenStore.get(key);
    
    if (!tokenData) return null;
    
    // Check if token is expired
    if (Date.now() >= tokenData.expiresAt) {
      console.log(`⏰ LinkedIn token expired for DID: ${did}`);
      this.tokenStore.delete(key);
      return null;
    }
    
    return tokenData;
  }
  
  /**
   * Make authenticated LinkedIn API request
   */
  private async makeLinkedInRequest(endpoint: string, accessToken: string, params?: any): Promise<any> {
    try {
      const url = `${config.linkedin.baseUrl}/${config.linkedin.apiVersion}/${endpoint}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        params,
        timeout: 30000
      });
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ LinkedIn API request failed for ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Fetch LinkedIn profile information
   */
  async fetchProfile(did: string): Promise<LinkedInProfile> {
    try {
      const accessToken = await this.getAccessToken(did);
      if (!accessToken) {
        throw new Error('LinkedIn access token not available');
      }
      
      console.log('👤 Fetching LinkedIn profile data...');
      
      // Fetch basic profile
      const profileData = await this.makeLinkedInRequest(
        'people/~:(id,firstName,lastName,headline,industry,summary,location,pictureUrl,publicProfileUrl)',
        accessToken.accessToken
      );
      
      // Fetch email address
      let emailData;
      try {
        emailData = await this.makeLinkedInRequest(
          'emailAddress?q=members&projection=(elements*(handle~))',
          accessToken.accessToken
        );
      } catch (error) {
        console.warn('⚠️ Could not fetch LinkedIn email:', error.message);
      }
      
      // Fetch positions (work experience)
      let positionsData;
      try {
        positionsData = await this.makeLinkedInRequest(
          'people/~/positions:(id,title,summary,startDate,endDate,isCurrent,company:(id,name,industry,size))',
          accessToken.accessToken
        );
      } catch (error) {
        console.warn('⚠️ Could not fetch LinkedIn positions:', error.message);
      }
      
      // Fetch education
      let educationData;
      try {
        educationData = await this.makeLinkedInRequest(
          'people/~/educations:(id,schoolName,fieldOfStudy,degree,startDate,endDate,grade,activities)',
          accessToken.accessToken
        );
      } catch (error) {
        console.warn('⚠️ Could not fetch LinkedIn education:', error.message);
      }
      
      // Fetch skills
      let skillsData;
      try {
        skillsData = await this.makeLinkedInRequest(
          'people/~/skills:(id,skill:(name))',
          accessToken.accessToken
        );
      } catch (error) {
        console.warn('⚠️ Could not fetch LinkedIn skills:', error.message);
      }
      
      // Transform to our profile format
      const profile: LinkedInProfile = {
        id: profileData.id,
        platform: 'linkedin',
        username: profileData.publicProfileUrl?.split('/').pop() || profileData.id,
        displayName: `${profileData.firstName?.localized?.en_US || ''} ${profileData.lastName?.localized?.en_US || ''}`.trim(),
        profileUrl: profileData.publicProfileUrl || `https://linkedin.com/in/${profileData.id}`,
        avatarUrl: profileData.pictureUrl,
        bio: profileData.summary?.localized?.en_US,
        location: profileData.location?.name,
        verified: true,
        lastUpdated: new Date().toISOString(),
        headline: profileData.headline?.localized?.en_US,
        industry: profileData.industry,
        currentPosition: positionsData?.values?.find((pos: any) => pos.isCurrent) ? {
          title: positionsData.values[0].title,
          company: positionsData.values[0].company?.name,
          companyId: positionsData.values[0].company?.id,
          current: positionsData.values[0].isCurrent,
          description: positionsData.values[0].summary
        } : undefined,
        education: educationData?.values?.map((edu: any) => ({
          school: edu.schoolName,
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy,
          startDate: edu.startDate ? `${edu.startDate.year}-${edu.startDate.month}-01` : undefined,
          endDate: edu.endDate ? `${edu.endDate.year}-${edu.endDate.month}-01` : undefined,
          grade: edu.grade,
          activities: edu.activities
        })) || [],
        skills: skillsData?.values?.map((skill: any) => ({
          name: skill.skill?.name,
          endorsements: 0 // Would need additional API call for endorsement counts
        })) || [],
        connections: undefined, // Requires LinkedIn Partner Program access
        endorsements: [],
        publications: [],
        certifications: []
      };
      
      console.log(`✅ LinkedIn profile fetched successfully for: ${profile.displayName}`);
      return profile;
      
    } catch (error) {
      console.error('❌ Error fetching LinkedIn profile:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock LinkedIn profile for development');
        return {
          id: 'linkedin_mock_1',
          platform: 'linkedin',
          username: 'john-doe-professional',
          displayName: 'John Doe',
          profileUrl: 'https://linkedin.com/in/john-doe-professional',
          avatarUrl: 'https://media.licdn.com/dms/image/mock-avatar.jpg',
          bio: 'Senior Software Engineer passionate about building scalable systems',
          location: 'San Francisco, CA',
          verified: true,
          lastUpdated: new Date().toISOString(),
          headline: 'Senior Software Engineer at Tech Corp',
          industry: 'Computer Software',
          currentPosition: {
            title: 'Senior Software Engineer',
            company: 'Tech Corp',
            current: true,
            description: 'Leading development of cloud-native applications'
          },
          education: [
            {
              school: 'Stanford University',
              degree: 'Bachelor of Science',
              fieldOfStudy: 'Computer Science',
              startDate: '2015-09-01',
              endDate: '2019-06-01'
            }
          ],
          connections: 500,
          skills: [
            { name: 'JavaScript', endorsements: 25 },
            { name: 'React', endorsements: 18 },
            { name: 'Node.js', endorsements: 22 }
          ],
          endorsements: [],
          publications: [],
          certifications: []
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Get LinkedIn connection count (requires Partner Program access)
   */
  async getConnectionCount(did: string): Promise<number> {
    try {
      const accessToken = await this.getAccessToken(did);
      if (!accessToken) {
        throw new Error('LinkedIn access token not available');
      }
      
      // This endpoint requires LinkedIn Partner Program access
      const connectionsData = await this.makeLinkedInRequest(
        'people/~/connections',
        accessToken.accessToken
      );
      
      return connectionsData._total || 0;
      
    } catch (error) {
      console.warn('⚠️ Could not fetch LinkedIn connection count:', error.message);
      // Return estimated count for development
      return config.nodeEnv === 'development' ? Math.floor(Math.random() * 1000) + 100 : 0;
    }
  }
  
  /**
   * Verify LinkedIn profile authenticity
   */
  async verifyProfile(profile: LinkedInProfile): Promise<{
    verified: boolean;
    confidence: number;
    checks: any;
  }> {
    try {
      console.log('🔍 Verifying LinkedIn profile authenticity...');
      
      const checks = {
        hasProfilePicture: !!profile.avatarUrl,
        hasHeadline: !!profile.headline,
        hasExperience: (profile.currentPosition !== undefined) || (profile.education && profile.education.length > 0),
        hasSkills: profile.skills && profile.skills.length >= 3,
        hasConnections: (profile.connections || 0) >= config.verification.minimumConnections,
        profileComplete: false
      };
      
      // Calculate profile completeness
      const completenessFactors = [
        checks.hasProfilePicture,
        checks.hasHeadline,
        checks.hasExperience,
        checks.hasSkills,
        !!profile.bio,
        !!profile.location
      ];
      
      const completenessScore = completenessFactors.filter(Boolean).length / completenessFactors.length;
      checks.profileComplete = completenessScore >= 0.7;
      
      // Calculate overall verification
      const passedChecks = Object.values(checks).filter(Boolean).length;
      const confidence = (passedChecks / Object.keys(checks).length) * 0.9; // Max 90% for LinkedIn
      const verified = confidence >= 0.6;
      
      console.log(`✅ LinkedIn verification completed - Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      return {
        verified,
        confidence,
        checks
      };
      
    } catch (error) {
      console.error('❌ Error verifying LinkedIn profile:', error);
      return {
        verified: false,
        confidence: 0,
        checks: {}
      };
    }
  }
  
  /**
   * Revoke LinkedIn access
   */
  async revokeAccess(did: string): Promise<void> {
    try {
      const key = `linkedin:${did}`;
      const tokenData = this.tokenStore.get(key);
      
      if (tokenData) {
        // LinkedIn doesn't provide a token revocation endpoint
        // Just remove from our storage
        this.tokenStore.delete(key);
        console.log(`🔓 LinkedIn access revoked for DID: ${did}`);
      }
      
    } catch (error) {
      console.error('❌ Error revoking LinkedIn access:', error);
      throw error;
    }
  }
}