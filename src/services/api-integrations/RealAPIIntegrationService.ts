/**
 * 🔗 REAL API INTEGRATION SERVICE
 * Unified service for all real API integrations
 * GitHub, Steam, and future API connections
 */

import { githubAPIService, GitHubCredentialData } from './GitHubAPIService';
import { steamAPIService, SteamCredentialData } from './SteamAPIService';
import { plaidAPIService, PlaidCredentialData } from './PlaidAPIService';
import { linkedInAPIService, LinkedInCredentialData } from './LinkedInAPIService';
import { verifiableCredentialService } from '../credentials/VerifiableCredentialService';

export type APIProvider = 'github' | 'steam' | 'plaid' | 'linkedin' | 'twilio';
export type CredentialType = 'DeveloperSkillCredential' | 'GamingCredential' | 'BankAccountCredential' | 'IncomeVerificationCredential' | 'ProfessionalCredential' | 'PhoneVerificationCredential';

export interface APIConnection {
  id: string;
  provider: APIProvider;
  connected: boolean;
  connectedAt?: string;
  lastUsed?: string;
  username?: string;
  profileUrl?: string;
  credentials?: any;
}

export interface CredentialGenerationResult {
  success: boolean;
  credential?: any;
  credentialId?: string;
  error?: string;
  metadata: {
    provider: APIProvider;
    credentialType: CredentialType;
    generatedAt: string;
    expirationDate?: string;
  };
}

/**
 * 🔗 REAL API INTEGRATION SERVICE
 * Central hub for all API integrations and credential generation
 */
export class RealAPIIntegrationService {
  private connections: Map<APIProvider, APIConnection> = new Map();

  constructor() {
    this.initializeConnections();
    console.log('🔗 Real API Integration Service initialized');
  }

  /**
   * 🔧 Initialize connection status
   */
  private initializeConnections(): void {
    const providers: APIProvider[] = ['github', 'steam', 'plaid', 'linkedin', 'twilio'];
    
    providers.forEach(provider => {
      this.connections.set(provider, {
        id: `${provider}-connection`,
        provider,
        connected: false,
      });
    });
  }

  /**
   * 🔌 Connect to GitHub API
   */
  async connectGitHub(): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      console.log('🔌 Starting GitHub connection flow...');
      const authUrl = githubAPIService.startOAuthFlow();
      
      // Update connection status
      this.connections.set('github', {
        ...this.connections.get('github')!,
        connected: false, // Will be true after OAuth completion
        connectedAt: new Date().toISOString(),
      });

