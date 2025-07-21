import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { config } from '../config/config';
import { 
  OAuth2TokenData, 
  OAuth2State, 
  ProfessionalProvider, 
  ProfessionalConnectorError 
} from '../types/professional';

/**
 * Professional OAuth2 Service
 * Handles OAuth2 flows for GitHub, LinkedIn, ORCID, and StackExchange
 */
export class ProfessionalOAuthService {
  private stateStore = new Map<string, OAuth2State>();
  private tokenStore = new Map<string, OAuth2TokenData>();
  
  /**
   * Generate PKCE code verifier and challenge
   */
  private generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }
  
  /**
   * Build OAuth2 authorization URL
   */
  async buildAuthorizationUrl(
    provider: ProfessionalProvider, 
    did: string,
    options: {
      usePKCE?: boolean;
      customScope?: string;
      customRedirectUri?: string;
    } = {}
  ): Promise<{ authUrl: string; state: string }> {
    try {
      console.log(`🔗 Building OAuth2 authorization URL for ${provider}...`);
      
      const state = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(16).toString('hex');
      const pkce = options.usePKCE ? this.generatePKCE() : undefined;
      
      // Store state for validation
      const stateData: OAuth2State = {
        state,
        provider,
        did,
        timestamp: Date.now(),
        codeVerifier: pkce?.codeVerifier,
        nonce
      };
      
      await this.storeOAuthState(state, stateData);
      
      // Get provider configuration
      const providerConfig = this.getProviderConfig(provider);
      const redirectUri = options.customRedirectUri || providerConfig.redirectUri;
      const scope = options.customScope || providerConfig.scope;
      
      // Build authorization URL parameters
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: providerConfig.clientId,
        redirect_uri: redirectUri,
        scope: scope,
        state,
        ...(nonce && { nonce })
      });
      
      // Add provider-specific parameters
      if (provider === 'github') {
        params.append('allow_signup', 'true');
      }
      
      if (provider === 'linkedin') {
        params.append('response_type', 'code');
      }
      
      if (provider === 'orcid') {
        params.append('access_type', 'offline');
      }
      
      if (provider === 'stackexchange') {
        params.append('site', 'stackoverflow');
      }
      
      // Add PKCE parameters if enabled
      if (pkce) {
        params.append('code_challenge', pkce.codeChallenge);
        params.append('code_challenge_method', 'S256');
      }
      
      const authUrl = `${providerConfig.authUrl}?${params.toString()}`;
      
      console.log(`✅ Authorization URL built for ${provider}`);
      return { authUrl, state };
      
    } catch (error) {
      console.error(`❌ Error building authorization URL for ${provider}:`, error);
      throw this.createConnectorError(
        'OAUTH_ERROR',
        `Failed to build authorization URL for ${provider}`,
        provider,
        error
      );
    }
  }
  
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    provider: ProfessionalProvider,
    customRedirectUri?: string
  ): Promise<{ tokenData: OAuth2TokenData; stateData: OAuth2State }> {
    try {
      console.log(`🔄 Exchanging authorization code for ${provider} access token...`);
      
      // Validate and retrieve state
      const stateData = await this.getOAuthState(state);
      if (!stateData) {
        throw this.createConnectorError(
          'OAUTH_ERROR',
          'Invalid or expired OAuth state',
          provider
        );
      }
      
      if (stateData.provider !== provider) {
        throw this.createConnectorError(
          'OAUTH_ERROR',
          'Provider mismatch in OAuth state',
          provider
        );
      }
      
      const providerConfig = this.getProviderConfig(provider);
      const redirectUri = customRedirectUri || providerConfig.redirectUri;
      
      // Prepare token request
      const tokenRequest: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret
      };
      
      // Add PKCE code verifier if used
      if (stateData.codeVerifier) {
        tokenRequest.code_verifier = stateData.codeVerifier;
      }
      
      // Provider-specific token request modifications
      const headers = this.getTokenRequestHeaders(provider);
      const tokenUrl = providerConfig.tokenUrl;
      
      // Make token request
      const response = await axios.post(
        tokenUrl,
        new URLSearchParams(tokenRequest),
        {
          headers,
          timeout: 30000,
          validateStatus: (status) => status < 500 // Allow 4xx errors to be handled
        }
      );
      
      if (response.status >= 400) {
        throw new Error(`Token exchange failed with status ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      // Parse token response
      const tokenData = await this.parseTokenResponse(response.data, provider);
      
      console.log(`✅ Access token obtained for ${provider}`);
      
      // Clean up state
      this.stateStore.delete(state);
      
      return { tokenData, stateData };
      
    } catch (error) {
      console.error(`❌ Error exchanging code for ${provider} token:`, error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log(`🔄 Using mock ${provider} token for development`);
        const stateData = await this.getOAuthState(state) || { 
          state, 
          provider, 
          did: 'mock-did', 
          timestamp: Date.now() 
        };
        
        return {
          tokenData: this.generateMockToken(provider),
          stateData
        };
      }
      
      throw this.createConnectorError(
        'OAUTH_ERROR',
        `Failed to exchange authorization code for ${provider}`,
        provider,
        error
      );
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(
    provider: ProfessionalProvider,
    refreshToken: string
  ): Promise<OAuth2TokenData> {
    try {
      console.log(`🔄 Refreshing ${provider} access token...`);
      
      if (!this.supportsRefresh(provider)) {
        throw this.createConnectorError(
          'OAUTH_ERROR',
          `Token refresh not supported for ${provider}`,
          provider
        );
      }
      
      const providerConfig = this.getProviderConfig(provider);
      
      const refreshRequest = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret
      };
      
      const response = await axios.post(
        providerConfig.tokenUrl,
        new URLSearchParams(refreshRequest),
        {
          headers: this.getTokenRequestHeaders(provider),
          timeout: 30000
        }
      );
      
      const tokenData = await this.parseTokenResponse(response.data, provider);
      
      console.log(`✅ Access token refreshed for ${provider}`);
      return tokenData;
      
    } catch (error) {
      console.error(`❌ Error refreshing ${provider} token:`, error);
      throw this.createConnectorError(
        'OAUTH_ERROR',
        `Failed to refresh access token for ${provider}`,
        provider,
        error
      );
    }
  }
  
  /**
   * Revoke access token
   */
  async revokeToken(
    provider: ProfessionalProvider,
    accessToken: string
  ): Promise<void> {
    try {
      console.log(`🔓 Revoking ${provider} access token...`);
      
      const revokeEndpoint = this.getRevokeEndpoint(provider);
      if (!revokeEndpoint) {
        console.log(`⚠️ Token revocation not supported for ${provider}`);
        return;
      }
      
      const providerConfig = this.getProviderConfig(provider);
      
      if (provider === 'github') {
        // GitHub uses DELETE with basic auth
        const auth = Buffer.from(`${providerConfig.clientId}:${providerConfig.clientSecret}`).toString('base64');
        await axios.delete(revokeEndpoint, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          data: { access_token: accessToken },
          timeout: 30000
        });
      } else {
        // Standard revocation
        await axios.post(revokeEndpoint, 
          new URLSearchParams({ token: accessToken }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(`${providerConfig.clientId}:${providerConfig.clientSecret}`).toString('base64')}`
            },
            timeout: 30000
          }
        );
      }
      
      console.log(`✅ Token revoked for ${provider}`);
      
    } catch (error) {
      console.warn(`⚠️ Token revocation failed for ${provider}:`, error);
      // Don't throw here as revocation is best-effort
    }
  }
  
  /**
   * Validate token and get user info
   */
  async validateToken(
    provider: ProfessionalProvider,
    accessToken: string
  ): Promise<{ valid: boolean; userId?: string; expiresAt?: number }> {
    try {
      const providerConfig = this.getProviderConfig(provider);
      const userEndpoint = this.getUserEndpoint(provider);
      
      const response = await axios.get(
        `${providerConfig.baseUrl}${userEndpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'PersonaPass-Professional-Connector/1.0'
          },
          timeout: 30000
        }
      );
      
      const userId = this.extractUserId(response.data, provider);
      
      return {
        valid: response.status === 200,
        userId,
        expiresAt: undefined // Most providers don't return expiration in user info
      };
      
    } catch (error) {
      console.error(`❌ Token validation failed for ${provider}:`, error);
      return { valid: false };
    }
  }
  
  /**
   * Get provider configuration
   */
  private getProviderConfig(provider: ProfessionalProvider) {
    switch (provider) {
      case 'github':
        return config.github;
      case 'linkedin':
        return config.linkedin;
      case 'orcid':
        return config.orcid;
      case 'stackexchange':
        return config.stackexchange;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  /**
   * Get token request headers for provider
   */
  private getTokenRequestHeaders(provider: ProfessionalProvider): Record<string, string> {
    const baseHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'PersonaPass-Professional-Connector/1.0'
    };
    
    switch (provider) {
      case 'github':
        return {
          ...baseHeaders,
          'Accept': 'application/json'
        };
      case 'linkedin':
        return {
          ...baseHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        };
      case 'orcid':
        return {
          ...baseHeaders,
          'Accept': 'application/json'
        };
      case 'stackexchange':
        return {
          ...baseHeaders,
          'Accept': 'application/json'
        };
      default:
        return baseHeaders;
    }
  }
  
  /**
   * Parse token response from provider
   */
  private async parseTokenResponse(
    responseData: any,
    provider: ProfessionalProvider
  ): Promise<OAuth2TokenData> {
    const tokenData: OAuth2TokenData = {
      accessToken: responseData.access_token,
      refreshToken: responseData.refresh_token,
      expiresAt: responseData.expires_in ? Date.now() + (responseData.expires_in * 1000) : Date.now() + 3600000,
      scope: responseData.scope || this.getProviderConfig(provider).scope,
      tokenType: responseData.token_type || 'Bearer',
      provider,
      userId: responseData.user_id
    };
    
    return tokenData;
  }
  
  /**
   * Generate mock token for development
   */
  private generateMockToken(provider: ProfessionalProvider): OAuth2TokenData {
    return {
      accessToken: `mock_${provider}_token_${Date.now()}`,
      refreshToken: `mock_${provider}_refresh_${Date.now()}`,
      expiresAt: Date.now() + 3600000, // 1 hour
      scope: this.getProviderConfig(provider).scope,
      tokenType: 'Bearer',
      provider,
      userId: `mock-${provider}-user-${Date.now()}`
    };
  }
  
  /**
   * Get user endpoint for provider
   */
  private getUserEndpoint(provider: ProfessionalProvider): string {
    switch (provider) {
      case 'github':
        return config.github.endpoints.user;
      case 'linkedin':
        return config.linkedin.endpoints.profile;
      case 'orcid':
        return config.orcid.endpoints.person;
      case 'stackexchange':
        return `${config.stackexchange.endpoints.user}?site=stackoverflow`;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  /**
   * Extract user ID from provider response
   */
  private extractUserId(userData: any, provider: ProfessionalProvider): string {
    switch (provider) {
      case 'github':
        return userData.id?.toString() || userData.login;
      case 'linkedin':
        return userData.id;
      case 'orcid':
        return userData['orcid-identifier']?.path || userData.id;
      case 'stackexchange':
        return userData.items?.[0]?.user_id?.toString() || userData.user_id?.toString();
      default:
        return userData.id?.toString() || 'unknown';
    }
  }
  
  /**
   * Get revoke endpoint for provider
   */
  private getRevokeEndpoint(provider: ProfessionalProvider): string | null {
    switch (provider) {
      case 'github':
        return `https://api.github.com/applications/${config.github.clientId}/token`;
      case 'linkedin':
        return null; // LinkedIn doesn't support token revocation
      case 'orcid':
        return null; // ORCID doesn't support token revocation
      case 'stackexchange':
        return null; // StackExchange doesn't support token revocation
      default:
        return null;
    }
  }
  
  /**
   * Check if provider supports token refresh
   */
  private supportsRefresh(provider: ProfessionalProvider): boolean {
    switch (provider) {
      case 'github':
        return true;
      case 'linkedin':
        return true;
      case 'orcid':
        return true;
      case 'stackexchange':
        return false;
      default:
        return false;
    }
  }
  
  /**
   * Store OAuth state
   */
  private async storeOAuthState(state: string, data: OAuth2State): Promise<void> {
    // In production, use Redis with expiration
    this.stateStore.set(state, data);
    
    // Clean up expired states (1 hour)
    setTimeout(() => {
      this.stateStore.delete(state);
    }, 3600000);
  }
  
  /**
   * Get OAuth state
   */
  private async getOAuthState(state: string): Promise<OAuth2State | null> {
    const data = this.stateStore.get(state);
    if (!data) return null;
    
    // Check if expired (1 hour)
    if (Date.now() - data.timestamp > 3600000) {
      this.stateStore.delete(state);
      return null;
    }
    
    return data;
  }
  
  /**
   * Create connector error
   */
  private createConnectorError(
    code: ProfessionalConnectorError['code'],
    message: string,
    provider?: ProfessionalProvider,
    originalError?: any
  ): ProfessionalConnectorError {
    return {
      code,
      message,
      provider,
      details: originalError instanceof Error ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      } : originalError,
      timestamp: new Date().toISOString()
    };
  }
}