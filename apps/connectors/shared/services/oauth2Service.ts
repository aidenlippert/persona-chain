import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  redirectUri: string;
  responseType?: string;
  grantType?: string;
  usePKCE?: boolean;
  additionalParams?: Record<string, string>;
}

export interface OAuth2Token {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export class OAuth2Service {
  private redis: Redis;
  private config: OAuth2Config;

  constructor(config: OAuth2Config, redis: Redis) {
    this.config = {
      responseType: 'code',
      grantType: 'authorization_code',
      usePKCE: true,
      ...config
    };
    this.redis = redis;
  }

  /**
   * Generate PKCE challenge for OAuth2 flow (RFC 7636)
   */
  private generatePKCEChallenge(): PKCEChallenge {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }

  /**
   * Generate state parameter for CSRF protection
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Initiate OAuth2 authorization flow
   */
  async initiateAuth(sessionId: string): Promise<string> {
    const state = this.generateState();
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: this.config.responseType!,
      scope: this.config.scope,
      state,
      ...this.config.additionalParams
    });

    // Store state for verification
    const sessionData: any = { state };

    // Add PKCE if enabled
    if (this.config.usePKCE) {
      const pkce = this.generatePKCEChallenge();
      params.append('code_challenge', pkce.codeChallenge);
      params.append('code_challenge_method', pkce.codeChallengeMethod);
      sessionData.codeVerifier = pkce.codeVerifier;
    }

    // Store session data with 10-minute expiry
    await this.redis.setex(
      `oauth_session:${sessionId}`,
      600,
      JSON.stringify(sessionData)
    );

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth2 callback and exchange code for token
   */
  async handleCallback(
    sessionId: string,
    code: string,
    state: string
  ): Promise<OAuth2Token> {
    // Retrieve and validate session
    const sessionData = await this.redis.get(`oauth_session:${sessionId}`);
    if (!sessionData) {
      throw new Error('Invalid or expired session');
    }

    const session = JSON.parse(sessionData);

    // Validate state parameter
    if (session.state !== state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Prepare token exchange parameters
    const tokenParams: any = {
      grant_type: this.config.grantType,
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    };

    // Add PKCE verifier if used
    if (this.config.usePKCE && session.codeVerifier) {
      tokenParams.code_verifier = session.codeVerifier;
    }

    try {
      // Exchange authorization code for token
      const tokenResponse = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams(tokenParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      // Clean up session
      await this.redis.del(`oauth_session:${sessionId}`);

      return tokenResponse.data;
    } catch (error: any) {
      console.error('Token exchange failed:', error.response?.data || error);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Fetch user information using access token
   */
  async fetchUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(this.config.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user info:', error.response?.data || error);
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<OAuth2Token> {
    try {
      const response = await axios.post(
        this.config.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke token (if supported by provider)
   */
  async revokeToken(token: string, tokenType: 'access_token' | 'refresh_token' = 'access_token'): Promise<void> {
    // Implementation depends on provider support
    // Not all OAuth2 providers support token revocation
  }

  /**
   * Validate ID token (for OpenID Connect)
   */
  async validateIdToken(idToken: string): Promise<any> {
    try {
      // This is a simplified validation - in production, verify signature with provider's keys
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded) {
        throw new Error('Invalid ID token');
      }

      // Additional validation would include:
      // - Signature verification with provider's public keys
      // - Audience (aud) claim matches client_id
      // - Issuer (iss) claim matches expected value
      // - Token not expired (exp claim)
      // - Token issued recently (iat claim)

      return decoded.payload;
    } catch (error) {
      console.error('ID token validation failed:', error);
      throw new Error('Invalid ID token');
    }
  }
}