import crypto from 'crypto';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { ExternalServiceError, ValidationError } from '../middleware/errorHandler';

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint?: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuth2Token {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export class OAuth2Service {
  constructor(
    private config: OAuth2Config,
    private redis: Redis
  ) {}

  /**
   * Initiate OAuth2 authorization flow
   */
  async initiateAuth(sessionId: string): Promise<string> {
    try {
      // Generate PKCE challenge
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Generate state
      const state = crypto.randomBytes(16).toString('hex');

      // Store session data
      await this.redis.setex(
        `oauth_session:${sessionId}`,
        600, // 10 minutes
        JSON.stringify({
          state,
          codeVerifier,
          timestamp: Date.now()
        })
      );

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        response_type: 'code',
        scope: this.config.scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      const authUrl = `${this.config.authorizationEndpoint}?${params.toString()}`;

      logger.info('OAuth2 authorization initiated', {
        sessionId,
        scopes: this.config.scopes,
        redirectUri: this.config.redirectUri
      });

      return authUrl;
    } catch (error) {
      logger.error('Failed to initiate OAuth2 auth', { error, sessionId });
      throw new Error('Failed to initiate authorization');
    }
  }

  /**
   * Handle OAuth2 callback and exchange code for token
   */
  async handleCallback(
    sessionId: string,
    code: string,
    state: string
  ): Promise<OAuth2Token> {
    try {
      // Retrieve session data
      const sessionData = await this.redis.get(`oauth_session:${sessionId}`);
      if (!sessionData) {
        throw new ValidationError('Invalid or expired session');
      }

      const session = JSON.parse(sessionData);

      // Verify state
      if (session.state !== state) {
        throw new ValidationError('Invalid state parameter');
      }

      // Exchange code for token
      const tokenResponse = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code_verifier: session.codeVerifier
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        logger.error('Token exchange failed', {
          status: tokenResponse.status,
          error,
          sessionId
        });
        throw new ExternalServiceError(
          'Failed to exchange authorization code',
          'oauth2',
          error
        );
      }

      const tokenData = await tokenResponse.json() as OAuth2Token;

      logger.info('OAuth2 token obtained', {
        sessionId,
        tokenType: tokenData.token_type,
        hasRefreshToken: !!tokenData.refresh_token
      });

      return tokenData;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ExternalServiceError) {
        throw error;
      }
      logger.error('OAuth2 callback error', { error, sessionId });
      throw new Error('Failed to process authorization callback');
    }
  }

  /**
   * Fetch user information using access token
   */
  async fetchUserInfo(accessToken: string): Promise<any> {
    if (!this.config.userInfoEndpoint) {
      throw new Error('User info endpoint not configured');
    }

    try {
      const response = await fetch(this.config.userInfoEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to fetch user info', {
          status: response.status,
          error,
          endpoint: this.config.userInfoEndpoint
        });
        throw new ExternalServiceError(
          'Failed to fetch user information',
          'oauth2',
          error
        );
      }

      const userInfo = await response.json() as any;

      logger.info('User info fetched successfully', {
        endpoint: this.config.userInfoEndpoint,
        hasEmail: !!userInfo.email
      });

      return userInfo;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      logger.error('User info fetch error', { error });
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<OAuth2Token> {
    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Token refresh failed', {
          status: response.status,
          error
        });
        throw new ExternalServiceError(
          'Failed to refresh token',
          'oauth2',
          error
        );
      }

      const tokenData = await response.json() as OAuth2Token;

      logger.info('OAuth2 token refreshed', {
        tokenType: tokenData.token_type,
        hasNewRefreshToken: !!tokenData.refresh_token
      });

      return tokenData;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      logger.error('Token refresh error', { error });
      throw new Error('Failed to refresh token');
    }
  }
}