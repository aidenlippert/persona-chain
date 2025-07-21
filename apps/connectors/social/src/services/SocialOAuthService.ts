import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/config';

export interface SocialOAuthTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
  provider: string;
  userId?: string;
}

export class SocialOAuthService {
  private stateStore = new Map<string, any>(); // In production, use Redis
  private tokenStore = new Map<string, any>(); // In production, use encrypted database
  
  /**
   * Build OAuth2 authorization URL for social provider
   */
  async buildAuthorizationUrl(provider: string, did: string): Promise<{ authUrl: string; state: string }> {
    try {
      console.log(`🔗 Building authorization URL for ${provider}...`);
      
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state for validation
      await this.storeOAuthState(state, {
        provider,
        did,
        timestamp: Date.now()
      });
      
      let clientId: string;
      let redirectUri: string;
      let scope: string;
      let authUrl: string;
      
      switch (provider) {
        case 'linkedin':
          clientId = config.linkedin.clientId;
          redirectUri = config.linkedin.redirectUri;
          scope = config.linkedin.scope;
          authUrl = config.linkedin.authUrl;
          break;
        case 'twitter':
          clientId = config.twitter.clientId;
          redirectUri = config.twitter.redirectUri;
          scope = config.twitter.scope;
          authUrl = config.twitter.authUrl;
          break;
        case 'github':
          clientId = config.github.clientId;
          redirectUri = config.github.redirectUri;
          scope = config.github.scope;
          authUrl = config.github.authUrl;
          break;
        case 'discord':
          clientId = config.discord.clientId;
          redirectUri = config.discord.redirectUri;
          scope = config.discord.scope;
          authUrl = config.discord.authUrl;
          break;
        default:
          throw new Error(`Unsupported social provider: ${provider}`);
      }
      
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope,
        state
      });
      
      // Add provider-specific parameters
      if (provider === 'twitter') {
        params.append('code_challenge', 'challenge');
        params.append('code_challenge_method', 'plain');
      }
      
      const fullAuthUrl = `${authUrl}?${params.toString()}`;
      
