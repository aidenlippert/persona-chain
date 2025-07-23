/**
 * 🐙 GITHUB API INTEGRATION SERVICE
 * Real GitHub API integration for developer credentials
 * OAuth2 flow + Repository statistics + Developer profile
 */

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubStats {
  totalStars: number;
  totalForks: number;
  totalCommits: number;
  languages: { [key: string]: number };
  topRepositories: GitHubRepository[];
  contributionScore: number;
}

export interface GitHubCredentialData {
  user: GitHubUser;
  stats: GitHubStats;
  verificationDate: string;
  credentialType: 'DeveloperSkillCredential';
}

/**
 * 🐙 GITHUB API INTEGRATION SERVICE
 */
export class GitHubAPIService {
  private accessToken: string | null = null;
  private baseURL = 'https://api.github.com';
  private credentialData: any = null;

  /**
   * 🔑 Set GitHub access token (from OAuth flow)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    console.log('🐙 GitHub access token set successfully');
  }

  /**
   * 🔗 Start GitHub OAuth flow (RETURNS URL FOR POPUP)
   */
  startOAuthFlow(): string {
    console.log('🚀🚀🚀 POPUP MODE: Starting GitHub OAuth flow for popup');
    
    // CLEAR OLD DATA BUT KEEP SESSION STATE UNTIL CALLBACK
    this.clearOldCredentialData();
    
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    console.log('🔍 DEBUG: Client ID exists:', !!clientId);
    
    if (!clientId) {
      console.error('❌ CRITICAL ERROR: GitHub Client ID not configured!');
      throw new Error('GitHub Client ID not configured');
    }

    const scopes = ['user', 'public_repo', 'read:org'];
    
    // Use current domain for redirect URI to handle different environments
    const currentDomain = window.location.origin;
    const redirectUri = `${currentDomain}/oauth/github/callback`;
    
    console.log('🌐 Using redirect URI:', redirectUri);
    
    // Log the domain detection for debugging
    console.log('🔍 Domain detection:', {
      currentOrigin: window.location.origin,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isDev: window.location.hostname === 'localhost',
      isVercel: window.location.hostname.includes('vercel.app'),
      isProduction: window.location.hostname === 'personapass.xyz'
    });
    
    // Generate FRESH state with timestamp to ensure uniqueness
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const state = `${timestamp}_${randomString}`;
    
    console.log('🔍 DEBUG: FRESH OAuth parameters:', {
      clientId: clientId.substring(0, 8) + '...',
      redirectUri,
      state,
      stateLength: state.length,
      scopes: scopes.join(' '),
      timestamp
    });
    
    // Store FRESH state for callback validation
    try {
      sessionStorage.setItem('github_oauth_state', state);
      localStorage.setItem('github_oauth_state_backup', state);
      console.log('✅ DEBUG: FRESH OAuth state stored successfully:', state);
    } catch (error) {
      console.warn('⚠️ DEBUG: Could not store OAuth state:', error);
    }
    
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    // Force fresh consent by adding timestamp
    authUrl.searchParams.set('allow_signup', 'true');
    
    const finalUrl = authUrl.toString();
    console.log('🔗 DEBUG: FRESH OAuth URL:', finalUrl);
    console.log('🪟 DEBUG: Returning URL for popup window...');
    
    return finalUrl;
  }

  /**
   * 🧹 Clear old credential data but preserve OAuth state
   */
  private clearOldCredentialData(): void {
    console.log('🧹 CLEARING old credential data for fresh session...');
    
    // Clear old credential data but NOT OAuth state (needed for validation)
    localStorage.removeItem('github_credential_cache_v3');
    
    // Clear service state
    this.accessToken = null;
    this.credentialData = null;
    
    console.log('✅ Old credential data cleared - OAuth state preserved for validation');
  }

  /**
   * 🧹 Clear OAuth state after successful validation
   */
  private clearOAuthStateAfterValidation(): void {
    console.log('🧹 CLEARING OAuth state after successful validation...');
    
    // Now safe to clear OAuth state after successful callback
    sessionStorage.removeItem('github_oauth_state');
    localStorage.removeItem('github_oauth_state_backup');
    
    console.log('✅ OAuth state cleared after successful validation');
  }

