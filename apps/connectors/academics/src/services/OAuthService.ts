import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/config';

export interface AccessTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
}

export class OAuthService {
  private stateStore = new Map(); // In production, use Redis
  private tokenStore = new Map(); // In production, use encrypted database
  
  /**
   * Build NSC OAuth authorization URL
   */
  buildNSCAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.nsc.clientId,
      redirect_uri: config.nsc.redirectUri,
      scope: 'read:degrees read:transcripts read:enrollments',
      state
    });
    
    return `${config.nsc.baseUrl}/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Build Parchment OAuth authorization URL
   */
  buildParchmentAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.parchment.clientId,
      redirect_uri: config.parchment.redirectUri,
      scope: 'read:academic_records read:gpa read:transcripts',
      state
    });
    
    return `${config.parchment.baseUrl}/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Store OAuth state for validation
   */
  async storeOAuthState(state: string, data: any): Promise<void> {
    // In production, store in Redis with expiration
    this.stateStore.set(state, {
      ...data,
      createdAt: Date.now()
    });
    
    // Clean up expired states
    setTimeout(() => {
      this.stateStore.delete(state);
    }, 3600000); // 1 hour
  }
  
  /**
   * Retrieve OAuth state data
   */
  async getOAuthState(state: string): Promise<any> {
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
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, provider: string, state: string): Promise<any> {
    try {
      let tokenUrl: string;
      let clientId: string;
      let clientSecret: string;
      let redirectUri: string;
      
      switch (provider) {
        case 'parchment':
          tokenUrl = `${config.parchment.baseUrl}/oauth/token`;
          clientId = config.parchment.clientId;
          clientSecret = config.parchment.clientSecret;
          redirectUri = config.parchment.redirectUri;
          break;
        case 'nsc':
        default:
          tokenUrl = `${config.nsc.baseUrl}/oauth/token`;
          clientId = config.nsc.clientId;
          clientSecret = config.nsc.clientSecret;
          redirectUri = config.nsc.redirectUri;
          break;
      }
      
      const response = await axios.post(tokenUrl, {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error exchanging code for token:', error);
      
      // Return mock token for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock token for development');
        return {
          access_token: `mock_token_${provider}_${Date.now()}`,
          refresh_token: `mock_refresh_${provider}_${Date.now()}`,
          expires_in: 3600,
          scope: 'read:all'
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Store access token for a DID
   */
  async storeAccessToken(did: string, provider: string, tokenData: AccessTokenData): Promise<void> {
    const key = `${did}:${provider}`;
    
    // In production, encrypt and store in database
    this.tokenStore.set(key, {
      ...tokenData,
      updatedAt: Date.now()
    });
    
    console.log(`🔐 Access token stored for DID: ${did}, Provider: ${provider}`);
  }
  
  /**
   * Get access token for a DID and provider
   */
  async getAccessToken(did: string, provider: string): Promise<AccessTokenData | null> {
    const key = `${did}:${provider}`;
    const tokenData = this.tokenStore.get(key);
    
    if (!tokenData) return null;
    
    // Check if token is expired
    if (Date.now() >= tokenData.expiresAt) {
      console.log(`⏰ Token expired for DID: ${did}, Provider: ${provider}`);
      
      // Try to refresh if refresh token is available
      if (tokenData.refreshToken) {
        const refreshed = await this.refreshAccessToken(did, provider);
        return refreshed;
      }
      
      // Remove expired token
      this.tokenStore.delete(key);
      return null;
    }
    
    return tokenData;
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(did: string, provider: string): Promise<AccessTokenData | null> {
    try {
      const key = `${did}:${provider}`;
      const currentToken = this.tokenStore.get(key);
      
      if (!currentToken?.refreshToken) {
        return null;
      }
      
      let tokenUrl: string;
      let clientId: string;
      let clientSecret: string;
      
      switch (provider) {
        case 'parchment':
          tokenUrl = `${config.parchment.baseUrl}/oauth/token`;
          clientId = config.parchment.clientId;
          clientSecret = config.parchment.clientSecret;
          break;
        case 'nsc':
        default:
          tokenUrl = `${config.nsc.baseUrl}/oauth/token`;
          clientId = config.nsc.clientId;
          clientSecret = config.nsc.clientSecret;
          break;
      }
      
      const response = await axios.post(tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: currentToken.refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      });
      
      const newTokenData: AccessTokenData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || currentToken.refreshToken,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
        scope: response.data.scope || currentToken.scope
      };
      
      // Store refreshed token
      await this.storeAccessToken(did, provider, newTokenData);
      
      console.log(`🔄 Token refreshed for DID: ${did}, Provider: ${provider}`);
      return newTokenData;
      
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return null;
    }
  }
  
  /**
   * Revoke access and delete stored tokens
   */
  async revokeAccess(did: string, provider: string): Promise<void> {
    try {
      const key = `${did}:${provider}`;
      const tokenData = this.tokenStore.get(key);
      
      if (tokenData) {
        // Call provider's revoke endpoint if available
        let revokeUrl: string;
        
        switch (provider) {
          case 'parchment':
            revokeUrl = `${config.parchment.baseUrl}/oauth/revoke`;
            break;
          case 'nsc':
          default:
            revokeUrl = `${config.nsc.baseUrl}/oauth/revoke`;
            break;
        }
        
        try {
          await axios.post(revokeUrl, {
            token: tokenData.accessToken,
            client_id: provider === 'parchment' ? config.parchment.clientId : config.nsc.clientId,
            client_secret: provider === 'parchment' ? config.parchment.clientSecret : config.nsc.clientSecret
          });
        } catch (revokeError) {
          console.warn('⚠️ Failed to revoke token with provider, but removing locally:', revokeError.message);
        }
        
        // Remove token from local storage
        this.tokenStore.delete(key);
      }
      
      console.log(`🔓 Access revoked for DID: ${did}, Provider: ${provider}`);
      
    } catch (error) {
      console.error('❌ Error revoking access:', error);
      throw error;
    }
  }
}