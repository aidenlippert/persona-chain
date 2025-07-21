import axios from 'axios';
import { config } from '../config/config';
import { GitHubProfile, GitHubRepository, GitHubContributions, AccessTokenData } from '../types/social';

export class GitHubService {
  private tokenStore = new Map(); // In production, use encrypted database
  
  /**
   * Build GitHub OAuth authorization URL
   */
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: config.github.redirectUri,
      scope: config.github.scope,
      state
    });
    
    return `${config.github.authUrl}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    try {
      console.log('🔄 Exchanging GitHub authorization code for token...');
      
      const response = await axios.post(config.github.tokenUrl, {
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ GitHub token exchange successful');
      return response.data;
      
    } catch (error) {
      console.error('❌ Error exchanging GitHub code for token:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock GitHub token for development');
        return {
          access_token: `mock_github_token_${Date.now()}`,
          scope: config.github.scope,
          token_type: 'bearer'
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Store access token for a DID
   */
  async storeAccessToken(did: string, tokenData: AccessTokenData): Promise<void> {
    const key = `github:${did}`;
    
    // In production, encrypt and store in database
    this.tokenStore.set(key, {
      ...tokenData,
      updatedAt: Date.now()
    });
    
    console.log(`🔐 GitHub access token stored for DID: ${did}`);
  }
  
  /**
   * Get access token for a DID
   */
  async getAccessToken(did: string): Promise<AccessTokenData | null> {
    const key = `github:${did}`;
    const tokenData = this.tokenStore.get(key);
    
    if (!tokenData) return null;
    
    // GitHub tokens don't expire by default, but check if manually expired
    if (tokenData.expiresAt && Date.now() >= tokenData.expiresAt) {
      console.log(`⏰ GitHub token expired for DID: ${did}`);
      this.tokenStore.delete(key);
      return null;
    }
    
    return tokenData;
  }
  
  /**
   * Make authenticated GitHub API request
   */
  private async makeGitHubRequest(endpoint: string, accessToken: string, params?: any): Promise<any> {
    try {
      const url = `${config.github.baseUrl}/${endpoint}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PersonaPass-Social-Connector'
        },
        params,
        timeout: 30000
      });
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ GitHub API request failed for ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Fetch GitHub profile information
   */
  async fetchProfile(did: string): Promise<GitHubProfile> {
    try {
      const accessToken = await this.getAccessToken(did);
      if (!accessToken) {
        throw new Error('GitHub access token not available');
      }
      
      console.log('🐙 Fetching GitHub profile data...');
      
      // Fetch user profile
      const userData = await this.makeGitHubRequest('user', accessToken.accessToken);
      
      // Fetch user's repositories
      const repositoriesData = await this.makeGitHubRequest(
        'user/repos',
        accessToken.accessToken,
        { 
          sort: 'updated', 
          per_page: 30,
          affiliation: 'owner'
        }
      );
      
      // Calculate contributions and achievements
      const contributions = await this.calculateContributions(userData.login, accessToken.accessToken);
      
      // Transform repositories
      const repositories: GitHubRepository[] = repositoriesData.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        size: repo.size,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        topics: repo.topics || [],
        license: repo.license ? {
          name: repo.license.name,
          spdxId: repo.license.spdx_id
        } : undefined
      }));
      
      // Transform to our profile format
      const profile: GitHubProfile = {
        id: userData.id.toString(),
        platform: 'github',
        username: userData.login,
        displayName: userData.name || userData.login,
        profileUrl: userData.html_url,
        avatarUrl: userData.avatar_url,
        bio: userData.bio,
        location: userData.location,
        website: userData.blog,
        verified: true,
        createdAt: userData.created_at,
        lastUpdated: new Date().toISOString(),
        login: userData.login,
        name: userData.name,
        company: userData.company,
        blog: userData.blog,
        email: userData.email,
        publicRepos: userData.public_repos,
        publicGists: userData.public_gists,
        followers: userData.followers,
        following: userData.following,
        repositories: repositories.slice(0, 10), // Top 10 repositories
        contributions,
        achievements: [] // Would require GitHub GraphQL API for detailed achievements
      };
      
      console.log(`✅ GitHub profile fetched successfully for: ${profile.username}`);
      return profile;
      
    } catch (error) {
      console.error('❌ Error fetching GitHub profile:', error);
      
      // Return mock data for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock GitHub profile for development');
        return {
          id: 'github_mock_1',
          platform: 'github',
          username: 'johndoe-dev',
          displayName: 'John Doe',
          profileUrl: 'https://github.com/johndoe-dev',
          avatarUrl: 'https://avatars.githubusercontent.com/u/mock-avatar',
          bio: 'Full-stack developer passionate about open source',
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          verified: true,
          createdAt: '2018-05-20T10:30:00Z',
          lastUpdated: new Date().toISOString(),
          login: 'johndoe-dev',
          name: 'John Doe',
          company: 'Tech Corp',
          email: 'john@johndoe.dev',
          publicRepos: 42,
          publicGists: 8,
          followers: 156,
          following: 89,
          repositories: [
            {
              id: 1,
              name: 'awesome-project',
              fullName: 'johndoe-dev/awesome-project',
              description: 'An awesome web application built with React and Node.js',
              language: 'JavaScript',
              stargazersCount: 23,
              forksCount: 7,
              size: 1024,
              createdAt: '2023-01-15T10:30:00Z',
              updatedAt: '2023-12-01T14:20:00Z',
              topics: ['react', 'nodejs', 'web-development'],
              license: {
                name: 'MIT License',
                spdxId: 'MIT'
              }
            }
          ],
          contributions: {
            totalCommits: 1247,
            totalPRs: 89,
            totalIssues: 156,
            totalStars: 234,
            contributionsLastYear: 892,
            streakDays: 45
          },
          achievements: []
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Calculate user contributions statistics
   */
  private async calculateContributions(username: string, accessToken: string): Promise<GitHubContributions> {
    try {
      // Fetch user events for contribution calculation
      const eventsData = await this.makeGitHubRequest(
        `users/${username}/events`,
        accessToken,
        { per_page: 100 }
      );
      
      // Fetch starred repositories count
      const starredData = await this.makeGitHubRequest(
        `users/${username}/starred`,
        accessToken,
        { per_page: 1 }
      );
      
      let totalCommits = 0;
      let totalPRs = 0;
      let totalIssues = 0;
      let contributionsLastYear = 0;
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      eventsData.forEach((event: any) => {
        const eventDate = new Date(event.created_at);
        
        switch (event.type) {
          case 'PushEvent':
            totalCommits += event.payload?.commits?.length || 0;
            if (eventDate > oneYearAgo) {
              contributionsLastYear += event.payload?.commits?.length || 0;
            }
            break;
          case 'PullRequestEvent':
            totalPRs++;
            if (eventDate > oneYearAgo) contributionsLastYear++;
            break;
          case 'IssuesEvent':
            totalIssues++;
            if (eventDate > oneYearAgo) contributionsLastYear++;
            break;
        }
      });
      
      return {
        totalCommits,
        totalPRs,
        totalIssues,
        totalStars: Array.isArray(starredData) ? starredData.length : 0,
        contributionsLastYear,
        streakDays: this.calculateStreakDays(eventsData)
      };
      
    } catch (error) {
      console.warn('⚠️ Could not calculate GitHub contributions:', error.message);
      return {
        totalCommits: 0,
        totalPRs: 0,
        totalIssues: 0,
        totalStars: 0,
        contributionsLastYear: 0,
        streakDays: 0
      };
    }
  }
  
  /**
   * Calculate contribution streak days
   */
  private calculateStreakDays(events: any[]): number {
    if (!events.length) return 0;
    
    const contributionDates = events
      .map(event => new Date(event.created_at).toDateString())
      .filter((date, index, array) => array.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streakDays = 0;
    let currentDate = new Date();
    
    for (const dateString of contributionDates) {
      const contributionDate = new Date(dateString);
      const daysDiff = Math.floor((currentDate.getTime() - contributionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= streakDays + 1) {
        streakDays = daysDiff + 1;
        currentDate = contributionDate;
      } else {
        break;
      }
    }
    
    return streakDays;
  }
  
  /**
   * Verify GitHub profile authenticity
   */
  async verifyProfile(profile: GitHubProfile): Promise<{
    verified: boolean;
    confidence: number;
    checks: any;
  }> {
    try {
      console.log('🔍 Verifying GitHub profile authenticity...');
      
      const accountAge = profile.createdAt ? 
        (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24) : 0;
      
      const checks = {
        hasProfilePicture: !!profile.avatarUrl && !profile.avatarUrl.includes('identicon'),
        hasBio: !!profile.bio && profile.bio.length > 5,
        hasRepositories: profile.publicRepos >= 1,
        hasRecentActivity: (profile.contributions?.contributionsLastYear || 0) > 0,
        hasFollowers: profile.followers >= 1,
        accountAge: accountAge >= config.verification.accountAgeMinimumDays,
        hasStars: (profile.contributions?.totalStars || 0) > 0,
        hasContributions: (profile.contributions?.totalCommits || 0) > 10
      };
      
      // Calculate repository quality score
      const avgStarsPerRepo = profile.publicRepos > 0 ? 
        (profile.repositories?.reduce((sum, repo) => sum + repo.stargazersCount, 0) || 0) / profile.publicRepos : 0;
      checks.qualityRepositories = avgStarsPerRepo >= 1;
      
      // Calculate overall verification
      const passedChecks = Object.values(checks).filter(Boolean).length;
      const confidence = (passedChecks / Object.keys(checks).length) * 0.92; // Max 92% for GitHub
      const verified = confidence >= 0.6;
      
      console.log(`✅ GitHub verification completed - Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      return {
        verified,
        confidence,
        checks
      };
      
    } catch (error) {
      console.error('❌ Error verifying GitHub profile:', error);
      return {
        verified: false,
        confidence: 0,
        checks: {}
      };
    }
  }
  
  /**
   * Revoke GitHub access
   */
  async revokeAccess(did: string): Promise<void> {
    try {
      const key = `github:${did}`;
      const tokenData = this.tokenStore.get(key);
      
      if (tokenData) {
        try {
          // GitHub provides a token revocation endpoint
          await axios.delete(`${config.github.baseUrl}/applications/${config.github.clientId}/token`, {
            headers: {
              'Authorization': `token ${tokenData.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            },
            data: {
              access_token: tokenData.accessToken
            }
          });
        } catch (error) {
          console.warn('⚠️ Failed to revoke token with GitHub, but removing locally:', error.message);
        }
        
        this.tokenStore.delete(key);
        console.log(`🔓 GitHub access revoked for DID: ${did}`);
      }
      
    } catch (error) {
      console.error('❌ Error revoking GitHub access:', error);
      throw error;
    }
  }
}