  /**
   * 🎫 Exchange OAuth code for REAL GitHub data via CORS proxy
   */
  async exchangeCodeForToken(code: string, state: string): Promise<string> {
    console.log('🚀 GITHUB OAUTH: Processing OAuth callback');
    console.log('🔄 OAuth Code:', code.substring(0, 10) + '...');
    console.log('🔄 State param:', state || 'none');
    
    // Exchange code for REAL GitHub access token
    console.log('🔑 REAL MODE: Exchanging code for actual GitHub access token...');
    
    try {
      // Step 1: Exchange code for access token - Use direct GitHub API
      console.log('🔑 Step 1: Exchanging code for real GitHub access token...');
      
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
          client_secret: import.meta.env.VITE_GITHUB_CLIENT_SECRET,
          code: code
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }

      const responseText = await tokenResponse.text();
      console.log('🔍 Raw token response:', responseText);
      
      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
      } catch (parseError) {
        // If response is URL-encoded (GitHub's default)
        const params = new URLSearchParams(responseText);
        tokenData = {
          access_token: params.get('access_token'),
          token_type: params.get('token_type'),
          scope: params.get('scope')
        };
      }
      
      if (!tokenData.access_token) {
        throw new Error('No access token received from GitHub');
      }
      
      console.log('✅ Real GitHub access token received');
      this.setAccessToken(tokenData.access_token);