      console.log('🐙 GitHub OAuth flow started, authUrl:', authUrl.substring(0, 50) + '...');
      return { success: true, authUrl };

    } catch (error) {
      console.error('❌ Failed to start GitHub connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ✅ Complete GitHub OAuth flow
   */
  async completeGitHubOAuth(code: string, state: string): Promise<{ success: boolean; username?: string; error?: string }> {
    try {
      await githubAPIService.exchangeCodeForToken(code, state);
      const user = await githubAPIService.getUser();

      // Update connection status
      this.connections.set('github', {
        ...this.connections.get('github')!,
        connected: true,
        lastUsed: new Date().toISOString(),
        username: user.login,
        profileUrl: user.html_url,
      });

      console.log('✅ GitHub OAuth completed successfully');
      return { success: true, username: user.login };

    } catch (error) {
      console.error('❌ GitHub OAuth completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth completion failed'
      };
    }
  }

  /**
   * 🎮 Connect to Steam API
   */
  async connectSteam(steamProfile: string): Promise<{ success: boolean; username?: string; error?: string }> {
    try {
      console.log('🎮 Connecting to Steam with profile:', steamProfile);

      // Test connection and get player data
      const credentialData = await steamAPIService.generateGamingCredential(steamProfile);
      
      // Update connection status
      this.connections.set('steam', {
        ...this.connections.get('steam')!,
        connected: true,
        connectedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        username: credentialData.player.personaname,
        profileUrl: credentialData.player.profileurl,
        credentials: { steamId: credentialData.player.steamid },
      });

      console.log('✅ Steam connected successfully');
      return { 
        success: true, 
        username: credentialData.player.personaname 
      };

    } catch (error) {
      console.error('❌ Steam connection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Steam connection failed'
      };
    }
  }

  /**
   * 🏆 Generate GitHub developer credential
   */
  async generateGitHubCredential(): Promise<CredentialGenerationResult> {
    try {
      const connection = this.connections.get('github');
      if (!connection?.connected) {
        throw new Error('GitHub not connected. Please connect first.');
      }

      console.log('🏆 Generating GitHub developer credential...');
      
      // Get GitHub credential data
      const githubData = await githubAPIService.generateDeveloperCredential();
      
      // Create verifiable credential
      const credentialSubject = {
        id: 'did:persona:user', // Would be user's actual DID
        githubProfile: {
          username: githubData.user.login,
          name: githubData.user.name,
          profileUrl: githubData.user.html_url,
          publicRepos: githubData.user.public_repos,
          followers: githubData.user.followers,
          accountAge: Math.floor((Date.now() - new Date(githubData.user.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
        },
        developerStats: {
          totalStars: githubData.stats.totalStars,
          totalForks: githubData.stats.totalForks,
          contributionScore: githubData.stats.contributionScore,
          topLanguages: Object.keys(githubData.stats.languages).slice(0, 5),
          topRepositories: githubData.stats.topRepositories.slice(0, 3).map(repo => ({
            name: repo.name,
            stars: repo.stargazers_count,
            language: repo.language,
          })),
        },
        verificationLevel: 'github-verified',
        verificationDate: githubData.verificationDate,
      };

      // Issue verifiable credential
      const credential = await verifiableCredentialService.issueCredential(
        credentialSubject,
        ['VerifiableCredential', 'DeveloperSkillCredential'],
        {
          id: 'did:github:api',
          name: 'GitHub API',
          description: 'GitHub Developer Profile Verification'
        },
        {
          expirationDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // 1 year
          evidence: [{
            type: ['GitHubAPIEvidence'],
            verifier: 'GitHub',
            evidenceDocument: 'Developer Profile API Response',
            subjectPresence: 'Digital',
            documentPresence: 'Digital'
          }]
        }
      );

      // Update connection last used
      this.connections.set('github', {
        ...connection,
        lastUsed: new Date().toISOString(),
      });

      return {
        success: true,
        credential,
        credentialId: credential.id,
        metadata: {
          provider: 'github',
          credentialType: 'DeveloperSkillCredential',
          generatedAt: new Date().toISOString(),
          expirationDate: credential.expirationDate,
        },
      };

    } catch (error) {
      console.error('❌ GitHub credential generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credential generation failed',
        metadata: {
          provider: 'github',
          credentialType: 'DeveloperSkillCredential',
          generatedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * 🎮 Generate Steam gaming credential
   */
  async generateSteamCredential(): Promise<CredentialGenerationResult> {
    try {
      const connection = this.connections.get('steam');
      if (!connection?.connected || !connection.credentials?.steamId) {
        throw new Error('Steam not connected. Please connect first.');
      }

      console.log('🎮 Generating Steam gaming credential...');
      
      // Get Steam credential data
      const steamData = await steamAPIService.generateGamingCredential(connection.credentials.steamId);
      
      // Create verifiable credential
      const credentialSubject = {
        id: 'did:persona:user', // Would be user's actual DID
        steamProfile: {
          username: steamData.player.personaname,
          profileUrl: steamData.player.profileurl,
          accountAge: steamData.stats.accountAge,
          profileState: steamData.player.profilestate === 1 ? 'public' : 'private',
        },
        gamingStats: {
          totalGames: steamData.stats.totalGames,
          totalPlaytimeHours: steamData.stats.totalPlaytime,
          averagePlaytimeHours: steamData.stats.averagePlaytime,
          gamingScore: steamData.stats.gamingScore,
          topGames: steamData.stats.topGames.slice(0, 5).map(game => ({
            name: game.name,
            playtimeHours: Math.floor(game.playtime_forever / 60),
          })),
          recentActivity: steamData.stats.recentGames.length > 0,
        },
        verificationLevel: 'steam-verified',
        verificationDate: steamData.verificationDate,
      };

      // Issue verifiable credential
      const credential = await verifiableCredentialService.issueCredential(
        credentialSubject,
        ['VerifiableCredential', 'GamingCredential'],
        {
          id: 'did:steam:api',
          name: 'Steam API',
          description: 'Steam Gaming Profile Verification'
        },
        {
          expirationDate: new Date(Date.now() + (180 * 24 * 60 * 60 * 1000)).toISOString(), // 6 months
          evidence: [{
            type: ['SteamAPIEvidence'],
            verifier: 'Steam',
            evidenceDocument: 'Gaming Profile API Response',
            subjectPresence: 'Digital',
            documentPresence: 'Digital'
          }]
        }
      );

      // Update connection last used
      this.connections.set('steam', {
        ...connection,
        lastUsed: new Date().toISOString(),
      });

      return {
        success: true,
        credential,
        credentialId: credential.id,
        metadata: {
          provider: 'steam',
          credentialType: 'GamingCredential',
          generatedAt: new Date().toISOString(),
          expirationDate: credential.expirationDate,
        },
      };

    } catch (error) {
      console.error('❌ Steam credential generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credential generation failed',
        metadata: {
          provider: 'steam',
          credentialType: 'GamingCredential',
          generatedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * 📊 Get all API connections status
   */
  getConnectionsStatus(): APIConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 🔌 Get specific connection status
   */
  getConnectionStatus(provider: APIProvider): APIConnection | undefined {
    return this.connections.get(provider);
  }

  /**
   * 🧹 Disconnect from API
   */
  async disconnectAPI(provider: APIProvider): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = this.connections.get(provider);
      if (!connection) {
        throw new Error(`${provider} connection not found`);
      }

      // Clear provider-specific data
      switch (provider) {
        case 'github':
          githubAPIService.clearToken();
          break;
        case 'steam':
          // Steam doesn't store tokens, just clear connection
          break;
        default:
          console.warn(`No disconnect handler for ${provider}`);
      }

      // Reset connection status
      this.connections.set(provider, {
        id: connection.id,
        provider,
        connected: false,
      });

      console.log(`🧹 Disconnected from ${provider}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Failed to disconnect from ${provider}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Disconnect failed'
      };
    }
  }

  /**
   * 🏦 Connect to Plaid API
   */
  async connectPlaid(userId: string): Promise<{ success: boolean; linkToken?: string; error?: string }> {
    try {
      console.log('🏦 Starting Plaid connection flow...');
      const linkToken = await plaidAPIService.createLinkToken(userId);
      
      // Update connection status
      this.connections.set('plaid', {
        ...this.connections.get('plaid')!,
        connected: false, // Will be true after Link completion
        connectedAt: new Date().toISOString(),
      });

      console.log('💳 Plaid Link token created successfully');
      return { success: true, linkToken };

    } catch (error) {
      console.error('❌ Failed to start Plaid connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ✅ Complete Plaid Link flow
   */
  async completePlaidLink(publicToken: string, userId: string): Promise<{ success: boolean; credentials?: any[]; error?: string }> {
    try {
      const credentialData = await plaidAPIService.exchangeTokenAndGenerateCredentials(publicToken, userId);
      
      // Generate credentials
      const userDid = `did:persona:user_${userId}`;
      const bankCredential = plaidAPIService.createBankAccountCredential(credentialData, userDid);
      const incomeCredential = credentialData.income.total_income > 0 
        ? plaidAPIService.createIncomeCredential(credentialData, userDid)
        : null;

      const credentials = [bankCredential, incomeCredential].filter(Boolean);

      // Update connection status
      this.connections.set('plaid', {
        ...this.connections.get('plaid')!,
        connected: true,
        lastUsed: new Date().toISOString(),
        username: credentialData.institution.name,
        credentials: { accountCount: credentialData.accounts.length },
      });

      console.log('✅ Plaid Link completed successfully');
      return { success: true, credentials };

    } catch (error) {
      console.error('❌ Plaid Link completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Link completion failed'
      };
    }
  }

  /**
   * 💼 Connect to LinkedIn API
   */
  async connectLinkedIn(): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      console.log('💼 Starting LinkedIn connection flow...');
      const authUrl = linkedInAPIService.startOAuthFlow();
      
      // Update connection status
      this.connections.set('linkedin', {
        ...this.connections.get('linkedin')!,
        connected: false, // Will be true after OAuth completion
        connectedAt: new Date().toISOString(),
      });

      console.log('💼 LinkedIn OAuth flow started');
      return { success: true, authUrl };

    } catch (error) {
      console.error('❌ Failed to start LinkedIn connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ✅ Complete LinkedIn OAuth flow
   */
  async completeLinkedInOAuth(code: string, state: string): Promise<{ success: boolean; username?: string; error?: string }> {
    try {
      await linkedInAPIService.exchangeCodeForToken(code, state);
      
      // Get stored credential data
      const storedCredential = linkedInAPIService.getStoredCredential();
      if (!storedCredential) {
        throw new Error('No credential data received from LinkedIn');
      }

      const fullName = `${storedCredential.profile.firstName} ${storedCredential.profile.lastName}`;

      // Update connection status
      this.connections.set('linkedin', {
        ...this.connections.get('linkedin')!,
        connected: true,
        lastUsed: new Date().toISOString(),
        username: fullName,
        profileUrl: `https://linkedin.com/in/${storedCredential.profile.id}`,
      });

      console.log('✅ LinkedIn OAuth completed successfully');
      return { success: true, username: fullName };

    } catch (error) {
      console.error('❌ LinkedIn OAuth completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth completion failed'
      };
    }
  }

  /**
   * 🔍 Test all API connections
   */
  async testAllConnections(): Promise<{ [provider: string]: { success: boolean; message?: string; error?: string } }> {
    const results: { [provider: string]: { success: boolean; message?: string; error?: string } } = {};

    // Test Steam API (always available)
    results.steam = await steamAPIService.testConnection();

    // Test GitHub API if connected
    const githubConnection = this.connections.get('github');
    if (githubConnection?.connected) {
      results.github = await githubAPIService.testConnection();
    } else {
      results.github = { success: false, error: 'Not connected' };
    }

    // Test Plaid configuration
    results.plaid = await plaidAPIService.testConfiguration();

    // Test LinkedIn configuration
    results.linkedin = await linkedInAPIService.testConfiguration();

    return results;
  }
}

// 🏭 Export singleton instance
export const realAPIIntegrationService = new RealAPIIntegrationService();