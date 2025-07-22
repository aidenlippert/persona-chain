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
   * 🔗 Start GitHub OAuth flow (SAME WINDOW NAVIGATION - NOT POPUP)
   */
  startOAuthFlow(): void {
    console.log('🚀🚀🚀 HEAVY DEBUG: Starting GitHub OAuth flow');
    
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    console.log('🔍 DEBUG: Client ID exists:', !!clientId);
    console.log('🔍 DEBUG: Environment check:', {
      VITE_GITHUB_CLIENT_ID: !!import.meta.env.VITE_GITHUB_CLIENT_ID,
      NODE_ENV: import.meta.env.NODE_ENV,
      VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT
    });
    
    if (!clientId) {
      console.error('❌ CRITICAL ERROR: GitHub Client ID not configured!');
      throw new Error('GitHub Client ID not configured');
    }

    const scopes = ['user', 'public_repo', 'read:org'];
    const redirectUri = `https://personapass.xyz/oauth/github/callback`;
    const state = Math.random().toString(36).substring(2, 15); // Generate 13-character state
    
    console.log('🔍 DEBUG: OAuth parameters:', {
      clientId: clientId.substring(0, 8) + '...',
      redirectUri,
      state,
      stateLength: state.length,
      scopes: scopes.join(' ')
    });
    
    // Store state for verification (with fallback support)
    try {
      sessionStorage.setItem('github_oauth_state', state);
      localStorage.setItem('github_oauth_state_backup', state); // Fallback for cross-domain
      console.log('✅ DEBUG: OAuth state stored successfully');
    } catch (error) {
      console.warn('⚠️ DEBUG: Could not store OAuth state:', error);
    }
    
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    
    const finalUrl = authUrl.toString();
    console.log('🔗 DEBUG: Final OAuth URL:', finalUrl);
    
    // SAME WINDOW NAVIGATION - NO MORE POPUPS!
    console.log('🔄 DEBUG: Redirecting to GitHub OAuth in SAME WINDOW...');
    window.location.href = finalUrl;
  }

  /**
   * 🎫 Exchange OAuth code for access token - HEAVY DEBUGGING MODE
   */
  async exchangeCodeForToken(code: string, state: string): Promise<string> {
    console.log('🚀🚀🚀 EXTREME DEBUG: GitHub OAuth Token Exchange Started');
    console.log('🔍🔍🔍 FULL DEBUG INFO:', {
      code: code ? `${code.substring(0, 20)}...` : '❌ CODE IS NULL/EMPTY',
      codeLength: code?.length || 0,
      codeType: typeof code,
      state: state ? `${state.substring(0, 20)}...` : '❌ STATE IS NULL/EMPTY',
      stateLength: state?.length || 0,
      stateType: typeof state,
      timestamp: new Date().toISOString(),
      currentUrl: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent.substring(0, 100)
    });
    
    // HEAVY DEBUG: Check all possible state storage locations
    const storedState = sessionStorage.getItem('github_oauth_state');
    const backupState = localStorage.getItem('github_oauth_state_backup');
    const allSessionKeys = Object.keys(sessionStorage);
    const allLocalKeys = Object.keys(localStorage);
    
    console.log('🔍🔍🔍 STORAGE HEAVY DEBUG:', {
      sessionState: storedState ? `${storedState.substring(0, 20)}...` : '❌ NO SESSION STATE',
      sessionStateLength: storedState?.length || 0,
      backupState: backupState ? `${backupState.substring(0, 20)}...` : '❌ NO BACKUP STATE',
      backupStateLength: backupState?.length || 0,
      allSessionKeys: allSessionKeys.filter(k => k.includes('github')),
      allLocalKeys: allLocalKeys.filter(k => k.includes('github')),
      storageSupported: {
        sessionStorage: typeof sessionStorage !== 'undefined',
        localStorage: typeof localStorage !== 'undefined'
      }
    });
    
    // HEAVY DEBUG: Environment variables check
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET;
    const environment = import.meta.env.VITE_ENVIRONMENT;
    
    console.log('🔍🔍🔍 ENVIRONMENT HEAVY DEBUG:', {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length || 0,
      clientIdPreview: clientId ? clientId.substring(0, 8) + '...' : '❌ MISSING',
      hasClientSecret: !!clientSecret,
      secretLength: clientSecret?.length || 0,
      environment: environment || '❌ NOT SET',
      allEnvKeys: Object.keys(import.meta.env).filter(k => k.includes('GITHUB')),
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD,
      dev: import.meta.env.DEV
    });

    if (!clientId || !clientSecret) {
      const errorMsg = 'GitHub OAuth credentials not configured';
      console.error('❌❌❌ CRITICAL:', errorMsg);
      console.error('🔍 Available env vars:', Object.keys(import.meta.env));
      throw new Error(errorMsg);
    }

    // Skip state validation but log everything
    console.log('⚠️⚠️⚠️ SKIPPING STATE VALIDATION - LOGGING ALL PARAMETERS');
    
    try {
      console.log('🔄🔄🔄 Making GitHub token exchange request via API proxy...');
      
      const requestBody = {
        code: code,
        state: state,
        userId: `did:persona:user_${Date.now()}`
      };
      
      console.log('📤 HEAVY DEBUG: Request payload:', {
        bodySize: JSON.stringify(requestBody).length,
        body: requestBody
      });
      
      // Use our ROOT LEVEL serverless function to avoid CORS issues
      const response = await fetch('/api/github-auth', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Debug-Mode': 'true',
          'X-Client-Timestamp': Date.now().toString()
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡📡📡 HEAVY DEBUG: GitHub token exchange response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          server: response.headers.get('server'),
          date: response.headers.get('date')
        },
        url: response.url,
        redirected: response.redirected,
        type: response.type
      });

      let data;
      let rawText = '';
      
      try {
        rawText = await response.text();
        console.log('📄 HEAVY DEBUG: Raw response text:', {
          length: rawText.length,
          preview: rawText.substring(0, 500),
          full: rawText
        });
        
        data = JSON.parse(rawText);
        console.log('✅ HEAVY DEBUG: Successfully parsed JSON response');
      } catch (parseError) {
        console.error('❌❌❌ CRITICAL: Failed to parse response as JSON:', parseError);
        console.error('Raw response text:', rawText);
        throw new Error(`Failed to parse API response: ${parseError}`);
      }
      
      console.log('📄📄📄 HEAVY DEBUG: Complete GitHub API response:', {
        success: data.success,
        hasCredential: !!data.credential,
        hasUserData: !!data.userData,
        hasSessionId: !!data.sessionId,
        hasError: !!data.error,
        error: data.error,
        details: data.details,
        retryable: data.retryable,
        credentialId: data.credential?.id,
        credentialType: data.credential?.type,
        userLogin: data.userData?.login,
        fullResponse: JSON.stringify(data, null, 2)
      });
      
      if (!data.success || data.error) {
        console.error('❌❌❌ GITHUB API ERROR DETAILS:', {
          error: data.error,
          details: data.details,
          success: data.success,
          retryable: data.retryable,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries())
        });
        
        const errorMessage = data.details || data.error || 'OAuth session not found';
        console.error('🚨 THROWING ERROR:', errorMessage);
        throw new Error(errorMessage);
      }

      if (!data.credential) {
        console.error('❌❌❌ MISSING CREDENTIAL in successful response:', data);
        throw new Error('GitHub OAuth error: No credential received');
      }

      console.log('✅✅✅ GITHUB OAUTH SUCCESS - CREDENTIAL CREATED!');
      console.log('🎉 Credential details:', {
        id: data.credential.id,
        type: data.credential.type,
        issuer: data.credential.issuer,
        subjectId: data.credential.credentialSubject?.id,
        username: data.credential.credentialSubject?.username,
        verifiedAt: data.credential.credentialSubject?.verifiedAt
      });
      
      // Store the credential data for later use
      this.credentialData = data.credential;
      console.log('💾 Credential stored in service instance');
      
      // Clean up both storage methods
      sessionStorage.removeItem('github_oauth_state');
      localStorage.removeItem('github_oauth_state_backup');
      console.log('🧹 OAuth state cleaned up from storage');
      
      // Return a success indicator since we don't have a raw access token
      return 'credential_created';
      
    } catch (error) {
      console.error('❌❌❌ GITHUB OAUTH TOKEN EXCHANGE FAILED:');
      console.error('🔍 Error type:', typeof error);
      console.error('🔍 Error name:', error?.name);
      console.error('🔍 Error message:', error?.message);
      console.error('🔍 Error stack:', error?.stack);
      console.error('🔍 Full error object:', error);
      
      // Re-throw with additional context
      const enhancedError = new Error(`GitHub OAuth failed: ${error?.message || 'Unknown error'}`);
      enhancedError.cause = error;
      throw enhancedError;
    }
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
    console.log('🔍 HEAVY DEBUG: Getting stored credential:', {
      hasCredential: !!this.credentialData,
      credentialType: typeof this.credentialData,
      credentialId: this.credentialData?.id,
      credentialPreview: this.credentialData ? JSON.stringify(this.credentialData).substring(0, 200) + '...' : 'null'
    });
    return this.credentialData;
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