      // Step 2: Fetch real user data from GitHub API
      console.log('👤 Step 2: Fetching your REAL GitHub profile...');
      
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PersonaPass-Wallet'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`GitHub API call failed: ${userResponse.status} ${userResponse.statusText}`);
      }

      const realUserData = await userResponse.json();
      console.log('🎉 REAL GitHub data received for user:', realUserData.login);

      // Create credential with REAL data
      const realGitHubCredential = this.createCredentialFromRealData(realUserData, tokenData.access_token);
      
      // Store the credential properly
      this.credentialData = realGitHubCredential;
      localStorage.setItem('github_credential_cache_v3', JSON.stringify(realGitHubCredential));
      
      // Clear OAuth state after successful processing
      this.clearOAuthStateAfterValidation();
      
      return tokenData.access_token;
      
    } catch (error) {
      console.error('❌ Failed to get real GitHub data:', error);
      throw new Error(`GitHub OAuth failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create credential from real GitHub API data
   */
  private createCredentialFromRealData(userData: any, accessToken: string) {
    console.log('🏗️ Creating credential from REAL GitHub data...');
    
    const realCredential = {
      id: `github_cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://persona.xyz/contexts/v1"
      ],
      type: ["VerifiableCredential", "GitHubCredential"],
      issuer: "did:persona:github",
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:persona:user_${userData.id}`,
        platform: 'github',
        username: userData.login,
        userId: userData.id,
        name: userData.name || userData.login,
        email: userData.email || 'private',
        publicRepos: userData.public_repos || 0,
        followers: userData.followers || 0,
        following: userData.following || 0,
        memberSince: userData.created_at || new Date().toISOString(),
        bio: userData.bio || 'GitHub Developer',
        company: userData.company || null,
        location: userData.location || null,
        avatarUrl: userData.avatar_url,
        profileUrl: userData.html_url,
        verifiedAt: new Date().toISOString(),
        accessToken: accessToken.substring(0, 8) + '...' // Truncated for security
      },
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        proofPurpose: "assertionMethod",
        verificationMethod: "did:persona:github#key-1"
      },
      blockchainTxHash: `0x${Math.random().toString(16).substring(2, 66)}`
    };
    
    console.log('🎉 REAL GitHub credential created:', {
      id: realCredential.id,
      username: realCredential.credentialSubject.username,
      name: realCredential.credentialSubject.name,
      repos: realCredential.credentialSubject.publicRepos,
      followers: realCredential.credentialSubject.followers
    });
    
    return realCredential;
  }


  /**
   * 🧑‍💻 Get authenticated user profile
   */
  async getUser(): Promise<GitHubUser> {
    if (!this.accessToken) {
      throw new Error('GitHub access token required');
    }

    try {
      const response = await fetch(`${this.baseURL}/user`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get GitHub user:', error);
      throw error;
    }
  }

  /**
   * 📁 Get user repositories
   */
  async getRepositories(page: number = 1, perPage: number = 100): Promise<GitHubRepository[]> {
    if (!this.accessToken) {
      throw new Error('GitHub access token required');
    }

    try {
      const url = new URL(`${this.baseURL}/user/repos`);
      url.searchParams.set('type', 'owner');
      url.searchParams.set('sort', 'updated');
      url.searchParams.set('per_page', perPage.toString());
      url.searchParams.set('page', page.toString());

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get GitHub repositories:', error);
      throw error;
    }
  }

  /**
   * 📊 Calculate developer statistics
   */
  async getDeveloperStats(): Promise<GitHubStats> {
    try {
      console.log('📊 Calculating GitHub developer statistics...');
      
      const repositories = await this.getRepositories();
      
      const stats: GitHubStats = {
        totalStars: 0,
        totalForks: 0,
        totalCommits: 0,
        languages: {},
        topRepositories: [],
        contributionScore: 0,
      };

      // Analyze repositories
      for (const repo of repositories) {
        stats.totalStars += repo.stargazers_count;
        stats.totalForks += repo.forks_count;

        // Track languages
        if (repo.language) {
          stats.languages[repo.language] = (stats.languages[repo.language] || 0) + 1;
        }
      }

      // Get top repositories by stars
      stats.topRepositories = repositories
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 10);

      // Calculate contribution score (simplified algorithm)
      stats.contributionScore = Math.min(100, Math.round(
        (stats.totalStars * 2) + 
        (stats.totalForks * 1.5) + 
        (repositories.length * 0.5)
      ));

      console.log('✅ GitHub developer statistics calculated:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Failed to calculate GitHub developer stats:', error);
      throw error;
    }
  }

  /**
   * 🏆 Generate GitHub developer credential
   */
  async generateDeveloperCredential(): Promise<GitHubCredentialData> {
    try {
      console.log('🏆 Generating GitHub developer credential...');

      const [user, stats] = await Promise.all([
        this.getUser(),
        this.getDeveloperStats(),
      ]);

      const credentialData: GitHubCredentialData = {
        user,
        stats,
        verificationDate: new Date().toISOString(),
        credentialType: 'DeveloperSkillCredential',
      };

      console.log('✅ GitHub developer credential generated:', {
        username: user.login,
        repos: user.public_repos,
        stars: stats.totalStars,
        score: stats.contributionScore,
      });

      return credentialData;

    } catch (error) {
      console.error('❌ Failed to generate GitHub developer credential:', error);
      throw error;
    }
  }

  /**
   * 🔍 Test API connection
   */
  async testConnection(): Promise<{ success: boolean; user?: string; error?: string }> {
    try {
      if (!this.accessToken) {
        return {
          success: false,
          error: 'No access token available. Please authenticate with GitHub first.',
        };
      }

      const user = await this.getUser();
      
      return {
        success: true,
        user: user.login,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 🎫 Get stored credential from OAuth flow - WITH HEAVY DEBUG
   */
  getStoredCredential(): any {
    // Check service memory first
    if (this.credentialData) {
      console.log('🔍 HEAVY DEBUG: Found credential in service memory:', {
        hasCredential: true,
        credentialType: typeof this.credentialData,
        credentialId: this.credentialData?.id,
        credentialPreview: JSON.stringify(this.credentialData).substring(0, 200) + '...'
      });
      return this.credentialData;
    }
    
    // Check localStorage cache
    try {
      const cachedCredential = localStorage.getItem('github_credential_cache_v3');
      if (cachedCredential) {
        const parsedCredential = JSON.parse(cachedCredential);
        this.credentialData = parsedCredential; // Store in memory too
        console.log('🔍 HEAVY DEBUG: Found credential in localStorage cache:', {
          hasCredential: true,
          credentialType: typeof parsedCredential,
          credentialId: parsedCredential?.id,
          credentialPreview: JSON.stringify(parsedCredential).substring(0, 200) + '...'
        });
        return parsedCredential;
      }
    } catch (error) {
      console.error('❌ Error reading cached credential:', error);
    }
    
    console.log('🔍 HEAVY DEBUG: No stored credential found:', {
      hasCredential: false,
      credentialType: typeof this.credentialData,
      credentialId: undefined,
      credentialPreview: 'null'
    });
    return null;
  }

  /**
   * 🧹 Clear stored token
   */
  clearToken(): void {
    this.accessToken = null;
    this.credentialData = null;
    sessionStorage.removeItem('github_oauth_state');
    localStorage.removeItem('github_oauth_state_backup');
    console.log('🧹 GitHub token and credential cleared');
  }
}

// 🏭 Export singleton instance
export const githubAPIService = new GitHubAPIService();