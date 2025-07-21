import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/config';
import { AccessTokenData } from '../types/health';

export interface SMARTConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  token_endpoint_auth_methods_supported: string[];
  scopes_supported: string[];
  response_types_supported: string[];
  capabilities: string[];
}

export class HealthOAuthService {
  private stateStore = new Map<string, any>(); // In production, use Redis
  private tokenStore = new Map<string, any>(); // In production, use encrypted database
  
  /**
   * Get SMART on FHIR configuration
   */
  async getSMARTConfiguration(provider: string): Promise<SMARTConfiguration> {
    try {
      console.log(`🔍 Fetching SMART configuration for ${provider}...`);
      
      let wellKnownUrl: string;
      
      switch (provider) {
        case 'epic':
          wellKnownUrl = config.epic.wellKnownUrl;
          break;
        case 'cerner':
          wellKnownUrl = config.cerner.wellKnownUrl;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const response = await axios.get(wellKnownUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`✅ SMART configuration retrieved for ${provider}`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Error fetching SMART configuration for ${provider}:`, error);
      
      // Return default configuration for development
      if (config.nodeEnv === 'development') {
        return {
          authorization_endpoint: provider === 'epic' ? config.epic.authUrl : config.cerner.authUrl,
          token_endpoint: provider === 'epic' ? config.epic.tokenUrl : config.cerner.tokenUrl,
          token_endpoint_auth_methods_supported: ['client_secret_basic'],
          scopes_supported: ['patient/Patient.read', 'patient/Observation.read'],
          response_types_supported: ['code'],
          capabilities: ['launch-standalone', 'client-public', 'sso-openid-connect']
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Build OAuth2 authorization URL for FHIR provider
   */
  async buildAuthorizationUrl(provider: string, did: string, patientId?: string): Promise<{ authUrl: string; state: string }> {
    try {
      console.log(`🔗 Building authorization URL for ${provider}...`);
      
      const smartConfig = await this.getSMARTConfiguration(provider);
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state for validation
      await this.storeOAuthState(state, {
        provider,
        did,
        patientId,
        timestamp: Date.now()
      });
      
      let clientId: string;
      let redirectUri: string;
      let scope: string;
      
      switch (provider) {
        case 'epic':
          clientId = config.epic.clientId;
          redirectUri = config.epic.redirectUri;
          scope = config.epic.scope;
          break;
        case 'cerner':
          clientId = config.cerner.clientId;
          redirectUri = config.cerner.redirectUri;
          scope = config.cerner.scope;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope,
        state,
        aud: this.getFhirBaseUrl(provider)
      });
      
      // Add patient context if provided (for patient-specific scopes)
      if (patientId) {
        params.append('launch', `patient=${patientId}`);
      }
      
      const authUrl = `${smartConfig.authorization_endpoint}?${params.toString()}`;
      
      console.log(`✅ Authorization URL built for ${provider}`);
      return { authUrl, state };
      
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
  ): Promise<{ tokenData: AccessTokenData; stateData: any }> {
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
      
      const smartConfig = await this.getSMARTConfiguration(provider);
      
      let clientId: string;
      let clientSecret: string;
      let redirectUri: string;
      
      switch (provider) {
        case 'epic':
          clientId = config.epic.clientId;
          clientSecret = config.epic.clientSecret;
          redirectUri = config.epic.redirectUri;
          break;
        case 'cerner':
          clientId = config.cerner.clientId;
          clientSecret = config.cerner.clientSecret;
          redirectUri = config.cerner.redirectUri;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const tokenRequest = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId
      };
      
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post(
        smartConfig.token_endpoint,
        new URLSearchParams(tokenRequest),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const tokenResponse = response.data;
      
      // Extract patient ID from token response or ID token
      let patientId = tokenResponse.patient;
      if (!patientId && tokenResponse.id_token) {
        // Decode ID token to get patient context (basic JWT decode)
        const idTokenPayload = JSON.parse(
          Buffer.from(tokenResponse.id_token.split('.')[1], 'base64').toString()
        );
        patientId = idTokenPayload.patient || idTokenPayload.sub;
      }
      
      const tokenData: AccessTokenData = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        scope: tokenResponse.scope,
        patientId: patientId || stateData.patientId,
        tokenType: tokenResponse.token_type || 'Bearer',
        idToken: tokenResponse.id_token
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
        const stateData = await this.getOAuthState(state) || { provider, did: 'mock', patientId: 'mock-patient' };
        return {
          tokenData: {
            accessToken: `mock_${provider}_token_${Date.now()}`,
            refreshToken: `mock_${provider}_refresh_${Date.now()}`,
            expiresAt: Date.now() + 3600000, // 1 hour
            scope: provider === 'epic' ? config.epic.scope : config.cerner.scope,
            patientId: 'mock-patient-id',
            tokenType: 'Bearer'
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
  async refreshAccessToken(provider: string, refreshToken: string): Promise<AccessTokenData> {
    try {
      console.log(`🔄 Refreshing ${provider} access token...`);
      
      const smartConfig = await this.getSMARTConfiguration(provider);
      
      let clientId: string;
      let clientSecret: string;
      
      switch (provider) {
        case 'epic':
          clientId = config.epic.clientId;
          clientSecret = config.epic.clientSecret;
          break;
        case 'cerner':
          clientId = config.cerner.clientId;
          clientSecret = config.cerner.clientSecret;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const refreshRequest = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
      };
      
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post(
        smartConfig.token_endpoint,
        new URLSearchParams(refreshRequest),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const tokenResponse = response.data;
      
      const newTokenData: AccessTokenData = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        scope: tokenResponse.scope,
        tokenType: tokenResponse.token_type || 'Bearer'
      };
      
      console.log(`✅ Access token refreshed for ${provider}`);
      return newTokenData;
      
    } catch (error) {
      console.error(`❌ Error refreshing ${provider} token:`, error);
      throw new Error(`Failed to refresh access token for ${provider}`);
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
   * Get FHIR base URL for provider
   */
  private getFhirBaseUrl(provider: string): string {
    switch (provider) {
      case 'epic':
        return config.epic.fhirUrl;
      case 'cerner':
        return config.cerner.fhirUrl;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  /**
   * Validate token and get patient context
   */
  async validateTokenAndGetPatient(provider: string, accessToken: string): Promise<{ valid: boolean; patientId?: string }> {
    try {
      // Make a simple FHIR request to validate token
      const baseUrl = this.getFhirBaseUrl(provider);
      
      const response = await axios.get(
        `${baseUrl}/metadata`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/fhir+json'
          },
          timeout: 30000
        }
      );
      
      // Token is valid if we get a successful response
      return { valid: response.status === 200 };
      
    } catch (error) {
      console.error(`❌ Token validation failed for ${provider}:`, error);
      return { valid: false };
    }
  }
  
  /**
   * Revoke access token
   */
  async revokeToken(provider: string, accessToken: string): Promise<void> {
    try {
      console.log(`🔓 Revoking ${provider} access token...`);
      
      // Epic and Cerner may have different revocation endpoints
      // This is a best-effort attempt; not all FHIR servers support token revocation
      const smartConfig = await this.getSMARTConfiguration(provider);
      
      if (smartConfig.token_endpoint) {
        try {
          await axios.post(
            smartConfig.token_endpoint.replace('/token', '/revoke'),
            { token: accessToken },
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              timeout: 30000
            }
          );
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
}