      console.log(`✅ Authorization URL built for ${provider}`);
      return { authUrl: fullAuthUrl, state };
      
    } catch (error) {
      console.error(`❌ Error building authorization URL for ${provider}:`, error);
      throw new Error(`Failed to build authorization URL for ${provider}`);
    }
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string, 
    state: string, 
    provider: string
  ): Promise<{ tokenData: SocialOAuthTokenData; stateData: any }> {
    try {
      console.log(`🔄 Exchanging authorization code for ${provider} access token...`);
      
      // Validate state
      const stateData = await this.getOAuthState(state);
      if (!stateData) {
        throw new Error('Invalid or expired OAuth state');
      }
      
      if (stateData.provider !== provider) {
        throw new Error('Provider mismatch in OAuth state');
      }
      
      let clientId: string;
      let clientSecret: string;
      let redirectUri: string;
      let tokenUrl: string;
      
      switch (provider) {
        case 'linkedin':
          clientId = config.linkedin.clientId;
          clientSecret = config.linkedin.clientSecret;
          redirectUri = config.linkedin.redirectUri;
          tokenUrl = config.linkedin.tokenUrl;
          break;
        case 'twitter':
          clientId = config.twitter.clientId;
          clientSecret = config.twitter.clientSecret;
          redirectUri = config.twitter.redirectUri;
          tokenUrl = config.twitter.tokenUrl;
          break;
        case 'github':
          clientId = config.github.clientId;
          clientSecret = config.github.clientSecret;
          redirectUri = config.github.redirectUri;
          tokenUrl = config.github.tokenUrl;
          break;
        case 'discord':
          clientId = config.discord.clientId;
          clientSecret = config.discord.clientSecret;
          redirectUri = config.discord.redirectUri;
          tokenUrl = config.discord.tokenUrl;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const tokenRequest: any = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      };
      
      // Add provider-specific parameters
      if (provider === 'twitter') {
        tokenRequest.code_verifier = 'challenge';
      }
      
      const headers: any = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      };
      
      // GitHub requires different content type for token exchange
      if (provider === 'github') {
        headers['Accept'] = 'application/json';
      }
      
      const response = await axios.post(
        tokenUrl,
        new URLSearchParams(tokenRequest),
        {
          headers,
          timeout: 30000
        }
      );
      
      const tokenResponse = response.data;
      
      // Handle different response formats
      let accessToken: string;
      let refreshToken: string | undefined;
      let expiresIn: number;
      let scope: string;
      
      if (provider === 'github') {
        accessToken = tokenResponse.access_token;
        refreshToken = tokenResponse.refresh_token;
        expiresIn = tokenResponse.expires_in || 3600;
        scope = tokenResponse.scope || config.github.scope;
      } else {
        accessToken = tokenResponse.access_token;
        refreshToken = tokenResponse.refresh_token;
        expiresIn = tokenResponse.expires_in || 3600;
        scope = tokenResponse.scope || '';
      }
      
      const tokenData: SocialOAuthTokenData = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + (expiresIn * 1000),
        scope,
        tokenType: tokenResponse.token_type || 'Bearer',
        provider,
        userId: tokenResponse.user_id
      };
      
      console.log(`✅ Access token obtained for ${provider}`);
      
      // Clean up state
      this.stateStore.delete(state);
      
      return { tokenData, stateData };
      
    } catch (error) {
      console.error(`❌ Error exchanging code for ${provider} token:`, error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock ${provider} token for development`);
        const stateData = await this.getOAuthState(state) || { provider, did: 'mock' };
        return {
          tokenData: {
            accessToken: `mock_${provider}_token_${Date.now()}`,
            refreshToken: `mock_${provider}_refresh_${Date.now()}`,
            expiresAt: Date.now() + 3600000, // 1 hour
            scope: this.getProviderScope(provider),
            tokenType: 'Bearer',
            provider,
            userId: 'mock-user-id'
          },
          stateData
        };
      }
      
      throw new Error(`Failed to exchange authorization code for ${provider}`);
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(provider: string, refreshToken: string): Promise<SocialOAuthTokenData> {
    try {
      console.log(`🔄 Refreshing ${provider} access token...`);
      
      let clientId: string;
      let clientSecret: string;
      let tokenUrl: string;
      
      switch (provider) {
        case 'linkedin':
          clientId = config.linkedin.clientId;
          clientSecret = config.linkedin.clientSecret;
          tokenUrl = config.linkedin.tokenUrl;
          break;
        case 'twitter':
          clientId = config.twitter.clientId;
          clientSecret = config.twitter.clientSecret;
          tokenUrl = config.twitter.tokenUrl;
          break;
        case 'github':
          clientId = config.github.clientId;
          clientSecret = config.github.clientSecret;
          tokenUrl = config.github.tokenUrl;
          break;
        case 'discord':
          clientId = config.discord.clientId;
          clientSecret = config.discord.clientSecret;
          tokenUrl = config.discord.tokenUrl;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const refreshRequest = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      };
      
      const response = await axios.post(
        tokenUrl,
        new URLSearchParams(refreshRequest),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const tokenResponse = response.data;
      
      const newTokenData: SocialOAuthTokenData = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        scope: tokenResponse.scope || '',
        tokenType: tokenResponse.token_type || 'Bearer',
        provider
      };
      
      console.log(`✅ Access token refreshed for ${provider}`);
      return newTokenData;
      
    } catch (error) {
      console.error(`❌ Error refreshing ${provider} token:`, error);
      throw new Error(`Failed to refresh access token for ${provider}`);
    }
  }
  
  /**
   * Revoke access token
   */
  async revokeToken(provider: string, accessToken: string): Promise<void> {
    try {
      console.log(`🔓 Revoking ${provider} access token...`);
      
      // Most social platforms support token revocation
      let revokeUrl: string | null = null;
      
      switch (provider) {
        case 'linkedin':
          // LinkedIn doesn't have a public revoke endpoint, tokens expire naturally
          console.log('⚠️ LinkedIn token revocation not supported, token will expire naturally');
          break;
        case 'twitter':
          revokeUrl = 'https://api.twitter.com/2/oauth2/revoke';
          break;
        case 'github':
          revokeUrl = `https://api.github.com/applications/${config.github.clientId}/token`;
          break;
        case 'discord':
          revokeUrl = 'https://discord.com/api/oauth2/token/revoke';
          break;
      }
      
      if (revokeUrl) {
        try {
          if (provider === 'github') {
            // GitHub uses basic auth for revocation
            const auth = Buffer.from(`${config.github.clientId}:${config.github.clientSecret}`).toString('base64');
            await axios.delete(revokeUrl, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
              },
              data: { access_token: accessToken },
              timeout: 30000
            });
          } else {
            await axios.post(revokeUrl, 
              { token: accessToken },
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
              }
            );
          }
        } catch (revokeError) {
          console.warn(`⚠️ Token revocation not supported or failed for ${provider}`);
        }
      }
      
      console.log(`✅ Token revocation attempted for ${provider}`);
      
    } catch (error) {
      console.error(`❌ Error revoking ${provider} token:`, error);
      // Don't throw here as revocation is best-effort
    }
  }
  
  /**
   * Store OAuth state for validation
   */
  private async storeOAuthState(state: string, data: any): Promise<void> {
    // In production, store in Redis with expiration
    this.stateStore.set(state, {
      ...data,
      createdAt: Date.now()
    });
    
    // Clean up expired states (1 hour)
    setTimeout(() => {
      this.stateStore.delete(state);
    }, 3600000);
  }
  
  /**
   * Retrieve OAuth state data
   */
  private async getOAuthState(state: string): Promise<any> {
    const data = this.stateStore.get(state);
    if (!data) return null;
    
    // Check if expired (1 hour)
    if (Date.now() - data.createdAt > 3600000) {
      this.stateStore.delete(state);
      return null;
    }
    
    return data;
  }
  
  /**
   * Get provider scope configuration
   */
  private getProviderScope(provider: string): string {
    switch (provider) {
      case 'linkedin':
        return config.linkedin.scope;
      case 'twitter':
        return config.twitter.scope;
      case 'github':
        return config.github.scope;
      case 'discord':
        return config.discord.scope;
      default:
        return '';
    }
  }
  
  /**
   * Validate token and get user context
   */
  async validateTokenAndGetUser(provider: string, accessToken: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      let userEndpoint: string;
      let baseUrl: string;
      
      switch (provider) {
        case 'linkedin':
          baseUrl = config.linkedin.baseUrl;
          userEndpoint = config.linkedin.endpoints.profile;
          break;
        case 'twitter':
          baseUrl = config.twitter.baseUrl;
          userEndpoint = config.twitter.endpoints.user;
          break;
        case 'github':
          baseUrl = config.github.baseUrl;
          userEndpoint = config.github.endpoints.user;
          break;
        case 'discord':
          baseUrl = config.discord.baseUrl;
          userEndpoint = '/users/@me';
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const response = await axios.get(
        `${baseUrl}${userEndpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      // Token is valid if we get a successful response
      const userId = response.data.id || response.data.login || response.data.username;
      return { valid: response.status === 200, userId };
      
    } catch (error) {
      console.error(`❌ Token validation failed for ${provider}:`, error);
      return { valid: false };
    }
  }
}